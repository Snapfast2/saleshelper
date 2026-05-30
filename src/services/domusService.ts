// src/services/domusService.ts
// Obtiene inmuebles de Patricia desde la API de Domus.
// La sesión de v2.domus.la se reutiliza desde Redis (TTL 5 días)
// para evitar un login fresco en cada expiración de cache (cada hora).

import type { Inmueble } from "@/types";
import { Redis } from "@upstash/redis";

const DOMUS_HOME_URL       = "https://v2.domus.la";
const DOMUS_LOGIN_URL      = "https://v2.domus.la/auth-login";
const DOMUS_FILTER_URL     = "https://v2.domus.la/properties/filter";

const INMUEBLES_REDIS_KEY  = "inmuebles_domus";
const INMUEBLES_TTL        = 60 * 60;           // 1 hora

// Sesión de v2.domus.la reutilizable — mismo ciclo de vida que crmService (5 días)
const V2_SESSION_KEY       = "domus_v2_session";
const V2_SESSION_TTL       = 5 * 24 * 60 * 60; // 5 días

// UA consistente con el pool de crmService (Desktop Chrome)
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

interface V2Session {
  cookies: string;
  createdAt: number;
}

// ── Redis ─────────────────────────────────────────────────────────────────
function getRedis(): Redis | null {
  const url   = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  try { return new Redis({ url, token }); } catch { return null; }
}

// ── Helpers ───────────────────────────────────────────────────────────────
function extractCookies(headers: Headers): string {
  if (typeof (headers as any).getSetCookie === "function") {
    return (headers as any).getSetCookie()
      .map((c: string) => c.split(";")[0].trim())
      .join("; ");
  }
  const raw = headers.get("set-cookie") ?? "";
  return raw.split(",").map(c => c.split(";")[0].trim()).join("; ");
}

// ── Login fresco a v2.domus.la ────────────────────────────────────────────
async function doFreshV2Login(): Promise<string> {
  const username = process.env.DOMUS_USERNAME;
  const password = process.env.DOMUS_PASSWORD;
  if (!username || !password) throw new Error("Credenciales Domus no configuradas");

  // 1. CSRF + sesión inicial
  const homeRes = await fetch(DOMUS_HOME_URL, {
    headers: {
      "User-Agent": UA,
      "Accept": "text/html,application/xhtml+xml,*/*",
      "Accept-Language": "es-CO,es;q=0.9",
    },
    cache: "no-store",
  });
  const homeText    = await homeRes.text();
  const csrfToken   = homeText.match(/<meta name="csrf-token-login" content="([^"]+)"/)?.[1] ?? "";
  const sessionCookie = extractCookies(homeRes.headers);

  // 2. Login
  const loginRes = await fetch(DOMUS_LOGIN_URL, {
    method: "POST",
    headers: {
      "Content-Type":   "application/json",
      "X-CSRF-TOKEN":   csrfToken,
      "Cookie":         sessionCookie,
      "User-Agent":     UA,
      "Accept":         "application/json",
      "Accept-Language":"es-CO,es;q=0.9",
      "Referer":        "https://v2.domus.la/",
    },
    body: JSON.stringify({ user: username, password }),
    cache: "no-store",
  });

  const loginData: any = await loginRes.json().catch(() => ({}));
  if (loginData.mensaje !== "Login exitoso" && loginData.camb_clave === undefined) {
    throw new Error("Login a Domus v2 fallido");
  }

  const authCookies = extractCookies(loginRes.headers);
  return [sessionCookie, authCookies].filter(Boolean).join("; ");
}

// ── Llamada a la API de propiedades ───────────────────────────────────────
// Retorna null si la sesión expiró (401/403), lanza error en otros fallos.
async function fetchPropertiesWithCookies(cookies: string): Promise<any[] | null> {
  const fetchPage = async (page: number): Promise<any | null> => {
    const res = await fetch(`${DOMUS_FILTER_URL}?page=${page}`, {
      method: "POST",
      headers: {
        "Cookie":           cookies,
        "User-Agent":       UA,
        "Content-Type":     "application/json",
        "Accept":           "application/json",
        "X-Requested-With": "XMLHttpRequest",
        "Accept-Language":  "es-CO,es;q=0.9",
      },
      body: JSON.stringify({ data: { buscar: "", captador: 29214 } }),
      cache: "no-store",
    });

    if (res.status === 401 || res.status === 403) return null; // sesión expirada
    if (!res.ok) throw new Error(`Domus properties API: ${res.status}`);
    return res.json();
  };

  const firstPage = await fetchPage(1);
  if (!firstPage)                                           return null; // sesión expirada
  if (!firstPage.data || !Array.isArray(firstPage.data))   throw new Error("Respuesta inesperada de Domus");

  let all = [...firstPage.data];
  const totalPages = firstPage.last_page ?? 1;

  if (totalPages > 1) {
    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) => fetchPage(i + 2))
    );
    rest.forEach(p => p?.data && Array.isArray(p.data) && all.push(...p.data));
  }

  return all;
}

