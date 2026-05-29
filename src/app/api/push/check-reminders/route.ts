// src/app/api/push/check-reminders/route.ts
// Revisa los recordatorios pendientes y envía notificaciones para los vencidos
// Este endpoint puede ser llamado por un cron job en Vercel, o manualmente al abrir la app
import { NextResponse } from "next/server";
import webpush from "web-push";
import fs from "fs";
import path from "path";

const SUBS_FILE = path.join(process.cwd(), "data", "push-subscription.json");
const REMINDERS_FILE = path.join(process.cwd(), "data", "push-reminders.json");

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

function ensureDataDir() {
  const dir = path.dirname(SUBS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getReminders(): ServerReminder[] {
  ensureDataDir();
  if (!fs.existsSync(REMINDERS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(REMINDERS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveReminders(reminders: ServerReminder[]) {
  ensureDataDir();
  fs.writeFileSync(REMINDERS_FILE, JSON.stringify(reminders, null, 2));
}

// POST: Guardar un nuevo recordatorio
export async function POST(req: Request) {
  try {
    const data = await req.json();
    const reminders = getReminders();
    // Reemplazar si ya existe uno para este cliente
    const filtered = reminders.filter((r) => r.id !== data.id);
    filtered.push({ ...data, enviado: false });
    saveReminders(filtered);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Reminders POST] Error:", err);
    return NextResponse.json({ error: "Error guardando recordatorio" }, { status: 500 });
  }
}

// GET: Verificar y enviar notificaciones para recordatorios vencidos
export async function GET() {
  try {
    if (!fs.existsSync(SUBS_FILE)) {
      return NextResponse.json({ checked: 0, sent: 0, reason: "Sin suscripción" });
    }

    const subscription = JSON.parse(fs.readFileSync(SUBS_FILE, "utf-8"));
    const reminders = getReminders();
    const ahora = new Date();
    let sent = 0;

    const updated = await Promise.all(
      reminders.map(async (r) => {
        if (r.enviado) return r;
        const fecha = new Date(r.fechaRecordatorio);
        if (fecha > ahora) return r;

        // ¡Es hora de notificar!
        const primerNombre = r.nombre.split(" ")[0];
        try {
          await webpush.sendNotification(
            subscription,
            JSON.stringify({
              title: `🔔 Seguimiento: ${primerNombre}`,
              body: `Es hora de contactar a ${primerNombre}. Inmueble ref: ${r.inmuebleInteres}`,
              url: `/clientes`,
              tag: `seguimiento-${r.id}`,
            })
          );
          sent++;
          return { ...r, enviado: true };
        } catch (err: any) {
          if (err?.statusCode === 410) {
            // Suscripción expirada
            if (fs.existsSync(SUBS_FILE)) fs.unlinkSync(SUBS_FILE);
          }
          return r;
        }
      })
    );

    saveReminders(updated);
    console.log(`[Reminders CHECK] Revisados: ${reminders.length}, Enviados: ${sent}`);
    return NextResponse.json({ checked: reminders.length, sent });
  } catch (err) {
    console.error("[Reminders GET] Error:", err);
    return NextResponse.json({ error: "Error revisando recordatorios" }, { status: 500 });
  }
}
