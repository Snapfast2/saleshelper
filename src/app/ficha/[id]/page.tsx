// src/app/ficha/[id]/page.tsx
// Página pública de ficha de inmueble — sin autenticación requerida.
// Genera OG tags para que WhatsApp muestre un preview limpio al compartir el link.

import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  MapPin,
  Maximize2,
  Layers,
  BedDouble,
  Bath,
  Car,
  Phone,
  Mail,
  ExternalLink,
  ShieldCheck,
  Building2,
  MessageCircle,
} from "lucide-react";
import { fetchDomusProperties } from "@/services/domusService";
import { scrapeL2L } from "@/services/l2lService";
import L2LLogo from "@/components/L2LLogo";
import { AGENTE_PATRICIA } from "@/lib/agente";
import ImageCarousel from "@/components/ImageCarousel";
import FichaViewTracker from "@/components/FichaViewTracker";
import type { Inmueble } from "@/types";

// ── Helpers ────────────────────────────────────────────────────────────────
function formatPrecio(precio: number): string {
  const n = new Intl.NumberFormat("es-CO").format(precio);
  return `$ ${n}`;
}

function cleanDescripcion(raw?: string): string {
  if (!raw) return "";
  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Deduplica la búsqueda entre generateMetadata y FichaPage en la misma petición,
 * leyendo desde la caché Redis de L2L (<30ms) y sin disparar logins a Domus.
 */
const findPublicInmueble = cache(async (id: string): Promise<Inmueble | undefined> => {
  if (!/^\d{1,12}$/.test(id)) return undefined;

  try {
    const l2l = await scrapeL2L();
    const matchL2L = l2l.inmuebles.find((i) => i.id === id || i.codigoDomus === id);
    if (matchL2L) return matchL2L;
  } catch {
    // Continuar a caché Domus
  }

  try {
    const domus = await fetchDomusProperties({ allowLogin: false });
    return domus.inmuebles.find((i) => i.id === id || i.codigoDomus === id);
  } catch {
    return undefined;
  }
});

// ── Metadata para OG / WhatsApp preview ───────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const inm = await findPublicInmueble(id);

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
  const inm = await findPublicInmueble(id);

  if (!inm) return notFound();

  const agente = AGENTE_PATRICIA;
  const refCode = inm.codigoDomus || inm.id;
  const esVenta = inm.gestion === "venta";
  const tag = esVenta ? "En Venta" : "En Arriendo";
  const precio = formatPrecio(inm.precio);
  const adminValor =
    typeof inm.administracion === "number" && inm.administracion > 0
      ? formatPrecio(inm.administracion)
      : null;

  const galleryImages = Array.from(
    new Set(
      [inm.imagen, ...(inm.imagenes ?? [])].filter(
        (src): src is string => Boolean(src && src.trim() && !src.includes("placeholder"))
      )
    )
  );

  const descripcionLimpia = cleanDescripcion(inm.descripcion);

  const wsText = encodeURIComponent(
    `Hola Patricia, vi la ficha del inmueble en ${inm.barrio}, ${inm.ciudad} (Ref. #${refCode} · ${inm.tipo} ${tag.toLowerCase()} por ${precio}) y me gustaría recibir más información.`
  );
  const wsUrl = `https://wa.me/${agente.telefonoWS}?text=${wsText}`;

  const showAreaConstruida =
    typeof inm.areaConstruida === "number" &&
    inm.areaConstruida > 0 &&
    inm.areaConstruida !== inm.areaTotal;

  const specs = [
    {
      icon: Maximize2,
      value: `${inm.areaTotal} m²`,
      label: "Área total",
      show: inm.areaTotal > 0,
    },
    {
      icon: Layers,
      value: `${inm.areaConstruida ?? 0} m²`,
      label: "Construida",
      show: showAreaConstruida,
    },
    {
      icon: BedDouble,
      value: String(inm.habitaciones),
      label: inm.habitaciones === 1 ? "Habitación" : "Habitaciones",
      show: inm.habitaciones > 0,
    },
    {
      icon: Bath,
      value: String(inm.banos),
      label: inm.banos === 1 ? "Baño" : "Baños",
      show: inm.banos > 0,
    },
    {
      icon: Car,
      value: String(inm.garajes),
      label: inm.garajes === 1 ? "Parqueadero" : "Parqueaderos",
      show: inm.garajes > 0,
    },
  ].filter((s) => s.show);

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100dvh",
        background: "var(--bg-base)",
        paddingBottom: 100,
        fontFamily: "var(--font-inter, -apple-system, system-ui, sans-serif)",
      }}
    >
      <FichaViewTracker id={inm.id} />

      <article
        style={{
          width: "100%",
          maxWidth: 640,
          margin: "0 auto",
          minHeight: "100dvh",
          background: "var(--bg-card)",
          borderLeft: "1px solid var(--border)",
          borderRight: "1px solid var(--border)",
          boxShadow: "0 10px 34px rgba(17, 24, 39, 0.05)",
        }}
      >
        {/* ── Cinta Arquitectónica Bicolor L2L ── */}
        <div
          aria-hidden="true"
          style={{
            height: 4,
            width: "100%",
            background: "var(--l2l-ribbon)",
          }}
        />

        {/* ── Barra Superior Corporativa L2L ── */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "13px 18px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-card)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
            <L2LLogo height={34} />
            <div
              style={{
                minWidth: 0,
                paddingLeft: 10,
                borderLeft: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  lineHeight: 1.2,
                }}
              >
                Ficha Comercial
              </div>
              <div style={{ fontSize: 11, color: "var(--l2l-slate)", fontWeight: 600 }}>
                Portafolio Verificado
              </div>
            </div>
          </div>

          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "5px 11px",
              borderRadius: 999,
              background: "var(--bg-base)",
              border: "1px solid var(--border)",
              fontSize: 12.5,
              fontWeight: 700,
              color: "var(--text-secondary)",
              fontVariantNumeric: "tabular-nums",
              flexShrink: 0,
            }}
          >
            Ref. #{refCode}
          </span>
        </header>

        {/* ── Hero Principal ── */}
        <div style={{ position: "relative", width: "100%", background: "#0f172a" }}>
          {galleryImages.length > 0 ? (
            <ImageCarousel images={galleryImages} alt={inm.titulo} height={330} />
          ) : (
            <div
              style={{
                width: "100%",
                height: 260,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: "var(--bg-card-hover)",
                color: "var(--text-muted)",
                fontSize: 14,
              }}
            >
              <Building2 size={32} />
              <span>Fotografías próximamente disponibles</span>
            </div>
          )}

          {/* Píldora de gestión sobre el hero */}
          <span
            style={{
              position: "absolute",
              top: 14,
              left: 14,
              padding: "5px 12px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "#fff",
              background: esVenta ? "rgba(184, 15, 18, 0.9)" : "rgba(22, 163, 74, 0.9)",
              backdropFilter: "blur(8px)",
              pointerEvents: "none",
            }}
          >
            {tag}
          </span>
        </div>

        {/* ── Tira de Galería Horizontal (si hay más de 1 imagen) ── */}
        {inm.imagenes && inm.imagenes.length > 1 && galleryImages.length > 1 && (
          <div
            style={{
              padding: "12px 20px 6px",
              borderBottom: "1px solid var(--border)",
              background: "var(--bg-base)",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 8,
                overflowX: "auto",
                paddingBottom: 6,
                WebkitOverflowScrolling: "touch",
              }}
            >
              {galleryImages.map((src, idx) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${src}-${idx}`}
                  src={src}
                  alt={`${inm.titulo} - foto ${idx + 1}`}
                  loading="lazy"
                  decoding="async"
                  style={{
                    height: 76,
                    width: 112,
                    borderRadius: 10,
                    objectFit: "cover",
                    flexShrink: 0,
                    border: "1px solid var(--border)",
                    background: "var(--bg-card-hover)",
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Cuerpo Editorial de la Ficha ── */}
        <div style={{ padding: "22px 20px 28px" }}>
          {/* Tipo + Título + Ubicación */}
          <div
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              color: "var(--red)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 4,
            }}
          >
            {inm.tipo} · {tag}
          </div>

          <h1
            style={{
              fontSize: 23,
              fontWeight: 800,
              color: "var(--text-primary)",
              lineHeight: 1.28,
              letterSpacing: "-0.015em",
              marginBottom: 8,
            }}
          >
            {inm.titulo || `${inm.tipo} en ${inm.barrio}`}
          </h1>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "var(--text-secondary)",
              fontSize: 15,
              marginBottom: 20,
            }}
          >
            <MapPin size={16} color="var(--red)" style={{ flexShrink: 0 }} />
            <span>
              {inm.barrio}, {inm.ciudad}
            </span>
          </div>

          {/* Bloque de Precio + Administración */}
          <div
            style={{
              padding: "16px 18px",
              borderRadius: 16,
              background: "var(--bg-base)",
              border: "1px solid var(--border)",
              marginBottom: 20,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginBottom: 2,
                }}
              >
                {esVenta ? "Valor de venta" : "Canon mensual"}
              </div>
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  lineHeight: 1.1,
                  letterSpacing: "-0.02em",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {precio}
                {!esVenta && (
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: "var(--text-muted)",
                      marginLeft: 6,
                    }}
                  >
                    / mes
                  </span>
                )}
              </div>
            </div>

            {adminValor && (
              <div
                style={{
                  padding: "6px 12px",
                  borderRadius: 10,
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                Administración:{" "}
                <strong style={{ color: "var(--text-primary)" }}>{adminValor}</strong>
              </div>
            )}
          </div>

          {/* Grilla de Especificaciones */}
          {specs.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(105px, 1fr))",
                gap: 10,
                marginBottom: 24,
              }}
            >
              {specs.map(({ icon: Icon, value, label }) => (
                <div
                  key={label}
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: 14,
                    padding: "12px 10px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 6,
                  }}
                >
                  <Icon size={18} color="var(--red)" />
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: "var(--text-primary)",
                      fontVariantNumeric: "tabular-nums",
                      lineHeight: 1.15,
                    }}
                  >
                    {value}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: "var(--text-muted)",
                    }}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Descripción del Inmueble */}
          {descripcionLimpia && (
            <section style={{ marginBottom: 24 }}>
              <h2
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginBottom: 10,
                }}
              >
                Descripción del inmueble
              </h2>
              <div
                style={{
                  fontSize: 15,
                  lineHeight: 1.68,
                  color: "var(--text-secondary)",
                  whiteSpace: "pre-line",
                  background: "var(--bg-base)",
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  padding: "16px",
                }}
              >
                {descripcionLimpia}
              </div>
            </section>
          )}

          <div className="divider" style={{ margin: "20px 0" }} />

          {/* Tarjeta de Verificación de Asesora */}
          <section
            style={{
              background: "var(--bg-base)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: "16px",
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={agente.foto}
                alt={agente.nombreCompleto}
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "2px solid var(--red)",
                  flexShrink: 0,
                  background: "var(--bg-card-hover)",
                }}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: "#16a34a",
                    marginBottom: 3,
                  }}
                >
                  <ShieldCheck size={14} />
                  <span>Asesora Verificada</span>
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: "var(--text-primary)",
                    lineHeight: 1.25,
                  }}
                >
                  Olga Patricia Vásquez Barrios
                </div>
                <div
                  style={{
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: "var(--red)",
                    marginTop: 2,
                  }}
                >
                  Asesora Comercial L2L Bienes Raíces
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                marginTop: 14,
                paddingTop: 12,
                borderTop: "1px solid var(--border)",
              }}
            >
              <a
                href={`tel:${agente.telefono}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <Phone size={14} color="var(--red)" />
                {agente.telefono}
              </a>
              <span style={{ color: "var(--border)" }}>•</span>
              <a
                href={`mailto:${agente.email}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                }}
              >
                <Mail size={14} color="var(--red)" />
                {agente.email}
              </a>
            </div>
          </section>

          {inm.urlL2L && (
            <a
              href={inm.urlL2L}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{
                fontSize: 14,
                padding: "12px 16px",
                color: "var(--text-secondary)",
              }}
            >
              <ExternalLink size={15} />
              Ver publicación en l2lbienesraices.com
            </a>
          )}
        </div>
      </article>

      {/* ── Barra Inferior Fija de Acción ── */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 95,
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderTop: "1px solid var(--border)",
          padding: "12px 16px calc(12px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div
          style={{
            maxWidth: 640,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <a
            href={wsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ws"
            style={{
              flex: 1,
              padding: "14px 18px",
              fontSize: 16,
              borderRadius: 14,
              boxShadow: "0 4px 16px rgba(37, 211, 102, 0.28)",
            }}
          >
            <MessageCircle size={20} />
            Preguntar por WhatsApp
          </a>

          <a
            href={`tel:${agente.telefono}`}
            className="btn-secondary"
            style={{
              width: "auto",
              padding: "14px 16px",
              fontSize: 15,
              borderRadius: 14,
              background: "var(--bg-card)",
              flexShrink: 0,
            }}
          >
            <Phone size={18} color="var(--red)" />
            Llamar
          </a>
        </div>
      </div>
    </div>
  );
}
