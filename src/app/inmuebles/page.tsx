'use client';
// src/app/inmuebles/page.tsx

import { useState, useMemo, useDeferredValue, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, RefreshCw, X, Building2 } from "lucide-react";
import PropCard from "@/components/PropCard";
import { useInmuebles } from "@/hooks/useInmuebles";
import { useFichaViews } from "@/hooks/useFichaViews";
import LoadingState from "@/components/LoadingState";
import EmptyState from "@/components/EmptyState";
import type { Inmueble } from "@/types";

export default function InmueblesPage() {
  const router = useRouter();
  const { inmuebles, isLoading, isOffline, mutate } = useInmuebles();
  const { views } = useFichaViews();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [filtroGestion, setFiltroGestion] = useState<
    "todos" | "venta" | "arriendo"
  >("todos");

  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const handleOpenFicha = useCallback(
    (inm: Inmueble) => {
      router.push(`/whatsapp?inmueble=${inm.id}`);
    },
    [router]
  );

  const handleOpenReport = useCallback(
    (inm: Inmueble) => {
      router.push(`/informes?inmueble=${inm.id}`);
    },
    [router]
  );

  const filtered = useMemo(() => {
    let result = inmuebles;

    if (filtroGestion !== "todos") {
      result = result.filter((i) => i.gestion === filtroGestion);
    }

    if (deferredSearch) {
      result = result.filter(
        (i) =>
          i.barrio.toLowerCase().includes(deferredSearch) ||
          i.ciudad.toLowerCase().includes(deferredSearch) ||
          i.tipo.toLowerCase().includes(deferredSearch) ||
          (i.titulo || "").toLowerCase().includes(deferredSearch) ||
          String(i.id).toLowerCase().includes(deferredSearch) ||
          String(i.codigoDomus || "").toLowerCase().includes(deferredSearch)
      );
    }

    return result;
  }, [inmuebles, filtroGestion, deferredSearch]);

  // Forzar actualización: limpia Redis (L2L + Domus) y pide datos frescos al servidor
  const forceRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetch("/api/inmuebles", { method: "DELETE" });
    } catch {
      // continuar aún si falla
    }

    try {
      await mutate(
        fetch("/api/inmuebles", { cache: "no-store" }).then((r) => r.json()),
        { revalidate: false }
      );
      toast.success("Catálogo actualizado con éxito");
    } catch {
      toast.error("No se pudo actualizar el catálogo");
    } finally {
      setIsRefreshing(false);
    }
  };

  const busy = isRefreshing || isLoading;

  return (
    <div className="page">
      <div className="header" style={{ paddingBottom: 12 }}>
        <div>
          <h1 className="header-title">Catálogo L2L</h1>
          <p className="header-sub" style={{ fontVariantNumeric: "tabular-nums" }}>
            {isLoading
              ? "Cargando portafolio..."
              : `${filtered.length} ${
                  filtered.length === 1 ? "inmueble disponible" : "inmuebles disponibles"
                }`}
          </p>
          {!isLoading && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginTop: 6,
                fontSize: 11.5,
                fontWeight: 600,
                padding: "3px 10px",
                borderRadius: 999,
                background: isOffline
                  ? "rgba(217, 119, 6, 0.1)"
                  : "rgba(22, 163, 74, 0.1)",
                color: isOffline ? "#D97706" : "#16a34a",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: isOffline ? "#D97706" : "#16a34a",
                  display: "inline-block",
                }}
              />
              {isOffline ? "Modo offline (catálogo guardado)" : "Catálogo sincronizado"}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={forceRefresh}
          disabled={busy}
          title="Actualizar catálogo"
          aria-label="Actualizar catálogo"
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            background: isRefreshing ? "var(--red)" : "var(--bg-card)",
            color: isRefreshing ? "#fff" : "var(--text-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid var(--border)",
            transition: "all 0.2s",
            cursor: busy ? "default" : "pointer",
            flexShrink: 0,
          }}
        >
          <RefreshCw
            size={19}
            color={isRefreshing ? "#fff" : "var(--text-primary)"}
            style={{ animation: busy ? "spin 1s linear infinite" : "none" }}
          />
        </button>
      </div>

      {/* Barra de búsqueda rápida + Pestañas de gestión */}
      <div
        style={{
          padding: "0 20px 18px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div style={{ position: "relative", flex: "1 1 260px", minWidth: 0 }}>
          <Search
            size={18}
            style={{
              position: "absolute",
              left: 15,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
              pointerEvents: "none",
            }}
          />
          <input
            type="search"
            className="form-input"
            placeholder="Filtrar por barrio, código o tipo..."
            style={{
              paddingLeft: 42,
              paddingRight: search ? 40 : 14,
              fontSize: 15.5,
            }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Limpiar búsqueda"
              style={{
                position: "absolute",
                right: 10,
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

        <div className="tabs" style={{ padding: 0, flexShrink: 0 }}>
          <button
            type="button"
            className={`tab-pill ${filtroGestion === "todos" ? "active" : ""}`}
            onClick={() => setFiltroGestion("todos")}
          >
            Todos
          </button>
          <button
            type="button"
            className={`tab-pill ${filtroGestion === "venta" ? "active" : ""}`}
            onClick={() => setFiltroGestion("venta")}
          >
            En Venta
          </button>
          <button
            type="button"
            className={`tab-pill ${filtroGestion === "arriendo" ? "active" : ""}`}
            onClick={() => setFiltroGestion("arriendo")}
          >
            En Arriendo
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingState text="Cargando catálogo..." />
      ) : filtered.length > 0 ? (
        <div className="catalog-grid">
          {filtered.map((inm) => (
            <PropCard
              key={inm.id}
              inmueble={inm}
              viewsCount={views[inm.id] ?? 0}
              onClick={handleOpenFicha}
              onReportClick={handleOpenReport}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Building2 size={46} />}
          title="Sin inmuebles para este filtro"
          description="Prueba ajustando el término de búsqueda o cambiando el tipo de gestión."
        />
      )}
    </div>
  );
}
