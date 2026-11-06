'use client';
// src/app/equipo/page.tsx

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Info,
  CheckCircle2,
  Building2,
  ShieldCheck,
  ExternalLink,
  Clock,
  Users,
} from "lucide-react";

import { AGENCIA_L2L, EQUIPO_DEMO_L2L, AGENTE_PATRICIA } from "@/lib/agente";
import { useInmuebles } from "@/hooks/useInmuebles";
import {
  getRecordatorios,
  getRecordatoriosPendientes,
} from "@/lib/recordatorios";

interface PortalMetric {
  nombre: string;
  porcentaje: number;
  leadsMes: number;
  slaPromedioMin: number;
}

const PORTALES_ORIGEN_L2L: PortalMetric[] = [
  { nombre: "Finca Raíz", porcentaje: 38, leadsMes: 32, slaPromedioMin: 9 },
  { nombre: "Metrocuadrado", porcentaje: 29, leadsMes: 24, slaPromedioMin: 11 },
  { nombre: "Ciencuadras", porcentaje: 19, leadsMes: 16, slaPromedioMin: 12 },
  { nombre: "Proppit / Web L2L", porcentaje: 14, leadsMes: 11, slaPromedioMin: 8 },
];

const BENEFICIOS_DOMUS_API = [
  {
    titulo: "Webhooks en tiempo real (contact.created)",
    descripcion:
      "Alerta push en menos de 5 segundos cuando entra un lead de portal inmobiliario para contactar en caliente.",
  },
  {
    titulo: "Escritura automática de bitácora (POST /api/follows)",
    descripcion:
      "Cada WhatsApp enviado desde SalesHelper queda registrado automáticamente en el historial oficial de Domus sin doble digitación.",
  },
  {
    titulo: "Cero uso de contraseñas individuales",
    descripcion:
      "Tokens oficiales revocables por asesor gestionados centralmente por la dirección de L2L.",
  },
] as const;

