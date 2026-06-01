import { Redis } from "@upstash/redis";
import { Cliente } from "../types";

// ── Redis (Upstash) ────────────────────────────────────────────────────────
let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (redis) return redis;
  try {
    redis = Redis.fromEnv();
    return redis;
  } catch {
    return null; // local sin KV configurado
  }
}

const SESSION_KEY = "domus_session";
const SESSION_TTL = 5 * 24 * 60 * 60; // 5 días en segundos
const CLIENTS_TTL = 20 * 60;           // 20 min en segundos

interface StoredSession {
  sessionCookie: string;
  authCookies: string;
  crmSessionCookie: string;
  ua: string;
  createdAt: number;
}

// ── User-Agent pool — 2 desktop + 2 mobile ────────────────────────────────
const UA_POOL = [
  // Desktop moderno — Chrome 124, Windows 11
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  // Desktop generación anterior — Chrome 119, Windows 10
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  // Mobile moderno — Pixel 8, Android 14, Chrome 124
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  // Mobile generación anterior — Samsung A53, Android 13, Chrome 119
  "Mozilla/5.0 (Linux; Android 13; SM-A536B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36",
];

function pickUA(): string {
  return UA_POOL[Math.floor(Math.random() * UA_POOL.length)];
}

// ── Cache en memoria (fallback si KV no está disponible) ──────────────────
const memCache: Record<string, Cliente[]> = {};
const memCacheTs: Record<string, number> = {};

function randomTTL() {
  return (25 + Math.random() * 13) * 60 * 1000; // 25-38 min en ms
}

function humanDelay(min = 600, max = 2200): Promise<void> {
  return new Promise(r => setTimeout(r, min + Math.random() * (max - min)));
}

function extractCookies(headers: Headers, filterPrefix?: string): string {
  let cookies: string[] = [];
  if (typeof (headers as any).getSetCookie === "function") {
    cookies = (headers as any).getSetCookie();
  } else {
    const raw = headers.get("set-cookie");
    if (raw) cookies.push(...raw.split(","));
  }
  return cookies
    .map(c => c.split(";")[0].trim())
    .filter(c => !filterPrefix || c.includes(filterPrefix))
    .join("; ");
}

