// src/app/api/push/send/route.ts
import webpush from "web-push";
import { verifyRequestSession } from "@/lib/auth";
import { acquireRedisLock, getRedis } from "@/lib/redis";

const SUBSCRIPTIONS_KEY = "push_subscriptions_v2";

function initWebPush(): boolean {
  const email = process.env.VAPID_EMAIL?.trim();
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const priv = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!email || !pub || !priv) return false;
  webpush.setVapidDetails(email, pub, priv);
  return true;
}

function sanitizeInternalPath(url: unknown): string {
  if (typeof url !== "string") return "/";
  const trimmed = url.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "/";
  return trimmed.slice(0, 200);
}

function sanitizeWhatsAppUrl(waUrl: unknown): string | null {
  if (typeof waUrl !== "string") return null;
  const trimmed = waUrl.trim();
  if (/^https:\/\/wa\.me\/\d{7,15}(\?[^\s]{0,300})?$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

export async function POST(req: Request) {
  if (!verifyRequestSession(req)) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const kv = getRedis();
  if (!kv) {
    return Response.json({ error: "Redis no disponible" }, { status: 503 });
  }

  const allowed = await acquireRedisLock("push_send_cd", 5);
  if (!allowed) {
    return Response.json({ error: "Espera unos segundos antes de enviar otra notificación" }, { status: 429 });
  }

  try {
    if (!initWebPush()) {
      return Response.json({ error: "VAPID no configurado" }, { status: 503 });
    }

    const raw = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const title = typeof raw.title === "string" && raw.title.trim() ? raw.title.trim().slice(0, 80) : "SalesHelper";
    const body = typeof raw.body === "string" && raw.body.trim() ? raw.body.trim().slice(0, 200) : "Notificación";
    const safeUrl = sanitizeInternalPath(raw.url);
    const safeWaUrl = sanitizeWhatsAppUrl(raw.waUrl);
    const safeTag = typeof raw.tag === "string" && raw.tag.trim() ? raw.tag.trim().slice(0, 64) : "default";
    const safeActions = Array.isArray(raw.actions) ? raw.actions.slice(0, 2) : [];

    const subscriptions = (await kv.get<any[]>(SUBSCRIPTIONS_KEY)) || [];
    if (subscriptions.length === 0) {
      return Response.json({ error: "Sin suscripciones registradas" }, { status: 404 });
    }

    const payload = JSON.stringify({
      title,
      body,
      url: safeUrl,
      tag: safeTag,
      actions: safeActions,
      waUrl: safeWaUrl,
    });

    let activeSubscriptions = [...subscriptions];
    let hasExpired = false;

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(sub, payload);
        } catch (err: any) {
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            activeSubscriptions = activeSubscriptions.filter((s) => s.endpoint !== sub.endpoint);
            hasExpired = true;
          }
        }
      })
    );

    if (hasExpired) {
      await kv.set(SUBSCRIPTIONS_KEY, activeSubscriptions);
    }

    return Response.json({
      ok: true,
      sentTo: subscriptions.length,
      active: activeSubscriptions.length,
    });
  } catch (err) {
    console.error("[Push Send]", err instanceof Error ? err.message : err);
    return Response.json({ error: "Error al enviar" }, { status: 500 });
  }
}
