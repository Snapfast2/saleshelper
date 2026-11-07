'use client';
// src/components/NotificationBanner.tsx
// Banner compacto + botón de estado persistente para notificaciones push

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

  if (permissionState === "unsupported") return null;

  if (permissionState === "denied") {
    return (
      <div
        style={{
          margin: "0 20px 10px",
          padding: "8px 12px",
          borderRadius: 11,
          background: "rgba(220, 38, 38, 0.06)",
          border: "1px solid rgba(220, 38, 38, 0.16)",
          display: "flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        <BellOff size={14} color="var(--red)" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
          Notificaciones bloqueadas en Ajustes del navegador.
        </span>
      </div>
    );
  }

  if (isSubscribed) {
    if (justActivated) {
      return (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          style={{
            margin: "0 20px 10px",
            padding: "8px 12px",
            borderRadius: 11,
            background: "rgba(22, 163, 74, 0.08)",
            border: "1px solid rgba(22, 163, 74, 0.2)",
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <Check size={14} color="#16a34a" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12.5, color: "#16a34a", fontWeight: 600 }}>
            Notificaciones activas en este dispositivo
          </span>
        </motion.div>
      );
    }
    return null;
  }

  if (dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        style={{ margin: "0 20px 10px" }}
      >
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid rgba(184, 15, 18, 0.24)",
            borderRadius: 12,
            padding: "9px 10px 9px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: "rgba(184, 15, 18, 0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Bell size={15} color="var(--red)" />
            </div>
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: "var(--text-primary)",
                lineHeight: 1.25,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              Activa alertas de clientes y citas
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            <button
              type="button"
              onClick={handleActivar}
              disabled={isLoading}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                background: isLoading ? "var(--bg-card-hover)" : "var(--red)",
                color: isLoading ? "var(--text-muted)" : "#fff",
                border: "none",
                cursor: isLoading ? "not-allowed" : "pointer",
                fontSize: 12,
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              {isLoading ? "..." : "Activar"}
            </button>
            <button
              type="button"
              aria-label="Cerrar aviso de notificaciones"
              onClick={() => setDismissed(true)}
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Botón compacto para la barra superior
export function NotificationHeaderButton() {
  const { permissionState, isSubscribed, isLoading, subscribe } = usePushNotifications();

  if (permissionState === "unsupported" || permissionState === "denied") return null;

  const label = isSubscribed ? "Notificaciones activas" : "Activar notificaciones";

  return (
    <button
      type="button"
      onClick={subscribe}
      disabled={isLoading || isSubscribed}
      title={label}
      aria-label={label}
      style={{
        background: isSubscribed ? "rgba(22, 163, 74, 0.08)" : "var(--bg-card)",
        border: isSubscribed
          ? "1px solid rgba(22, 163, 74, 0.22)"
          : "1px solid var(--border)",
        borderRadius: "50%",
        width: 34,
        height: 34,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: isSubscribed ? "default" : "pointer",
        transition: "all 0.18s",
        flexShrink: 0,
      }}
    >
      <Bell
        size={15}
        color={isSubscribed ? "#16a34a" : "var(--red)"}
        fill={isSubscribed ? "rgba(22, 163, 74, 0.25)" : "none"}
      />
    </button>
  );
}

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
          title: "Nuevo lead · Prueba App",
          body: "Cliente Prueba · Ref 123456",
          url: "/clientes",
          waUrl: "https://wa.me/573182934712",
          tag: "test-notif",
          actions: [{ action: "ver-cliente", title: "Ver Cliente" }],
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
      type="button"
      onClick={handleTest}
      title="Enviar notificación de prueba"
      aria-label="Enviar notificación de prueba"
      style={{
        background: sent
          ? "rgba(22, 163, 74, 0.12)"
          : sending
            ? "rgba(234, 179, 8, 0.1)"
            : "rgba(184, 15, 18, 0.08)",
        border: "none",
        borderRadius: "50%",
        width: 34,
        height: 34,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: sending ? "not-allowed" : "pointer",
        transition: "all 0.2s",
        flexShrink: 0,
      }}
    >
      {sent ? (
        <Check size={15} color="#16a34a" />
      ) : (
        <Zap
          size={15}
          color={sending ? "#eab308" : "var(--red)"}
          fill={sending ? "rgba(234, 179, 8, 0.3)" : "none"}
        />
      )}
    </button>
  );
}
