// src/services/domusService.ts
// Obtiene inmuebles de Patricia desde la API de Domus.

import type { Inmueble } from "@/types";
import { DOMUS_BROWSER_UA, DOMUS_SEC_CH_UA_HEADERS } from "@/lib/auth";
import { acquireRedisLock, getRedis, releaseRedisLock } from "@/lib/redis";

if (typeof window !== "undefined") {
  throw new Error("src/services/domusService.ts solo puede importarse en el servidor.");
}

const DOMUS_HOME_URL       = "https://v2.domus.la/";
const DOMUS_LOGIN_URL      = "https://v2.domus.la/auth-login";
const DOMUS_FILTER_URL     = "https://v2.domus.la/properties/filter";

const INMUEBLES_REDIS_KEY  = "inmuebles_domus_v2_promotor_v6";
const INMUEBLES_TTL        = 6 * 60 * 60;       // 6 horas

const V2_SESSION_KEY       = "domus_v2_session";
const V2_SESSION_TTL       = 5 * 24 * 60 * 60; // 5 días
const CRM_SESSION_KEY      = "domus_session";
const LOGIN_LOCK_KEY       = "domus_login_lock";
const LOGIN_BACKOFF_KEY    = "domus_login_backoff";
const PROPS_5XX_BACKOFF    = "domus_props_5xx_backoff";

interface V2Session {
  cookies: string;
  ua: string;
  createdAt: number;
}

interface CrmStoredSession {
  sessionCookie?: string;
  authCookies?: string;
  v2Cookies?: string;
}