export default function EquipoAgencyPage() {
  const { inmuebles, isLoading } = useInmuebles();
  const [avatarError, setAvatarError] = useState(false);
  const [pendientesPatricia, setPendientesPatricia] = useState(0);
  const [totalRecordatoriosPatricia, setTotalRecordatoriosPatricia] = useState(0);

  useEffect(() => {
    const syncLocalMetrics = () => {
      setPendientesPatricia(getRecordatoriosPendientes().length);
      setTotalRecordatoriosPatricia(getRecordatorios().length);
    };

    syncLocalMetrics();
    window.addEventListener("sh-recordatorios-changed", syncLocalMetrics);
    window.addEventListener("storage", syncLocalMetrics);
    return () => {
      window.removeEventListener("sh-recordatorios-changed", syncLocalMetrics);
      window.removeEventListener("storage", syncLocalMetrics);
    };
  }, []);

  const patriciaLiveCount =
    !isLoading && inmuebles.length > 0 ? inmuebles.length : 12;

  const equipoHidratado = EQUIPO_DEMO_L2L.map((miembro) => {
    if (miembro.esCuentaActiva && !miembro.esDemo) {
      return {
        ...miembro,
        inmueblesActivos: patriciaLiveCount,
      };
    }
    return miembro;
  });

  const totalInventarioEquipo = equipoHidratado.reduce(
    (acc, m) => acc + m.inmueblesActivos,
    0
  );
  const totalLeadsMesEquipo = equipoHidratado.reduce(
    (acc, m) => acc + m.leadsMes,
    0
  );

  return (
    <div className="page">
      {/* Executive Header */}
      <header
        style={{
          padding: "20px 20px 16px",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <Link
            href="/"
            aria-label="Volver al inicio"
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              textDecoration: "none",
            }}
          >
            <ArrowLeft size={19} />
          </Link>

          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11.5,
                fontWeight: 700,
                color: "var(--red)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                marginBottom: 3,
              }}
            >
              <Building2 size={13} />
              <span>{AGENCIA_L2L.plan}</span>
            </div>
            <h1
              style={{
                fontSize: 23,
                fontWeight: 800,
                color: "var(--text-primary)",
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
              }}
            >
              Panel Agencia · {AGENCIA_L2L.nombre}
            </h1>
            <p
              style={{
                fontSize: 14,
                color: "var(--text-secondary)",
                marginTop: 4,
                lineHeight: 1.4,
              }}
            >
              {AGENCIA_L2L.ciudad} · Visión ejecutiva multi-asesor y trazabilidad
              comercial
            </p>
          </div>
        </div>

        <a
          href={AGENCIA_L2L.sitioWeb}
          target="_blank"
          rel="noopener noreferrer"
          className="workspace-pill"
          style={{
            minHeight: 38,
            padding: "6px 12px",
            textDecoration: "none",
          }}
        >
          <span>{AGENCIA_L2L.crmProveedor}</span>
          <ExternalLink size={13} />
        </a>
      </header>

      {/* Honest Transparency Banner */}
      <section
        aria-label="Nota de transparencia de datos"
        style={{ padding: "0 20px", marginBottom: 18 }}
      >
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderLeft: "3px solid var(--red)",
            borderRadius: 12,
            padding: "13px 15px",
            display: "flex",
            alignItems: "flex-start",
            gap: 11,
          }}
        >
          <Info
            size={18}
            color="var(--red)"
            style={{ flexShrink: 0, marginTop: 2 }}
          />
          <div
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: "var(--text-primary)", fontWeight: 700 }}>
              Transparencia de datos en demostración:
            </strong>{" "}
            La fila de{" "}
            <strong style={{ color: "var(--text-primary)" }}>
              Olga Patricia Vásquez (#29214)
            </strong>{" "}
            muestra su inventario real conectado en vivo (
            <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>
              {isLoading ? "sincronizando..." : `${patriciaLiveCount} inmuebles`}
            </span>{" "}
            desde L2L / Domus). Los demás asesores se presentan como{" "}
            <strong style={{ color: "var(--text-primary)" }}>
              Simulación Multi-Asesor
            </strong>{" "}
            para ilustrar cómo la gerencia de L2L supervisará SLA e inventario al
            conectar{" "}
            <code
              style={{
                fontSize: 12,
                padding: "1px 5px",
                borderRadius: 5,
                background: "var(--bg-base)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            >
              crm_api.domus.la
            </code>
            .
          </div>
        </div>
      </section>

      {/* Agency KPI Strip */}
      <section className="kpi-strip" aria-label="KPIs consolidados de agencia">
        <div className="kpi-cell">
          <span className="kpi-label">Inventario activo equipo</span>
          <span className="kpi-value">{totalInventarioEquipo}</span>
          <span className="kpi-sub">
            {equipoHidratado.length} asesores · {patriciaLiveCount} en vivo
          </span>
        </div>

        <div className="kpi-cell">
          <span className="kpi-label">Respuesta promedio</span>
          <span className="kpi-value" style={{ color: "#16A34A" }}>
            11 min
          </span>
          <span className="kpi-sub">Sector tradicional: 4+ horas</span>
        </div>

        <div className="kpi-cell">
          <span className="kpi-label">Cumplimiento SLA</span>
          <span className="kpi-value">91% al día</span>
          <span className="kpi-sub">{totalLeadsMesEquipo} leads / mes</span>
        </div>
      </section>

      {/* Multi-Broker Leaderboard / Supervision Cards */}
      <section
        aria-label="Supervisión comercial por asesor"
        style={{ marginBottom: 24 }}
      >
        <div className="section-header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Users size={18} color="var(--text-primary)" />
            <h2 className="section-title" style={{ fontSize: 18 }}>
              Desempeño y SLA por asesor
            </h2>
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-muted)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            1 cuenta en vivo · 3 simuladas
          </span>
        </div>

        <div
          style={{
            padding: "0 20px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {equipoHidratado.map((miembro) => {
            const esVivo = Boolean(miembro.esCuentaActiva && !miembro.esDemo);
            const cumplimientoColor =
              miembro.seguimientosAlDiaPct >= 90
                ? "#16A34A"
                : miembro.seguimientosAlDiaPct >= 80
                  ? "#D97706"
                  : "#DC2626";
            const slaRapido = miembro.tiempoRespuestaMin <= 15;

            return (
              <div
                key={miembro.id}
                style={{
                  background: "var(--bg-card)",
                  border: esVivo
                    ? "1.5px solid rgba(196, 30, 58, 0.28)"
                    : "1px solid var(--border)",
                  borderRadius: 16,
                  padding: "16px",
                }}
              >
                {/* Top row: Identity + Status Badge */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    marginBottom: 14,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      minWidth: 0,
                    }}
                  >
                    {esVivo && !avatarError && (miembro.foto || AGENTE_PATRICIA.foto) ? (
                      <Image
                        src={miembro.foto || AGENTE_PATRICIA.foto}
                        alt={miembro.nombreCompleto}
                        width={44}
                        height={44}
                        onError={() => setAvatarError(true)}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: "50%",
                          objectFit: "cover",
                          border: "2px solid var(--red)",
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: "50%",
                          background: esVivo
                            ? "rgba(196, 30, 58, 0.1)"
                            : "var(--bg-base)",
                          border: esVivo
                            ? "1.5px solid var(--border-red)"
                            : "1px solid var(--border)",
                          color: esVivo ? "var(--red)" : "var(--text-secondary)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 14,
                          fontWeight: 800,
                          flexShrink: 0,
                        }}
                      >
                        {miembro.iniciales}
                      </div>
                    )}

                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 15.5,
                            fontWeight: 700,
                            color: "var(--text-primary)",
                          }}
                        >
                          {miembro.nombreCompleto}
                        </span>
                        {esVivo && (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: "var(--text-muted)",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            #{miembro.domusProfileId}
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 12.5,
                          color: "var(--text-secondary)",
                          marginTop: 2,
                        }}
                      >
                        {miembro.zonaPrincipal}
                      </div>
                      {esVivo && totalRecordatoriosPatricia > 0 && (
                        <div
                          style={{
                            fontSize: 11.5,
                            color: "var(--text-muted)",
                            marginTop: 2,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          Cola local:{" "}
                          {pendientesPatricia > 0
                            ? `${pendientesPatricia} pendiente(s) hoy`
                            : "0 pendientes hoy"}
                        </div>
                      )}
                    </div>
                  </div>

                  {esVivo ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 10px",
                        borderRadius: 999,
                        background: "#ECFDF5",
                        border: "1px solid #A7F3D0",
                        color: "#15803D",
                        fontSize: 11.5,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "#16A34A",
                        }}
                      />
                      <span>Cuenta Conectada en Vivo</span>
                    </span>
                  ) : (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "4px 10px",
                        borderRadius: 999,
                        background: "#F3F4F6",
                        border: "1px solid var(--border)",
                        color: "#4B5563",
                        fontSize: 11.5,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Simulación Demo · Simulación Multi-Asesor
                    </span>
                  )}
                </div>

                {/* Metrics Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                    gap: 8,
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "var(--bg-base)",
                    border: "1px solid var(--border)",
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--text-muted)",
                      }}
                    >
                      Inmuebles
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: "var(--text-primary)",
                        fontVariantNumeric: "tabular-nums",
                        marginTop: 2,
                      }}
                    >
                      {esVivo && isLoading ? "—" : miembro.inmueblesActivos}
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--text-muted)",
                      }}
                    >
                      Leads / mes
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: "var(--text-primary)",
                        fontVariantNumeric: "tabular-nums",
                        marginTop: 2,
                      }}
                    >
                      {miembro.leadsMes}
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--text-muted)",
                      }}
                    >
                      SLA Resp.
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: slaRapido ? "#16A34A" : "#D97706",
                        fontVariantNumeric: "tabular-nums",
                        marginTop: 2,
                      }}
                    >
                      {miembro.tiempoRespuestaMin} min
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--text-muted)",
                      }}
                    >
                      Cierres trim.
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: "var(--text-primary)",
                        fontVariantNumeric: "tabular-nums",
                        marginTop: 2,
                      }}
                    >
                      {miembro.cierresTrimestre}
                    </div>
                  </div>
                </div>

                {/* Follow-up Compliance Bar */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: 12,
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        color: "var(--text-secondary)",
                      }}
                    >
                      Cumplimiento de seguimientos
                    </span>
                    <span
                      style={{
                        fontWeight: 800,
                        color: cumplimientoColor,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {miembro.seguimientosAlDiaPct}%
                    </span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: 6,
                      borderRadius: 999,
                      background: "#F3F4F6",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${miembro.seguimientosAlDiaPct}%`,
                        height: "100%",
                        borderRadius: 999,
                        background: cumplimientoColor,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom 2-Column Executive Section: Portal Velocity + Domus Official API */}
      <section
        aria-label="Portales inmobiliarios e integración API Domus"
        style={{
          padding: "0 20px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
          gap: 16,
          alignItems: "stretch",
        }}
      >
        {/* Portal Lead Velocity Breakdown */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: "18px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                marginBottom: 6,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <Clock size={16} color="var(--red)" />
                <h3
                  style={{
                    fontSize: 15.5,
                    fontWeight: 800,
                    color: "var(--text-primary)",
                  }}
                >
                  Velocidad de atención por portal
                </h3>
              </div>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: "var(--bg-base)",
                  border: "1px solid var(--border)",
                  color: "var(--text-muted)",
                }}
              >
                Simulación L2L
              </span>
            </div>

            <p
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                lineHeight: 1.45,
                marginBottom: 16,
              }}
            >
              Distribución mensual de leads entrantes y tiempo medio hasta el
              primer WhatsApp con ficha técnica.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              {PORTALES_ORIGEN_L2L.map((portal) => (
                <div key={portal.nombre}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      fontSize: 13,
                      marginBottom: 5,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        color: "var(--text-primary)",
                      }}
                    >
                      {portal.nombre}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      <strong style={{ color: "var(--text-primary)" }}>
                        {portal.porcentaje}%
                      </strong>{" "}
                      · {portal.leadsMes} leads · SLA {portal.slaPromedioMin} min
                    </span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: 7,
                      borderRadius: 999,
                      background: "var(--bg-base)",
                      border: "1px solid var(--border)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${portal.porcentaje}%`,
                        height: "100%",
                        borderRadius: 999,
                        background: "var(--red)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              marginTop: 18,
              paddingTop: 12,
              borderTop: "1px solid var(--border)",
              fontSize: 12,
              color: "var(--text-muted)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            Meta operativa L2L: responder el 100% de portales en menos de 15 min.
          </div>
        </div>

        {/* Official Domus API Readiness Card */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderTop: "3px solid var(--red)",
            borderRadius: 16,
            padding: "18px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "3px 9px",
                borderRadius: 999,
                background: "rgba(196, 30, 58, 0.08)",
                color: "var(--red)",
                fontSize: 11,
                fontWeight: 700,
                marginBottom: 10,
              }}
            >
              <ShieldCheck size={13} />
              <span>Escalabilidad Corporativa B2B</span>
            </div>

            <h3
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: "var(--text-primary)",
                lineHeight: 1.3,
                marginBottom: 14,
              }}
            >
              Arquitectura lista para Integración Oficial Domus API (
              <code
                style={{
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: "var(--red)",
                }}
              >
                crm_api.domus.la
              </code>
              )
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {BENEFICIOS_DOMUS_API.map((item) => (
                <div
                  key={item.titulo}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 11,
                    background: "var(--bg-base)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <CheckCircle2
                    size={17}
                    color="#16A34A"
                    style={{ flexShrink: 0, marginTop: 2 }}
                  />
                  <div style={{ fontSize: 12.5, lineHeight: 1.45 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        color: "var(--text-primary)",
                        marginBottom: 2,
                      }}
                    >
                      {item.titulo}
                    </div>
                    <div style={{ color: "var(--text-secondary)" }}>
                      {item.descripcion}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              paddingTop: 12,
              borderTop: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              fontSize: 12,
              color: "var(--text-secondary)",
            }}
          >
            <span>Compatible con Inmobiliaria #607</span>
            <Link
              href="/clientes"
              style={{
                fontWeight: 700,
                color: "var(--red)",
                textDecoration: "none",
              }}
            >
              Ver CRM actual →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
