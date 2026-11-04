// src/app/api/cron/warmup-inmuebles/route.ts
import { NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/auth";
import { fetchDomusProperties } from "@/services/domusService";
import { scrapeL2L } from "@/services/l2lService";
import { humanDelay } from "@/services/crmService";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const start = Date.now();
    await humanDelay(1000, 3000);

    // Pre-calentar primero el catálogo público L2L en Redis (usado en /clientes, /inmuebles y /ficha)
    const l2lResult = await scrapeL2L({ forceRefresh: true });

    // Intentar también actualizar respaldo de Domus sin afectar L2L si Domus falla
    let domusTotal = 0;
    try {
      const domusResult = await fetchDomusProperties({ allowLogin: true, forceRefresh: true });
      domusTotal = domusResult.total;
    } catch {
      // L2L ya quedó caliente en Redis
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`[CRON warmup] L2L=${l2lResult.total}, Domus=${domusTotal} en ${elapsed}s`);

    return NextResponse.json({
      ok: true,
      l2lTotal: l2lResult.total,
      domusTotal,
      elapsed_s: elapsed,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[CRON warmup] Error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, error: "No se pudo actualizar caché" }, { status: 500 });
  }
}
