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

  // 1. CSRF + sesión inicial
  const homeRes = await fetch(`https://v2.domus.la?t=${ts}`, {
    headers: { "User-Agent": ua, "Accept": "text/html,application/xhtml+xml,*/*", "Accept-Language": "es-CO,es;q=0.9" },
    cache: "no-store",
  });
  const homeText = await homeRes.text();
  const csrfToken = homeText.match(/<meta name="csrf-token-login" content="([^"]+)"/)?.[1] ?? "";
  const sessionCookie = extractCookies(homeRes.headers);

  await humanDelay(800, 1800);

  // 2. Login
  const loginRes = await fetch("https://v2.domus.la/auth-login", {
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
  const loginData: any = await loginRes.json().catch(() => ({}));
  if (loginData.mensaje !== "Login exitoso" && loginData.camb_clave === undefined) return null;

  const authCookies = extractCookies(loginRes.headers);
  const finalCookies = sessionCookie + "; " + authCookies;

  await humanDelay(600, 1500);

  // 3. SSO → CRM
  const crmAuthRes = await fetch(`https://v2.domus.la/crm/new/ingreso?t=${ts}`, {
    headers: { "Cookie": finalCookies, "User-Agent": ua, "Referer": "https://v2.domus.la/", "Accept-Language": "es-CO,es;q=0.9" },
    redirect: "manual", cache: "no-store",
  });
  if (crmAuthRes.status !== 302 && crmAuthRes.status !== 301) return null;
  const redirectUrl = crmAuthRes.headers.get("location");
  if (!redirectUrl) return null;

  await humanDelay(500, 1200);

  // 4. Token → sesión CRM
  const crmRes = await fetch(redirectUrl + (redirectUrl.includes("?") ? "&" : "?") + `t=${ts}`, {
    headers: { "User-Agent": ua, "Accept": "text/html,application/xhtml+xml,*/*", "Accept-Language": "es-CO,es;q=0.9" },
    redirect: "manual", cache: "no-store",
  });
  const crmSessionCookie = extractCookies(crmRes.headers, "session");

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
export async function fetchCrmClients(statusType: number | string = 1): Promise<Cliente[]> {
  const now = Date.now();
  const cacheKey = String(statusType);

  // Cache en memoria todavía válido
  if (memCache[cacheKey] && (now - memCacheTs[cacheKey]) < randomTTL()) {
    return memCache[cacheKey];
  }

  try {
    let session = await getSession();

    const targetUrl = statusType === "todos" || statusType === ""
      ? "contacts?page=1&order=created_at_new"
      : `contacts?page=1&contact_status_type=${statusType}&order=created_at_new`;

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

    // Si la sesión caducó, limpiar KV y reintentar una vez
    if (apiRes.status === 401 || apiRes.status === 403) {
      const kv = getRedis();
      if (kv) await kv.del(SESSION_KEY);
      session = await getSession();

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
      const retryData = await retry.json();
      if (retryData?.data) {
        const clients = mapClients(retryData.data);
        memCache[cacheKey] = clients;
        memCacheTs[cacheKey] = now;
        return clients;
      }
    }

    const apiData = await apiRes.json();
    if (apiData?.data) {
      const clients = mapClients(apiData.data);
      memCache[cacheKey] = clients;
      memCacheTs[cacheKey] = now;
      return clients;
    }

    throw new Error("Respuesta inesperada del CRM");

  } catch (error) {
    console.error("CRM fetch error:", error instanceof Error ? error.message : "Unknown");
    if (memCache[cacheKey]) return memCache[cacheKey];
    return [];
  }
}

function mapClients(data: any[]): Cliente[] {
  return data.map((c: any) => {
    let origin = "Portal Web";
    if (c.source === 2) origin = "Finca Raíz";
    if (c.source === 6) origin = "Metro Cuadrado";
    if (c.source === 5) origin = "Ciencuadras";
    if (c.source === 3) origin = "Sitio Web Propio";
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
