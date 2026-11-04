// src/services/crmService.ts
import { Cliente } from "../types";
import { DOMUS_BROWSER_UA, DOMUS_SEC_CH_UA_HEADERS } from "../lib/auth";
import { acquireRedisLock, getRedis, releaseRedisLock } from "../lib/redis";

if (typeof window !== "undefined") {
  throw new Error("src/services/crmService.ts solo puede importarse en el servidor.");
}

export const SESSION_KEY = "domus_session";
const V2_SESSION_KEY = "domus_v2_session";
const LOGIN_LOCK_KEY = "domus_login_lock";
const LOGIN_BACKOFF_KEY = "domus_login_backoff";

const SESSION_TTL = 5 * 24 * 60 * 60;       // 5 días
const CLIENTS_TTL = 5 * 60;                 // 5 minutos (datos frescos en Redis)
const CLIENTS_STALE_TTL = 48 * 60 * 60;     // 48 horas (respaldo ante caídas de Domus)
const MEM_TTL_MS = 3 * 60 * 1000;           // 3 minutos en memoria de instancia caliente
const LOGIN_BACKOFF_TTL = 10 * 60;          // 10 min de pausa si Domus rechaza credenciales

const DEFAULT_CRM_ORIGIN = "https://crm.domus.la";
const ALLOWED_CRM_HOSTS = new Set(["crm.domus.la", "crm.domusweb.co"]);

export interface StoredSession {
  sessionCookie: string;
  authCookies: string;
  v2Cookies?: string;
  crmSessionCookie: string;
  crmOrigin?: string;
  ua: string;
  createdAt: number;
}

export interface FetchCrmOptions {
  noCache?: boolean;
  maxPages?: number;
}

// Caché en memoria por instancia caliente
const memCache: Record<string, Cliente[]> = {};
const memCacheTs: Record<string, number> = {};

// Promesa en vuelo para evitar logins paralelos en la misma instancia Node
let inflightSessionPromise: Promise<StoredSession> | null = null;

export function humanDelay(min = 500, max = 1600): Promise<void> {
  return new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));
}

function splitSetCookieHeader(raw: string): string[] {
  // Evita partir las comas dentro de Expires=Wed, 04 Nov 2026 ...
  return raw.split(/,\s*(?=[!#$%&'*+\-.^_`|~0-9A-Za-z]+=)/g);
}

function getRawSetCookies(headers: Headers): string[] {
  const h = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof h.getSetCookie === "function") {
    return h.getSetCookie();
  }
  const raw = headers.get("set-cookie");
  return raw ? splitSetCookieHeader(raw) : [];
}

function mergeResponseCookiesIntoJar(headers: Headers, jar: Map<string, string>): string {
  const added: string[] = [];
  for (const rawCookie of getRawSetCookies(headers)) {
    const segments = rawCookie.split(";").map((s) => s.trim());
    const first = segments[0];
    if (!first) continue;
    const eqIdx = first.indexOf("=");
    if (eqIdx <= 0) continue;

    const name = first.slice(0, eqIdx).trim();
    const val = first.slice(eqIdx + 1).trim();

    const maxAgeAttr = segments.find((s) => s.toLowerCase().startsWith("max-age="));
    const maxAge = maxAgeAttr ? Number(maxAgeAttr.split("=")[1]) : undefined;
    const isDeleted =
      val === "" ||
      val.toLowerCase() === "deleted" ||
      (typeof maxAge === "number" && !Number.isNaN(maxAge) && maxAge <= 0);

    if (isDeleted) {
      jar.delete(name);
    } else {
      jar.set(name, val);
      added.push(`${name}=${val}`);
    }
  }
  return added.join("; ");
}

function serializeCookieJar(jar: Map<string, string>): string {
  const parts: string[] = [];
  for (const [k, v] of jar.entries()) {
    parts.push(`${k}=${v}`);
  }
  return parts.join("; ");
}

function extractXsrfToken(cookieHeader: string): string | null {
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith("XSRF-TOKEN=")) {
      const rawVal = trimmed.slice("XSRF-TOKEN=".length);
      try {
        return decodeURIComponent(rawVal);
      } catch {
        return rawVal;
      }
    }
  }
  return null;
}

