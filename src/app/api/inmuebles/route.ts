// src/app/api/inmuebles/route.ts
import { NextResponse } from "next/server";
import { verifyRequestSession } from "@/lib/auth";
import { acquireRedisLock } from "@/lib/redis";
import { scrapeL2L, invalidateL2LCache } from "@/services/l2lService";
import { invalidateInmueblesCache } from "@/services/domusService";
import { INMUEBLES_DEMO } from "@/lib/inmuebles-demo";

export const dynamic = "force-dynamic";

// ── GET: Catálogo de Olga Patricia ────────────────────────────────────────
export async function GET(req: Request) {
  if (!verifyRequestSession(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

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
    console.error("[/api/inmuebles] L2L error:", e instanceof Error ? e.message : e);
  }

  const demoData = { inmuebles: INMUEBLES_DEMO, fuente: "demo", total: INMUEBLES_DEMO.length };
  return NextResponse.json(demoData, { headers: { "Cache-Control": "no-store" } });
}

// ── DELETE: Invalidar caché Redis (botón "Actualizar catálogo") ───────────
// Autenticado mediante la cookie HttpOnly de sesión (sin exponer secretos en cliente)
export async function DELETE(req: Request) {
  if (!verifyRequestSession(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const allowed = await acquireRedisLock("inmuebles_refresh_cd", 60);
  if (!allowed) {
    return NextResponse.json({
      ok: true,
      cached: true,
      message: "El catálogo ya fue actualizado hace menos de un minuto.",
    });
  }

  try {
    await Promise.all([invalidateL2LCache(), invalidateInmueblesCache()]);
    return NextResponse.json({ ok: true, message: "Caché invalidado." });
  } catch {
    return NextResponse.json({ error: "Error al invalidar caché" }, { status: 500 });
  }
}
