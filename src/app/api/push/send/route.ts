// src/app/api/push/send/route.ts
// Envía una notificación push al dispositivo registrado
import { NextResponse } from "next/server";
import webpush from "web-push";
import fs from "fs";
import path from "path";

const SUBS_FILE = path.join(process.cwd(), "data", "push-subscription.json");

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: Request) {
  try {
    const { title, body, url, tag } = await req.json();

    if (!fs.existsSync(SUBS_FILE)) {
      return NextResponse.json({ error: "Sin suscripción registrada" }, { status: 404 });
    }

    const subscription = JSON.parse(fs.readFileSync(SUBS_FILE, "utf-8"));

    const payload = JSON.stringify({ title, body, url: url || "/", tag: tag || "default" });

    await webpush.sendNotification(subscription, payload);

    console.log("[Push] Notificación enviada:", title);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    // Si la suscripción expiró (410 Gone), borramos el archivo
    if (err?.statusCode === 410) {
      if (fs.existsSync(SUBS_FILE)) fs.unlinkSync(SUBS_FILE);
      return NextResponse.json({ error: "Suscripción expirada, debe reactivar notificaciones" }, { status: 410 });
    }
    console.error("[Push Send] Error:", err);
    return NextResponse.json({ error: "Error al enviar notificación" }, { status: 500 });
  }
}
