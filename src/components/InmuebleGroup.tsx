'use client';
// src/components/InmuebleGroup.tsx
// Agrupa visualmente los clientes interesados en el mismo inmueble

import React, { useState, useEffect, useMemo, memo } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  MessageCircle, Bell, X, CheckCircle, MessageSquareQuote,
  Phone, ChevronUp, ChevronDown, Users, Home,
  Zap, Sun, CalendarDays, Clock, AlertTriangle, Snowflake, Key, Flame, Star,
} from "lucide-react";
import type { Cliente, Inmueble } from "@/types";
import { addRecordatorio, calcularFechaRecordatorio } from "@/lib/recordatorios";
import type { InteraccionesMap, InteraccionResumen } from "@/hooks/useInteracciones";

const WhatsAppModal = dynamic(() => import("@/components/WhatsAppModal"), {
  ssr: false,
});

// ─── Helpers ──────────────────────────────────────────────────────────
function formatearPrecio(p: number) {
  if (p >= 1_000_000_000) return `$${(p / 1_000_000_000).toFixed(1).replace(/\.0$/, "")} Mil M`;
  if (p >= 10_000_000) return `$${Math.round(p / 1_000_000)}M`;
  if (p >= 1_000_000) return `$${(p / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  return `$${(p / 1_000).toFixed(0)}K`;
}

function diasSeguimientoInfo(dias?: number) {
  if (dias === undefined) return null;
  if (dias === 0) return { text: "Hoy", color: "#dc2626" };
  if (dias > 0) return { text: `${dias}d`, color: "#d97706" };
  return { text: "Venc.", color: "#dc2626" };
}

type EtiquetaEdad = {
  label: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
  bg: string;
  border: string;
  tiempo: string;
};

/** Lógica para tab NUEVOS — urgencia por edad del lead */
function obtenerEtiquetaEdad(fechaIso: string): EtiquetaEdad {
  const ms = Date.now() - new Date(fechaIso).getTime();
  const min = Math.floor(ms / 60000);
  const hrs = Math.floor(ms / 3600000);
  const dias = Math.floor(ms / 86400000);

  const tiempo =
    min < 1 ? "Ahora" :
    min < 60 ? `${min}m` :
    hrs < 24 ? `${hrs}h` :
    `${dias}d`;

  if (hrs < 5) return { label: "Nuevo", Icon: Zap, color: "#16a34a", bg: "rgba(22,163,74,0.06)", border: "rgba(22,163,74,0.15)", tiempo };
  if (dias < 1) return { label: "Hoy", Icon: Sun, color: "#16a34a", bg: "rgba(22,163,74,0.06)", border: "rgba(22,163,74,0.15)", tiempo };
  if (dias < 2) return { label: "Pendiente", Icon: Clock, color: "#f97316", bg: "rgba(249,115,22,0.06)", border: "rgba(249,115,22,0.15)", tiempo };
  if (dias < 7) return { label: "Urgente", Icon: AlertTriangle, color: "#dc2626", bg: "rgba(220,38,38,0.06)", border: "rgba(220,38,38,0.15)", tiempo };
  return { label: "Sin gestión", Icon: Snowflake, color: "#991b1b", bg: "rgba(153,27,27,0.06)", border: "rgba(153,27,27,0.15)", tiempo };
}

/** Lógica para tab SEGUIMIENTO — badge según % de avance del negocio + días de seguimiento */
function obtenerEtiquetaSeguimiento(
  fechaIso: string,
  porcentaje: number | undefined,
  diasSeguimiento: number | undefined
): EtiquetaEdad {
  const ms = Date.now() - new Date(fechaIso).getTime();
  const min = Math.floor(ms / 60000);
  const hrs = Math.floor(ms / 3600000);
  const dias = Math.floor(ms / 86400000);
  const tiempo =
    min < 1 ? "Ahora" :
    min < 60 ? `${min}m` :
    hrs < 24 ? `${hrs}h` :
    `${dias}d`;

  const pct = porcentaje ?? 0;
  const segVencido = diasSeguimiento !== undefined && diasSeguimiento <= 0;

  if (hrs < 5) return { label: "Nuevo", Icon: Zap, color: "#16a34a", bg: "rgba(22,163,74,0.06)", border: "rgba(22,163,74,0.15)", tiempo };
  if (dias < 1) return { label: "Hoy", Icon: Sun, color: "#16a34a", bg: "rgba(22,163,74,0.06)", border: "rgba(22,163,74,0.15)", tiempo };
  if (pct >= 70) return { label: "Al cierre", Icon: Star, color: "#b45309", bg: "rgba(180,83,9,0.08)", border: "rgba(180,83,9,0.2)", tiempo };

  if (pct >= 40) {
    if (segVencido) return { label: "Pendiente", Icon: AlertTriangle, color: "#ea580c", bg: "rgba(234,88,12,0.07)", border: "rgba(234,88,12,0.2)", tiempo };
    return { label: "En proceso", Icon: Clock, color: "#2563eb", bg: "rgba(37,99,235,0.07)", border: "rgba(37,99,235,0.2)", tiempo };
  }

  if (segVencido) return { label: "Frío", Icon: Snowflake, color: "#0369a1", bg: "rgba(3,105,161,0.07)", border: "rgba(3,105,161,0.2)", tiempo };
  return { label: "Perfilando", Icon: CalendarDays, color: "#64748b", bg: "rgba(100,116,139,0.07)", border: "rgba(100,116,139,0.2)", tiempo };
}

function formatearNombreCorto(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Cliente";
  if (parts.length === 1) return parts[0].toLowerCase();
  return `${parts[0]} ${parts[1]}`.toLowerCase();
}

// ─── Opciones recordatorio ─────────────────────────────────────────────
const OPCIONES = [
  { value: "hoy" as const, label: "Esta tarde", emoji: "⚡" },
  { value: "1dia" as const, label: "Mañana", emoji: "📅" },
  { value: "3dias" as const, label: "En 3 días", emoji: "🕐" },
  { value: "7dias" as const, label: "En 1 semana", emoji: "📆" },
];

// ─── Modal de recordatorio ─────────────────────────────────────────────
function RecordatorioModal({
  nombre,
  guardado,
  elegido,
  onClose,
  onElegir,
}: {
  nombre: string;
  guardado: boolean;
  elegido: string | null;
  onClose: () => void;
  onElegir: (op: "hoy" | "1dia" | "3dias" | "7dias") => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      <>
        <motion.div
          key="ov"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 9998,
            backdropFilter: "blur(4px)",
          }}
        />
        <motion.div
          key="sh"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 340, damping: 32 }}
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            margin: "0 auto",
            maxWidth: 480,
            background: "var(--bg-card)",
            borderRadius: "24px 24px 0 0",
            padding: "24px 20px",
            paddingBottom: "calc(24px + env(safe-area-inset-bottom,16px))",
            zIndex: 9999,
            boxShadow: "0 -8px 48px rgba(0,0,0,0.2)",
          }}
        >
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--border)", margin: "0 auto 20px" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>🔔 Recordar a {nombre}</h3>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "var(--bg-base)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X size={18} color="var(--text-secondary)" />
            </button>
          </div>
          <p style={{ fontSize: 15, color: "var(--text-secondary)", marginBottom: 20 }}>
            ¿Cuándo quieres que te recuerde hacer seguimiento?
          </p>
          {guardado ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                justifyContent: "center",
                padding: "28px 20px",
                color: "#16a34a",
                fontWeight: 700,
                fontSize: 19,
              }}
            >
              <CheckCircle size={30} color="#16a34a" /> ¡Recordatorio guardado!
            </motion.div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {OPCIONES.map((op) => (
                <button
                  key={op.value}
                  type="button"
                  onClick={() => onElegir(op.value)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "15px 16px",
                    borderRadius: 14,
                    border: `1px solid ${elegido === op.value ? "var(--border-red)" : "var(--border)"}`,
                    background: elegido === op.value ? "var(--red-glow)" : "var(--bg-base)",
                    cursor: "pointer",
                    fontSize: 16,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    textAlign: "left",
                    width: "100%",
                  }}
                >
                  <span style={{ fontSize: 24 }}>{op.emoji}</span>
                  {op.label}
                </button>
              ))}
            </div>
          )}
        </motion.div>
      </>
    </AnimatePresence>,
    document.body
  );
}

// ─── Modal de detalle del cliente (con CTAs directos estilo Twenty RecordDrawer) ─────
function ClienteDetalleModal({
  cliente,
  tel,
  onClose,
  onOpenWhatsApp,
  onOpenRecordatorio,
}: {
  cliente: Cliente;
  tel: string;
  onClose: () => void;
  onOpenWhatsApp: () => void;
  onOpenRecordatorio: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;

  const fechaLegible = (() => {
    try {
      const d = new Date(cliente.fecha);
      const datePart = d.toLocaleDateString("es-CO", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const timePart = d.toLocaleTimeString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      const capitalizedDate = datePart.charAt(0).toUpperCase() + datePart.slice(1);

      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span>{capitalizedDate}</span>
          <span
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontWeight: 700,
            }}
          >
            {timePart}
          </span>
        </div>
      );
    } catch {
      return cliente.fecha;
    }
  })();

  const rows: { icon: React.ReactNode; label: string; value: string | React.ReactNode; href?: string }[] = [
    tel ? { icon: <Phone size={14} color="var(--red)" />, label: "Teléfono", value: `+${tel}`, href: `tel:+${tel}` } : null,
    cliente.email ? { icon: <MessageCircle size={14} color="#3b82f6" />, label: "Correo", value: cliente.email, href: `mailto:${cliente.email}` } : null,
    { icon: <Users size={14} color="#8b5cf6" />, label: "Procedencia", value: cliente.origen },
    { icon: <Home size={14} color="#f97316" />, label: "Inmueble de interés", value: cliente.inmuebleInteres !== "N/A" ? `Ref ${cliente.inmuebleInteres}` : "Sin referencia" },
    { icon: <CalendarDays size={14} color="var(--text-muted)" />, label: "Creado", value: fechaLegible },
  ].filter(Boolean) as { icon: React.ReactNode; label: string; value: string | React.ReactNode; href?: string }[];

  const inicial = (cliente.nombre || "C").charAt(0).toUpperCase();

  return createPortal(
    <AnimatePresence>
      <>
        <motion.div
          key="ov-det"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 9998,
            backdropFilter: "blur(4px)",
          }}
        />
        <motion.div
          key="sh-det"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 340, damping: 32 }}
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            margin: "0 auto",
            maxWidth: 480,
            background: "var(--bg-card)",
            borderRadius: "24px 24px 0 0",
            padding: "0 0 calc(18px + env(safe-area-inset-bottom,16px))",
            zIndex: 9999,
            boxShadow: "0 -8px 48px rgba(0,0,0,0.18)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "16px 20px 0", display: "flex", justifyContent: "center" }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--border)" }} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px" }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                flexShrink: 0,
                background: "linear-gradient(135deg, rgba(196,30,58,0.15), rgba(196,30,58,0.05))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                fontWeight: 800,
                color: "var(--red)",
              }}
            >
              {inicial}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", textTransform: "capitalize" }}>
                {cliente.nombre.toLowerCase()}
              </div>
              <div style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 2 }}>
                {cliente.estado}
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "var(--bg-base)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <X size={16} color="var(--text-secondary)" />
            </button>
          </div>

          {/* Barra de acciones directas */}
          <div style={{ display: "flex", gap: 8, padding: "0 20px 14px" }}>
            {tel && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenWhatsApp();
                }}
                className="btn-ws"
                style={{ flex: 1.4, minHeight: 42, fontSize: 13, padding: "8px 12px" }}
              >
                <MessageCircle size={15} />
                WhatsApp
              </button>
            )}
            {tel && (
              <a
                href={`tel:+${tel}`}
                className="btn-secondary"
                style={{ flex: 1, minHeight: 42, fontSize: 13, padding: "8px 12px", textDecoration: "none" }}
              >
                <Phone size={15} color="#16a34a" />
                Llamar
              </a>
            )}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenRecordatorio();
              }}
              className="btn-secondary"
              style={{ flex: 1, minHeight: 42, fontSize: 13, padding: "8px 12px" }}
            >
              <Bell size={15} />
              Recordar
            </button>
          </div>

          <div style={{ height: 1, background: "var(--border)" }} />

          <div style={{ padding: "8px 0" }}>
            {rows.map((row, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "11px 20px",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "var(--bg-base)",
                    border: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {row.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {row.label}
                  </div>
                  {row.href ? (
                    <a
                      href={row.href}
                      style={{ fontSize: 15, fontWeight: 600, color: "var(--red)", textDecoration: "none", display: "block", marginTop: 1 }}
                    >
                      {row.value}
                    </a>
                  ) : (
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        marginTop: 1,
                        textTransform: row.label === "Inmueble de interés" ? undefined : "capitalize",
                      }}
                    >
                      {row.value}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </>
    </AnimatePresence>,
    document.body
  );
}

// ─── Fila de cliente (compacta y memoizada) ────────────────────────────
const ClienteRow = memo(function ClienteRow({
  cliente,
  showSeguimiento,
  inmueble,
  ultimaInteraccion,
}: {
  cliente: Cliente;
  showSeguimiento: boolean;
  inmueble?: Inmueble;
  ultimaInteraccion?: InteraccionResumen;
}) {
  const [modal, setModal] = useState(false);
  const [waModal, setWaModal] = useState(false);
  const [detalle, setDetalle] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [elegido, setElegido] = useState<string | null>(null);

  const localDigits = (cliente.telefono || "").replace(/\D/g, "");
  const tel = localDigits
    ? `${(cliente.telefonoIndicativo || "+57").replace(/\D/g, "")}${localDigits}`
    : "";

  const primerNombre = (cliente.nombre || "Cliente").toLowerCase().split(" ")[0];
  const nombreCap = primerNombre.charAt(0).toUpperCase() + primerNombre.slice(1);
  const seg = showSeguimiento ? diasSeguimientoInfo(cliente.diasSeguimiento) : null;

  const parsedMs = new Date(cliente.fecha).getTime();
  const ms = Number.isNaN(parsedMs) ? 0 : Math.max(0, Date.now() - parsedMs);
  const dias = Math.floor(ms / 86400000);
  const esNuevo = !Number.isNaN(parsedMs) && ms < 5 * 60 * 60 * 1000;
  const esCritico = dias >= 2;
  const esFresco = dias < 1;

  const etiqueta = showSeguimiento
    ? obtenerEtiquetaSeguimiento(cliente.fecha, cliente.porcentaje, cliente.diasSeguimiento)
    : obtenerEtiquetaEdad(cliente.fecha);

  const hrefOb = `/respuestas?cliente=${encodeURIComponent(nombreCap)}${tel ? `&telefono=${tel}` : ""}`;

  const handleRecordatorio = async (op: "hoy" | "1dia" | "3dias" | "7dias") => {
    const fecha = calcularFechaRecordatorio(op);
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
        body: JSON.stringify({
          id: rec.id,
          nombre: rec.nombre,
          telefono: rec.telefono,
          telefonoIndicativo: rec.telefonoIndicativo,
          inmuebleInteres: rec.inmuebleInteres,
          fechaRecordatorio: rec.fechaRecordatorio,
        }),
      });
    } catch {}
    setElegido(op);
    setGuardado(true);
    setTimeout(() => {
      setModal(false);
      setGuardado(false);
      setElegido(null);
    }, 1200);
  };

  return (
    <>
      <div
        className={esNuevo ? "cliente-row-nuevo" : undefined}
        style={{
          position: "relative",
          padding: "11px 16px",
          borderTop: "1px solid var(--border)",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
          {/* Avatar */}
          <button
            type="button"
            onClick={() => setDetalle(true)}
            style={{
              position: "relative",
              flexShrink: 0,
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              WebkitUserSelect: "none",
              userSelect: "none",
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: (() => {
                  if (esFresco) return "linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.08))";
                  if (showSeguimiento) {
                    const pct = cliente.porcentaje ?? 0;
                    if (pct >= 70) return "linear-gradient(135deg, rgba(180,83,9,0.22), rgba(234,179,8,0.1))";
                    if (pct >= 40) return "linear-gradient(135deg, rgba(37,99,235,0.18), rgba(37,99,235,0.07))";
                    return "linear-gradient(135deg, rgba(100,116,139,0.18), rgba(100,116,139,0.07))";
                  }
                  return esCritico
                    ? "linear-gradient(135deg, rgba(220,38,38,0.2), rgba(220,38,38,0.08))"
                    : "linear-gradient(135deg, rgba(249,115,22,0.2), rgba(249,115,22,0.08))";
                })(),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                fontWeight: 800,
                color: (() => {
                  if (esFresco) return "#16a34a";
                  if (showSeguimiento) {
                    const pct = cliente.porcentaje ?? 0;
                    if (pct >= 70) return "#b45309";
                    if (pct >= 40) return "#2563eb";
                    return "#64748b";
                  }
                  return esCritico ? "#dc2626" : "#f97316";
                })(),
              }}
            >
              {nombreCap.charAt(0)}
            </div>
            {esNuevo && (
              <div
                style={{
                  position: "absolute",
                  top: -2,
                  right: -2,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: "#16a34a",
                  border: "2px solid var(--bg-card)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 9,
                  fontWeight: 900,
                  color: "#fff",
                }}
              >
                N
              </div>
            )}
          </button>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <button
              type="button"
              onClick={() => setDetalle(true)}
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "var(--text-primary)",
                textTransform: "capitalize",
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {formatearNombreCorto(cliente.nombre)}
              </span>
              {showSeguimiento ? (
                (() => {
                  const pct = cliente.porcentaje ?? 0;
                  const segVencido = cliente.diasSeguimiento !== undefined && cliente.diasSeguimiento <= 0;
                  if (esFresco) return null;
                  if (pct >= 70) {
                    return <Star size={14} color="#b45309" strokeWidth={2.5} fill="#fbbf24" style={{ flexShrink: 0 }} />;
                  }
                  if (segVencido && pct >= 40) {
                    return <Flame size={14} color="#ea580c" strokeWidth={2.5} style={{ flexShrink: 0 }} />;
                  }
                  if (segVencido && pct < 40) {
                    return <Snowflake size={14} color="#0369a1" strokeWidth={2.5} style={{ flexShrink: 0 }} />;
                  }
                  return null;
                })()
              ) : dias < 1 ? (
                <Flame size={14} color="#dc2626" strokeWidth={2.5} style={{ flexShrink: 0 }} />
              ) : dias < 7 ? (
                <Snowflake size={14} color="#0284c7" strokeWidth={2.5} style={{ flexShrink: 0 }} />
              ) : (
                <Clock size={14} color="#64748b" strokeWidth={2.2} style={{ flexShrink: 0 }} />
              )}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3, flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: etiqueta.color,
                  background: etiqueta.bg,
                  border: `1px solid ${etiqueta.border}`,
                  padding: "1px 6px 1px 5px",
                  borderRadius: "4px",
                  textTransform: "uppercase",
                  letterSpacing: "0.02em",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <etiqueta.Icon size={9} color={etiqueta.color} />
                {etiqueta.label}
              </span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {etiqueta.tiempo} · {cliente.estado}
              </span>
              {seg && <span style={{ fontSize: 12, fontWeight: 700, color: seg.color }}>· {seg.text}</span>}
              {ultimaInteraccion && (
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: "#15803d",
                    background: "rgba(37,211,102,0.12)",
                    border: "1px solid rgba(37,211,102,0.22)",
                    padding: "1px 6px 1px 5px",
                    borderRadius: "4px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                    letterSpacing: "0.02em",
                  }}
                >
                  ✓ {ultimaInteraccion.tipo}
                </div>
              )}
            </div>
          </div>

          {/* Acciones rápidas (táctiles 38px) */}
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
            {tel && (
              <a
                href={`tel:+${tel}`}
                aria-label={`Llamar a ${nombreCap}`}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "rgba(34,197,94,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textDecoration: "none",
                }}
              >
                <Phone size={15} color="#16a34a" />
              </a>
            )}
            <button
              type="button"
              disabled={!tel}
              onClick={() => tel && setWaModal(true)}
              aria-label={`Enviar WhatsApp a ${nombreCap}`}
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: tel ? "rgba(37,211,102,0.12)" : "var(--bg-base)",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: tel ? "pointer" : "not-allowed",
                opacity: tel ? 1 : 0.4,
              }}
            >
              <MessageCircle size={15} color={tel ? "#25D366" : "var(--text-muted)"} />
            </button>
            <Link
              href={hrefOb}
              prefetch={false}
              aria-label={`Objeciones para ${nombreCap}`}
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: "var(--bg-base)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
              }}
            >
              <MessageSquareQuote size={15} color="var(--text-secondary)" />
            </Link>
            <button
              type="button"
              onClick={() => setModal(true)}
              aria-label={`Recordatorio para ${nombreCap}`}
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: "var(--bg-base)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <Bell size={15} color="var(--text-secondary)" />
            </button>
          </div>
        </div>
      </div>

      {modal && (
        <RecordatorioModal
          nombre={nombreCap}
          guardado={guardado}
          elegido={elegido}
          onClose={() => setModal(false)}
          onElegir={handleRecordatorio}
        />
      )}
      {waModal && (
        <WhatsAppModal
          cliente={cliente}
          tel={tel}
          inmueble={inmueble}
          onClose={() => setWaModal(false)}
        />
      )}
      {detalle && (
        <ClienteDetalleModal
          cliente={cliente}
          tel={tel}
          onClose={() => setDetalle(false)}
          onOpenWhatsApp={() => setWaModal(true)}
          onOpenRecordatorio={() => setModal(true)}
        />
      )}
    </>
  );
});

// ─── Grupo principal ───────────────────────────────────────────────────
interface InmuebleGroupProps {
  codigoRef: string;
  inmueble?: Inmueble;
  clientes: Cliente[];
  showSeguimiento: boolean;
  interacciones: InteraccionesMap;
  forceExpand?: boolean;
}

export default function InmuebleGroup({
  codigoRef,
  inmueble,
  clientes,
  showSeguimiento,
  interacciones,
  forceExpand = false,
}: InmuebleGroupProps) {
  const [expandido, setExpandido] = useState(true);
  const [verMasRecientes, setVerMasRecientes] = useState(false);
  const [verMasAntiguos, setVerMasAntiguos] = useState(false);
  const n = clientes.length;

  const LIMITE_VISIBLE = 3;

  const { clientesRecientes, clientesAntiguos } = useMemo(() => {
    const recientes: Cliente[] = [];
    const antiguos: Cliente[] = [];
    const now = Date.now();

    for (const c of clientes) {
      const t = new Date(c.fecha).getTime();
      if (Number.isNaN(t)) {
        recientes.push(c);
        continue;
      }
      const dias = Math.floor((now - t) / 86400000);
      if (dias <= 7) {
        recientes.push(c);
      } else {
        antiguos.push(c);
      }
    }
    return { clientesRecientes: recientes, clientesAntiguos: antiguos };
  }, [clientes]);

  const isExpanded = forceExpand || expandido;
  const mostrarTodosRecientes = forceExpand || verMasRecientes;
  const mostrarTodosAntiguos = forceExpand || verMasAntiguos;

  const getUltimaInteraccion = (c: Cliente): InteraccionResumen | undefined => {
    const cleanTel = (c.telefono || "").replace(/\D/g, "");
    if (!cleanTel) return undefined;
    if (interacciones[cleanTel]) return interacciones[cleanTel];
    if (cleanTel.length > 10) {
      return interacciones[cleanTel.slice(-10)];
    }
    return undefined;
  };

  return (
    <div className="card" style={{ overflow: "hidden", padding: 0 }}>
      {/* ── Foto del inmueble o Placeholder Premium ── */}
      {inmueble?.imagen && !inmueble.imagen.includes("placeholder") ? (
        <div style={{ position: "relative", height: 130, overflow: "hidden" }}>
          <Image
            src={inmueble.imagen}
            alt={inmueble.titulo}
            fill
            style={{ objectFit: "cover" }}
            sizes="(max-width: 520px) 92vw, 460px"
            loading="lazy"
          />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 60%)" }} />
          <div style={{ position: "absolute", bottom: 10, left: 12, right: 12, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {inmueble.titulo}
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>
                {inmueble.tipo} · {inmueble.barrio || inmueble.ciudad}
              </div>
            </div>
            <div style={{ background: "var(--red)", color: "#fff", padding: "4px 10px", borderRadius: 20, fontSize: 15, fontWeight: 800, flexShrink: 0 }}>
              {formatearPrecio(inmueble.precio)}
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            position: "relative",
            height: 124,
            background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "16px",
            color: "#fff",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", right: -20, bottom: -30, opacity: 0.08, transform: "rotate(-10deg)", pointerEvents: "none" }}>
            <Home size={140} color="#fff" strokeWidth={1.5} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", zIndex: 1 }}>
            <span
              style={{
                background: "rgba(255, 255, 255, 0.12)",
                color: "#fff",
                padding: "4px 10px",
                borderRadius: "20px",
                fontSize: 12,
                fontWeight: 800,
                border: "1px solid rgba(255, 255, 255, 0.15)",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                {codigoRef === "sin-inmueble" ? (
                  <>
                    <Key size={10} color="#fff" /> General
                  </>
                ) : (
                  <>
                    <Home size={10} color="#fff" /> Ficha Domus
                  </>
                )}
              </span>
            </span>
          </div>

          <div style={{ zIndex: 1 }}>
            <h4 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "#fff", letterSpacing: "-0.01em" }}>
              {codigoRef === "sin-inmueble" ? "Consulta General" : `Inmueble Ref: ${codigoRef}`}
            </h4>
            <p style={{ fontSize: 13, color: "rgba(255, 255, 255, 0.68)", marginTop: 4, fontWeight: 400 }}>
              {codigoRef === "sin-inmueble"
                ? "Interés general en portafolio de servicios"
                : "Propiedad vendida, archivada o captada por otro asesor"}
            </p>
          </div>
        </div>
      )}

      {/* ── Header del grupo: contador + expand ── */}
      <button
        type="button"
        onClick={() => setExpandido(!isExpanded)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "11px 16px",
          background: "none",
          border: "none",
          borderTop: "1px solid var(--border)",
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(196,30,58,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Users size={14} color="var(--red)" />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
            {n} {n === 1 ? "cliente interesado" : "clientes interesados"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-muted)" }}>
          <span style={{ fontSize: 13 }}>{isExpanded ? "Ocultar" : "Ver"}</span>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* ── Lista de clientes (sin layout thrashing de height: auto) ── */}
      {isExpanded && (
        <div>
          {(mostrarTodosRecientes ? clientesRecientes : clientesRecientes.slice(0, LIMITE_VISIBLE)).map((c) => (
            <ClienteRow
              key={c.id}
              cliente={c}
              showSeguimiento={showSeguimiento}
              inmueble={inmueble}
              ultimaInteraccion={getUltimaInteraccion(c)}
            />
          ))}
          {!forceExpand && clientesRecientes.length > LIMITE_VISIBLE && (
            <button
              type="button"
              onClick={() => setVerMasRecientes((v) => !v)}
              style={{
                width: "100%",
                padding: "11px 16px",
                background: "none",
                border: "none",
                borderTop: "1px solid var(--border)",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 700,
                color: "var(--red)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
              }}
            >
              {verMasRecientes ? (
                <>
                  <ChevronUp size={13} /> Ocultar
                </>
              ) : (
                <>
                  <ChevronDown size={13} /> Ver {clientesRecientes.length - LIMITE_VISIBLE} más
                </>
              )}
            </button>
          )}

          {clientesRecientes.length > 0 && clientesAntiguos.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 16px",
                background: "var(--bg-card-hover)",
                borderTop: "1px solid var(--border)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Leads anteriores (+7 días)
              </span>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            </div>
          )}

          {(mostrarTodosAntiguos ? clientesAntiguos : clientesAntiguos.slice(0, LIMITE_VISIBLE)).map((c) => (
            <ClienteRow
              key={c.id}
              cliente={c}
              showSeguimiento={showSeguimiento}
              inmueble={inmueble}
              ultimaInteraccion={getUltimaInteraccion(c)}
            />
          ))}
          {!forceExpand && clientesAntiguos.length > LIMITE_VISIBLE && (
            <button
              type="button"
              onClick={() => setVerMasAntiguos((v) => !v)}
              style={{
                width: "100%",
                padding: "11px 16px",
                background: "none",
                border: "none",
                borderTop: "1px solid var(--border)",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 700,
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
              }}
            >
              {verMasAntiguos ? (
                <>
                  <ChevronUp size={13} /> Ocultar anteriores
                </>
              ) : (
                <>
                  <ChevronDown size={13} /> Ver {clientesAntiguos.length - LIMITE_VISIBLE} más anteriores
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
