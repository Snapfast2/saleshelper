'use client';
// src/components/ClienteCard.tsx
// Tarjeta interactiva de cliente con foto del inmueble de interés

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Bell, X, CheckCircle, MessageSquareQuote, Phone, Globe, Home, DollarSign } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { Cliente, Inmueble } from "@/types";
import { addRecordatorio, calcularFechaRecordatorio } from "@/lib/recordatorios";

// ─── Helpers ──────────────────────────────────────────────────────────
function obtenerTiempoTranscurrido(isoString: string) {
  const diferenciaMs = Date.now() - new Date(isoString).getTime();
  const min = Math.floor(diferenciaMs / 60000);
  const hrs = Math.floor(diferenciaMs / 3600000);
  const dias = Math.floor(diferenciaMs / 86400000);
  if (min < 1) return "Hace un momento";
  if (min < 60) return `Hace ${min} min`;
  if (hrs < 24) return `Hace ${hrs}h`;
  if (dias < 7) return `Hace ${dias}d`;
  return `Hace ${dias}d`;
}

function formatearPrecio(precio: number) {
  if (precio >= 1_000_000_000) return `$${(precio / 1_000_000_000).toFixed(1)}B`;
  if (precio >= 1_000_000) return `$${Math.round(precio / 1_000_000)}M`;
  if (precio >= 1_000) return `$${Math.round(precio / 1_000)}K`;
  return `$${precio}`;
}

function formatearDiasSeguimiento(dias: number) {
  if (dias === 0) return { text: "Hoy", color: "#dc2626", bg: "rgba(220,38,38,0.1)" };
  if (dias > 0) return { text: `En ${dias}d`, color: "#d97706", bg: "rgba(217,119,6,0.1)" };
  return { text: `Vencido ${Math.abs(dias)}d`, color: "#dc2626", bg: "rgba(220,38,38,0.1)" };
}

const OPCIONES_RECORDATORIO = [
  { value: "hoy" as const, label: "Esta tarde", emoji: "⚡" },
  { value: "1dia" as const, label: "Mañana", emoji: "📅" },
  { value: "3dias" as const, label: "En 3 días", emoji: "🕐" },
  { value: "7dias" as const, label: "En 1 semana", emoji: "📆" },
];

// ─── Modal de Recordatorio ────────────────────────────────────────────
function RecordatorioModal({ nombre, recordatorioGuardado, opcionElegida, onClose, onElegir }: {
  nombre: string;
  recordatorioGuardado: boolean;
  opcionElegida: string | null;
  onClose: () => void;
  onElegir: (op: "hoy" | "1dia" | "3dias" | "7dias") => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      <>
        <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9998, backdropFilter: "blur(4px)" }}
        />
        <motion.div key="sheet" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 340, damping: 32 }}
          style={{
            position: "fixed", bottom: 0, left: 0, right: 0, margin: "0 auto", maxWidth: 480,
            background: "var(--bg-card)", borderRadius: "24px 24px 0 0",
            padding: "24px 20px", paddingBottom: "calc(24px + env(safe-area-inset-bottom, 16px))",
            zIndex: 9999, boxShadow: "0 -8px 48px rgba(0,0,0,0.2)",
          }}
        >
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--border)", margin: "0 auto 20px" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>🔔 Recordar a {nombre}</h3>
            <button onClick={onClose} style={{ padding: 8, borderRadius: "50%", background: "var(--bg-base)", border: "1px solid var(--border)", display: "flex", cursor: "pointer" }}>
              <X size={18} color="var(--text-secondary)" />
            </button>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>¿Cuándo quieres que te recuerde hacer seguimiento?</p>
          {recordatorioGuardado ? (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", padding: "28px 20px", color: "#16a34a", fontWeight: 700, fontSize: 17 }}
            >
              <CheckCircle size={32} color="#16a34a" />¡Recordatorio guardado!
            </motion.div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {OPCIONES_RECORDATORIO.map((op) => (
                <motion.button key={op.value} onClick={() => onElegir(op.value)} whileTap={{ scale: 0.97 }}
                  style={{
                    display: "flex", alignItems: "center", gap: 14, padding: "16px",
                    borderRadius: 14, border: `1px solid ${opcionElegida === op.value ? "var(--border-red)" : "var(--border)"}`,
                    background: opcionElegida === op.value ? "var(--red-glow)" : "var(--bg-base)",
                    cursor: "pointer", fontSize: 15, fontWeight: 600, color: "var(--text-primary)", textAlign: "left", width: "100%",
                  }}
                >
                  <span style={{ fontSize: 24 }}>{op.emoji}</span>{op.label}
                </motion.button>
              ))}
            </div>
          )}
        </motion.div>
      </>
    </AnimatePresence>,
    document.body
  );
}

