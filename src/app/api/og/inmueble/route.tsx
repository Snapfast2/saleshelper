// src/app/api/og/inmueble/route.tsx
// Genera una card branded 1080x1080 para Instagram/Facebook
// Usa next/og (Satori) — Edge Runtime

import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const L2L_LOGO      = "https://pictures.domus.la/logos/inmobiliaria_607/logo_607.jpg?v=733";
const AGENTE_TEL    = "+57 315 467 2851";
const AGENTE_NOMBRE = "Olga Patricia Vasquez · L2L Bienes Raices";

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `$${Math.round(n / 1_000_000)}M`;
  return `$${Math.round(n / 1_000)}K`;
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
  const gestionColor = esArriendo ? "#15803d" : "#1d4ed8";
  const precioStr    = fmt(precio);

  return new ImageResponse(
    (
      <div style={{ width:1080, height:1080, display:"flex", position:"relative", backgroundColor:"#0f172a", fontFamily:"sans-serif", overflow:"hidden" }}>

        {/* Foto de fondo */}
        {imagen ? (
          <div style={{ position:"absolute", inset:0, backgroundImage:`url(${imagen})`, backgroundSize:"cover", backgroundPosition:"center", display:"flex" }} />
        ) : (
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(135deg,#1e3a5f 0%,#0f172a 100%)", display:"flex" }} />
        )}

        {/* Gradiente superior */}
        <div style={{ position:"absolute", top:0, left:0, right:0, height:320, background:"linear-gradient(to bottom,rgba(0,0,0,0.82) 0%,transparent 100%)", display:"flex" }} />

        {/* Gradiente inferior */}
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:560, background:"linear-gradient(to top,rgba(0,0,0,0.96) 0%,rgba(0,0,0,0.75) 55%,transparent 100%)", display:"flex" }} />

        {/* Borde lateral color marca */}
        <div style={{ position:"absolute", left:0, top:0, bottom:0, width:12, background:gestionColor, display:"flex" }} />

        {/* TOP: Logo + Badge */}
        <div style={{ position:"absolute", top:52, left:60, right:52, display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div style={{ background:"white", borderRadius:18, padding:"10px 20px", display:"flex", alignItems:"center", boxShadow:"0 4px 24px rgba(0,0,0,0.4)" }}>
            <img src={L2L_LOGO} width={160} height={52} alt="L2L" style={{ objectFit:"contain" }} />
          </div>
          <div style={{ background:gestionColor, color:"white", borderRadius:14, padding:"14px 32px", fontSize:30, fontWeight:800, letterSpacing:"0.08em", display:"flex", alignItems:"center", boxShadow:"0 4px 24px rgba(0,0,0,0.4)" }}>
            {gestionLabel}
          </div>
        </div>

        {/* BOTTOM: Info del inmueble */}
        <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"0 60px 56px", display:"flex", flexDirection:"column" }}>

          {/* Tipo + ubicacion */}
          <div style={{ color:"rgba(255,255,255,0.72)", fontSize:36, fontWeight:500, marginBottom:6, display:"flex" }}>
            {tipo}{barrio ? ` · ${barrio}` : ""}{ciudad ? `, ${ciudad}` : ""}
          </div>

          {/* Precio */}
          <div style={{ color:"#fbbf24", fontSize:100, fontWeight:900, lineHeight:1, marginBottom:28, display:"flex", letterSpacing:"-0.02em" }}>
            {precioStr}
          </div>

          {/* Caracteristicas */}
          <div style={{ display:"flex", gap:36, marginBottom:36 }}>
            {habitaciones > 0 && (
              <div style={{ color:"white", fontSize:36, display:"flex", alignItems:"center", gap:10 }}>
                🛏 <span style={{ fontWeight:700 }}>{habitaciones}</span><span style={{ color:"rgba(255,255,255,0.65)", fontWeight:400, fontSize:28 }}> hab</span>
              </div>
            )}
            {banos > 0 && (
              <div style={{ color:"white", fontSize:36, display:"flex", alignItems:"center", gap:10 }}>
                🚿 <span style={{ fontWeight:700 }}>{banos}</span><span style={{ color:"rgba(255,255,255,0.65)", fontWeight:400, fontSize:28 }}> banos</span>
              </div>
            )}
            {area > 0 && (
              <div style={{ color:"white", fontSize:36, display:"flex", alignItems:"center", gap:10 }}>
                📐 <span style={{ fontWeight:700 }}>{area}</span><span style={{ color:"rgba(255,255,255,0.65)", fontWeight:400, fontSize:28 }}> m2</span>
              </div>
            )}
            {garajes > 0 && (
              <div style={{ color:"white", fontSize:36, display:"flex", alignItems:"center", gap:10 }}>
                🚗 <span style={{ fontWeight:700 }}>{garajes}</span>
              </div>
            )}
          </div>

          {/* Separador */}
          <div style={{ width:"100%", height:1, background:"rgba(255,255,255,0.18)", marginBottom:28, display:"flex" }} />

          {/* Pie: contacto + CTA */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              <div style={{ color:"white", fontSize:30, fontWeight:700, display:"flex" }}>📱 {AGENTE_TEL}</div>
              <div style={{ color:"rgba(255,255,255,0.6)", fontSize:24, display:"flex" }}>{AGENTE_NOMBRE}</div>
            </div>
            <div style={{ background:"rgba(255,255,255,0.12)", border:"1.5px solid rgba(255,255,255,0.30)", borderRadius:12, padding:"12px 26px", color:"white", fontSize:26, fontWeight:600, display:"flex", alignItems:"center", gap:10 }}>
              🏡 Solicita tu visita
            </div>
          </div>
        </div>
      </div>
    ),
    { width:1080, height:1080 }
  );
}