function splitSetCookieHeader(raw: string): string[] {
  return raw.split(/,\s*(?=[!#$%&'*+\-.^_`|~0-9A-Za-z]+=)/g);
}

function extractCookies(headers: Headers): string {
  const h = headers as Headers & { getSetCookie?: () => string[] };
  const rawList =
    typeof h.getSetCookie === "function"
      ? h.getSetCookie()
      : headers.get("set-cookie")
        ? splitSetCookieHeader(headers.get("set-cookie")!)
        : [];

  const jar = new Map<string, string>();
  for (const c of rawList) {
    const first = c.split(";")[0]?.trim();
    if (!first) continue;
    const eqIdx = first.indexOf("=");
    if (eqIdx <= 0) continue;
    const k = first.slice(0, eqIdx).trim();
    const v = first.slice(eqIdx + 1).trim();
    if (v && v.toLowerCase() !== "deleted") jar.set(k, v);
  }
  return Array.from(jar.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

function humanDelay(min = 600, max = 1600): Promise<void> {
  return new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));
}

async function doFreshV2Login(): Promise<{ cookies: string; ua: string }> {
  const kv = getRedis();
  if (kv) {
    const inBackoff = await kv.get(LOGIN_BACKOFF_KEY).catch(() => null);
    if (inBackoff) throw new Error("Domus login en pausa preventiva");
  }

  const username = process.env.DOMUS_USERNAME?.trim();
  const password = process.env.DOMUS_PASSWORD;
  if (!username || !password) throw new Error("Credenciales Domus no configuradas");

  const homeRes = await fetch(DOMUS_HOME_URL, {
    headers: {
      "User-Agent": DOMUS_BROWSER_UA,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "es-CO,es;q=0.9",
      ...DOMUS_SEC_CH_UA_HEADERS,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const homeText = await homeRes.text();
  const csrfToken = homeText.match(/<meta name="csrf-token-login" content="([^"]+)"/)?.[1] ?? "";
  const sessionCookie = extractCookies(homeRes.headers);

  await humanDelay(650, 1400);

  const loginRes = await fetch(DOMUS_LOGIN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": csrfToken,
      "Cookie": sessionCookie,
      "User-Agent": DOMUS_BROWSER_UA,
      "Accept": "application/json",
      "Accept-Language": "es-CO,es;q=0.9",
      "Origin": "https://v2.domus.la",
      "Referer": "https://v2.domus.la/",
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
      await kv.set(LOGIN_BACKOFF_KEY, "1", { ex: 600 }).catch(() => {});
    }
    throw new Error("Login a Domus v2 rechazado");
  }

  const authCookies = extractCookies(loginRes.headers);
  const cookies = [sessionCookie, authCookies].filter(Boolean).join("; ");
  return { cookies, ua: DOMUS_BROWSER_UA };
}

const DOMUS_INMOBILIARIA_SESSION_ID = 607; // L2L Bienes Raíces

async function fetchPropertiesWithCookies(cookies: string): Promise<any[] | null> {
  const fetchPage = async (page: number): Promise<any | null> => {
    const res = await fetch(`${DOMUS_FILTER_URL}?page=${page}`, {
      method: "POST",
      headers: {
        "Cookie": cookies,
        "User-Agent": DOMUS_BROWSER_UA,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        "Accept-Language": "es-CO,es;q=0.9",
        "Referer": "https://v2.domus.la/properties/list",
        "Origin": "https://v2.domus.la",
        ...DOMUS_SEC_CH_UA_HEADERS,
      },
      body: JSON.stringify({
        data: {
          status: 1,
          orderby: 1,
          caractype: 1,
          id_inmobiliaria_session: DOMUS_INMOBILIARIA_SESSION_ID,
          cant_paginador: 15,
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });

    if (res.status === 401 || res.status === 403) return null;
    if (res.status >= 500) {
      const kv = getRedis();
      if (kv) await kv.set(PROPS_5XX_BACKOFF, "1", { ex: 600 }).catch(() => {});
      throw new Error(`DOMUS_PROPS_5XX:${res.status}`);
    }
    if (!res.ok) throw new Error(`Domus properties API: ${res.status}`);
    return res.json();
  };

  const firstPage = await fetchPage(1);
  if (!firstPage) return null;
  if (!firstPage.data || !Array.isArray(firstPage.data)) return [];

  const all = [...firstPage.data];
  const totalPages = Math.min(Number(firstPage.last_page) || 1, 15);

  for (let i = 2; i <= totalPages; i++) {
    await humanDelay(250, 500);
    try {
      const page = await fetchPage(i);
      if (page?.data && Array.isArray(page.data)) all.push(...page.data);
    } catch (e) {
      console.error(`[Domus Properties] Error en página ${i}:`, e instanceof Error ? e.message : e);
      break;
    }
  }

  return all;
}

function mapProperties(raw: any[]): Inmueble[] {
  return raw
    .filter((p: any) => {
      const estado = p.estado_inmueble?.estado_inmueble ?? "";
      return estado === "Disponible" || estado === "En proceso";
    })
    .map((p: any) => {
      const gestionText = p.gestion?.gestion?.toLowerCase() ?? "";
      const gestion: "venta" | "arriendo" = gestionText.includes("arriendo") ? "arriendo" : "venta";
      const precio = gestion === "arriendo" ? (p.canon ?? 0) : (p.venta ?? 0);
      const imagen = p.primera_imagen?.imageurl ?? "https://via.placeholder.com/400x300?text=Sin+Foto";
      const codigo = String(p.codigo || p.id);
      const urlL2L = p.codigo ? `https://l2lbienesraices.com/inmueble/${p.codigo}` : "";

      const rawString = `property=${p.id}&profile=29214&group=0&template=1&contact=1`;
      const urlDomusBase64 =
        typeof btoa !== "undefined" ? btoa(rawString) : Buffer.from(rawString).toString("base64");
      const urlDomusCard = `https://card.domus.la/public/file/${urlDomusBase64}`;

      const rawImgs: any[] = Array.isArray(p.imagenes)
        ? p.imagenes
        : Array.isArray(p.fotos)
          ? p.fotos
          : Array.isArray(p.photos)
            ? p.photos
            : [];
      const imagenes: string[] = rawImgs
        .map((img: any) => img?.imageurl || img?.url || img?.src)
        .filter((url): url is string => Boolean(url) && !url.includes("placeholder"));
      if (imagen && !imagen.includes("placeholder") && !imagenes.includes(imagen)) {
        imagenes.unshift(imagen);
      }

      return {
        id: codigo,
        codigoDomus: codigo,
        titulo: `${p.tipo_inmueble?.tipo_inmueble ?? "Inmueble"} en ${gestion === "venta" ? "Venta" : "Arriendo"} en ${p.barrio ?? ""}`,
        tipo: p.tipo_inmueble?.tipo_inmueble ?? "Inmueble",
        ciudad: p.ciudad?.nombre ?? "Bogotá",
        barrio: p.barrio ?? "",
        gestion,
        precio,
        areaTotal: p.area_construida ?? 0,
        habitaciones: p.habitaciones ?? 0,
        banos: p.banos ?? 0,
        garajes: p.parqueadero ?? 0,
        imagen,
        imagenes,
        urlL2L,
        urlDomus: urlDomusCard,
        estado: p.estado_inmueble?.estado_inmueble ?? "Disponible",
      };
    });
}

export async function fetchDomusProperties(
  options: { allowLogin?: boolean; forceRefresh?: boolean } = {}
): Promise<{ inmuebles: Inmueble[]; fuente: string; total: number }> {
  const { allowLogin = true, forceRefresh = false } = options;
  const kv = getRedis();

  // 1. Cache de inmuebles en Redis (6h)
  if (kv) {
    try {
      if (!forceRefresh) {
        const cached = await kv.get<{ inmuebles: Inmueble[]; fuente: string; total: number }>(INMUEBLES_REDIS_KEY);
        if (cached?.inmuebles && cached.inmuebles.length > 0) return cached;
      }

      const props5xx = await kv.get(PROPS_5XX_BACKOFF);
      if (props5xx) {
        throw new Error("Domus properties API temporalmente no disponible (backoff 5xx)");
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes("backoff 5xx")) throw e;
    }
  }

  let rawData: any[] | null = null;

  // 2. Reutilizar cookies v2 de crmService o sesión v2 guardada (evita logins duplicados)
  if (kv) {
    const crmStored = await kv.get<CrmStoredSession>(CRM_SESSION_KEY).catch(() => null);
    const sharedV2Cookies =
      crmStored?.v2Cookies ||
      [crmStored?.sessionCookie, crmStored?.authCookies].filter(Boolean).join("; ");

    if (sharedV2Cookies) {
      rawData = await fetchPropertiesWithCookies(sharedV2Cookies);
      if (Array.isArray(rawData) && rawData.length === 0) rawData = null;
    }

    if (rawData === null) {
      const stored = await kv.get<V2Session>(V2_SESSION_KEY).catch(() => null);
      if (stored?.cookies) {
        rawData = await fetchPropertiesWithCookies(stored.cookies);
        if (Array.isArray(rawData) && rawData.length === 0) rawData = null;
      }
    }
  }

  // 3. Login fresco solo si está permitido (nunca desde rutas públicas sin sesión)
  if (rawData === null) {
    if (!allowLogin) {
      return { inmuebles: [], fuente: "domus", total: 0 };
    }

    const locked = await acquireRedisLock(LOGIN_LOCK_KEY, 30);
    try {
      const { cookies, ua } = await doFreshV2Login();
      rawData = await fetchPropertiesWithCookies(cookies);
      if (!rawData || rawData.length === 0) {
        throw new Error("Domus v2: login fresco no devolvió inmuebles");
      }
      if (kv) {
        await kv
          .set(V2_SESSION_KEY, { cookies, ua, createdAt: Date.now() }, { ex: V2_SESSION_TTL })
          .catch(() => {});
      }
    } finally {
      if (locked) await releaseRedisLock(LOGIN_LOCK_KEY);
    }
  }

  const inmuebles = mapProperties(rawData);
  const result = { inmuebles, fuente: "domus", total: inmuebles.length };

  if (inmuebles.length > 0 && kv) {
    await kv.set(INMUEBLES_REDIS_KEY, result, { ex: INMUEBLES_TTL }).catch(() => {});
  }

  return result;
}

export async function invalidateInmueblesCache(): Promise<void> {
  const kv = getRedis();
  if (kv) {
    await kv.del(INMUEBLES_REDIS_KEY).catch(() => {});
  }
}
