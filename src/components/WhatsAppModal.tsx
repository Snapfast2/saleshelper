"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Paperclip, Pencil, Send } from "lucide-react";
import type { Cliente, Inmueble } from "@/types";
import { registrarInteraccionWS } from "@/lib/interacciones";

export function buildTemplates(nombre: string, inmueble?: Inmueble) {
  const n = nombre.split(" ")[0];
  const n2 = n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
  const desc = inmueble
    ? `${inmueble.tipo ? `el ${inmueble.tipo.toLowerCase()}` : "el inmueble"}${inmueble.barrio ? ` en ${inmueble.barrio}` : ""}`
    : null;
  return [
    {
      id: "primer-contacto",
      titulo: "Primer contacto",
      subtitulo: "Para cuando llega por primera vez",
      emoji: "👋",
      texto: `Hola ${n2}, te saluda Patricia.${desc ? ` Vi que te interesó ${desc} y con mucho gusto te cuento todo sobre él.` : " Me alegra que te hayas comunicado con nosotros."} Tiene cosas muy buenas que vale la pena conocer. ¿Tienes un momento hoy para hablar? 🏡`,
    },
    {
      id: "ficha-tecnica",
      titulo: "Enviar ficha técnica",
      subtitulo: "Información detallada del inmueble",
      emoji: "📎",
      texto: `Hola ${n2}, con mucho gusto te comparto la información completa${desc ? ` de ${desc}` : ""}. Aquí puedes ver todos los detalles: precio, área, ubicación y características. Cualquier duda me preguntas con toda confianza 🏡`,
    },
    {
      id: "seguimiento",
      titulo: "Seguimiento",
      subtitulo: "Para retomar el contacto",
      emoji: "🔄",
      texto: `Hola ${n2}, soy Patricia. Te escribo de nuevo porque quiero asegurarme de que no te quedes sin opciones. Sé que estas decisiones toman su tiempo y eso es completamente normal. ¿Cómo vas con tu búsqueda? Cuéntame para ver cómo te puedo ayudar mejor 🙌`,
    },
    {
      id: "confirmar-visita",
      titulo: "Confirmar visita",
      subtitulo: "Antes de una cita agendada",
      emoji: "📅",
      texto: `Hola ${n2}, te confirmo que quedamos para el [DÍA] a las [HORA]. Vamos a ver el inmueble juntos y cualquier duda que tengas, ahí mismo la resolvemos. Si necesitas reagendar no hay ningún problema, solo avísame con tiempo. Nos vemos pronto 😊`,
    },
    {
      id: "reactivar",
      titulo: "Reactivar cliente",
      subtitulo: "Cuando lleva tiempo sin responder",
      emoji: "💤",
      texto: `Hola ${n2}, espero que estés muy bien. Soy Patricia, hace un tiempo estuvimos hablando sobre tu búsqueda de vivienda y quería saber cómo va ese proceso. A veces la vida ocupa y estas cosas quedan pendientes, pero aquí sigo disponible cuando tú estés listo 🤝`,
    },
  ];
}

