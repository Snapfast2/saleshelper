// src/lib/interacciones.ts
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import type { Cliente, Inmueble } from "@/types";

/**
 * Registra una interacción en Firestore cada vez que se envía un WhatsApp.
 */
export async function registrarInteraccionWS(
  cliente: Cliente,
  inmueble: Inmueble | undefined,
  tipoMensaje: string
) {
  try {
    if (!db) return;

    const indicativo = (cliente.telefonoIndicativo || "+57").replace(/\D/g, "") || "57";
    const localDigits = (cliente.telefono || "").replace(/\D/g, "");
    const fullPhone = localDigits
      ? localDigits.startsWith(indicativo) && localDigits.length > 10
        ? localDigits
        : `${indicativo}${localDigits}`
      : "";

    await addDoc(collection(db, "interacciones_ws"), {
      cliente_nombre: cliente.nombre,
      cliente_telefono: fullPhone,
      inmueble_id: inmueble?.id || "sin-inmueble",
      inmueble_titulo: inmueble?.titulo || "Ninguno",
      tipo_mensaje: tipoMensaje,
      fecha: serverTimestamp(),
    });
  } catch (error) {
    console.error("[Firebase] Error al registrar interacción:", error instanceof Error ? error.message : error);
  }
}
