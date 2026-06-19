// src/app/api/og/inmueble/route.tsx
// Card branded 1080x1080 con identidad visual de L2L Bienes Raíces
// Paleta oficial: rojo #de040b · teal #07c196 · Ubuntu/Roboto

import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

// Brand tokens L2L (extraídos de style.css en l2lbienesraices.com)
const L2L_RED    = "#de040b";
const L2L_TEAL   = "#07c196";
const L2L_DARK   = "#111111";

const L2L_LOGO_URL  = "https://www.l2lbienesraices.com/assets/img/logo-2024.png";
const AGENTE_TEL    = "+57 315 467 2851";
const AGENTE_NOMBRE = "Olga Patricia Vásquez";
const URL_WEB       = "www.l2lbienesraices.com";

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `$${Math.round(n / 1_000_000)}M`;
  return `$${Math.round(n / 1_000)}K`;
}

/** Fetch external image → base64 data URL (Edge Runtime, sin Buffer) */
async function toBase64(url: string): Promise<string> {
  try {
    const r = await fetch(url, { headers: { "User-Agent": "SalesHelper-OG/1.0" } });
    if (!r.ok) return "";
    const buf   = await r.arrayBuffer();
    const mime  = r.headers.get("content-type") ?? "image/jpeg";
    const bytes = new Uint8Array(buf);
    let binary  = "";
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return `data:${mime};base64,${btoa(binary)}`;
  } catch { return ""; }
}

