'use client';
// src/app/redes/page.tsx

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Share, Image as ImageIcon, Copy, CheckCircle, RefreshCw } from "lucide-react";
import type { Inmueble } from "@/types";
import { generarPostRedes } from "@/lib/mensajes";
import { AGENTE_PATRICIA } from "@/lib/agente";
import { useInmuebles } from "@/hooks/useInmuebles";
import LoadingState from "@/components/LoadingState";
import EmptyState from "@/components/EmptyState";

export default function RedesPage() {
  const router = useRouter();
  const { inmuebles, isLoading } = useInmuebles();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [red, setRed] = useState<"facebook" | "instagram">("facebook");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!selectedId && inmuebles && inmuebles.length > 0) {
      setSelectedId(inmuebles[0].id);
    }
  }, [inmuebles, selectedId]);

  const selectedInmueble = inmuebles.find((i) => i.id === selectedId);

  const postActual = selectedInmueble
    ? generarPostRedes(selectedInmueble, red)
    : "";

  const handleCopy = async () => {
    if (!postActual) return;
    try {
      await navigator.clipboard.writeText(postActual);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy", e);
    }
  };

  const handleOpenApp = () => {
    if (red === "facebook") {
      // Intentar abrir la app de Facebook (fb://) o fallback a web
      window.open("https://www.facebook.com/", "_blank");
    } else {
      // Intentar abrir la app de Instagram (instagram://) o fallback a web
      window.open("https://www.instagram.com/", "_blank");
    }
  };

  return (
    <div className="page" style={{ paddingBottom: 100 }}>
      <div className="header">
        <div>
          <h1 className="header-title">Publicar Post</h1>
          <p className="header-sub">Genera el texto para tus redes sociales</p>
        </div>
      </div>

      {isLoading ? (
        <LoadingState text="Cargando inmuebles..." />
      ) : inmuebles.length > 0 ? (
        <>
          <div style={{ padding: "0 20px" }}>
            {/* Selección de Red Social */}
            <div className="grid-2" style={{ padding: 0, marginBottom: 24 }}>
              <button 
                className={`btn-secondary ${red === "facebook" ? "active" : ""}`}
                style={{ 
                  borderColor: red === "facebook" ? "#1877F2" : "var(--border)",
                  background: red === "facebook" ? "rgba(24, 119, 242, 0.1)" : "transparent"
                }}
                onClick={() => setRed("facebook")}
              >
                <Share size={18} color={red === "facebook" ? "#1877F2" : "var(--text-secondary)"} />
                Facebook
              </button>
              <button 
                className={`btn-secondary ${red === "instagram" ? "active" : ""}`}
                style={{ 
                  borderColor: red === "instagram" ? "#E1306C" : "var(--border)",
                  background: red === "instagram" ? "rgba(225, 48, 108, 0.1)" : "transparent"
                }}
                onClick={() => setRed("instagram")}
              >
                <ImageIcon size={18} color={red === "instagram" ? "#E1306C" : "var(--text-secondary)"} />
                Instagram
              </button>
            </div>

            {/* Selector de Inmueble (Select nativo) */}
            <div className="form-group">
              <label className="form-label">1. Selecciona el inmueble</label>
              <select 
                className="form-input" 
                value={selectedId || ""} 
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {inmuebles.map(inm => (
                  <option key={inm.id} value={inm.id}>
                    {inm.tipo} {inm.gestion} - {inm.barrio} (${(inm.precio/1000000).toFixed(0)}M)
                  </option>
                ))}
              </select>
            </div>

            {/* Imagen del Inmueble (preview) */}
            {selectedInmueble && (
              <div style={{ marginBottom: 20 }}>
                <label className="form-label">2. Descarga la foto (si la necesitas)</label>
                <div style={{ position: "relative", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                  <img 
                    src={selectedInmueble.imagen} 
                    alt={selectedInmueble.titulo} 
                    style={{ width: "100%", height: 200, objectFit: "cover" }}
                  />
                  <a 
                    href={selectedInmueble.imagen}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary"
                    style={{ position: "absolute", bottom: 10, right: 10, width: "auto", padding: "8px 16px", background: "rgba(0,0,0,0.7)", border: "none", backdropFilter: "blur(10px)" }}
                  >
                    Abrir Foto Original
                  </a>
                </div>
              </div>
            )}

            {/* Vista Previa Texto */}
            <div className="form-group">
              <label className="form-label">3. Copia el texto para el post</label>
              <motion.div 
                className="msg-preview"
                key={`${selectedId}-${red}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ 
                  background: "var(--bg-input)", 
                  borderColor: "var(--border)",
                  userSelect: "all" 
                }}
              >
                {postActual}
              </motion.div>
            </div>

            {/* Botones */}
            <div className="grid-2" style={{ padding: 0, marginTop: 24 }}>
              <button className="btn-secondary" onClick={handleCopy}>
                {copied ? <CheckCircle size={18} color="#4ADE80" /> : <Copy size={18} />}
                {copied ? "¡Copiado!" : "Copiar Texto"}
              </button>
              <button 
                className={red === "facebook" ? "btn-fb" : "btn-ig"} 
                onClick={handleOpenApp}
              >
                {red === "facebook" ? <Share size={18} /> : <ImageIcon size={18} />}
                Abrir App
              </button>
            </div>
          </div>
        </>
      ) : (
        <EmptyState 
          title="Sin inmuebles"
          description="No hay inmuebles disponibles para generar posts."
        />
      )}

      {/* Toast */}
      <AnimatePresence>
        {copied && (
          <motion.div 
            className="toast success"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <CheckCircle size={16} /> ¡Copiado al portapapeles!
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .spinner-icon { animation: spin 1s linear infinite; }
      `}} />
    </div>
  );
}
