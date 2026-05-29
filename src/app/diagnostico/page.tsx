"use client";
import { useState } from "react";

const FLAGS: Record<string, string> = {
  BR: "🇧🇷", CO: "🇨🇴", US: "🇺🇸", DE: "🇩🇪", NL: "🇳🇱",
  GB: "🇬🇧", SG: "🇸🇬", AR: "🇦🇷", MX: "🇲🇽", CL: "🇨🇱",
};

export default function DiagnosticoPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState<number | null>(null);

  async function runDiag() {
    setLoading(true);
    const t0 = Date.now();
    try {
      const res = await fetch("/api/diagnostico");
      setData(await res.json());
      setElapsed(Date.now() - t0);
    } catch {
      setData({ error: true });
    } finally {
      setLoading(false);
    }
  }

  const flag = data?.geo?.pais ? (FLAGS[data.geo.pais] ?? "🌐") : "";
  const isp = data?.geo?.isp ?? "";
  const isVercel = isp.toLowerCase().includes("vercel");
  const isAmazon = isp.toLowerCase().includes("amazon");
  const isLatam = ["BR", "CO", "AR", "MX", "CL", "PE", "EC"].includes(data?.geo?.pais ?? "");

  let verdict = { icon: "🔴", label: "IP Sospechosa", sub: "Fuera de LATAM o ASN desconocido", color: "#f87171" };
  if (isAmazon && isLatam) verdict = { icon: "🟢", label: "IP limpia — Amazon LATAM", sub: "Domus ve Amazon AWS São Paulo. Indistinguible de un usuario real.", color: "#4ade80" };
  else if (isVercel && isLatam) verdict = { icon: "🟡", label: "Vercel — Latinoamérica", sub: "Datacenter latinoamericano. Bajo riesgo.", color: "#fbbf24" };
  else if (isAmazon) verdict = { icon: "🟡", label: "Amazon — Fuera de LATAM", sub: "IP de Amazon pero en otra región.", color: "#fbbf24" };

  return (
    <div style={{ padding: "20px 16px 120px", maxWidth: 520, margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
          🔍 Diagnóstico
        </h1>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
          Medición en vivo — cada análisis es fresco, sin caché{elapsed ? ` · ${elapsed}ms` : ""}
        </p>
      </div>

      <button onClick={runDiag} disabled={loading} style={{
        width: "100%", padding: 14, borderRadius: 14, border: "none",
        background: loading ? "rgba(99,102,241,0.4)" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
        color: "#fff", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
        marginBottom: 20, boxShadow: loading ? "none" : "0 4px 20px rgba(99,102,241,0.35)",
      }}>
        {loading ? "⏳ Analizando... (tarda ~5s)" : data ? "🔄 Analizar de nuevo" : "🚀 Analizar ahora"}
      </button>

      {data && !loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* VEREDICTO */}
          <Section title="">
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <div style={{ fontSize: 36 }}>{verdict.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: verdict.color, marginTop: 6 }}>{verdict.label}</div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>{verdict.sub}</div>
            </div>
          </Section>

          {/* CONEXIÓN */}
          <Section title="🌐 Lo que ve Domus">
            <Row label="IP de salida" value={data.ip ?? "—"} mono />
            <Row label="País" value={`${flag} ${data.geo?.pais ?? "—"}`} />
            <Row label="Ciudad" value={`${data.geo?.ciudad}, ${data.geo?.region}`} />
            <Row label="ISP / ASN" value={data.geo?.isp ?? "—"} small />
            <Row label="Zona horaria" value={data.geo?.zona ?? "—"} />
            <Row label="Región Vercel" value={data.regionVercel ?? "—"} mono />
          </Section>

          {/* HEADERS QUE ENVIAMOS */}
          <Section title="🎭 Headers exactos que enviamos">
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 8 }}>
              Exactamente lo que Domus recibe en cada request nuestro
            </div>
            <Row label="Accept-Language" value={data.headersEnviados?.acceptLanguage} mono small />
            <Row label="Referer" value={data.headersEnviados?.referer} mono small />
            <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)", background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: 10 }}>
              <div style={{ fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>Pool de User-Agents (1 aleatorio por sesión):</div>
              {data.headersEnviados?.userAgentPool?.map((ua: string, i: number) => (
                <div key={i} style={{ marginBottom: 4, fontFamily: "monospace", lineHeight: 1.4, wordBreak: "break-all" }}>
                  <span style={{ color: "#6366f1" }}>{i + 1}.</span> {ua}
                </div>
              ))}
            </div>
          </Section>

          {/* DOMUS SERVERS */}
          <Section title="⚡ Latencia y servidores">
            <Row label="Domus (v2.domus.la)" value={data.domus?.error ?? `${data.domus?.latenciaMs}ms`} badge={data.domus?.ok ? "✅" : "❌"} />
            <Row label="Tamaño respuesta" value={data.domus?.pesoKB ? `${data.domus.pesoKB} KB` : "—"} />
            <Row label="Servidor Domus" value={data.domus?.server ?? "—"} mono small />
            <Row label="Cloudflare Ray" value={data.domus?.cfRay ?? "—"} mono small />
            <Row label="CSRF token presente" value={data.domus?.hasCsrf ? "✅ Sí" : "❌ No"} />
            <Divider />
            <Row label="CRM (crm.domusweb.co)" value={data.crm?.error ?? `${data.crm?.latenciaMs}ms`} />
            <Row label="Servidor CRM" value={data.crm?.server ?? "—"} mono small />
          </Section>

          {/* SESIÓN REDIS */}
          <Section title="💾 Sesión en Redis">
            {data.sesion?.error ? (
              <div style={{ color: "#f87171", fontSize: 12 }}>{data.sesion.error}</div>
            ) : (
              <>
                <Row label="Sesión guardada" value={data.sesion?.existe ? "✅ Activa" : "❌ No hay"} />
                {data.sesion?.existe && <>
                  <Row label="Expira en" value={data.sesion?.ttlDias ? `${data.sesion.ttlDias} días` : "—"} />
                  <Row label="Creada" value={data.sesion?.creadaHace ?? "—"} />
                  <Row label="UA de sesión" value={data.sesion?.uaTipo ?? "—"} />
                </>}
                <Divider />
                <Row label="Push activado" value={data.push?.subscribed ? "✅ Sí" : "❌ No"} />
                {data.push?.subscribed && <Row label="Endpoint" value={data.push?.endpoint ?? "—"} mono small />}
                <Row label="Clientes conocidos" value={`${data.push?.clientesConocidos ?? 0} IDs en Redis`} />
              </>
            )}
          </Section>

          {/* ENTORNO */}
          <Section title="🔑 Variables de entorno">
            {data.env && Object.entries(data.env).map(([key, val]) => (
              <Row key={key} label={key} value={val ? "✅ Configurada" : "❌ Falta"} />
            ))}
          </Section>

          <p style={{ textAlign: "center", fontSize: 11, color: "var(--text-muted)" }}>
            Medido el {new Date(data.timestamp).toLocaleString("es-CO")}
          </p>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border)",
      borderRadius: 16, padding: "14px 16px",
    }}>
      {title && <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>{title}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>{children}</div>
    </div>
  );
}

function Row({ label, value, mono, small, badge }: { label: string; value: string; mono?: boolean; small?: boolean; badge?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
      <span style={{ fontSize: 12, color: "var(--text-secondary)", flexShrink: 0, paddingTop: 1 }}>{label}</span>
      <span style={{ fontSize: small ? 10 : 12, fontFamily: mono ? "monospace" : "inherit", color: "var(--text-primary)", textAlign: "right", wordBreak: "break-all", maxWidth: "65%" }}>
        {badge && <span style={{ marginRight: 4 }}>{badge}</span>}{value}
      </span>
    </div>
  );
}

function Divider() {
  return <div style={{ borderTop: "1px solid var(--border)", margin: "4px 0" }} />;
}
