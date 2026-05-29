'use client';
// src/components/InmuebleGroup.tsx
// Agrupa visualmente los clientes interesados en el mismo inmueble

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  MessageCircle, Bell, X, CheckCircle, MessageSquareQuote,
  Phone, ChevronUp, ChevronDown, Users, Home,
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
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>🔔 Recordar a {nombre}</h3>
            <button onClick={onClose} style={{ padding: 8, borderRadius: "50%", background: "var(--bg-base)", border: "1px solid var(--border)", display: "flex", cursor: "pointer" }}>
              <X size={18} color="var(--text-secondary)" />
            </button>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>¿Cuándo quieres que te recuerde hacer seguimiento?</p>
          {guardado ? (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", padding: "28px 20px", color: "#16a34a", fontWeight: 700, fontSize: 17 }}
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

// ─── Fila de cliente (compacta) ────────────────────────────────────────
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

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderTop: "1px solid var(--border)" }}>
        {/* Avatar */}
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, rgba(196,30,58,0.15), rgba(196,30,58,0.05))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14, fontWeight: 800, color: "var(--red)" }}>
          {nombreCap.charAt(0)}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", textTransform: "capitalize", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {cliente.nombre.toLowerCase()}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
              {tiempoTranscurrido(cliente.fecha)} · {cliente.estado}
            </span>
            {seg && (
              <span style={{ fontSize: 10, fontWeight: 700, color: seg.color }}>· 🔔 {seg.text}</span>
            )}
          </div>
        </div>

        {/* Acciones rápidas */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          {tel && (
            <a href={`tel:+${tel}`} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(34,197,94,0.1)", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
              <Phone size={14} color="#16a34a" />
            </a>
          )}
          <Link href={hrefFicha} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(37,211,102,0.1)", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
            <MessageCircle size={14} color="#25D366" />
          </Link>
          <Link href={hrefOb} style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--bg-base)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
            <MessageSquareQuote size={14} color="var(--text-muted)" />
          </Link>
          <button onClick={() => setModal(true)} style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--bg-base)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Bell size={14} color="var(--text-muted)" />
          </button>
        </div>
      </div>
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
  const n = clientes.length;

  return (
    <div className="card" style={{ overflow: "hidden", padding: 0 }}>
      {/* ── Foto del inmueble ── */}
      {inmueble?.imagen ? (
        <div style={{ position: "relative", height: 130, overflow: "hidden" }}>
          <Image src={inmueble.imagen} alt={inmueble.titulo} fill style={{ objectFit: "cover" }} sizes="480px" loading="lazy" />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 60%)" }} />
          <div style={{ position: "absolute", bottom: 10, left: 12, right: 12, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{inmueble.titulo}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>{inmueble.tipo} · {inmueble.barrio || inmueble.ciudad}</div>
            </div>
            <div style={{ background: "var(--red)", color: "#fff", padding: "4px 10px", borderRadius: 20, fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
              {formatearPrecio(inmueble.precio)}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ height: 52, background: "var(--bg-card-hover)", display: "flex", alignItems: "center", padding: "0 16px", gap: 8, borderBottom: "1px solid var(--border)" }}>
          <Home size={16} color="var(--text-muted)" />
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)" }}>Ref: {codigoRef !== "sin-inmueble" ? codigoRef : "Sin inmueble asociado"}</span>
        </div>
      )}

      {/* ── Header del grupo: contador + expand ── */}
      <button
        onClick={() => setExpandido(!expandido)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: "none", border: "none", borderTop: inmueble?.imagen ? "1px solid var(--border)" : "none", cursor: "pointer" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(196,30,58,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Users size={14} color="var(--red)" />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
            {n} {n === 1 ? "cliente interesado" : "clientes interesados"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-muted)" }}>
          <span style={{ fontSize: 11 }}>{expandido ? "Ocultar" : "Ver"}</span>
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
            {clientes.map((c) => (
              <ClienteRow key={c.id} cliente={c} showSeguimiento={showSeguimiento} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