export function sanitizeCrmOrigin(origin?: string | null): string {
  if (!origin) return DEFAULT_CRM_ORIGIN;
  try {
    const parsed = new URL(origin);
    if (
      parsed.protocol === "https:" &&
      parsed.port === "" &&
      parsed.username === "" &&
      parsed.password === "" &&
      ALLOWED_CRM_HOSTS.has(parsed.hostname)
    ) {
      return parsed.origin;
    }
  } catch {
    // Usar origen seguro por defecto
  }
  return DEFAULT_CRM_ORIGIN;
}

function validateCrmRedirectUrl(rawLocation: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawLocation, "https://v2.domus.la");
  } catch {
    throw new Error("SSO_INVALID_REDIRECT");
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.port !== "" ||
    parsed.username !== "" ||
    parsed.password !== ""
  ) {
    throw new Error("SSO_INVALID_REDIRECT");
  }

  // Si v2.domus.la redirige a /login en sí mismo, la sesión v2 expiró
  if (parsed.hostname === "v2.domus.la") {
    throw new Error("V2_SESSION_EXPIRED");
  }

  if (!ALLOWED_CRM_HOSTS.has(parsed.hostname)) {
    throw new Error("SSO_UNTRUSTED_HOST");
  }

  return parsed;
}

/**
 * Ejecuta únicamente los pasos 3 y 4 (SSO desde v2.domus.la hacia Apperty CRM)
 * reutilizando cookies v2 válidas sin reenviar usuario/contraseña.
 */
