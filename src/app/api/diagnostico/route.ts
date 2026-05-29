import { Redis } from "@upstash/redis";

const UA_POOL = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; SM-A536B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36",
];

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

export async function GET() {
  const result: Record<string, any> = {};

  // ── 1. IP y geolocalización ──────────────────────────────────────────────
  try {
    const ipRes = await fetch("https://api.ipify.org?format=json", { cache: "no-store" });
    const { ip } = await ipRes.json();
    result.ip = ip;

    const t0 = Date.now();
    const geoRes = await fetch(`https://ipinfo.io/${ip}/json`, { cache: "no-store" });
    result.geoLatencyMs = Date.now() - t0;
    const geo = await geoRes.json();
    result.geo = {
      pais: geo.country,
      region: geo.region,
      ciudad: geo.city,
      isp: geo.org,
      zona: geo.timezone,
      coordenadas: geo.loc,
    };
  } catch { result.ipError = true; }

  // ── 2. Latencia hacia Domus ──────────────────────────────────────────────
  const UA_DIAG = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
  try {
    const t1 = Date.now();
    const domusRes = await fetch("https://v2.domus.la", {
      headers: { "User-Agent": UA_DIAG },
      cache: "no-store",
    });
    const body = await domusRes.text();
    result.domus = {
      status: domusRes.status,
      latenciaMs: Date.now() - t1,
      ok: domusRes.ok,
      pesoKB: Math.round(body.length / 1024),
      server: domusRes.headers.get("server") ?? "—",
      xPoweredBy: domusRes.headers.get("x-powered-by") ?? "—",
      cfRay: domusRes.headers.get("cf-ray") ?? "—",
      hasCsrf: body.includes("csrf-token-login"),
    };
  } catch (e: any) { result.domus = { error: e.message }; }

  try {
    const t2 = Date.now();
    const crmRes = await fetch("https://crm.domusweb.co", {
      headers: { "User-Agent": UA_DIAG },
      cache: "no-store",
    });
    result.crm = {
      status: crmRes.status,
      latenciaMs: Date.now() - t2,
      server: crmRes.headers.get("server") ?? "—",
    };
  } catch (e: any) { result.crm = { error: e.message }; }

  // ── 3. Headers exactos que enviamos a Domus ─────────────────────────────
  result.headersEnviados = {
    userAgentPool: UA_POOL,
    acceptLanguage: "es-CO,es;q=0.9",
    referer: "https://v2.domus.la/",
    contentType: "application/json",
    accept: "application/json",
    nota: "Se elige 1 UA al azar por sesión. El mismo UA se usa en los 4 pasos del login.",
  };

  // ── 4. Estado de sesión en Redis ─────────────────────────────────────────
  try {
    const redis = Redis.fromEnv();
    const session = await redis.get<{ ua?: string; createdAt?: number }>("domus_session");
    const ttl = await redis.ttl("domus_session");

    result.sesion = {
      existe: !!session,
      ttlSegundos: ttl,
      ttlDias: ttl > 0 ? (ttl / 86400).toFixed(1) : null,
      ua: session?.ua ?? null,
      uaTipo: session?.ua
        ? session.ua.includes("Mobile") ? "📱 Mobile" : "🖥️ Desktop"
        : null,
      creadaHace: session?.createdAt ? timeAgo(session.createdAt) : null,
    };

    // 5. Push subscription
    const pushSub = await redis.get<{ endpoint?: string }>("push_subscription");
    const knownIds = await redis.get<string[]>("known_client_ids");
    result.push = {
      subscribed: !!pushSub?.endpoint,
      endpoint: pushSub?.endpoint ? "..." + pushSub.endpoint.slice(-40) : null,
      clientesConocidos: Array.isArray(knownIds) ? knownIds.length : 0,
    };
  } catch (e: any) {
    result.sesion = { error: "Redis no disponible: " + e.message };
    result.push = { error: "Redis no disponible" };
  }

  // ── 6. Verificación de variables de entorno ──────────────────────────────
  result.env = {
    domusUsername: !!process.env.DOMUS_USERNAME,
    domusPassword: !!process.env.DOMUS_PASSWORD,
    vapidPublicKey: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    vapidPrivateKey: !!process.env.VAPID_PRIVATE_KEY,
    vapidEmail: !!process.env.VAPID_EMAIL,
    saleshelperPin: !!process.env.SALESHELPER_PIN,
    saleshelperSecret: !!process.env.SALESHELPER_SECRET,
    upstashUrl: !!process.env.KV_REST_API_URL,
    upstashToken: !!process.env.KV_REST_API_TOKEN,
    cronSecret: !!process.env.CRON_SECRET,
  };

  result.regionVercel = process.env.VERCEL_REGION || "local";
  result.timestamp = new Date().toISOString();

  return Response.json(result);
}
