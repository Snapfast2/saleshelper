'use client';
// src/components/InmuebleGroup.tsx
// Agrupa visualmente los clientes interesados en el mismo inmueble

import React, { useState, useEffect, useMemo, memo } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { Drawer } from "vaul";
import { toast } from "sonner";
import {
  MessageCircle,
  Bell,
  X,
  Check,
  CheckCircle,
  MessageSquareQuote,
  Phone,
  Mail,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Users,
  Home,
  Zap,
  Sun,
  Calendar,
  CalendarDays,
  Clock,
  AlertTriangle,
  Snowflake,
  Key,
  Flame,
  Star,
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

  if (hrs < 5) return { label: "Nuevo", Icon: Zap, color: "#16a34a", bg: "rgba(22,163,74,0.07)", border: "rgba(22,163,74,0.18)", tiempo };
  if (dias < 1) return { label: "Hoy", Icon: Sun, color: "#16a34a", bg: "rgba(22,163,74,0.07)", border: "rgba(22,163,74,0.18)", tiempo };
  if (dias < 2) return { label: "Pendiente", Icon: Clock, color: "#ea580c", bg: "rgba(234,88,12,0.07)", border: "rgba(234,88,12,0.18)", tiempo };
  if (dias < 7) return { label: "Urgente", Icon: AlertTriangle, color: "#dc2626", bg: "rgba(220,38,38,0.07)", border: "rgba(220,38,38,0.18)", tiempo };
  return { label: "Sin gestión", Icon: Snowflake, color: "#991b1b", bg: "rgba(153,27,27,0.07)", border: "rgba(153,27,27,0.18)", tiempo };
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

  if (hrs < 5) return { label: "Nuevo", Icon: Zap, color: "#16a34a", bg: "rgba(22,163,74,0.07)", border: "rgba(22,163,74,0.18)", tiempo };
  if (dias < 1) return { label: "Hoy", Icon: Sun, color: "#16a34a", bg: "rgba(22,163,74,0.07)", border: "rgba(22,163,74,0.18)", tiempo };
  if (pct >= 70) return { label: "Al cierre", Icon: Star, color: "#b45309", bg: "rgba(180,83,9,0.08)", border: "rgba(180,83,9,0.2)", tiempo };

  if (pct >= 40) {
    if (segVencido) return { label: "Pendiente", Icon: AlertTriangle, color: "#ea580c", bg: "rgba(234,88,12,0.07)", border: "rgba(234,88,12,0.2)", tiempo };
    return { label: "En proceso", Icon: Clock, color: "#2563eb", bg: "rgba(37,99,235,0.07)", border: "rgba(37,99,235,0.2)", tiempo };
  }

  if (segVencido) return { label: "Frío", Icon: Snowflake, color: "#0369a1", bg: "rgba(3,105,161,0.07)", border: "rgba(3,105,161,0.2)", tiempo };
  return { label: "Perfilando", Icon: CalendarDays, color: "#475569", bg: "rgba(71,85,105,0.07)", border: "rgba(71,85,105,0.2)", tiempo };
}

function formatearNombreCorto(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Cliente";
  if (parts.length === 1) return parts[0].toLowerCase();
  return `${parts[0]} ${parts[1]}`.toLowerCase();
}

function tieneRecordatorioGuardado(clienteId: string | number): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw =
      window.localStorage.getItem("saleshelper_recordatorios_v1") ||
      window.localStorage.getItem("saleshelper_recordatorios");
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return false;
    return parsed.some(
      (r: { clienteId?: string | number; completado?: boolean }) =>
        String(r?.clienteId) === String(clienteId) && !r?.completado
    );
  } catch {
    return false;
  }
}

// ─── Opciones recordatorio (100% SVG Lucide, cero emojis) ──────────────
type OpcionRecordatorioKey = "hoy" | "1dia" | "3dias" | "7dias";

const OPCIONES_RECORDATORIO: {
  value: OpcionRecordatorioKey;
  label: string;
  sublabel: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
  bg: string;
}[] = [
  {
    value: "hoy",
    label: "Esta tarde",
    sublabel: "Recordatorio para hoy mismo",
    Icon: Zap,
    color: "#dc2626",
    bg: "rgba(220, 38, 38, 0.1)",
  },
  {
    value: "1dia",
    label: "Mañana",
    sublabel: "Seguimiento mañana a primera hora",
    Icon: Sun,
    color: "#d97706",
    bg: "rgba(217, 119, 6, 0.1)",
  },
  {
    value: "3dias",
    label: "En 3 días",
    sublabel: "Retomar contacto en 72 horas",
    Icon: Calendar,
    color: "#2563eb",
    bg: "rgba(37, 99, 235, 0.1)",
  },
  {
    value: "7dias",
    label: "En 1 semana",
    sublabel: "Revisión la próxima semana",
    Icon: CalendarDays,
    color: "#7c3aed",
    bg: "rgba(124, 58, 237, 0.1)",
  },
];

