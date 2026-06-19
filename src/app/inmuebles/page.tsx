'use client';
// src/app/inmuebles/page.tsx

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, RefreshCw } from "lucide-react";
import PropCard from "@/components/PropCard";
import type { Inmueble } from "@/types";
import { useInmuebles } from "@/hooks/useInmuebles";
import LoadingState from "@/components/LoadingState";
import EmptyState from "@/components/EmptyState";

export default function InmueblesPage() {
  const router = useRouter();
  const { inmuebles, isLoading, isOffline, mutate } = useInmuebles();
  const [filtered, setFiltered] = useState<Inmueble[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filtros
  const [search, setSearch] = useState("");
  const [filtroGestion, setFiltroGestion] = useState<"todos" | "venta" | "arriendo">("todos");

  useEffect(() => {
    aplicarFiltros();
  }, [inmuebles, search, filtroGestion]);

  const aplicarFiltros = () => {
    let result = inmuebles;
    
    if (filtroGestion !== "todos") {
      result = result.filter(i => i.gestion === filtroGestion);
    }
    
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        i => 
          i.barrio.toLowerCase().includes(q) || 
          i.ciudad.toLowerCase().includes(q) || 
          i.tipo.toLowerCase().includes(q) ||
          i.id.includes(q)
      );
    }
    
    setFiltered(result);
  };

  // Forzar actualización: limpia Redis y pide datos frescos al servidor
  const forceRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Borrar caché Redis del servidor
      await fetch("/api/inmuebles", {
        method: "DELETE",
        headers: { "x-refresh-secret": process.env.NEXT_PUBLIC_REFRESH_SECRET ?? "" },
      });
    } catch { /* si falla, igual pedimos datos frescos */ }

    // Pedir datos frescos al servidor (bypass caché del navegador)
    await mutate(
      fetch("/api/inmuebles", { cache: "no-store" }).then(r => r.json()),
      { revalidate: false }
    );
    setIsRefreshing(false);
  };


  return (
    <div className="page">
      <div className="header" style={{ paddingBottom: 12 }}>
        <div>
          <h1 className="header-title">Catálogo L2L</h1>
          <p className="header-sub">
            {isLoading ? "Cargando..." : `${filtered.length} inmuebles encontrados`}
          </p>
          {!isLoading && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", marginTop: "6px", fontSize: "11px", fontWeight: "600", padding: "3px 10px", borderRadius: "20px", background: isOffline ? "rgba(217,119,6,0.1)" : "rgba(22,163,74,0.1)", color: isOffline ? "#D97706" : "#16a34a" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: isOffline ? "#D97706" : "#16a34a", display: "inline-block" }} />
              {isOffline ? "Modo offline (catálogo guardado)" : "Catálogo sincronizado"}
            </div>
          )}
        </div>
        <button 
          onClick={forceRefresh}
          disabled={isRefreshing || isLoading}
          title="Actualizar catálogo desde Domus"
          style={{ 
            width: 40, height: 40, borderRadius: 20, 
            background: isRefreshing ? "var(--primary)" : "var(--bg-card)",
            display: "flex", 
            alignItems: "center", justifyContent: "center",
            border: "1px solid var(--border)",
            transition: "background 0.2s",
            opacity: (isRefreshing || isLoading) ? 0.7 : 1,
          }}
        >
          <RefreshCw 
            size={20} 
            color={isRefreshing ? "white" : undefined}
            className={(isRefreshing || isLoading) ? "spinner-icon" : ""} 
          />
        </button>
      </div>

      <div style={{ padding: "0 20px 16px" }}>
        <div style={{ position: "relative", marginBottom: 12 }}>
          <Search size={18} style={{ position: "absolute", left: 16, top: 15, color: "var(--text-muted)" }} />
          <input 
            type="text" 
            className="form-input" 
            placeholder="Buscar por barrio, código o ciudad..." 
            style={{ paddingLeft: 44 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="tabs" style={{ padding: 0 }}>
          <button 
            className={`tab-pill ${filtroGestion === "todos" ? "active" : ""}`}
            onClick={() => setFiltroGestion("todos")}
          >
            Todos
          </button>
          <button 
            className={`tab-pill ${filtroGestion === "venta" ? "active" : ""}`}
            onClick={() => setFiltroGestion("venta")}
          >
            Ventas
          </button>
          <button 
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
          filtered.map(inmueble => (
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

      <style dangerouslySetInnerHTML={{ __html: `
        .spinner-icon { animation: spin 1s linear infinite; }
        @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 0.8; } 100% { opacity: 0.5; } }
      `}} />
    </div>
  );
}