export default function WhatsAppModal({
  cliente,
  tel,
  inmueble,
  onClose,
  defaultTemplateId,
}: {
  cliente: Cliente;
  tel: string;
  inmueble?: Inmueble;
  onClose: () => void;
  defaultTemplateId?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [seleccionado, setSeleccionado] = useState<string | null>(defaultTemplateId || null);
  const [editando, setEditando] = useState(false);
  const [textoEditado, setTextoEditado] = useState<string>(() => {
    if (defaultTemplateId) {
      const templates = buildTemplates(cliente.nombre, inmueble);
      const tpl = templates.find(t => t.id === defaultTemplateId);
      return tpl ? tpl.texto : "";
    }
    return "";
  });

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const templates = buildTemplates(cliente.nombre, inmueble);
  const tplActual = templates.find(t => t.id === seleccionado);

  const abrirWhatsApp = (texto: string) => {
    if (tplActual) {
      registrarInteraccionWS(cliente, inmueble, tplActual.titulo);
    } else {
      registrarInteraccionWS(cliente, inmueble, "Mensaje Libre");
    }
    const num = tel.replace(/\D/g, "");
    const url = `https://wa.me/${num}?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank");
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      <>
        <motion.div key="ov-wa" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9998, backdropFilter: "blur(4px)" }}
        />
        <motion.div key="sh-wa" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 340, damping: 32 }}
          style={{
            position: "fixed", bottom: 0, left: 0, right: 0, margin: "0 auto", maxWidth: 480,
            background: "var(--bg-card)", borderRadius: "24px 24px 0 0",
            padding: "0 0 calc(16px + env(safe-area-inset-bottom,16px))",
            zIndex: 9999, boxShadow: "0 -8px 48px rgba(0,0,0,0.18)",
            overflow: "hidden", maxHeight: "88vh", display: "flex", flexDirection: "column",
          }}
        >
          {/* Handle + cabecera */}
          <div style={{ padding: "16px 20px 12px", flexShrink: 0 }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--border)", margin: "0 auto 16px" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>
                  Escribirle a {cliente.nombre.split(" ")[0].charAt(0).toUpperCase() + cliente.nombre.split(" ")[0].slice(1).toLowerCase()}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>Elige cómo quieres comenzar</div>
              </div>
              <button onClick={onClose} style={{ padding: 8, borderRadius: "50%", background: "var(--bg-base)", border: "1px solid var(--border)", display: "flex", cursor: "pointer", flexShrink: 0 }}>
                <X size={16} color="var(--text-secondary)" />
              </button>
            </div>
          </div>

          <div style={{ overflow: "auto", flex: 1 }}>
            {/* Lista de plantillas */}
            {!seleccionado && (
              <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                {templates.map((t) => (
                  <motion.button
                    key={t.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setSeleccionado(t.id); setTextoEditado(t.texto); setEditando(false); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "14px 16px", borderRadius: 14,
                      border: "1px solid var(--border)",
                      background: "var(--bg-base)",
                      cursor: "pointer", textAlign: "left", width: "100%",
                    }}
                  >
                    <span style={{ fontSize: 26, flexShrink: 0 }}>{t.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{t.titulo}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{t.subtitulo}</div>
                    </div>
                    <span style={{ fontSize: 18, color: "var(--text-muted)", flexShrink: 0 }}>›</span>
                  </motion.button>
                ))}
              </div>
            )}

            {/* Vista previa / edición */}
            {seleccionado && tplActual && (
              <div style={{ padding: "0 16px" }}>
                <button
                  onClick={() => setSeleccionado(null)}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 14, padding: "0 0 14px", fontWeight: 600 }}
                >
                  ‹ Volver
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <span style={{ fontSize: 24 }}>{tplActual.emoji}</span>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>{tplActual.titulo}</div>
                </div>

                {editando ? (
                  <textarea
                    value={textoEditado}
                    onChange={e => setTextoEditado(e.target.value)}
                    autoFocus
                    style={{
                      width: "100%", minHeight: 160, padding: "14px", borderRadius: 14,
                      border: "1px solid var(--border)", background: "var(--bg-base)",
                      color: "var(--text-primary)", fontSize: 15, lineHeight: 1.6,
                      resize: "vertical", fontFamily: "inherit", outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                ) : (
                  <div style={{
                    padding: "14px", borderRadius: 14,
                    border: "1px solid var(--border)", background: "var(--bg-base)",
                    fontSize: 15, color: "var(--text-primary)", lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                  }}>
                    {textoEditado}
                  </div>
                )}

                {inmueble?.urlDomus && !textoEditado.includes(inmueble.urlDomus) && (
                  <div style={{ marginTop: 12 }}>
                    <button
                      onClick={() => setTextoEditado(prev => prev + `\n\nPuedes ver las fotos y la ficha técnica aquí:\n${inmueble.urlDomus}`)}
                      style={{
                        padding: "10px 14px", borderRadius: 10,
                        border: "1px dashed var(--brand-primary)", background: "rgba(225,29,72,0.05)",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        fontSize: 14, fontWeight: 700, color: "var(--brand-primary)", width: "100%"
                      }}
                    >
                      <Paperclip size={16} />
                      Adjuntar ficha técnica
                    </button>
                  </div>
                )}

                <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                  <button
                    onClick={() => setEditando(!editando)}
                    style={{
                      flex: 1, padding: "14px", borderRadius: 14,
                      border: "1px solid var(--border)", background: "var(--bg-base)",
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      fontSize: 15, fontWeight: 700, color: "var(--text-secondary)",
                    }}
                  >
                    <Pencil size={16} />
                    {editando ? "Ver preview" : "Editar"}
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => abrirWhatsApp(textoEditado)}
                    style={{
                      flex: 2, padding: "14px", borderRadius: 14,
                      border: "none", background: "#25D366",
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      fontSize: 15, fontWeight: 800, color: "#fff",
                    }}
                  >
                    <Send size={16} />
                    Abrir en WhatsApp
                  </motion.button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </>
    </AnimatePresence>,
    document.body
  );
}
