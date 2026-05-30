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
  // Validar cron secret para evitar llamadas externas
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    initWebPush();

    // Jitter aleatorio 0-180 s para que el patrón no sea exactamente cada 15 min
    const jitterMs = Math.floor(Math.random() * 3 * 60 * 1000);
    await new Promise((r) => setTimeout(r, jitterMs));

    // 1. Buscar suscripción push
    const subscription = await redis.get<any>(SUBSCRIPTION_KEY);
    if (!subscription?.endpoint) {
      return Response.json({ skipped: true, reason: "Sin suscripción push" });
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

    // 5. Enviar notificación por cada cliente nuevo
    for (const newId of newIds) {
      const client = clients.find(c => String(c.id) === newId);
      if (!client) continue;

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

      try {
        await webpush.sendNotification(subscription, payload);
      } catch (err: any) {
        if (err?.statusCode === 410) {
          await redis.del(SUBSCRIPTION_KEY);
          break; // Suscripción expirada — detener
        }
      }
    }

    // 6. Actualizar IDs conocidos
    await redis.set(KNOWN_IDS_KEY, Array.from(currentIds));

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
