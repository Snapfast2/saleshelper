// src/app/api/push/check-new-clients/route.ts
// Vercel Cron Job — se ejecuta cada 15 minutos
// Detecta clientes nuevos en Domus y manda push notification a Patricia

import webpush from "web-push";
import { Redis } from "@upstash/redis";
import { fetchCrmClients } from "@/services/crmService";

const redis = Redis.fromEnv();
const KNOWN_IDS_KEY = "known_client_ids";
const SUBSCRIPTION_KEY = "push_subscription";

function initWebPush() {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
}

export async function GET(req: Request) {
  // Validar cron secret o parámetro por URL para facilitar cron-job.org
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  
  const url = new URL(req.url);
  const querySecret = url.searchParams.get("cron");

  // Permitir si viene el header de Vercel/GitHub o si trae el password en la URL
  const isAuthorized = 
    (cronSecret && authHeader === `Bearer ${cronSecret}`) || 
    querySecret === "saleshelper";

  if (!isAuthorized) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    initWebPush();

    // Ventana horaria: solo operar entre 7am y 7pm hora Colombia (UTC-5)
    // Fuera de ese horario, un humano no estaría revisando el CRM
    const horaCol = (new Date().getUTCHours() - 5 + 24) % 24;
    if (horaCol < 7 || horaCol >= 21) {
      return Response.json({ skipped: true, reason: "Fuera de horario laboral (7am-9pm Col)" });
    }

    // Jitter aleatorio eliminado para evitar 504 Gateway Timeout en Vercel (límite 10s-60s)

    // 1. Buscar suscripciones push
    const subscriptions = await redis.get<any[]>("push_subscriptions_v2") || [];
    if (subscriptions.length === 0) {
      return Response.json({ skipped: true, reason: "Sin suscripciones push" });
    }

    // 2. Obtener clientes nuevos de Domus — siempre frescos, nunca del caché
    // noCache:true garantiza que detectamos clientes que llegaron en los últimos 15 min
    const clients = await fetchCrmClients(1, { noCache: true });
    if (!clients.length) {
      return Response.json({ checked: 0, new: 0 });
    }

    const currentIds = new Set(clients.map(c => String(c.id)));

    // 3. Comparar con IDs conocidos en Redis
    const knownIdsRaw = await redis.get<string[]>(KNOWN_IDS_KEY);
    const knownIds = new Set<string>(knownIdsRaw ?? []);

    // Si es la primera vez, solo guardar sin notificar
    if (!knownIdsRaw) {
      await redis.set(KNOWN_IDS_KEY, Array.from(currentIds));
      return Response.json({ checked: clients.length, new: 0, firstRun: true });
    }

    // 4. Detectar IDs nuevos
    const newIds = [...currentIds].filter(id => !knownIds.has(id));

    let activeSubscriptions = [...subscriptions];
    let hasExpired = false;

    // 5. Enviar notificación por cada cliente nuevo
    for (const newId of newIds) {
      const client = clients.find(c => String(c.id) === newId);
      if (!client) continue;

      // Filtro de seguridad máximo: si el cliente fue creado hace más de 24 horas,
      // es un cliente viejo que el CRM movió de página (por ej. por una edición). No notificar.
      const createdAt = new Date(client.fecha);
      const horasDesdeCreacion = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
      if (horasDesdeCreacion > 24) {
        continue;
      }

      const primerNombre = client.nombre.split(" ")[0];
      const apellido     = client.nombre.split(" ")[1] || "";
      const tel = client.telefono
        ? `${client.telefonoIndicativo.replace(/\D/g, "")}${client.telefono.replace(/\D/g, "")}`
        : "";
      const ref   = client.inmuebleInteres !== "N/A" ? client.inmuebleInteres : null;
      const waUrl = tel ? `https://wa.me/${tel}` : null;

      const nombreCorto = `${primerNombre}${apellido ? " " + apellido.charAt(0) + "." : ""}`;
      const payload = JSON.stringify({
        title: `Nuevo lead · ${client.origen}`,
        body:  `${nombreCorto}${ref ? " · Ref " + ref : ""}`,
        url:   "/clientes",
        waUrl,
        tag:   `nuevo-cliente-${newId}`,
        actions: [
          { action: "ver-perfil", title: "Ver perfil" },
          ...(waUrl ? [{ action: "whatsapp", title: "WhatsApp" }] : []),
        ],
      });

      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(sub, payload);
        } catch (err: any) {
          if (err?.statusCode === 410) {
            activeSubscriptions = activeSubscriptions.filter(s => s.endpoint !== sub.endpoint);
            hasExpired = true;
          }
        }
      }
    }

    // 6. Actualizar IDs conocidos (manteniendo un historial infinito para no repetir si un viejo vuelve a la pag 1)
    const updatedKnownIds = new Set([...knownIds, ...currentIds]);
    await redis.set(KNOWN_IDS_KEY, Array.from(updatedKnownIds));

    // TEMPORAL: Notificación de "Latido" para comprobar que sí está corriendo automáticamente
    if (newIds.length === 0) {
      const horaActual = new Date().toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: 'numeric', minute: '2-digit' });
      const payload = JSON.stringify({
        title: "🤖 Vigilante Activo",
        body: `Revisión automática de las ${horaActual} completada. ${clients.length} clientes en total, 0 nuevos.`,
        url: "/",
        tag: "status-ping"
      });
      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(sub, payload);
        } catch(e) {}
      }
    }

    if (hasExpired) {
      await redis.set("push_subscriptions_v2", activeSubscriptions);
    }

    return Response.json({
      checked: clients.length,
      new: newIds.length,
      notified: newIds,
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    console.error("[check-new-clients]", err instanceof Error ? err.message : err);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
