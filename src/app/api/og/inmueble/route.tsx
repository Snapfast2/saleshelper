// src/app/api/og/inmueble/route.tsx
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const L2L_RED       = "#de040b";
const AGENTE_TEL    = "+57 315 467 2851";
const AGENTE_NOMBRE = "Patricia Vasquez";
const AGENTE_ROL    = "Asesora Inmobiliaria - L2L Bienes Raices";
const URL_WEB       = "www.l2lbienesraices.com";

function fmt(n: number): string {
  if (n >= 1_000_000_000) return "$" + (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000)     return "$" + Math.round(n / 1_000_000) + "M";
  return "$" + Math.round(n / 1_000) + "K";
}

async function toBase64(url: string): Promise<string> {
  try {
    const r = await fetch(url, { headers: { "User-Agent": "SalesHelper-OG/1.0" } });
    if (!r.ok) return "";
    const buf   = await r.arrayBuffer();
    const mime  = r.headers.get("content-type") ?? "image/png";
    const bytes = new Uint8Array(buf);
    let binary  = "";
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return "data:" + mime + ";base64," + btoa(binary);
  } catch { return ""; }
}

export async function GET(req: NextRequest) {
  const p = new URL(req.url).searchParams;
  const imagen       = p.get("imagen")       ?? "";
  const tipo         = p.get("tipo")         ?? "Inmueble";
  const barrio       = p.get("barrio")       ?? "";
  const ciudad       = p.get("ciudad")       ?? "Bogota";
  const gestion      = p.get("gestion")      ?? "venta";
  const precio       = Number(p.get("precio")       ?? 0);
  const habitaciones = Number(p.get("habitaciones") ?? 0);
  const banos        = Number(p.get("banos")        ?? 0);
  const area         = Number(p.get("area")         ?? 0);
  const garajes      = Number(p.get("garajes")      ?? 0);

  const esArriendo   = gestion === "arriendo";
  const gestionLabel = esArriendo ? "EN ARRIENDO" : "EN VENTA";
  const precioStr    = fmt(precio);
  const barrioCiudad = [barrio, ciudad].filter(Boolean).join(", ").toUpperCase();

  // Logo desde el mismo servidor
  const host     = req.headers.get("host") ?? "";
  const proto    = host.startsWith("localhost") ? "http" : "https";
  const logoUrl  = proto + "://" + host + "/logo-l2l.png";

  const [imagenSrc, logoSrc] = await Promise.all([
    imagen ? toBase64(imagen) : Promise.resolve(""),
    toBase64(logoUrl),
  ]);

  // Labels correctas en espanol
  const habLabel = habitaciones === 1 ? "Habitacion" : "Habitaciones";
  const banLabel = banos === 1        ? "Bano"       : "Banos";
  const garLabel = garajes === 1      ? "Garaje"     : "Garajes";

  return new ImageResponse(
    (
      <div style={{ width:1080, height:1080, display:"flex", position:"relative", backgroundColor:"#0a0a0a", fontFamily:"sans-serif", overflow:"hidden" }}>

        {/* Foto full-bleed */}
        {imagenSrc && (
          <img src={imagenSrc} width={1080} height={1080} style={{ position:"absolute", top:0, left:0, width:1080, height:1080, objectFit:"cover" }} />
        )}

        {/* Gradiente top */}
        <div style={{ position:"absolute", top:0, left:0, right:0, height:340, background:"linear-gradient(to bottom,rgba(0,0,0,0.90) 0%,transparent 100%)", display:"flex" }} />

        {/* Gradiente bottom */}
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:650, background:"linear-gradient(to top,rgba(0,0,0,0.97) 0%,rgba(0,0,0,0.90) 35%,rgba(0,0,0,0.55) 65%,transparent 100%)", display:"flex" }} />

        {/* Borde rojo izquierdo - toda la altura */}
        <div style={{ position:"absolute", left:0, top:0, bottom:0, width:10, background:L2L_RED, display:"flex" }} />

        {/* TOP: Logo + Badge */}
        <div style={{ position:"absolute", top:48, left:56, right:52, display:"flex", justifyContent:"space-between", alignItems:"center" }}>

          {/* Logo L2L directo sobre gradiente (fondo transparente) */}
          {logoSrc && (
            <img src={logoSrc} width={200} height={90} style={{ objectFit:"contain" }} />
          )}

          {/* Badge siempre rojo, sin asterisco */}
          <div style={{ background:L2L_RED, borderRadius:10, padding:"13px 36px", display:"flex", alignItems:"center", fontSize:30, fontWeight:900, color:"white", letterSpacing:"0.06em", boxShadow:"0 4px 28px rgba(222,4,11,0.55)" }}>
            {gestionLabel}
          </div>
        </div>

        {/* BOTTOM: info */}
        <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"0 60px 52px 60px", display:"flex", flexDirection:"column" }}>

          {/* Tipo */}
          <div style={{ color:"rgba(255,255,255,0.5)", fontSize:26, fontWeight:500, marginBottom:6, display:"flex" }}>{tipo}</div>

          {/* Localidad uppercase */}
          <div style={{ color:"white", fontSize:46, fontWeight:800, marginBottom:8, display:"flex", letterSpacing:"0.02em" }}>{barrioCiudad}</div>

          {/* Linea roja */}
          <div style={{ width:72, height:5, background:L2L_RED, borderRadius:3, marginBottom:20, display:"flex" }} />

          {/* Precio */}
          <div style={{ color:"white", fontSize:110, fontWeight:900, lineHeight:1, letterSpacing:"-0.03em", marginBottom:28, display:"flex" }}>{precioStr}</div>

          {/* Pills */}
          <div style={{ display:"flex", gap:14, marginBottom:36 }}>
            {habitaciones > 0 && (
              <div style={{ background:"rgba(255,255,255,0.10)", border:"1px solid rgba(255,255,255,0.18)", borderRadius:10, padding:"10px 24px", color:"white", fontSize:30, fontWeight:700, display:"flex", alignItems:"center", gap:8 }}>
                {habitaciones} <span style={{ color:"rgba(255,255,255,0.55)", fontSize:26, fontWeight:400 }}>{habLabel}</span>
              </div>
            )}
            {banos > 0 && (
              <div style={{ background:"rgba(255,255,255,0.10)", border:"1px solid rgba(255,255,255,0.18)", borderRadius:10, padding:"10px 24px", color:"white", fontSize:30, fontWeight:700, display:"flex", alignItems:"center", gap:8 }}>
                {banos} <span style={{ color:"rgba(255,255,255,0.55)", fontSize:26, fontWeight:400 }}>{banLabel}</span>
              </div>
            )}
            {area > 0 && (
              <div style={{ background:"rgba(255,255,255,0.10)", border:"1px solid rgba(255,255,255,0.18)", borderRadius:10, padding:"10px 24px", color:"white", fontSize:30, fontWeight:700, display:"flex", alignItems:"center", gap:8 }}>
                {area} <span style={{ color:"rgba(255,255,255,0.55)", fontSize:26, fontWeight:400 }}>m2</span>
              </div>
            )}
            {garajes > 0 && (
              <div style={{ background:"rgba(255,255,255,0.10)", border:"1px solid rgba(255,255,255,0.18)", borderRadius:10, padding:"10px 24px", color:"white", fontSize:30, fontWeight:700, display:"flex", alignItems:"center", gap:8 }}>
                {garajes} <span style={{ color:"rgba(255,255,255,0.55)", fontSize:26, fontWeight:400 }}>{garLabel}</span>
              </div>
            )}
          </div>

          {/* Separador */}
          <div style={{ width:"100%", height:1, background:"rgba(255,255,255,0.12)", marginBottom:28, display:"flex" }} />

          {/* Contacto */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {/* Nombre primero, en negrita igual que el precio */}
              <div style={{ color:"white", fontSize:38, fontWeight:900, display:"flex", letterSpacing:"-0.01em" }}>{AGENTE_NOMBRE}</div>
              <div style={{ color:"white", fontSize:34, fontWeight:700, display:"flex" }}>{AGENTE_TEL}</div>
              <div style={{ color:"rgba(255,255,255,0.50)", fontSize:24, fontWeight:400, display:"flex" }}>{AGENTE_ROL}</div>
            </div>
            <div style={{ color:L2L_RED, fontSize:24, fontWeight:700, display:"flex", alignItems:"flex-end", letterSpacing:"0.01em" }}>{URL_WEB}</div>
          </div>

        </div>
      </div>
    ),
    { width:1080, height:1080 }
  );
}