async function exchangeV2CookiesForCrmSession(
  v2Cookies: string
): Promise<{ crmSessionCookie: string; crmOrigin: string }> {
  const crmAuthRes = await fetch("https://v2.domus.la/crm/new/ingreso", {
    headers: {
      "Cookie": v2Cookies,
      "User-Agent": DOMUS_BROWSER_UA,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "es-CO,es;q=0.9",
      "Referer": "https://v2.domus.la/",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Dest": "document",
      ...DOMUS_SEC_CH_UA_HEADERS,
    },
    redirect: "manual",
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  await crmAuthRes.arrayBuffer().catch(() => null);

  if (crmAuthRes.status < 300 || crmAuthRes.status >= 400) {
    throw new Error("V2_SESSION_EXPIRED");
  }

  const rawLocation = crmAuthRes.headers.get("location");
  if (!rawLocation) {
    throw new Error("SSO_MISSING_LOCATION");
  }

  let currentUrl = validateCrmRedirectUrl(rawLocation);
  const crmOrigin = currentUrl.origin;

  await humanDelay(350, 850);

  const crmJar = new Map<string, string>();

  // Seguir hasta 3 saltos manuales dentro del mismo origen permitido (ej. /?params=... -> /dashboard)
  for (let hop = 0; hop < 3; hop++) {
    const cookieHeader = serializeCookieJar(crmJar);
    const hopHeaders: Record<string, string> = {
      "User-Agent": DOMUS_BROWSER_UA,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "es-CO,es;q=0.9",
      "Referer": hop === 0 ? "https://v2.domus.la/" : `${crmOrigin}/`,
      "Sec-Fetch-Site": hop === 0 ? "same-site" : "same-origin",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Dest": "document",
      ...DOMUS_SEC_CH_UA_HEADERS,
    };
    if (cookieHeader) {
      hopHeaders["Cookie"] = cookieHeader;
    }

    const crmRes = await fetch(currentUrl.toString(), {
      headers: hopHeaders,
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });

    mergeResponseCookiesIntoJar(crmRes.headers, crmJar);
    await crmRes.arrayBuffer().catch(() => null);

    if (crmRes.status >= 300 && crmRes.status < 400) {
      const nextLoc = crmRes.headers.get("location");
      if (!nextLoc) break;
      const nextUrl = new URL(nextLoc, crmOrigin);
      if (nextUrl.origin !== crmOrigin || nextUrl.protocol !== "https:") {
        break;
      }
      currentUrl = nextUrl;
      continue;
    }
    break;
  }

  const hasSessionCookie = Array.from(crmJar.keys()).some((k) =>
    k.toLowerCase().includes("session")
  );
  const crmSessionCookie = serializeCookieJar(crmJar);

  if (!hasSessionCookie || !crmSessionCookie) {
    throw new Error("CRM_COOKIE_MISSING");
  }

  return { crmSessionCookie, crmOrigin };
}

/**
 * Login completo contra v2.domus.la + SSO hacia CRM Apperty.
 * Protegido con backoff en Redis ante rechazo de credenciales.
 */
async function doFullLogin(): Promise<StoredSession> {
  const kv = getRedis();
  if (kv) {
    const inBackoff = await kv.get(LOGIN_BACKOFF_KEY).catch(() => null);
    if (inBackoff) {
      throw new Error("Login Domus en pausa preventiva (reintentará en unos minutos)");
    }
  }

  const username = process.env.DOMUS_USERNAME?.trim();
  const password = process.env.DOMUS_PASSWORD;
  if (!username || !password) {
    throw new Error("Credenciales Domus no configuradas");
  }

  const t0 = Date.now();
  const v2Jar = new Map<string, string>();

  // 1. Obtener CSRF e iniciar cookies de v2.domus.la (sin ?t= artificial)
  const homeRes = await fetch("https://v2.domus.la/", {
    headers: {
      "User-Agent": DOMUS_BROWSER_UA,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "es-CO,es;q=0.9",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Dest": "document",
      ...DOMUS_SEC_CH_UA_HEADERS,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });

  const homeText = await homeRes.text();
  const csrfToken =
    homeText.match(/<meta name="csrf-token-login" content="([^"]+)"/)?.[1] ?? "";
  const sessionCookie = mergeResponseCookiesIntoJar(homeRes.headers, v2Jar);

  if (!csrfToken || !sessionCookie) {
    throw new Error("No se pudo iniciar sesión base en Domus");
  }

  await humanDelay(650, 1400);

  // 2. Autenticar en v2.domus.la/auth-login
  const loginRes = await fetch("https://v2.domus.la/auth-login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": csrfToken,
      "Cookie": serializeCookieJar(v2Jar),
      "User-Agent": DOMUS_BROWSER_UA,
      "Accept": "application/json",
      "Accept-Language": "es-CO,es;q=0.9",
      "Origin": "https://v2.domus.la",
      "Referer": "https://v2.domus.la/",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Dest": "empty",
      ...DOMUS_SEC_CH_UA_HEADERS,
    },
    body: JSON.stringify({ user: username, password }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });

  const loginData = (await loginRes.json().catch(() => ({}))) as {
    mensaje?: string;
    camb_clave?: unknown;
  };

  if (loginData.mensaje !== "Login exitoso" && loginData.camb_clave === undefined) {
    if (kv) {
      await kv.set(LOGIN_BACKOFF_KEY, "1", { ex: LOGIN_BACKOFF_TTL }).catch(() => {});
    }
    console.error(`[CRM-LOGIN] Autenticación rechazada por Domus (HTTP ${loginRes.status}). Backoff activado por 10 min.`);
    throw new Error("Autenticación rechazada por Domus");
  }

  const authCookies = mergeResponseCookiesIntoJar(loginRes.headers, v2Jar);
  const v2Cookies = serializeCookieJar(v2Jar);

  await humanDelay(500, 1100);

  // 3 y 4. Intercambiar cookies v2 por sesión del CRM Apperty
  const { crmSessionCookie, crmOrigin } = await exchangeV2CookiesForCrmSession(v2Cookies);

  console.log(`[CRM-LOGIN] Sesión CRM renovada correctamente (${crmOrigin}) en ${Date.now() - t0}ms`);

  return {
    sessionCookie,
    authCookies,
    v2Cookies,
    crmSessionCookie,
    crmOrigin,
    ua: DOMUS_BROWSER_UA,
    createdAt: Date.now(),
  };
}

/**
 * Obtiene una sesión válida de Redis o coordina una única renovación entre peticiones concurrentes.
 * Prioriza renovar por SSO (Paso 3) con las cookies v2 existentes antes de usar usuario/clave.
 */
async function getOrRefreshSession(forceRefresh = false): Promise<StoredSession> {
  const kv = getRedis();

  if (!forceRefresh && kv) {
    try {
      const stored = await kv.get<StoredSession>(SESSION_KEY);
      if (stored?.crmSessionCookie) {
        return {
          ...stored,
          crmOrigin: sanitizeCrmOrigin(stored.crmOrigin),
          ua: DOMUS_BROWSER_UA,
        };
      }
    } catch {
      // Continuar a renovación si Redis falla
    }
  }

  if (inflightSessionPromise) {
    return inflightSessionPromise;
  }

  inflightSessionPromise = (async () => {
    let lockAcquired = false;
    try {
      if (kv) {
        const inBackoff = await kv.get(LOGIN_BACKOFF_KEY).catch(() => null);
        if (inBackoff) {
          throw new Error("Login Domus en pausa preventiva");
        }
      }

      lockAcquired = await acquireRedisLock(LOGIN_LOCK_KEY, 30);

      // Si otra instancia serverless está haciendo login ahora mismo, esperar su resultado
      if (!lockAcquired && kv) {
        for (let attempt = 0; attempt < 8; attempt++) {
          await new Promise((r) => setTimeout(r, 750));
          const fresh = await kv.get<StoredSession>(SESSION_KEY).catch(() => null);
          if (fresh?.crmSessionCookie) {
            return {
              ...fresh,
              crmOrigin: sanitizeCrmOrigin(fresh.crmOrigin),
              ua: DOMUS_BROWSER_UA,
            };
          }
        }
      }

      // Re-verificar Redis tras adquirir candado
      const existing = kv
        ? await kv.get<StoredSession>(SESSION_KEY).catch(() => null)
        : null;

      if (!forceRefresh && existing?.crmSessionCookie) {
        return {
          ...existing,
          crmOrigin: sanitizeCrmOrigin(existing.crmOrigin),
          ua: DOMUS_BROWSER_UA,
        };
      }

      // Intento ligero primero: usar cookies v2 existentes para obtener nueva cookie de CRM sin enviar contraseña
      const existingV2 =
        existing?.v2Cookies ||
        [existing?.sessionCookie, existing?.authCookies].filter(Boolean).join("; ");

      if (existingV2) {
        try {
          const { crmSessionCookie, crmOrigin } = await exchangeV2CookiesForCrmSession(existingV2);
          const renewed: StoredSession = {
            sessionCookie: existing?.sessionCookie ?? "",
            authCookies: existing?.authCookies ?? "",
            v2Cookies: existingV2,
            crmSessionCookie,
            crmOrigin,
            ua: DOMUS_BROWSER_UA,
            createdAt: Date.now(),
          };
          if (kv) {
            await kv.set(SESSION_KEY, renewed, { ex: SESSION_TTL }).catch(() => {});
          }
          console.log(`[CRM-LOGIN] Sesión CRM revalidada vía SSO ligero (${crmOrigin})`);
          return renewed;
        } catch {
          // Cookies v2 expiradas: proceder a login completo
        }
      }

      const fullSession = await doFullLogin();

      if (kv) {
        await Promise.all([
          kv.set(SESSION_KEY, fullSession, { ex: SESSION_TTL }).catch(() => {}),
          fullSession.v2Cookies
            ? kv
                .set(
                  V2_SESSION_KEY,
                  {
                    cookies: fullSession.v2Cookies,
                    ua: DOMUS_BROWSER_UA,
                    createdAt: fullSession.createdAt,
                  },
                  { ex: SESSION_TTL }
                )
                .catch(() => {})
            : Promise.resolve(),
        ]);
      }

      return fullSession;
    } finally {
      if (lockAcquired) {
        await releaseRedisLock(LOGIN_LOCK_KEY);
      }
      inflightSessionPromise = null;
    }
  })();

  return inflightSessionPromise;
}

// ── Fetch principal de clientes ───────────────────────────────────────────
export async function fetchCrmClients(
  statusType: number | string = 1,
  options: FetchCrmOptions = {}
): Promise<Cliente[]> {
  const { noCache = false, maxPages = 8 } = options;
  const rawStatus = String(statusType ?? "1").trim();
  const safeStatus: "1" | "2" | "todos" =
    rawStatus === "2" ? "2" : rawStatus === "todos" ? "todos" : "1";

  const now = Date.now();
  const redisDataKey = `clients_${safeStatus}`;
  const redisStaleKey = `clients_stale_${safeStatus}`;

  // 1. Caché rápido en memoria
  if (!noCache && memCache[safeStatus] && now - (memCacheTs[safeStatus] ?? 0) < MEM_TTL_MS) {
    return memCache[safeStatus];
  }

  // 2. Caché compartido en Redis (5 min)
  const kv = getRedis();
  if (!noCache && kv) {
    try {
      const cached = await kv.get<Cliente[]>(redisDataKey);
      if (Array.isArray(cached) && cached.length > 0) {
        memCache[safeStatus] = cached;
        memCacheTs[safeStatus] = now;
        return cached;
      }
    } catch {
      // Continuar a Domus si Redis no responde
    }
  }

  const logTag = `[CRM-FETCH status=${safeStatus}]`;

  try {
    let activeSession = await getOrRefreshSession(false);

    const fetchPage = async (page: number, s: StoredSession) => {
      const origin = sanitizeCrmOrigin(s.crmOrigin);
      const url =
        safeStatus === "todos"
          ? `contacts?page=${page}&perpage=24&order=created_at_new`
          : `contacts?page=${page}&perpage=24&contact_status_type=${safeStatus}&order=created_at_new`;

      const headers: Record<string, string> = {
        "Cookie": s.crmSessionCookie,
        "User-Agent": DOMUS_BROWSER_UA,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Accept-Language": "es-CO,es;q=0.9",
        "Origin": origin,
        "Referer": `${origin}/contacts`,
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Dest": "empty",
        ...DOMUS_SEC_CH_UA_HEADERS,
      };

      const xsrf = extractXsrfToken(s.crmSessionCookie);
      if (xsrf) {
        headers["X-XSRF-TOKEN"] = xsrf;
      }

      const apiRes = await fetch(`${origin}/api/get`, {
        method: "POST",
        headers,
        body: JSON.stringify({ url }),
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });

      const apiData = (await apiRes.json().catch(() => ({}))) as {
        code?: number;
        data?: unknown[];
        last_page?: number;
        total?: number;
      };

      const sessionInvalid =
        apiRes.status === 401 ||
        apiRes.status === 403 ||
        apiRes.status === 419 ||
        apiRes.status === 405 ||
        apiData?.code === 401 ||
        apiData?.code === 403;

      if (sessionInvalid) {
        throw new Error("SESSION_EXPIRED");
      }

      if (!apiRes.ok) {
        throw new Error(`CRM HTTP ${apiRes.status}`);
      }

      return apiData;
    };

    let firstPageData: { data?: unknown[]; last_page?: number; total?: number };
    try {
      firstPageData = await fetchPage(1, activeSession);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message === "SESSION_EXPIRED") {
        activeSession = await getOrRefreshSession(true);
        firstPageData = await fetchPage(1, activeSession);
      } else {
        throw err;
      }
    }

    if (!Array.isArray(firstPageData?.data)) {
      throw new Error("Formato inesperado en respuesta del CRM");
    }

    // Renovar TTL deslizante de la sesión activa
    if (kv) {
      kv.expire(SESSION_KEY, SESSION_TTL).catch(() => {});
    }

    const allData: unknown[] = [...firstPageData.data];
    const lastPage = Math.max(1, Number(firstPageData.last_page) || 1);
    const safeMaxPages = Math.max(1, Math.min(maxPages, 15));
    const effectiveLastPage = Math.min(lastPage, safeMaxPages);
    const isPartialFetch = effectiveLastPage < lastPage;

    // Paginación secuencial con pausa natural (nunca ráfagas en paralelo)
    for (let p = 2; p <= effectiveLastPage; p++) {
      await humanDelay(220, 480);
      try {
        const res = await fetchPage(p, activeSession);
        if (Array.isArray(res?.data)) {
          allData.push(...res.data);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (message === "SESSION_EXPIRED") {
          activeSession = await getOrRefreshSession(true);
          const retryRes = await fetchPage(p, activeSession);
          if (Array.isArray(retryRes?.data)) {
            allData.push(...retryRes.data);
          }
        } else {
          console.warn(`${logTag} Aviso en página ${p}: ${message}`);
          break;
        }
      }
    }

    const clients = mapClients(allData);

    // Guardar caché completa solo si no truncamos páginas
    if (!isPartialFetch) {
      memCache[safeStatus] = clients;
      memCacheTs[safeStatus] = Date.now();
      if (kv) {
        await Promise.all([
          kv.set(redisDataKey, clients, { ex: CLIENTS_TTL }).catch(() => {}),
          clients.length > 0
            ? kv.set(redisStaleKey, clients, { ex: CLIENTS_STALE_TTL }).catch(() => {})
            : Promise.resolve(),
        ]);
      }
    }

    return clients;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`${logTag} Error obteniendo contactos: ${msg}`);

    if (memCache[safeStatus]?.length) {
      return memCache[safeStatus];
    }

    if (kv) {
      const stale = await kv.get<Cliente[]>(redisStaleKey).catch(() => null);
      if (Array.isArray(stale) && stale.length > 0) {
        return stale;
      }
    }

    return [];
  }
}

