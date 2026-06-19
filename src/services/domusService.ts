// src/services/domusService.ts
// Obtiene inmuebles de Patricia desde la API de Domus.
//
// Estrategia de sesión (prioridad):
//  1. Cache de inmuebles en Redis (1 hora) → respuesta inmediata
//  2. Sesión compartida con crmService (domus_session) → evita doble login
//  3. Sesión propia v2 (domus_v2_session) → fallback si CRM no se ha logueado aún
//  4. Login fresco → guardado en domus_v2_session (TTL 5 días)

import type { Inmueble } from "@/types";
import { Redis } from "@upstash/redis";

const DOMUS_HOME_URL       = "https://v2.domus.la";
const DOMUS_LOGIN_URL      = "https://v2.domus.la/auth-login";
const DOMUS_FILTER_URL     = "https://v2.domus.la/properties/filter";

const INMUEBLES_REDIS_KEY  = "inmuebles_domus_v2_promotor_v5";
const INMUEBLES_TTL        = 6 * 60 * 60;       // 6 horas (reduce llamadas a Domus de 24/día → 4/día)

// Sesión propia de v2 (fallback si crmService no tiene sesión activa)
const V2_SESSION_KEY       = "domus_v2_session";
const V2_SESSION_TTL       = 5 * 24 * 60 * 60; // 5 días

// Sesión compartida con crmService — mismo login, evita doble request a Domus
const CRM_SESSION_KEY      = "domus_session";

// UA consistente con el pool de crmService (desktop Chrome)
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

interface V2Session {
  cookies: string;
  ua: string;
  createdAt: number;
}

// Estructura que guarda crmService — solo necesitamos los campos de v2
interface CrmStoredSession {
  sessionCookie: string;
  authCookies: string;
  ua: string;
}

// ── Redis — mismas env vars que crmService ────────────────────────────────
function getRedis(): Redis | null {
  try { return Redis.fromEnv(); } catch { return null; }
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

/** Pausa con variación humana — igual que crmService */
function humanDelay(min = 600, max = 2200): Promise<void> {
  return new Promise(r => setTimeout(r, min + Math.random() * (max - min)));
}

// ── Login fresco a v2.domus.la ────────────────────────────────────────────
async function doFreshV2Login(): Promise<{ cookies: string; ua: string }> {
  const username = process.env.DOMUS_USERNAME;
  const password = process.env.DOMUS_PASSWORD;
  if (!username || !password) throw new Error("Credenciales Domus no configuradas");

  // 1. CSRF + sesión inicial
  const homeRes = await fetch(DOMUS_HOME_URL, {
    headers: {
      "User-Agent":     UA,
      "Accept":         "text/html,application/xhtml+xml,*/*",
      "Accept-Language":"es-CO,es;q=0.9",
    },
    cache: "no-store",
  });
  const homeText    = await homeRes.text();
  const csrfToken   = homeText.match(/<meta name="csrf-token-login" content="([^"]+)"/)?.[1] ?? "";
  const sessionCookie = extractCookies(homeRes.headers);

  // Pausa humana entre cargar la página y hacer click en "Ingresar"
  await humanDelay(700, 1800);

  // 2. Login
  const loginRes = await fetch(DOMUS_LOGIN_URL, {
    method: "POST",
    headers: {
      "Content-Type":    "application/json",
      "X-CSRF-TOKEN":    csrfToken,
      "Cookie":          sessionCookie,
      "User-Agent":      UA,
      "Accept":          "application/json",
      "Accept-Language": "es-CO,es;q=0.9",
      "Referer":         "https://v2.domus.la/",
    },
    body: JSON.stringify({ user: username, password }),
    cache: "no-store",
  });

  const loginData: any = await loginRes.json().catch(() => ({}));
  if (loginData.mensaje !== "Login exitoso" && loginData.camb_clave === undefined) {
    throw new Error("Login a Domus v2 fallido");
  }

  const authCookies = extractCookies(loginRes.headers);
  const cookies     = [sessionCookie, authCookies].filter(Boolean).join("; ");
  return { cookies, ua: UA };
}

// ── Llamada a la API de propiedades ───────────────────────────────────────
// Usa el payload EXACTO que Domus envía cuando Olga Patricia filtra sus inmuebles:
// {"data":{"status":1,"orderby":1,"caractype":1,"id_inmobiliaria_session":607,"cant_paginador":15}}
// Domus usa las cookies de sesión para devolver solo los inmuebles de Olga (captadora + promotora).
const DOMUS_INMOBILIARIA_SESSION_ID = 607; // ID de inmobiliaria L2L Bienes Raíces en Domus

