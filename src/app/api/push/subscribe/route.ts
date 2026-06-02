// src/app/api/push/subscribe/route.ts
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const KEY = "push_subscriptions_v2";

export async function POST(req: Request) {
  try {
    const { subscription } = await req.json();
    if (!subscription?.endpoint) {
      return Response.json({ error: "Suscripción inválida" }, { status: 400 });
    }
    const currentList = await redis.get<any[]>(KEY) || [];
    const isDuplicate = currentList.some(s => s.endpoint === subscription.endpoint);
    if (!isDuplicate) {
      currentList.push(subscription);
      await redis.set(KEY, currentList);
    }
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[Push Subscribe]", err);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function GET() {
  const subs = await redis.get<any[]>(KEY) || [];
  return Response.json({
    subscribedCount: subs.length,
    endpoints: subs.map(s => s?.endpoint?.slice(-30) ?? null),
  });
}
