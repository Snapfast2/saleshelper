'use client';
// src/app/page.tsx

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { MessageCircle, Share2, Building2, ExternalLink, RefreshCw, Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import PropCard from "@/components/PropCard";
import { AGENTE_PATRICIA } from "@/lib/agente";
import type { Inmueble } from "@/types";
import { useInmuebles } from "@/hooks/useInmuebles";
import LoadingState from "@/components/LoadingState";
import EmptyState from "@/components/EmptyState";

export default function Home() {
  const router = useRouter();
  const { inmuebles, isLoading, mutate } = useInmuebles();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="page">
      {/* Header */}
      <header className="header">
        <div>
          <h1 className="header-title">¡Hola, Patricia!</h1>
          <p className="header-sub">¿Qué vamos a vender hoy?</p>
        </div>
      </header>

      {/* Hero / Perfil */}
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
          onClick={() => window.open(AGENTE_PATRICIA.urlPerfil, "_blank")}
        >
          <div className="qa-icon perfil">
            <ExternalLink size={24} />
          </div>
          <div>
            <div className="qa-label">Mi Vitrina</div>
            <div className="qa-sub">Página web L2L</div>
          </div>
        </motion.div>
      </motion.section>

      {/* Recientes */}
      <section>
        <div className="section-header">
          <h2 className="section-title">Añadidos recientemente</h2>
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
          <LoadingState text="Cargando inmuebles..." />
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
                fontSize: 13,
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

      {/* QR Code Section for Mobile Access */}
      <section style={{ padding: "20px 20px 40px", textAlign: "center" }}>
        <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-primary)", fontWeight: 600 }}>
            <Smartphone size={20} />
            Abre la app en tu celular
          </div>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 280, margin: "0 auto" }}>
            Conéctate al mismo WiFi y escanea este código con la cámara de tu celular.
          </p>
          <div style={{ background: "white", padding: 12, borderRadius: 12, display: "inline-block" }}>
            <QRCodeSVG value="http://192.168.1.3:3005" size={160} />
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
            http://192.168.1.3:3005
          </div>
        </div>
      </section>

      <style dangerouslySetInnerHTML={{ __html: `
        .spinner-icon { animation: spin 1s linear infinite; }
        @keyframes pulse {
          0% { opacity: 0.5; }
          50% { opacity: 0.8; }
          100% { opacity: 0.5; }
        }
      `}} />
    </div>
  );
}
