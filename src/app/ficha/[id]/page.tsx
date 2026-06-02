// src/app/ficha/[id]/page.tsx
// Página pública de ficha de inmueble — sin autenticación requerida.
// Genera OG tags para que WhatsApp muestre un preview lindo al pegar el link.

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MapPin, Maximize2, BedDouble, Bath, Car, Phone, Mail, ExternalLink } from "lucide-react";
import { fetchDomusProperties } from "@/services/domusService";
import { AGENTE_PATRICIA } from "@/lib/agente";

// ── Helpers ────────────────────────────────────────────────────────────────
function formatPrecio(precio: number, gestion: string): string {
  const n = new Intl.NumberFormat("es-CO").format(precio);
  return `$ ${n}`;
}

// ── Metadata para OG / WhatsApp preview ───────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { inmuebles } = await fetchDomusProperties();
  const inm = inmuebles.find((i) => i.id === id || i.codigoDomus === id);

  if (!inm) return { title: "Inmueble no encontrado" };

  const tag = inm.gestion === "venta" ? "en Venta" : "en Arriendo";
  const precio = new Intl.NumberFormat("es-CO").format(inm.precio);
  const desc = [
    `${inm.barrio}, ${inm.ciudad}`,
    `${inm.areaTotal}m²`,
    inm.habitaciones > 0 ? `${inm.habitaciones} hab.` : null,
    inm.banos > 0 ? `${inm.banos} baños` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const hasRealImg = inm.imagen && !inm.imagen.includes("placeholder");

  return {
    title: `${inm.tipo} ${tag} · $${precio} | L2L Bienes Raíces`,
    description: `${desc}. Contactá a Olga Patricia Vásquez, asesora de L2L Bienes Raíces.`,
    robots: { index: false, follow: false },
    openGraph: {
      title: `${inm.tipo} ${tag} · $ ${precio}`,
      description: `${inm.barrio}, ${inm.ciudad} · ${inm.areaTotal}m²`,
      images: hasRealImg
        ? [{ url: inm.imagen, width: 1200, height: 630, alt: inm.titulo }]
        : [],
      type: "website",
      siteName: "L2L Bienes Raíces",
    },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────
export default async function FichaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { inmuebles } = await fetchDomusProperties();
  const inm = inmuebles.find((i) => i.id === id || i.codigoDomus === id);

  if (!inm) return notFound();

  const agente = AGENTE_PATRICIA;
  const tag = inm.gestion === "venta" ? "VENTA" : "ARRIENDO";
  const tagBg = inm.gestion === "venta" ? "#1a6fcf" : "#C41E3A";
  const hasImg = inm.imagen && !inm.imagen.includes("placeholder");
  const precio = formatPrecio(inm.precio, inm.gestion);

  const wsText = encodeURIComponent(
    `Hola Patricia! Me interesa el inmueble en ${inm.barrio}, ${inm.ciudad} (Ref: ${inm.id}).\n` +
    `${inm.tipo} ${tag.toLowerCase()} · ${precio}`
  );
  const wsUrl = `https://wa.me/${agente.telefonoWS}?text=${wsText}`;

  const stats = [
    { icon: Maximize2, label: `${inm.areaTotal} m²`, show: true },
    { icon: BedDouble, label: `${inm.habitaciones} hab.`, show: inm.habitaciones > 0 },
    { icon: Bath, label: `${inm.banos} baños`, show: inm.banos > 0 },
    { icon: Car, label: `${inm.garajes} gar.`, show: inm.garajes > 0 },
  ].filter((s) => s.show);

  return (
    <div style={{
      maxWidth: 480,
      margin: "0 auto",
      background: "#fff",
      minHeight: "100dvh",
      fontFamily: "var(--font-inter, -apple-system, system-ui, sans-serif)",
    }}>

      {/* ── Hero ── */}
      <div style={{ position: "relative", width: "100%", height: 300, background: "#e8e8e8", overflow: "hidden" }}>
        {hasImg ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={inm.imagen}
            alt={inm.titulo}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f5", color: "#bbb", fontSize: 15 }}>
            Sin foto disponible
          </div>
        )}

        {/* Gradient bottom */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 55%)" }} />

        {/* Tag + precio */}
        <div style={{ position: "absolute", bottom: 20, left: 20, right: 20 }}>
          <span style={{
            display: "inline-block",
            background: tagBg,
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            padding: "4px 12px",
            borderRadius: 20,
            letterSpacing: "0.08em",
            marginBottom: 8,
          }}>
            {tag}
          </span>
          <div style={{ color: "#fff", fontSize: 32, fontWeight: 800, lineHeight: 1, textShadow: "0 2px 12px rgba(0,0,0,0.4)" }}>
            {precio}
          </div>
          {inm.gestion === "arriendo" && (
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 15, marginTop: 2 }}>por mes</div>
          )}
        </div>
      </div>

      {/* ── Contenido ── */}
      <div style={{ padding: "22px 20px 0" }}>

        {/* Título + ubicación */}
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111", margin: "0 0 6px", lineHeight: 1.3 }}>
          {inm.tipo} {inm.gestion === "venta" ? "en Venta" : "en Arriendo"}
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#666", fontSize: 15, marginBottom: 20 }}>
          <MapPin size={14} color="#C41E3A" />
          <span>{inm.barrio}, {inm.ciudad}</span>
        </div>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: 8, marginBottom: 20 }}>
          {stats.map(({ icon: Icon, label }, i) => (
            <div key={i} style={{
              background: "#fafafa",
              border: "1px solid #f0f0f0",
              borderRadius: 12,
              padding: "12px 8px",
              textAlign: "center",
            }}>
              <Icon size={20} color="#C41E3A" style={{ marginBottom: 6 }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: "#333" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Ref */}
        <div style={{ fontSize: 14, color: "#aaa", marginBottom: 20 }}>
          Ref: {inm.id} · L2L Bienes Raíces
        </div>

        <div style={{ height: 1, background: "#f0f0f0", marginBottom: 20 }} />

        {/* Agente */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "16px",
          background: "#fafafa",
          borderRadius: 14,
          border: "1px solid #efefef",
          marginBottom: 16,
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={agente.foto}
            alt={agente.nombreCompleto}
            style={{
              width: 58,
              height: 58,
              borderRadius: "50%",
              objectFit: "cover",
              border: "2.5px solid #C41E3A",
              flexShrink: 0,
            }}
          />
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#111" }}>{agente.nombreCompleto}</div>
            <div style={{ fontSize: 14, color: "#C41E3A", fontWeight: 600 }}>{agente.cargo}</div>
            <div style={{ fontSize: 14, color: "#888" }}>{agente.inmobiliaria}</div>
          </div>
        </div>

        {/* Contacto */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
          <a href={`tel:${agente.telefono}`} style={{
            display: "flex", alignItems: "center", gap: 12,
            color: "#333", textDecoration: "none", fontSize: 16,
          }}>
            <div style={{ width: 38, height: 38, background: "#f5f5f5", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Phone size={17} color="#C41E3A" />
            </div>
            {agente.telefono}
          </a>
          <a href={`mailto:${agente.email}`} style={{
            display: "flex", alignItems: "center", gap: 12,
            color: "#333", textDecoration: "none", fontSize: 16,
          }}>
            <div style={{ width: 38, height: 38, background: "#f5f5f5", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Mail size={17} color="#C41E3A" />
            </div>
            {agente.email}
          </a>
        </div>
      </div>

      {/* ── CTAs ── */}
      <div style={{ padding: "0 20px 48px", display: "flex", flexDirection: "column", gap: 10 }}>
        <a
          href={wsUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            background: "#25D366", color: "#fff", textDecoration: "none",
            padding: "17px", borderRadius: 14, fontSize: 18, fontWeight: 700,
            boxShadow: "0 4px 20px rgba(37,211,102,0.35)",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Contactar a Patricia
        </a>

        {inm.urlL2L && (
          <a
            href={inm.urlL2L}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              color: "#666", textDecoration: "none",
              padding: "13px", borderRadius: 14, fontSize: 15, fontWeight: 500,
              border: "1px solid #e5e5e5",
            }}
          >
            <ExternalLink size={15} />
            Ver más fotos en l2lbienesraices.com
          </a>
        )}
      </div>

    </div>
  );
}
