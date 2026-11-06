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

export interface AgenciaWorkspace {
  id: string;
  nombre: string;
  razonSocial: string;
  ciudad: string;
  sitioWeb: string;
  crmProveedor: string;
  plan: string;
}

export interface BrokerTeamMember {
  id: string;
  domusProfileId: string;
  nombreCompleto: string;
  cargo: string;
  zonaPrincipal: string;
  foto?: string;
  iniciales: string;
  inmueblesActivos: number;
  leadsMes: number;
  seguimientosAlDiaPct: number;
  tiempoRespuestaMin: number;
  cierresTrimestre: number;
  esCuentaActiva?: boolean;
  esDemo: boolean;
}


export interface InformePropietarioPayload {
  inmuebleId: string;
  codigoDomus?: string;
  mesClave: string;           // ej. "2026-11"
  mesEtiqueta: string;        // ej. "Noviembre 2026"
  nombrePropietario?: string; // ej. "Sr. Jorge Ramírez"
  vistasFincaRaiz: number;
  contactosFincaRaiz: number;
  vistasMetrocuadrado: number;
  contactosMetrocuadrado: number;
  contactosOtrosPortales: number;
  vistasFichaDigital: number;
  citasRealizadas: number;
  seguimientosEnviados: number;
  observaciones: string;
  recomendacion: string;
  creadoEn: string;
}
