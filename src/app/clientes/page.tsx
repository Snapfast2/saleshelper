import { fetchCrmClients } from "@/services/crmService";
import { fetchDomusProperties } from "@/services/domusService";
import { scrapeL2L } from "@/services/l2lService";
import EmptyState from "@/components/EmptyState";
import InmuebleGroup from "@/components/InmuebleGroup";
import Link from "next/link";
import type { Inmueble, Cliente } from "@/types";

async function fetchInmueblesServer(): Promise<Inmueble[]> {
  // L2L primero — misma fuente que /api/inmuebles (18 inmuebles exactos de Patricia)
  // Garantiza que el property_code del CRM coincida con los IDs del catálogo
  try {
    const l = await scrapeL2L();
    if (l?.inmuebles?.length > 0) return l.inmuebles;
  } catch {}
  // Fallback: Domus directo (932 propiedades de toda la agencia)
  try {
    const d = await fetchDomusProperties();
    if (d?.inmuebles?.length > 0) return d.inmuebles;
  } catch {}
  return [];
}

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function ClientesPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const currentStatus = resolvedParams.status || "1";
  const isNuevos = currentStatus === "1";

  const [clientes, inmuebles] = await Promise.all([
    fetchCrmClients(currentStatus),
    fetchInmueblesServer(),
  ]);

  // Lookup map: codigo -> Inmueble
  const inmuebleMap = new Map<string, Inmueble>();
  inmuebles.forEach((i) => inmuebleMap.set(i.id, i));

  // Filtrar y agrupar clientes por inmuebleInteres
  const grupos = new Map<string, Cliente[]>();
  let totalClientesFiltrados = 0;

  clientes.forEach((c) => {
    // Si el inmueble de interés no está en el catálogo activo, se agrupa como "sin-inmueble"
    // en lugar de descartarse — así se ven todos los leads (vendidos, archivados, otro asesor)
    const hasActiveInmueble =
      c.inmuebleInteres && c.inmuebleInteres !== "N/A" && inmuebleMap.has(String(c.inmuebleInteres));
    const key = hasActiveInmueble ? String(c.inmuebleInteres) : "sin-inmueble";

    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key)!.push(c);
    totalClientesFiltrados++;
  });

  // Ordenar: grupos con más clientes primero, "sin-inmueble" al final
  const gruposOrdenados = Array.from(grupos.entries()).sort(([keyA, a], [keyB, b]) => {
    if (keyA === "sin-inmueble") return 1;
    if (keyB === "sin-inmueble") return -1;
    return b.length - a.length;
  });

  const tabsList = [
    { label: "Nuevos", value: "1" },
    { label: "Seguimiento", value: "2" },
  ];

  return (
    <div className="page" style={{ paddingBottom: "100px" }}>
      <div className="header" style={{ paddingBottom: 12 }}>
        <div>
          <h1 className="header-title">Clientes CRM</h1>
          <p className="header-sub">
            {totalClientesFiltrados > 0
              ? `${totalClientesFiltrados} contacto${totalClientesFiltrados !== 1 ? "s" : ""} · ${gruposOrdenados.length} inmueble${gruposOrdenados.length !== 1 ? "s" : ""}`
              : "Leads y contactos de portales inmobiliarios."}
          </p>
        </div>
      </div>

      <div style={{ padding: "0 20px 16px" }}>
        <div className="tabs" style={{ padding: 0 }}>
          {tabsList.map((tab) => {
            const isActive = currentStatus === tab.value;
            return (
              <Link
                key={tab.value}
                href={`/clientes?status=${tab.value}`}
                className={`tab-pill ${isActive ? "active" : ""}`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>


      {totalClientesFiltrados === 0 ? (
        <div style={{ padding: "0 20px" }}>
          <EmptyState
            title="No hay clientes"
            description="No se encontraron contactos en esta categoría en este momento."
          />
        </div>
      ) : (
        <div className="grid-1">
          {gruposOrdenados.map(([codigo, grupoClientes]) => (
            <InmuebleGroup
              key={codigo}
              codigoRef={codigo}
              inmueble={inmuebleMap.get(codigo)}
              clientes={grupoClientes}
              showSeguimiento={!isNuevos}
            />
          ))}
        </div>
      )}
    </div>
  );
}
