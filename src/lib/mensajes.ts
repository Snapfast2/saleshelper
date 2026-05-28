// src/lib/mensajes.ts
// Generador de mensajes de WhatsApp para inmuebles

import type { Inmueble, MensajeWS } from "@/types";
import { AGENTE_PATRICIA } from "./agente";

export function formatPrecioCOP(valor: number): string {
  return valor.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function formatNumero(valor: number): string {
  return valor.toLocaleString("es-CO");
}

/**
 * Genera el texto del mensaje de WhatsApp con el formato exacto que usa Patricia
 */
export function generarMensajeWS(config: MensajeWS): string {
  const { inmueble, nombreCliente, incluirSaludo, incluirLink } = config;
  const agente = AGENTE_PATRICIA;

  const gestionLabel =
    inmueble.gestion === "venta" ? "en Venta" : "en Arriendo";
  const tipoLabel = capitalize(inmueble.tipo);
  const ubicacion = [inmueble.barrio, inmueble.ciudad]
    .filter(Boolean)
    .join(", ");

  let mensaje = "";

  // Título del inmueble
  mensaje += `${tipoLabel} ${gestionLabel} en ${ubicacion}\n`;

  // Precio
  const precioFormato = formatNumero(inmueble.precio);
  if (inmueble.gestion === "venta") {
    mensaje += `*Precio: ${precioFormato}*\n`;
  } else {
    mensaje += `*Canon: $ ${precioFormato}*\n`;
  }

  // Administración
  if (inmueble.administracion && inmueble.administracion > 0) {
    mensaje += `Administración $ ${formatNumero(inmueble.administracion)}\n`;
  }

  // Área
  const areaCons = inmueble.areaConstruida || inmueble.areaTotal;
  mensaje += `${areaCons} M2 (construída), ${inmueble.areaTotal} M2 (lote)\n`;

  // Características
  if (inmueble.habitaciones > 0) {
    mensaje += `${inmueble.habitaciones} habitacion${inmueble.habitaciones !== 1 ? "es" : ""}\n`;
  }
  if (inmueble.banos > 0) {
    mensaje += `${inmueble.banos} baño${inmueble.banos !== 1 ? "s" : ""}\n`;
  }
  if (inmueble.garajes > 0) {
    mensaje += `${inmueble.garajes} garaje${inmueble.garajes !== 1 ? "s" : ""}\n`;
  }

  // Link a la ficha
  if (incluirLink && inmueble.urlDomus) {
    mensaje += `Conoce más detalles aquí: ${inmueble.urlDomus}\n`;
  } else if (incluirLink && inmueble.urlL2L) {
    mensaje += `Conoce más detalles aquí: ${inmueble.urlL2L}\n`;
  }

  // Saludo personalizado
  if (incluirSaludo) {
    mensaje += `\n`;
    if (nombreCliente) {
      mensaje += `Buen día ${nombreCliente}, mi nombre es ${agente.nombre} Vásquez asesora inmob..voy a dejarte aquí la ficha del inmueble. Por el cual aplicaste, quedo atenta a los comentarios.`;
    } else {
      mensaje += `Buen día, mi nombre es ${agente.nombre} Vásquez asesora inmob..te comparto la ficha de este inmueble, quedo atenta a tus comentarios.`;
    }
  }

  return mensaje;
}

/**
 * Genera el link de WhatsApp con el mensaje pre-cargado
 */
export function generarLinkWS(
  telefono: string,
  mensaje: string
): string {
  const texto = encodeURIComponent(mensaje);
  return `https://wa.me/${telefono}?text=${texto}`;
}

/**
 * Genera post para redes sociales
 */
export function generarPostRedes(
  inmueble: Inmueble,
  red: "facebook" | "instagram"
): string {
  const gestionLabel =
    inmueble.gestion === "venta" ? "en Venta 🏠" : "en Arriendo 🔑";
  const tipoLabel = capitalize(inmueble.tipo);
  const ubicacion = [inmueble.barrio, inmueble.ciudad]
    .filter(Boolean)
    .join(", ");

  let post = `✨ ${tipoLabel} ${gestionLabel}\n`;
  post += `📍 ${ubicacion}\n\n`;
  post += `💰 Precio: $${formatNumero(inmueble.precio)}\n`;

  if (inmueble.habitaciones > 0) post += `🛏 ${inmueble.habitaciones} Habitaciones\n`;
  if (inmueble.banos > 0) post += `🚿 ${inmueble.banos} Baños\n`;
  if (inmueble.garajes > 0) post += `🚗 ${inmueble.garajes} Garajes\n`;
  post += `📐 ${inmueble.areaTotal} m²\n\n`;

  if (red === "instagram") {
    post += `¿Te interesa? Escríbeme por WhatsApp o visita el link en mi bio 👆\n\n`;
    post += `#BienesRaices #${inmueble.ciudad.replace(/\s/g, "")} #${tipoLabel.replace(/\s/g, "")} `;
    post += `#InmueblesEnVenta #L2LBienesRaices #Inmobiliaria #Colombia `;
    post += `#${inmueble.gestion === "venta" ? "CasaEnVenta" : "CasaEnArriendo"} #Propiedad`;
  } else {
    post += `👉 Ver más inmuebles de mi portafolio:\n`;
    post += `${AGENTE_PATRICIA.urlPerfil}\n\n`;
    post += `📞 Contáctame: ${AGENTE_PATRICIA.telefono}\n`;
    post += `💬 WhatsApp: wa.me/${AGENTE_PATRICIA.telefonoWS}`;
  }

  return post;
}

function capitalize(str: string): string {
  if (!str) return str;
  return str
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