export async function GET(req: NextRequest) {
  const p = new URL(req.url).searchParams;

  const imagen       = p.get("imagen")       ?? "";
  const tipo         = p.get("tipo")         ?? "Inmueble";
  const barrio       = p.get("barrio")       ?? "";
  const ciudad       = p.get("ciudad")       ?? "Bogotá";
  const gestion      = p.get("gestion")      ?? "venta";
  const precio       = Number(p.get("precio")       ?? 0);
  const habitaciones = Number(p.get("habitaciones") ?? 0);
  const banos        = Number(p.get("banos")        ?? 0);
  const area         = Number(p.get("area")         ?? 0);
  const garajes      = Number(p.get("garajes")      ?? 0);

  const esArriendo    = gestion === "arriendo";
  const brandColor    = esArriendo ? L2L_TEAL : L2L_RED;
  const gestionLabel  = esArriendo ? "EN ARRIENDO" : "EN VENTA";
  const precioStr     = fmt(precio);

  // Fetch en paralelo: foto del inmueble + logo L2L
  const [imagenSrc, logoSrc] = await Promise.all([
    imagen ? toBase64(imagen) : Promise.resolve(""),
    toBase64(L2L_LOGO_URL),
  ]);

  // ── Layout: foto ocupa parte superior, panel de info en la inferior ──
  const PHOTO_H = 650; // px de foto visible
  const INFO_H  = 1080 - PHOTO_H; // 430px de panel info

  return new ImageResponse(
    (
      <div style={{
        width: 1080, height: 1080,
        display: "flex", flexDirection: "column",
        backgroundColor: L2L_DARK,
        fontFamily: "sans-serif",
        overflow: "hidden",
      }}>

        {/* ══ ZONA FOTO (top) ══════════════════════════════════════ */}
        <div style={{
          position: "relative",
          width: 1080, height: PHOTO_H,
          display: "flex", flexShrink: 0,
          overflow: "hidden",
          backgroundColor: "#1a1a2e",
        }}>
          {/* Foto */}
          {imagenSrc && (
            <img
              src={imagenSrc}
              width={1080} height={PHOTO_H}
              style={{ position: "absolute", top: 0, left: 0, width: 1080, height: PHOTO_H, objectFit: "cover" }}
            />
          )}

          {/* Gradiente bottom-fade para blend suave con el panel */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 200,
            background: `linear-gradient(to top, ${L2L_DARK} 0%, transparent 100%)`,
            display: "flex",
          }} />

          {/* Velo top para legibilidad del logo */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 160,
            background: "linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, transparent 100%)",
            display: "flex",
          }} />

          {/* ── Logo L2L (top-left) ── */}
          <div style={{
            position: "absolute", top: 44, left: 52,
            background: "white",
            borderRadius: 14,
            padding: "8px 18px",
            display: "flex", alignItems: "center",
            boxShadow: "0 2px 20px rgba(0,0,0,0.45)",
          }}>
            {logoSrc ? (
              <img src={logoSrc} width={148} height={48} style={{ objectFit: "contain" }} />
            ) : (
              <div style={{ color: L2L_RED, fontSize: 28, fontWeight: 900, display: "flex" }}>L2L</div>
            )}
          </div>

          {/* ── Badge GESTION (top-right) ── */}
          <div style={{
            position: "absolute", top: 44, right: 52,
            background: brandColor,
            borderRadius: 12,
            padding: "14px 36px",
            display: "flex", alignItems: "center",
            fontSize: 30, fontWeight: 900,
            color: "white",
            letterSpacing: "0.1em",
            boxShadow: `0 4px 28px ${brandColor}88`,
          }}>
            {gestionLabel}
          </div>
        </div>

        {/* ══ PANEL INFO (bottom) ══════════════════════════════════ */}
        <div style={{
          width: 1080, height: INFO_H,
          display: "flex", flexDirection: "column",
          backgroundColor: L2L_DARK,
          padding: "28px 56px 0 56px",
          position: "relative",
          flexShrink: 0,
        }}>

          {/* Acento lateral izquierdo */}
          <div style={{
            position: "absolute", left: 0, top: 0, bottom: 0,
            width: 10, background: brandColor,
            display: "flex",
          }} />

          {/* Tipo + ubicación */}
          <div style={{
            color: "rgba(255,255,255,0.55)",
            fontSize: 30, fontWeight: 500,
            marginBottom: 6,
            display: "flex",
          }}>
            {tipo}{barrio ? ` · ${barrio}` : ""}{ciudad ? `, ${ciudad}` : ""}
          </div>

          {/* Precio — héroe absoluto */}
          <div style={{
            color: "white",
            fontSize: 108, fontWeight: 900,
            lineHeight: 1,
            letterSpacing: "-0.03em",
            display: "flex",
            alignItems: "flex-end",
            gap: 16,
            marginBottom: 24,
          }}>
            {precioStr}
            {/* Línea de acento bajo el precio */}
            <div style={{
              width: 80, height: 8,
              background: brandColor,
              borderRadius: 4,
              marginBottom: 14,
              display: "flex",
            }} />
          </div>

          {/* Feature pills */}
          <div style={{ display: "flex", gap: 16, marginBottom: 28 }}>
            {habitaciones > 0 && (
              <div style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 10,
                padding: "10px 22px",
                color: "white",
                fontSize: 30,
                fontWeight: 700,
                display: "flex", alignItems: "center", gap: 10,
              }}>
                🛏 {habitaciones} <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 26 }}>hab</span>
              </div>
            )}
            {banos > 0 && (
              <div style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 10,
                padding: "10px 22px",
                color: "white",
                fontSize: 30,
                fontWeight: 700,
                display: "flex", alignItems: "center", gap: 10,
              }}>
                🚿 {banos} <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 26 }}>baños</span>
              </div>
            )}
            {area > 0 && (
              <div style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 10,
                padding: "10px 22px",
                color: "white",
                fontSize: 30,
                fontWeight: 700,
                display: "flex", alignItems: "center", gap: 10,
              }}>
                📐 {area} <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 26 }}>m²</span>
              </div>
            )}
            {garajes > 0 && (
              <div style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 10,
                padding: "10px 22px",
                color: "white",
                fontSize: 30,
                fontWeight: 700,
                display: "flex", alignItems: "center", gap: 10,
              }}>
                🚗 {garajes}
              </div>
            )}
          </div>

          {/* Separador */}
          <div style={{ width: "100%", height: 1, background: "rgba(255,255,255,0.10)", marginBottom: 22, display: "flex" }} />

          {/* Pie: agente + CTA */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ color: "white", fontSize: 28, fontWeight: 700, display: "flex" }}>
                📱 {AGENTE_TEL}
              </div>
              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 22, display: "flex" }}>
                {AGENTE_NOMBRE} · {URL_WEB}
              </div>
            </div>
            {/* CTA con color de marca */}
            <div style={{
              background: brandColor,
              borderRadius: 14,
              padding: "16px 34px",
              color: "white",
              fontSize: 28,
              fontWeight: 800,
              display: "flex", alignItems: "center", gap: 10,
              boxShadow: `0 4px 24px ${brandColor}66`,
            }}>
              🏡 Solicita tu visita
            </div>
          </div>

        </div>

        {/* ══ FRANJA INFERIOR de marca ══════════════════════════════ */}
        <div style={{
          width: 1080, height: 14,
          background: `linear-gradient(to right, ${brandColor}, ${esArriendo ? L2L_RED : L2L_TEAL})`,
          display: "flex", flexShrink: 0,
        }} />

      </div>
    ),
    { width: 1080, height: 1080 }
  );
}



