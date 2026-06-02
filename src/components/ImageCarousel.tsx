'use client';

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  images: string[];
  alt: string;
  height?: number | string;
}

export default function ImageCarousel({ images, alt, height = 180 }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Filtramos imágenes válidas (por si viene alguna vacía)
  const validImages = images.filter(img => img && img.trim() !== "");
  const hasImages = validImages.length > 0;
  
  // Si no hay imágenes, mostrar fallback
  const fallbackImg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'%3E%3Crect fill='%23111120' width='400' height='200'/%3E%3Ctext fill='%23444' font-family='Arial' font-size='14' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3ESin imagen%3C/text%3E%3C/svg%3E";
  const displayImages = hasImages ? validImages : [fallbackImg];
  const total = displayImages.length;

  // Autoplay Effect (Animación Idle)
  useEffect(() => {
    if (total <= 1 || isHovered) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % total);
    }, 4000); // Cambia cada 4 segundos

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [total, isHovered]);

  const paginate = (newDirection: number) => {
    setCurrentIndex((prev) => (prev + newDirection + total) % total);
  };

  const handleDragEnd = (e: any, { offset, velocity }: any) => {
    const swipe = offset.x;
    const swipeThreshold = 50;
    if (swipe < -swipeThreshold) {
      paginate(1);
    } else if (swipe > swipeThreshold) {
      paginate(-1);
    }
  };

  if (total === 1) {
    return (
      <div style={{ position: "relative", height, width: "100%", overflow: "hidden", background: "#000" }}>
        <motion.img
          src={displayImages[0]}
          alt={alt}
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 8, ease: "easeInOut", repeat: Infinity }}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      style={{ position: "relative", height, width: "100%", overflow: "hidden", background: "#000" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
    >
      <AnimatePresence mode="popLayout">
        <motion.img
          key={currentIndex}
          src={displayImages[currentIndex]}
          alt={`${alt} - ${currentIndex + 1}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            cursor: "grab",
          }}
          whileTap={{ cursor: "grabbing" }}
        />
      </AnimatePresence>

      {/* Flechas de Navegación */}
      <div 
        style={{ 
          position: "absolute", 
          top: "50%", 
          left: 0, 
          right: 0, 
          display: "flex", 
          justifyContent: "space-between", 
          padding: "0 8px", 
          transform: "translateY(-50%)",
          pointerEvents: "none" // Para no bloquear el drag en el centro
        }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); paginate(-1); }}
          style={{
            background: "rgba(0,0,0,0.3)",
            border: "none",
            borderRadius: "50%",
            width: 28,
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            cursor: "pointer",
            backdropFilter: "blur(4px)",
            pointerEvents: "auto",
            opacity: isHovered ? 1 : 0.7,
            transition: "opacity 0.2s"
          }}
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); paginate(1); }}
          style={{
            background: "rgba(0,0,0,0.3)",
            border: "none",
            borderRadius: "50%",
            width: 28,
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            cursor: "pointer",
            backdropFilter: "blur(4px)",
            pointerEvents: "auto",
            opacity: isHovered ? 1 : 0.7,
            transition: "opacity 0.2s"
          }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Indicadores (Puntitos) */}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 6,
          pointerEvents: "none"
        }}
      >
        {displayImages.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === currentIndex ? 18 : 6,
              height: 6,
              borderRadius: 3,
              background: i === currentIndex ? "white" : "rgba(255,255,255,0.5)",
              transition: "all 0.3s ease",
              boxShadow: "0 1px 3px rgba(0,0,0,0.3)"
            }}
          />
        ))}
      </div>
    </div>
  );
}
