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
    // Evitamos errores si no hay DB configurada aún (por ej. si faltan variables de entorno)
    if (!db) return;

    await addDoc(collection(db, "interacciones_ws"), {
      cliente_nombre: cliente.nombre,
      cliente_telefono: cliente.telefono || "",
      inmueble_id: inmueble?.id || "sin-inmueble",
      inmueble_titulo: inmueble?.titulo || "Ninguno",
      tipo_mensaje: tipoMensaje,
      fecha: serverTimestamp(),
    });
    console.log(`[Firebase] Interacción guardada: ${cliente.nombre} - ${tipoMensaje}`);
  } catch (error) {
    console.error("[Firebase] Error al registrar interacción:", error);
  }
}
