'use client';
// src/app/page.tsx

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import {
  MessageCircle,
  Share2,
  Building2,
  ExternalLink,
  RefreshCw,
  MessageSquareQuote,
  Bell,
} from "lucide-react";

import PropCard from "@/components/PropCard";
import { AGENTE_PATRICIA } from "@/lib/agente";
import { useInmuebles } from "@/hooks/useInmuebles";
import LoadingState from "@/components/LoadingState";
import EmptyState from "@/components/EmptyState";
import {
  getRecordatoriosPendientes,
  marcarCompletado,
  formatearFechaRecordatorio,
  type Recordatorio,
} from "@/lib/recordatorios";
import NotificationBanner, { NotificationHeaderButton } from "@/components/NotificationBanner";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import type { Cliente, Inmueble } from "@/types";

const WhatsAppModal = dynamic(() => import("@/components/WhatsAppModal"), {
  ssr: false,
});

export default function Home() {
  const router = useRouter();
  const { inmuebles, isLoading, mutate } = useInmuebles();
  const [recordatorios, setRecordatorios] = useState<Recordatorio[]>([]);
  const { isSubscribed, checkReminders } = usePushNotifications();
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [waModalData, setWaModalData] = useState<{
    cliente: Cliente;
    tel: string;
    inmueble?: Inmueble;
  } | null>(null);

  useEffect(() => {
    setRecordatorios(getRecordatoriosPendientes());
  }, []);

  useEffect(() => {
    if (!isSubscribed) return;
    checkReminders();
  }, [isSubscribed, checkReminders]);

  const handleCompletarRecordatorio = (id: string) => {
    marcarCompletado(id);
    setRecordatorios(getRecordatoriosPendientes());
    fetch("/api/push/check-reminders", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  };

  const hora = new Date().getHours();
  let saludo = "¡Hola";
  let subtitulo = "¿Qué vamos a vender hoy?";

  if (hora < 12) {
    saludo = "¡Buenos días";
    subtitulo = "Un excelente día para cerrar tratos ☕";
  } else if (hora < 18) {
    saludo = "¡Buenas tardes";
    subtitulo = "Sigue así, gran trabajo hoy ☀️";
  } else {
    saludo = "¡Buenas noches";
    subtitulo = "Revisa tus métricas y descansa 🌙";
  }

  const totalInmuebles = inmuebles.length;
  const seguimientosActivos = recordatorios.length;
  const valorTotal = inmuebles.reduce((acc, inm) => acc + inm.precio, 0);

  const formatValor = (val: number) => {
    if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(1).replace(/\.0$/, "")} Mil M`;
    if (val >= 10_000_000) return `$${Math.round(val / 1_000_000)}M`;
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    return `$0`;
  };

  return (
    <div className="page">
      {/* Header */}
      <header className="header">
        <div>
          <h1 className="header-title">{saludo}, Patricia!</h1>
          <p className="header-sub">{subtitulo}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <NotificationHeaderButton />
        </div>
      </header>

      {/* Banner activar notificaciones */}
      <NotificationBanner />

      {/* Mini Dashboard */}
      <section className="dashboard-stats">
        <Link href="/inmuebles" className="stat-card" style={{ textDecoration: "none" }}>
          <div className="stat-icon" style={{ background: "rgba(196,30,58,0.1)", color: "var(--red)" }}>
            <Building2 size={18} />
          </div>
          <div>
            <div className="stat-value">{isLoading ? "-" : totalInmuebles}</div>
            <div className="stat-label">Inmuebles</div>
          </div>
        </Link>
        <Link href="/clientes" className="stat-card" style={{ textDecoration: "none" }}>
          <div className="stat-icon" style={{ background: "rgba(251,191,36,0.1)", color: "#F59E0B" }}>
            <Bell size={18} />
          </div>
          <div>
            <div className="stat-value">{seguimientosActivos}</div>
            <div className="stat-label">Pendientes</div>
          </div>
        </Link>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(34,197,94,0.1)", color: "#22C55E" }}>
            <MessageSquareQuote size={18} />
          </div>
          <div>
            <div className="stat-value">{isLoading ? "-" : formatValor(valorTotal)}</div>
            <div className="stat-label">Portafolio</div>
          </div>
        </div>
      </section>

      {/* Hero / Perfil */}
      <a
        href={AGENTE_PATRICIA.urlPerfil}
        target="_blank"
        rel="noopener noreferrer"
        className="agent-hero"
        style={{ cursor: "pointer", textDecoration: "none" }}
      >
        <Image
          src={AGENTE_PATRICIA.foto}
          alt={AGENTE_PATRICIA.nombre}
          width={64}
          height={64}
          priority
          className="agent-avatar"
        />
        <div className="agent-info">
          <div className="agent-name">{AGENTE_PATRICIA.nombreCompleto}</div>
          <div className="agent-role">{AGENTE_PATRICIA.cargo}</div>
          <div className="agent-company">{AGENTE_PATRICIA.inmobiliaria}</div>
        </div>
        <ExternalLink size={20} color="var(--text-secondary)" />
      </a>

      {/* ─ Seguimientos para hoy ─ */}
      {recordatorios.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <div className="section-header">
            <h2 className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Bell size={18} color="var(--red)" />
              Seguimientos para hoy
            </h2>
            <span
              style={{
                fontSize: "12px",
                fontWeight: "700",
                color: "var(--red)",
                background: "var(--red-glow)",
                padding: "2px 8px",
                borderRadius: "20px",
              }}
            >
              {recordatorios.length}
            </span>
          </div>
          <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            {recordatorios.map((rec) => {
              const telefonoCompleto = `${(rec.telefonoIndicativo || "+57").replace(/\D/g, "")}${(rec.telefono || "").replace(/\D/g, "")}`;
              const fechaTexto = formatearFechaRecordatorio(rec.fechaRecordatorio);
              const esVencido = fechaTexto.includes("vencido");
              const inmuebleMatch = inmuebles.find(
                (i) => i.id === rec.inmuebleInteres || i.codigoDomus === rec.inmuebleInteres
              );

              return (
                <div key={rec.id} className="card" style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-primary)", textTransform: "capitalize" }}>
                          {rec.nombre.toLowerCase()}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            padding: "1px 6px",
                            borderRadius: 6,
                            background: esVencido ? "rgba(220,38,38,0.1)" : "rgba(217,119,6,0.1)",
                            color: esVencido ? "#dc2626" : "#b45309",
                          }}
                        >
                          {fechaTexto}
                        </span>
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: 3 }}>
                        {inmuebleMatch
                          ? `${inmuebleMatch.tipo} en ${inmuebleMatch.barrio} (Ref ${rec.inmuebleInteres})`
                          : `Ref: ${rec.inmuebleInteres}`}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCompletarRecordatorio(rec.id)}
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "var(--text-secondary)",
                        background: "var(--bg-base)",
                        border: "1px solid var(--border)",
                        borderRadius: "20px",
                        padding: "6px 12px",
                        minHeight: 34,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      ✓ Hecho
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setWaModalData({
                          cliente: {
                            id: rec.id,
                            nombre: rec.nombre,
                            telefono: rec.telefono,
                            telefonoIndicativo: rec.telefonoIndicativo,
                            email: "",
                            inmuebleInteres: rec.inmuebleInteres,
                            origen: "",
                            estado: "Seguimiento",
                            fecha: new Date().toISOString(),
                          } as Cliente,
                          tel: telefonoCompleto,
                          inmueble: inmuebleMatch,
                        });
                        setWaModalOpen(true);
                      }}
                      className="btn-ws"
                      style={{ flex: 1, fontSize: "13px", padding: "10px 12px" }}
                    >
                      <MessageCircle size={15} />
                      Contactar a {rec.nombre.split(" ")[0]}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Acciones Rápidas (con Link para prefetch instantáneo) */}
      <section className="quick-actions">
        <Link href="/whatsapp" className="qa-btn" style={{ textDecoration: "none" }}>
          <div className="qa-icon ws">
            <MessageCircle size={24} />
          </div>
          <div>
            <div className="qa-label">Ficha WhatsApp</div>
            <div className="qa-sub">Enviar rápido</div>
          </div>
        </Link>

        <Link href="/redes" className="qa-btn" style={{ textDecoration: "none" }}>
          <div className="qa-icon social">
            <Share2 size={24} />
          </div>
          <div>
            <div className="qa-label">Publicar Post</div>
            <div className="qa-sub">Facebook / IG</div>
          </div>
        </Link>

        <Link href="/inmuebles" className="qa-btn" style={{ textDecoration: "none" }}>
          <div className="qa-icon cat">
            <Building2 size={24} />
          </div>
          <div>
            <div className="qa-label">Catálogo L2L</div>
            <div className="qa-sub">Tus inmuebles</div>
          </div>
        </Link>

        <Link href="/respuestas" className="qa-btn" style={{ textDecoration: "none" }}>
          <div className="qa-icon" style={{ background: "rgba(124,58,237,0.1)", color: "#7C3AED" }}>
            <MessageSquareQuote size={24} />
          </div>
          <div>
            <div className="qa-label">Objeciones</div>
            <div className="qa-sub">Respuestas listas</div>
          </div>
        </Link>
      </section>

      {/* Recientes / Actividad */}
      <section>
        <div className="section-header">
          <h2 className="section-title">Novedades del portafolio</h2>
          <button
            type="button"
            onClick={() => mutate()}
            className="section-link"
            style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer" }}
          >
            <RefreshCw size={14} style={{ animation: isLoading ? "spin 1s linear infinite" : "none" }} />
            Actualizar
          </button>
        </div>

        {isLoading ? (
          <LoadingState text="Cargando novedades..." />
        ) : inmuebles.length > 0 ? (
          <div className="h-scroll">
            {inmuebles.slice(0, 5).map((inmueble) => (
              <PropCard
                key={inmueble.id}
                inmueble={inmueble}
                compact
                onClick={() => router.push(`/whatsapp?inmueble=${inmueble.id}`)}
              />
            ))}
            <Link
              href="/inmuebles"
              className="card"
              style={{
                width: 140,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 8,
                cursor: "pointer",
                color: "var(--text-secondary)",
                fontSize: 15,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  background: "var(--bg-card-hover)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                +
              </div>
              Ver todos
            </Link>
          </div>
        ) : (
          <EmptyState
            icon={<Building2 size={48} />}
            title="Sin inmuebles"
            description="No se encontraron inmuebles en tu perfil de L2L."
          />
        )}
      </section>

      {waModalOpen && waModalData && (
        <WhatsAppModal
          cliente={waModalData.cliente}
          tel={waModalData.tel}
          inmueble={waModalData.inmueble}
          defaultTemplateId="seguimiento"
          onClose={() => {
            setWaModalOpen(false);
            setWaModalData(null);
          }}
        />
      )}
    </div>
  );
}