// ─── Main Component ───────────────────────────────────────────────────
interface ClienteCardProps {
  cliente: Cliente;
  inmueble?: Inmueble;
  showSeguimiento?: boolean;
}

export default function ClienteCard({ cliente, inmueble, showSeguimiento = false }: ClienteCardProps) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [recordatorioGuardado, setRecordatorioGuardado] = useState(false);
  const [opcionElegida, setOpcionElegida] = useState<string | null>(null);

  const telefonoCompleto = cliente.telefono
    ? `${cliente.telefonoIndicativo.replace(/\D/g, "")}${cliente.telefono.replace(/\D/g, "")}`
    : "";
  const primerNombre = cliente.nombre.toLowerCase().split(" ")[0];
  const nombreCapitalizado = primerNombre.charAt(0).toUpperCase() + primerNombre.slice(1);

  const handleRecordatorio = async (opcion: "hoy" | "1dia" | "3dias" | "7dias") => {
    const fecha = calcularFechaRecordatorio(opcion);
    const rec = addRecordatorio({
      clienteId: cliente.id,
      nombre: cliente.nombre,
      telefono: cliente.telefono,
      telefonoIndicativo: cliente.telefonoIndicativo,
      inmuebleInteres: cliente.inmuebleInteres,
      fechaRecordatorio: fecha,
    });
    try {
      await fetch("/api/push/check-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rec.id, nombre: rec.nombre, telefono: rec.telefono, telefonoIndicativo: rec.telefonoIndicativo, inmuebleInteres: rec.inmuebleInteres, fechaRecordatorio: rec.fechaRecordatorio }),
      });
    } catch (_) {}
    setOpcionElegida(opcion);
    setRecordatorioGuardado(true);
    setTimeout(() => { setModalAbierto(false); setRecordatorioGuardado(false); setOpcionElegida(null); }, 1500);
  };

  const hrefFicha = `/whatsapp?inmueble=${encodeURIComponent(cliente.inmuebleInteres)}&cliente=${encodeURIComponent(cliente.nombre)}${telefonoCompleto ? `&telefono=${telefonoCompleto}` : ""}`;
  const hrefObjeciones = `/respuestas?cliente=${encodeURIComponent(nombreCapitalizado)}${telefonoCompleto ? `&telefono=${telefonoCompleto}` : ""}`;
  const infoSeg = cliente.diasSeguimiento !== undefined ? formatearDiasSeguimiento(cliente.diasSeguimiento) : null;

  return (
    <>
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ overflow: "hidden", padding: 0 }}
      >
        {/* ── Foto del inmueble ── */}
        {inmueble?.imagen ? (
          <div style={{ position: "relative", height: 140, background: "var(--bg-base)", overflow: "hidden" }}>
            <Image
              src={inmueble.imagen}
              alt={inmueble.titulo}
              fill
              style={{ objectFit: "cover" }}
              sizes="480px"
              loading="lazy"
            />
            {/* Overlay gradiente */}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)" }} />
            {/* Info del inmueble encima de la foto */}
            <div style={{ position: "absolute", bottom: 10, left: 12, right: 12 }}>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {inmueble.titulo}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>
                    {inmueble.tipo} · {inmueble.barrio || inmueble.ciudad}
                  </div>
                </div>
                <div style={{ background: "var(--red)", color: "#fff", padding: "4px 10px", borderRadius: 20, fontSize: 13, fontWeight: 800, whiteSpace: "nowrap", flexShrink: 0 }}>
                  {formatearPrecio(inmueble.precio)}
                </div>
              </div>
            </div>
            {/* Badge origen */}
            <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", color: "#fff", padding: "3px 8px", borderRadius: 20, fontSize: 10, fontWeight: 600 }}>
              {cliente.origen}
            </div>
            {/* Badge seguimiento */}
            {showSeguimiento && infoSeg && (
              <div style={{ position: "absolute", top: 10, left: 10, background: infoSeg.bg, color: infoSeg.color, border: `1px solid ${infoSeg.color}44`, padding: "3px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, backdropFilter: "blur(6px)" }}>
                🔔 {infoSeg.text}
              </div>
            )}
          </div>
        ) : (
          /* Sin foto — mostrar placeholder con código */
          <div style={{ height: 56, background: "linear-gradient(135deg, var(--bg-card-hover), var(--bg-base))", display: "flex", alignItems: "center", padding: "0 16px", gap: 8, borderBottom: "1px solid var(--border)" }}>
            <Home size={16} color="var(--text-muted)" />
            <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>Ref: {cliente.inmuebleInteres || "Sin inmueble"}</span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)", background: "rgba(0,0,0,0.05)", padding: "2px 8px", borderRadius: 12 }}>{cliente.origen}</span>
            {showSeguimiento && infoSeg && (
              <span style={{ fontSize: 10, fontWeight: 700, color: infoSeg.color, background: infoSeg.bg, padding: "2px 8px", borderRadius: 12 }}>🔔 {infoSeg.text}</span>
            )}
          </div>
        )}

        {/* ── Cuerpo de la tarjeta ── */}
        <div style={{ padding: "14px 16px 16px" }}>
          {/* Nombre + tiempo */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12, gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--text-primary)", textTransform: "capitalize", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {cliente.nombre.toLowerCase()}
              </h3>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block", flexShrink: 0 }} />
                {obtenerTiempoTranscurrido(cliente.fecha)} · {cliente.estado}
              </div>
            </div>
            {/* Teléfono directo */}
            {telefonoCompleto && (
              <a
                href={`tel:+${telefonoCompleto}`}
                style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, textDecoration: "none" }}
              >
                <Phone size={16} color="#16a34a" />
              </a>
            )}
          </div>

          {/* ── Botones de acción ── */}
          <div style={{ display: "flex", gap: 8 }}>
            <Link href={hrefFicha} className="btn-ws"
              style={{ flex: 1, padding: "10px 12px", borderRadius: 14, fontSize: 12, fontWeight: 700, height: "auto", justifyContent: "center" }}
            >
              <MessageCircle size={14} />
              Responder
            </Link>

            <Link href={hrefObjeciones}
              style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 12px", borderRadius: 14, fontSize: 12, fontWeight: 700, background: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-secondary)", textDecoration: "none" }}
            >
              <MessageSquareQuote size={14} />
              Objeciones
            </Link>

            <button
              onClick={() => setModalAbierto(true)}
              style={{ width: 42, height: 42, borderRadius: 14, background: "var(--bg-base)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
            >
              <Bell size={16} color="var(--text-secondary)" />
            </button>
          </div>
        </div>
      </motion.div>

      {modalAbierto && (
        <RecordatorioModal
          nombre={nombreCapitalizado}
          recordatorioGuardado={recordatorioGuardado}
          opcionElegida={opcionElegida}
          onClose={() => setModalAbierto(false)}
          onElegir={handleRecordatorio}
        />
      )}
    </>
  );
}
