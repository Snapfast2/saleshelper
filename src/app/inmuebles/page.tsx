'use client';
// src/app/inmuebles/page.tsx

import { useState, useMemo, useDeferredValue } from "react";
import { useRouter } from "next/navigation";
import { Search, Filter, RefreshCw, X } from "lucide-react";
import PropCard from "@/components/PropCard";
import { useInmuebles } from "@/hooks/useInmuebles";
import LoadingState from "@/components/LoadingState";
import EmptyState from "@/components/EmptyState";

export default function InmueblesPage() {
  const router = useRouter();
  const { inmuebles, isLoading, isOffline, mutate } = useInmuebles();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [filtroGestion, setFiltroGestion] = useState<"todos" | "venta" | "arriendo">("todos");

  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

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
          <p className="header-sub">
            {isLoading ? "Cargando..." : `${filtered.length} inmuebles encontrados`}
          </p>
          {!isLoading && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                marginTop: "6px",
                fontSize: "11px",
                fontWeight: "600",
                padding: "3px 10px",
                borderRadius: "20px",
                background: isOffline ? "rgba(217,119,6,0.1)" : "rgba(22,163,74,0.1)",
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
            width: 40,
            height: 40,
            borderRadius: 20,
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

      <div style={{ padding: "0 20px 16px" }}>
        <div style={{ position: "relative", marginBottom: 12 }}>
          <Search
            size={18}
            style={{
              position: "absolute",
              left: 16,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
              pointerEvents: "none",
            }}
          />
          <input
            type="search"
            className="form-input"
            placeholder="Buscar por barrio, código o ciudad..."
            style={{
              paddingLeft: 44,
              paddingRight: search ? 40 : 14,
              fontSize: 16,
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

        <div className="tabs" style={{ padding: 0 }}>
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
            Ventas
          </button>
          <button
            type="button"
            className={`tab-pill ${filtroGestion === "arriendo" ? "active" : ""}`}
            onClick={() => setFiltroGestion("arriendo")}
          >
            Arriendos
          </button>
        </div>
      </div>

      <div className="grid-1">
        {isLoading ? (
          <LoadingState text="Cargando catálogo..." />
        ) : filtered.length > 0 ? (
          filtered.map((inmueble) => (
            <PropCard
              key={inmueble.id}
              inmueble={inmueble}
              onClick={() => router.push(`/whatsapp?inmueble=${inmueble.id}`)}
            />
          ))
        ) : (
          <EmptyState
            icon={<Filter size={48} />}
            title="No hay resultados"
            description="Intenta cambiar los filtros o el término de búsqueda."
          />
        )}
      </div>
    </div>
  );
}
