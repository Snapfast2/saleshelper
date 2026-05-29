import { Cliente } from "../types";
import fetch from "node-fetch";

const cachedClientesByStatus: Record<string, Cliente[]> = {};
const cacheTimestampsByStatus: Record<string, number> = {};
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function extractCookies(resHeaders: any, filterPrefix?: string): string {
  let cookies: string[] = [];
  if (typeof resHeaders.raw === "function") {
    cookies = resHeaders.raw()["set-cookie"] || [];
  } else if (typeof resHeaders.getSetCookie === "function") {
    cookies = resHeaders.getSetCookie();
  } else {
    const raw = resHeaders.get("set-cookie");
    if (raw) {
      cookies.push(...raw.split(","));
    }
  }

  return cookies
    .map(c => c.split(";")[0].trim())
    .filter(c => !filterPrefix || c.startsWith(filterPrefix) || c.includes(filterPrefix))
    .join("; ");
}

export async function fetchCrmClients(statusType: number | string = 1): Promise<Cliente[]> {
  const now = Date.now();
  const cacheKey = String(statusType);
  
  if (cachedClientesByStatus[cacheKey] && (now - cacheTimestampsByStatus[cacheKey] < CACHE_TTL)) {
    console.log(`Returning CRM clients for status ${statusType} from cache`);
    return cachedClientesByStatus[cacheKey];
  }

  const username = process.env.DOMUS_USERNAME;
  const password = process.env.DOMUS_PASSWORD;

  if (!username || !password) {
    throw new Error("Credenciales de Domus no configuradas");
  }

  try {
    const ts = Date.now();
    // 1. Initial Login to get session
    const homeRes = await fetch(`https://v2.domus.la?t=${ts}`, { 
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: 'no-store',
      next: { revalidate: 0 }
    } as any);
    
    const homeText = await homeRes.text();
    const csrfMatch = homeText.match(/<meta name="csrf-token-login" content="([^"]+)"/);
    const csrfToken = csrfMatch ? csrfMatch[1] : "";
    const sessionCookie = extractCookies(homeRes.headers);
    console.log("DEBUG: CSRF Token:", csrfToken);
    console.log("DEBUG: Session Cookie:", sessionCookie);

    const loginRes = await fetch("https://v2.domus.la/auth-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": csrfToken,
        "Cookie": sessionCookie,
        "User-Agent": "Mozilla/5.0"
      },
      body: JSON.stringify({ user: username, password: password }),
      cache: 'no-store',
      next: { revalidate: 0 }
    } as any);

    const loginText = await loginRes.text();
    console.log("DEBUG: Login Response Status:", loginRes.status);
    console.log("DEBUG: Login Headers:", Array.from(loginRes.headers.entries()));
    console.log("DEBUG: Login Response text preview (150 chars):", loginText.substring(0, 150));
    
    let loginData: any = {};
    try {
      loginData = JSON.parse(loginText);
    } catch (e) {
      console.log("DEBUG: Failed to parse login response as JSON");
    }
    
    if (loginData.mensaje === "Login exitoso" || loginData.camb_clave !== undefined) {
        const authCookies = extractCookies(loginRes.headers);
        const finalCookies = sessionCookie + "; " + authCookies;
        console.log("DEBUG: Final Cookies:", finalCookies);

        // 2. Fetch CRM SSO link
        const crmAuthRes = await fetch(`https://v2.domus.la/crm/new/ingreso?t=${ts}`, {
            headers: { "Cookie": finalCookies, "User-Agent": "Mozilla/5.0" },
            redirect: "manual",
            cache: 'no-store',
            next: { revalidate: 0 }
        } as any);
        console.log("DEBUG: CRM Auth Status:", crmAuthRes.status);

        if (crmAuthRes.status === 302 || crmAuthRes.status === 301) {
            const redirectUrl = crmAuthRes.headers.get("location");
            console.log("DEBUG: CRM Redirect URL:", redirectUrl);
            if (!redirectUrl) throw new Error("No redirect URL found for CRM SSO");

            // 3. Trade token for CRM session cookies
            const crmRes = await fetch(redirectUrl + (redirectUrl.includes("?") ? "&" : "?") + `t=${ts}`, {
                headers: { "User-Agent": "Mozilla/5.0" },
                redirect: "manual",
                cache: 'no-store',
                next: { revalidate: 0 }
            } as any);

            const crmSessionCookie = extractCookies(crmRes.headers, "session");

            // 4. Fetch the actual contacts via the CRM API Proxy
            const targetUrl = statusType === "todos" || statusType === ""
                ? "contacts?page=1&order=created_at_new"
                : `contacts?page=1&contact_status_type=${statusType}&order=created_at_new`;

            const apiRes = await fetch("https://crm.domusweb.co/api/get", {
                method: "POST",
                headers: { 
                    "Cookie": crmSessionCookie, 
                    "User-Agent": "Mozilla/5.0",
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({ url: targetUrl }),
                cache: 'no-store',
                next: { revalidate: 0 }
            } as any);

            const apiData = await apiRes.json();
            
            if (apiData && Array.isArray(apiData.data)) {
                // 5. Map the results
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
                        diasSeguimiento: typeof c.next_follow_days === "number" ? c.next_follow_days : undefined
                    };
                });
                
                cachedClientesByStatus[cacheKey] = clients;
                cacheTimestampsByStatus[cacheKey] = now;
                
                return clients;
            }
        }
    }
    
    throw new Error("No se pudo extraer la lista de clientes del CRM");
    
  } catch (error) {
    console.error("CRM Fetch Error:", error);
    // Return empty or cached fallback in case of failure
    if (cachedClientesByStatus[cacheKey]) return cachedClientesByStatus[cacheKey];
    return [];
  }
}
