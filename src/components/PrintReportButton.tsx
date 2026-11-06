'use client';
// src/components/PrintReportButton.tsx
// Barra inferior fija (oculta al imprimir) con contacto directo a Patricia y guardado en PDF A4.

import { MessageCircle, Printer } from "lucide-react";

export interface PrintReportButtonProps {
  wsUrl: string;
}

export default function PrintReportButton({ wsUrl }: PrintReportButtonProps) {
  return (
    <div
      className="no-print"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 95,
        background: "var(--bg-card)",
        borderTop: "1px solid var(--border)",
        padding: "12px 16px calc(12px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div
        style={{
          maxWidth: 680,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <a
          href={wsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ws"
          style={{
            flex: 1,
            padding: "13px 16px",
            fontSize: 15.5,
            borderRadius: 12,
            minHeight: 48,
          }}
        >
          <MessageCircle size={19} style={{ flexShrink: 0 }} />
          <span>Conversar con Patricia</span>
        </a>

        <button
          type="button"
          onClick={() => window.print()}
          className="btn-secondary"
          style={{
            width: "auto",
            padding: "13px 16px",
            fontSize: 15,
            borderRadius: 12,
            background: "var(--bg-card)",
            minHeight: 48,
            flexShrink: 0,
          }}
        >
          <Printer size={18} color="var(--red)" style={{ flexShrink: 0 }} />
          <span>Guardar PDF</span>
        </button>
      </div>
    </div>
  );
}
