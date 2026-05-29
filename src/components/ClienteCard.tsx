'use client';
// src/components/ClienteCard.tsx
// Tarjeta interactiva de cliente — maneja WhatsApp, Objeciones y Recordatorios

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Globe, Hash, Bell, X, CheckCircle, MessageSquareQuote } from "lucide-react";
import Link from "next/link";
import type { Cliente } from "@/types";
import {
  addRecordatorio,
  calcularFechaRecordatorio,
} from "@/lib/recordatorios";

// ─── Helpers ──────────────────────────────────────────────────────────
function formatearFecha(isoString: string) {
  const d = new Date(isoString);
  return d.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function obtenerTiempoTranscurrido(isoString: string) {
  const fecha = new Date(isoString);
  const ahora = new Date();
  const diferenciaMs = ahora.getTime() - fecha.getTime();
  if (diferenciaMs < 0) return "Recientemente";
  const minutos = Math.floor(diferenciaMs / (1000 * 60));
  const horas = Math.floor(diferenciaMs / (1000 * 60 * 60));
  const dias = Math.floor(diferenciaMs / (1000 * 60 * 60 * 24));
  if (minutos < 1) return "Hace unos instantes";
  if (minutos < 60) return `Hace ${minutos} min`;
  if (horas < 24) return `Hace ${horas} ${horas === 1 ? "hora" : "horas"}`;
  return `Hace ${dias} ${dias === 1 ? "día" : "días"}`;
}

function formatearDiasSeguimiento(dias: number) {
  if (dias === 0) return { text: "Hoy", color: "var(--red)", bg: "rgba(196,30,58,0.1)" };
  if (dias > 0)
    return { text: `En ${dias} ${dias === 1 ? "día" : "días"}`, color: "#D97706", bg: "rgba(217,119,6,0.1)" };
  const absDias = Math.abs(dias);
  return { text: `Vencido hace ${absDias} ${absDias === 1 ? "día" : "días"}`, color: "#DC2626", bg: "rgba(220,38,38,0.1)" };
}

// ─── Opciones de recordatorio ─────────────────────────────────────────
const OPCIONES_RECORDATORIO = [
  { value: "hoy" as const, label: "Esta tarde", emoji: "⚡" },
  { value: "1dia" as const, label: "Mañana", emoji: "📅" },
  { value: "3dias" as const, label: "En 3 días", emoji: "🕐" },
  { value: "7dias" as const, label: "En 1 semana", emoji: "📆" },
];

// ─── Modal via Portal (escapa el stacking context de Framer Motion) ────
interface ModalProps {
  nombre: string;
  recordatorioGuardado: boolean;
  opcionElegida: string | null;
  onClose: () => void;
  onElegir: (op: "hoy" | "1dia" | "3dias" | "7dias") => void;
}

function RecordatorioModal({ nombre, recordatorioGuardado, opcionElegida, onClose, onElegir }: ModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      <>
        {/* Overlay */}
        <motion.div
          key="overlay"
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
            WebkitBackdropFilter: "blur(4px)",
          }}
        />
        {/* Sheet */}
        <motion.div
          key="sheet"
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
            width: "100%",
            background: "var(--bg-card)",
            borderRadius: "24px 24px 0 0",
            padding: "24px 20px",
            paddingBottom: "calc(24px + env(safe-area-inset-bottom, 16px))",
            zIndex: 9999,
            boxShadow: "0 -8px 48px rgba(0,0,0,0.2)",
          }}
        >
          {/* Drag handle */}
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--border)", margin: "0 auto 20px" }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "700", margin: 0 }}>
              🔔 Recordar a {nombre}
            </h3>
            <button
              onClick={onClose}
              style={{
                padding: 8,
                borderRadius: "50%",
                background: "var(--bg-base)",
                border: "1px solid var(--border)",
                display: "flex",
                cursor: "pointer",
              }}
            >
              <X size={18} color="var(--text-secondary)" />
            </button>
          </div>

          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "20px" }}>
            ¿Cuándo quieres que te recuerde hacer seguimiento?
          </p>

          {recordatorioGuardado ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                justifyContent: "center",
                padding: "28px 20px",
                color: "#16a34a",
                fontWeight: "700",
                fontSize: "17px",
              }}
            >
              <CheckCircle size={32} color="#16a34a" />
              ¡Recordatorio guardado!
            </motion.div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {OPCIONES_RECORDATORIO.map((op) => (
                <motion.button
                  key={op.value}
                  onClick={() => onElegir(op.value)}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    padding: "16px",
                    borderRadius: "14px",
                    border: `1px solid ${opcionElegida === op.value ? "var(--border-red)" : "var(--border)"}`,
                    background: opcionElegida === op.value ? "var(--red-glow)" : "var(--bg-base)",
                    cursor: "pointer",
                    fontSize: "15px",
                    fontWeight: "600",
                    color: "var(--text-primary)",
                    textAlign: "left",
                    width: "100%",
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                >
                  <span style={{ fontSize: "24px" }}>{op.emoji}</span>
                  {op.label}
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
  showSeguimiento?: boolean;
}

export default function ClienteCard({ cliente, showSeguimiento = false }: ClienteCardProps) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [recordatorioGuardado, setRecordatorioGuardado] = useState(false);
  const [opcionElegida, setOpcionElegida] = useState<string | null>(null);

  const telefonoCompleto = cliente.telefono
    ? `${cliente.telefonoIndicativo.replace(/\D/g, "")}${cliente.telefono.replace(/\D/g, "")}`
    : "";

  const nombrePrimero = cliente.nombre.toLowerCase().split(" ")[0];
  const nombreCapitalizado = nombrePrimero.charAt(0).toUpperCase() + nombrePrimero.slice(1);

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
    // Guardar también en el servidor para push notifications
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
    } catch (_) {/* no bloquear si falla */}

    setOpcionElegida(opcion);
    setRecordatorioGuardado(true);
    setTimeout(() => {
      setModalAbierto(false);
      setRecordatorioGuardado(false);
      setOpcionElegida(null);
    }, 1500);
  };

  // Links pre-cargados
  const hrefFicha = `/whatsapp?inmueble=${encodeURIComponent(cliente.inmuebleInteres)}&cliente=${encodeURIComponent(cliente.nombre)}${telefonoCompleto ? `&telefono=${telefonoCompleto}` : ""}`;
  const hrefObjeciones = `/respuestas?cliente=${encodeURIComponent(nombreCapitalizado)}${telefonoCompleto ? `&telefono=${telefonoCompleto}` : ""}`;

  const infoSeguimiento =
    cliente.diasSeguimiento !== undefined
      ? formatearDiasSeguimiento(cliente.diasSeguimiento)
      : null;

  return (
    <>
      <div className="card" style={{ padding: "16px" }}>
        {/* ─ Header ─ */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: "var(--text-primary)", textTransform: "capitalize", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {cliente.nombre.toLowerCase()}
            </h3>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
              Llegó: <strong style={{ color: "var(--text-primary)" }}>{obtenerTiempoTranscurrido(cliente.fecha)}</strong>{" "}
              <span style={{ color: "var(--text-muted)" }}>({formatearFecha(cliente.fecha)})</span>
            </div>
          </div>
          <div style={{
            background: "rgba(196,30,58,0.1)",
            color: "var(--red)",
            padding: "4px 10px",
            borderRadius: "20px",
            fontSize: "11px",
            fontWeight: "600",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            flexShrink: 0,
            marginLeft: "8px",
          }}>
            <Globe size={13} />
            {cliente.origen}
          </div>
        </div>

        {/* ─ Badges ─ */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "var(--bg-base)", border: "1px solid var(--border)", padding: "4px 8px", borderRadius: "6px", fontSize: "12px", color: "var(--text-secondary)" }}>
            <Hash size={13} />
            Ref: {cliente.inmuebleInteres}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "var(--bg-base)", border: "1px solid var(--border)", padding: "4px 8px", borderRadius: "6px", fontSize: "12px", color: "var(--text-secondary)" }}>
            {cliente.estado}
          </span>
          {showSeguimiento && infoSeguimiento && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: infoSeguimiento.bg, color: infoSeguimiento.color, border: `1px solid ${infoSeguimiento.color}33`, padding: "4px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: "600" }}>
              Seguimiento: {infoSeguimiento.text}
            </span>
          )}
        </div>

        {/* ─ Action Buttons ─ */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          {cliente.inmuebleInteres && cliente.inmuebleInteres !== "N/A" && (
            <Link
              href={hrefFicha}
              className="btn-ws"
              style={{ width: "fit-content", padding: "8px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: "600", height: "auto" }}
            >
              <MessageCircle size={14} />
              Responder con Ficha
            </Link>
          )}

          <Link
            href={hrefObjeciones}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: "600",
              background: "var(--bg-base)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              height: "auto",
              textDecoration: "none",
            }}
          >
            <MessageSquareQuote size={14} />
            Objeciones
          </Link>

          <button
            onClick={() => setModalAbierto(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: "600",
              background: "var(--bg-base)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            <Bell size={14} />
            Recordar
          </button>
        </div>
      </div>

      {/* Modal via Portal — escapa cualquier stacking context de Framer Motion */}
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
