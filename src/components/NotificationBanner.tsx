'use client';
// src/components/NotificationBanner.tsx
// Banner que aparece en el Home para activar las notificaciones push

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export default function NotificationBanner() {
  const { permissionState, isSubscribed, isLoading, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);

  // No mostrar si ya está suscrito, si el permiso fue negado, o si descartaron el banner
  if (isSubscribed || dismissed) return null;
  if (permissionState === "denied" || permissionState === "unsupported") return null;

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
          border: "1px solid var(--border-red)",
          borderRadius: "16px",
          padding: "16px",
          position: "relative",
        }}>
          {/* Botón cerrar */}
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
                Te avisaremos cuando sea hora de hacer seguimiento a un cliente, aunque tengas la app cerrada.
              </div>
              <button
                onClick={subscribe}
                disabled={isLoading}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 18px",
                  borderRadius: "20px",
                  background: isLoading ? "var(--bg-card-hover)" : "var(--red)",
                  color: isLoading ? "var(--text-muted)" : "#fff",
                  border: "none",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  fontSize: "13px",
                  fontWeight: "700",
                  transition: "all 0.2s",
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
