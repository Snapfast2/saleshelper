'use client';
// src/app/whatsapp/page.tsx

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, CheckCircle, Copy, Link as LinkIcon, User, ExternalLink } from "lucide-react";
import PropCard from "@/components/PropCard";
import type { Inmueble } from "@/types";
import { generarMensajeWS, generarLinkWS } from "@/lib/mensajes";
import { useInmuebles } from "@/hooks/useInmuebles";
import LoadingState from "@/components/LoadingState";
import EmptyState from "@/components/EmptyState";

function WhatsAppContent() {
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get("inmueble");
  const clienteParam = searchParams.get("cliente") || "";
  const telefonoParam = searchParams.get("telefono") || "";

  const { inmuebles, isLoading } = useInmuebles();

  // Intentamos encontrar el inmueble por código Domus (inmuebleInteres) o por id
  const findInmueble = (id: string | null) => {
    if (!id) return undefined;
    return (
      inmuebles.find((i) => i.id === id) ||
      inmuebles.find((i) => i.codigoDomus === id) ||
      inmuebles.find((i) => i.id.includes(id) || id.includes(i.id))
    );
  };

  const [selectedId, setSelectedId] = useState<string | null>(preselectedId);
  const [nombreCliente, setNombreCliente] = useState(clienteParam);
  const [copied, setCopied] = useState(false);
  const [copiedFicha, setCopiedFicha] = useState(false);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!selectedId && inmuebles && inmuebles.length > 0) {
      setSelectedId(inmuebles[0].id);
    }
  }, [inmuebles, selectedId]);

  // Auto-scroll la card seleccionada al centro cuando cambia selectedId
  useEffect(() => {
    if (!selectedId) return;
    const el = cardRefs.current[selectedId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [selectedId, inmuebles]);

  // Pre-carry client name from params
  useEffect(() => {
    if (clienteParam && !nombreCliente) {
      setNombreCliente(clienteParam);
    }
  }, [clienteParam]);

  const selectedInmueble = findInmueble(selectedId) || inmuebles.find((i) => i.id === selectedId);

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
    // Si viene el teléfono del cliente, se lo enviamos a él; si no, al de Patricia
    const destinoTel = telefonoParam || "";
    const url = generarLinkWS(destinoTel, mensajeActual);
    window.open(url, "_blank");
  };

  const tieneClienteDestino = Boolean(telefonoParam);

  return (
    <div className="page" style={{ paddingBottom: 100 }}>
      <div className="header">
        <div>
          <h1 className="header-title">Ficha WhatsApp</h1>
          <p className="header-sub">Genera y envía fichas de inmuebles rápido</p>
        </div>
      </div>

      {/* Banner cliente pre-seleccionado */}
      {(clienteParam || telefonoParam) && (
        <div style={{ margin: "0 20px 16px", padding: "12px 16px", borderRadius: "12px", background: "rgba(196,30,58,0.06)", border: "1px solid var(--border-red)", display: "flex", alignItems: "center", gap: "10px" }}>
          <User size={18} color="var(--red)" />
          <div>
            <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)" }}>
              {clienteParam ? `Respondiendo a: ${clienteParam}` : "Cliente seleccionado"}
            </div>
            {telefonoParam && (
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                WhatsApp irá directamente a: +{telefonoParam}
              </div>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <LoadingState text="Cargando inmuebles..." />
      ) : inmuebles.length > 0 ? (
        <>
          {/* Selector de Inmueble (Scroll Horizontal) */}
          <div style={{ marginBottom: 16 }}>
            <div className="form-label" style={{ padding: "0 20px" }}>1. Selecciona el inmueble</div>
            <div className="h-scroll" style={{ paddingBottom: 10 }}>
              {inmuebles.map((inm) => (
                <div
                  key={inm.id}
                  ref={(el) => { cardRefs.current[inm.id] = el; }}
                  style={{
                    position: "relative",
                    opacity: selectedId === inm.id || (selectedId && inm.codigoDomus === selectedId) ? 1 : 0.5,
                    transform: selectedId === inm.id || (selectedId && inm.codigoDomus === selectedId) ? "scale(1)" : "scale(0.95)",
                    transition: "all 0.2s",
                  }}
                >
                  <PropCard
                    inmueble={inm}
                    compact
                    onClick={() => setSelectedId(inm.id)}
                  />
                  {(selectedId === inm.id || (selectedId && inm.codigoDomus === selectedId)) && (
                    <div style={{ position: "absolute", top: -8, right: -8, background: "var(--red)", borderRadius: "50%", padding: 4, zIndex: 10, border: "2px solid var(--bg-base)" }}>
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
              <label className="form-label" style={{ fontWeight: 600 }}>2. Nombre del cliente (opcional)</label>
              <input
                type="text"
                style={{
                  width: "100%", padding: "14px 16px", borderRadius: "12px",
                  background: "var(--bg-card)", border: "1px solid var(--border)",
                  color: "var(--text-primary)", fontSize: "15px", outline: "none",
                  transition: "all 0.2s"
                }}
                onFocus={(e) => e.target.style.borderColor = "var(--red)"}
                onBlur={(e) => e.target.style.borderColor = "var(--border)"}
                placeholder="Ej. Juan (o déjalo vacío)"
                value={nombreCliente}
                onChange={(e) => setNombreCliente(e.target.value)}
              />
            </div>

            {/* Vista Previa */}
            <div className="form-group" style={{ marginTop: 20 }}>
              <label className="form-label" style={{ fontWeight: 600, marginBottom: 12 }}>3. Vista previa del mensaje</label>
              <div style={{ padding: "0 8px" }}>
                <motion.div
                  key={selectedId + nombreCliente}
                  initial={{ opacity: 0, scale: 0.95, transformOrigin: "top left" }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    background: "#005c4b",
                    color: "#e9edef",
                    padding: "12px 14px",
                    borderRadius: "0 8px 8px 8px",
                    fontSize: "15px",
                    lineHeight: "1.4",
                    whiteSpace: "pre-wrap",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    position: "relative",
                  }}
                >
                  <div style={{
                    position: "absolute",
                    top: 0, left: -8, width: 0, height: 0,
                    borderRight: "8px solid #005c4b",
                    borderBottom: "10px solid transparent"
                  }} />
                  {mensajeActual}
                </motion.div>
              </div>
            </div>

            {/* Botones de Acción Principales */}
            <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
              <motion.button 
                whileTap={{ scale: 0.96 }}
                style={{
                  flex: 1, padding: "14px", borderRadius: "12px", background: "#25D366", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  fontWeight: "bold", border: "none", boxShadow: "0 4px 12px rgba(37, 211, 102, 0.3)",
                  fontSize: "15px"
                }}
                onClick={handleOpenWS}
              >
                <MessageCircle size={20} fill="#fff" />
                {tieneClienteDestino ? `Enviar a ${clienteParam.split(" ")[0] || "Cliente"}` : "Enviar WhatsApp"}
              </motion.button>
              
              <motion.button 
                whileTap={{ scale: 0.96 }}
                style={{
                  padding: "14px 20px", borderRadius: "12px", background: "var(--bg-card)", color: "var(--text-primary)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  fontWeight: "bold", border: "1px solid var(--border)"
                }}
                onClick={handleCopy}
              >
                {copied ? <CheckCircle size={20} color="#4ADE80" /> : <Copy size={20} />}
              </motion.button>
            </div>

            {/* Links Secundarios */}
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              {selectedInmueble?.urlL2L && (
                <button
                  style={{
                    flex: 1, padding: "12px", borderRadius: "10px", background: "transparent", color: "var(--text-secondary)",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                    fontWeight: 600, border: "1px solid var(--border)", fontSize: "13px"
                  }}
                  onClick={async () => {
                    const fichaUrl = `${window.location.origin}/ficha/${selectedInmueble.id}`;
                    await navigator.clipboard.writeText(fichaUrl);
                    setCopiedFicha(true);
                    setTimeout(() => setCopiedFicha(false), 2500);
                  }}
                >
                  {copiedFicha ? <CheckCircle size={16} color="#4ADE80" /> : <ExternalLink size={16} />}
                  {copiedFicha ? "Ficha copiada" : "Link de ficha (web)"}
                </button>
              )}

              {selectedInmueble?.urlDomus && (
                <button
                  style={{
                    flex: 1, padding: "12px", borderRadius: "10px", background: "transparent", color: "var(--text-secondary)",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                    fontWeight: 600, border: "1px dashed var(--border)", fontSize: "13px"
                  }}
                  onClick={() => {
                    navigator.clipboard.writeText(selectedInmueble.urlDomus!);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  <LinkIcon size={16} />
                  Link original L2L
                </button>
              )}
            </div>
          </div>
        </>
      ) : (
        <EmptyState
          title="Sin inmuebles"
          description="No hay inmuebles disponibles para generar fichas."
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
