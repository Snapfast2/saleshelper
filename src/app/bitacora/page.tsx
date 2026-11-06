'use client';

import React, { useEffect, useMemo, useState } from "react";
import {
  MessageCircle,
  MessageSquare,
  MessageSquarePlus,
  FileText,
  RefreshCw,
  CalendarCheck,
  Building2,
  Clock,
  CheckCircle2,
  Search,
  X,
} from "lucide-react";
import { getFirestoreDb } from "@/lib/firebase";

interface FirestoreTimestampLike {
  toDate?: () => Date;
  seconds?: number;
}

interface Interaccion {
  id: string;
  cliente_nombre: string;
  cliente_telefono: string;
  inmueble_id: string;
  inmueble_titulo: string;
  tipo_mensaje: string;
  fecha: FirestoreTimestampLike | string | number | null;
}

type FiltroTipo = "todos" | "primer-contacto" | "ficha" | "seguimiento" | "visita";

const FILTROS_TIPO: { id: FiltroTipo; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "primer-contacto", label: "Primer contacto" },
  { id: "ficha", label: "Ficha" },
  { id: "seguimiento", label: "Seguimiento" },
  { id: "visita", label: "Visita" },
];

function extraerFecha(raw: Interaccion["fecha"]): Date | null {
  if (!raw) return null;
  if (typeof raw === "object") {
    if (typeof raw.toDate === "function") {
      const d = raw.toDate();
      return Number.isNaN(d.getTime()) ? null : d;
    }
    if (typeof raw.seconds === "number") {
      return new Date(raw.seconds * 1000);
    }
  }
  if (typeof raw === "string" || typeof raw === "number") {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function esMismoDiaLocal(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function obtenerEstiloTipo(tipoMensaje: string) {
  const t = (tipoMensaje || "").toLowerCase();
  if (t.includes("primer")) {
    return {
      Icon: MessageSquarePlus,
      color: "#16a34a",
      bg: "rgba(22, 163, 74, 0.1)",
      border: "rgba(22, 163, 74, 0.22)",
    };
  }
  if (t.includes("ficha")) {
    return {
      Icon: FileText,
      color: "var(--red)",
      bg: "rgba(196, 30, 58, 0.09)",
      border: "rgba(196, 30, 58, 0.22)",
    };
  }
  if (t.includes("visita") || t.includes("cita")) {
    return {
      Icon: CalendarCheck,
      color: "#b45309",
      bg: "rgba(217, 119, 6, 0.11)",
      border: "rgba(217, 119, 6, 0.25)",
    };
  }
  if (t.includes("seguimiento") || t.includes("reactiva")) {
    return {
      Icon: RefreshCw,
      color: "#2563eb",
      bg: "rgba(37, 99, 235, 0.09)",
      border: "rgba(37, 99, 235, 0.22)",
    };
  }
  return {
    Icon: MessageCircle,
    color: "#15803d",
    bg: "rgba(37, 211, 102, 0.1)",
    border: "rgba(37, 211, 102, 0.24)",
  };
}

function coincideFiltroTipo(tipoMensaje: string, filtro: FiltroTipo): boolean {
  if (filtro === "todos") return true;
  const t = (tipoMensaje || "").toLowerCase();
  if (filtro === "primer-contacto") return t.includes("primer");
  if (filtro === "ficha") return t.includes("ficha");
  if (filtro === "seguimiento") return t.includes("seguimiento") || t.includes("reactiva");
  if (filtro === "visita") return t.includes("visita") || t.includes("cita");
  return true;
}

export default function BitacoraPage() {
  const [registros, setRegistros] = useState<Interaccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("todos");

  useEffect(() => {
    let unsub: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      const [db, { collection, query, orderBy, onSnapshot, limit }] = await Promise.all([
        getFirestoreDb(),
        import("firebase/firestore"),
      ]);
      if (cancelled) return;
      if (!db) {
        setLoading(false);
        return;
      }

      const q = query(
        collection(db, "interacciones_ws"),
        orderBy("fecha", "desc"),
        limit(50)
      );

      unsub = onSnapshot(
        q,
        (snapshot) => {
          const data: Interaccion[] = [];
          snapshot.forEach((doc) => {
            data.push({ id: doc.id, ...doc.data() } as Interaccion);
          });
          setRegistros(data);
          setLoading(false);
        },
        () => setLoading(false)
      );
    })();

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, []);

  const resumen = useMemo(() => {
    const hoy = new Date();
    let enviadosHoy = 0;
    const inmueblesSet = new Set<string>();

    for (const r of registros) {
      const fecha = extraerFecha(r.fecha);
      if (fecha && esMismoDiaLocal(fecha, hoy)) {
        enviadosHoy += 1;
      }
      if (r.inmueble_id && r.inmueble_id !== "sin-inmueble") {
        inmueblesSet.add(String(r.inmueble_id));
      }
    }

    return {
      total: registros.length,
      hoy: enviadosHoy,
      inmueblesTrabajados: inmueblesSet.size,
    };
  }, [registros]);

  const registrosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, "");

    return registros.filter((it) => {
      if (!coincideFiltroTipo(it.tipo_mensaje, filtroTipo)) {
        return false;
      }
      if (!q) return true;

      const nombre = (it.cliente_nombre || "").toLowerCase();
      const telClean = (it.cliente_telefono || "").replace(/\D/g, "");
      const inmTitulo = (it.inmueble_titulo || "").toLowerCase();
      const inmId = String(it.inmueble_id || "").toLowerCase();
      const tipo = (it.tipo_mensaje || "").toLowerCase();

      return (
        nombre.includes(q) ||
        (qDigits.length > 0 && telClean.includes(qDigits)) ||
        inmTitulo.includes(q) ||
        inmId.includes(q) ||
        tipo.includes(q)
      );
    });
  }, [registros, busqueda, filtroTipo]);

  const formatTiempo = (raw: Interaccion["fecha"]) => {
    const date = extraerFecha(raw);
    if (!date) return { relativo: "Justo ahora", hora: "" };

    const ahora = new Date();
    const diff = Math.max(0, ahora.getTime() - date.getTime());
    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(diff / 3600000);
    const dias = Math.floor(diff / 86400000);

    let relativo: string;
    if (minutos < 1) {
      relativo = "Justo ahora";
    } else if (minutos < 60) {
      relativo = `Hace ${minutos} min`;
    } else if (horas < 24 && esMismoDiaLocal(date, ahora)) {
      relativo = `Hace ${horas} h`;
    } else if (dias === 1 || (horas < 48 && !esMismoDiaLocal(date, ahora))) {
      relativo = "Ayer";
    } else {
      relativo = new Intl.DateTimeFormat("es-CO", {
        day: "numeric",
        month: "short",
      }).format(date);
    }

    const hora = date.toLocaleTimeString("es-CO", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    return { relativo, hora };
  };

  const formatNombreLegible = (raw: string) => {
    const parts = (raw || "Cliente").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "Cliente";
    return parts.slice(0, 2).join(" ").toLowerCase();
  };

  const reanudarChat = (telefono: string) => {
    if (!telefono) return;
    let num = telefono.replace(/\D/g, "");
    if (num.length === 10 && num.startsWith("3")) {
      num = `57${num}`;
    }
    window.open(`https://wa.me/${num}`, "_blank", "noopener,noreferrer");
  };

  const hayFiltroActivo = Boolean(busqueda.trim() || filtroTipo !== "todos");

  return (
    <div className="page" style={{ paddingBottom: 100 }}>
      <div className="header" style={{ paddingBottom: 14 }}>
        <div>
          <h1 className="header-title">Actividad Comercial</h1>
          <p className="header-sub">
            Bitácora ejecutiva en tiempo real de envíos por WhatsApp
          </p>
        </div>
      </div>

      {/* Resumen ejecutivo honesto calculado desde los registros */}
      <div className="kpi-strip" style={{ marginBottom: 14 }}>
        <div className="kpi-cell">
          <span className="kpi-label">Total registrados</span>
          <span className="kpi-value">{loading ? "—" : resumen.total}</span>
          <span className="kpi-sub">Últimos 50 envíos</span>
        </div>
        <div className="kpi-cell">
          <span className="kpi-label">Hoy</span>
          <span className="kpi-value" style={{ color: resumen.hoy > 0 ? "#16a34a" : undefined }}>
            {loading ? "—" : resumen.hoy}
          </span>
          <span className="kpi-sub">Gestiones del día</span>
        </div>
        <div className="kpi-cell">
          <span className="kpi-label">Inmuebles trabajados</span>
          <span className="kpi-value">{loading ? "—" : resumen.inmueblesTrabajados}</span>
          <span className="kpi-sub">Referencias únicas</span>
        </div>
      </div>

      {/* Barra sticky de búsqueda + filtros 0ms */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "rgba(249, 250, 251, 0.94)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          padding: "8px 20px 12px",
          marginBottom: 14,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ position: "relative", marginBottom: 10 }}>
          <Search
            size={17}
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            inputMode="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Filtrar por cliente, teléfono, inmueble o tipo..."
            className="form-input"
            style={{
              paddingLeft: 40,
              paddingRight: busqueda.length > 0 ? 42 : 14,
              fontSize: 15.5,
              height: 44,
              background: "var(--bg-card)",
            }}
          />
          {busqueda.length > 0 && (
            <button
              type="button"
              onClick={() => setBusqueda("")}
              aria-label="Limpiar búsqueda"
              style={{
                position: "absolute",
                right: 6,
                top: "50%",
                transform: "translateY(-50%)",
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: "1px solid var(--border)",
                background: "var(--bg-base)",
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            scrollbarWidth: "none",
          }}
        >
          {FILTROS_TIPO.map((f) => {
            const activo = filtroTipo === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltroTipo(f.id)}
                className={`quick-chip ${activo ? "active" : ""}`}
                style={{
                  minHeight: 34,
                  padding: "5px 12px",
                  fontSize: 12.5,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cuerpo principal */}
      <div style={{ padding: "0 20px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)" }}>
            <div className="spinner" style={{ margin: "0 auto 14px" }} />
            <p style={{ fontWeight: 600, fontSize: 15, color: "var(--text-secondary)" }}>
              Sincronizando actividad comercial...
            </p>
          </div>
        ) : registros.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "48px 24px",
              background: "var(--bg-card)",
              borderRadius: 16,
              border: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: "var(--bg-base)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 14px",
              }}
            >
              <MessageSquare size={26} color="var(--text-muted)" />
            </div>
            <p style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 17 }}>
              Sin actividad registrada aún
            </p>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 6, lineHeight: 1.5 }}>
              Cuando envíes un mensaje comercial por WhatsApp a un cliente, aparecerá aquí automáticamente.
            </p>
          </div>
        ) : registrosFiltrados.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "44px 24px",
              background: "var(--bg-card)",
              borderRadius: 16,
              border: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: "var(--bg-base)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px",
              }}
            >
              <MessageSquare size={24} color="var(--text-muted)" />
            </div>
            <p style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 16 }}>
              Sin coincidencias para este filtro
            </p>
            <p style={{ color: "var(--text-secondary)", fontSize: 13.5, marginTop: 4 }}>
              Intenta con otro término o restablece los filtros activos.
            </p>
            {hayFiltroActivo && (
              <button
                type="button"
                onClick={() => {
                  setBusqueda("");
                  setFiltroTipo("todos");
                }}
                className="btn-secondary"
                style={{
                  width: "auto",
                  minHeight: 40,
                  padding: "8px 16px",
                  fontSize: 13.5,
                  margin: "16px auto 0",
                }}
              >
                <X size={15} />
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="crm-grid">
            {registrosFiltrados.map((it) => {
              const estilo = obtenerEstiloTipo(it.tipo_mensaje);
              const IconTipo = estilo.Icon;
              const { relativo, hora } = formatTiempo(it.fecha);
              const tieneInmueble = Boolean(it.inmueble_id && it.inmueble_id !== "sin-inmueble");

              return (
                <div
                  key={it.id}
                  style={{
                    background: "var(--bg-card)",
                    borderRadius: 16,
                    padding: "15px 16px",
                    border: "1px solid var(--border)",
                    position: "relative",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 3.5,
                      background: estilo.color,
                    }}
                  />

                  {/* Cabecera: icono de tipo + cliente + fecha/hora + badge */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 10,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 11, minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 11,
                          background: estilo.bg,
                          border: `1px solid ${estilo.border}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <IconTipo size={18} color={estilo.color} />
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <h3
                          style={{
                            fontSize: 15.5,
                            fontWeight: 800,
                            color: "#111827",
                            margin: 0,
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            textTransform: "capitalize",
                          }}
                        >
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {formatNombreLegible(it.cliente_nombre)}
                          </span>
                          <CheckCircle2 size={14} color="#16a34a" style={{ flexShrink: 0 }} />
                        </h3>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            marginTop: 3,
                            color: "#374151",
                            fontSize: 12.5,
                            fontWeight: 500,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          <Clock size={12} color="var(--text-muted)" />
                          <span>{relativo}</span>
                          {hora && (
                            <>
                              <span style={{ color: "var(--text-muted)" }}>·</span>
                              <span style={{ color: "var(--text-muted)" }}>{hora}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        background: estilo.bg,
                        color: estilo.color,
                        border: `1px solid ${estilo.border}`,
                        padding: "4px 9px",
                        borderRadius: 999,
                        fontSize: 11.5,
                        fontWeight: 700,
                        flexShrink: 0,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {it.tipo_mensaje || "Mensaje"}
                    </span>
                  </div>

                  {/* Inmueble asociado (cero emojis, icono Building2) */}
                  {tieneInmueble && (
                    <div
                      style={{
                        fontSize: 13,
                        color: "#374151",
                        background: "var(--bg-base)",
                        border: "1px solid var(--border)",
                        padding: "9px 12px",
                        borderRadius: 11,
                        display: "flex",
                        alignItems: "center",
                        gap: 9,
                      }}
                    >
                      <Building2 size={15} color="var(--red)" style={{ flexShrink: 0 }} />
                      <div
                        style={{
                          fontWeight: 600,
                          lineHeight: 1.35,
                          flex: 1,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {it.inmueble_titulo || `Inmueble Ref ${it.inmueble_id}`}
                      </div>
                    </div>
                  )}

                  {/* Acción rápida wa.me */}
                  <button
                    type="button"
                    onClick={() => reanudarChat(it.cliente_telefono)}
                    disabled={!it.cliente_telefono}
                    style={{
                      width: "100%",
                      minHeight: 42,
                      padding: "9px 14px",
                      borderRadius: 11,
                      background: it.cliente_telefono ? "rgba(37, 211, 102, 0.1)" : "var(--bg-base)",
                      color: it.cliente_telefono ? "#15803d" : "var(--text-muted)",
                      border: it.cliente_telefono
                        ? "1px solid rgba(37, 211, 102, 0.28)"
                        : "1px solid var(--border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 7,
                      fontWeight: 700,
                      fontSize: 13.5,
                      cursor: it.cliente_telefono ? "pointer" : "not-allowed",
                    }}
                  >
                    <MessageCircle size={15} />
                    Volver a escribir
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
