// src/lib/recordatorios.ts
// Sistema de recordatorios de seguimiento guardados en localStorage

export interface Recordatorio {
  id: string;
  clienteId: string | number;
  nombre: string;
  telefono: string;
  telefonoIndicativo: string;
  inmuebleInteres: string;
  fechaRecordatorio: string; // ISO date string
  completado: boolean;
  creadoEn: string;
}

const STORAGE_KEY = "saleshelper_recordatorios_v1";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getRecordatorios(): Recordatorio[] {
  if (!isBrowser()) return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function guardarRecordatorios(recs: Recordatorio[]): void {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recs));
}

export function addRecordatorio(data: Omit<Recordatorio, "id" | "creadoEn" | "completado">): Recordatorio {
  const recs = getRecordatorios();
  // Si ya existe uno para este cliente, lo reemplazamos
  const filtrado = recs.filter((r) => String(r.clienteId) !== String(data.clienteId));
  const nuevo: Recordatorio = {
    ...data,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    completado: false,
    creadoEn: new Date().toISOString(),
  };
  filtrado.push(nuevo);
  guardarRecordatorios(filtrado);
  return nuevo;
}

export function marcarCompletado(id: string): void {
  const recs = getRecordatorios().map((r) =>
    r.id === id ? { ...r, completado: true } : r
  );
  guardarRecordatorios(recs);
}

export function eliminarRecordatorio(id: string): void {
  const recs = getRecordatorios().filter((r) => r.id !== id);
  guardarRecordatorios(recs);
}

/** Solo los recordatorios pendientes de hoy o vencidos (para mostrar en Inicio) */
export function getRecordatoriosPendientes(): Recordatorio[] {
  const hoy = new Date();
  hoy.setHours(23, 59, 59, 999);
  return getRecordatorios().filter((r) => {
    if (r.completado) return false;
    const fecha = new Date(r.fechaRecordatorio);
    return fecha <= hoy;
  });
}

/** Genera el texto de seguimiento pre-redactado listo para WhatsApp */
export function generarMensajeSeguimiento(nombre: string): string {
  const nom = nombre.trim().split(" ")[0];
  return `Hola ${nom} 👋, ¿cómo estás? Quería saber si pudiste revisar la información que te envié sobre el inmueble. Quedo atenta a tus comentarios 😊`;
}

/** Calcula la fecha de recordatorio según la opción elegida */
export function calcularFechaRecordatorio(opcion: "hoy" | "1dia" | "3dias" | "7dias"): string {
  const fecha = new Date();
  if (opcion === "hoy") {
    // Para hoy mismo, ponemos al final del día
    fecha.setHours(20, 0, 0, 0);
  } else if (opcion === "1dia") {
    fecha.setDate(fecha.getDate() + 1);
    fecha.setHours(9, 0, 0, 0);
  } else if (opcion === "3dias") {
    fecha.setDate(fecha.getDate() + 3);
    fecha.setHours(9, 0, 0, 0);
  } else if (opcion === "7dias") {
    fecha.setDate(fecha.getDate() + 7);
    fecha.setHours(9, 0, 0, 0);
  }
  return fecha.toISOString();
}

/** Formatea la fecha de recordatorio en texto legible */
export function formatearFechaRecordatorio(isoString: string): string {
  const fecha = new Date(isoString);
  const hoy = new Date();
  const ayer = new Date(hoy);
  ayer.setDate(hoy.getDate() - 1);
  const mañana = new Date(hoy);
  mañana.setDate(hoy.getDate() + 1);

  if (fecha.toDateString() === hoy.toDateString()) return "Hoy";
  if (fecha.toDateString() === ayer.toDateString()) return "Ayer (vencido)";
  if (fecha.toDateString() === mañana.toDateString()) return "Mañana";

  return fecha.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}
