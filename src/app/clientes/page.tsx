import { fetchCrmClients } from "@/services/crmService";
import EmptyState from "@/components/EmptyState";
import ClienteCard from "@/components/ClienteCard";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function ClientesPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const currentStatus = resolvedParams.status || "1"; // Default a "1" (Nuevos)
  const clientes = await fetchCrmClients(currentStatus);

  const tabsList = [
    { label: "Nuevos", value: "1" },
    { label: "Seguimiento", value: "2" },
  ];

  const isNuevos = currentStatus === "1";

  return (
    <div className="page" style={{ paddingBottom: "100px" }}>
      <div className="header" style={{ paddingBottom: 12 }}>
        <div>
          <h1 className="header-title">Clientes CRM</h1>
          <p className="header-sub">
            {clientes.length > 0
              ? `${clientes.length} contacto${clientes.length !== 1 ? "s" : ""} encontrado${clientes.length !== 1 ? "s" : ""}`
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
          {clientes.map((cliente) => (
            <ClienteCard
              key={cliente.id}
              cliente={cliente}
              showSeguimiento={!isNuevos}
            />
          ))}
        </div>
      )}
    </div>
  );
}
