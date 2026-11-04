// src/app/api/push/subscribe/route.ts
import { verifyRequestSession } from "@/lib/auth";
import { getRedis } from "@/lib/redis";

const KEY = "push_subscriptions_v2";
const MAX_SUBSCRIPTIONS = 10;

const ALLOWED_PUSH_SUFFIXES = [
  "fcm.googleapis.com",
  ".push.services.mozilla.com",
  ".notify.windows.com",
  ".push.apple.com",
];

function isValidPushEndpoint(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== "string" || endpoint.length > 2048) return false;
  try {
    const parsed = new URL(endpoint);
    if (parsed.protocol !== "https:" || parsed.port !== "") return false;
    const host = parsed.hostname.toLowerCase();
    return ALLOWED_PUSH_SUFFIXES.some((suffix) =>
      suffix.startsWith(".") ? host.endsWith(suffix) : host === suffix
    );
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (!verifyRequestSession(req)) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const kv = getRedis();
  if (!kv) {
    return Response.json({ error: "Redis no disponible" }, { status: 503 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { subscription?: any };
    const sub = body?.subscription;

    if (
      !sub ||
      !isValidPushEndpoint(sub.endpoint) ||
      typeof sub.keys?.p256dh !== "string" ||
      typeof sub.keys?.auth !== "string" ||
      sub.keys.p256dh.length > 256 ||
      sub.keys.auth.length > 128
    ) {
      return Response.json({ error: "Suscripción inválida" }, { status: 400 });
    }

    const sanitizedSub = {
      endpoint: sub.endpoint,
      expirationTime: typeof sub.expirationTime === "number" ? sub.expirationTime : null,
      keys: {
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
      },
    };

    const currentList = (await kv.get<any[]>(KEY)) || [];
    const withoutSame = currentList.filter((s) => s?.endpoint !== sanitizedSub.endpoint);
    withoutSame.push(sanitizedSub);

    const bounded = withoutSame.slice(-MAX_SUBSCRIPTIONS);
    await kv.set(KEY, bounded);

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[Push Subscribe]", err instanceof Error ? err.message : err);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  if (!verifyRequestSession(req)) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const kv = getRedis();
  if (!kv) {
    return Response.json({ subscribedCount: 0 });
  }

  const subs = (await kv.get<any[]>(KEY)) || [];
  return Response.json({
    subscribedCount: subs.length,
  });
}
