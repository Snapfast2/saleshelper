// src/app/api/inmuebles/route.ts
import { NextResponse } from "next/server";
import { scrapeL2L } from "@/services/l2lService";
import { INMUEBLES_DEMO } from "@/lib/inmuebles-demo";
import { invalidateInmueblesCache } from "@/services/domusService";

export const dynamic = "force-dynamic";

// ── GET: Devuelve el catálogo ─────────────────────────────────────────────
// Fuente primaria: perfil público L2L de Olga Patricia (18 inmuebles exactos)
// Fallback: datos de demostración
export async function GET() {
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

  // Fallback: datos de demostración
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
