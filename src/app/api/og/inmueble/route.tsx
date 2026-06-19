// src/app/api/og/inmueble/route.tsx
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const L2L_RED       = "#de040b";
const L2L_LOGO_URL  = "https://www.l2lbienesraices.com/assets/img/logo-2024.png";
const AGENTE_TEL    = "+57 315 467 2851";
const AGENTE_NOMBRE = "Olga Patricia Vasquez - Asesora L2L";
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
    const mime  = r.headers.get("content-type") ?? "image/jpeg";
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
  const gestionLabel = esArriendo ? "* EN ARRIENDO" : "* EN VENTA";
  const precioStr    = fmt(precio);
  const barrioCiudad = [barrio, ciudad].filter(Boolean).join(", ").toUpperCase();

  const [imagenSrc, logoSrc] = await Promise.all([
    imagen ? toBase64(imagen) : Promise.resolve(""),
    toBase64(L2L_LOGO_URL),
  ]);

  const pill = (emoji: string, val: number, label: string) => ({
    emoji, val, label
  });

  const pills = [
    habitaciones > 0 ? pill("Hab:", habitaciones, "hab") : null,
    banos        > 0 ? pill("Ban:", banos,         "banos") : null,
    area         > 0 ? pill("m2:", area,            "m2") : null,
    garajes      > 0 ? pill("Gar:", garajes,        "") : null,
  ].filter(Boolean) as { emoji: string; val: number; label: string }[];

  return new ImageResponse(
    (
      <div style={{ width:1080, height:1080, display:"flex", position:"relative", backgroundColor:"#0a0a0a", fontFamily:"sans-serif", overflow:"hidden" }}>

        {imagenSrc && (
          <img src={imagenSrc} width={1080} height={1080} style={{ position:"absolute", top:0, left:0, width:1080, height:1080, objectFit:"cover" }} />
        )}

        <div style={{ position:"absolute", top:0, left:0, right:0, height:280, background:"linear-gradient(to bottom,rgba(0,0,0,0.85) 0%,transparent 100%)", display:"flex" }} />
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:650, background:"linear-gradient(to top,rgba(0,0,0,0.97) 0%,rgba(0,0,0,0.90) 35%,rgba(0,0,0,0.55) 65%,transparent 100%)", display:"flex" }} />
        <div style={{ position:"absolute", left:0, top:0, bottom:0, width:10, background:L2L_RED, display:"flex" }} />

        <div style={{ position:"absolute", top:48, left:56, right:52, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ background:"white", borderRadius:14, padding:"8px 18px", display:"flex", alignItems:"center", boxShadow:"0 2px 24px rgba(0,0,0,0.5)" }}>
            {logoSrc
              ? <img src={logoSrc} width={144} height={46} style={{ objectFit:"contain" }} />
              : <div style={{ color:L2L_RED, fontSize:30, fontWeight:900, display:"flex" }}>L2L</div>
            }
          </div>
          <div style={{ background:L2L_RED, borderRadius:10, padding:"13px 32px", display:"flex", alignItems:"center", fontSize:28, fontWeight:900, color:"white", letterSpacing:"0.06em", boxShadow:"0 4px 28px rgba(222,4,11,0.55)" }}>
            {gestionLabel}
          </div>
        </div>

        <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"0 60px 52px 60px", display:"flex", flexDirection:"column" }}>

          <div style={{ color:"rgba(255,255,255,0.5)", fontSize:26, fontWeight:500, marginBottom:6, display:"flex" }}>{tipo}</div>

          <div style={{ color:"white", fontSize:46, fontWeight:800, marginBottom:8, display:"flex", letterSpacing:"0.02em" }}>{barrioCiudad}</div>

          <div style={{ width:72, height:5, background:L2L_RED, borderRadius:3, marginBottom:20, display:"flex" }} />

          <div style={{ color:"white", fontSize:110, fontWeight:900, lineHeight:1, letterSpacing:"-0.03em", marginBottom:28, display:"flex" }}>{precioStr}</div>

          <div style={{ display:"flex", gap:14, marginBottom:36 }}>
            {pills.map((pp, i) => (
              <div key={i} style={{ background:"rgba(255,255,255,0.10)", border:"1px solid rgba(255,255,255,0.18)", borderRadius:10, padding:"10px 22px", color:"white", fontSize:30, fontWeight:700, display:"flex", alignItems:"center", gap:10 }}>
                {pp.emoji} {pp.val}<span style={{ color:"rgba(255,255,255,0.5)", fontSize:26, fontWeight:400 }}> {pp.label}</span>
              </div>
            ))}
          </div>

          <div style={{ width:"100%", height:1, background:"rgba(255,255,255,0.12)", marginBottom:28, display:"flex" }} />

          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <div style={{ color:"white", fontSize:36, fontWeight:800, display:"flex", alignItems:"center", gap:12 }}>Tel: {AGENTE_TEL}</div>
              <div style={{ color:"rgba(255,255,255,0.65)", fontSize:26, fontWeight:500, display:"flex" }}>{AGENTE_NOMBRE}</div>
            </div>
            <div style={{ color:L2L_RED, fontSize:26, fontWeight:700, display:"flex", alignItems:"center", letterSpacing:"0.01em" }}>{URL_WEB}</div>
          </div>

        </div>
      </div>
    ),
    { width:1080, height:1080 }
  );
}
