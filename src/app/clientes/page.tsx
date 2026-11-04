import { fetchBothCrmTabsSWR } from "@/services/crmService";
import { fetchDomusProperties } from "@/services/domusService";
import { scrapeL2L } from "@/services/l2lService";
import ClientesView from "@/components/ClientesView";
import type { Inmueble } from "@/types";

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

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function ClientesPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const currentStatus: "1" | "2" = resolvedParams.status === "2" ? "2" : "1";

  const [tabs, inmuebles] = await Promise.all([
    fetchBothCrmTabsSWR(currentStatus),
    fetchInmueblesServer(),
  ]);

  return (
    <ClientesView
      initialStatus={currentStatus}
      nuevos={tabs.nuevos}
      seguimiento={tabs.seguimiento}
      inmuebles={inmuebles}
    />
  );
}
