"use client";
import { useState, useEffect } from "react";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(b64);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return view;
}

export default function NotifBanner() {
  const [state, setState] = useState<"hidden" | "prompt" | "loading" | "done">("hidden");

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    if (Notification.permission === "denied") return;
    if (Notification.permission === "granted") {
      // ya tiene permiso — verificar si está suscrita
      fetch("/api/push/subscribe").then(r => r.json()).then(d => {
        if (!d.subscribed) setState("prompt");
      });
      return;
    }
    setState("prompt");
  }, []);

  async function activate() {
    setState("loading");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setState("prompt"); return; }

      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub }),
      });

      setState("done");
    } catch {
      setState("prompt");
    }
  }

  if (state === "hidden" || state === "done") return null;

  return (
    <div style={{
      margin: "0 0 16px 0",
      padding: "12px 16px",
      borderRadius: 14,
      background: "linear-gradient(135deg, rgba(196,30,58,0.12), rgba(139,0,0,0.08))",
      border: "1px solid rgba(196,30,58,0.25)",
      display: "flex",
      alignItems: "center",
      gap: 12,
    }}>
      <span style={{ fontSize: 22 }}>🔔</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
          Activa las notificaciones
        </div>
        <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
          Te avisamos cuando llegue un cliente nuevo
        </div>
      </div>
      <button
        onClick={activate}
        disabled={state === "loading"}
        style={{
          padding: "8px 14px",
          borderRadius: 10,
          border: "none",
          background: state === "loading" ? "rgba(196,30,58,0.3)" : "var(--red)",
          color: "#fff",
          fontSize: 12,
          fontWeight: 700,
          cursor: state === "loading" ? "not-allowed" : "pointer",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        {state === "loading" ? "..." : "Activar"}
      </button>
    </div>
  );
}
