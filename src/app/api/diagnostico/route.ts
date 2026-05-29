const UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";

export async function GET() {
  const results: Record<string, any> = {};

  // 1. IP de salida real del servidor de Vercel
  try {
    const ipRes = await fetch("https://api.ipify.org?format=json", { cache: "no-store" });
    const { ip } = await ipRes.json();
    results.ip = ip;

    // 2. Geolocalización de esa IP — lo que Domus ve
    const geoRes = await fetch(`https://ipinfo.io/${ip}/json`, { cache: "no-store" });
    const geo = await geoRes.json();
    results.geo = {
      pais: geo.country,
      region: geo.region,
      ciudad: geo.city,
      isp: geo.org, // e.g. "AS76004 Vercel Inc"
      zona: geo.timezone,
      coordenadas: geo.loc,
    };
  } catch (e) {
    results.ipError = "No se pudo obtener la IP";
  }

  // 3. Latencia hacia Domus
  try {
    const t0 = Date.now();
    const domusRes = await fetch("https://v2.domus.la", {
      headers: { "User-Agent": UA },
      cache: "no-store",
    });
    results.domus = {
      status: domusRes.status,
      latenciaMs: Date.now() - t0,
      ok: domusRes.ok,
    };
  } catch (e) {
    results.domus = { error: "No se pudo conectar a Domus" };
  }

  // 4. Latencia hacia el CRM
  try {
    const t1 = Date.now();
    const crmRes = await fetch("https://crm.domusweb.co", {
      headers: { "User-Agent": UA },
      cache: "no-store",
    });
    results.crm = {
      status: crmRes.status,
      latenciaMs: Date.now() - t1,
    };
  } catch (e) {
    results.crm = { error: "No se pudo conectar al CRM" };
  }

  results.timestamp = new Date().toISOString();
  results.region_vercel = process.env.VERCEL_REGION || "local";

  return Response.json(results);
}
