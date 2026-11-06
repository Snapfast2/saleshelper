'use client';
// src/components/ClientesView.tsx
// Vista interactiva instantánea (0ms entre pestañas) con búsqueda diferida, chips rápidos y grilla B2B adaptable

import { useState, useMemo, useDeferredValue } from "react";
import { Search, X, Users, SearchX, AlertTriangle, Clock } from "lucide-react";
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
  warning?: string;
  fromCache?: boolean;
  fetchedAt?: string;
}

type QuickFilter = "todos" | "urgentes" | "sin-escribir";

export default function ClientesView({
  initialStatus,
  nuevos,
  seguimiento,
  inmuebles,
  warning,
  fromCache,
  fetchedAt,
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
          if (ageHours > 48) return false;
        } else {
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

  const limpiarFiltros = () => {
    setSearchQuery("");
    setQuickFilter("todos");
  };

  const hasActiveSearchOrFilter = Boolean(deferredQuery || quickFilter !== "todos");

  return (
    <div className="page" style={{ paddingBottom: "100px" }}>
      <div className="header" style={{ paddingBottom: 12 }}>
        <div>
          <h1 className="header-title">Clientes CRM</h1>
          <p className="header-sub" style={{ fontVariantNumeric: "tabular-nums" }}>
            {filteredClientes.length > 0
              ? `${filteredClientes.length} contacto${filteredClientes.length !== 1 ? "s" : ""} · ${gruposOrdenados.length} inmueble${gruposOrdenados.length !== 1 ? "s" : ""}`
              : "Leads y contactos de portales inmobiliarios"}
          </p>
        </div>
        <RefreshCrmButton status={activeTab} />
      </div>

      {/* Aviso opcional si viene desde caché de respaldo o con advertencia */}
      {warning && (
        <div style={{ padding: "0 20px 12px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              borderRadius: 12,
              background: "rgba(217, 119, 6, 0.08)",
              border: "1px solid rgba(217, 119, 6, 0.25)",
              color: "#b45309",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <AlertTriangle size={16} color="#d97706" style={{ flexShrink: 0 }} />
            <span>{warning}</span>
          </div>
        </div>
      )}

      {fromCache && fetchedAt && !warning && (
        <div style={{ padding: "0 20px 10px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-muted)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <Clock size={13} />
            <span>
              Sincronizado{" "}
              {new Date(fetchedAt).toLocaleTimeString("es-CO", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })}
            </span>
          </div>
        </div>
      )}

      {/* Barra sticky: Pestañas segmentadas 0ms + Buscador + Filtros rápidos */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 25,
          background: "rgba(249, 250, 251, 0.94)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          padding: "8px 20px 12px",
          marginBottom: 14,
          borderBottom: "1px solid var(--border)",
        }}
      >
        {/* Control segmentado Nuevos / En seguimiento */}
        <div
          role="tablist"
          aria-label="Etapas del CRM"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 4,
            padding: 4,
            borderRadius: 12,
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            marginBottom: 10,
          }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "1"}
            onClick={() => handleTabChange("1")}
            style={{
              minHeight: 38,
              padding: "6px 10px",
              borderRadius: 9,
              border: "none",
              background: activeTab === "1" ? "var(--red)" : "transparent",
              color: activeTab === "1" ? "#FFFFFF" : "var(--text-secondary)",
              fontSize: 14,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              cursor: "pointer",
              transition: "background 0.16s ease, color 0.16s ease",
            }}
          >
            <span>Nuevos</span>
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 800,
                padding: "1px 7px",
                borderRadius: 999,
                fontVariantNumeric: "tabular-nums",
                background: activeTab === "1" ? "rgba(255,255,255,0.22)" : "var(--bg-base)",
                color: activeTab === "1" ? "#FFFFFF" : "var(--text-secondary)",
                border: activeTab === "1" ? "none" : "1px solid var(--border)",
              }}
            >
              {nuevos.length}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "2"}
            onClick={() => handleTabChange("2")}
            style={{
              minHeight: 38,
              padding: "6px 10px",
              borderRadius: 9,
              border: "none",
              background: activeTab === "2" ? "var(--red)" : "transparent",
              color: activeTab === "2" ? "#FFFFFF" : "var(--text-secondary)",
              fontSize: 14,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              cursor: "pointer",
              transition: "background 0.16s ease, color 0.16s ease",
            }}
          >
            <span>En seguimiento</span>
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 800,
                padding: "1px 7px",
                borderRadius: 999,
                fontVariantNumeric: "tabular-nums",
                background: activeTab === "2" ? "rgba(255,255,255,0.22)" : "var(--bg-base)",
                color: activeTab === "2" ? "#FFFFFF" : "var(--text-secondary)",
                border: activeTab === "2" ? "none" : "1px solid var(--border)",
              }}
            >
              {seguimiento.length}
            </span>
          </button>
        </div>

        {/* Buscador instantáneo con botón X de 1 toque */}
        <div style={{ position: "relative", marginBottom: 10 }}>
          <Search
            size={17}
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
            type="text"
            inputMode="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar cliente, teléfono, barrio o cód..."
            className="form-input"
            style={{
              paddingLeft: 40,
              paddingRight: searchQuery.length > 0 ? 42 : 14,
              fontSize: 15.5,
              height: 44,
              background: "var(--bg-card)",
            }}
          />
          {searchQuery.length > 0 && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Limpiar búsqueda"
              style={{
                position: "absolute",
                right: 6,
                top: "50%",
                transform: "translateY(-50%)",
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: "1px solid var(--border)",
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

        {/* Chips de filtro rápido */}
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
                className={`quick-chip ${active ? "active" : ""}`}
                style={{
                  minHeight: 34,
                  padding: "5px 12px",
                  fontSize: 12.5,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
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
            icon={
              hasActiveSearchOrFilter ? (
                <SearchX size={42} color="var(--text-muted)" />
              ) : (
                <Users size={42} color="var(--text-muted)" />
              )
            }
            title={hasActiveSearchOrFilter ? "Sin coincidencias" : "No hay clientes en esta etapa"}
            description={
              hasActiveSearchOrFilter
                ? "Prueba con otro nombre, teléfono o código, o limpia el filtro activo."
                : "No se encontraron contactos registrados en esta categoría por ahora."
            }
          />
          {hasActiveSearchOrFilter && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: -24 }}>
              <button
                type="button"
                onClick={limpiarFiltros}
                className="btn-secondary"
                style={{ width: "auto", minHeight: 42, padding: "8px 18px", fontSize: 14 }}
              >
                <X size={15} />
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: "0 20px" }}>
          <div className="crm-grid">
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
        </div>
      )}
    </div>
  );
}
