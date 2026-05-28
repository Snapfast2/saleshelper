'use client';
// src/app/inmuebles/page.tsx

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, RefreshCw } from "lucide-react";
import PropCard from "@/components/PropCard";
import type { Inmueble } from "@/types";

export default function InmueblesPage() {
  const router = useRouter();
  const [inmuebles, setInmuebles] = useState<Inmueble[]>([]);
  const [filtered, setFiltered] = useState<Inmueble[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filtros
  const [search, setSearch] = useState("");
  const [filtroGestion, setFiltroGestion] = useState<"todos" | "venta" | "arriendo">("todos");

  useEffect(() => {
    fetchInmuebles();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [inmuebles, search, filtroGestion]);

  const fetchInmuebles = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/inmuebles");
      const data = await res.json();
      setInmuebles(data.inmuebles || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

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

  return (
    <div className="page">
      <div className="header" style={{ paddingBottom: 12 }}>
        <div>
          <h1 className="header-title">Catálogo L2L</h1>
          <p className="header-sub">
            {isLoading ? "Cargando..." : `${filtered.length} inmuebles encontrados`}
          </p>
        </div>
        <button 
          onClick={fetchInmuebles}
          style={{ 
            width: 40, height: 40, borderRadius: 20, 
            background: "var(--bg-card)", display: "flex", 
            alignItems: "center", justifyContent: "center",
            border: "1px solid var(--border)"
          }}
        >
          <RefreshCw size={20} className={isLoading ? "spinner-icon" : ""} />
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
          [1, 2, 3, 4].map(i => (
            <div key={i} className="card" style={{ height: 280, animation: "pulse 1.5s infinite" }} />
          ))
        ) : filtered.length > 0 ? (
          filtered.map(inmueble => (
            <PropCard 
              key={inmueble.id} 
              inmueble={inmueble} 
              onClick={() => router.push(`/whatsapp?inmueble=${inmueble.id}`)}
            />
          ))
        ) : (
          <div className="empty-state">
            <Filter size={48} color="var(--text-muted)" />
            <div className="empty-title">No hay resultados</div>
            <div className="empty-sub">Intenta cambiar los filtros o el término de búsqueda.</div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .spinner-icon { animation: spin 1s linear infinite; }
        @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 0.8; } 100% { opacity: 0.5; } }
      `}} />
    </div>
  );
}
