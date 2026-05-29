// src/app/api/push/send/route.ts
import { NextResponse } from "next/server";
import webpush from "web-push";
import { readJSON, deleteFile } from "@/lib/serverStorage";

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
    const { title, body, url, tag } = await req.json();
    const subscription = readJSON<any>("push-subscription.json", null);

    if (!subscription?.endpoint) {
      return NextResponse.json({ error: "Sin suscripción registrada" }, { status: 404 });
    }

    const payload = JSON.stringify({ title, body, url: url || "/", tag: tag || "default" });
    await webpush.sendNotification(subscription, payload);

    console.log("[Push] Notificación enviada:", title);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.statusCode === 410) {
      deleteFile("push-subscription.json");
      return NextResponse.json({ error: "Suscripción expirada" }, { status: 410 });
    }
    console.error("[Push Send] Error:", err);
    return NextResponse.json({ error: "Error al enviar" }, { status: 500 });
  }
}
