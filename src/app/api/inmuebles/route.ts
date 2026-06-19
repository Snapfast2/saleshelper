// src/app/api/inmuebles/route.ts
import { NextResponse } from "next/server";
import { scrapeL2L } from "@/services/l2lService";
import { fetchDomusProperties, invalidateInmueblesCache } from "@/services/domusService";
import { INMUEBLES_DEMO } from "@/lib/inmuebles-demo";

export const dynamic = "force-dynamic";

// ── GET: Devuelve el catálogo de Olga Patricia ────────────────────────────
// 1. Domus v2 (fuente primaria: datos ricos, sesión propia, payload exacto)
// 2. L2L público (fallback: siempre tiene los 18 inmuebles correctos)
// 3. Demo (último recurso)
export async function GET() {
  try {
    const domusData = await fetchDomusProperties();
    if (domusData?.inmuebles?.length > 0) {
      return NextResponse.json(domusData, {
        headers: {
          "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
          "X-Source": "domus",
          "X-Total": String(domusData.total),
        },
      });
    }
  } catch (e) {
    console.error("[/api/inmuebles] Domus error:", e);
  }

  // Fallback: L2L público (18 inmuebles exactos, siempre disponible)
  try {
    const l2lData = await scrapeL2L();
    if (l2lData?.inmuebles?.length > 0) {
      return NextResponse.json(l2lData, {
        headers: {
          "Cache-Control": "private, max-age=300, stale-while-revalidate=600",
          "X-Source": l2lData.fuente,
          "X-Total": String(l2lData.total),
        },
      });
    }
  } catch (e) {
    console.error("[/api/inmuebles] L2L error:", e);
  }

  // Último recurso: datos de demostración
  const demoData = { inmuebles: INMUEBLES_DEMO, fuente: "demo", total: INMUEBLES_DEMO.length };
  return NextResponse.json(demoData, { headers: { "Cache-Control": "no-store" } });
}

// ── DELETE: Invalidar caché Redis (botón "Forzar actualización") ──────────
export async function DELETE(req: Request) {
  const secret = req.headers.get("x-refresh-secret");
  if (secret !== process.env.REFRESH_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    await invalidateInmueblesCache();
    return NextResponse.json({ ok: true, message: "Caché invalidado." });
  } catch {
    return NextResponse.json({ error: "Error al invalidar caché" }, { status: 500 });
  }
}
