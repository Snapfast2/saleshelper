// src/services/domusService.ts
// Servicio para autenticarse y extraer inmuebles desde la API interna de Domus CRM (v2.domus.la)

import type { Inmueble } from "@/types";

const DOMUS_LOGIN_URL = "https://v2.domus.la/auth-login";
const DOMUS_HOME_URL = "https://v2.domus.la";
const DOMUS_FILTER_API_URL = "https://v2.domus.la/properties/filter";

export async function fetchDomusProperties(): Promise<{ inmuebles: Inmueble[], fuente: string, total: number }> {
  try {
    const username = process.env.DOMUS_USERNAME;
    const password = process.env.DOMUS_PASSWORD;

    if (!username || !password) {
      throw new Error("Credenciales de Domus no configuradas en .env.local");
    }

    // 1. Obtener Token CSRF y cookies iniciales visitando la página principal
    const homeRes = await fetch(DOMUS_HOME_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36" },
      next: { revalidate: 0 } // No cachear esto
    });

    const homeText = await homeRes.text();
    const csrfMatch = homeText.match(/<meta name="csrf-token-login" content="([^"]+)"/);
    const csrfToken = csrfMatch ? csrfMatch[1] : "";
    
    const setCookieHeader = homeRes.headers.get("set-cookie");
    let sessionCookie = "";
    if (setCookieHeader) {
      // split by comma, but be careful with expires= dates which also contain commas.
      // Next.js fetch API sometimes combines cookies into one string
       sessionCookie = setCookieHeader.split(',').map(c => c.split(';')[0]).join('; ');
    }

    // 2. Iniciar sesión en Domus
    const loginRes = await fetch(DOMUS_LOGIN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": csrfToken,
        "Cookie": sessionCookie,
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://v2.domus.la/login"
      },
      body: JSON.stringify({ user: username, password: password }),
      cache: "no-store"
    });

    const loginData = await loginRes.json();
    
    if (loginData.mensaje !== "Login exitoso" && loginData.camb_clave === undefined) {
      throw new Error("Fallo al iniciar sesión en Domus. Verifica credenciales.");
    }

    // 3. Recoger cookies de sesión autenticadas
    const authCookieHeader = loginRes.headers.get("set-cookie");
    let finalCookies = sessionCookie;
    if (authCookieHeader) {
        const authCookies = authCookieHeader.split(',').map(c => c.split(';')[0]).join('; ');
        finalCookies += "; " + authCookies;
    }

    // 4. Hacer la llamada a la API interna de Domus para obtener los inmuebles (Página 1)
    const fetchPage = async (page: number) => {
        const res = await fetch(`${DOMUS_FILTER_API_URL}?page=${page}`, {
            method: "POST",
            headers: {
                "Cookie": finalCookies,
                "User-Agent": "Mozilla/5.0",
                "Content-Type": "application/json",
                "X-Requested-With": "XMLHttpRequest",
                "X-CSRF-TOKEN": csrfToken
            },
            body: JSON.stringify({ data: { buscar: "", captador: 29214 } }),
            next: { revalidate: 1800 } 
        });
        if (!res.ok) throw new Error(`API de Domus respondió con error ${res.status}`);
        return res.json();
    };

    const firstPageData = await fetchPage(1);
    if (!firstPageData.data || !Array.isArray(firstPageData.data)) {
         throw new Error("La API de Domus no devolvió el arreglo de datos esperado.");
    }

    let allRawProperties = [...firstPageData.data];
    const totalPages = firstPageData.last_page || 1;

    // Fetch remaining pages concurrently
    if (totalPages > 1) {
        const pagePromises = [];
        for (let i = 2; i <= totalPages; i++) {
            pagePromises.push(fetchPage(i));
        }
        const pagesResults = await Promise.all(pagePromises);
        pagesResults.forEach(pageJson => {
            if (pageJson.data && Array.isArray(pageJson.data)) {
                allRawProperties.push(...pageJson.data);
            }
        });
    }

    // 5. Mapear los datos de Domus a nuestra interfaz Inmueble
    // Filtramos localmente por seguridad para garantizar que solo salgan los de Olga Patricia (ID: 29214)
    // Y además filtramos por estado para quitar los Vendidos, Arrendados o Retirados (mostrar solo los activos)
    const rawProperties = allRawProperties.filter((p: any) => {
        if (!p.captador || p.captador.id !== 29214) return false;
        
        const estado = p.estado_inmueble ? p.estado_inmueble.estado_inmueble : "";
        // Mostrar 'Disponible' (11 inmuebles) y 'En proceso' u otros activos si lo desean.
        // La web oficial muestra 11 por defecto, que son exactamente los que tienen estado 'Disponible'.
        return estado === 'Disponible' || estado === 'En proceso';
    });

    const inmuebles: Inmueble[] = rawProperties.map((p: any) => {
        // Determinar imagen principal
        let imagen = "https://via.placeholder.com/400x300?text=Sin+Foto";
        if (p.primera_imagen && p.primera_imagen.imageurl) {
            imagen = p.primera_imagen.imageurl;
        }

        // Construir Título
        const tipoText = p.tipo_inmueble ? p.tipo_inmueble.tipo_inmueble : "Inmueble";
        const gestionText = p.gestion ? p.gestion.gestion : "";
        const barrioText = p.barrio ? p.barrio : "";
        
        let urlDomus = "";
        // Dependiendo de si es venta o arriendo armamos el link a la ficha pública
        // Para esto necesitamos saber el subdominio o ruta de L2L o de Domus.
        // Por ahora, enviaremos la de L2L o armamos una si sabemos la estructura de domus público.
        // Ejemplo genérico:
        if (p.codigo) {
             urlDomus = `https://l2lbienesraices.com/inmueble/${p.codigo}`;
        }

        // Determinar Gestión y Precio
        let gestionFormat: "venta" | "arriendo" = "venta";
        let precioFormat = 0;
        
        const gLow = gestionText.toLowerCase();
        if (gLow.includes("arriendo")) {
            gestionFormat = "arriendo";
            precioFormat = p.canon || 0;
        } else {
            gestionFormat = "venta";
            precioFormat = p.venta || 0;
        }

        return {
            id: p.codigo || String(p.id),
            codigoDomus: String(p.codigo),
            titulo: `${tipoText} en ${gestionFormat === "venta" ? "Venta" : "Arriendo"} en ${barrioText}`,
            tipo: tipoText,
            ciudad: p.ciudad ? p.ciudad.nombre : "Bogotá",
            barrio: barrioText,
            gestion: gestionFormat,
            precio: precioFormat,
            areaTotal: p.area_construida || 0,
            habitaciones: p.habitaciones || 0,
            banos: p.banos || 0,
            garajes: p.parqueadero || 0,
            imagen: imagen,
            urlL2L: urlDomus,
            urlDomus: urlDomus,
            estado: p.estado_inmueble ? p.estado_inmueble.estado_inmueble : "Disponible"
        };
    });

    return { 
        inmuebles, 
        fuente: "domus", 
        total: inmuebles.length 
    };

  } catch (error) {
    console.error("[Domus Service] Error:", error);
    // Lanzamos el error para que la ruta API lo atrape y haga fallback a L2L o Demo
    throw error;
  }
}