// ── Auth completo contra Domus ────────────────────────────────────────────
async function doFullLogin(ua: string): Promise<StoredSession | null> {
  const username = process.env.DOMUS_USERNAME;
  const password = process.env.DOMUS_PASSWORD;
  if (!username || !password) throw new Error("Credenciales no configuradas");

  const ts = Date.now();
  const logBase = `[CRM-LOGIN ${new Date().toISOString()}]`;

  // 1. CSRF + sesión inicial
  console.log(`${logBase} Paso 1: obteniendo CSRF de Domus...`);
  let homeRes: Response;
  try {
    homeRes = await fetch(`https://v2.domus.la?t=${ts}`, {
      headers: { "User-Agent": ua, "Accept": "text/html,application/xhtml+xml,*/*", "Accept-Language": "es-CO,es;q=0.9" },
      cache: "no-store",
    });
  } catch (e: any) {
    console.error(`${logBase} ❌ Paso 1 FALLÓ — no se pudo conectar a Domus: ${e.message}`);
    throw e;
  }
  const homeText = await homeRes.text();
  const csrfToken = homeText.match(/<meta name="csrf-token-login" content="([^"]+)"/)?.[1] ?? "";
  const sessionCookie = extractCookies(homeRes.headers);
  console.log(`${logBase} Paso 1 OK — HTTP ${homeRes.status}, CSRF: ${csrfToken ? "encontrado" : "❌ NO ENCONTRADO"}, cookie: ${sessionCookie ? "OK" : "❌ vacía"}`);

  await humanDelay(800, 1800);

  // 2. Login
  console.log(`${logBase} Paso 2: haciendo login con usuario "${username?.slice(0, 4)}..."`);
  let loginRes: Response;
  try {
    loginRes = await fetch("https://v2.domus.la/auth-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json", "X-CSRF-TOKEN": csrfToken,
        "Cookie": sessionCookie, "User-Agent": ua,
        "Accept": "application/json", "Accept-Language": "es-CO,es;q=0.9",
        "Referer": "https://v2.domus.la/",
      },
      body: JSON.stringify({ user: username, password }),
      cache: "no-store",
    });
  } catch (e: any) {
    console.error(`${logBase} ❌ Paso 2 FALLÓ — error de red en login: ${e.message}`);
    throw e;
  }
  const loginData: any = await loginRes.json().catch(() => ({}));
  console.log(`${logBase} Paso 2 respuesta — HTTP ${loginRes.status}, mensaje: "${loginData.mensaje}", camb_clave: ${loginData.camb_clave}`);
  if (loginData.mensaje !== "Login exitoso" && loginData.camb_clave === undefined) {
    console.error(`${logBase} ❌ Login rechazado por Domus. Respuesta completa: ${JSON.stringify(loginData).slice(0, 200)}`);
    return null;
  }

  const authCookies = extractCookies(loginRes.headers);
  const finalCookies = sessionCookie + "; " + authCookies;
  console.log(`${logBase} Paso 2 OK — auth cookies: ${authCookies ? "OK" : "❌ vacías"}`);

  await humanDelay(600, 1500);

  // 3. SSO → CRM
  console.log(`${logBase} Paso 3: SSO hacia CRM...`);
  let crmAuthRes: Response;
  try {
    crmAuthRes = await fetch(`https://v2.domus.la/crm/new/ingreso?t=${ts}`, {
      headers: { "Cookie": finalCookies, "User-Agent": ua, "Referer": "https://v2.domus.la/", "Accept-Language": "es-CO,es;q=0.9" },
      redirect: "manual", cache: "no-store",
    });
  } catch (e: any) {
    console.error(`${logBase} ❌ Paso 3 FALLÓ — error de red en SSO: ${e.message}`);
    throw e;
  }
  console.log(`${logBase} Paso 3 respuesta — HTTP ${crmAuthRes.status}`);
  if (crmAuthRes.status !== 302 && crmAuthRes.status !== 301) {
    console.error(`${logBase} ❌ SSO no redirigió. Se esperaba 301/302, se recibió ${crmAuthRes.status}`);
    return null;
  }
  const redirectUrl = crmAuthRes.headers.get("location");
  if (!redirectUrl) {
    console.error(`${logBase} ❌ SSO no devolvió URL de redirección`);
    return null;
  }
  console.log(`${logBase} Paso 3 OK — redirige a: ${redirectUrl.slice(0, 80)}...`);

  await humanDelay(500, 1200);

  // 4. Token → sesión CRM
  console.log(`${logBase} Paso 4: obteniendo sesión CRM...`);
  let crmRes: Response;
  try {
    crmRes = await fetch(redirectUrl + (redirectUrl.includes("?") ? "&" : "?") + `t=${ts}`, {
      headers: { "User-Agent": ua, "Accept": "text/html,application/xhtml+xml,*/*", "Accept-Language": "es-CO,es;q=0.9" },
      redirect: "manual", cache: "no-store",
    });
  } catch (e: any) {
    console.error(`${logBase} ❌ Paso 4 FALLÓ — error de red al obtener sesión CRM: ${e.message}`);
    throw e;
  }
  const crmSessionCookie = extractCookies(crmRes.headers, "session");
  console.log(`${logBase} Paso 4 — HTTP ${crmRes.status}, sesión CRM: ${crmSessionCookie ? "✅ OK" : "❌ NO ENCONTRADA"}`);

  if (!crmSessionCookie) {
    console.error(`${logBase} ❌ Login completo pero NO se obtuvo cookie de sesión CRM. El login no servirá.`);
  } else {
    console.log(`${logBase} ✅ Login exitoso en ${Date.now() - ts}ms`);
  }

  return { sessionCookie, authCookies, crmSessionCookie, ua, createdAt: Date.now() };
}

