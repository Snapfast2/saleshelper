// src/app/api/push/check-new-clients/route.ts
// Revisa contactos nuevos en Domus (página 1) y envía notificación push real

import webpush from "web-push";
import { verifyCronAuth, verifyRequestSession } from "@/lib/auth";
import { acquireRedisLock, getRedis } from "@/lib/redis";
import { fetchCrmClients, humanDelay } from "@/services/crmService";

export const maxDuration = 60;

const KNOWN_IDS_KEY = "known_client_ids";
const SUBSCRIPTIONS_KEY = "push_subscriptions_v2";
const CHECK_LOCK_KEY = "check_new_clients_lock";
const MAX_KNOWN_IDS = 2000;

function initWebPush(): boolean {
  const email = process.env.VAPID_EMAIL?.trim();
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const priv = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!email || !pub || !priv) return false;
  webpush.setVapidDetails(email, pub, priv);
  return true;
}

export async function GET(req: Request) {
  const authorized =
    verifyCronAuth(req, { allowQueryCron: true }) || verifyRequestSession(req);

  if (!authorized) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const kv = getRedis();
  if (!kv) {
    return Response.json({ ok: false, error: "Redis no disponible" }, { status: 503 });
  }

  try {
    // Ventana horaria laboral en Colombia (UTC-5): 7am a 9pm
    const horaCol = (new Date().getUTCHours() - 5 + 24) % 24;
    if (horaCol < 7 || horaCol >= 21) {
      return Response.json({ ok: true, skipped: true });
    }

    // Candado estricto de 10 minutos para impedir ejecuciones repetidas o abuso externo
    const lockAcquired = await acquireRedisLock(CHECK_LOCK_KEY, 600);
    if (!lockAcquired) {
      return Response.json({ ok: true, skipped: true });
    }

    if (!initWebPush()) {
      return Response.json({ ok: false, error: "VAPID no configurado" }, { status: 503 });
    }

    const subscriptions = (await kv.get<any[]>(SUBSCRIPTIONS_KEY)) || [];
    if (subscriptions.length === 0) {
      return Response.json({ ok: true, skipped: true });
    }

    // Pequeña variación humana antes de consultar la página 1 del CRM (24 más recientes)
    await humanDelay(1200, 3500);
    const clients = await fetchCrmClients(1, { noCache: true, maxPages: 1 });
    if (!clients.length) {
      return Response.json({ ok: true });
    }

    const currentIds = clients.map((c) => String(c.id)).filter(Boolean);
    const knownIdsRaw = await kv.get<string[]>(KNOWN_IDS_KEY);
    const knownIds = new Set<string>(Array.isArray(knownIdsRaw) ? knownIdsRaw.map(String) : []);

    // Primera ejecución: inicializar línea base sin disparar notificaciones masivas
    if (!knownIdsRaw || !Array.isArray(knownIdsRaw)) {
      await kv.set(KNOWN_IDS_KEY, currentIds.slice(0, MAX_KNOWN_IDS));
      return Response.json({ ok: true, initialized: true });
    }

    const newIds = currentIds.filter((id) => !knownIds.has(id));
    let activeSubscriptions = [...subscriptions];
    let hasExpired = false;

    for (const newId of newIds) {
      const client = clients.find((c) => String(c.id) === newId);
      if (!client) continue;

      const createdAtMs = new Date(client.fecha).getTime();
      if (Number.isNaN(createdAtMs)) continue;

      // Solo notificar clientes creados en las últimas 24 horas
      const horasDesdeCreacion = (Date.now() - createdAtMs) / (1000 * 60 * 60);
      if (horasDesdeCreacion > 24) continue;

      const partesNombre = (client.nombre || "Cliente").trim().split(/\s+/);
      const primerNombre = partesNombre[0] || "Cliente";
      const apellido = partesNombre[1] || "";
      const indicativo = (client.telefonoIndicativo || "+57").replace(/\D/g, "") || "57";
      const numLocal = (client.telefono || "").replace(/\D/g, "");
      const tel = numLocal ? `${indicativo}${numLocal}` : "";
      const ref = client.inmuebleInteres && client.inmuebleInteres !== "N/A" ? client.inmuebleInteres : null;
      const waUrl = tel ? `https://wa.me/${tel}` : null;

      const nombreCorto = `${primerNombre}${apellido ? " " + apellido.charAt(0) + "." : ""}`;
      const payload = JSON.stringify({
        title: `Nuevo lead · ${client.origen}`,
        body: `${nombreCorto}${ref ? " · Ref " + ref : ""}`,
        url: "/clientes?status=1",
        waUrl,
        tag: `nuevo-cliente-${newId}`,
        actions: [{ action: "ver-cliente", title: "Ver Cliente" }],
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
    }

    // Guardar historial acotado (conservando los más recientes)
    const mergedIds = Array.from(new Set([...knownIds, ...currentIds])).slice(-MAX_KNOWN_IDS);
    await kv.set(KNOWN_IDS_KEY, mergedIds);

    if (hasExpired) {
      await kv.set(SUBSCRIPTIONS_KEY, activeSubscriptions);
    }

    return Response.json({
      ok: true,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[check-new-clients]", err instanceof Error ? err.message : err);
    return Response.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
