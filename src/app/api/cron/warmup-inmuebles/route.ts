// src/app/api/cron/warmup-inmuebles/route.ts
import { NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/auth";
import { fetchDomusProperties } from "@/services/domusService";
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

    // Sobrescribe la caché en Redis solo si Domus responde con éxito (no borra caché previa si falla)
    const result = await fetchDomusProperties({ allowLogin: true, forceRefresh: true });
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    console.log(`[CRON warmup] ${result.total} inmuebles actualizados en ${elapsed}s`);

    return NextResponse.json({
      ok: true,
      total: result.total,
      fuente: result.fuente,
      elapsed_s: elapsed,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[CRON warmup] Error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, error: "No se pudo actualizar caché de Domus" }, { status: 500 });
  }
}