// ─── Modal de recordatorio (Vaul Bottom Sheet) ─────────────────────────
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
  onElegir: (op: OpcionRecordatorioKey) => void;
}) {
  return (
    <Drawer.Root
      open={true}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="vaul-overlay" />
        <Drawer.Content className="vaul-content">
          <div className="vaul-handle-wrap">
            <div className="vaul-handle" />
          </div>

          <div
            style={{
              padding: "8px 20px 14px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 11,
                  background: "var(--red-glow)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Bell size={18} color="var(--red)" />
              </div>
              <div style={{ minWidth: 0 }}>
                <Drawer.Title
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: "var(--text-primary)",
                    margin: 0,
                    lineHeight: 1.25,
                  }}
                >
                  Recordar a {nombre}
                </Drawer.Title>
                <Drawer.Description
                  style={{
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    margin: "2px 0 0",
                  }}
                >
                  ¿Cuándo quieres hacer el próximo seguimiento?
                </Drawer.Description>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar recordatorio"
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
                flexShrink: 0,
              }}
            >
              <X size={17} color="var(--text-secondary)" />
            </button>
          </div>

          <div className="vaul-scroll-body" style={{ padding: "16px 20px 24px" }}>
            {guardado ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  justifyContent: "center",
                  padding: "28px 20px",
                  color: "#16a34a",
                  fontWeight: 700,
                  fontSize: 18,
                }}
              >
                <CheckCircle size={28} color="#16a34a" />
                <span>Recordatorio agendado</span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {OPCIONES_RECORDATORIO.map((op) => {
                  const IconComp = op.Icon;
                  const activo = elegido === op.value;
                  return (
                    <button
                      key={op.value}
                      type="button"
                      onClick={() => onElegir(op.value)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: "13px 15px",
                        borderRadius: 14,
                        border: `1px solid ${activo ? "var(--border-red)" : "var(--border)"}`,
                        background: activo ? "var(--red-glow)" : "var(--bg-card)",
                        cursor: "pointer",
                        textAlign: "left",
                        width: "100%",
                        transition: "background 0.15s, border-color 0.15s",
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 11,
                          background: op.bg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <IconComp size={19} color={op.color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 15.5,
                            fontWeight: 700,
                            color: "var(--text-primary)",
                          }}
                        >
                          {op.label}
                        </div>
                        <div
                          style={{
                            fontSize: 12.5,
                            color: "var(--text-muted)",
                            marginTop: 2,
                          }}
                        >
                          {op.sublabel}
                        </div>
                      </div>
                      <ChevronRight size={17} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

// ─── Modal de detalle del cliente (Vaul Bottom Sheet) ──────────────────
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
              letterSpacing: "0.06em",
              fontVariantNumeric: "tabular-nums",
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
    tel ? { icon: <Phone size={15} color="var(--red)" />, label: "Teléfono", value: `+${tel}`, href: `tel:+${tel}` } : null,
    cliente.email ? { icon: <Mail size={15} color="#2563eb" />, label: "Correo", value: cliente.email, href: `mailto:${cliente.email}` } : null,
    { icon: <Users size={15} color="#7c3aed" />, label: "Procedencia", value: cliente.origen },
    {
      icon: <Home size={15} color="#ea580c" />,
      label: "Inmueble de interés",
      value: cliente.inmuebleInteres !== "N/A" ? `Ref ${cliente.inmuebleInteres}` : "Sin referencia",
    },
    { icon: <CalendarDays size={15} color="var(--text-secondary)" />, label: "Fecha de ingreso", value: fechaLegible },
  ].filter(Boolean) as { icon: React.ReactNode; label: string; value: string | React.ReactNode; href?: string }[];

  const inicial = (cliente.nombre || "C").charAt(0).toUpperCase();

  return (
    <Drawer.Root
      open={true}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="vaul-overlay" />
        <Drawer.Content className="vaul-content">
          <div className="vaul-handle-wrap">
            <div className="vaul-handle" />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 20px 14px", flexShrink: 0 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                flexShrink: 0,
                background: "linear-gradient(135deg, rgba(196,30,58,0.16), rgba(196,30,58,0.05))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                fontWeight: 800,
                color: "var(--red)",
              }}
            >
              {inicial}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Drawer.Title
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  textTransform: "capitalize",
                  margin: 0,
                  lineHeight: 1.25,
                }}
              >
                {cliente.nombre.toLowerCase()}
              </Drawer.Title>
              <Drawer.Description
                style={{
                  fontSize: 13.5,
                  color: "var(--text-secondary)",
                  margin: "2px 0 0",
                }}
              >
                {cliente.estado}
              </Drawer.Description>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar ficha de cliente"
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
                flexShrink: 0,
              }}
            >
              <X size={17} color="var(--text-secondary)" />
            </button>
          </div>

          {/* Barra de acciones directas (mínimo 44px táctil) */}
          <div style={{ display: "flex", gap: 8, padding: "0 20px 14px", flexShrink: 0 }}>
            {tel && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenWhatsApp();
                }}
                className="btn-ws"
                style={{ flex: 1.35, minHeight: 44, fontSize: 14, padding: "10px 12px" }}
              >
                <MessageCircle size={16} />
                WhatsApp
              </button>
            )}
            {tel && (
              <a
                href={`tel:+${tel}`}
                className="btn-secondary"
                style={{ flex: 1, minHeight: 44, fontSize: 14, padding: "10px 12px", textDecoration: "none" }}
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
              style={{ flex: 1, minHeight: 44, fontSize: 14, padding: "10px 12px" }}
            >
              <Bell size={15} color="var(--red)" />
              Recordar
            </button>
          </div>

          <div style={{ height: 1, background: "var(--border)", flexShrink: 0 }} />

          <div className="vaul-scroll-body" style={{ padding: "8px 0 20px" }}>
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
                    width: 34,
                    height: 34,
                    borderRadius: 10,
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
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {row.label}
                  </div>
                  {row.href ? (
                    <a
                      href={row.href}
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: "var(--red)",
                        textDecoration: "none",
                        display: "block",
                        marginTop: 1,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {row.value}
                    </a>
                  ) : (
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: "#111827",
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
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

// ─── Fila de cliente (compacta, de alto contraste y memoizada) ─────────
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
  const [tieneRecordatorio, setTieneRecordatorio] = useState(false);

  useEffect(() => {
    const syncRecordatorio = () => {
      setTieneRecordatorio(tieneRecordatorioGuardado(cliente.id));
    };
    syncRecordatorio();
    window.addEventListener("storage", syncRecordatorio);
    window.addEventListener("saleshelper:recordatorio-updated", syncRecordatorio);
    return () => {
      window.removeEventListener("storage", syncRecordatorio);
      window.removeEventListener("saleshelper:recordatorio-updated", syncRecordatorio);
    };
  }, [cliente.id]);

  const localDigits = (cliente.telefono || "").replace(/\D/g, "");
  const tel = localDigits
    ? `${(cliente.telefonoIndicativo || "+57").replace(/\D/g, "")}${localDigits}`
    : "";

  const primerNombre = (cliente.nombre || "Cliente").toLowerCase().split(/\s+/)[0] || "cliente";
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

  const handleRecordatorio = async (op: OpcionRecordatorioKey) => {
    const fecha = calcularFechaRecordatorio(op);
    const rec = addRecordatorio({
      clienteId: cliente.id,
      nombre: cliente.nombre,
      telefono: cliente.telefono,
      telefonoIndicativo: cliente.telefonoIndicativo,
      inmuebleInteres: cliente.inmuebleInteres,
      fechaRecordatorio: fecha,
    });

    const opcionMeta = OPCIONES_RECORDATORIO.find((o) => o.value === op);
    const labelSeleccionado = opcionMeta ? opcionMeta.label : op;

    setTieneRecordatorio(true);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("saleshelper:recordatorio-updated"));
    }

    toast.success(`Recordatorio agendado para ${nombreCap}`, {
      description: labelSeleccionado,
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
    } catch {
      // Push opcional si no hay suscripción activa
    }

    setElegido(op);
    setGuardado(true);
    setTimeout(() => {
      setModal(false);
      setGuardado(false);
      setElegido(null);
    }, 650);
  };

  return (
    <>
      <div
        className={esNuevo ? "cliente-row-nuevo" : undefined}
        style={{
          position: "relative",
          padding: "12px 16px",
          borderTop: "1px solid var(--border)",
          overflow: "hidden",
        }}
      >
        {/* Fila superior: Avatar + Nombre legible (#111827) + Metadatos (#374151) */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 11, width: "100%" }}>
          <button
            type="button"
            onClick={() => setDetalle(true)}
            aria-label={`Ver detalle de ${nombreCap}`}
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
                width: 40,
                height: 40,
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
                    return "#475569";
                  }
                  return esCritico ? "#dc2626" : "#ea580c";
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

          <div style={{ flex: 1, minWidth: 0 }}>
            <button
              type="button"
              onClick={() => setDetalle(true)}
              style={{
                fontSize: 15.5,
                fontWeight: 700,
                color: "#111827",
                textTransform: "capitalize",
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 6,
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

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginTop: 4,
                flexWrap: "wrap",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  color: etiqueta.color,
                  background: etiqueta.bg,
                  border: `1px solid ${etiqueta.border}`,
                  padding: "1px 6px 1px 5px",
                  borderRadius: 5,
                  textTransform: "uppercase",
                  letterSpacing: "0.02em",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <etiqueta.Icon size={10} color={etiqueta.color} />
                {etiqueta.label}
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 500, color: "#374151" }}>
                {etiqueta.tiempo} · {cliente.estado}
              </span>
              {seg && (
                <span style={{ fontSize: 12.5, fontWeight: 700, color: seg.color }}>
                  · {seg.text}
                </span>
              )}
              {ultimaInteraccion && (
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: "#15803d",
                    background: "rgba(37, 211, 102, 0.12)",
                    border: "1px solid rgba(37, 211, 102, 0.24)",
                    padding: "1px 6px 1px 5px",
                    borderRadius: 5,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <Check size={10} color="#15803d" />
                  {ultimaInteraccion.tipo}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Barra de acciones rápidas (objetivos táctiles >= 40px) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            marginTop: 10,
            paddingLeft: 51,
          }}
        >
          <button
            type="button"
            disabled={!tel}
            onClick={() => tel && setWaModal(true)}
            aria-label={`Contactar por WhatsApp a ${nombreCap}`}
            style={{
              flex: 1,
              minHeight: 40,
              padding: "0 12px",
              borderRadius: 10,
              background: tel ? "#25D366" : "var(--bg-base)",
              color: tel ? "#FFFFFF" : "var(--text-muted)",
              border: tel ? "none" : "1px solid var(--border)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: tel ? "pointer" : "not-allowed",
              opacity: tel ? 1 : 0.5,
            }}
          >
            <MessageCircle size={15} />
            Contactar
          </button>

          {tel && (
            <a
              href={`tel:+${tel}`}
              aria-label={`Llamar a ${nombreCap}`}
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "rgba(22, 163, 74, 0.08)",
                border: "1px solid rgba(22, 163, 74, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
                flexShrink: 0,
              }}
            >
              <Phone size={16} color="#16a34a" />
            </a>
          )}

          <Link
            href={hrefOb}
            prefetch={false}
            aria-label={`Guion de respuestas para ${nombreCap}`}
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "var(--bg-base)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            <MessageSquareQuote size={16} color="#374151" />
          </Link>

          <button
            type="button"
            onClick={() => setModal(true)}
            aria-label={`Agendar recordatorio para ${nombreCap}`}
            style={{
              position: "relative",
              width: 40,
              height: 40,
              borderRadius: 10,
              background: tieneRecordatorio ? "var(--red-glow)" : "var(--bg-base)",
              border: `1px solid ${tieneRecordatorio ? "var(--border-red)" : "var(--border)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <Bell size={16} color={tieneRecordatorio ? "var(--red)" : "#374151"} />
            {tieneRecordatorio && (
              <span
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--red)",
                  border: "1.5px solid var(--bg-card)",
                }}
              />
            )}
          </button>
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

// ─── Grupo principal (memoizado para fluidez al cambiar tabs/buscar) ───
interface InmuebleGroupProps {
  codigoRef: string;
  inmueble?: Inmueble;
  clientes: Cliente[];
  showSeguimiento: boolean;
  interacciones: InteraccionesMap;
  forceExpand?: boolean;
}

const InmuebleGroup = memo(function InmuebleGroup({
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
    <div
      className="card"
      style={{
        overflow: "hidden",
        padding: 0,
        border: "1px solid var(--border)",
        background: "var(--bg-card)",
      }}
    >
      {/* ── Foto del inmueble o cabecera sobria B2B ── */}
      {inmueble?.imagen && !inmueble.imagen.includes("placeholder") ? (
        <div style={{ position: "relative", height: 132, overflow: "hidden" }}>
          <Image
            src={inmueble.imagen}
            alt={inmueble.titulo}
            fill
            style={{ objectFit: "cover" }}
            sizes="(max-width: 520px) 92vw, 460px"
            loading="lazy"
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to top, rgba(17,24,39,0.82) 0%, rgba(17,24,39,0.12) 62%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 10,
              left: 14,
              right: 14,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: "#fff",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {inmueble.titulo}
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.84)", marginTop: 2 }}>
                {inmueble.tipo} · {inmueble.barrio || inmueble.ciudad}
              </div>
            </div>
            <div
              style={{
                background: "var(--red)",
                color: "#fff",
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: 14,
                fontWeight: 800,
                fontVariantNumeric: "tabular-nums",
                flexShrink: 0,
              }}
            >
              {formatearPrecio(inmueble.precio)}
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            position: "relative",
            height: 120,
            background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "14px 16px",
            color: "#fff",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              right: -20,
              bottom: -30,
              opacity: 0.07,
              transform: "rotate(-10deg)",
              pointerEvents: "none",
            }}
          >
            <Home size={136} color="#fff" strokeWidth={1.5} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", zIndex: 1 }}>
            <span
              style={{
                background: "rgba(255, 255, 255, 0.12)",
                color: "#fff",
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: 11.5,
                fontWeight: 700,
                border: "1px solid rgba(255, 255, 255, 0.16)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              {codigoRef === "sin-inmueble" ? (
                <>
                  <Key size={11} color="#fff" /> General
                </>
              ) : (
                <>
                  <Home size={11} color="#fff" /> Ficha Domus
                </>
              )}
            </span>
          </div>

          <div style={{ zIndex: 1 }}>
            <h4
              style={{
                fontSize: 16,
                fontWeight: 800,
                margin: 0,
                color: "#fff",
                letterSpacing: "-0.01em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {codigoRef === "sin-inmueble" ? "Consulta General" : `Inmueble Ref: ${codigoRef}`}
            </h4>
            <p style={{ fontSize: 12.5, color: "rgba(255, 255, 255, 0.72)", marginTop: 3, fontWeight: 400 }}>
              {codigoRef === "sin-inmueble"
                ? "Interés general en portafolio de servicios"
                : "Propiedad vendida, archivada o captada por otro asesor"}
            </p>
          </div>
        </div>
      )}

      {/* ── Header del grupo: contador tabular-nums + expand ── */}
      <button
        type="button"
        onClick={() => setExpandido(!isExpanded)}
        style={{
          width: "100%",
          minHeight: 46,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          background: "var(--bg-card)",
          border: "none",
          borderTop: "1px solid var(--border)",
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span
            style={{
              minWidth: 28,
              height: 24,
              padding: "0 8px",
              borderRadius: 999,
              background: "var(--red-glow)",
              border: "1px solid var(--border-red)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12.5,
              fontWeight: 800,
              color: "var(--red)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {n}
          </span>
          <span style={{ fontSize: 14.5, fontWeight: 700, color: "#111827" }}>
            {n === 1 ? "cliente interesado" : "clientes interesados"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#374151" }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{isExpanded ? "Ocultar" : "Ver"}</span>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* ── Lista de clientes (sin layout thrashing) ── */}
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
                minHeight: 44,
                padding: "10px 16px",
                background: "none",
                border: "none",
                borderTop: "1px solid var(--border)",
                cursor: "pointer",
                fontSize: 13.5,
                fontWeight: 700,
                color: "var(--red)",
                fontVariantNumeric: "tabular-nums",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
              }}
            >
              {verMasRecientes ? (
                <>
                  <ChevronUp size={14} /> Ocultar recientes
                </>
              ) : (
                <>
                  <ChevronDown size={14} /> Ver {clientesRecientes.length - LIMITE_VISIBLE} más
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
                background: "var(--bg-base)",
                borderTop: "1px solid var(--border)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 800,
                  color: "#374151",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
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
                minHeight: 44,
                padding: "10px 16px",
                background: "none",
                border: "none",
                borderTop: "1px solid var(--border)",
                cursor: "pointer",
                fontSize: 13.5,
                fontWeight: 700,
                color: "#374151",
                fontVariantNumeric: "tabular-nums",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
              }}
            >
              {verMasAntiguos ? (
                <>
                  <ChevronUp size={14} /> Ocultar anteriores
                </>
              ) : (
                <>
                  <ChevronDown size={14} /> Ver {clientesAntiguos.length - LIMITE_VISIBLE} más anteriores
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
});

export default InmuebleGroup;
