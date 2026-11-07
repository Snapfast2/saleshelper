'use client';
// src/components/PropCard.tsx

import { memo, useMemo, useState } from "react";
import {
  BedDouble,
  Bath,
  Car,
  MapPin,
  Maximize2,
  Clock,
  Eye,
  Send,
  FileText,
} from "lucide-react";
import type { Inmueble } from "@/types";
import ImageCarousel from "./ImageCarousel";

interface Props {
  inmueble: Inmueble;
  onClick?: (inmueble: Inmueble) => void;
  onReportClick?: (inmueble: Inmueble) => void;
  compact?: boolean;
  viewsCount?: number;
}

function formatPrecio(valor: number): string {
  if (valor >= 1_000_000_000) {
    return `$${(valor / 1_000_000_000).toFixed(1).replace(/\.0$/, "")} Mil M`;
  }
  if (valor >= 10_000_000) {
    return `$${Math.round(valor / 1_000_000)} M`;
  }
  if (valor >= 1_000_000) {
    return `$${(valor / 1_000_000).toFixed(1).replace(/\.0$/, "")} M`;
  }
  if (valor >= 1_000) {
    return `$${(valor / 1_000).toFixed(0)}K`;
  }
  return `$${valor}`;
}

const PropCard = memo(function PropCard({
  inmueble,
  onClick,
  onReportClick,
  compact,
  viewsCount,
}: Props) {
  const [hovered, setHovered] = useState(false);
  const [reportHovered, setReportHovered] = useState(false);

  const uniqueImages = useMemo(() => {
    const all = [inmueble.imagen, ...(inmueble.imagenes || [])].filter(Boolean);
    return Array.from(new Set(all));
  }, [inmueble.imagen, inmueble.imagenes]);

  const safeViews = viewsCount ?? 0;
  const hasTopRightBadges = safeViews > 0 || inmueble.estado === "En proceso";

  return (
    <div
      className="prop-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: compact ? 220 : "100%",
        flexShrink: compact ? 0 : undefined,
        overflow: "hidden",
        transition: "border-color 0.18s ease, box-shadow 0.18s ease",
        borderColor: hovered ? "var(--border-red)" : undefined,
        boxShadow: hovered ? "0 6px 20px rgba(17, 24, 39, 0.06)" : undefined,
      }}
      onClick={() => onClick?.(inmueble)}
    >
      {/* Imagen */}
      <div style={{ position: "relative" }}>
        <ImageCarousel
          images={uniqueImages}
          alt={inmueble.titulo}
          height={compact ? 116 : 185}
          compact={compact}
        />

        {/* Badge Venta/Arriendo (Top Left) */}
        <span
          className={`prop-card-badge ${inmueble.gestion}`}
          style={
            compact
              ? { top: 8, left: 8, padding: "2px 8px", fontSize: 10.5 }
              : undefined
          }
        >
          {inmueble.gestion === "venta" ? "Venta" : "Arriendo"}
        </span>

        {/* Badges Top Right: Vistas de clientes + En Proceso */}
        {hasTopRightBadges && (
          <div
            style={{
              position: "absolute",
              top: compact ? 8 : 10,
              right: compact ? 8 : 10,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 5,
              pointerEvents: "none",
              zIndex: 4,
            }}
          >
            {safeViews > 0 && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: compact ? "2px 7px" : "4px 9px",
                  borderRadius: 999,
                  background: "rgba(17, 24, 39, 0.74)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  border: "1px solid rgba(255, 255, 255, 0.22)",
                  color: "#fff",
                  fontSize: compact ? 11 : 12,
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1.2,
                }}
              >
                <Eye size={compact ? 11 : 13} />
                {safeViews} {compact ? "" : safeViews === 1 ? "vista" : "vistas"}
              </span>
            )}

            {inmueble.estado === "En proceso" && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: compact ? "2px 7px" : "3px 9px",
                  borderRadius: 999,
                  backgroundColor: "rgba(245, 158, 11, 0.92)",
                  backdropFilter: "blur(8px)",
                  color: "#fff",
                  fontSize: compact ? 10.5 : 11.5,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                }}
              >
                <Clock size={compact ? 11 : 12} />
                En Proceso
              </span>
            )}
          </div>
        )}

        <span
          className="prop-card-price"
          style={{
            fontVariantNumeric: "tabular-nums",
            ...(compact
              ? {
                  bottom: 8,
                  right: 8,
                  padding: "3px 8px",
                  fontSize: 13,
                  borderRadius: 7,
                }
              : {}),
          }}
        >
          {formatPrecio(inmueble.precio)}
        </span>
      </div>

      {/* Body */}
      <div
        className="prop-card-body"
        style={compact ? { padding: "10px 12px 11px" } : undefined}
      >
        <div
          className="prop-card-tipo"
          style={{
            fontVariantNumeric: "tabular-nums",
            ...(compact
              ? {
                  fontSize: 11,
                  marginBottom: 2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }
              : {}),
          }}
        >
          {inmueble.tipo} • #{inmueble.codigoDomus || inmueble.id}
        </div>
        <div
          className="prop-card-titulo"
          style={
            compact
              ? {
                  fontSize: 14.5,
                  marginBottom: 2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }
              : undefined
          }
        >
          {inmueble.barrio}
        </div>
        <div
          className="prop-card-ciudad"
          style={
            compact
              ? { fontSize: 12, marginBottom: 7 }
              : undefined
          }
        >
          <MapPin size={11} />
          {inmueble.ciudad}
        </div>

        <div
          className="prop-card-stats"
          style={{
            fontVariantNumeric: "tabular-nums",
            ...(compact ? { gap: 10 } : {}),
          }}
        >
          {inmueble.habitaciones > 0 && (
            <div
              className="prop-stat"
              style={compact ? { fontSize: 12.5 } : undefined}
            >
              <BedDouble size={13} />
              {inmueble.habitaciones}
            </div>
          )}
          {inmueble.banos > 0 && (
            <div
              className="prop-stat"
              style={compact ? { fontSize: 12.5 } : undefined}
            >
              <Bath size={13} />
              {inmueble.banos}
            </div>
          )}
          {inmueble.garajes > 0 && (
            <div
              className="prop-stat"
              style={compact ? { fontSize: 12.5 } : undefined}
            >
              <Car size={13} />
              {inmueble.garajes}
            </div>
          )}
          {inmueble.areaTotal > 0 && (
            <div
              className="prop-stat"
              style={compact ? { fontSize: 12.5 } : undefined}
            >
              <Maximize2 size={13} />
              {inmueble.areaTotal}m²
            </div>
          )}
        </div>

        {!compact && onReportClick && (
          <div
            style={{
              borderTop: "1px solid var(--border)",
              marginTop: 12,
              paddingTop: 10,
              display: "flex",
              gap: 8,
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClick?.(inmueble);
              }}
              style={{
                flex: 1,
                minHeight: 36,
                padding: "6px 10px",
                borderRadius: 9,
                background: "var(--bg-base)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                fontSize: 12.5,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                cursor: "pointer",
                transition: "background 0.15s, border-color 0.15s",
              }}
            >
              <Send size={13} color="var(--text-secondary)" />
              <span>Enviar ficha</span>
            </button>

            <button
              type="button"
              onMouseEnter={() => setReportHovered(true)}
              onMouseLeave={() => setReportHovered(false)}
              onClick={(e) => {
                e.stopPropagation();
                onReportClick(inmueble);
              }}
              style={{
                flex: 1,
                minHeight: 36,
                padding: "6px 10px",
                borderRadius: 9,
                background: reportHovered
                  ? "rgba(184, 15, 18, 0.12)"
                  : "rgba(184, 15, 18, 0.06)",
                border: "1px solid rgba(184, 15, 18, 0.24)",
                color: "var(--red)",
                fontSize: 12.5,
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                cursor: "pointer",
                transition: "background 0.15s, border-color 0.15s",
              }}
            >
              <FileText size={13} color="var(--red)" />
              <span>Informe dueño</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

export default PropCard;
