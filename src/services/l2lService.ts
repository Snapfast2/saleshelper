import * as cheerio from "cheerio";
import { cache } from "react";
import { after } from "next/server";
import type { Inmueble } from "@/types";
import { INMUEBLES_DEMO } from "@/lib/inmuebles-demo";
import { DOMUS_BROWSER_UA } from "@/lib/auth";
import { acquireRedisLock, getRedis } from "@/lib/redis";

if (typeof window !== "undefined") {
  throw new Error("src/services/l2lService.ts solo puede importarse en el servidor.");
}

// Perfil público de Olga Patricia en L2L — fuente autoritativa de sus inmuebles activos
const L2L_AGENT_BASE = "https://www.l2lbienesraices.com/busqueda/pagina";
const L2L_AGENT_ID   = process.env.L2L_AGENT_ID || "29214";
const L2L_HEADERS    = {
  "User-Agent": DOMUS_BROWSER_UA,
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "es-CO,es;q=0.9",
};

const L2L_REDIS_KEY       = "inmuebles_l2l_v1";
const L2L_STALE_REDIS_KEY = "inmuebles_l2l_stale_v1";
const L2L_TTL_SEC         = 30 * 60;      // 30 minutos fresco en Redis
const L2L_STALE_TTL_SEC   = 24 * 60 * 60; // 24 horas respaldo instantáneo
const MEM_TTL_MS          = 5 * 60 * 1000;

export interface L2LCatalogResult {
  inmuebles: Inmueble[];
  fuente: string;
  total: number;
}

let memCache: { data: L2LCatalogResult; expiresAt: number } | null = null;

function parsePage(html: string): Inmueble[] {
  const $ = cheerio.load(html);
  const inmuebles: Inmueble[] = [];

  $(".property-box2").each((_, el) => {
    const $el = $(el);

    const img = $el.find(".item-img img").attr("src") || "";
    const urlRelativa = $el.find(".item-img a").attr("href") || "";
    const urlL2L = urlRelativa.startsWith("http")
      ? urlRelativa
      : `https://www.l2lbienesraices.com${urlRelativa}`;

    const idMatch = urlRelativa.match(/\/(\d+)$/);
    const id = idMatch ? idMatch[1] : String(Date.now());

    const gestionText = $el.find(".item-category").text().trim().toLowerCase();
    const gestion: "venta" | "arriendo" = gestionText === "arriendo" ? "arriendo" : "venta";

    const precioText = $el
      .find(".item-price")
      .text()
      .replace(/[$.]/g, "")
      .replace(/,/g, ".")
      .trim();
    const precio = parseFloat(precioText) || 0;

    const tipoText = $el.find(".item-category10 a").text().trim();
    const barrio = $el.find(".item-title a").text().trim();
    const ciudad = $el
      .find(".location-area")
      .text()
      .replace(/[^\wáéíóúñ\s]/gi, "")
      .trim();

    const items = $el.find(".item-categoery3 li");
    let habitaciones = 0;
    let banos = 0;
    let areaTotal = 0;

    items.each((_, li) => {
      const text = $(li).text().trim();
      const textWithoutUnit = text.replace(/m2|m²/gi, "");
      const num = parseFloat(textWithoutUnit.replace(/[^\d.]/g, "")) || 0;
      if (text.toLowerCase().includes("habit")) habitaciones = num;
      else if (text.toLowerCase().includes("baño")) banos = num;
      else if (/m2|m²/i.test(text)) areaTotal = num;
    });

    if (!urlL2L || precio === 0) return;

    inmuebles.push({
      id,
      titulo: `${tipoText} ${gestion === "venta" ? "en Venta" : "en Arriendo"} en ${barrio}`,
      tipo: tipoText || "Inmueble",
      ciudad: ciudad || "Bogotá",
      barrio: barrio || "",
      gestion,
      precio,
      areaTotal,
      habitaciones,
      banos,
      garajes: 0,
      imagen: img,
      imagenes: [img].filter(Boolean),
      urlL2L,
      urlDomus: urlL2L,
      estado: "Disponible",
      codigoDomus: id,
    });
  });

  return inmuebles;
}

