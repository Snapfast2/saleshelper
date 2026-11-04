// src/app/api/push/check-reminders/route.ts
import { NextResponse } from "next/server";
import webpush from "web-push";
import { verifyCronAuth, verifyRequestSession } from "@/lib/auth";
import { acquireRedisLock, getRedis } from "@/lib/redis";

const REMINDERS_KEY = "reminders_list";
const SUBSCRIPTIONS_KEY = "push_subscriptions_v2";
const MAX_REMINDERS = 200;

function initWebPush(): boolean {
  const email = process.env.VAPID_EMAIL?.trim();
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const priv = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!email || !pub || !priv) return false;
  webpush.setVapidDetails(email, pub, priv);
  return true;
}

interface ServerReminder {
  id: string;
  clienteId?: string;
  nombre: string;
  telefono: string;
  telefonoIndicativo: string;
  inmuebleInteres: string;
  fechaRecordatorio: string;
  enviado: boolean;
}

function sanitizeReminderInput(raw: unknown): Omit<ServerReminder, "enviado"> | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === "string" ? r.id.trim().slice(0, 64) : "";
  const nombre = typeof r.nombre === "string" ? r.nombre.trim().slice(0, 120) : "";
  const fechaStr = typeof r.fechaRecordatorio === "string" ? r.fechaRecordatorio.trim() : "";
  if (!id || !nombre || !fechaStr || Number.isNaN(new Date(fechaStr).getTime())) {
    return null;
  }

  return {
    id,
    clienteId: r.clienteId !== undefined ? String(r.clienteId).trim().slice(0, 32) : undefined,
    nombre,
    telefono: typeof r.telefono === "string" ? r.telefono.replace(/[^\d+]/g, "").slice(0, 20) : "",
    telefonoIndicativo:
      typeof r.telefonoIndicativo === "string" && r.telefonoIndicativo.trim()
        ? r.telefonoIndicativo.trim().slice(0, 8)
        : "+57",
    inmuebleInteres:
      typeof r.inmuebleInteres === "string" && r.inmuebleInteres.trim()
        ? r.inmuebleInteres.trim().slice(0, 40)
        : "N/A",
    fechaRecordatorio: new Date(fechaStr).toISOString(),
  };
}

// POST — guardar o actualizar un recordatorio (requiere sesión autenticada)
export async function POST(req: Request) {
  if (!verifyRequestSession(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const kv = getRedis();
    if (!kv) return NextResponse.json({ error: "Redis no disponible" }, { status: 503 });

    const body = await req.json().catch(() => null);
    const clean = sanitizeReminderInput(body);
    if (!clean) {
      return NextResponse.json({ error: "Datos de recordatorio inválidos" }, { status: 400 });
    }

    const reminders = (await kv.get<ServerReminder[]>(REMINDERS_KEY)) ?? [];
    const filtered = reminders.filter(
      (r) =>
        r.id !== clean.id &&
        (!clean.clienteId || !r.clienteId || String(r.clienteId) !== clean.clienteId)
    );
    filtered.push({ ...clean, enviado: false });

    const bounded = filtered.slice(-MAX_REMINDERS);
    await kv.set(REMINDERS_KEY, bounded);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Reminders POST]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Error guardando" }, { status: 500 });
  }
}

// GET — revisar recordatorios vencidos y enviar push
export async function GET(req: Request) {
  if (!verifyRequestSession(req) && !verifyCronAuth(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const kv = getRedis();
    if (!kv) return NextResponse.json({ checked: 0, sent: 0, reason: "Redis no disponible" });

    // Evitar ejecuciones duplicadas en menos de 45 segundos
    const canRun = await acquireRedisLock("check_reminders_cd", 45);
    if (!canRun) {
      return NextResponse.json({ checked: 0, sent: 0, skipped: true });
    }

    if (!initWebPush()) {
      return NextResponse.json({ checked: 0, sent: 0, reason: "VAPID no configurado" });
    }

    const subscriptions = (await kv.get<any[]>(SUBSCRIPTIONS_KEY)) || [];
    if (subscriptions.length === 0) {
      return NextResponse.json({ checked: 0, sent: 0, reason: "Sin suscripciones" });
    }

    const reminders = (await kv.get<ServerReminder[]>(REMINDERS_KEY)) ?? [];
    const ahora = new Date();
    let sent = 0;
    let activeSubscriptions = [...subscriptions];
    let hasExpired = false;

    const updated = await Promise.all(
      reminders.map(async (r) => {
        if (r.enviado) return r;
        const due = new Date(r.fechaRecordatorio);
        if (Number.isNaN(due.getTime()) || due > ahora) return r;

        const primerNombre = (r.nombre || "Cliente").trim().split(/\s+/)[0] || "Cliente";
        const payload = JSON.stringify({
          title: `Seguimiento: ${primerNombre}`,
          body: `Es hora de contactar a ${primerNombre}. Ref: ${r.inmuebleInteres}`,
          url: "/clientes?status=2",
          tag: `seguimiento-${r.id}`,
        });

        for (const sub of activeSubscriptions) {
          try {
            await webpush.sendNotification(sub, payload);
          } catch (err: any) {
            if (err?.statusCode === 410 || err?.statusCode === 404) {
              activeSubscriptions = activeSubscriptions.filter((s) => s.endpoint !== sub.endpoint);
              hasExpired = true;
            }
          }
        }
        sent++;
        return { ...r, enviado: true };
      })
    );

    if (hasExpired) {
      await kv.set(SUBSCRIPTIONS_KEY, activeSubscriptions);
    }

    const hace7dias = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
    const limpio = updated.filter(
      (r) => !(r.enviado && new Date(r.fechaRecordatorio) < hace7dias)
    );

    await kv.set(REMINDERS_KEY, limpio.slice(-MAX_REMINDERS));
    return NextResponse.json({ checked: reminders.length, sent });
  } catch (err) {
    console.error("[Reminders GET]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Error revisando" }, { status: 500 });
  }
}

// DELETE — eliminar un recordatorio por ID
export async function DELETE(req: Request) {
  if (!verifyRequestSession(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const kv = getRedis();
    if (!kv) return NextResponse.json({ error: "Redis no disponible" }, { status: 503 });

    const body = (await req.json().catch(() => ({}))) as { id?: unknown };
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const reminders = (await kv.get<ServerReminder[]>(REMINDERS_KEY)) ?? [];
    await kv.set(
      REMINDERS_KEY,
      reminders.filter((r) => r.id !== id)
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Reminders DELETE]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Error eliminando" }, { status: 500 });
  }
}
