import { Suspense } from "react";
import { fetchBothCrmTabsSWR } from "@/services/crmService";
import { fetchDomusProperties } from "@/services/domusService";
import { scrapeL2L } from "@/services/l2lService";
import InformesPropietariosView from "@/components/InformesPropietariosView";
import LoadingState from "@/components/LoadingState";
import type { Cliente, Inmueble } from "@/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function fetchInmueblesServer(): Promise<Inmueble[]> {
  // L2L primero — misma fuente que /api/inmuebles (con caché memoria + Redis SWR)
  try {
    const l = await scrapeL2L();
    if (l?.inmuebles?.length > 0) return l.inmuebles;
  } catch {}
  // Fallback: caché Domus sin disparar login
  try {
    const d = await fetchDomusProperties({ allowLogin: false });
    if (d?.inmuebles?.length > 0) return d.inmuebles;
  } catch {}
  return [];
}

export default async function InformesPage() {
  const [tabs, inmuebles] = await Promise.all([
    fetchBothCrmTabsSWR("1"),
    fetchInmueblesServer(),
  ]);

  const seenIds = new Set<string>();
  const clientesUnicos: Cliente[] = [];
  for (const c of [...tabs.nuevos, ...tabs.seguimiento]) {
    const key = String(c.id ?? "").trim();
    if (!key) {
      clientesUnicos.push(c);
      continue;
    }
    if (!seenIds.has(key)) {
      seenIds.add(key);
      clientesUnicos.push(c);
    }
  }

  return (
    <Suspense
      fallback={<LoadingState text="Preparando generador de informes..." />}
    >
      <InformesPropietariosView
        inmuebles={inmuebles}
        clientes={clientesUnicos}
      />
    </Suspense>
  );
}
