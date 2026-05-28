'use client';
// src/app/whatsapp/page.tsx

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, CheckCircle, Copy, Link as LinkIcon, RefreshCw } from "lucide-react";
import PropCard from "@/components/PropCard";
import type { Inmueble } from "@/types";
import { generarMensajeWS, generarLinkWS } from "@/lib/mensajes";
import { AGENTE_PATRICIA } from "@/lib/agente";

function WhatsAppContent() {
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get("inmueble");
  
  const [inmuebles, setInmuebles] = useState<Inmueble[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(preselectedId);
  const [nombreCliente, setNombreCliente] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchInmuebles();
  }, []);

  const fetchInmuebles = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/inmuebles");
      const data = await res.json();
      setInmuebles(data.inmuebles || []);
      if (!selectedId && data.inmuebles && data.inmuebles.length > 0) {
        setSelectedId(data.inmuebles[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedInmueble = inmuebles.find((i) => i.id === selectedId);

  const mensajeActual = selectedInmueble
    ? generarMensajeWS({
        inmueble: selectedInmueble,
        nombreCliente,
        incluirSaludo: true,
        incluirLink: true,
      })
    : "";

  const handleCopy = async () => {
    if (!mensajeActual) return;
    try {
      await navigator.clipboard.writeText(mensajeActual);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy", e);
    }
  };

  const handleOpenWS = () => {
    if (!mensajeActual) return;
    const url = generarLinkWS(AGENTE_PATRICIA.telefonoWS, mensajeActual);
    window.open(url, "_blank");
  };

  return (
    <div className="page" style={{ paddingBottom: 100 }}>
      <div className="header">
        <div>
          <h1 className="header-title">Ficha WhatsApp</h1>
          <p className="header-sub">Genera y envía fichas de inmuebles rápido</p>
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: 20, textAlign: "center" }}>
          <RefreshCw size={24} className="spinner-icon" style={{ margin: "0 auto" }} />
          <p style={{ marginTop: 10, color: "var(--text-secondary)" }}>Cargando inmuebles...</p>
        </div>
      ) : inmuebles.length > 0 ? (
        <>
          {/* Selector de Inmueble (Scroll Horizontal) */}
          <div style={{ marginBottom: 16 }}>
            <div className="form-label" style={{ padding: "0 20px" }}>1. Selecciona el inmueble</div>
            <div className="h-scroll" style={{ paddingBottom: 10 }}>
              {inmuebles.map((inm) => (
                <div 
                  key={inm.id} 
                  style={{ 
                    position: "relative",
                    opacity: selectedId === inm.id ? 1 : 0.5,
                    transform: selectedId === inm.id ? "scale(1)" : "scale(0.95)",
                    transition: "all 0.2s"
                  }}
                >
                  <PropCard 
                    inmueble={inm} 
                    compact 
                    onClick={() => setSelectedId(inm.id)} 
                  />
                  {selectedId === inm.id && (
                    <div style={{ 
                      position: "absolute", top: -8, right: -8, 
                      background: "var(--red)", borderRadius: "50%", padding: 4,
                      zIndex: 10, border: "2px solid var(--bg-base)"
                    }}>
                      <CheckCircle size={16} color="#fff" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: "0 20px" }}>
            {/* Nombre del Cliente */}
            <div className="form-group">
              <label className="form-label">2. Nombre del cliente (opcional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej. Camilo"
                value={nombreCliente}
                onChange={(e) => setNombreCliente(e.target.value)}
              />
            </div>

            {/* Vista Previa */}
            <div className="form-group">
              <label className="form-label">3. Vista previa del mensaje</label>
              <motion.div 
                className="msg-preview"
                key={selectedId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {mensajeActual}
              </motion.div>
            </div>

            {/* Botones */}
            <div className="grid-2" style={{ padding: 0, marginTop: 24 }}>
              <button className="btn-secondary" onClick={handleCopy}>
                {copied ? <CheckCircle size={18} color="#4ADE80" /> : <Copy size={18} />}
                {copied ? "¡Copiado!" : "Copiar"}
              </button>
              <button className="btn-ws" onClick={handleOpenWS}>
                <MessageCircle size={18} />
                Enviar WhatsApp
              </button>
            </div>
            
            {selectedInmueble?.urlDomus && (
               <button 
                className="btn-secondary" 
                style={{ marginTop: 14 }}
                onClick={() => {
                  navigator.clipboard.writeText(selectedInmueble.urlDomus!);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
               >
                 <LinkIcon size={18} />
                 Copiar solo Link Domus
               </button>
            )}
          </div>
        </>
      ) : (
        <div className="empty-state">No hay inmuebles disponibles.</div>
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

export default function WhatsAppPage() {
  return (
    <Suspense fallback={<div className="page"><div className="header">Cargando...</div></div>}>
      <WhatsAppContent />
    </Suspense>
  );
}
