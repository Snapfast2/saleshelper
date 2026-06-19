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

  // Saludo personalizado y humano
  if (incluirSaludo) {
    if (nombreCliente) {
      mensaje = `¡Hola ${nombreCliente}! 👋 Soy ${agente.nombre} Vásquez, asesora de L2L Bienes Raíces.\n\nVi que tienes interés en el ${tipoLabel} que tenemos ${gestionLabel.toLowerCase()} en ${ubicacion}.\n\nAquí te comparto la ficha con todos los detalles y fotos:\n`;
    } else {
      mensaje = `¡Hola! 👋 Soy ${agente.nombre} Vásquez, asesora de L2L Bienes Raíces.\n\nTe comparto la ficha con todos los detalles y fotos de este ${tipoLabel} ${gestionLabel.toLowerCase()} en ${ubicacion}:\n`;
    }
  } else {
    mensaje = `✨ ${tipoLabel} ${gestionLabel} en ${ubicacion}\n`;
  }

  // Link a la ficha (arriba para mejor CTR)
  if (incluirLink && inmueble.urlDomus) {
    mensaje += `${inmueble.urlDomus}\n\n`;
  } else if (incluirLink && inmueble.urlL2L) {
    mensaje += `${inmueble.urlL2L}\n\n`;
  }

  // Detalles principales
  const precioFormato = formatNumero(inmueble.precio);
  if (inmueble.gestion === "venta") {
    mensaje += `💰 *Precio:* $${precioFormato}\n`;
  } else {
    mensaje += `💰 *Canon:* $${precioFormato}\n`;
  }

  if (inmueble.administracion && inmueble.administracion > 0) {
    mensaje += `🏢 Administración: $${formatNumero(inmueble.administracion)}\n`;
  }

  const areaCons = inmueble.areaConstruida || inmueble.areaTotal;
  mensaje += `📐 Área: ${areaCons} m²\n`;

  const caracteristicas = [];
  if (inmueble.habitaciones > 0) caracteristicas.push(`🛏 ${inmueble.habitaciones} Hab`);
  if (inmueble.banos > 0) caracteristicas.push(`🚿 ${inmueble.banos} Baños`);
  if (inmueble.garajes > 0) caracteristicas.push(`🚗 ${inmueble.garajes} Garajes`);
  
  if (caracteristicas.length > 0) {
    mensaje += `${caracteristicas.join(" | ")}\n`;
  }

  if (incluirSaludo) {
    mensaje += `\nÉchale un vistazo y me cuentas qué te parece. ¡Quedo súper atenta si quieres que agendemos una visita! ✨`;
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
