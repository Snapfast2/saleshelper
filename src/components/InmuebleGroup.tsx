'use client';
// src/components/InmuebleGroup.tsx
// Agrupa visualmente los clientes interesados en el mismo inmueble

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { BorderTrail } from "@/components/motion-primitives/border-trail";
import { AnimatedGroup } from "@/components/motion-primitives/animated-group";
import { TextEffect } from "@/components/motion-primitives/text-effect";
import {
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContent,
  MorphingDialogContainer,
  MorphingDialogClose,
} from "@/components/motion-primitives/morphing-dialog";
import {
  MessageCircle, Bell, X, CheckCircle, MessageSquareQuote,
  Phone, ChevronUp, ChevronDown, Users, Home,
  Zap, Sun, CalendarDays, Clock, AlertTriangle, Snowflake, Key,
} from "lucide-react";
import type { Cliente, Inmueble } from "@/types";
import { addRecordatorio, calcularFechaRecordatorio } from "@/lib/recordatorios";

// ─── Helpers ──────────────────────────────────────────────────────────
function tiempoTranscurrido(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  const hrs = Math.floor(ms / 3600000);
  const dias = Math.floor(ms / 86400000);
  if (min < 1) return "Ahora";
  if (min < 60) return `${min}m`;
  if (hrs < 24) return `${hrs}h`;
  return `${dias}d`;
}

function formatearPrecio(p: number) {
  if (p >= 1_000_000_000) return `$${(p / 1_000_000_000).toFixed(1)}B`;
  if (p >= 1_000_000) return `$${Math.round(p / 1_000_000)}M`;
  return `$${Math.round(p / 1_000)}K`;
}

function diasSeguimientoInfo(dias?: number) {
  if (dias === undefined) return null;
  if (dias === 0) return { text: "Hoy", color: "#dc2626" };
  if (dias > 0) return { text: `${dias}d`, color: "#d97706" };
  return { text: `Venc.`, color: "#dc2626" };
}

type EtiquetaEdad = {
  label: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
  bg: string;
  border: string;
  tiempo: string;
};

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

  if (hrs < 2) {
    return { label: "Nuevo", Icon: Zap, color: "#10b981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.2)", tiempo };
  }
  if (dias < 1) {
    return { label: "Hoy", Icon: Sun, color: "#22c55e", bg: "rgba(34,197,94,0.06)", border: "rgba(34,197,94,0.15)", tiempo };
  }
  if (dias <= 3) {
    return { label: "Reciente", Icon: CalendarDays, color: "#3b82f6", bg: "rgba(59,130,246,0.06)", border: "rgba(59,130,246,0.15)", tiempo };
  }
  if (dias <= 7) {
    return { label: "Pendiente", Icon: Clock, color: "#eab308", bg: "rgba(234,179,8,0.06)", border: "rgba(234,179,8,0.15)", tiempo };
  }
  if (dias <= 30) {
    return { label: "Sin gestionar", Icon: AlertTriangle, color: "#f97316", bg: "rgba(249,115,22,0.06)", border: "rgba(249,115,22,0.15)", tiempo };
  }
  return { label: "Frio", Icon: Snowflake, color: "#9ca3af", bg: "var(--bg-card-hover)", border: "var(--border)", tiempo };
}

// ─── Opciones recordatorio ─────────────────────────────────────────────
const OPCIONES = [
  { value: "hoy" as const, label: "Esta tarde", emoji: "⚡" },
  { value: "1dia" as const, label: "Mañana", emoji: "📅" },
  { value: "3dias" as const, label: "En 3 días", emoji: "🕐" },
  { value: "7dias" as const, label: "En 1 semana", emoji: "📆" },
];

