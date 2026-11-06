'use client';
// src/components/OwnerReportSheet.tsx
// Hoja ejecutiva de Informe Mensual de Gestión Comercial para propietarios (L2L Bienes Raíces).
// Compatible con vista móvil, escritorio y exportación directa a PDF A4 (@media print).

import { useState } from "react";
import {
  Bath,
  BedDouble,
  Building2,
  Calendar,
  Car,
  Compass,
  Mail,
  MapPin,
  Maximize2,
  MessageCircle,
  Phone,
} from "lucide-react";
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
  const vistasFincaRaiz = Math.max(0, Math.round(Number(report.vistasFincaRaiz) || 0));
  const contactosFincaRaiz = Math.max(0, Math.round(Number(report.contactosFincaRaiz) || 0));
  const vistasMetrocuadrado = Math.max(0, Math.round(Number(report.vistasMetrocuadrado) || 0));
  const contactosMetrocuadrado = Math.max(0, Math.round(Number(report.contactosMetrocuadrado) || 0));
  const vistasFichaDigital = Math.max(0, Math.round(Number(report.vistasFichaDigital) || 0));
  const contactosOtrosPortales = Math.max(0, Math.round(Number(report.contactosOtrosPortales) || 0));
  const citasRealizadas = Math.max(0, Math.round(Number(report.citasRealizadas) || 0));
  const seguimientosEnviados = Math.max(0, Math.round(Number(report.seguimientosEnviados) || 0));

  const totalVistas = vistasFincaRaiz + vistasMetrocuadrado + vistasFichaDigital;
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
      vistas: vistasFincaRaiz,
      vistasTexto: `${vistasFincaRaiz.toLocaleString("es-CO")} vistas al aviso`,
      contactosTexto: `${contactosFincaRaiz.toLocaleString("es-CO")} interesados`,
    },
    {
      id: "metrocuadrado",
      nombre: "Metrocuadrado",
      vistas: vistasMetrocuadrado,
      vistasTexto: `${vistasMetrocuadrado.toLocaleString("es-CO")} vistas al aviso`,
      contactosTexto: `${contactosMetrocuadrado.toLocaleString("es-CO")} interesados`,
    },
    {
      id: "red-l2l",
      nombre: "Red L2L / Proppit / Ficha Directa",
      vistas: vistasFichaDigital,
      vistasTexto: `${vistasFichaDigital.toLocaleString("es-CO")} aperturas de ficha`,
      contactosTexto: `${contactosOtrosPortales.toLocaleString("es-CO")} interesados`,
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
      {/* Franja superior arquitectónica L2L */}
      <div
        aria-hidden="true"
        style={{
          height: 4,
          width: "100%",
          background: "var(--red)",
        }}
      />

      {/* 1. Encabezado Co-Branded */}
      <header
        style={{
          padding: "20px 22px 18px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-card)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ minWidth: 0, flex: "1 1 240px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: "var(--red)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M4 20V9.5L12 4L20 9.5V20H14.5V14H9.5V20H4Z"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 4V10"
                    stroke="rgba(255,255,255,0.7)"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  color: "var(--red)",
                  lineHeight: 1.25,
                }}
              >
                L2L BIENES RAÍCES · GESTIÓN DE ACTIVOS
              </span>
            </div>

            <h1
              style={{
                fontSize: 21,
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
              padding: "6px 12px",
              borderRadius: 999,
              background: "var(--bg-base)",
              border: "1px solid var(--border)",
              fontSize: 12.5,
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
        <div
          style={{
            padding: "10px 22px",
            background: "var(--bg-base)",
            borderBottom: "1px solid var(--border)",
            fontSize: 13,
            color: "var(--text-secondary)",
            lineHeight: 1.4,
          }}
        >
          Preparado especialmente para:{" "}
          <strong style={{ color: "var(--text-primary)", fontWeight: 700 }}>
            {propietarioNombre}
          </strong>
        </div>
      )}

      {/* 2. Tarjeta de Identificación del Inmueble */}
      <section
        aria-label="Identificación del inmueble"
        style={{
          padding: "18px 22px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-card)",
          breakInside: "avoid",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 16,
          }}
        >
          {showPropImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={rawPropImg}
              alt={inmueble?.titulo || `${tipoLabel} Ref. #${refCode}`}
              onError={() => setFailedPropImg(rawPropImg)}
              style={{
                width: 116,
                height: 86,
                borderRadius: 10,
                objectFit: "cover",
                border: "1px solid var(--border)",
                background: "var(--bg-base)",
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: 116,
                height: 86,
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--bg-base)",
                color: "var(--text-muted)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                flexShrink: 0,
              }}
            >
              <Building2 size={22} color="var(--red)" />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                Ref. #{refCode}
              </span>
            </div>
          )}

          <div style={{ flex: "1 1 220px", minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 8,
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
                Código Ref. #{refCode}
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
                gap: "6px 8px",
              }}
            >
              {inmueble && inmueble.precio > 0 && (
                <span
                  style={{
                    fontSize: 15.5,
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

      {/* 3. Resumen Ejecutivo de Alcance Digital (KPI Strip) */}
      <section
        aria-label="Resumen ejecutivo de alcance digital"
        style={{
          padding: "18px 22px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-card)",
          breakInside: "avoid",
        }}
      >
        <h2
          style={{
            fontSize: 13.5,
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
            marginBottom: 12,
          }}
        >
          Resumen Ejecutivo de Alcance Digital
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 1,
            background: "var(--border)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              background: "var(--bg-card)",
              padding: "13px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
              minWidth: 0,
            }}
          >
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                color: "var(--text-muted)",
                lineHeight: 1.25,
              }}
            >
              Exposición total
            </span>
            <span
              style={{
                fontSize: "clamp(19px, 4.2vw, 25px)",
                fontWeight: 800,
                color: "var(--text-primary)",
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {totalVistas.toLocaleString("es-CO")}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "var(--text-secondary)",
                lineHeight: 1.25,
              }}
            >
              Visualizaciones del inmueble
            </span>
          </div>

          <div
            style={{
              background: "var(--bg-card)",
              padding: "13px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
              minWidth: 0,
            }}
          >
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                color: "var(--text-muted)",
                lineHeight: 1.25,
              }}
            >
              Clientes interesados
            </span>
            <span
              style={{
                fontSize: "clamp(19px, 4.2vw, 25px)",
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
                fontSize: 11,
                fontWeight: 500,
                color: "var(--text-secondary)",
                lineHeight: 1.25,
              }}
            >
              Consultas atendidas
            </span>
          </div>

          <div
            style={{
              background: "var(--bg-card)",
              padding: "13px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
              minWidth: 0,
            }}
          >
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                color: "var(--text-muted)",
                lineHeight: 1.25,
              }}
            >
              Visitas realizadas
            </span>
            <span
              style={{
                fontSize: "clamp(19px, 4.2vw, 25px)",
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
                fontSize: 11,
                fontWeight: 500,
                color: "var(--text-secondary)",
                lineHeight: 1.25,
              }}
            >
              Citas en el inmueble
            </span>
          </div>
        </div>
      </section>

      {/* 4. Desglose por Portal Inmobiliario */}
      <section
        aria-label="Desglose por portal inmobiliario"
        style={{
          padding: "18px 22px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-card)",
          breakInside: "avoid",
        }}
      >
        <h2
          style={{
            fontSize: 13.5,
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
            marginBottom: 14,
          }}
        >
          Desglose por Portal Inmobiliario
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          {portales.map((portal) => {
            const widthPct =
              portal.vistas > 0
                ? Math.max(5, Math.round((portal.vistas / maxPortalVistas) * 100))
                : 0;

            return (
              <div key={portal.id}>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: "2px 10px",
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13.5,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                    }}
                  >
                    {portal.nombre}
                  </span>

                  <span
                    style={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    <strong style={{ color: "var(--text-primary)" }}>
                      {portal.vistasTexto}
                    </strong>{" "}
                    · {portal.contactosTexto}
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
            marginTop: 15,
            padding: "10px 12px",
            borderRadius: 10,
            background: "var(--bg-base)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 9,
            fontSize: 12.5,
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
              Gestiones de seguimiento WhatsApp realizadas:
            </strong>{" "}
            {seguimientosEnviados.toLocaleString("es-CO")} contactos y
            seguimientos directos realizados por la asesora.
          </div>
        </div>
      </section>

      {/* 5. Concepto Comercial y Retroalimentación de Interesados */}
      <section
        aria-label="Concepto comercial y retroalimentación"
        style={{
          padding: "18px 22px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-card)",
          breakInside: "avoid",
        }}
      >
        <h2
          style={{
            fontSize: 13.5,
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
            marginBottom: 10,
          }}
        >
          Concepto Comercial y Retroalimentación de Interesados
        </h2>

        {observacionesTexto ? (
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.62,
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
              marginTop: 14,
              padding: "12px 14px",
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
                fontSize: 12.5,
                fontWeight: 700,
                color: "var(--red)",
                marginBottom: 4,
              }}
            >
              <Compass size={14} style={{ flexShrink: 0 }} />
              <span>Recomendación Estratégica</span>
            </div>

            <p
              style={{
                fontSize: 13.5,
                lineHeight: 1.58,
                color: "var(--text-primary)",
                whiteSpace: "pre-line",
              }}
            >
              {recomendacionTexto}
            </p>
          </div>
        )}
      </section>

      {/* 6. Firma de Asesora Comercial */}
      <footer
        style={{
          padding: "16px 22px",
          background: "var(--bg-base)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
          breakInside: "avoid",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            minWidth: 0,
            flex: "1 1 260px",
          }}
        >
          {showAvatarImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={rawAvatarImg}
              alt="Olga Patricia Vásquez Barrios"
              onError={() => setFailedAvatarImg(rawAvatarImg)}
              style={{
                width: 48,
                height: 48,
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
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "rgba(196, 30, 58, 0.1)",
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

          <div style={{ minWidth: 0 }}>
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
                fontSize: 12.5,
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
                gap: "4px 12px",
                marginTop: 5,
                fontSize: 12,
                color: "var(--text-secondary)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Phone size={12} color="var(--red)" />
                6017041705 / +57 315 467 2851
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Mail size={12} color="var(--red)" />
                opvasquez@l2lbienesraices.com
              </span>
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
            Bogotá D.C. · www.l2lbienesraices.com
          </div>
        </div>
      </footer>
    </article>
  );
}
