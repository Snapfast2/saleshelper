// src/app/api/crm/keep-alive/route.ts
// Vercel Cron — se ejecuta cada 6 horas (00:00, 06:00, 12:00, 18:00 UTC)
// Objetivo: mantener la sesión CRM viva para que nunca expire por inactividad
// Sin esto, los domingos (u otras noches) la sesión muere y el primer usuario
// del día espera ~28s de re-login.

import { Redis } from "@upstash/redis";
import { fetchCrmClients } from "@/services/crmService";

const SESSION_KEY = "domus_session";

export async function GET(req: Request) {
  // Validar cron secret
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const t0 = Date.now();
  const ts = new Date().toISOString();

  try {
    // Hacer un fetch liviano — pide solo status=1, noCache para ir al CRM real
    // Esto renueva la cookie de sesión en el servidor de Domus
    const clients = await fetchCrmClients(1, { noCache: true });

    // Verificar estado de la sesión en Redis después del fetch
    let sessionTtl: number | null = null;
    try {
      const kv = Redis.fromEnv();
      sessionTtl = await kv.ttl(SESSION_KEY);
    } catch { /* Redis no crítico aquí */ }

    console.log(`[CRM-KEEPALIVE ${ts}] ✅ Sesión renovada — ${clients.length} clientes, TTL sesión: ${sessionTtl}s, tiempo: ${Date.now() - t0}ms`);

    return Response.json({
      ok: true,
      clientes: clients.length,
      sessionTtlSegundos: sessionTtl,
      duracionMs: Date.now() - t0,
      timestamp: ts,
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[CRM-KEEPALIVE ${ts}] ❌ Falló: ${msg}`);
    return Response.json({ ok: false, error: msg, timestamp: ts }, { status: 500 });
  }
}
