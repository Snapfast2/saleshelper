import * as cheerio from "cheerio";
import type { Inmueble } from "@/types";
import { INMUEBLES_DEMO } from "@/lib/inmuebles-demo";
import { DOMUS_BROWSER_UA } from "@/lib/auth";

// Perfil público de Olga Patricia en L2L — fuente autoritativa de sus inmuebles activos
const L2L_AGENT_BASE = "https://www.l2lbienesraices.com/busqueda/pagina";
const L2L_AGENT_ID   = process.env.L2L_AGENT_ID || "29214";
const L2L_HEADERS    = {
  "User-Agent": DOMUS_BROWSER_UA,
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "es-CO,es;q=0.9",
};

function parsePage(html: string): Inmueble[] {
  const $ = cheerio.load(html);
  const inmuebles: Inmueble[] = [];

  $(".property-box2").each((_, el) => {
    const $el = $(el);

    // Imagen
    const img = $el.find(".item-img img").attr("src") || "";

    // URL de detalle
    const urlRelativa = $el.find(".item-img a").attr("href") || "";
    const urlL2L = urlRelativa.startsWith("http")
      ? urlRelativa
      : `https://www.l2lbienesraices.com${urlRelativa}`;

    // Extraer ID del inmueble de la URL
    const idMatch = urlRelativa.match(/\/(\d+)$/);
    const id = idMatch ? idMatch[1] : String(Date.now());

    // Tipo de gestión (badge)
    const gestionText = $el.find(".item-category").text().trim().toLowerCase();
    const gestion: "venta" | "arriendo" = gestionText === "arriendo" ? "arriendo" : "venta";

    // Precio
    const precioText = $el
      .find(".item-price")
      .text()
      .replace(/[$.]/g, "")
      .replace(/,/g, ".")
      .trim();
    const precio = parseFloat(precioText) || 0;

    // Tipo de inmueble
    const tipoText = $el.find(".item-category10 a").text().trim();

    // Barrio / título
    const barrio = $el.find(".item-title a").text().trim();

    // Ciudad
    const ciudad = $el
      .find(".location-area")
      .text()
      .replace(/[^\wáéíóúñ\s]/gi, "")
      .trim();

    // Características (hab, baños, m²) — limpiar "m2"/"m²" antes de extraer dígitos
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

export async function scrapeL2L(): Promise<{ inmuebles: Inmueble[]; fuente: string; total: number }> {
  try {
    // Detectar cuántas páginas tiene el perfil (máximo 5 para no saturar)
    const allInmuebles: Inmueble[] = [];
    const seen = new Set<string>();

    for (let page = 1; page <= 5; page++) {
      const url = `${L2L_AGENT_BASE}/${page}/agente/${L2L_AGENT_ID}`;
      const res = await fetch(url, {
        headers: L2L_HEADERS,
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok) break;

      const html = await res.text();
      const pageInmuebles = parsePage(html);

      // Si la página está vacía, no hay más páginas
      if (pageInmuebles.length === 0) break;

      // Deduplicar por ID
      for (const inmueble of pageInmuebles) {
        if (!seen.has(inmueble.id)) {
          seen.add(inmueble.id);
          allInmuebles.push(inmueble);
        }
      }
    }

    if (allInmuebles.length === 0) {
      return { inmuebles: INMUEBLES_DEMO, fuente: "demo", total: INMUEBLES_DEMO.length };
    }

    return { inmuebles: allInmuebles, fuente: "l2l", total: allInmuebles.length };
  } catch (error) {
    console.error("[L2L Service] Error:", error instanceof Error ? error.message : error);
    return { inmuebles: INMUEBLES_DEMO, fuente: "demo", total: INMUEBLES_DEMO.length };
  }
}
