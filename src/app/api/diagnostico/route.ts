// src/app/api/diagnostico/route.ts
import { DOMUS_BROWSER_UA, verifyRequestSession } from "@/lib/auth";
import { acquireRedisLock, getRedis, getRedisTtl } from "@/lib/redis";
import { fetchCrmClients, SESSION_KEY, StoredSession } from "@/services/crmService";

export const maxDuration = 60;

const DAYS_ES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `hace ${days} día${days > 1 ? "s" : ""}`;
  if (hrs > 0) return `hace ${hrs} hora${hrs > 1 ? "s" : ""}`;
  if (min > 0) return `hace ${min} min`;
  return "hace un momento";
}

export async function GET(req: Request) {
  if (!verifyRequestSession(req)) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const wantLiveFetch = url.searchParams.get("fresh") === "1";

  // Proteger Domus contra recargas rápidas del diagnóstico
  if (wantLiveFetch) {
    const canProbeLive = await acquireRedisLock("diag_live_cd", 60);
    if (!canProbeLive) {
      return Response.json(
        { error: "Espera 60 segundos antes de ejecutar otra prueba en vivo contra el CRM." },
        { status: 429 }
      );
    }
  }

  const result: Record<string, any> = {};
  const now = new Date();
  result.diaSemana = DAYS_ES[now.getDay()];
  result.timestamp = now.toISOString();
  result.regionVercel = process.env.VERCEL_REGION || "local";

  // 1. Conectividad hacia Domus y CRM Apperty (con el mismo UA consistente de escritorio)
  try {
    const t1 = Date.now();
    const domusRes = await fetch("https://v2.domus.la/", {
      headers: { "User-Agent": DOMUS_BROWSER_UA },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const body = await domusRes.text();
    result.domus = {
      status: domusRes.status,
      latenciaMs: Date.now() - t1,
      ok: domusRes.ok,
      hasCsrf: body.includes("csrf-token-login"),
    };
  } catch {
    result.domus = { ok: false, error: "Sin respuesta de v2.domus.la" };
  }

  try {
    const t2 = Date.now();
    const crmRes = await fetch("https://crm.domus.la/", {
      headers: { "User-Agent": DOMUS_BROWSER_UA },
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    await crmRes.arrayBuffer().catch(() => null);
    result.crm = {
      host: "crm.domus.la",
      status: crmRes.status,
      latenciaMs: Date.now() - t2,
    };
  } catch {
    result.crm = { host: "crm.domus.la", error: "Sin respuesta" };
  }

  // 2. Estado de sesión y suscripciones en Redis (sin exponer endpoints ni tokens)
  const kv = getRedis();
  if (kv) {
    try {
      const session = await kv.get<StoredSession>(SESSION_KEY);
      const ttl = await getRedisTtl(SESSION_KEY);
      const subs = (await kv.get<any[]>("push_subscriptions_v2")) || [];
      const knownIds = await kv.get<string[]>("known_client_ids");

      result.sesion = {
        existe: Boolean(session?.crmSessionCookie),
        crmOrigin: session?.crmOrigin ?? "https://crm.domus.la",
        ttlSegundos: ttl,
        ttlDias: ttl > 0 ? (ttl / 86400).toFixed(1) : null,
        creadaHace: session?.createdAt ? timeAgo(session.createdAt) : null,
      };
      result.push = {
        dispositivosSuscritos: subs.length,
        clientesConocidos: Array.isArray(knownIds) ? knownIds.length : 0,
      };
    } catch {
      result.sesion = { error: "Redis temporalmente no disponible" };
    }
  } else {
    result.sesion = { redisConfigurado: false };
  }

  // 3. Variables configuradas (solo booleanos, jamás valores)
  result.configuracion = {
    domusCredenciales: Boolean(process.env.DOMUS_USERNAME && process.env.DOMUS_PASSWORD),
    vapidConfigurado: Boolean(
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
        process.env.VAPID_PRIVATE_KEY &&
        process.env.VAPID_EMAIL
    ),
    authConfigurado: Boolean(process.env.SALESHELPER_PIN && process.env.SALESHELPER_SECRET),
    redisConfigurado: Boolean(kv),
    cronSecretConfigurado: Boolean(process.env.CRON_SECRET),
  };

  // 4. Verificación secuencial de contactos (usa caché por defecto; ?fresh=1 consulta página 1 en vivo)
  const t3 = Date.now();
  try {
    const nuevos = await fetchCrmClients("1", { noCache: wantLiveFetch, maxPages: 1 });
    const seguimiento = await fetchCrmClients("2", { noCache: wantLiveFetch, maxPages: 1 });
    result.fetchClientes = {
      modo: wantLiveFetch ? "en-vivo-pag1" : "cache-o-vivo",
      latenciaMs: Date.now() - t3,
      nuevos: { ok: true, cantidadMuestra: nuevos.length },
      seguimiento: { ok: true, cantidadMuestra: seguimiento.length },
    };
  } catch {
    result.fetchClientes = { ok: false, latenciaMs: Date.now() - t3 };
  }

  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
