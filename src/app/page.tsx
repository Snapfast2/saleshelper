'use client';
// src/app/page.tsx

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Share2, Building2, ExternalLink, RefreshCw, MessageSquareQuote, Bell } from "lucide-react";

import PropCard from "@/components/PropCard";
import { AGENTE_PATRICIA } from "@/lib/agente";
import { useInmuebles } from "@/hooks/useInmuebles";
import LoadingState from "@/components/LoadingState";
import EmptyState from "@/components/EmptyState";
import { getRecordatoriosPendientes, marcarCompletado, generarMensajeSeguimiento, type Recordatorio } from "@/lib/recordatorios";
import NotificationBanner, { NotificationHeaderButton, TestNotifButton } from "@/components/NotificationBanner";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import WhatsAppModal from "@/components/WhatsAppModal";
import type { Cliente } from "@/types";

export default function Home() {
  const router = useRouter();
  const { inmuebles, isLoading, mutate } = useInmuebles();
  const [recordatorios, setRecordatorios] = useState<Recordatorio[]>([]);
  const { isSubscribed, checkReminders } = usePushNotifications();
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [waModalData, setWaModalData] = useState<{ cliente: Cliente, tel: string } | null>(null);

  // Cargar recordatorios pendientes al abrir la app
  useEffect(() => {
    setRecordatorios(getRecordatoriosPendientes());
  }, []);

  // Verificar recordatorios vencidos solo cuando ya sabemos que está suscrito
  useEffect(() => {
    if (!isSubscribed) return;
    checkReminders();
  }, [isSubscribed]);

  const handleCompletarRecordatorio = (id: string) => {
    marcarCompletado(id);
    setRecordatorios(getRecordatoriosPendientes());
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0 },
  };

  // --- Lógica Dinámica ---
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

  // Cálculos para Dashboard
  const totalInmuebles = inmuebles.length;
  const seguimientosActivos = recordatorios.length;
  const valorTotal = inmuebles.reduce((acc, inm) => acc + inm.precio, 0);
  
  // Función helper para formatear valor del portafolio (reusando lógica probada)
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
          <TestNotifButton />
          <NotificationHeaderButton />
        </div>
      </header>

      {/* Banner activar notificaciones */}
      <NotificationBanner />

      {/* Mini Dashboard */}
      <section className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(196,30,58,0.1)", color: "var(--red)" }}>
            <Building2 size={18} />
          </div>
          <div>
            <div className="stat-value">{isLoading ? "-" : totalInmuebles}</div>
            <div className="stat-label">Inmuebles</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(251,191,36,0.1)", color: "#F59E0B" }}>
            <Bell size={18} />
          </div>
          <div>
            <div className="stat-value">{seguimientosActivos}</div>
            <div className="stat-label">Pendientes</div>
          </div>
        </div>
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

      {/* Hero / Perfil (Glassmorphism) */}
      <motion.div
        className="agent-hero"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        onClick={() => window.open(AGENTE_PATRICIA.urlPerfil, "_blank")}
        style={{ cursor: "pointer" }}
      >
        <img
          src={AGENTE_PATRICIA.foto}
          alt={AGENTE_PATRICIA.nombre}
          className="agent-avatar"
        />
        <div className="agent-info">
          <div className="agent-name">{AGENTE_PATRICIA.nombreCompleto}</div>
          <div className="agent-role">{AGENTE_PATRICIA.cargo}</div>
          <div className="agent-company">{AGENTE_PATRICIA.inmobiliaria}</div>
        </div>
        <ExternalLink size={20} color="var(--text-secondary)" />
      </motion.div>

      {/* ─ Seguimientos para hoy ─ */}
      {recordatorios.length > 0 && (
        <section>
          <div className="section-header">
            <h2 className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Bell size={18} color="var(--red)" />
              Seguimientos para hoy
            </h2>
            <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--red)", background: "var(--red-glow)", padding: "2px 8px", borderRadius: "20px" }}>
              {recordatorios.length}
            </span>
          </div>
          <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            {recordatorios.map((rec) => {
              const telefonoCompleto = `${rec.telefonoIndicativo.replace(/\D/g, "")}${rec.telefono.replace(/\D/g, "")}`;

              return (
                <motion.div
                  key={rec.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="card"
                  style={{ padding: "14px 16px" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-primary)", textTransform: "capitalize" }}>
                        {rec.nombre.toLowerCase()}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: 2 }}>
                        Ref: {rec.inmuebleInteres} · Seguimiento pendiente
                      </div>
                    </div>
                    <button
                      onClick={() => handleCompletarRecordatorio(rec.id)}
                      style={{ fontSize: "11px", color: "var(--text-muted)", background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: "20px", padding: "4px 10px", cursor: "pointer", whiteSpace: "nowrap" }}
                    >
                      ✓ Hecho
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => {
                        setWaModalData({
                          cliente: {
                            id: rec.id,
                            nombre: rec.nombre,
                            telefono: rec.telefono,
                            telefonoIndicativo: rec.telefonoIndicativo,
                            email: "",
                            inmuebleInteres: rec.inmuebleInteres,
                            presupuesto: "",
                            origen: "",
                            estado: "Seguimiento",
                            fecha: new Date().toISOString()
                          } as Cliente,
                          tel: telefonoCompleto
                        });
                        setWaModalOpen(true);
                      }}
                      className="btn-ws"
                      style={{ flex: 1, fontSize: "12px", padding: "9px 12px" }}
                    >
                      <MessageCircle size={14} />
                      Contactar a {rec.nombre.split(" ")[0]}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* Acciones Rápidas */}
      <motion.section
        className="quick-actions"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <motion.div
          className="qa-btn"
          variants={itemVariants}
          onClick={() => router.push("/whatsapp")}
        >
          <div className="qa-icon ws">
            <MessageCircle size={24} />
          </div>
          <div>
            <div className="qa-label">Ficha WhatsApp</div>
            <div className="qa-sub">Enviar rápido</div>
          </div>
        </motion.div>

        <motion.div
          className="qa-btn"
          variants={itemVariants}
          onClick={() => router.push("/redes")}
        >
          <div className="qa-icon social">
            <Share2 size={24} />
          </div>
          <div>
            <div className="qa-label">Publicar Post</div>
            <div className="qa-sub">Facebook / IG</div>
          </div>
        </motion.div>

        <motion.div
          className="qa-btn"
          variants={itemVariants}
          onClick={() => router.push("/inmuebles")}
        >
          <div className="qa-icon cat">
            <Building2 size={24} />
          </div>
          <div>
            <div className="qa-label">Catálogo L2L</div>
            <div className="qa-sub">Tus inmuebles</div>
          </div>
        </motion.div>

        <motion.div
          className="qa-btn"
          variants={itemVariants}
          onClick={() => router.push("/respuestas")}
        >
          <div className="qa-icon" style={{ background: "rgba(124,58,237,0.1)", color: "#7C3AED" }}>
            <MessageSquareQuote size={24} />
          </div>
          <div>
            <div className="qa-label">Objeciones</div>
            <div className="qa-sub">Respuestas listas</div>
          </div>
        </motion.div>
      </motion.section>

      {/* Recientes / Actividad */}
      <section>
        <div className="section-header">
          <h2 className="section-title">Novedades del portafolio</h2>
          <button
            onClick={() => mutate()}
            className="section-link"
            style={{ display: "flex", alignItems: "center", gap: 4 }}
          >
            <RefreshCw size={14} className={isLoading ? "spinner-icon" : ""} />
            Actualizar
          </button>
        </div>

        {isLoading ? (
          <LoadingState text="Cargando novedades..." />
        ) : inmuebles.length > 0 ? (
          <motion.div
            className="h-scroll"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {inmuebles.slice(0, 5).map((inmueble) => (
              <PropCard
                key={inmueble.id}
                inmueble={inmueble}
                compact
                onClick={() =>
                  router.push(`/whatsapp?inmueble=${inmueble.id}`)
                }
              />
            ))}
            <div
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
              }}
              onClick={() => router.push("/inmuebles")}
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
            </div>
          </motion.div>
        ) : (
          <EmptyState
            icon={<Building2 size={48} />}
            title="Sin inmuebles"
            description="No se encontraron inmuebles en tu perfil de L2L."
          />
        )}
      </section>


      <style dangerouslySetInnerHTML={{ __html: `
        .spinner-icon { animation: spin 1s linear infinite; }
        @keyframes pulse {
          0% { opacity: 0.5; }
          50% { opacity: 0.8; }
          100% { opacity: 0.5; }
        }
      `}} />

      {waModalOpen && waModalData && (
        <WhatsAppModal
          cliente={waModalData.cliente}
          tel={waModalData.tel}
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
