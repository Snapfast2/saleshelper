'use client';
// src/components/PropCard.tsx

import { motion } from "framer-motion";
import { BedDouble, Bath, Car, MapPin, Maximize2, Clock } from "lucide-react";
import type { Inmueble } from "@/types";

interface Props {
  inmueble: Inmueble;
  onClick?: (inmueble: Inmueble) => void;
  compact?: boolean;
}

function formatPrecio(valor: number): string {
  if (valor >= 1000000000) return `$${(valor / 1000000000).toFixed(1).replace(/\.0$/, "")} Mil M`;
  if (valor >= 10000000) return `$${Math.round(valor / 1000000)} M`;
  if (valor >= 1000000) return `$${(valor / 1000000).toFixed(1).replace(/\.0$/, "")} M`;
  if (valor >= 1000) return `$${(valor / 1000).toFixed(0)}K`;
  return `$${valor}`;
}

import ImageCarousel from "./ImageCarousel";

export default function PropCard({ inmueble, onClick, compact }: Props) {
  // Combinar imagen principal con el array de imágenes
  const allImages = [inmueble.imagen, ...(inmueble.imagenes || [])];
  // Eliminar duplicados por si la imagen principal también viene en el array
  const uniqueImages = Array.from(new Set(allImages));

  return (
    <motion.div
      className="prop-card"
      style={{ width: compact ? 240 : "100%", overflow: "hidden" }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      onClick={() => onClick?.(inmueble)}
    >
      {/* Imagen */}
      <div style={{ position: "relative" }}>
        <ImageCarousel 
          images={uniqueImages} 
          alt={inmueble.titulo} 
          height={compact ? 140 : 180} 
        />
        
        {/* Badge Venta/Arriendo (Top Left) */}
        <span className={`prop-card-badge ${inmueble.gestion}`}>
          {inmueble.gestion === "venta" ? "Venta" : "Arriendo"}
        </span>

        {/* Badge En Proceso (Top Right) */}
        {inmueble.estado === "En proceso" && (
          <span 
            className="prop-card-badge" 
            style={{ 
              right: 12, 
              left: 'auto', 
              backgroundColor: '#F59E0B', // Amber/Orange
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <Clock size={12} />
            En Proceso
          </span>
        )}

        <span className="prop-card-price">{formatPrecio(inmueble.precio)}</span>
      </div>

      {/* Body */}
      <div className="prop-card-body">
        <div className="prop-card-tipo">{inmueble.tipo} • Cód: {inmueble.codigoDomus}</div>
        <div className="prop-card-titulo">{inmueble.barrio}</div>
        <div className="prop-card-ciudad">
          <MapPin size={12} />
          {inmueble.ciudad}
        </div>

        <div className="prop-card-stats">
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
      </div>
    </motion.div>
  );
}
