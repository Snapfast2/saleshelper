// src/app/api/crm/keep-alive/route.ts
// Vercel Cron — mantiene viva la sesión CRM sin sobrecargar Domus

import { verifyCronAuth } from "@/lib/auth";
import { getRedisTtl } from "@/lib/redis";
import { fetchCrmClients, humanDelay, SESSION_KEY } from "@/services/crmService";

export const maxDuration = 60;

export async function GET(req: Request) {
  if (!verifyCronAuth(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const t0 = Date.now();
  const ts = new Date().toISOString();

  try {
    // Variación natural para no golpear en el segundo 00 exacto
    await humanDelay(1200, 3500);

    // Pide únicamente 1 página (24 más recientes) para renovar la cookie sin paginar todo el historial
    const clients = await fetchCrmClients(1, { noCache: true, maxPages: 1 });
    const sessionTtl = await getRedisTtl(SESSION_KEY);

    console.log(
      `[CRM-KEEPALIVE ${ts}] Sesión activa (${clients.length} en pág 1, TTL=${sessionTtl}s, ${Date.now() - t0}ms)`
    );

    return Response.json({
      ok: true,
      duracionMs: Date.now() - t0,
      timestamp: ts,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[CRM-KEEPALIVE ${ts}] Falló: ${msg}`);
    return Response.json({ ok: false, timestamp: ts }, { status: 500 });
  }
}
