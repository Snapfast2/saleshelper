// src/app/api/informes-propietario/route.ts
// Endpoint protegido por sesión para recuperar borradores mensuales y firmar enlaces públicos de informes a propietarios.

import { verifyRequestSession } from "@/lib/auth";
import {
  getOwnerReportDraft,
  saveAndCreateOwnerReportToken,
} from "@/lib/ownerReportToken";
import type { InformePropietarioPayload } from "@/types";

function clampNonNegativeInt(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.min(9_999_999, Math.round(num));
}

function sanitizeString(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

export async function GET(req: Request) {
  if (!verifyRequestSession(req)) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const inmuebleId = (searchParams.get("inmuebleId") ?? "").trim();
  const mes = (
    searchParams.get("mes") ??
    searchParams.get("mesClave") ??
    ""
  ).trim();

  const draft = await getOwnerReportDraft(inmuebleId, mes);
  return Response.json({ draft });
}

export async function POST(req: Request) {
  if (!verifyRequestSession(req)) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return Response.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
  }

  if (!rawBody || typeof rawBody !== "object") {
    return Response.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const body = rawBody as Record<string, unknown>;
  const inmuebleId = sanitizeString(body.inmuebleId, 12);
  const mesClave = sanitizeString(body.mesClave, 20);

  if (!/^\d{1,12}$/.test(inmuebleId)) {
    return Response.json(
      { error: "Identificador de inmueble inválido" },
      { status: 400 }
    );
  }

  if (!mesClave || !/^[0-9A-Za-z_-]{1,20}$/.test(mesClave)) {
    return Response.json(
      { error: "Periodo mensual inválido" },
      { status: 400 }
    );
  }

  const codigoDomus = sanitizeString(body.codigoDomus, 24);
  const mesEtiqueta = sanitizeString(body.mesEtiqueta, 60) || mesClave;
  const nombrePropietario = sanitizeString(body.nombrePropietario, 100);

  const sanitizedPayload: InformePropietarioPayload = {
    inmuebleId,
    ...(codigoDomus ? { codigoDomus } : {}),
    mesClave,
    mesEtiqueta,
    ...(nombrePropietario ? { nombrePropietario } : {}),
    vistasFincaRaiz: clampNonNegativeInt(body.vistasFincaRaiz),
    contactosFincaRaiz: clampNonNegativeInt(body.contactosFincaRaiz),
    vistasMetrocuadrado: clampNonNegativeInt(body.vistasMetrocuadrado),
    contactosMetrocuadrado: clampNonNegativeInt(body.contactosMetrocuadrado),
    contactosOtrosPortales: clampNonNegativeInt(body.contactosOtrosPortales),
    vistasFichaDigital: clampNonNegativeInt(body.vistasFichaDigital),
    citasRealizadas: clampNonNegativeInt(body.citasRealizadas),
    seguimientosEnviados: clampNonNegativeInt(body.seguimientosEnviados),
    observaciones: sanitizeString(body.observaciones, 1200),
    recomendacion: sanitizeString(body.recomendacion, 800),
    creadoEn: new Date().toISOString(),
  };

  try {
    const token = await saveAndCreateOwnerReportToken(sanitizedPayload);
    return Response.json({
      token,
      urlPath: `/ficha/informe/${encodeURIComponent(token)}`,
    });
  } catch {
    return Response.json(
      { error: "No fue posible firmar el informe en este momento" },
      { status: 500 }
    );
  }
}
