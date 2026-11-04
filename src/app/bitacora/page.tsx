'use client';

import React, { useEffect, useState } from "react";
import { MessageCircle, Clock, CheckCircle2 } from "lucide-react";
import { getFirestoreDb } from "@/lib/firebase";

interface Interaccion {
  id: string;
  cliente_nombre: string;
  cliente_telefono: string;
  inmueble_id: string;
  inmueble_titulo: string;
  tipo_mensaje: string;
  fecha: any;
}

export default function BitacoraPage() {
  const [interacciones, setInteracciones] = useState<Interaccion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      const [db, { collection, query, orderBy, onSnapshot, limit }] = await Promise.all([
        getFirestoreDb(),
        import("firebase/firestore"),
      ]);
      if (cancelled) return;
      if (!db) {
        setLoading(false);
        return;
      }

      const q = query(
        collection(db, "interacciones_ws"),
        orderBy("fecha", "desc"),
        limit(50)
      );

      unsub = onSnapshot(
        q,
        (snapshot) => {
          const data: Interaccion[] = [];
          snapshot.forEach((doc) => {
            data.push({ id: doc.id, ...doc.data() } as Interaccion);
          });
          setInteracciones(data);
          setLoading(false);
        },
        () => setLoading(false)
      );
    })();

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, []);

  const formatTiempo = (timestamp: any) => {
    if (!timestamp?.toDate) return "Justo ahora";
    const date = timestamp.toDate();
    const ahora = new Date();
    const diff = ahora.getTime() - date.getTime();

    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(diff / 3600000);
    const dias = Math.floor(diff / 86400000);

    if (minutos < 1) return "Justo ahora";
    if (minutos < 60) return `Hace ${minutos} min`;
    if (horas < 24) return `Hace ${horas} h`;
    if (dias === 1) return "Ayer";

    return new Intl.DateTimeFormat("es-CO", {
      day: "numeric",
      month: "short",
    }).format(date);
  };

  const formatNombreLegible = (raw: string) => {
    const parts = (raw || "Cliente").trim().split(/\s+/);
    return parts.slice(0, 2).join(" ");
  };

  const reanudarChat = (telefono: string) => {
    if (!telefono) return;
    let num = telefono.replace(/\D/g, "");
    if (num.length === 10 && num.startsWith("3")) {
      num = `57${num}`;
    }
    window.open(`https://wa.me/${num}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="page" style={{ paddingBottom: 100 }}>
      <div className="header" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="header-title">Historial</h1>
          <p className="header-sub">Registro en tiempo real de envíos por WhatsApp</p>
        </div>
      </div>

      <div style={{ padding: "0 20px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
            <Clock size={24} style={{ animation: "spin 2s linear infinite", marginBottom: 12 }} />
            <p style={{ fontWeight: 600 }}>Sincronizando historial...</p>
          </div>
        ) : interacciones.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              background: "var(--bg-base)",
              borderRadius: 16,
              border: "1px dashed var(--border)",
            }}
          >
            <MessageCircle size={32} color="var(--text-muted)" style={{ margin: "0 auto 12px" }} />
            <p style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Tu historial está limpio</p>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
              Cuando envíes un mensaje de WhatsApp a un cliente, aparecerá aquí automáticamente.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {interacciones.map((it) => (
              <div
                key={it.id}
                style={{
                  background: "var(--bg-card)",
                  borderRadius: 18,
                  padding: 16,
                  boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                  border: "1px solid var(--border)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: "#25D366" }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <h3
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: "var(--text-primary)",
                        margin: 0,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        textTransform: "capitalize",
                      }}
                    >
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {formatNombreLegible(it.cliente_nombre).toLowerCase()}
                      </span>
                      <CheckCircle2 size={14} color="#25D366" style={{ flexShrink: 0 }} />
                    </h3>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginTop: 4,
                        color: "var(--text-muted)",
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                    >
                      <Clock size={13} />
                      {formatTiempo(it.fecha)}
                    </div>
                  </div>
                  <div
                    style={{
                      background: "rgba(37,211,102,0.1)",
                      color: "#15803d",
                      padding: "5px 10px",
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {it.tipo_mensaje}
                  </div>
                </div>

                {it.inmueble_id !== "sin-inmueble" && (
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--text-secondary)",
                      marginBottom: 12,
                      background: "var(--bg-base)",
                      padding: "10px 12px",
                      borderRadius: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <span style={{ fontSize: 16, flexShrink: 0 }}>🏠</span>
                    <div style={{ fontWeight: 600, lineHeight: 1.3 }}>{it.inmueble_titulo}</div>
                  </div>
                )}

                <button
                  onClick={() => reanudarChat(it.cliente_telefono)}
                  disabled={!it.cliente_telefono}
                  style={{
                    width: "100%",
                    minHeight: 44,
                    padding: "11px 14px",
                    borderRadius: 12,
                    background: it.cliente_telefono ? "#25D366" : "var(--bg-base)",
                    color: it.cliente_telefono ? "#fff" : "var(--text-muted)",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: it.cliente_telefono ? "pointer" : "not-allowed",
                  }}
                >
                  <MessageCircle size={17} />
                  Retomar conversación
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
