'use client';

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Clock, Calendar, CheckCircle2 } from "lucide-react";
import { collection, query, orderBy, onSnapshot, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Image from "next/image";

interface Interaccion {
  id: string;
  cliente_nombre: string;
  cliente_telefono: string;
  inmueble_id: string;
  inmueble_titulo: string;
  tipo_mensaje: string;
  fecha: any; // Firestore timestamp
}

export default function BitacoraPage() {
  const [interacciones, setInteracciones] = useState<Interaccion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "interacciones_ws"),
      orderBy("fecha", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Interaccion[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Interaccion);
      });
      setInteracciones(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const formatTiempo = (timestamp: any) => {
    if (!timestamp) return "Justo ahora";
    const date = timestamp.toDate();
    const ahora = new Date();
    const diff = ahora.getTime() - date.getTime();
    
    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(diff / 3600000);
    const dias = Math.floor(diff / 86400000);

    if (minutos < 60) return `Hace ${minutos} min`;
    if (horas < 24) return `Hace ${horas} h`;
    if (dias === 1) return "Ayer";
    
    return new Intl.DateTimeFormat('es-CO', {
      day: 'numeric', month: 'short'
    }).format(date);
  };

  const reanudarChat = (telefono: string) => {
    if (!telefono) return;
    const num = telefono.replace(/\D/g, "");
    window.open(`https://wa.me/${num}`, "_blank");
  };

  return (
    <div className="page" style={{ paddingBottom: 100 }}>
      <div className="header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="header-title">Centro de Control</h1>
          <p className="header-sub">Registro en tiempo real de interacciones</p>
        </div>
      </div>

      <div style={{ padding: "0 20px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
            <Clock size={24} style={{ animation: "spin 2s linear infinite", marginBottom: 12 }} />
            <p style={{ fontWeight: 600 }}>Sincronizando historial...</p>
          </div>
        ) : interacciones.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", background: "var(--bg-base)", borderRadius: 16, border: "1px dashed var(--border)" }}>
            <MessageCircle size={32} color="var(--text-muted)" style={{ margin: "0 auto 12px" }} />
            <p style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Tu bitácora está limpia</p>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
              Cuando uses el botón "Enviar WhatsApp" en un cliente, el registro aparecerá aquí.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <AnimatePresence>
              {interacciones.map((it, idx) => (
                <motion.div
                  key={it.id}
                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: Math.min(idx * 0.05, 0.5), type: "spring", stiffness: 300, damping: 25 }}
                  style={{
                    background: "var(--bg-card)",
                    borderRadius: 20,
                    padding: 16,
                    boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                    border: "1px solid var(--border)",
                    position: "relative",
                    overflow: "hidden"
                  }}
                >
                  {/* Borde verde lateral para indicar éxito */}
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: "#25D366" }} />

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                        {it.cliente_nombre.split(" ")[0]}
                        <CheckCircle2 size={14} color="#25D366" />
                      </h3>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, color: "var(--text-muted)", fontSize: 13, fontWeight: 500 }}>
                        <Clock size={13} />
                        {formatTiempo(it.fecha)}
                      </div>
                    </div>
                    <div style={{
                      background: "rgba(37,211,102,0.1)", color: "#1DA34D", padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 800
                    }}>
                      {it.tipo_mensaje}
                    </div>
                  </div>

                  {it.inmueble_id !== "sin-inmueble" && (
                    <div style={{ 
                      fontSize: 13, color: "var(--text-secondary)", marginBottom: 16, 
                      background: "var(--bg-base)", padding: "12px", borderRadius: 12,
                      display: "flex", alignItems: "center", gap: 10
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 8, background: "var(--border)",
                        display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0
                      }}>
                        {/* Como no tenemos la imagen directo, usamos emoji */}
                        <span style={{ fontSize: 18 }}>🏠</span>
                      </div>
                      <div style={{ fontWeight: 600, lineHeight: 1.3 }}>
                        {it.inmueble_titulo}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => reanudarChat(it.cliente_telefono)}
                    disabled={!it.cliente_telefono}
                    style={{
                      width: "100%", padding: "14px", borderRadius: 14,
                      background: it.cliente_telefono ? "#25D366" : "var(--bg-base)",
                      color: it.cliente_telefono ? "#fff" : "var(--text-muted)",
                      border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      fontWeight: 800, fontSize: 15, cursor: it.cliente_telefono ? "pointer" : "not-allowed",
                      boxShadow: it.cliente_telefono ? "0 4px 12px rgba(37,211,102,0.2)" : "none"
                    }}
                  >
                    <MessageCircle size={18} fill={it.cliente_telefono ? "#fff" : "none"} color={it.cliente_telefono ? "#25D366" : "var(--text-muted)"} />
                    Retomar conversación
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
