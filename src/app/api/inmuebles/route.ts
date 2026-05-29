// src/app/api/inmuebles/route.ts
import { NextResponse } from "next/server";
import { scrapeL2L } from "@/services/l2lService";
import { fetchDomusProperties } from "@/services/domusService";
import { INMUEBLES_DEMO } from "@/lib/inmuebles-demo";

// ── Caché en memoria para el proceso del servidor (evita re-fetch entre requests) ──
let memCache: { data: any; ts: number } | null = null;
const MEM_CACHE_TTL = 30 * 60 * 1000; // 30 min

export const dynamic = "force-dynamic"; // respuesta siempre fresca desde el cliente

export async function GET() {
  const now = Date.now();

  // Servir desde caché en memoria si es válida
  if (memCache && now - memCache.ts < MEM_CACHE_TTL) {
    return NextResponse.json(memCache.data, {
      headers: {
        "Cache-Control": "private, max-age=1800, stale-while-revalidate=300",
        "X-Cache": "HIT",
      },
    });
  }

  try {
    // 1. Intentamos obtener de Domus (fuente más actualizada)
    try {
      const domusData = await fetchDomusProperties();
      if (domusData?.inmuebles?.length > 0) {
        memCache = { data: domusData, ts: now };
        return NextResponse.json(domusData, {
          headers: {
            "Cache-Control": "private, max-age=1800, stale-while-revalidate=300",
            "X-Cache": "MISS",
            "X-Source": "domus",
          },
        });
      }
    } catch {
      // Caer silenciosamente a L2L
    }

    // 2. Fallback a L2L (scraping público)
    try {
      const l2lData = await scrapeL2L();
      if (l2lData?.inmuebles?.length > 0) {
        memCache = { data: l2lData, ts: now };
        return NextResponse.json(l2lData, {
          headers: {
            "Cache-Control": "private, max-age=1800, stale-while-revalidate=300",
            "X-Cache": "MISS",
            "X-Source": "l2l",
          },
        });
      }
    } catch {
      // Caer a demo
    }

    // 3. Datos de demostración como último recurso
    const demoData = { inmuebles: INMUEBLES_DEMO, fuente: "demo", total: INMUEBLES_DEMO.length };
    return NextResponse.json(demoData, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
