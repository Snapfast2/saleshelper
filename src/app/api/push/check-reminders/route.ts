// src/app/api/push/check-reminders/route.ts
import { NextResponse } from "next/server";
import webpush from "web-push";
import { readJSON, writeJSON, deleteFile } from "@/lib/serverStorage";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

interface ServerReminder {
  id: string;
  nombre: string;
  telefono: string;
  telefonoIndicativo: string;
  inmuebleInteres: string;
  fechaRecordatorio: string;
  enviado: boolean;
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const reminders = readJSON<ServerReminder[]>("push-reminders.json", []);
    const filtered = reminders.filter((r) => r.id !== data.id);
    filtered.push({ ...data, enviado: false });
    writeJSON("push-reminders.json", filtered);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Reminders POST]", err);
    return NextResponse.json({ error: "Error guardando" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const subscription = readJSON<any>("push-subscription.json", null);
    if (!subscription?.endpoint) {
      return NextResponse.json({ checked: 0, sent: 0, reason: "Sin suscripción" });
    }

    const reminders = readJSON<ServerReminder[]>("push-reminders.json", []);
    const ahora = new Date();
    let sent = 0;

    const updated = await Promise.all(
      reminders.map(async (r) => {
        if (r.enviado) return r;
        if (new Date(r.fechaRecordatorio) > ahora) return r;

        const primerNombre = r.nombre.split(" ")[0];
        try {
          await webpush.sendNotification(
            subscription,
            JSON.stringify({
              title: `🔔 Seguimiento: ${primerNombre}`,
              body: `Es hora de contactar a ${primerNombre}. Ref: ${r.inmuebleInteres}`,
              url: `/clientes`,
              tag: `seguimiento-${r.id}`,
            })
          );
          sent++;
          return { ...r, enviado: true };
        } catch (err: any) {
          if (err?.statusCode === 410) deleteFile("push-subscription.json");
          return r;
        }
      })
    );

    writeJSON("push-reminders.json", updated);
    return NextResponse.json({ checked: reminders.length, sent });
  } catch (err) {
    console.error("[Reminders GET]", err);
    return NextResponse.json({ error: "Error revisando" }, { status: 500 });
  }
}
