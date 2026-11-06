'use client';
// src/app/whatsapp/page.tsx

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  MessageCircle,
  Copy,
  Link as LinkIcon,
  User,
  ExternalLink,
  Building2,
} from "lucide-react";
import PropertyPickerDrawer from "@/components/PropertyPickerDrawer";
import EmptyState from "@/components/EmptyState";
import { generarMensajeWS, generarLinkWS } from "@/lib/mensajes";
import { registrarInteraccionWS } from "@/lib/interacciones";
import { useInmuebles } from "@/hooks/useInmuebles";
import { useFichaViews } from "@/hooks/useFichaViews";

function WhatsAppContent() {
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get("inmueble");
  const clienteParam = searchParams.get("cliente") || "";
  const telefonoParam = searchParams.get("telefono") || "";

  const { inmuebles, isLoading } = useInmuebles();
  const { views } = useFichaViews();

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

  useEffect(() => {
    if (!selectedId && inmuebles.length > 0) {
      setSelectedId(inmuebles[0].id);
    }
  }, [inmuebles, selectedId]);

  useEffect(() => {
    if (clienteParam && !nombreCliente) {
      setNombreCliente(clienteParam);
    }
  }, [clienteParam, nombreCliente]);

  const inmuebleActual =
    findInmueble(selectedId) ||
    inmuebles.find((i) => i.id === selectedId) ||
    inmuebles[0] ||
    null;

  const mensajeActual = inmuebleActual
    ? generarMensajeWS({
        inmueble: inmuebleActual,
        nombreCliente,
        incluirSaludo: true,
        incluirLink: true,
      })
    : "";

  const handleCopy = async () => {
    if (!mensajeActual) return;
    try {
      await navigator.clipboard.writeText(mensajeActual);
      toast.success("Mensaje copiado · Listo para pegar en WhatsApp");
    } catch {
      toast.error("No se pudo copiar al portapapeles");
    }
  };

  const handleCopyFicha = async () => {
    if (!inmuebleActual) return;
    try {
      const fichaUrl = `${window.location.origin}/ficha/${inmuebleActual.id}`;
      await navigator.clipboard.writeText(fichaUrl);
      toast.success("Link de ficha copiado · Rastreo de vistas activo");
    } catch {
      toast.error("No se pudo copiar el link de ficha");
    }
  };

  const handleCopyOriginal = async () => {
    const originalUrl = inmuebleActual?.urlDomus || inmuebleActual?.urlL2L;
    if (!originalUrl) return;
    try {
      await navigator.clipboard.writeText(originalUrl);
      toast.success("Link original L2L copiado al portapapeles");
    } catch {
      toast.error("No se pudo copiar el link");
    }
  };

  const handleOpenWS = () => {
    if (!mensajeActual) return;
    const destinoTel = telefonoParam || "";
    if (destinoTel || nombreCliente.trim()) {
      registrarInteraccionWS(
        {
          nombre: nombreCliente.trim() || clienteParam || "Cliente",
          telefono: destinoTel,
          telefonoIndicativo: "+57",
        },
        inmuebleActual ?? undefined,
        "Ficha WhatsApp"
      );
    }
    const url = generarLinkWS(destinoTel, mensajeActual);
    window.open(url, "_blank");
  };

  const tieneClienteDestino = Boolean(telefonoParam);

  return (
    <div className="page" style={{ paddingBottom: 100, maxWidth: 760 }}>
      <div className="header">
        <div>
          <h1 className="header-title">Ficha WhatsApp</h1>
          <p className="header-sub">
            Genera y envía fichas comerciales personalizadas en segundos
          </p>
        </div>
      </div>

      {/* Banner cliente pre-seleccionado */}
      {(clienteParam || telefonoParam) && (
        <div
          style={{
            margin: "0 20px 18px",
            padding: "12px 16px",
            borderRadius: 12,
            background: "rgba(184, 15, 18, 0.06)",
            border: "1px solid var(--border-red)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <User size={18} color="var(--red)" style={{ flexShrink: 0 }} />
          <div>
            <div
              style={{
                fontSize: 13.5,
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              {clienteParam
                ? `Respondiendo a: ${clienteParam}`
                : "Cliente seleccionado"}
            </div>
            {telefonoParam && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  marginTop: 2,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                WhatsApp directo a: +{telefonoParam}
              </div>
            )}
          </div>
        </div>
      )}

      {!isLoading && inmuebles.length === 0 ? (
        <EmptyState
          icon={<Building2 size={44} />}
          title="Sin inmuebles disponibles"
          description="No encontramos inmuebles activos para generar fichas."
        />
      ) : (
        <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 18 }}>
          {/* 1. Selector Instantáneo CMDK */}
          <div>
            <label className="form-label">1. Selecciona el inmueble</label>
            <PropertyPickerDrawer
              inmuebles={inmuebles}
              selected={inmuebleActual}
              onSelect={(inm) => setSelectedId(inm.id)}
              loading={isLoading}
              views={views}
            />
          </div>

          {/* 2. Nombre del Cliente */}
          <div>
            <label className="form-label" htmlFor="ws-cliente-input">
              2. Nombre del cliente (opcional)
            </label>
            <input
              id="ws-cliente-input"
              type="text"
              className="form-input"
              placeholder="Ej. Carlos Gómez (o déjalo vacío para saludo general)"
              value={nombreCliente}
              onChange={(e) => setNombreCliente(e.target.value)}
            />
          </div>

          {/* 3. Vista Previa del Mensaje */}
          {inmuebleActual && (
            <div>
              <label className="form-label" style={{ marginBottom: 10 }}>
                3. Vista previa del mensaje
              </label>
              <div style={{ paddingLeft: 8 }}>
                <motion.div
                  key={`${inmuebleActual.id}-${nombreCliente}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.16 }}
                  style={{
                    background: "#005c4b",
                    color: "#e9edef",
                    padding: "14px 16px",
                    borderRadius: "0 12px 12px 12px",
                    fontSize: 15,
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.14)",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: -8,
                      width: 0,
                      height: 0,
                      borderRight: "8px solid #005c4b",
                      borderBottom: "10px solid transparent",
                    }}
                  />
                  {mensajeActual}
                </motion.div>
              </div>
            </div>
          )}

          {/* Acciones Principales */}
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              className="btn-ws"
              disabled={!inmuebleActual}
              style={{
                flex: 1,
                padding: "15px 18px",
                fontSize: 16,
                borderRadius: 14,
                boxShadow: "0 4px 14px rgba(37, 211, 102, 0.28)",
                opacity: inmuebleActual ? 1 : 0.5,
              }}
              onClick={handleOpenWS}
            >
              <MessageCircle size={20} />
              {tieneClienteDestino
                ? `Enviar a ${clienteParam.split(" ")[0] || "Cliente"}`
                : "Enviar por WhatsApp"}
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={handleCopy}
              disabled={!inmuebleActual}
              aria-label="Copiar mensaje"
              title="Copiar mensaje"
              className="btn-secondary"
              style={{
                width: "auto",
                padding: "15px 18px",
                borderRadius: 14,
                background: "var(--bg-card)",
                fontSize: 15,
                flexShrink: 0,
                opacity: inmuebleActual ? 1 : 0.5,
              }}
            >
              <Copy size={18} />
              Copiar
            </motion.button>
          </div>

          {/* Links Secundarios */}
          {inmuebleActual && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <button
                type="button"
                onClick={handleCopyFicha}
                className="btn-secondary"
                style={{
                  flex: 1,
                  minWidth: 180,
                  padding: "12px 14px",
                  borderRadius: 12,
                  fontSize: 13.5,
                  background: "var(--bg-card)",
                  color: "var(--text-secondary)",
                }}
              >
                <ExternalLink size={15} color="var(--red)" />
                Link de ficha pública
              </button>

              {(inmuebleActual.urlDomus || inmuebleActual.urlL2L) && (
                <button
                  type="button"
                  onClick={handleCopyOriginal}
                  className="btn-secondary"
                  style={{
                    flex: 1,
                    minWidth: 180,
                    padding: "12px 14px",
                    borderRadius: 12,
                    fontSize: 13.5,
                    borderStyle: "dashed",
                    color: "var(--text-secondary)",
                  }}
                >
                  <LinkIcon size={15} />
                  Link original L2L
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function WhatsAppPage() {
  return (
    <Suspense
      fallback={
        <div className="page" style={{ maxWidth: 760 }}>
          <div className="header">
            <div>
              <h1 className="header-title">Ficha WhatsApp</h1>
              <p className="header-sub">Cargando herramienta...</p>
            </div>
          </div>
        </div>
      }
    >
      <WhatsAppContent />
    </Suspense>
  );
}
