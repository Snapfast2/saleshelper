import { fetchCrmClients } from "@/services/crmService";
import { fetchDomusProperties } from "@/services/domusService";
import { scrapeL2L } from "@/services/l2lService";
import EmptyState from "@/components/EmptyState";
import InmuebleGroup from "@/components/InmuebleGroup";
import Link from "next/link";
import type { Inmueble, Cliente } from "@/types";

async function fetchInmueblesServer(): Promise<Inmueble[]> {
  try {
    const d = await fetchDomusProperties();
    if (d?.inmuebles?.length > 0) return d.inmuebles;
  } catch {}
  try {
    const l = await scrapeL2L();
    if (l?.inmuebles?.length > 0) return l.inmuebles;
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
    fetchCrmClients(currentStatus, { noCache: true }),
    fetchInmueblesServer(),
  ]);

  // Lookup map: codigo -> Inmueble
  const inmuebleMap = new Map<string, Inmueble>();
  inmuebles.forEach((i) => inmuebleMap.set(i.id, i));

  // Agrupar clientes por inmuebleInteres
  const grupos = new Map<string, Cliente[]>();
  clientes.forEach((c) => {
    const key = c.inmuebleInteres ? String(c.inmuebleInteres) : "sin-inmueble";
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key)!.push(c);
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
            {clientes.length > 0
              ? `${clientes.length} contacto${clientes.length !== 1 ? "s" : ""} · ${gruposOrdenados.length} inmueble${gruposOrdenados.length !== 1 ? "s" : ""}`
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


      {clientes.length === 0 ? (
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
