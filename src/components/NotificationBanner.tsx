'use client';
// src/components/NotificationBanner.tsx
// Banner + botón de estado persistente para notificaciones push

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellOff, X, Check, Zap } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export default function NotificationBanner() {
  const { permissionState, isSubscribed, isLoading, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);
  const [justActivated, setJustActivated] = useState(false);

  const handleActivar = async () => {
    await subscribe();
    setJustActivated(true);
    setTimeout(() => setJustActivated(false), 4000);
  };

  // No soportado
  if (permissionState === "unsupported") return null;

  // Permiso negado → mostrar aviso fijo pequeño
  if (permissionState === "denied") {
    return (
      <div style={{ margin: "0 20px 12px", padding: "10px 14px", borderRadius: 12, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", display: "flex", gap: 8, alignItems: "center" }}>
        <BellOff size={15} color="var(--red)" />
        <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          Notificaciones bloqueadas. Actívalas en Ajustes del navegador.
        </span>
      </div>
    );
  }

  // Ya suscrito → mostrar badge verde pequeño (o nada si fue recién activado)
  if (isSubscribed) {
    if (justActivated) {
      return (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          style={{ margin: "0 20px 12px", padding: "10px 14px", borderRadius: 12, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.2)", display: "flex", gap: 8, alignItems: "center" }}
        >
          <Check size={15} color="#16a34a" />
          <span style={{ fontSize: 14, color: "#16a34a", fontWeight: 600 }}>¡Notificaciones activadas! Revisa tu pantalla 🔔</span>
        </motion.div>
      );
    }
    // Si ya está suscrito y no es recién activado, mostrar botón pequeño en header (ver abajo)
    return null;
  }

  // Descartado → no mostrar el banner grande pero sí dejar re-activar desde header
  if (dismissed) return null;

  // Estado default/not-subscribed → mostrar banner completo
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        style={{ margin: "0 20px 16px" }}
      >
        <div style={{
          background: "linear-gradient(135deg, rgba(196,30,58,0.08) 0%, rgba(196,30,58,0.04) 100%)",
          border: "1px solid rgba(196,30,58,0.25)",
          borderRadius: "16px",
          padding: "16px",
          position: "relative",
        }}>
          <button
            onClick={() => setDismissed(true)}
            style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--text-muted)" }}
          >
            <X size={16} />
          </button>
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(196,30,58,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Bell size={20} color="var(--red)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)", marginBottom: 4 }}>
                Activa las notificaciones
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 12 }}>
                Te avisaremos cuando sea hora de hacer seguimiento a un cliente.
              </div>
              <button
                onClick={handleActivar}
                disabled={isLoading}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "8px",
                  padding: "10px 18px", borderRadius: "20px",
                  background: isLoading ? "var(--bg-card-hover)" : "var(--red)",
                  color: isLoading ? "var(--text-muted)" : "#fff",
                  border: "none", cursor: isLoading ? "not-allowed" : "pointer",
                  fontSize: "13px", fontWeight: "700", transition: "all 0.2s",
                }}
              >
                <Bell size={15} />
                {isLoading ? "Activando..." : "Activar notificaciones"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Componente separado: botón pequeño para el header cuando ya está suscrito
export function NotificationHeaderButton() {
  const { permissionState, isSubscribed, isLoading, subscribe } = usePushNotifications();

  if (permissionState === "unsupported" || permissionState === "denied") return null;

  return (
    <button
      onClick={subscribe}
      disabled={isLoading || isSubscribed}
      title={isSubscribed ? "Notificaciones activas" : "Activar notificaciones"}
      style={{
        background: isSubscribed ? "rgba(22,163,74,0.1)" : "rgba(196,30,58,0.1)",
        border: "none",
        borderRadius: "50%",
        width: 38,
        height: 38,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: isSubscribed ? "default" : "pointer",
        transition: "all 0.2s",
        flexShrink: 0,
      }}
    >
      <Bell
        size={18}
        color={isSubscribed ? "#16a34a" : "var(--red)"}
        fill={isSubscribed ? "rgba(22,163,74,0.3)" : "none"}
      />
    </button>
  );
}
// Botón pequeño de test — al lado de la campana, solo cuando ya está suscrito
export function TestNotifButton() {
  const { isSubscribed } = usePushNotifications();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!isSubscribed) return null;

  const handleTest = async () => {
    if (sending) return;
    setSending(true);
    try {
      await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Nuevo lead · Autoleads",
          body:  "Daniel M. · Ref 1046101",
          url:   "/clientes",
          waUrl: "https://wa.me/573143586609",
          tag:   "test-notif"
        }),
      });
      setSent(true);
      setTimeout(() => setSent(false), 2500);
    } finally {
      setSending(false);
    }
  };

  return (
    <button
      onClick={handleTest}
      title="Enviar notificación de prueba"
      style={{
        background: sent
          ? "rgba(22,163,74,0.12)"
          : sending
            ? "rgba(234,179,8,0.1)"
            : "rgba(196,30,58,0.08)",
        border: "none",
        borderRadius: "50%",
        width: 38,
        height: 38,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: sending ? "not-allowed" : "pointer",
        transition: "all 0.2s",
        flexShrink: 0,
      }}
    >
      {sent
        ? <Check size={16} color="#16a34a" />
        : <Zap size={16} color={sending ? "#eab308" : "var(--red)"} fill={sending ? "rgba(234,179,8,0.3)" : "none"} />
      }
    </button>
  );
}
