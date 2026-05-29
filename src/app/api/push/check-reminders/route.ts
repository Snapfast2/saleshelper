// src/app/api/push/check-reminders/route.ts
// Recordatorios de seguimiento — almacenados en Redis (no filesystem)
import { NextResponse } from "next/server";
import webpush from "web-push";
import { Redis } from "@upstash/redis";

const REMINDERS_KEY = "reminders_list";
const SUBSCRIPTION_KEY = "push_subscription";

function getRedis(): Redis | null {
  try { return Redis.fromEnv(); } catch { return null; }
}

function initWebPush() {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
}

interface ServerReminder {
  id: string;
  nombre: string;
  telefono: string;
  telefonoIndicativo: string;
  inmuebleInteres: string;
  fechaRecordatorio: string;
  enviado: boolean;
}

// POST — guardar o actualizar un recordatorio
export async function POST(req: Request) {
  try {
    const kv = getRedis();
    if (!kv) return NextResponse.json({ error: "Redis no disponible" }, { status: 503 });

    const data = await req.json();
    const reminders = await kv.get<ServerReminder[]>(REMINDERS_KEY) ?? [];
    const filtered = reminders.filter((r) => r.id !== data.id);
    filtered.push({ ...data, enviado: false });
    await kv.set(REMINDERS_KEY, filtered);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Reminders POST]", err);
    return NextResponse.json({ error: "Error guardando" }, { status: 500 });
  }
}

// GET — revisar recordatorios vencidos y enviar push
export async function GET() {
  try {
    const kv = getRedis();
    if (!kv) return NextResponse.json({ checked: 0, sent: 0, reason: "Redis no disponible" });

    initWebPush();

    const subscription = await kv.get<any>(SUBSCRIPTION_KEY);
    if (!subscription?.endpoint) {
      return NextResponse.json({ checked: 0, sent: 0, reason: "Sin suscripción" });
    }

    const reminders = await kv.get<ServerReminder[]>(REMINDERS_KEY) ?? [];
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
          if (err?.statusCode === 410) await kv.del(SUBSCRIPTION_KEY);
          return r;
        }
      })
    );

    await kv.set(REMINDERS_KEY, updated);
    return NextResponse.json({ checked: reminders.length, sent });
  } catch (err) {
    console.error("[Reminders GET]", err);
    return NextResponse.json({ error: "Error revisando" }, { status: 500 });
  }
}

// DELETE — eliminar un recordatorio por ID
export async function DELETE(req: Request) {
  try {
    const kv = getRedis();
    if (!kv) return NextResponse.json({ error: "Redis no disponible" }, { status: 503 });

    const { id } = await req.json();
    const reminders = await kv.get<ServerReminder[]>(REMINDERS_KEY) ?? [];
    await kv.set(REMINDERS_KEY, reminders.filter((r) => r.id !== id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Reminders DELETE]", err);
    return NextResponse.json({ error: "Error eliminando" }, { status: 500 });
  }
}
