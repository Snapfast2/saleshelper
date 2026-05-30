// src/app/api/push/send/route.ts
import webpush from "web-push";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

function initWebPush() {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
}

export async function POST(req: Request) {
  try {
    initWebPush();
    const { title, body, url, tag, actions, waUrl } = await req.json();
    const subscription = await redis.get<any>("push_subscription");

    if (!subscription?.endpoint) {
      return Response.json({ error: "Sin suscripción registrada" }, { status: 404 });
    }

    const payload = JSON.stringify({
      title,
      body,
      url:     url     || "/",
      tag:     tag     || "default",
      actions: actions || [],
      waUrl:   waUrl   || null,
    });
    await webpush.sendNotification(subscription, payload);
    return Response.json({ ok: true });
  } catch (err: any) {
    if (err?.statusCode === 410) {
      await redis.del("push_subscription");
      return Response.json({ error: "Suscripción expirada" }, { status: 410 });
    }
    console.error("[Push Send]", err);
    return Response.json({ error: "Error al enviar" }, { status: 500 });
  }
}
