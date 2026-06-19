// src/types/index.ts
// Tipos globales de la app SalesHelper

export interface Inmueble {
  id: string;
  titulo: string;
  tipo: string; // apartamento, casa, local, etc.
  ciudad: string;
  barrio: string;
  gestion: "venta" | "arriendo";
  precio: number;
  administracion?: number;
  areaTotal: number;
  areaConstruida?: number;
  habitaciones: number;
  banos: number;
  garajes: number;
  imagen: string;
  imagenes?: string[];
  urlL2L: string;
  urlDomus?: string; // link card.domus.la
  codigoDomus?: string;
  descripcion?: string;
  estado?: string;
}

export interface MensajeWS {
  inmueble: Inmueble;
  nombreCliente: string;
  incluirSaludo: boolean;
  incluirLink: boolean;
}

export interface Agente {
  nombre: string;
  apellido: string;
  nombreCompleto: string;
  telefono: string;
  telefonoWS: string;
  email: string;
  foto: string;
  cargo: string;
  inmobiliaria: string;
  urlPerfil: string;
}

export interface Cliente {
  id: string | number;
  nombre: string;
  email: string;
  telefono: string;
  telefonoIndicativo: string;
  estado: string; // Ej: Nuevo, No responde
  inmuebleInteres: string; // Codigo del inmueble
  origen: string; // Ej: Portal Web
  fecha: string;
  diasSeguimiento?: number;
  porcentaje?: number;   // % de avance del negocio según Domus (2–100)
}
