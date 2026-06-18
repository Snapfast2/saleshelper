// src/app/api/inmuebles/route.ts
import { NextResponse } from "next/server";
import { scrapeL2L } from "@/services/l2lService";
import { fetchDomusProperties, invalidateInmueblesCache } from "@/services/domusService";
import { INMUEBLES_DEMO } from "@/lib/inmuebles-demo";

export const dynamic = "force-dynamic";

// ── GET: Devuelve el catálogo (desde Redis o Domus) ───────────────────────
export async function GET() {
  try {
    // 1. Intentamos obtener de Domus (Redis primero, luego Domus si expiró)
    try {
      const domusData = await fetchDomusProperties();
      if (domusData?.inmuebles?.length > 0) {
        return NextResponse.json(domusData, {
          headers: {
            "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
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
        return NextResponse.json(l2lData, {
          headers: {
            "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
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

// ── DELETE: Invalidar caché (botón "Forzar actualización" en la app) ─────
// Solo accesible con el secret header para que no cualquiera lo llame.
export async function DELETE(req: Request) {
  const secret = req.headers.get("x-refresh-secret");
  if (secret !== process.env.REFRESH_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    await invalidateInmueblesCache();
    return NextResponse.json({ ok: true, message: "Caché invalidado. La próxima carga traerá datos frescos de Domus." });
  } catch (e) {
    return NextResponse.json({ error: "Error al invalidar caché" }, { status: 500 });
  }
}
