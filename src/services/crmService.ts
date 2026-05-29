import { Cliente } from "../types";

const cachedClientesByStatus: Record<string, Cliente[]> = {};
const cacheTimestampsByStatus: Record<string, number> = {};

// TTL aleatorio entre 25 y 38 minutos — evita patrón de login perfectamente periódico
function randomTTL() {
  const min = 25 * 60 * 1000;
  const max = 38 * 60 * 1000;
  return min + Math.random() * (max - min);
}

// Delay aleatorio que simula tiempo de navegación humana (ms)
function humanDelay(minMs = 600, maxMs = 2200): Promise<void> {
  return new Promise(r => setTimeout(r, minMs + Math.random() * (maxMs - minMs)));
}

// User-Agent realista de Android Chrome — indistinguible de un navegador real
const UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";

function extractCookies(resHeaders: Headers, filterPrefix?: string): string {
  let cookies: string[] = [];

  if (typeof (resHeaders as any).getSetCookie === "function") {
    cookies = (resHeaders as any).getSetCookie();
  } else {
    const raw = resHeaders.get("set-cookie");
    if (raw) cookies.push(...raw.split(","));
  }

  return cookies
    .map(c => c.split(";")[0].trim())
    .filter(c => !filterPrefix || c.startsWith(filterPrefix) || c.includes(filterPrefix))
    .join("; ");
}

export async function fetchCrmClients(statusType: number | string = 1): Promise<Cliente[]> {
  const now = Date.now();
  const cacheKey = String(statusType);

  if (
    cachedClientesByStatus[cacheKey] &&
    (now - cacheTimestampsByStatus[cacheKey] < (cacheTimestampsByStatus[`ttl_${cacheKey}`] || randomTTL()))
  ) {
    return cachedClientesByStatus[cacheKey];
  }

  const username = process.env.DOMUS_USERNAME;
  const password = process.env.DOMUS_PASSWORD;

  if (!username || !password) {
    throw new Error("Credenciales de Domus no configuradas");
  }

  try {
    const ts = Date.now();

    // 1. Obtener CSRF token y sesión inicial
    const homeRes = await fetch(`https://v2.domus.la?t=${ts}`, {
      headers: {
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-CO,es;q=0.9",
      },
      cache: "no-store",
    });

    const homeText = await homeRes.text();
    const csrfMatch = homeText.match(/<meta name="csrf-token-login" content="([^"]+)"/);
    const csrfToken = csrfMatch ? csrfMatch[1] : "";
    const sessionCookie = extractCookies(homeRes.headers);

    // Delay 1: simula tiempo de carga antes del login
    await humanDelay(800, 1800);

    // 2. Login
    const loginRes = await fetch("https://v2.domus.la/auth-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": csrfToken,
        "Cookie": sessionCookie,
        "User-Agent": UA,
        "Accept": "application/json",
        "Accept-Language": "es-CO,es;q=0.9",
        "Referer": "https://v2.domus.la/",
      },
      body: JSON.stringify({ user: username, password: password }),
      cache: "no-store",
    });

    const loginText = await loginRes.text();
    let loginData: any = {};
    try {
      loginData = JSON.parse(loginText);
    } catch (_) {}

    if (loginData.mensaje === "Login exitoso" || loginData.camb_clave !== undefined) {
      const authCookies = extractCookies(loginRes.headers);
      const finalCookies = sessionCookie + "; " + authCookies;

      // Delay 2: simula navegación al CRM tras login
      await humanDelay(600, 1500);

      // 3. Obtener link SSO del CRM
      const crmAuthRes = await fetch(`https://v2.domus.la/crm/new/ingreso?t=${ts}`, {
        headers: {
          "Cookie": finalCookies,
          "User-Agent": UA,
          "Referer": "https://v2.domus.la/",
          "Accept-Language": "es-CO,es;q=0.9",
        },
        redirect: "manual",
        cache: "no-store",
      });

      if (crmAuthRes.status === 302 || crmAuthRes.status === 301) {
        const redirectUrl = crmAuthRes.headers.get("location");
        if (!redirectUrl) throw new Error("No redirect URL found for CRM SSO");

        // Delay 3: simula tiempo de redirección SSO
        await humanDelay(500, 1200);

        // 4. Canjear token por sesión del CRM
        const crmRes = await fetch(
          redirectUrl + (redirectUrl.includes("?") ? "&" : "?") + `t=${ts}`,
          {
            headers: {
              "User-Agent": UA,
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "Accept-Language": "es-CO,es;q=0.9",
            },
            redirect: "manual",
            cache: "no-store",
          }
        );

        const crmSessionCookie = extractCookies(crmRes.headers, "session");

        // Delay 4: simula carga del CRM antes de llamar la API
        await humanDelay(700, 2200);

        // 5. Obtener contactos
        const targetUrl =
          statusType === "todos" || statusType === ""
            ? "contacts?page=1&order=created_at_new"
            : `contacts?page=1&contact_status_type=${statusType}&order=created_at_new`;

        const apiRes = await fetch("https://crm.domusweb.co/api/get", {
          method: "POST",
          headers: {
            "Cookie": crmSessionCookie,
            "User-Agent": UA,
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Accept-Language": "es-CO,es;q=0.9",
            "Referer": "https://crm.domusweb.co/",
          },
          body: JSON.stringify({ url: targetUrl }),
          cache: "no-store",
        });

        const apiData = await apiRes.json();

        if (apiData && Array.isArray(apiData.data)) {
          const clients: Cliente[] = apiData.data.map((c: any) => {
            let origin = "Portal Web";
            if (c.source === 2) origin = "Finca Raíz";
            if (c.source === 6) origin = "Metro Cuadrado";
            if (c.source === 5) origin = "Ciencuadras";
            if (c.source === 3) origin = "Sitio Web Propio";

            return {
              id: c.code,
              nombre: c.full_name || "Sin nombre",
              email: c.email || "",
              telefono: c.phones && c.phones.length > 0 ? c.phones[0].phone : "",
              telefonoIndicativo: c.phones && c.phones.length > 0 ? c.phones[0].phone_indicative : "+57",
              estado: c.status ? c.status.name : "Desconocido",
              inmuebleInteres: c.entities && c.entities.length > 0 ? c.entities[0].property_code : "N/A",
              origen: origin,
              fecha: c.created_at || new Date().toISOString(),
              diasSeguimiento: typeof c.next_follow_days === "number" ? c.next_follow_days : undefined,
            };
          });

          cachedClientesByStatus[cacheKey] = clients;
          cacheTimestampsByStatus[cacheKey] = now;
          cacheTimestampsByStatus[`ttl_${cacheKey}`] = randomTTL();

          return clients;
        }
      }
    }

    throw new Error("No se pudo extraer la lista de clientes del CRM");
  } catch (error) {
    console.error("CRM fetch error:", error instanceof Error ? error.message : "Unknown error");
    if (cachedClientesByStatus[cacheKey]) return cachedClientesByStatus[cacheKey];
    return [];
  }
}
