// src/app/api/crm/refresh/route.ts
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { verifyRequestSession } from "@/lib/auth";
import { acquireRedisLock, getRedisTtl } from "@/lib/redis";
import { fetchCrmClients } from "@/services/crmService";

export const maxDuration = 60;

const GLOBAL_COOLDOWN_SEC = 25;
const STATUS_COOLDOWN_SEC = 75;

export async function POST(req: Request) {
  if (!verifyRequestSession(req)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { status?: unknown };
  const safeStatus: "1" | "2" = String(body.status ?? "1") === "2" ? "2" : "1";

  const statusLockKey = `crm_refresh_cd:${safeStatus}`;
  const globalLockKey = "crm_refresh_global_cd";

  // Proteger cuenta Domus: máximo 1 refresco manual por pestaña cada 75s y global cada 25s
  const statusAllowed = await acquireRedisLock(statusLockKey, STATUS_COOLDOWN_SEC);
  if (!statusAllowed) {
    const ttl = await getRedisTtl(statusLockKey);
    return NextResponse.json({
      ok: true,
      cached: true,
      retryAfterSec: ttl > 0 ? ttl : STATUS_COOLDOWN_SEC,
      message: "Los contactos ya se sincronizaron hace unos segundos.",
    });
  }

  const globalAllowed = await acquireRedisLock(globalLockKey, GLOBAL_COOLDOWN_SEC);
  if (!globalAllowed) {
    const ttl = await getRedisTtl(globalLockKey);
    return NextResponse.json({
      ok: true,
      cached: true,
      retryAfterSec: ttl > 0 ? ttl : GLOBAL_COOLDOWN_SEC,
      message: "Sincronización reciente en curso.",
    });
  }

  try {
    const clients = await fetchCrmClients(safeStatus, { noCache: true });
    revalidatePath("/clientes");
    return NextResponse.json({
      ok: true,
      cached: false,
      total: clients.length,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "No se pudo sincronizar con el CRM en este momento." },
      { status: 502 }
    );
  }
}