async function fetchLiveL2L(): Promise<L2LCatalogResult> {
  const kv = getRedis();
  const allInmuebles: Inmueble[] = [];
  const seen = new Set<string>();

  for (let page = 1; page <= 5; page++) {
    const url = `${L2L_AGENT_BASE}/${page}/agente/${L2L_AGENT_ID}`;
    const res = await fetch(url, {
      headers: L2L_HEADERS,
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) break;

    const html = await res.text();
    const pageInmuebles = parsePage(html);
    if (pageInmuebles.length === 0) break;

    for (const inmueble of pageInmuebles) {
      if (!seen.has(inmueble.id)) {
        seen.add(inmueble.id);
        allInmuebles.push(inmueble);
      }
    }

    // L2L pagina de a 12 resultados; si llegan menos de 10 ya es la última página
    if (pageInmuebles.length < 10) break;
  }

  if (allInmuebles.length === 0) {
    return { inmuebles: INMUEBLES_DEMO, fuente: "demo", total: INMUEBLES_DEMO.length };
  }

  const result: L2LCatalogResult = {
    inmuebles: allInmuebles,
    fuente: "l2l",
    total: allInmuebles.length,
  };

  memCache = { data: result, expiresAt: Date.now() + MEM_TTL_MS };

  if (kv) {
    await Promise.all([
      kv.set(L2L_REDIS_KEY, result, { ex: L2L_TTL_SEC }).catch(() => {}),
      kv.set(L2L_STALE_REDIS_KEY, result, { ex: L2L_STALE_TTL_SEC }).catch(() => {}),
    ]);
  }

  return result;
}

const scrapeL2LDeduped = cache(async (): Promise<L2LCatalogResult> => {
  const now = Date.now();
  if (memCache && memCache.expiresAt > now) {
    return memCache.data;
  }

  const kv = getRedis();
  if (kv) {
    try {
      const [fresh, stale] = await kv.mget<[L2LCatalogResult | null, L2LCatalogResult | null]>(
        L2L_REDIS_KEY,
        L2L_STALE_REDIS_KEY
      );

      if (fresh?.inmuebles?.length) {
        memCache = { data: fresh, expiresAt: now + MEM_TTL_MS };
        return fresh;
      }

      if (stale?.inmuebles?.length) {
        memCache = { data: stale, expiresAt: now + 60_000 };
        try {
          after(async () => {
            const locked = await acquireRedisLock("l2l_bg_refresh_lock", 30);
            if (!locked) return;
            await fetchLiveL2L().catch(() => {});
          });
        } catch {
          // Fuera de contexto de request Next.js: ignorar background hook
        }
        return stale;
      }
    } catch {
      // Continuar a fetch en vivo si Redis falla
    }
  }

  try {
    return await fetchLiveL2L();
  } catch (error) {
    console.error("[L2L Service] Error:", error instanceof Error ? error.message : error);
    return { inmuebles: INMUEBLES_DEMO, fuente: "demo", total: INMUEBLES_DEMO.length };
  }
});

export async function scrapeL2L(
  options: { forceRefresh?: boolean } = {}
): Promise<L2LCatalogResult> {
  if (options.forceRefresh) {
    try {
      return await fetchLiveL2L();
    } catch (error) {
      console.error("[L2L Service] Force refresh error:", error instanceof Error ? error.message : error);
      return { inmuebles: INMUEBLES_DEMO, fuente: "demo", total: INMUEBLES_DEMO.length };
    }
  }
  return scrapeL2LDeduped();
}

export async function invalidateL2LCache(): Promise<void> {
  memCache = null;
  const kv = getRedis();
  if (kv) {
    await kv.del(L2L_REDIS_KEY).catch(() => {});
  }
}
