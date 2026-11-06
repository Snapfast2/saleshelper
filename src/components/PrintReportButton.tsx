'use client';
// src/components/PrintReportButton.tsx
// Barra inferior fija ergonómica para el propietario (oculta al imprimir):
// WhatsApp directo a Patricia + Compartir nativo móvil + Guardar PDF A4.

import { useState } from "react";
import { Check, MessageCircle, Printer, Share2 } from "lucide-react";

export interface PrintReportButtonProps {
  wsUrl: string;
  shareTitle?: string;
}

export default function PrintReportButton({
  wsUrl,
  shareTitle = "Informe Mensual de Gestión Comercial | L2L Bienes Raíces",
}: PrintReportButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareUrl = window.location.href;
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: shareTitle,
          url: shareUrl,
        });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignorar si el navegador restringe portapapeles
    }
  };

  return (
    <div
      className="no-print"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 95,
        background: "rgba(255, 255, 255, 0.96)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderTop: "1px solid var(--border)",
        boxShadow: "0 -6px 24px rgba(17, 24, 39, 0.07)",
        padding: "10px 14px calc(10px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div
        style={{
          maxWidth: 680,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <a
          href={wsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ws"
          style={{
            flex: 1,
            padding: "12px 14px",
            fontSize: 15,
            borderRadius: 12,
            minHeight: 46,
            minWidth: 0,
          }}
        >
          <MessageCircle size={18} style={{ flexShrink: 0 }} />
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            Hablar con Patricia
          </span>
        </a>

        <button
          type="button"
          onClick={handleShare}
          className="btn-secondary"
          aria-label="Compartir informe"
          style={{
            width: "auto",
            padding: "11px 12px",
            fontSize: 13.5,
            borderRadius: 12,
            background: "var(--bg-card)",
            minHeight: 46,
            flexShrink: 0,
            gap: 6,
          }}
        >
          {copied ? (
            <Check size={17} color="#16A34A" style={{ flexShrink: 0 }} />
          ) : (
            <Share2 size={17} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
          )}
          <span>{copied ? "Copiado" : "Compartir"}</span>
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="btn-secondary"
          aria-label="Guardar como PDF"
          style={{
            width: "auto",
            padding: "11px 12px",
            fontSize: 13.5,
            borderRadius: 12,
            background: "var(--bg-card)",
            minHeight: 46,
            flexShrink: 0,
            gap: 6,
          }}
        >
          <Printer size={17} color="var(--red)" style={{ flexShrink: 0 }} />
          <span>PDF</span>
        </button>
      </div>
    </div>
  );
}
