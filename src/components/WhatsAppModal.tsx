"use client";

import React, { useMemo, useState } from "react";
import { Drawer } from "vaul";
import { toast } from "sonner";
import {
  X,
  Paperclip,
  Pencil,
  Send,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  MessageSquarePlus,
  FileText,
  RefreshCw,
  CalendarCheck,
  RotateCcw,
  Clock,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import type { Cliente, Inmueble } from "@/types";
import { registrarInteraccionWS } from "@/lib/interacciones";

function primerNombre(nombre: string): string {
  const raw = (nombre || "Cliente").trim().split(/\s+/)[0] || "Cliente";
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

function normalizarTemplateId(id?: string): string | null {
  if (!id) return null;
  if (id === "enviar-ficha") return "ficha-tecnica";
  if (id === "reactivacion") return "reactivar";
  return id;
}

export function buildTemplates(nombre: string, inmueble?: Inmueble) {
  const n2 = primerNombre(nombre);
  const desc = inmueble
    ? `${inmueble.tipo ? `el ${inmueble.tipo.toLowerCase()}` : "el inmueble"}${inmueble.barrio ? ` en ${inmueble.barrio}` : ""}`
    : null;

  return [
    {
      id: "primer-contacto",
      titulo: "Primer contacto",
      subtitulo: "Para cuando llega por primera vez",
      Icon: MessageSquarePlus,
      iconColor: "#16a34a",
      iconBg: "rgba(22, 163, 74, 0.1)",
      texto: `Hola ${n2}, te saluda Patricia.${desc ? ` Vi que te interesó ${desc} y con mucho gusto te cuento todo sobre él.` : " Me alegra que te hayas comunicado con nosotros."} Tiene cosas muy buenas que vale la pena conocer. ¿Tienes un momento hoy para hablar? 🏡`,
    },
    {
      id: "ficha-tecnica",
      titulo: "Enviar ficha técnica",
      subtitulo: "Información detallada del inmueble",
      Icon: FileText,
      iconColor: "var(--red)",
      iconBg: "rgba(184, 15, 18, 0.1)",
      texto: `Hola ${n2}, con mucho gusto te comparto la información completa${desc ? ` de ${desc}` : ""}. Aquí puedes ver todos los detalles: precio, área, ubicación y características. Cualquier duda me preguntas con toda confianza 🏡`,
    },
    {
      id: "seguimiento",
      titulo: "Seguimiento",
      subtitulo: "Para retomar el contacto",
      Icon: RefreshCw,
      iconColor: "#2563eb",
      iconBg: "rgba(37, 99, 235, 0.1)",
      texto: `Hola ${n2}, soy Patricia. Te escribo de nuevo porque quiero asegurarme de que no te quedes sin opciones. Sé que estas decisiones toman su tiempo y eso es completamente normal. ¿Cómo vas con tu búsqueda? Cuéntame para ver cómo te puedo ayudar mejor 🙌`,
    },
    {
      id: "confirmar-visita",
      titulo: "Confirmar visita",
      subtitulo: "Agendar o confirmar cita en 2 toques",
      Icon: CalendarCheck,
      iconColor: "#d97706",
      iconBg: "rgba(217, 119, 6, 0.12)",
      texto: `Hola ${n2}, te confirmo que quedamos para [DÍA] a las [HORA]. Vamos a ver${desc ? ` ${desc}` : " el inmueble"} juntos y cualquier duda que tengas, ahí mismo la resolvemos. Si necesitas reagendar no hay ningún problema, solo avísame con tiempo. Nos vemos pronto 😊`,
    },
    {
      id: "reactivar",
      titulo: "Reactivar cliente",
      subtitulo: "Cuando lleva tiempo sin responder",
      Icon: RotateCcw,
      iconColor: "#7c3aed",
      iconBg: "rgba(124, 58, 237, 0.1)",
      texto: `Hola ${n2}, espero que estés muy bien. Soy Patricia, hace un tiempo estuvimos hablando sobre tu búsqueda de vivienda y quería saber cómo va ese proceso. A veces la vida ocupa y estas cosas quedan pendientes, pero aquí sigo disponible cuando tú estés listo 🤝`,
    },
  ];
}

interface OpcionDiaVisita {
  id: string;
  label: string;
  valorTexto: string;
}

function buildOpcionesDiaVisita(): OpcionDiaVisita[] {
  const opciones: OpcionDiaVisita[] = [
    { id: "hoy-tarde", label: "Hoy en la tarde", valorTexto: "hoy en la tarde" },
    { id: "manana", label: "Mañana", valorTexto: "mañana" },
  ];

  const hoy = new Date();
  const diaSemanaHoy = hoy.getDay(); // 0 = dom ... 6 = sáb

  if (diaSemanaHoy !== 5 && diaSemanaHoy !== 6) {
    opciones.push({ id: "este-sabado", label: "Este sábado", valorTexto: "este sábado" });
  } else if (diaSemanaHoy === 5) {
    opciones.push({ id: "este-domingo", label: "Este domingo", valorTexto: "este domingo" });
  }

  for (const offset of [2, 3]) {
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() + offset);
    if (fecha.getDay() === 6 && opciones.some((o) => o.id === "este-sabado")) continue;
    if (fecha.getDay() === 0 && opciones.some((o) => o.id === "este-domingo")) continue;

    const weekdayLong = fecha
      .toLocaleDateString("es-CO", { weekday: "long" })
      .toLowerCase();
    const weekdayShort = fecha
      .toLocaleDateString("es-CO", { weekday: "short" })
      .replace(/\./g, "");
    const weekdayShortCap =
      weekdayShort.charAt(0).toUpperCase() + weekdayShort.slice(1).toLowerCase();
    const numDia = fecha.getDate();

    opciones.push({
      id: `dia-offset-${offset}`,
      label: `${weekdayShortCap} ${numDia}`,
      valorTexto: `el ${weekdayLong} ${numDia}`,
    });
  }

  return opciones;
}

const OPCIONES_HORA_VISITA = [
  "10:00 a.m.",
  "11:30 a.m.",
  "2:30 p.m.",
  "4:00 p.m.",
  "5:00 p.m.",
] as const;

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
  const initialTplId = normalizarTemplateId(defaultTemplateId);

  const templates = useMemo(
    () => buildTemplates(cliente.nombre, inmueble),
    [cliente.nombre, inmueble]
  );

  const opcionesDia = useMemo(() => buildOpcionesDiaVisita(), []);

  const [seleccionado, setSeleccionado] = useState<string | null>(initialTplId);
  const [editando, setEditando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [diaVisita, setDiaVisita] = useState<string | null>(null);
  const [horaVisita, setHoraVisita] = useState<string | null>(null);

  const [textoEditado, setTextoEditado] = useState<string>(() => {
    if (initialTplId) {
      const tpl = templates.find((t) => t.id === initialTplId);
      return tpl ? tpl.texto : "";
    }
    return "";
  });

  const tplActual = templates.find((t) => t.id === seleccionado);
  const esConfirmarVisita = seleccionado === "confirmar-visita";
  const tienePendientesVisita =
    textoEditado.includes("[DÍA]") || textoEditado.includes("[HORA]");

  const nombreCorto = primerNombre(cliente.nombre);

  const handleSeleccionarPlantilla = (tplId: string, textoBase: string) => {
    setSeleccionado(tplId);
    setTextoEditado(textoBase);
    setEditando(false);
    setCopiado(false);
    setDiaVisita(null);
    setHoraVisita(null);
  };

  const seleccionarDiaVisita = (nuevoDia: string) => {
    setTextoEditado((actual) => {
      if (actual.includes("el [DÍA]")) {
        return actual.replace("el [DÍA]", nuevoDia);
      }
      if (actual.includes("[DÍA]")) {
        return actual.replace("[DÍA]", nuevoDia);
      }
      if (diaVisita && actual.includes(`para ${diaVisita}`)) {
        return actual.replace(`para ${diaVisita}`, `para ${nuevoDia}`);
      }
      if (diaVisita && actual.includes(diaVisita)) {
        return actual.replace(diaVisita, nuevoDia);
      }
      return actual;
    });
    setDiaVisita(nuevoDia);
  };

  const seleccionarHoraVisita = (nuevaHora: string) => {
    setTextoEditado((actual) => {
      let siguiente = actual;
      if (siguiente.includes("[HORA]")) {
        siguiente = siguiente.replace("[HORA]", nuevaHora);
      } else if (horaVisita && siguiente.includes(`a las ${horaVisita}`)) {
        siguiente = siguiente.replace(`a las ${horaVisita}`, `a las ${nuevaHora}`);
      } else if (horaVisita && siguiente.includes(horaVisita)) {
        siguiente = siguiente.replace(horaVisita, nuevaHora);
      }
      return siguiente.replace(/\.\.(?=\s|$)/g, ".");
    });
    setHoraVisita(nuevaHora);
  };

  const copiarTexto = async () => {
    if (!textoEditado.trim()) return;
    try {
      await navigator.clipboard.writeText(textoEditado);
      setCopiado(true);
      toast.success("Mensaje copiado al portapapeles");
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      toast.error("No se pudo copiar el mensaje");
    }
  };

  const abrirWhatsApp = (texto: string) => {
    const nombrePlantilla = tplActual ? tplActual.titulo : "Mensaje Libre";
    registrarInteraccionWS(cliente, inmueble, nombrePlantilla);

    let num = tel.replace(/\D/g, "");
    if (num.length === 10 && num.startsWith("3")) {
      num = `57${num}`;
    }
    const url = `https://wa.me/${num}?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    toast.success(`Abriendo WhatsApp con ${nombreCorto}`);
    onClose();
  };

  return (
    <Drawer.Root
      open={true}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      repositionInputs={false}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="vaul-overlay" />
        <Drawer.Content className="vaul-content">
          <div className="vaul-handle-wrap">
            <div className="vaul-handle" />
          </div>

          {/* Cabecera accesible */}
          <div
            style={{
              padding: "8px 20px 14px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexShrink: 0,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <Drawer.Title
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  margin: 0,
                  lineHeight: 1.25,
                }}
              >
                Escribirle a {nombreCorto}
              </Drawer.Title>
              <Drawer.Description
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  margin: "3px 0 0",
                }}
              >
                {seleccionado
                  ? "Revisa, ajusta o envía con un toque"
                  : "Selecciona una plantilla comercial"}
              </Drawer.Description>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar ventana de WhatsApp"
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: "var(--bg-base)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <X size={17} color="var(--text-secondary)" />
            </button>
          </div>

          {/* Cuerpo desplazable */}
          <div className="vaul-scroll-body" style={{ padding: "14px 16px 22px" }}>
            {!seleccionado && (
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {templates.map((t) => {
                  const IconComp = t.Icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleSeleccionarPlantilla(t.id, t.texto)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: "13px 14px",
                        borderRadius: 14,
                        border: "1px solid var(--border)",
                        background: "var(--bg-card)",
                        cursor: "pointer",
                        textAlign: "left",
                        width: "100%",
                        transition: "background 0.15s, border-color 0.15s",
                      }}
                    >
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 12,
                          background: t.iconBg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <IconComp size={20} color={t.iconColor} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: "var(--text-primary)",
                          }}
                        >
                          {t.titulo}
                        </div>
                        <div
                          style={{
                            fontSize: 12.5,
                            color: "var(--text-muted)",
                            marginTop: 2,
                          }}
                        >
                          {t.subtitulo}
                        </div>
                      </div>
                      <ChevronRight size={18} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                    </button>
                  );
                })}
              </div>
            )}

            {seleccionado && tplActual && (
              <div>
                {/* Barra superior: volver + modo edición */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                    gap: 8,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSeleccionado(null);
                      setEditando(false);
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      minHeight: 36,
                      padding: "4px 10px 4px 6px",
                      borderRadius: 999,
                      background: "var(--bg-base)",
                      border: "1px solid var(--border)",
                      cursor: "pointer",
                      color: "var(--text-secondary)",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    <ChevronLeft size={16} />
                    Cambiar plantilla
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditando((prev) => !prev)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      minHeight: 36,
                      padding: "6px 12px",
                      borderRadius: 999,
                      border: editando ? "1px solid var(--red)" : "1px solid var(--border)",
                      background: editando ? "var(--red-glow)" : "var(--bg-base)",
                      color: editando ? "var(--red)" : "var(--text-secondary)",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {editando ? <Sparkles size={14} /> : <Pencil size={14} />}
                    {editando ? "Vista previa" : "Editar texto"}
                  </button>
                </div>

                {/* Título de plantilla seleccionada */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      background: tplActual.iconBg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <tplActual.Icon size={17} color={tplActual.iconColor} />
                  </div>
                  <div
                    style={{
                      fontSize: 15.5,
                      fontWeight: 800,
                      color: "var(--text-primary)",
                    }}
                  >
                    {tplActual.titulo}
                  </div>
                </div>

                {/* Selector rápido de cita (Cal.com-style) para Confirmar visita */}
                {esConfirmarVisita && (
                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: 14,
                      border: "1px solid var(--border)",
                      background: "var(--bg-base)",
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--text-secondary)",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        marginBottom: 8,
                      }}
                    >
                      <CalendarCheck size={14} color="var(--red)" />
                      Día de la visita
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                        marginBottom: 12,
                      }}
                    >
                      {opcionesDia.map((op) => {
                        const activo = diaVisita === op.valorTexto;
                        return (
                          <button
                            key={op.id}
                            type="button"
                            onClick={() => seleccionarDiaVisita(op.valorTexto)}
                            className={`quick-chip ${activo ? "active" : ""}`}
                          >
                            {op.label}
                          </button>
                        );
                      })}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--text-secondary)",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        marginBottom: 8,
                      }}
                    >
                      <Clock size={14} color="var(--red)" />
                      Hora acordada
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {OPCIONES_HORA_VISITA.map((hora) => {
                        const activo = horaVisita === hora;
                        return (
                          <button
                            key={hora}
                            type="button"
                            onClick={() => seleccionarHoraVisita(hora)}
                            className={`quick-chip ${activo ? "active" : ""}`}
                            style={{ fontVariantNumeric: "tabular-nums" }}
                          >
                            {hora}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Área de texto o vista previa */}
                {editando ? (
                  <textarea
                    value={textoEditado}
                    onChange={(e) => setTextoEditado(e.target.value)}
                    className="form-textarea"
                    style={{
                      minHeight: 156,
                      fontSize: 15.5,
                      background: "var(--bg-card)",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      padding: "14px 16px",
                      borderRadius: 14,
                      border: "1px solid rgba(37, 211, 102, 0.32)",
                      background: "rgba(37, 211, 102, 0.05)",
                      fontSize: 15,
                      color: "var(--text-primary)",
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {textoEditado}
                  </div>
                )}

                {/* Aviso sutil si aún quedan marcadores [DÍA] o [HORA] */}
                {tienePendientesVisita && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: "9px 12px",
                      borderRadius: 10,
                      background: "rgba(217, 119, 6, 0.08)",
                      border: "1px solid rgba(217, 119, 6, 0.25)",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: "#b45309",
                    }}
                  >
                    <AlertCircle size={15} color="#d97706" style={{ flexShrink: 0 }} />
                    <span>
                      Toca un día y una hora arriba para completar{" "}
                      {textoEditado.includes("[DÍA]") && textoEditado.includes("[HORA]")
                        ? "[DÍA] y [HORA]"
                        : textoEditado.includes("[DÍA]")
                        ? "[DÍA]"
                        : "[HORA]"}{" "}
                      antes de enviar.
                    </span>
                  </div>
                )}

                {/* Botón opcional para adjuntar ficha Domus */}
                {inmueble?.urlDomus && !textoEditado.includes(inmueble.urlDomus) && (
                  <div style={{ marginTop: 12 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setTextoEditado(
                          (prev) =>
                            `${prev}\n\nPuedes ver las fotos y la ficha técnica aquí:\n${inmueble.urlDomus}`
                        );
                        toast.success("Enlace de la ficha agregado al mensaje");
                      }}
                      style={{
                        padding: "11px 14px",
                        borderRadius: 12,
                        minHeight: 44,
                        border: "1px dashed var(--red)",
                        background: "var(--red-glow)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        fontSize: 13.5,
                        fontWeight: 700,
                        color: "var(--red)",
                        width: "100%",
                      }}
                    >
                      <Paperclip size={16} />
                      Adjuntar enlace de ficha técnica
                    </button>
                  </div>
                )}

                {/* Botones finales: Copiar texto + Enviar por WhatsApp */}
                <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                  <button
                    type="button"
                    onClick={copiarTexto}
                    style={{
                      flex: 1,
                      minHeight: 48,
                      padding: "12px 14px",
                      borderRadius: 14,
                      border: "1px solid var(--border)",
                      background: "var(--bg-card)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 7,
                      fontSize: 14,
                      fontWeight: 700,
                      color: copiado ? "#16a34a" : "var(--text-secondary)",
                    }}
                  >
                    {copiado ? <Check size={16} color="#16a34a" /> : <Copy size={16} />}
                    {copiado ? "Copiado" : "Copiar texto"}
                  </button>

                  <button
                    type="button"
                    onClick={() => abrirWhatsApp(textoEditado)}
                    style={{
                      flex: 1.65,
                      minHeight: 48,
                      padding: "12px 16px",
                      borderRadius: 14,
                      border: "none",
                      background: "#25D366",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      fontSize: 15,
                      fontWeight: 800,
                      color: "#fff",
                      boxShadow: "0 4px 14px rgba(37, 211, 102, 0.25)",
                    }}
                  >
                    <Send size={16} />
                    Enviar por WhatsApp
                  </button>
                </div>
              </div>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