// ─── Modal de recordatorio ─────────────────────────────────────────────
function RecordatorioModal({ nombre, guardado, elegido, onClose, onElegir }: {
  nombre: string;
  guardado: boolean;
  elegido: string | null;
  onClose: () => void;
  onElegir: (op: "hoy" | "1dia" | "3dias" | "7dias") => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      <>
        <motion.div key="ov" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9998, backdropFilter: "blur(4px)" }}
        />
        <motion.div key="sh" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 340, damping: 32 }}
          style={{
            position: "fixed", bottom: 0, left: 0, right: 0, margin: "0 auto", maxWidth: 480,
            background: "var(--bg-card)", borderRadius: "24px 24px 0 0",
            padding: "24px 20px", paddingBottom: "calc(24px + env(safe-area-inset-bottom,16px))",
            zIndex: 9999, boxShadow: "0 -8px 48px rgba(0,0,0,0.2)",
          }}
        >
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--border)", margin: "0 auto 20px" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <h3 style={{ fontSize: 21, fontWeight: 700, margin: 0 }}>🔔 Recordar a {nombre}</h3>
            <button onClick={onClose} style={{ padding: 8, borderRadius: "50%", background: "var(--bg-base)", border: "1px solid var(--border)", display: "flex", cursor: "pointer" }}>
              <X size={18} color="var(--text-secondary)" />
            </button>
          </div>
          <p style={{ fontSize: 15, color: "var(--text-secondary)", marginBottom: 20 }}>¿Cuándo quieres que te recuerde hacer seguimiento?</p>
          {guardado ? (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", padding: "28px 20px", color: "#16a34a", fontWeight: 700, fontSize: 20 }}
            >
              <CheckCircle size={32} color="#16a34a" /> ¡Recordatorio guardado!
            </motion.div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {OPCIONES.map((op) => (
                <motion.button key={op.value} onClick={() => onElegir(op.value)} whileTap={{ scale: 0.97 }}
                  style={{
                    display: "flex", alignItems: "center", gap: 14, padding: "16px", borderRadius: 14,
                    border: `1px solid ${elegido === op.value ? "var(--border-red)" : "var(--border)"}`,
                    background: elegido === op.value ? "var(--red-glow)" : "var(--bg-base)",
                    cursor: "pointer", fontSize: 17, fontWeight: 600, color: "var(--text-primary)", textAlign: "left", width: "100%",
                  }}
                >
                  <span style={{ fontSize: 28 }}>{op.emoji}</span>{op.label}
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

// ─── Fila de cliente con Morphing Dialog ──────────────────────────────
function ClienteRow({ cliente, showSeguimiento }: { cliente: Cliente; showSeguimiento: boolean }) {
  const [modal, setModal] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [elegido, setElegido] = useState<string | null>(null);

  const tel = cliente.telefono
    ? `${cliente.telefonoIndicativo.replace(/\D/g, "")}${cliente.telefono.replace(/\D/g, "")}`
    : "";
  const primerNombre = cliente.nombre.toLowerCase().split(" ")[0];
  const nombreCap = primerNombre.charAt(0).toUpperCase() + primerNombre.slice(1);
  const seg = showSeguimiento ? diasSeguimientoInfo(cliente.diasSeguimiento) : null;
  
  const ms = Date.now() - new Date(cliente.fecha).getTime();
  const dias = Math.floor(ms / 86400000);
  const esNuevo = ms < 5 * 60 * 60 * 1000;
  const esAntiguo = dias > 7;

  const etiqueta = obtenerEtiquetaEdad(cliente.fecha);

  const hrefFicha = `/whatsapp?inmueble=${encodeURIComponent(cliente.inmuebleInteres)}&cliente=${encodeURIComponent(cliente.nombre)}${tel ? `&telefono=${tel}` : ""}`;
  const hrefOb = `/respuestas?cliente=${encodeURIComponent(nombreCap)}${tel ? `&telefono=${tel}` : ""}`;

  const handleRecordatorio = async (op: "hoy" | "1dia" | "3dias" | "7dias") => {
    const fecha = calcularFechaRecordatorio(op);
    const rec = addRecordatorio({
      clienteId: cliente.id, nombre: cliente.nombre, telefono: cliente.telefono,
      telefonoIndicativo: cliente.telefonoIndicativo, inmuebleInteres: cliente.inmuebleInteres, fechaRecordatorio: fecha,
    });
    try {
      await fetch("/api/push/check-reminders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rec.id, nombre: rec.nombre, telefono: rec.telefono, telefonoIndicativo: rec.telefonoIndicativo, inmuebleInteres: rec.inmuebleInteres, fechaRecordatorio: rec.fechaRecordatorio }),
      });
    } catch (_) {}
    setElegido(op);
    setGuardado(true);
    setTimeout(() => { setModal(false); setGuardado(false); setElegido(null); }, 1500);
  };

  const fechaLegible = (() => {
    try {
      return new Date(cliente.fecha).toLocaleDateString("es-CO", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      });
    } catch { return cliente.fecha; }
  })();

  const rows: { icon: React.ReactNode; label: string; value: string; href?: string }[] = [
    tel ? { icon: <Phone size={14} color="var(--red)" />, label: "Teléfono", value: `+${tel}`, href: `tel:+${tel}` } : null,
    cliente.email ? { icon: <MessageCircle size={14} color="#3b82f6" />, label: "Correo", value: cliente.email, href: `mailto:${cliente.email}` } : null,
    { icon: <Users size={14} color="#8b5cf6" />, label: "Procedencia", value: cliente.origen },
    { icon: <Home size={14} color="#f97316" />, label: "Inmueble de interés", value: cliente.inmuebleInteres !== "N/A" ? `Ref ${cliente.inmuebleInteres}` : "Sin referencia" },
    { icon: <CalendarDays size={14} color="var(--text-muted)" />, label: "Creado", value: fechaLegible },
  ].filter(Boolean) as { icon: React.ReactNode; label: string; value: string; href?: string }[];

  const inicial = cliente.nombre.charAt(0).toUpperCase();

  return (
    <>
      <MorphingDialog transition={{ type: 'spring', bounce: 0, duration: 0.3 }}>
        <MorphingDialogTrigger
          style={{
            position: "relative",
            padding: "12px 18px",
            borderTop: "1px solid var(--border)",
            opacity: esAntiguo ? 0.72 : 1,
            transition: "opacity 0.2s ease, background 0.2s ease",
            overflow: "hidden",
            width: "100%",
            display: "block",
            textAlign: "left",
            background: "var(--bg-card)",
            border: "none",
            borderBottom: "1px solid var(--border)",
            cursor: "pointer",
          }}
        >
          {esNuevo && (
            <BorderTrail
              style={{ '--trail-color': '#16a34a' } as React.CSSProperties}
            />
          )}
          <div style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
            {/* Avatar + badge Nuevo */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{
                width: 41,
                height: 41,
                borderRadius: "50%",
                background: esNuevo
                  ? "linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.08))"
                  : esAntiguo
                    ? "linear-gradient(135deg, rgba(156,163,175,0.15), rgba(156,163,175,0.05))"
                    : "linear-gradient(135deg, rgba(196,30,58,0.15), rgba(196,30,58,0.05))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                fontWeight: 800,
                color: esNuevo ? "#16a34a" : esAntiguo ? "#9ca3af" : "var(--red)"
              }}>
                {inicial}
              </div>
              {esNuevo && (
                <div style={{
                  position: "absolute", top: -3, right: -3,
                  width: 18, height: 18, borderRadius: "50%",
                  background: "#16a34a",
                  border: "2px solid var(--bg-card)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 900, color: "#fff",
                  animation: "pulse-nuevo 2s ease-in-out infinite",
                }}>
                  N
                </div>
              )}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: esAntiguo ? "var(--text-secondary)" : "var(--text-primary)",
                  textTransform: "capitalize",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {cliente.nombre.toLowerCase()}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: etiqueta.color,
                  background: etiqueta.bg,
                  border: `1px solid ${etiqueta.border}`,
                  padding: "2px 7px",
                  borderRadius: "6px",
                  textTransform: "uppercase",
                  letterSpacing: "0.02em",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                }}>
                  <etiqueta.Icon size={10} color={etiqueta.color} />
                  {etiqueta.label}
                </span>
                <span style={{ fontSize: 14, color: "var(--text-muted)" }}>
                  {etiqueta.tiempo} · {cliente.estado}
                </span>
                {seg && (
                  <span style={{ fontSize: 14, fontWeight: 700, color: seg.color }}>· {seg.text}</span>
                )}
              </div>
            </div>

            {/* Acciones rápidas (stopPropagation) */}
            <div
              style={{ display: "flex", gap: 7, alignItems: "center", flexShrink: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {tel && (
                <a href={`tel:+${tel}`} style={{ width: 37, height: 37, borderRadius: "50%", background: "rgba(34,197,94,0.1)", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
                  <Phone size={16} color="#16a34a" />
                </a>
              )}
              <Link href={hrefFicha} style={{ width: 37, height: 37, borderRadius: "50%", background: "rgba(37,211,102,0.1)", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
                <MessageCircle size={16} color="#25D366" />
              </Link>
              <button onClick={() => setModal(true)} style={{ width: 37, height: 37, borderRadius: "50%", background: "var(--bg-base)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <Bell size={16} color="var(--text-muted)" />
              </button>
            </div>
          </div>
        </MorphingDialogTrigger>

        {/* CONTENIDO DEL MORPHING DIALOG */}
        <MorphingDialogContainer>
          <MorphingDialogContent
            style={{
              background: "var(--bg-card)", borderRadius: 28,
              width: "calc(100% - 32px)", maxWidth: 440, margin: "0 auto",
              boxShadow: "0 24px 48px rgba(0,0,0,0.25)",
              overflow: "hidden",
            }}
          >
            {/* Cabecera */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "24px 24px 20px" }}>
              <div style={{
                width: 55, height: 55, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg, rgba(196,30,58,0.15), rgba(196,30,58,0.05))",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 26, fontWeight: 800, color: "var(--red)",
              }}>
                {inicial}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 21, fontWeight: 800, color: "var(--text-primary)", textTransform: "capitalize", lineHeight: 1.2 }}>
                  {cliente.nombre.toLowerCase()}
                </div>
                <div style={{ fontSize: 16, color: "var(--text-muted)", marginTop: 4 }}>
                  {cliente.estado}
                </div>
              </div>
              <MorphingDialogClose />
            </div>

            {/* Divisor */}
            <div style={{ height: 1, background: "var(--border)", opacity: 0.7 }} />

            {/* Filas de datos */}
            <div style={{ padding: "12px 0 24px" }}>
              {rows.map((row, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 16,
                  padding: "14px 24px",
                }}>
                  <div style={{
                    width: 37, height: 37, borderRadius: "50%",
                    background: "var(--bg-base)", border: "1px solid var(--border)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    {row.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {row.label}
                    </div>
                    {row.href ? (
                      <a href={row.href} style={{ fontSize: 17, fontWeight: 600, color: "var(--red)", textDecoration: "none", display: "block", marginTop: 2 }}>
                        {row.value}
                      </a>
                    ) : (
                      <div style={{ fontSize: 17, fontWeight: 600, color: "var(--text-primary)", marginTop: 2, textTransform: row.label === "Inmueble de interés" ? undefined : "capitalize" }}>
                        {row.value}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </MorphingDialogContent>
        </MorphingDialogContainer>
      </MorphingDialog>
      {modal && <RecordatorioModal nombre={nombreCap} guardado={guardado} elegido={elegido} onClose={() => setModal(false)} onElegir={handleRecordatorio} />}
    </>
  );
}

// ─── Grupo principal ───────────────────────────────────────────────────
interface InmuebleGroupProps {
  codigoRef: string;
  inmueble?: Inmueble;
  clientes: Cliente[];
  showSeguimiento: boolean;
}

export default function InmuebleGroup({ codigoRef, inmueble, clientes, showSeguimiento }: InmuebleGroupProps) {
  const [expandido, setExpandido] = useState(true);
  const [verMasRecientes, setVerMasRecientes] = useState(false);
  const [verMasAntiguos, setVerMasAntiguos] = useState(false);
  const n = clientes.length;

  const LIMITE_VISIBLE = 3; // mostrar 3 por defecto, el resto colapsa

  // Clasificar clientes
  const clientesRecientes = clientes.filter(c => {
    const ms = Date.now() - new Date(c.fecha).getTime();
    const dias = Math.floor(ms / 86400000);
    return dias <= 7;
  });

  const clientesAntiguos = clientes.filter(c => {
    const ms = Date.now() - new Date(c.fecha).getTime();
    const dias = Math.floor(ms / 86400000);
    return dias > 7;
  });

  return (
    <div className="card" style={{ overflow: "hidden", padding: 0 }}>
      {/* ── Foto del inmueble o Placeholder Premium ── */}
      {inmueble?.imagen && !inmueble.imagen.includes("placeholder") ? (
        <div style={{ position: "relative", height: 130, overflow: "hidden" }}>
          <Image src={inmueble.imagen} alt={inmueble.titulo} fill style={{ objectFit: "cover" }} sizes="480px" loading="lazy" />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 60%)" }} />
          <div style={{ position: "absolute", bottom: 10, left: 12, right: 12, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{inmueble.titulo}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>{inmueble.tipo} · {inmueble.barrio || inmueble.ciudad}</div>
            </div>
            <div style={{ background: "var(--red)", color: "#fff", padding: "4px 10px", borderRadius: 20, fontSize: 15, fontWeight: 800, flexShrink: 0 }}>
              {formatearPrecio(inmueble.precio)}
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          position: "relative",
          height: 130,
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "16px",
          color: "#fff",
          overflow: "hidden"
        }}>
          {/* Watermark Home Icon */}
          <div style={{ position: "absolute", right: -20, bottom: -30, opacity: 0.08, transform: "rotate(-10deg)", pointerEvents: "none" }}>
            <Home size={140} color="#fff" strokeWidth={1.5} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", zIndex: 1 }}>
            <span style={{
              background: "rgba(255, 255, 255, 0.12)",
              backdropFilter: "blur(4px)",
              color: "#fff",
              padding: "4px 10px",
              borderRadius: "20px",
              fontSize: 12,
              fontWeight: 800,
              border: "1px solid rgba(255, 255, 255, 0.15)",
              textTransform: "uppercase",
              letterSpacing: "0.03em"
            }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                {codigoRef === "sin-inmueble"
                  ? <><Key size={10} color="#fff" /> General</>
                  : <><Home size={10} color="#fff" /> Ficha Domus</>}
              </span>
            </span>
          </div>

          <div style={{ zIndex: 1 }}>
            <h4 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "#fff", letterSpacing: "-0.01em" }}>
              {codigoRef === "sin-inmueble" ? "Consulta General" : `Inmueble Ref: ${codigoRef}`}
            </h4>
            <p style={{ fontSize: 13, color: "rgba(255, 255, 255, 0.65)", marginTop: 4, fontWeight: 400 }}>
              {codigoRef === "sin-inmueble"
                ? "Interés general en portafolio de servicios"
                : "Propiedad vendida, archivada o captada por otro asesor"}
            </p>
          </div>
        </div>
      )}

      {/* ── Header del grupo: contador + expand ── */}
      <button
        onClick={() => setExpandido(!expandido)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: "none", border: "none", borderTop: "1px solid var(--border)", cursor: "pointer" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(196,30,58,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Users size={14} color="var(--red)" />
          </div>
          <span style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>
            <TextEffect per="word" preset="blur">
              {`${n} ${n === 1 ? "cliente interesado" : "clientes interesados"}`}
            </TextEffect>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-muted)" }}>
          <span style={{ fontSize: 13 }}>{expandido ? "Ocultar" : "Ver"}</span>
          {expandido ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* ── Lista de clientes ── */}
      <AnimatePresence initial={false}>
        {expandido && (
          <motion.div
            key="list"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            {/* Clientes Recientes: mostrar 3 por defecto */}
            <AnimatedGroup preset="slide" className="w-full">
              {(verMasRecientes ? clientesRecientes : clientesRecientes.slice(0, LIMITE_VISIBLE)).map((c) => (
                <ClienteRow key={c.id} cliente={c} showSeguimiento={showSeguimiento} />
              ))}
            </AnimatedGroup>
            {clientesRecientes.length > LIMITE_VISIBLE && (
              <button
                onClick={() => setVerMasRecientes(v => !v)}
                style={{
                  width: "100%", padding: "10px 16px", background: "none", border: "none",
                  borderTop: "1px solid var(--border)", cursor: "pointer",
                  fontSize: 14, fontWeight: 700, color: "var(--red)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                }}
              >
                {verMasRecientes
                  ? <><ChevronUp size={13} /> Ocultar</>
                  : <><ChevronDown size={13} /> Ver {clientesRecientes.length - LIMITE_VISIBLE} más</>
                }
              </button>
            )}

            {/* Divisor para Clientes Antiguos */}
            {clientesRecientes.length > 0 && clientesAntiguos.length > 0 && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 16px",
                background: "var(--bg-card-hover)",
                borderTop: "1px solid var(--border)",
                borderBottom: "1px solid var(--border)"
              }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Leads antiguos sin gestionar
                </span>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              </div>
            )}

            {/* Clientes Antiguos: también colapsables */}
            <AnimatedGroup preset="slide" className="w-full">
              {(verMasAntiguos ? clientesAntiguos : clientesAntiguos.slice(0, LIMITE_VISIBLE)).map((c) => (
                <ClienteRow key={c.id} cliente={c} showSeguimiento={showSeguimiento} />
              ))}
            </AnimatedGroup>
            {clientesAntiguos.length > LIMITE_VISIBLE && (
              <button
                onClick={() => setVerMasAntiguos(v => !v)}
                style={{
                  width: "100%", padding: "10px 16px", background: "none", border: "none",
                  borderTop: "1px solid var(--border)", cursor: "pointer",
                  fontSize: 14, fontWeight: 700, color: "var(--text-muted)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                }}
              >
                {verMasAntiguos
                  ? <><ChevronUp size={13} /> Ocultar antiguos</>
                  : <><ChevronDown size={13} /> Ver {clientesAntiguos.length - LIMITE_VISIBLE} más antiguos</>
                }
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
