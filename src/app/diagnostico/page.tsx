"use client";
import { useState } from "react";

interface DiagResult {
  ip?: string;
  geo?: {
    pais: string;
    region: string;
    ciudad: string;
    isp: string;
    zona: string;
    coordenadas: string;
  };
  domus?: { status: number; latenciaMs: number; ok: boolean; error?: string };
  crm?: { status: number; latenciaMs: number; error?: string };
  timestamp?: string;
  region_vercel?: string;
  ipError?: string;
}

const FLAGS: Record<string, string> = {
  BR: "🇧🇷", CO: "🇨🇴", US: "🇺🇸", DE: "🇩🇪", NL: "🇳🇱", FR: "🇫🇷",
  GB: "🇬🇧", SG: "🇸🇬", JP: "🇯🇵", AR: "🇦🇷", MX: "🇲🇽", CL: "🇨🇱",
};

export default function DiagnosticoPage() {
  const [result, setResult] = useState<DiagResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);

  async function runDiag() {
    setLoading(true);
    setRan(true);
    try {
      const res = await fetch("/api/diagnostico");
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ ipError: "Error al conectar con el servidor" });
    } finally {
      setLoading(false);
    }
  }

  const flag = result?.geo?.pais ? (FLAGS[result.geo.pais] ?? "🌐") : "";
  const isVercel = result?.geo?.isp?.toLowerCase().includes("vercel");
  const isLatam = ["BR", "CO", "AR", "MX", "CL", "PE", "EC"].includes(result?.geo?.pais ?? "");

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      fontFamily: "'Inter', sans-serif",
      color: "#fff",
    }}>
      <div style={{ maxWidth: 480, width: "100%" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🔍</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#e2e8f0" }}>
            Diagnóstico de Conexión
          </h1>
          <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 6 }}>
            Qué ve Domus cuando nuestro servidor se conecta
          </p>
        </div>

        {/* Button */}
        <button
          onClick={runDiag}
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: 12,
            border: "none",
            background: loading
              ? "rgba(99,102,241,0.5)"
              : "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: "#fff",
            fontSize: 15,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            marginBottom: 24,
            transition: "all 0.2s",
            boxShadow: loading ? "none" : "0 4px 20px rgba(99,102,241,0.4)",
          }}
        >
          {loading ? "⏳ Analizando conexión..." : ran ? "🔄 Analizar de nuevo" : "🚀 Analizar ahora"}
        </button>

        {/* Results */}
        {result && !loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* IP y ubicación */}
            <Card>
              <Row label="IP de salida" value={result.ip ?? result.ipError ?? "—"} mono />
              <Row label="País" value={`${flag} ${result.geo?.pais ?? "—"}`} />
              <Row label="Ciudad" value={`${result.geo?.ciudad ?? "—"}, ${result.geo?.region ?? ""}`} />
              <Row label="ISP / ASN" value={result.geo?.isp ?? "—"} small />
              <Row label="Zona horaria" value={result.geo?.zona ?? "—"} />
            </Card>

            {/* Veredicto */}
            <Card>
              <div style={{ textAlign: "center", padding: "4px 0" }}>
                <div style={{ fontSize: 32, marginBottom: 6 }}>
                  {isVercel && isLatam ? "🟡" : isVercel ? "🔴" : "🟢"}
                </div>
                <div style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: isVercel && isLatam ? "#fbbf24" : isVercel ? "#f87171" : "#4ade80"
                }}>
                  {isVercel && isLatam
                    ? "Vercel — Latinoamérica"
                    : isVercel
                    ? "Vercel — Fuera de LATAM"
                    : "IP no-Vercel ✅"}
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                  {isVercel && isLatam
                    ? "Domus ve un datacenter latinoamericano"
                    : isVercel
                    ? "Domus puede identificar esta IP como Vercel USA"
                    : "IP limpia — indistinguible de un usuario real"}
                </div>
              </div>
            </Card>

            {/* Latencia */}
            <Card>
              <Row
                label="Domus (v2.domus.la)"
                value={result.domus?.error ?? `${result.domus?.latenciaMs}ms`}
                badge={result.domus?.ok ? "✅" : "❌"}
              />
              <Row
                label="CRM (crm.domusweb.co)"
                value={result.crm?.error ?? `${result.crm?.latenciaMs}ms`}
              />
              <Row label="Región Vercel" value={result.region_vercel ?? "—"} mono />
            </Card>

            {/* Timestamp */}
            <p style={{ textAlign: "center", fontSize: 11, color: "#475569", marginTop: 4 }}>
              Medido el {new Date(result.timestamp ?? "").toLocaleString("es-CO")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 14,
      padding: "16px 20px",
      backdropFilter: "blur(10px)",
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}>
      {children}
    </div>
  );
}

function Row({ label, value, mono, small, badge }: {
  label: string; value: string; mono?: boolean; small?: boolean; badge?: string;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 12, color: "#94a3b8", flexShrink: 0 }}>{label}</span>
      <span style={{
        fontSize: small ? 11 : 13,
        fontFamily: mono ? "monospace" : "inherit",
        color: "#e2e8f0",
        textAlign: "right",
        wordBreak: "break-all",
      }}>
        {badge && <span style={{ marginRight: 4 }}>{badge}</span>}
        {value}
      </span>
    </div>
  );
}
