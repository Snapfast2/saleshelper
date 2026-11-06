// src/components/L2LLogo.tsx
// Componente oficial de marca L2L Bienes Raíces (usa el logotipo corporativo real de /public).
// Compatible con SSR, cliente e impresión PDF A4 (@media print).

import type { CSSProperties } from "react";

export interface L2LLogoProps {
  /** Altura en píxeles; el ancho escala proporcionalmente (relación 625:421 ≈ 1.485:1) */
  height?: number;
  variant?: "color" | "white";
  style?: CSSProperties;
  className?: string;
}

const ASPECT_RATIO = 625 / 421;

export default function L2LLogo({
  height = 36,
  variant = "color",
  style,
  className,
}: L2LLogoProps) {
  const width = Math.round(height * ASPECT_RATIO);
  const src = variant === "white" ? "/wlogo-l2l.png" : "/logo-l2l.png";

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="L2L Bienes Raíces"
      width={width}
      height={height}
      loading="eager"
      decoding="sync"
      className={className}
      style={{
        height,
        width: "auto",
        objectFit: "contain",
        display: "block",
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