function mapClients(data: unknown[]): Cliente[] {
  return data.map((raw) => {
    const c = (raw ?? {}) as Record<string, any>;
    let origin = "Portal Web";
    if (c.source === 6) {
      origin = "Proppit";
    } else if (c.source === 3) {
      origin = "Metrocuadrado";
    } else if (c.source === 2) {
      origin = "Finca Raíz";
    } else if (c.source === 5) {
      origin = "Ciencuadras";
    } else if (c.autoleads === 1) {
      origin = "Autoleads";
    }

    const phones: any[] = Array.isArray(c.phones) ? c.phones : [];
    const primaryPhone =
      phones.find((p) => p?.phone_type_id === 3 && p?.phone) ||
      phones.find((p) => p?.phone) ||
      null;

    const entities: any[] = Array.isArray(c.entities) ? c.entities : [];
    const rawIndicative = String(primaryPhone?.phone_indicative || "+57").trim();
    const normalizedIndicative = rawIndicative.startsWith("+")
      ? rawIndicative
      : `+${rawIndicative.replace(/\D/g, "") || "57"}`;

    return {
      id: c.code,
      nombre: String(c.full_name || "Sin nombre").trim(),
      email: String(c.email || "").trim(),
      telefono: String(primaryPhone?.phone || "").trim(),
      telefonoIndicativo: normalizedIndicative,
      estado: c.status?.name ?? "Desconocido",
      inmuebleInteres: entities.length > 0 && entities[0]?.property_code ? String(entities[0].property_code) : "N/A",
      origen: origin,
      fecha: c.created_at || new Date().toISOString(),
      diasSeguimiento: typeof c.next_follow_days === "number" ? c.next_follow_days : undefined,
      porcentaje: typeof c.status?.percentage === "number" ? c.status.percentage : undefined,
    };
  });
}