// ── Mapeo de propiedades ──────────────────────────────────────────────────
function mapProperties(raw: any[]): Inmueble[] {
  return raw
    .filter((p: any) => {
      if (!p.captador || p.captador.id !== 29214) return false;
      const estado = p.estado_inmueble?.estado_inmueble ?? "";
      return estado === "Disponible" || estado === "En proceso";
    })
    .map((p: any) => {
      const gestionText = p.gestion?.gestion?.toLowerCase() ?? "";
      const gestion: "venta" | "arriendo" = gestionText.includes("arriendo") ? "arriendo" : "venta";
      const precio   = gestion === "arriendo" ? (p.canon ?? 0)  : (p.venta ?? 0);
      const imagen   = p.primera_imagen?.imageurl ?? "https://via.placeholder.com/400x300?text=Sin+Foto";
      const codigo   = String(p.codigo || p.id);
      const urlL2L   = p.codigo ? `https://l2lbienesraices.com/inmueble/${p.codigo}` : "";

      return {
        id:           codigo,
        codigoDomus:  codigo,
        titulo:       `${p.tipo_inmueble?.tipo_inmueble ?? "Inmueble"} en ${gestion === "venta" ? "Venta" : "Arriendo"} en ${p.barrio ?? ""}`,
        tipo:         p.tipo_inmueble?.tipo_inmueble ?? "Inmueble",
        ciudad:       p.ciudad?.nombre ?? "Bogotá",
        barrio:       p.barrio ?? "",
        gestion,
        precio,
        areaTotal:    p.area_construida  ?? 0,
        habitaciones: p.habitaciones     ?? 0,
        banos:        p.banos            ?? 0,
        garajes:      p.parqueadero      ?? 0,
        imagen,
        urlL2L,
        urlDomus:     urlL2L,
        estado:       p.estado_inmueble?.estado_inmueble ?? "Disponible",
      };
    });
}

// ── Export principal ──────────────────────────────────────────────────────
export async function fetchDomusProperties(): Promise<{ inmuebles: Inmueble[]; fuente: string; total: number }> {
  const kv = getRedis();

  // 1. Cache de inmuebles en Redis (1 hora)
  if (kv) {
    try {
      const cached = await kv.get<{ inmuebles: Inmueble[]; fuente: string; total: number }>(INMUEBLES_REDIS_KEY);
      if (cached?.inmuebles && cached.inmuebles.length > 0) return cached;
    } catch { /* continuar si Redis falla */ }
  }

  // 2. Intentar reutilizar sesión guardada en Redis
  let rawData: any[] | null = null;

  if (kv) {
    try {
      const stored = await kv.get<V2Session>(V2_SESSION_KEY);
      if (stored?.cookies) {
        rawData = await fetchPropertiesWithCookies(stored.cookies);
        // null = sesión expirada antes de los 5 días → cae al login fresco
      }
    } catch { /* continuar */ }
  }

  // 3. Login fresco si la sesión no existía o expiró
  if (rawData === null) {
    const cookies = await doFreshV2Login();
    rawData = await fetchPropertiesWithCookies(cookies);
    if (!rawData) throw new Error("Domus v2: login fresco también retornó sesión inválida");

    // Guardar nueva sesión en Redis (5 días)
    if (kv) {
      kv.set(V2_SESSION_KEY, { cookies, createdAt: Date.now() }, { ex: V2_SESSION_TTL })
        .catch(() => {});
    }
  }

  const inmuebles = mapProperties(rawData);
  const result    = { inmuebles, fuente: "domus", total: inmuebles.length };

  // Guardar resultado en Redis (1 hora)
  if (kv) kv.set(INMUEBLES_REDIS_KEY, result, { ex: INMUEBLES_TTL }).catch(() => {});

  return result;
}
