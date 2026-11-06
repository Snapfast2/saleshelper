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
        width: compact ? 240 : "100%",
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
          height={compact ? 140 : 185}
          compact={compact}
        />

        {/* Badge Venta/Arriendo (Top Left) */}
        <span className={`prop-card-badge ${inmueble.gestion}`}>
          {inmueble.gestion === "venta" ? "Venta" : "Arriendo"}
        </span>

        {/* Badges Top Right: Vistas de clientes + En Proceso */}
        {hasTopRightBadges && (
          <div
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 6,
              pointerEvents: "none",
              zIndex: 4,
            }}
          >
            {safeViews > 0 && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "4px 9px",
                  borderRadius: 999,
                  background: "rgba(17, 24, 39, 0.74)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  border: "1px solid rgba(255, 255, 255, 0.22)",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1.2,
                }}
              >
                <Eye size={13} />
                {safeViews} {safeViews === 1 ? "vista" : "vistas"}
              </span>
            )}

            {inmueble.estado === "En proceso" && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "3px 9px",
                  borderRadius: 999,
                  backgroundColor: "rgba(245, 158, 11, 0.92)",
                  backdropFilter: "blur(8px)",
                  color: "#fff",
                  fontSize: 11.5,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                }}
              >
                <Clock size={12} />
                En Proceso
              </span>
            )}
          </div>
        )}

        <span
          className="prop-card-price"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {formatPrecio(inmueble.precio)}
        </span>
      </div>

      {/* Body */}
      <div className="prop-card-body">
        <div
          className="prop-card-tipo"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {inmueble.tipo} • Cód: {inmueble.codigoDomus || inmueble.id}
        </div>
        <div className="prop-card-titulo">{inmueble.barrio}</div>
        <div className="prop-card-ciudad">
          <MapPin size={12} />
          {inmueble.ciudad}
        </div>

        <div
          className="prop-card-stats"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {inmueble.habitaciones > 0 && (
            <div className="prop-stat">
              <BedDouble size={14} />
              {inmueble.habitaciones}
            </div>
          )}
          {inmueble.banos > 0 && (
            <div className="prop-stat">
              <Bath size={14} />
              {inmueble.banos}
            </div>
          )}
          {inmueble.garajes > 0 && (
            <div className="prop-stat">
              <Car size={14} />
              {inmueble.garajes}
            </div>
          )}
          {inmueble.areaTotal > 0 && (
            <div className="prop-stat">
              <Maximize2 size={14} />
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
                  ? "rgba(196, 30, 58, 0.12)"
                  : "rgba(196, 30, 58, 0.06)",
                border: "1px solid rgba(196, 30, 58, 0.24)",
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
