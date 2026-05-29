// src/app/api/push/subscribe/route.ts
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const KEY = "push_subscription";

export async function POST(req: Request) {
  try {
    const { subscription } = await req.json();
    if (!subscription?.endpoint) {
      return Response.json({ error: "Suscripción inválida" }, { status: 400 });
    }
    await redis.set(KEY, subscription);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[Push Subscribe]", err);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function GET() {
  const sub = await redis.get<{ endpoint?: string }>(KEY);
  return Response.json({
    subscribed: !!sub?.endpoint,
    endpoint: sub?.endpoint?.slice(-30) ?? null,
  });
}
