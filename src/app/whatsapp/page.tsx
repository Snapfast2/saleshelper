'use client';
// src/app/whatsapp/page.tsx

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, CheckCircle, Copy, Link as LinkIcon, User } from "lucide-react";
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

  useEffect(() => {
    if (!selectedId && inmuebles && inmuebles.length > 0) {
      setSelectedId(inmuebles[0].id);
    }
  }, [inmuebles, selectedId]);

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
              <label className="form-label">2. Nombre del cliente</label>
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
                {tieneClienteDestino ? `Enviar a ${clienteParam.split(" ")[0] || "Cliente"}` : "Enviar WhatsApp"}
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