async function fetchPropertiesWithCookies(cookies: string, ua: string = UA): Promise<any[] | null> {
  const fetchPage = async (page: number): Promise<any | null> => {
    const res = await fetch(`${DOMUS_FILTER_URL}?page=${page}`, {
      method: "POST",
      headers: {
        "Cookie":           cookies,
        "User-Agent":       ua,
        "Content-Type":     "application/json",
        "Accept":           "application/json",
        "X-Requested-With": "XMLHttpRequest",
        "Accept-Language":  "es-CO,es;q=0.9",
        "Referer":          "https://v2.domus.la/properties/list",
        "Origin":           "https://v2.domus.la",
      },
      body: JSON.stringify({
        data: {
          status:                   1,    // solo inmuebles activos (Disponible/En proceso)
          orderby:                  1,
          caractype:                1,
          id_inmobiliaria_session:  DOMUS_INMOBILIARIA_SESSION_ID,
          cant_paginador:           15,
        },
      }),
      cache: "no-store",
    });

    if (res.status === 401 || res.status === 403) return null;  // sesión expirada
    if (!res.ok) throw new Error(`Domus properties API: ${res.status}`);
    return res.json();
  };

  const firstPage = await fetchPage(1);
  if (!firstPage) return null;                                   // sesión expirada
  if (!firstPage.data || !Array.isArray(firstPage.data)) return [];

  const all = [...firstPage.data];
  const totalPages = firstPage.last_page ?? 1;

  for (let i = 2; i <= totalPages; i++) {
    try {
      const page = await fetchPage(i);
      if (page?.data && Array.isArray(page.data)) all.push(...page.data);
    } catch (e) {
      console.error(`Domus page ${i} error:`, e);
    }
  }

  return all;
}


// ── Mapeo de propiedades ──────────────────────────────────────────────────
function mapProperties(raw: any[]): Inmueble[] {
  return raw
    .filter((p: any) => {
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
      
      const rawString = `property=${p.id}&profile=29214&group=0&template=1&contact=1`;
      const urlDomusBase64 = typeof btoa !== "undefined" ? btoa(rawString) : Buffer.from(rawString).toString("base64");
      const urlDomusCard = `https://card.domus.la/public/file/${urlDomusBase64}`;

      // Capturar todas las imágenes (Domus puede devolver el array en distintos campos)
      const rawImgs: any[] = Array.isArray(p.imagenes) ? p.imagenes
        : Array.isArray(p.fotos) ? p.fotos
        : Array.isArray(p.photos) ? p.photos
        : [];
      const imagenes: string[] = rawImgs
        .map((img: any) => img?.imageurl || img?.url || img?.src)
        .filter((url): url is string => Boolean(url) && !url.includes("placeholder"));
      if (imagen && !imagen.includes("placeholder") && !imagenes.includes(imagen)) {
        imagenes.unshift(imagen);
      }

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
        imagenes,
        urlL2L,
        urlDomus:     urlDomusCard,
        estado:       p.estado_inmueble?.estado_inmueble ?? "Disponible",
      };
    });
}

// ── Export principal ──────────────────────────────────────────────────────
export async function fetchDomusProperties(): Promise<{ inmuebles: Inmueble[]; fuente: string; total: number }> {
  const kv = getRedis();

  // 1. Cache de inmuebles en Redis (6h) — respuesta inmediata
  if (kv) {
    try {
      const cached = await kv.get<{ inmuebles: Inmueble[]; fuente: string; total: number }>(INMUEBLES_REDIS_KEY);
      if (cached?.inmuebles && cached.inmuebles.length > 0) return cached;
    } catch { /* continuar si Redis falla */ }
  }

  // 2-3. Obtener datos frescos usando sesión propia de v2.domus.la
  //      NOTA: La sesión del CRM (crm.domusweb.co) NO es válida para v2.domus.la,
  //            por eso se omite y se usa directamente la sesión propia o un login fresco.
  let rawData: any[] | null = null;

  // 2. Usar sesión propia de v2 guardada (evita login si existe y es válida)
  if (kv) {
    try {
      const stored = await kv.get<V2Session>(V2_SESSION_KEY);
      if (stored?.cookies) {
        rawData = await fetchPropertiesWithCookies(stored.cookies, stored.ua || UA);
        // Si devuelve array vacío (sesión expirada silenciosamente), lo tratamos como null
        if (Array.isArray(rawData) && rawData.length === 0) rawData = null;
      }
    } catch { /* continuar */ }
  }

  // 3. Login fresco si la sesión guardada falló, expiró o devolvió vacío
  if (rawData === null) {
    const { cookies, ua: loginUA } = await doFreshV2Login();
    rawData = await fetchPropertiesWithCookies(cookies, loginUA);
    if (!rawData || rawData.length === 0) throw new Error("Domus v2: login fresco no devolvió inmuebles");

    // Guardar nueva sesión propia (5 días)
    if (kv) {
      kv.set(V2_SESSION_KEY, { cookies, ua: loginUA, createdAt: Date.now() }, { ex: V2_SESSION_TTL })
        .catch(() => {});
    }
  }

  const inmuebles = mapProperties(rawData);
  const result    = { inmuebles, fuente: "domus", total: inmuebles.length };

  // Guardar en Redis solo si tenemos resultados reales
  if (inmuebles.length > 0 && kv) {
    kv.set(INMUEBLES_REDIS_KEY, result, { ex: INMUEBLES_TTL }).catch(() => {});
  }

  return result;
}

// ── Invalidar caché (llamado desde el botón "Forzar actualización") ───────
export async function invalidateInmueblesCache(): Promise<void> {
  const kv = getRedis();
  if (kv) {
    await kv.del(INMUEBLES_REDIS_KEY);
  }
}
