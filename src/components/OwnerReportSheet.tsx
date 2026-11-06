'use client';
// src/components/OwnerReportSheet.tsx
// Hoja ejecutiva de Informe Mensual de Gestión Comercial para propietarios (L2L Bienes Raíces).
// Optimizada mobile-first (portada panorámica + KPIs 1+2 + portales con píldoras limpias + firma tocable)
// y exportación directa a PDF A4 en una sola hoja (@media print).

import { useState } from "react";
import {
  Bath,
  BedDouble,
  Building2,
  Calendar,
  Car,
  Compass,
  Eye,
  Mail,
  MapPin,
  Maximize2,
  MessageCircle,
  Phone,
  Users,
} from "lucide-react";
import L2LLogo from "@/components/L2LLogo";
import { AGENTE_PATRICIA } from "@/lib/agente";
import type { InformePropietarioPayload, Inmueble } from "@/types";

export interface OwnerReportSheetProps {
  report: InformePropietarioPayload;
  inmueble?: Inmueble | null;
}

function formatPrecioCOP(valor: number): string {
  return `$ ${new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(valor))}`;
}

function formatFechaEmision(iso: string): string {
  const parsed = iso ? new Date(iso) : new Date();
  const safeDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  return safeDate.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function OwnerReportSheet({
  report,
  inmueble,
}: OwnerReportSheetProps) {
  const [failedPropImg, setFailedPropImg] = useState<string | null>(null);
  const [failedAvatarImg, setFailedAvatarImg] = useState<string | null>(null);

  const rawPropImg = inmueble?.imagen?.trim() || "";
  const showPropImg = Boolean(
    rawPropImg &&
      !rawPropImg.includes("placeholder") &&
      failedPropImg !== rawPropImg
  );

  const rawAvatarImg = AGENTE_PATRICIA.foto?.trim() || "";
  const showAvatarImg = Boolean(
    rawAvatarImg && failedAvatarImg !== rawAvatarImg
  );

  const refCode =
    report.codigoDomus?.trim() ||
    inmueble?.codigoDomus?.trim() ||
    report.inmuebleId;

  const tipoLabel = inmueble?.tipo?.trim() || "Inmueble";
  const gestionLabel = inmueble
    ? inmueble.gestion === "arriendo"
      ? "Arriendo"
      : "Venta"
    : "Venta / Arriendo";

  const ubicacionLabel = inmueble
    ? [inmueble.barrio?.trim(), inmueble.ciudad?.trim()]
        .filter(Boolean)
        .join(", ")
    : "";

  const propietarioNombre = report.nombrePropietario?.trim() || "";
  const periodoEtiqueta =
    report.mesEtiqueta?.trim() || report.mesClave?.trim() || "Periodo actual";

  // Métricas sanitizadas
  const vistasFincaRaiz = Math.max(
    0,
    Math.round(Number(report.vistasFincaRaiz) || 0)
  );
  const contactosFincaRaiz = Math.max(
    0,
    Math.round(Number(report.contactosFincaRaiz) || 0)
  );
  const vistasMetrocuadrado = Math.max(
    0,
    Math.round(Number(report.vistasMetrocuadrado) || 0)
  );
  const contactosMetrocuadrado = Math.max(
    0,
    Math.round(Number(report.contactosMetrocuadrado) || 0)
  );
  const vistasFichaDigital = Math.max(
    0,
    Math.round(Number(report.vistasFichaDigital) || 0)
  );
  const contactosOtrosPortales = Math.max(
    0,
    Math.round(Number(report.contactosOtrosPortales) || 0)
  );
  const citasRealizadas = Math.max(
    0,
    Math.round(Number(report.citasRealizadas) || 0)
  );
  const seguimientosEnviados = Math.max(
    0,
    Math.round(Number(report.seguimientosEnviados) || 0)
  );

  const totalVistas =
    vistasFincaRaiz + vistasMetrocuadrado + vistasFichaDigital;
  const totalContactos =
    contactosFincaRaiz + contactosMetrocuadrado + contactosOtrosPortales;

  const maxPortalVistas = Math.max(
    vistasFincaRaiz,
    vistasMetrocuadrado,
    vistasFichaDigital,
    1
  );

  const portales = [
    {
      id: "fincaraiz",
      nombre: "Finca Raíz",
      subtitulo: null as string | null,
      vistas: vistasFincaRaiz,
      vistasPill: `${vistasFincaRaiz.toLocaleString("es-CO")} vistas`,
      contactos: contactosFincaRaiz,
      contactosPill: `${contactosFincaRaiz.toLocaleString("es-CO")} ${
        contactosFincaRaiz === 1 ? "interesado" : "interesados"
      }`,
    },
    {
      id: "metrocuadrado",
      nombre: "Metrocuadrado",
      subtitulo: null as string | null,
      vistas: vistasMetrocuadrado,
      vistasPill: `${vistasMetrocuadrado.toLocaleString("es-CO")} vistas`,
      contactos: contactosMetrocuadrado,
      contactosPill: `${contactosMetrocuadrado.toLocaleString("es-CO")} ${
        contactosMetrocuadrado === 1 ? "interesado" : "interesados"
      }`,
    },
    {
      id: "red-l2l",
      nombre: "Red L2L y Ficha Digital",
      subtitulo: "Proppit · Ciencuadras · Web L2L",
      vistas: vistasFichaDigital,
      vistasPill: `${vistasFichaDigital.toLocaleString("es-CO")} ${
        vistasFichaDigital === 1 ? "apertura" : "aperturas"
      }`,
      contactos: contactosOtrosPortales,
      contactosPill: `${contactosOtrosPortales.toLocaleString("es-CO")} ${
        contactosOtrosPortales === 1 ? "interesado" : "interesados"
      }`,
    },
  ];

  const observacionesTexto = report.observaciones?.trim() || "";
  const recomendacionTexto = report.recomendacion?.trim() || "";
  const fechaEmision = formatFechaEmision(report.creadoEn);

  return (
    <article
      className="owner-report-sheet"
      aria-label="Informe Mensual de Gestión Comercial"
      style={{
        color: "var(--text-primary)",
        fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
      }}
    >
      {/* Franja superior arquitectónica bicolor oficial L2L */}
      <div
        aria-hidden="true"
        style={{
          height: 4,
          width: "100%",
          background: "var(--l2l-ribbon)",
        }}
      />

      {/* 1. Encabezado Co-Branded */}
      <header className="ors-header">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ minWidth: 0, flex: "1 1 210px" }}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 10,
                marginBottom: 8,
              }}
            >
              <L2LLogo height={36} />
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                  color: "var(--l2l-slate)",
                  lineHeight: 1.2,
                  paddingLeft: 10,
                  borderLeft: "1px solid var(--border)",
                }}
              >
                GESTIÓN DE ACTIVOS INMOBILIARIOS
              </span>
            </div>

            <h1
              style={{
                fontSize: "clamp(18px, 4.8vw, 21px)",
                fontWeight: 800,
                color: "var(--text-primary)",
                letterSpacing: "-0.02em",
                lineHeight: 1.22,
              }}
            >
              Informe Mensual de Gestión Comercial
            </h1>
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 11px",
              borderRadius: 999,
              background: "var(--bg-base)",
              border: "1px solid var(--border)",
              fontSize: 12,
              fontWeight: 700,
              color: "var(--text-primary)",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            <Calendar size={13} color="var(--red)" style={{ flexShrink: 0 }} />
            <span>{periodoEtiqueta}</span>
          </div>
        </div>
      </header>

      {/* Sub-franja personalizada para el propietario */}
      {propietarioNombre && (
        <div className="ors-subbanner">
          Preparado para:{" "}
          <strong style={{ color: "var(--text-primary)", fontWeight: 700 }}>
            {propietarioNombre}
          </strong>
        </div>
      )}

      {/* 2. Tarjeta de Identificación del Inmueble (Portada móvil / Fila ejecutiva en PC y PDF) */}
      <section className="ors-section" aria-label="Identificación del inmueble">
        <div className="ors-prop-layout">
          {showPropImg ? (
            <div className="ors-prop-cover">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={rawPropImg}
                alt={inmueble?.titulo || `${tipoLabel} Ref. #${refCode}`}
                onError={() => setFailedPropImg(rawPropImg)}
              />
              <div className="ors-prop-cover-overlay">
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: 999,
                    background:
                      inmueble?.gestion === "arriendo"
                        ? "rgba(22, 163, 74, 0.9)"
                        : "rgba(184, 15, 18, 0.9)",
                    color: "#FFFFFF",
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  {gestionLabel}
                </span>
                <span
                  style={{
                    padding: "4px 9px",
                    borderRadius: 999,
                    background: "rgba(17, 24, 39, 0.78)",
                    color: "#FFFFFF",
                    fontSize: 11,
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  Ref. #{refCode}
                </span>
              </div>
            </div>
          ) : (
            <div className="ors-prop-fallback">
              <Building2
                size={22}
                color="var(--red)"
                style={{ flexShrink: 0 }}
              />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--text-secondary)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                Ref. #{refCode}
              </span>
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 7,
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.01em",
                  lineHeight: 1.25,
                }}
              >
                {tipoLabel} en {gestionLabel}
              </span>

              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "2px 8px",
                  borderRadius: 6,
                  background: "var(--bg-base)",
                  border: "1px solid var(--border)",
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: "var(--text-secondary)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                Ref. #{refCode}
              </span>
            </div>

            {ubicacionLabel && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 13.5,
                  color: "var(--text-secondary)",
                  marginBottom: 8,
                }}
              >
                <MapPin
                  size={13.5}
                  color="var(--red)"
                  style={{ flexShrink: 0 }}
                />
                <span>{ubicacionLabel}</span>
              </div>
            )}

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "6px 7px",
              }}
            >
              {inmueble && inmueble.precio > 0 && (
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: "var(--red)",
                    fontVariantNumeric: "tabular-nums",
                    letterSpacing: "-0.01em",
                    marginRight: 4,
                  }}
                >
                  {formatPrecioCOP(inmueble.precio)}
                  {inmueble.gestion === "arriendo" ? " / mes" : ""}
                </span>
              )}

              {inmueble && inmueble.areaTotal > 0 && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "2px 8px",
                    borderRadius: 6,
                    background: "var(--bg-base)",
                    border: "1px solid var(--border)",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  <Maximize2 size={11.5} />
                  {inmueble.areaTotal} m²
                </span>
              )}

              {inmueble && inmueble.habitaciones > 0 && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "2px 8px",
                    borderRadius: 6,
                    background: "var(--bg-base)",
                    border: "1px solid var(--border)",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  <BedDouble size={12} />
                  {inmueble.habitaciones} hab.
                </span>
              )}

              {inmueble && inmueble.banos > 0 && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "2px 8px",
                    borderRadius: 6,
                    background: "var(--bg-base)",
                    border: "1px solid var(--border)",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  <Bath size={12} />
                  {inmueble.banos} {inmueble.banos === 1 ? "baño" : "baños"}
                </span>
              )}

              {inmueble && inmueble.garajes > 0 && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "2px 8px",
                    borderRadius: 6,
                    background: "var(--bg-base)",
                    border: "1px solid var(--border)",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  <Car size={12} />
                  {inmueble.garajes} parq.
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Resumen Ejecutivo de Alcance Digital (1 protagonista + 2 en móvil · 3 col en PC/PDF) */}
      <section
        className="ors-section"
        aria-label="Resumen ejecutivo de alcance digital"
      >
        <h2
          style={{
            fontSize: 13.5,
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
            marginBottom: 11,
          }}
        >
          Resumen Ejecutivo de Alcance Digital
        </h2>

        <div className="ors-kpi-grid">
          <div className="ors-kpi-card ors-kpi-hero">
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  lineHeight: 1.25,
                }}
              >
                Exposición total
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  lineHeight: 1.3,
                  marginTop: 2,
                }}
              >
                Visualizaciones en portales y ficha
              </div>
            </div>

            <span
              style={{
                fontSize: "clamp(24px, 6.2vw, 28px)",
                fontWeight: 800,
                color: "var(--text-primary)",
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                fontVariantNumeric: "tabular-nums",
                flexShrink: 0,
              }}
            >
              {totalVistas.toLocaleString("es-CO")}
            </span>
          </div>

          <div className="ors-kpi-card">
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                color: "var(--text-muted)",
                lineHeight: 1.25,
              }}
            >
              Interesados
            </span>
            <span
              style={{
                fontSize: "clamp(22px, 5.5vw, 26px)",
                fontWeight: 800,
                color: "var(--text-primary)",
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {totalContactos.toLocaleString("es-CO")}
            </span>
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 500,
                color: "var(--text-secondary)",
                lineHeight: 1.25,
              }}
            >
              Consultas atendidas
            </span>
          </div>

          <div className="ors-kpi-card">
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                color: "var(--text-muted)",
                lineHeight: 1.25,
              }}
            >
              Visitas al inmueble
            </span>
            <span
              style={{
                fontSize: "clamp(22px, 5.5vw, 26px)",
                fontWeight: 800,
                color: "var(--red)",
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {citasRealizadas.toLocaleString("es-CO")}
            </span>
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 500,
                color: "var(--text-secondary)",
                lineHeight: 1.25,
              }}
            >
              Citas presenciales
            </span>
          </div>
        </div>
      </section>

      {/* 4. Desglose por Portal Inmobiliario (Tarjetas escaneables con píldoras limpias) */}
      <section
        className="ors-section"
        aria-label="Desglose por portal inmobiliario"
      >
        <h2
          style={{
            fontSize: 13.5,
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
            marginBottom: 11,
          }}
        >
          Desglose por Portal Inmobiliario
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {portales.map((portal) => {
            const widthPct =
              portal.vistas > 0
                ? Math.max(
                    6,
                    Math.round((portal.vistas / maxPortalVistas) * 100)
                  )
                : 0;

            return (
              <div key={portal.id} className="ors-portal-card">
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "6px 10px",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13.5,
                        fontWeight: 800,
                        color: "var(--text-primary)",
                        lineHeight: 1.25,
                      }}
                    >
                      {portal.nombre}
                    </div>
                    {portal.subtitulo && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          marginTop: 1,
                        }}
                      >
                        {portal.subtitulo}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: 6,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "3px 8px",
                        borderRadius: 999,
                        background: "#FFFFFF",
                        border: "1px solid var(--border)",
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: "var(--text-primary)",
                      }}
                    >
                      <Eye size={11.5} color="var(--text-muted)" />
                      <span>{portal.vistasPill}</span>
                    </span>

                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "3px 8px",
                        borderRadius: 999,
                        background:
                          portal.contactos > 0
                            ? "rgba(184, 15, 18, 0.08)"
                            : "#FFFFFF",
                        border:
                          portal.contactos > 0
                            ? "1px solid rgba(184, 15, 18, 0.22)"
                            : "1px solid var(--border)",
                        fontSize: 11.5,
                        fontWeight: 700,
                        color:
                          portal.contactos > 0
                            ? "var(--red)"
                            : "var(--text-secondary)",
                      }}
                    >
                      <Users size={11.5} />
                      <span>{portal.contactosPill}</span>
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    width: "100%",
                    height: 6,
                    borderRadius: 999,
                    background: "#FFFFFF",
                    border: "1px solid var(--border)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${widthPct}%`,
                      height: "100%",
                      borderRadius: 999,
                      background: "var(--red)",
                      transition: "width 0.25s ease",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Línea compacta de gestiones directas por WhatsApp */}
        <div
          style={{
            marginTop: 10,
            padding: "9px 12px",
            borderRadius: 10,
            background: "var(--bg-base)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: "var(--text-secondary)",
            lineHeight: 1.4,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <MessageCircle
            size={15}
            color="var(--red)"
            style={{ flexShrink: 0 }}
          />
          <div>
            <strong style={{ color: "var(--text-primary)", fontWeight: 700 }}>
              Seguimiento comercial directo:
            </strong>{" "}
            {seguimientosEnviados.toLocaleString("es-CO")}{" "}
            {seguimientosEnviados === 1
              ? "atención y ficha enviada"
              : "atenciones y fichas enviadas"}{" "}
            por WhatsApp y teléfono.
          </div>
        </div>
      </section>

      {/* 5. Concepto Comercial y Retroalimentación de Interesados */}
      <section
        className="ors-section"
        aria-label="Concepto comercial y retroalimentación"
      >
        <h2
          style={{
            fontSize: 13.5,
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
            marginBottom: 8,
          }}
        >
          Concepto Comercial y Retroalimentación
        </h2>

        {observacionesTexto ? (
          <p
            style={{
              fontSize: 13.8,
              lineHeight: 1.58,
              color: "var(--text-secondary)",
              whiteSpace: "pre-line",
            }}
          >
            {observacionesTexto}
          </p>
        ) : (
          <p
            style={{
              fontSize: 13.5,
              lineHeight: 1.55,
              color: "var(--text-muted)",
              fontStyle: "italic",
            }}
          >
            En seguimiento activo de comentarios y retroalimentación de los
            clientes atendidos durante el periodo.
          </p>
        )}

        {recomendacionTexto && (
          <div
            style={{
              marginTop: 12,
              padding: "11px 13px",
              background: "var(--bg-base)",
              border: "1px solid var(--border)",
              borderLeft: "3px solid var(--red)",
              borderRadius: "0 10px 10px 0",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 800,
                color: "var(--red)",
                marginBottom: 4,
              }}
            >
              <Compass size={13.5} style={{ flexShrink: 0 }} />
              <span>Recomendación Estratégica</span>
            </div>

            <p
              style={{
                fontSize: 13.5,
                lineHeight: 1.55,
                color: "var(--text-primary)",
                whiteSpace: "pre-line",
              }}
            >
              {recomendacionTexto}
            </p>
          </div>
        )}
      </section>

      {/* 6. Firma de Asesora Comercial (con enlaces directos tocables en móvil) */}
      <footer className="ors-footer">
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            minWidth: 0,
            flex: "1 1 250px",
          }}
        >
          {showAvatarImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={rawAvatarImg}
              alt="Olga Patricia Vásquez Barrios"
              onError={() => setFailedAvatarImg(rawAvatarImg)}
              style={{
                width: 46,
                height: 46,
                borderRadius: "50%",
                objectFit: "cover",
                border: "1.5px solid var(--red)",
                background: "var(--bg-card)",
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: "50%",
                background: "rgba(184, 15, 18, 0.1)",
                border: "1.5px solid var(--border-red)",
                color: "var(--red)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              PV
            </div>
          )}

          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 14.5,
                fontWeight: 800,
                color: "var(--text-primary)",
                lineHeight: 1.2,
              }}
            >
              Olga Patricia Vásquez Barrios
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--red)",
                marginTop: 2,
              }}
            >
              Asesora Comercial · L2L Bienes Raíces SAS
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 6,
                marginTop: 8,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <a href="tel:+573154672851" className="ors-contact-link">
                <Phone size={12} color="var(--red)" />
                <span>+57 315 467 2851</span>
              </a>

              <a
                href="mailto:opvasquez@l2lbienesraices.com"
                className="ors-contact-link"
              >
                <Mail size={12} color="var(--red)" />
                <span>opvasquez@l2lbienesraices.com</span>
              </a>
            </div>
          </div>
        </div>

        <div
          style={{
            fontSize: 11.5,
            color: "var(--text-muted)",
            lineHeight: 1.4,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <div>Emitido el {fechaEmision}</div>
          <div style={{ fontWeight: 600, color: "var(--text-secondary)" }}>
            PBX 601 704 1705 · Bogotá D.C.
          </div>
        </div>
      </footer>
    </article>
  );
}
