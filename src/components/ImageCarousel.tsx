'use client';

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  images: string[];
  alt: string;
  height?: number | string;
  compact?: boolean;
}

const OPTIMIZABLE_HOSTS = new Set([
  "s3-us-west-2.amazonaws.com",
  "pictures.domus.la",
  "s3.amazonaws.com",
  "www.l2lbienesraices.com",
  "l2lbienesraices.com",
]);

function isNextImageSafe(src: string): boolean {
  if (!src || src.startsWith("data:")) return false;
  if (src.startsWith("/")) return true;
  try {
    const parsed = new URL(src);
    return parsed.protocol === "https:" && OPTIMIZABLE_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

const FALLBACK_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'%3E%3Crect fill='%231e293b' width='400' height='200'/%3E%3Ctext fill='%2394a3b8' font-family='Arial' font-size='14' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3ESin imagen%3C/text%3E%3C/svg%3E";

export default function ImageCarousel({ images, alt, height = 180, compact = false }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [failedSrcs, setFailedSrcs] = useState<Record<string, boolean>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);
  const touchStartX = useRef<number | null>(null);

  const validImages = images.filter((img) => img && img.trim() !== "");
  const displayImages = validImages.length > 0 ? validImages : [FALLBACK_SVG];
  const total = displayImages.length;
  const safeIndex = currentIndex < total ? currentIndex : 0;
  const activeSrc = failedSrcs[displayImages[safeIndex]]
    ? FALLBACK_SVG
    : displayImages[safeIndex];

  // Pausar autoplay cuando la tarjeta sale del viewport para ahorrar CPU/batería en Android
  useEffect(() => {
    if (compact || total <= 1) return;
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        setIsInView(Boolean(entries[0]?.isIntersecting));
      },
      { threshold: 0.35 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [compact, total]);

  useEffect(() => {
    if (compact || total <= 1 || isPaused || !isInView) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % total);
    }, 4500);
    return () => clearInterval(timer);
  }, [compact, total, isPaused, isInView]);

  const paginate = (delta: number) => {
    setCurrentIndex((prev) => (prev + delta + total) % total);
  };

  const sizes = compact ? "240px" : "(max-width: 520px) 92vw, 440px";

  const renderPhoto = (src: string, photoAlt: string) => {
    if (isNextImageSafe(src)) {
      return (
        <Image
          src={src}
          alt={photoAlt}
          fill
          sizes={sizes}
          loading="lazy"
          onError={() => setFailedSrcs((prev) => ({ ...prev, [src]: true }))}
          style={{ objectFit: "cover", transition: "opacity 0.25s ease" }}
        />
      );
    }

    return (
      <img
        src={src}
        alt={photoAlt}
        loading="lazy"
        decoding="async"
        onError={() => setFailedSrcs((prev) => ({ ...prev, [src]: true }))}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    );
  };

  // En tarjetas compactas (carrusel horizontal de Inicio / WhatsApp) o de 1 sola imagen:
  // render estático ultra ligero sin interceptar el scroll táctil horizontal
  if (compact || total === 1) {
    const firstSrc = failedSrcs[displayImages[0]] ? FALLBACK_SVG : displayImages[0];
    return (
      <div
        style={{
          position: "relative",
          height,
          width: "100%",
          overflow: "hidden",
          background: "#0f172a",
        }}
      >
        {renderPhoto(firstSrc, alt)}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        height,
        width: "100%",
        overflow: "hidden",
        background: "#0f172a",
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={(e) => {
        setIsPaused(true);
        touchStartX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        setIsPaused(false);
        if (touchStartX.current === null) return;
        const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
        const deltaX = endX - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(deltaX) > 42) {
          paginate(deltaX < 0 ? 1 : -1);
        }
      }}
    >
      {renderPhoto(activeSrc, `${alt} - ${safeIndex + 1}`)}

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
          pointerEvents: "none",
        }}
      >
        <button
          type="button"
          aria-label="Foto anterior"
          onClick={(e) => {
            e.stopPropagation();
            paginate(-1);
          }}
          style={{
            background: "rgba(0,0,0,0.38)",
            border: "none",
            borderRadius: "50%",
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            cursor: "pointer",
            pointerEvents: "auto",
          }}
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          aria-label="Foto siguiente"
          onClick={(e) => {
            e.stopPropagation();
            paginate(1);
          }}
          style={{
            background: "rgba(0,0,0,0.38)",
            border: "none",
            borderRadius: "50%",
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            cursor: "pointer",
            pointerEvents: "auto",
          }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Indicadores: píldora compacta cuando hay >5 fotos, puntitos cuando <=5 */}
      {total > 5 ? (
        <div
          style={{
            position: "absolute",
            bottom: 10,
            left: 12,
            background: "rgba(0,0,0,0.55)",
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 999,
            pointerEvents: "none",
          }}
        >
          {safeIndex + 1} / {total}
        </div>
      ) : (
        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            gap: 6,
            pointerEvents: "none",
          }}
        >
          {displayImages.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === safeIndex ? 18 : 6,
                height: 6,
                borderRadius: 3,
                background: i === safeIndex ? "white" : "rgba(255,255,255,0.5)",
                transition: "width 0.25s ease, background-color 0.25s ease",
                boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
