'use client';
// src/app/respuestas/page.tsx
// Cinturón de herramientas: Respuestas rápidas para objeciones clásicas

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, CheckCircle, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
import { generarLinkWS } from "@/lib/mensajes";

// ─── Objeciones definidas ────────────────────────────────────────────
const OBJECIONES = [
  {
    id: "precio",
    pregunta: "¿El precio es negociable?",
    emoji: "💰",
    respuesta: (nombre: string) =>
      `Hola ${nombre} 👋, el precio está muy bien ajustado al mercado actual de la zona. Sin embargo, puedo hablar con el propietario y ver qué posibilidades hay. ¿Cuánto tenías pensado?`,
  },
  {
    id: "administracion",
    pregunta: "¿Por qué está tan cara la administración?",
    emoji: "🏢",
    respuesta: (nombre: string) =>
      `Hola ${nombre} 👋, la administración cubre servicios como seguridad 24/7, mantenimiento de zonas comunes, portería y vigilancia permanente. Eso garantiza la valorización del inmueble a largo plazo y la tranquilidad de vivir allí 😊`,
  },
  {
    id: "pequeno",
    pregunta: "Me parece muy pequeño",
    emoji: "📐",
    respuesta: (nombre: string) =>
      `Hola ${nombre} 👋, algo valioso de este inmueble es que cada metro cuadrado está muy bien aprovechado con una distribución inteligente. Además está en una ubicación premium que compensa el área. ¿Le gustaría verlo en persona? A veces los espacios sorprenden mucho más de lo que se ve en fotos 😉`,
  },
  {
    id: "antiguo",
    pregunta: "El edificio es muy antiguo",
    emoji: "🏗️",
    respuesta: (nombre: string) =>
      `Hola ${nombre} 👋, aunque el edificio tiene años, fue construido con estándares de calidad y materiales de esa época que hoy son difíciles de replicar. Muchos compradores buscan exactamente estos edificios por sus áreas generosas y su excelente ubicación consolidada 🏠`,
  },
  {
    id: "parqueadero",
    pregunta: "No tiene parqueadero",
    emoji: "🚗",
    respuesta: (nombre: string) =>
      `Hola ${nombre} 👋, es cierto que no incluye parqueadero propio, pero hay opciones de arrendamiento de garaje muy cerca o en el mismo conjunto. Además, el precio del inmueble ya refleja esto, lo que lo convierte en una de las mejores opciones en precio por metro cuadrado del sector 👌`,
  },
  {
    id: "pensarlo",
    pregunta: "Déjame pensarlo",
    emoji: "🤔",
    respuesta: (nombre: string) =>
      `Hola ${nombre} 👋, claro, tómate el tiempo que necesites, entiendo perfectamente. Eso sí, quería comentarte que hay otros interesados en este inmueble. Te aviso cualquier novedad, ¿te parece bien? 😊`,
  },
];

// ─── Main Component ───────────────────────────────────────────────────
function RespuestasContent() {
  const searchParams = useSearchParams();
  const clienteParam = searchParams.get("cliente") || "";
  const telefonoParam = searchParams.get("telefono") || "";

  const [expandido, setExpandido] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  const nombreMostrar = clienteParam || "Cliente";
  const primerNombre = nombreMostrar.split(" ")[0];

  const handleCopiar = async (id: string, texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(id);
      setTimeout(() => setCopiado(null), 2000);
    } catch (e) {
      console.error("Failed to copy", e);
    }
  };

  const handleEnviarWS = (texto: string) => {
    const url = generarLinkWS(telefonoParam, texto);
    window.open(url, "_blank");
  };

  return (
    <div className="page" style={{ paddingBottom: "100px" }}>
      {/* Header */}
      <div className="header" style={{ paddingBottom: 12 }}>
        <div>
          <h1 className="header-title">Cinturón de Objeciones</h1>
          <p className="header-sub">
            {clienteParam
              ? `Respuestas personalizadas para ${primerNombre}`
              : "Respuestas persuasivas para cada situación"}
          </p>
        </div>
      </div>

      {/* Banner si hay cliente */}
      {clienteParam && (
        <div style={{ margin: "0 20px 16px", padding: "12px 16px", borderRadius: "12px", background: "rgba(196,30,58,0.06)", border: "1px solid var(--border-red)" }}>
          <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>
            💬 Respuestas para: <span style={{ color: "var(--red)" }}>{clienteParam}</span>
          </div>
          {telefonoParam && (
            <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
              WhatsApp irá directamente a: +{telefonoParam}
            </div>
          )}
        </div>
      )}

      {/* Lista de Objeciones */}
      <div className="grid-1">
        {OBJECIONES.map((obj) => {
          const texto = obj.respuesta(primerNombre);
          const estaExpandido = expandido === obj.id;
          const estaCopado = copiado === obj.id;

          return (
            <motion.div
              key={obj.id}
              className="card"
              layout
              style={{ padding: "0", overflow: "hidden" }}
            >
              {/* Header de la objeción */}
              <button
                onClick={() => setExpandido(estaExpandido ? null : obj.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "16px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "24px" }}>{obj.emoji}</span>
                  <span style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-primary)" }}>
                    {obj.pregunta}
                  </span>
                </div>
                {estaExpandido ? (
                  <ChevronUp size={18} color="var(--text-muted)" />
                ) : (
                  <ChevronDown size={18} color="var(--text-muted)" />
                )}
              </button>

              {/* Contenido expandido */}
              <AnimatePresence>
                {estaExpandido && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: "hidden" }}
                  >
                    <div style={{ padding: "0 16px 16px" }}>
                      {/* Vista previa del mensaje */}
                      <div
                        style={{
                          background: "var(--bg-base)",
                          border: "1px solid var(--border)",
                          borderRadius: "12px",
                          padding: "14px",
                          fontSize: "14px",
                          lineHeight: "1.6",
                          color: "var(--text-primary)",
                          marginBottom: "14px",
                          fontStyle: "italic",
                        }}
                      >
                        {texto}
                      </div>

                      {/* Botones de acción */}
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() => handleCopiar(obj.id, texto)}
                          className="btn-secondary"
                          style={{ flex: 1, fontSize: "13px", padding: "10px 12px" }}
                        >
                          {estaCopado ? (
                            <CheckCircle size={15} color="#16a34a" />
                          ) : (
                            <Copy size={15} />
                          )}
                          {estaCopado ? "¡Copiado!" : "Copiar"}
                        </button>
                        {telefonoParam && (
                          <button
                            onClick={() => handleEnviarWS(texto)}
                            className="btn-ws"
                            style={{ flex: 1, fontSize: "13px", padding: "10px 12px" }}
                          >
                            <MessageCircle size={15} />
                            Enviar a {primerNombre}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Toast global */}
      <AnimatePresence>
        {copiado && (
          <motion.div
            className="toast success"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <CheckCircle size={16} /> Respuesta copiada al portapapeles
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function RespuestasPage() {
  return (
    <Suspense fallback={<div className="page"><div className="header">Cargando...</div></div>}>
      <RespuestasContent />
    </Suspense>
  );
}