// ── Obtener sesión (KV → login si no hay) ─────────────────────────────────
async function getSession(): Promise<StoredSession> {
  const kv = getRedis();

  if (kv) {
    const stored = await kv.get<StoredSession>(SESSION_KEY);
    if (stored && stored.crmSessionCookie) {
      return stored;
    }
  }

  // No hay sesión guardada — hacer login completo
  await humanDelay(700, 2200);
  const ua = pickUA();
  const session = await doFullLogin(ua);
  if (!session) throw new Error("Login a Domus fallido");

  // Guardar en KV
  if (kv) {
    await kv.set(SESSION_KEY, session, { ex: SESSION_TTL });
  }

  return session;
}

// ── Fetch principal de clientes ───────────────────────────────────────────
export async function fetchCrmClients(
  statusType: number | string = 1,
  options: { noCache?: boolean } = {}
): Promise<Cliente[]> {
  const { noCache = false } = options;
  const now = Date.now();
  const cacheKey = String(statusType);
  const redisDataKey = `clients_${cacheKey}`;

  // 1. Cache en memoria — instancia caliente (solo si no se pide datos frescos)
  if (!noCache && memCache[cacheKey] && (now - memCacheTs[cacheKey]) < randomTTL()) {
    return memCache[cacheKey];
  }

  // 2. Redis data cache — persiste entre instancias y cold starts (skip si noCache)
  const kv = getRedis();
  if (!noCache && kv) {
    try {
      const cached = await kv.get<Cliente[]>(redisDataKey);
      if (cached && cached.length > 0) {
        memCache[cacheKey] = cached;
        memCacheTs[cacheKey] = now;
        return cached;
      }
    } catch { /* Redis no disponible — continuar */ }
  }

  // 3. Fetch desde Domus (directo cuando noCache=true, o cache miss)
  const logFetch = `[CRM-FETCH status=${statusType} ${new Date().toISOString()}]`;
  try {
    console.log(`${logFetch} Iniciando fetch de clientes...`);
    let session = await getSession();
    console.log(`${logFetch} Sesión obtenida — cookie CRM: ${session.crmSessionCookie ? "✅ presente" : "❌ VACÍA"}`);

    const targetUrl = statusType === "todos" || statusType === ""
      ? "contacts?page=1&order=created_at_new"
      : `contacts?page=1&contact_status_type=${statusType}&order=created_at_new`;

    console.log(`${logFetch} Llamando CRM API → ${targetUrl}`);
    const apiRes = await fetch("https://crm.domusweb.co/api/get", {
      method: "POST",
      headers: {
        "Cookie": session.crmSessionCookie,
        "User-Agent": session.ua,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Accept-Language": "es-CO,es;q=0.9",
        "Referer": "https://crm.domusweb.co/",
      },
      body: JSON.stringify({ url: targetUrl }),
      cache: "no-store",
    });
    console.log(`${logFetch} CRM API respuesta — HTTP ${apiRes.status}`);

    // Parsear el body primero — el CRM a veces devuelve HTTP 200 con code:403 en el body
    const apiData = await apiRes.json().catch(() => ({}));

    // Detectar sesión caducada: tanto por HTTP status como por code en el body
    const sessionExpired =
      apiRes.status === 401 || apiRes.status === 403 ||
      (apiData?.code === 403 || apiData?.code === 401);

    if (sessionExpired) {
      console.warn(`${logFetch} ⚠️ Sesión rechazada (HTTP ${apiRes.status}, body code: ${apiData?.code ?? "—"}) — limpiando KV y reintentando login...`);
      if (kv) { await kv.del(SESSION_KEY); await kv.del(redisDataKey); }
      session = await getSession();
      console.log(`${logFetch} Nueva sesión tras relogin — cookie: ${session.crmSessionCookie ? "✅" : "❌ VACÍA"}`);

      const retry = await fetch("https://crm.domusweb.co/api/get", {
        method: "POST",
        headers: {
          "Cookie": session.crmSessionCookie,
          "User-Agent": session.ua,
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Accept-Language": "es-CO,es;q=0.9",
          "Referer": "https://crm.domusweb.co/",
        },
        body: JSON.stringify({ url: targetUrl }),
        cache: "no-store",
      });
      console.log(`${logFetch} Reintento CRM API — HTTP ${retry.status}`);
      const retryData = await retry.json().catch(() => ({}));
      if (retryData?.data) {
        const clients = mapClients(retryData.data);
        console.log(`${logFetch} ✅ Reintento exitoso — ${clients.length} clientes`);
        memCache[cacheKey] = clients; memCacheTs[cacheKey] = now;
        if (kv) await kv.set(redisDataKey, clients, { ex: CLIENTS_TTL }).catch(() => {});
        return clients;
      }
      console.error(`${logFetch} ❌ Reintento también falló. Respuesta: ${JSON.stringify(retryData).slice(0, 200)}`);
      throw new Error("Re-login fallido — CRM no acepta la nueva sesión");
    }

    if (apiData?.data) {
      const clients = mapClients(apiData.data);
      console.log(`${logFetch} ✅ Fetch exitoso — ${clients.length} clientes obtenidos`);
      memCache[cacheKey] = clients; memCacheTs[cacheKey] = now;
      // Guardar en Redis — el cron lo mantiene fresco cada 15 min
      if (kv) await kv.set(redisDataKey, clients, { ex: CLIENTS_TTL }).catch(() => {});
      return clients;
    }

    console.error(`${logFetch} ❌ Respuesta inesperada del CRM. Claves recibidas: ${Object.keys(apiData || {}).join(", ")}. Fragmento: ${JSON.stringify(apiData).slice(0, 300)}`);
    throw new Error("Respuesta inesperada del CRM");


  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`${logFetch} ❌ Error fatal en fetchCrmClients: ${msg}`);
    if (memCache[cacheKey]) {
      console.warn(`${logFetch} ⚠️ Devolviendo ${memCache[cacheKey].length} clientes desde caché en memoria (datos pueden ser viejos)`);
      return memCache[cacheKey];
    }
    console.error(`${logFetch} ❌ Sin caché disponible — devolviendo lista vacía. ESTO CAUSA "No hay clientes"`);
    return [];
  }
}

