// src/lib/agente.ts
// Datos del agente Patricia Vásquez — L2L Bienes Raíces

import type { Agente, AgenciaWorkspace, BrokerTeamMember } from "@/types";

export const AGENTE_PATRICIA: Agente = {
  nombre: "Olga Patricia",
  apellido: "Vásquez Barrios",
  nombreCompleto: "Olga Patricia Vásquez Barrios",
  telefono: "6017041705",
  telefonoWS: "573154672851", // formato internacional para wa.me
  email: "opvasquez@l2lbienesraices.com",
  foto: "https://pictures.domus.la/perfiles/inmobiliaria_607/min_29214_0.jpg",
  cargo: "Asesora Inmobiliaria",
  inmobiliaria: "L2L Bienes Raíces",
  urlPerfil:
    "https://www.l2lbienesraices.com/busqueda/pagina/1/agente/29214",
};

export const AGENT_ID_L2L = "29214";
export const DOMUS_PROFILE_ID = "29214";

export const AGENCIA_L2L: AgenciaWorkspace = {
  id: "l2l-607",
  nombre: "L2L Bienes Raíces",
  razonSocial: "L2L Bienes Raíces SAS",
  ciudad: "Bogotá D.C.",
  sitioWeb: "https://www.l2lbienesraices.com",
  crmProveedor: "Domus CRM (Inmobiliaria #607)",
  plan: "Copiloto Comercial Multi-Broker",
};

/**
 * Equipo para el Panel Agencia (/equipo).
 * La fila de Olga Patricia se hidrata en vivo con sus inmuebles y actividad reales;
 * las demás filas están marcadas explícitamente con `esDemo: true` para presentar
 * la visión multi-asesor a la gerencia de L2L sin mezclar datos simulados con reales.
 */
export const EQUIPO_DEMO_L2L: BrokerTeamMember[] = [
  {
    id: "broker-29214",
    domusProfileId: "29214",
    nombreCompleto: "Olga Patricia Vásquez",
    cargo: "Asesora Comercial Senior",
    zonaPrincipal: "Usaquén · Chicó · Cedritos",
    foto: AGENTE_PATRICIA.foto,
    iniciales: "PV",
    inmueblesActivos: 12,
    leadsMes: 16,
    seguimientosAlDiaPct: 96,
    tiempoRespuestaMin: 8,
    cierresTrimestre: 4,
    esCuentaActiva: true,
    esDemo: false,
  },
  {
    id: "demo-broker-2",
    domusProfileId: "Simulación",
    nombreCompleto: "Camilo Andrés Restrepo",
    cargo: "Asesor Comercial (Simulación L2L)",
    zonaPrincipal: "Chapinero Alto · Rosales",
    iniciales: "CR",
    inmueblesActivos: 15,
    leadsMes: 22,
    seguimientosAlDiaPct: 89,
    tiempoRespuestaMin: 14,
    cierresTrimestre: 3,
    esDemo: true,
  },
  {
    id: "demo-broker-3",
    domusProfileId: "Simulación",
    nombreCompleto: "Marcela Gómez Salazar",
    cargo: "Especialista Arriendos (Simulación L2L)",
    zonaPrincipal: "Colina · Santa Bárbara",
    iniciales: "MG",
    inmueblesActivos: 19,
    leadsMes: 31,
    seguimientosAlDiaPct: 92,
    tiempoRespuestaMin: 11,
    cierresTrimestre: 6,
    esDemo: true,
  },
  {
    id: "demo-broker-4",
    domusProfileId: "Simulación",
    nombreCompleto: "Santiago Pardo Mejía",
    cargo: "Asesor Corporativo (Simulación L2L)",
    zonaPrincipal: "Parque 93 · Cabrera",
    iniciales: "SP",
    inmueblesActivos: 9,
    leadsMes: 14,
    seguimientosAlDiaPct: 78,
    tiempoRespuestaMin: 23,
    cierresTrimestre: 2,
    esDemo: true,
  },
];
