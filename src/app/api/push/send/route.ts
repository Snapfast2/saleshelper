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
    const subscriptions = await redis.get<any[]>("push_subscriptions_v2") || [];

    if (subscriptions.length === 0) {
      return Response.json({ error: "Sin suscripciones registradas" }, { status: 404 });
    }

    const payload = JSON.stringify({
      title,
      body,
      url:     url     || "/",
      tag:     tag     || "default",
      actions: actions || [],
      waUrl:   waUrl   || null,
    });

    let activeSubscriptions = [...subscriptions];
    let hasExpired = false;

    const pushPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, payload);
      } catch (err: any) {
        if (err?.statusCode === 410) {
          activeSubscriptions = activeSubscriptions.filter(s => s.endpoint !== sub.endpoint);
          hasExpired = true;
        } else {
          console.error("[Push Send Individual Error]", err);
        }
      }
    });

    await Promise.all(pushPromises);

    if (hasExpired) {
      await redis.set("push_subscriptions_v2", activeSubscriptions);
    }

    return Response.json({ ok: true, sentTo: subscriptions.length, active: activeSubscriptions.length });
  } catch (err: any) {
    console.error("[Push Send Global Error]", err);
    return Response.json({ error: "Error al enviar" }, { status: 500 });
  }
}
