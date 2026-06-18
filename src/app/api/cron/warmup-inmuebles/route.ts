// src/app/api/cron/warmup-inmuebles/route.ts
// Ruta invocada automáticamente por Vercel Cron cada día a las 3am (Colombia = UTC-5 → 8am UTC).
// Pre-calienta el caché de Redis con los inmuebles de Domus para que la primera carga del día sea instantánea.
// Protegida con CRON_SECRET para que nadie externo pueda dispararla.

import { NextResponse } from "next/server";
import { invalidateInmueblesCache, fetchDomusProperties } from "@/services/domusService";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel permite hasta 60s en el plan hobby

export async function GET(req: Request) {
  // Verificar que viene de Vercel Cron o de nosotros mismos
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const start = Date.now();

    // 1. Borrar caché vieja
    await invalidateInmueblesCache();

    // 2. Traer datos frescos de Domus (los guarda automáticamente en Redis 6h)
    const result = await fetchDomusProperties();

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    console.log(`[CRON warmup] ✅ ${result.total} inmuebles cargados en ${elapsed}s`);

    return NextResponse.json({
      ok: true,
      total: result.total,
      fuente: result.fuente,
      elapsed_s: elapsed,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[CRON warmup] ❌ Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
