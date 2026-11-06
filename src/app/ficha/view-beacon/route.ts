// src/app/ficha/view-beacon/route.ts
import { createHash } from "node:crypto";
import { verifyRequestSession } from "@/lib/auth";
import { acquireRedisLock, getRedis } from "@/lib/redis";

export const dynamic = "force-dynamic";

const BOT_UA_REGEX =
  /bot|crawler|spider|^whatsapp\/|facebookexternalhit|preview|headless|slurp/i;

export async function POST(req: Request) {
  // Rechazar envíos cross-site externos
  if (req.headers.get("sec-fetch-site") === "cross-site") {
    return Response.json({ tracked: false }, { status: 403 });
  }

  let id: unknown;
  try {
    const body = (await req.json()) as { id?: unknown };
    id = body?.id;
  } catch {
    return Response.json({ tracked: false, reason: "invalid_body" }, { status: 400 });
  }

  if (typeof id !== "string" || !/^\d{1,12}$/.test(id)) {
    return Response.json({ tracked: false, reason: "invalid_id" }, { status: 400 });
  }

  // Ignorar auto-visitas de la asesora autenticada
  if (verifyRequestSession(req)) {
    return Response.json({ tracked: false, reason: "broker" });
  }

  // Ignorar bots y generadores de vista previa (WhatsApp, Facebook, Telegram, etc.)
  const ua = (req.headers.get("user-agent") ?? "").trim();
  if (!ua || BOT_UA_REGEX.test(ua)) {
    return Response.json({ tracked: false });
  }

  // Deduplicar por visitante durante 30 minutos (1800s)
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ip =
    forwardedFor?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown";

  const hash = createHash("sha256")
    .update(`${ip}|${ua.slice(0, 80)}`)
    .digest("hex");

  const locked = await acquireRedisLock(
    `ficha_view_dedup:${id}:${hash.slice(0, 16)}`,
    1800
  );
  if (!locked) {
    return Response.json({ tracked: false, reason: "dedup" });
  }

  try {
    const kv = getRedis();
    if (kv) {
      await kv.hincrby("ficha_views_v1", id, 1);
    }
  } catch {
    // Nunca fallar aunque Redis no esté configurado en entorno local
  }

  return Response.json({ tracked: true });
}
