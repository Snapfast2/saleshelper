'use client';
// src/components/ClientesView.tsx
// Vista interactiva instantánea (0ms entre pestañas) con búsqueda diferida y chips de filtro rápido

import { useState, useMemo, useDeferredValue } from "react";
import { Search, X, Filter } from "lucide-react";
import type { Cliente, Inmueble } from "@/types";
import { useUltimasInteracciones } from "@/hooks/useInteracciones";
import InmuebleGroup from "@/components/InmuebleGroup";
import RefreshCrmButton from "@/components/RefreshCrmButton";
import EmptyState from "@/components/EmptyState";

interface ClientesViewProps {
  initialStatus: "1" | "2";
  nuevos: Cliente[];
  seguimiento: Cliente[];
  inmuebles: Inmueble[];
}

type QuickFilter = "todos" | "urgentes" | "sin-escribir";

export default function ClientesView({
  initialStatus,
  nuevos,
  seguimiento,
  inmuebles,
}: ClientesViewProps) {
  const [activeTab, setActiveTab] = useState<"1" | "2">(initialStatus);
  const [searchQuery, setSearchQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("todos");

  const deferredQuery = useDeferredValue(searchQuery.trim().toLowerCase());
  const interacciones = useUltimasInteracciones();

  const isNuevos = activeTab === "1";
  const baseClientes = isNuevos ? nuevos : seguimiento;

  const inmuebleMap = useMemo(() => {
    const map = new Map<string, Inmueble>();
    for (const inm of inmuebles) {
      map.set(String(inm.id), inm);
      if (inm.codigoDomus) {
        map.set(String(inm.codigoDomus), inm);
      }
    }
    return map;
  }, [inmuebles]);

  const filteredClientes = useMemo(() => {
    const now = Date.now();

    return baseClientes.filter((c) => {
      if (quickFilter === "urgentes") {
        const parsedMs = new Date(c.fecha).getTime();
        const ageHours = Number.isNaN(parsedMs) ? 999 : (now - parsedMs) / 3_600_000;
        if (isNuevos) {
          // En Nuevos: leads recientes (< 48h) que requieren primer contacto rápido
          if (ageHours > 48) return false;
        } else {
          // En Seguimiento: seguimiento para hoy/vencido o negocios cerca de cierre (70%+)
          const segUrgente = c.diasSeguimiento !== undefined && c.diasSeguimiento <= 0;
          const altoAvance = (c.porcentaje ?? 0) >= 70;
          if (!segUrgente && !altoAvance && ageHours > 24) return false;
        }
      } else if (quickFilter === "sin-escribir") {
        const cleanTel = (c.telefono || "").replace(/\D/g, "");
        const shortTel = cleanTel.length > 10 ? cleanTel.slice(-10) : cleanTel;
        const yaContactado = Boolean(
          (cleanTel && interacciones[cleanTel]) ||
          (shortTel && interacciones[shortTel])
        );
        if (yaContactado) return false;
      }

      if (!deferredQuery) return true;

      const refKey = String(c.inmuebleInteres || "");
      const inm = inmuebleMap.get(refKey);
      const cleanTel = (c.telefono || "").replace(/\D/g, "");

      return (
        c.nombre.toLowerCase().includes(deferredQuery) ||
        cleanTel.includes(deferredQuery) ||
        refKey.toLowerCase().includes(deferredQuery) ||
        (c.origen || "").toLowerCase().includes(deferredQuery) ||
        Boolean(inm?.barrio?.toLowerCase().includes(deferredQuery)) ||
        Boolean(inm?.titulo?.toLowerCase().includes(deferredQuery)) ||
        Boolean(inm?.tipo?.toLowerCase().includes(deferredQuery))
      );
    });
  }, [baseClientes, quickFilter, isNuevos, interacciones, deferredQuery, inmuebleMap]);

  const gruposOrdenados = useMemo(() => {
    const grupos = new Map<string, Cliente[]>();

    for (const c of filteredClientes) {
      const refStr = String(c.inmuebleInteres || "");
      const hasActiveInmueble =
        refStr && refStr !== "N/A" && inmuebleMap.has(refStr);
      const key = hasActiveInmueble ? refStr : "sin-inmueble";

      const arr = grupos.get(key);
      if (arr) {
        arr.push(c);
      } else {
        grupos.set(key, [c]);
      }
    }

    return Array.from(grupos.entries()).sort(([keyA, a], [keyB, b]) => {
      if (keyA === "sin-inmueble") return 1;
      if (keyB === "sin-inmueble") return -1;
      return b.length - a.length;
    });
  }, [filteredClientes, inmuebleMap]);

  const handleTabChange = (nextTab: "1" | "2") => {
    if (nextTab === activeTab) return;
    setActiveTab(nextTab);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `/clientes?status=${nextTab}`);
    }
  };

  const hasActiveSearchOrFilter = Boolean(deferredQuery || quickFilter !== "todos");

  return (
    <div className="page" style={{ paddingBottom: "100px" }}>
      <div className="header" style={{ paddingBottom: 12 }}>
        <div>
          <h1 className="header-title">Clientes CRM</h1>
          <p className="header-sub">
            {filteredClientes.length > 0
              ? `${filteredClientes.length} contacto${filteredClientes.length !== 1 ? "s" : ""} · ${gruposOrdenados.length} grupo${gruposOrdenados.length !== 1 ? "s" : ""}`
              : "Leads y contactos de portales inmobiliarios."}
          </p>
        </div>
        <RefreshCrmButton status={activeTab} />
      </div>

      {/* Pestañas 0ms */}
      <div style={{ padding: "0 20px 12px" }}>
        <div className="tabs" style={{ padding: 0 }}>
          <button
            type="button"
            onClick={() => handleTabChange("1")}
            className={`tab-pill ${activeTab === "1" ? "active" : ""}`}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <span>Nuevos</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                padding: "1px 7px",
                borderRadius: 999,
                background: activeTab === "1" ? "rgba(255,255,255,0.22)" : "var(--bg-base)",
                color: activeTab === "1" ? "#fff" : "var(--text-secondary)",
              }}
            >
              {nuevos.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("2")}
            className={`tab-pill ${activeTab === "2" ? "active" : ""}`}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <span>Seguimiento</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                padding: "1px 7px",
                borderRadius: 999,
                background: activeTab === "2" ? "rgba(255,255,255,0.22)" : "var(--bg-base)",
                color: activeTab === "2" ? "#fff" : "var(--text-secondary)",
              }}
            >
              {seguimiento.length}
            </span>
          </button>
        </div>
      </div>

      {/* Buscador sticky + filtros rápidos */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 25,
          background: "rgba(248, 249, 250, 0.94)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          padding: "8px 20px 12px",
          marginBottom: 8,
          borderBottom: "1px solid rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ position: "relative", marginBottom: 10 }}>
          <Search
            size={18}
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
              pointerEvents: "none",
            }}
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar cliente, teléfono, barrio o cód..."
            className="form-input"
            style={{
              paddingLeft: 42,
              paddingRight: searchQuery ? 40 : 14,
              fontSize: 16,
              height: 44,
              background: "var(--bg-card)",
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Limpiar búsqueda"
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: "none",
                background: "var(--bg-base)",
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            scrollbarWidth: "none",
          }}
        >
          {(
            [
              { id: "todos", label: "Todos" },
              { id: "urgentes", label: isNuevos ? "Recientes (48h)" : "Hoy / Al cierre" },
              { id: "sin-escribir", label: "Sin escribir WS" },
            ] as const
          ).map((chip) => {
            const active = quickFilter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setQuickFilter(chip.id)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  border: active ? "1px solid var(--red)" : "1px solid var(--border)",
                  background: active ? "var(--red-glow)" : "var(--bg-card)",
                  color: active ? "var(--red)" : "var(--text-secondary)",
                  transition: "all 0.15s ease",
                }}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {filteredClientes.length === 0 ? (
        <div style={{ padding: "0 20px" }}>
          <EmptyState
            icon={hasActiveSearchOrFilter ? <Filter size={44} /> : undefined}
            title={hasActiveSearchOrFilter ? "Sin coincidencias" : "No hay clientes"}
            description={
              hasActiveSearchOrFilter
                ? "Prueba con otro nombre, código o cambia el filtro rápido."
                : "No se encontraron contactos en esta categoría en este momento."
            }
          />
        </div>
      ) : (
        <div className="grid-1">
          {gruposOrdenados.map(([codigo, grupoClientes]) => (
            <InmuebleGroup
              key={`${activeTab}-${codigo}`}
              codigoRef={codigo}
              inmueble={inmuebleMap.get(codigo)}
              clientes={grupoClientes}
              showSeguimiento={!isNuevos}
              interacciones={interacciones}
              forceExpand={hasActiveSearchOrFilter}
            />
          ))}
        </div>
      )}
    </div>
  );
}