function mapClients(data: any[]): Cliente[] {
  return data.map((c: any) => {
    // Si vino por Autoleads (integración con portales externos como Metrocuadrado),
    // el portal específico solo está en el detalle individual del contacto.
    // Mostramos "Autoleads" que coincide con lo que el CRM de Domus muestra.
    let origin = "Portal Web";
    if (c.autoleads === 1) {
      origin = "Autoleads";
    } else if (c.source === 2) {
      origin = "Finca Raíz";
    } else if (c.source === 6) {
      origin = "Metrocuadrado";
    } else if (c.source === 5) {
      origin = "Ciencuadras";
    } else if (c.source === 3) {
      origin = "Sitio Web Propio";
    }
    return {
      id: c.code,
      nombre: c.full_name || "Sin nombre",
      email: c.email || "",
      telefono: c.phones?.length > 0 ? c.phones[0].phone : "",
      telefonoIndicativo: c.phones?.length > 0 ? c.phones[0].phone_indicative : "+57",
      estado: c.status?.name ?? "Desconocido",
      inmuebleInteres: c.entities?.length > 0 ? c.entities[0].property_code : "N/A",
      origen: origin,
      fecha: c.created_at || new Date().toISOString(),
      diasSeguimiento: typeof c.next_follow_days === "number" ? c.next_follow_days : undefined,
    };
  });
}
