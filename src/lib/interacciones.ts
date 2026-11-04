// src/lib/interacciones.ts
import { getFirestoreDb } from "./firebase";
import type { Cliente, Inmueble } from "@/types";

/**
 * Registra una interacción en Firestore cargando el SDK bajo demanda solo al enviar WhatsApp.
 */
export async function registrarInteraccionWS(
  cliente: Pick<Cliente, "nombre" | "telefono"> & { telefonoIndicativo?: string },
  inmueble: Pick<Inmueble, "id" | "titulo"> | undefined,
  tipoMensaje: string
) {
  try {
    const db = await getFirestoreDb();
    if (!db) return;

    const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");

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
