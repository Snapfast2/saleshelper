// src/app/ficha/informe/[token]/page.tsx
// Micrositio público ejecutivo del Informe Mensual de Gestión Comercial para propietarios.
// Accesible vía /ficha/* sin autenticación; optimizado para celular, WhatsApp OpenGraph y exportación A4 PDF.

import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import OwnerReportSheet from "@/components/OwnerReportSheet";
import PrintReportButton from "@/components/PrintReportButton";
import { AGENTE_PATRICIA } from "@/lib/agente";
import { INMUEBLES_DEMO } from "@/lib/inmuebles-demo";
import { resolveOwnerReportToken } from "@/lib/ownerReportToken";
import { fetchDomusProperties } from "@/services/domusService";
import { scrapeL2L } from "@/services/l2lService";
import type { InformePropietarioPayload, Inmueble } from "@/types";

function safeDecodeToken(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

const getCachedOwnerReport = cache(
  async (rawToken: string): Promise<InformePropietarioPayload | null> => {
    const decoded = safeDecodeToken(rawToken).trim();
    if (!decoded) return null;
    return resolveOwnerReportToken(decoded);
  }
);

const findReportInmueble = cache(
  async (
    inmuebleId: string,
    codigoDomus?: string
  ): Promise<Inmueble | null> => {
    const matchesProperty = (i: Inmueble) =>
      i.id === inmuebleId ||
      i.codigoDomus === inmuebleId ||
      Boolean(
        codigoDomus &&
          (i.id === codigoDomus || i.codigoDomus === codigoDomus)
      );

    try {
      const l2l = await scrapeL2L();
      const matchL2L = l2l.inmuebles.find(matchesProperty);
      if (matchL2L) return matchL2L;
    } catch {
      // Continuar a caché Domus
    }

    try {
      const domus = await fetchDomusProperties({ allowLogin: false });
      const matchDomus = domus.inmuebles.find(matchesProperty);
      if (matchDomus) return matchDomus;
    } catch {
      // Continuar a catálogo base de respaldo
    }

    return INMUEBLES_DEMO.find(matchesProperty) ?? null;
  }
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const report = await getCachedOwnerReport(token);

  if (!report) {
    return {
      title: "Informe no disponible | L2L Bienes Raíces",
      robots: { index: false, follow: false },
    };
  }

  const inmueble = await findReportInmueble(
    report.inmuebleId,
    report.codigoDomus
  );

  const totalVistas =
    (report.vistasFincaRaiz || 0) +
    (report.vistasMetrocuadrado || 0) +
    (report.vistasFichaDigital || 0);

  const totalContactos =
    (report.contactosFincaRaiz || 0) +
    (report.contactosMetrocuadrado || 0) +
    (report.contactosOtrosPortales || 0);

  const refCode =
    report.codigoDomus || inmueble?.codigoDomus || report.inmuebleId;

  const etiquetaPropiedad = inmueble
    ? `${inmueble.tipo} en ${inmueble.barrio}, ${inmueble.ciudad} (Ref. #${refCode})`
    : `Inmueble Ref. #${refCode}`;

  const title =
    "Informe de Gestión · " + report.mesEtiqueta + " | L2L Bienes Raíces";

  const description = `${etiquetaPropiedad} · ${totalVistas.toLocaleString("es-CO")} visualizaciones digitales y ${totalContactos.toLocaleString("es-CO")} clientes interesados atendidos por Olga Patricia Vásquez.`;

  const hasRealImg = Boolean(
    inmueble?.imagen && !inmueble.imagen.includes("placeholder")
  );

  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      images:
        hasRealImg && inmueble
          ? [
              {
                url: inmueble.imagen,
                width: 1200,
                height: 630,
                alt: inmueble.titulo || etiquetaPropiedad,
              },
            ]
          : [],
      type: "article",
      siteName: "L2L Bienes Raíces",
    },
  };
}

export default async function OwnerReportPublicPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const report = await getCachedOwnerReport(token);

  if (!report) {
    return notFound();
  }

  const inmueble = await findReportInmueble(
    report.inmuebleId,
    report.codigoDomus
  );

  const refCode =
    report.codigoDomus || inmueble?.codigoDomus || report.inmuebleId;
  const ubicacionTexto = inmueble?.barrio ? ` en ${inmueble.barrio}` : "";

  const wsText = encodeURIComponent(
    `Hola Patricia, acabo de revisar el Informe de Gestión de ${report.mesEtiqueta} de mi inmueble${ubicacionTexto} (Ref. #${refCode}) y me gustaría conversar contigo.`
  );
  const wsUrl = `https://wa.me/${AGENTE_PATRICIA.telefonoWS}?text=${wsText}`;

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100dvh",
        background: "var(--bg-base)",
      }}
    >
      <main
        className="page"
        style={{
          maxWidth: 680,
          margin: "0 auto",
          padding: "12px 12px 104px",
          minHeight: "auto",
        }}
      >
        <OwnerReportSheet report={report} inmueble={inmueble} />
      </main>

      <PrintReportButton
        wsUrl={wsUrl}
        shareTitle={`Informe de Gestión · ${report.mesEtiqueta} | L2L Bienes Raíces`}
      />
    </div>
  );
}
