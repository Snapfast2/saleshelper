'use client';
// src/app/respuestas/page.tsx
// Cinturón de herramientas: Respuestas rápidas para objeciones comerciales

import { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { LucideIcon } from "lucide-react";
import {
  Copy,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  User,
  BadgeDollarSign,
  Building2,
  Maximize2,
  CalendarClock,
  Car,
  Clock,
} from "lucide-react";
import { generarLinkWS } from "@/lib/mensajes";
import { registrarInteraccionWS } from "@/lib/interacciones";
import EmptyState from "@/components/EmptyState";

interface ObjecionItem {
  id: string;
  categoriaLabel: string;
  pregunta: string;
  icon: LucideIcon;
  keywords: string;
  respuesta: (nombre: string) => string;
}

// ─── Objeciones definidas ────────────────────────────────────────────
const OBJECIONES: ObjecionItem[] = [
  {
    id: "precio",
    categoriaLabel: "Precio",
    pregunta: "¿El precio es negociable?",
    icon: BadgeDollarSign,
    keywords: "precio valor descuento rebaja oferta negociar caro presupuesto",
    respuesta: (nombre: string) =>
      `Hola ${nombre} 👋, el precio está muy bien ajustado al mercado actual de la zona. Sin embargo, puedo hablar con el propietario y ver qué posibilidades hay. ¿Cuánto tenías pensado?`,
  },
  {
    id: "administracion",
    categoriaLabel: "Administración",
    pregunta: "¿Por qué está tan cara la administración?",
    icon: Building2,
    keywords: "administracion cuota vigilancia porteria zonas comunes edificio mensualidad",
    respuesta: (nombre: string) =>
      `Hola ${nombre} 👋, la administración cubre servicios como seguridad 24/7, mantenimiento de zonas comunes, portería y vigilancia permanente. Eso garantiza la valorización del inmueble a largo plazo y la tranquilidad de vivir allí 😊`,
  },
  {
    id: "pequeno",
    categoriaLabel: "Área",
    pregunta: "Me parece muy pequeño",
    icon: Maximize2,
    keywords: "pequeno area metros espacio reducido distribucion tamano m2",
    respuesta: (nombre: string) =>
      `Hola ${nombre} 👋, algo valioso de este inmueble es que cada metro cuadrado está muy bien aprovechado con una distribución inteligente. Además está en una ubicación premium que compensa el área. ¿Le gustaría verlo en persona? A veces los espacios sorprenden mucho más de lo que se ve en fotos 😉`,
  },
  {
    id: "antiguo",
    categoriaLabel: "Antigüedad",
    pregunta: "El edificio es muy antiguo",
    icon: CalendarClock,
    keywords: "antiguo viejo anos remodelar construccion edad edificio",
    respuesta: (nombre: string) =>
      `Hola ${nombre} 👋, aunque el edificio tiene años, fue construido con estándares de calidad y materiales de esa época que hoy son difíciles de replicar. Muchos compradores buscan exactamente estos edificios por sus áreas generosas y su excelente ubicación consolidada.`,
  },
  {
    id: "parqueadero",
    categoriaLabel: "Parqueadero",
    pregunta: "No tiene parqueadero",
    icon: Car,
    keywords: "parqueadero garaje carro vehiculo estacionamiento",
    respuesta: (nombre: string) =>
      `Hola ${nombre} 👋, es cierto que no incluye parqueadero propio, pero hay opciones de arrendamiento de garaje muy cerca o en el mismo conjunto. Además, el precio del inmueble ya refleja esto, lo que lo convierte en una de las mejores opciones en precio por metro cuadrado del sector 👌`,
  },
  {
    id: "pensarlo",
    categoriaLabel: "Indecisión",
    pregunta: "Déjame pensarlo",
    icon: Clock,
    keywords: "pensarlo duda despues consultar pareja familia esperar tiempo",
    respuesta: (nombre: string) =>
      `Hola ${nombre} 👋, claro, tómate el tiempo que necesites, entiendo perfectamente. Eso sí, quería comentarte que hay otros interesados en este inmueble. Te aviso cualquier novedad, ¿te parece bien? 😊`,
  },
];

function normalizeText(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// ─── Main Component ───────────────────────────────────────────────────
function RespuestasContent() {
  const searchParams = useSearchParams();
  const clienteParam = searchParams.get("cliente") || "";
  const telefonoParam = searchParams.get("telefono") || "";

  const [search, setSearch] = useState("");
  const [categoriaActiva, setCategoriaActiva] = useState<string>("todas");
  const [expandido, setExpandido] = useState<string | null>(OBJECIONES[0].id);

  const nombreMostrar = clienteParam || "Cliente";
  const primerNombre = nombreMostrar.split(" ")[0];

  const objecionesFiltradas = useMemo(() => {
    const q = normalizeText(search.trim());
    return OBJECIONES.filter((obj) => {
      if (categoriaActiva !== "todas" && obj.id !== categoriaActiva) {
        return false;
      }
      if (!q) return true;
      const haystack = normalizeText(
        `${obj.pregunta} ${obj.categoriaLabel} ${obj.keywords} ${obj.respuesta(primerNombre)}`
      );
      return haystack.includes(q);
    });
  }, [search, categoriaActiva, primerNombre]);

  const handleCopiar = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Respuesta copiada · Lista para pegar en WhatsApp");
    } catch {
      toast.error("No se pudo copiar la respuesta");
    }
  };

  const handleEnviarWS = (texto: string, pregunta: string) => {
    if (telefonoParam || clienteParam) {
      registrarInteraccionWS(
        {
          nombre: nombreMostrar,
          telefono: telefonoParam,
          telefonoIndicativo: "+57",
        },
        undefined,
        `Objeción: ${pregunta}`
      );
    }
    const url = generarLinkWS(telefonoParam, texto);
    window.open(url, "_blank");
  };

  return (
    <div className="page" style={{ paddingBottom: 100, maxWidth: 760 }}>
      {/* Header */}
      <div className="header" style={{ paddingBottom: 12 }}>
        <div>
          <h1 className="header-title">Cinturón de Objeciones</h1>
          <p className="header-sub">
            {clienteParam
              ? `Argumentos listos para responder a ${primerNombre}`
              : "Guiones comerciales listos para negociación en vivo"}
          </p>
        </div>
      </div>

      {/* Banner si hay cliente */}
      {clienteParam && (
        <div
          style={{
            margin: "0 20px 16px",
            padding: "12px 16px",
            borderRadius: 12,
            background: "rgba(184, 15, 18, 0.06)",
            border: "1px solid var(--border-red)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <User size={18} color="var(--red)" style={{ flexShrink: 0 }} />
          <div>
            <div
              style={{
                fontSize: 13.5,
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              Respuestas personalizadas para:{" "}
              <span style={{ color: "var(--red)" }}>{clienteParam}</span>
            </div>
            {telefonoParam && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  marginTop: 2,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                Envío directo a: +{telefonoParam}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Buscador Instantáneo */}
      <div style={{ padding: "0 20px 12px" }}>
        <div style={{ position: "relative" }}>
          <Search
            size={18}
            style={{
              position: "absolute",
              left: 15,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
              pointerEvents: "none",
            }}
          />
          <input
            type="search"
            className="form-input"
            placeholder="Buscar objeción o palabra clave..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              paddingLeft: 42,
              paddingRight: search ? 40 : 14,
              fontSize: 15.5,
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Limpiar búsqueda"
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "var(--bg-base)",
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Pestañas de Categoría con Iconos SVG */}
      <div className="tabs" style={{ paddingBottom: 16 }}>
        <button
          type="button"
          className={`tab-pill ${categoriaActiva === "todas" ? "active" : ""}`}
          onClick={() => setCategoriaActiva("todas")}
        >
          Todas
        </button>
        {OBJECIONES.map((obj) => {
          const Icon = obj.icon;
          const active = categoriaActiva === obj.id;
          return (
            <button
              key={obj.id}
              type="button"
              className={`tab-pill ${active ? "active" : ""}`}
              onClick={() => {
                setCategoriaActiva(obj.id);
                setExpandido(obj.id);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Icon size={15} />
              <span>{obj.categoriaLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Lista de Objeciones */}
      {objecionesFiltradas.length === 0 ? (
        <EmptyState
          icon={<Search size={42} />}
          title="Sin objeciones coincidentes"
          description="Prueba con otro término o selecciona Todas las categorías."
        />
      ) : (
        <div className="grid-1">
          {objecionesFiltradas.map((obj) => {
            const Icon = obj.icon;
            const texto = obj.respuesta(primerNombre);
            const estaExpandido =
              expandido === obj.id || objecionesFiltradas.length === 1;

            return (
              <motion.div
                key={obj.id}
                className="card"
                layout
                style={{ padding: 0, overflow: "hidden" }}
              >
                {/* Cabecera de la objeción */}
                <button
                  type="button"
                  onClick={() =>
                    setExpandido(expandido === obj.id ? null : obj.id)
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    width: "100%",
                    padding: "16px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: "rgba(184, 15, 18, 0.08)",
                        color: "var(--red)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={19} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: "var(--text-muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          marginBottom: 2,
                        }}
                      >
                        {obj.categoriaLabel}
                      </div>
                      <div
                        style={{
                          fontSize: 15.5,
                          fontWeight: 700,
                          color: "var(--text-primary)",
                          lineHeight: 1.3,
                        }}
                      >
                        {obj.pregunta}
                      </div>
                    </div>
                  </div>
                  {estaExpandido ? (
                    <ChevronUp size={18} color="var(--text-muted)" />
                  ) : (
                    <ChevronDown size={18} color="var(--text-muted)" />
                  )}
                </button>

                {/* Contenido expandido */}
                <AnimatePresence initial={false}>
                  {estaExpandido && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      style={{ overflow: "hidden" }}
                    >
                      <div style={{ padding: "0 16px 16px" }}>
                        {/* Vista previa del guion */}
                        <div
                          style={{
                            background: "var(--bg-base)",
                            border: "1px solid var(--border)",
                            borderRadius: 12,
                            padding: "14px",
                            fontSize: 14.5,
                            lineHeight: 1.62,
                            color: "var(--text-primary)",
                            marginBottom: 14,
                          }}
                        >
                          {texto}
                        </div>

                        {/* Acciones: Copiar respuesta + Abrir WhatsApp */}
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 10,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => handleCopiar(texto)}
                            className="btn-primary"
                            style={{
                              flex: 1,
                              minWidth: 165,
                              fontSize: 14,
                              padding: "12px 14px",
                              borderRadius: 12,
                            }}
                          >
                            <Copy size={16} />
                            Copiar respuesta
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEnviarWS(texto, obj.pregunta)}
                            className="btn-ws"
                            style={{
                              flex: 1,
                              minWidth: 165,
                              fontSize: 14,
                              padding: "12px 14px",
                              borderRadius: 12,
                            }}
                          >
                            <MessageCircle size={16} />
                            {telefonoParam
                              ? `Enviar a ${primerNombre}`
                              : "Abrir WhatsApp"}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function RespuestasPage() {
  return (
    <Suspense
      fallback={
        <div className="page" style={{ maxWidth: 760 }}>
          <div className="header">
            <div>
              <h1 className="header-title">Cinturón de Objeciones</h1>
              <p className="header-sub">Cargando respuestas...</p>
            </div>
          </div>
        </div>
      }
    >
      <RespuestasContent />
    </Suspense>
  );
}
