// src/lib/inmuebles-demo.ts
// Datos de ejemplo basados en los inmuebles reales de Patricia en L2L
// Usados como fallback mientras se carga la API

import type { Inmueble } from "@/types";

export const INMUEBLES_DEMO: Inmueble[] = [
  {
    id: "1046099",
    titulo: "Apartamento en Venta en Colina Norte",
    tipo: "Apartamento",
    ciudad: "Bogotá",
    barrio: "Colina Norte",
    gestion: "venta",
    precio: 570000000,
    administracion: 587900,
    areaTotal: 75.73,
    areaConstruida: 75.73,
    habitaciones: 3,
    banos: 2,
    garajes: 2,
    imagen:
      "https://s3-us-west-2.amazonaws.com/pictures.domus.la/inmobiliaria_607/1046099_1_1772569232.jpg",
    urlL2L:
      "https://www.l2lbienesraices.com/inmuebles/apartamento-en-venta-en-colina-norte/1046099",
    urlDomus:
      "https://card.domus.la/public/file/cHJvcGVydHk9MzUwOTY4OCZwcm9maWxlPTI5MjE0JnRlbXBsYXRlPTEmY29udGFjdD0x",
    codigoDomus: "1046099",
  },
  {
    id: "1046101",
    titulo: "Casa en Arriendo en Villa Magdala - Usaquén",
    tipo: "Casa",
    ciudad: "Bogotá",
    barrio: "Villa Magdala-Usaquén",
    gestion: "arriendo",
    precio: 4000000,
    administracion: 0,
    areaTotal: 148,
    areaConstruida: 148,
    habitaciones: 3,
    banos: 3,
    garajes: 1,
    imagen:
      "https://s3-us-west-2.amazonaws.com/pictures.domus.la/inmobiliaria_607/1046101_16_1772575197.jpg",
    urlL2L:
      "https://www.l2lbienesraices.com/inmuebles/casa-en-arriendo-en-villa-magdala-usaquen/1046101",
    codigoDomus: "1046101",
  },
  {
    id: "1046104",
    titulo: "Apartamento en Venta en Paloquemao",
    tipo: "Apartamento",
    ciudad: "Bogotá",
    barrio: "Paloquemao",
    gestion: "venta",
    precio: 284900000,
    administracion: 180000,
    areaTotal: 36.71,
    areaConstruida: 36.71,
    habitaciones: 2,
    banos: 1,
    garajes: 0,
    imagen:
      "https://s3-us-west-2.amazonaws.com/pictures.domus.la/inmobiliaria_607/1046104_1_1776974597_1.jpg",
    urlL2L:
      "https://www.l2lbienesraices.com/inmuebles/apartamento-en-venta-en-paloquemao/1046104",
    codigoDomus: "1046104",
  },
  {
    id: "1046105",
    titulo: "Apartamento en Venta en Paloquemao",
    tipo: "Apartamento",
    ciudad: "Bogotá",
    barrio: "Paloquemao",
    gestion: "venta",
    precio: 314300000,
    administracion: 200000,
    areaTotal: 30.81,
    areaConstruida: 30.81,
    habitaciones: 2,
    banos: 1,
    garajes: 0,
    imagen:
      "https://s3-us-west-2.amazonaws.com/pictures.domus.la/inmobiliaria_607/1046105_1_1776977703_2.jpg",
    urlL2L:
      "https://www.l2lbienesraices.com/inmuebles/apartamento-en-venta-en-paloquemao/1046105",
    codigoDomus: "1046105",
  },
  {
    id: "1046103",
    titulo: "Comercial en Venta en Estrada",
    tipo: "Comercial (Casa para Comercio)",
    ciudad: "Bogotá",
    barrio: "Estrada",
    gestion: "venta",
    precio: 950000000,
    areaTotal: 136.21,
    habitaciones: 0,
    banos: 0,
    garajes: 0,
    imagen:
      "https://s3-us-west-2.amazonaws.com/pictures.domus.la/inmobiliaria_607/1046103_1_1778612008.jpg",
    urlL2L:
      "https://www.l2lbienesraices.com/inmuebles/comercial-casa-para-comercio-en-venta-en-estrada/1046103",
    codigoDomus: "1046103",
  },
];
