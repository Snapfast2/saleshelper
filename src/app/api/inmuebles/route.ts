// src/app/api/inmuebles/route.ts
import { NextResponse } from "next/server";
import { scrapeL2L } from "@/services/l2lService";
import { fetchDomusProperties } from "@/services/domusService";
import { INMUEBLES_DEMO } from "@/lib/inmuebles-demo";

export const revalidate = 1800; // 30 minutos

export async function GET() {
  try {
    // 1. Intentamos obtener de Domus (La fuente más actualizada y privada)
    try {
        console.log("Intentando extraer desde Domus CRM...");
        const domusData = await fetchDomusProperties();
        if (domusData && domusData.inmuebles.length > 0) {
             return NextResponse.json(domusData, { status: 200 });
        }
    } catch (domusError) {
        console.error("Fallo Domus, cayendo a L2L...", domusError);
    }

    // 2. Si Domus falla, hacemos fallback a L2L (Scraping público)
    try {
        console.log("Intentando extraer desde L2L Web...");
        const l2lData = await scrapeL2L();
        if (l2lData && l2lData.inmuebles.length > 0) {
            return NextResponse.json(l2lData, { status: 200 });
        }
    } catch (l2lError) {
        console.error("Fallo L2L, cayendo a Demo...", l2lError);
    }
    
    // 3. Si todo falla, enviamos datos de demostración
    return NextResponse.json(
        { inmuebles: INMUEBLES_DEMO, fuente: "demo", total: INMUEBLES_DEMO.length },
        { status: 200 }
    );
    
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
