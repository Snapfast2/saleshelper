'use client';
// src/app/push-test/page.tsx
// Página de diagnóstico de push notifications — abre esto desde Android para debuggear
// Abre chrome://inspect/#service-workers en PC para ver los logs del SW

import { useState, useEffect } from "react";

interface Step {
  label: string;
  status: "pending" | "ok" | "error" | "warn";
  detail?: string;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const out = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) out[i] = rawData.charCodeAt(i);
  return out;
}

const ICON: Record<Step["status"], string> = {
  pending: "⏳",
  ok: "✅",
  error: "❌",
  warn: "⚠️",
};

export default function PushTestPage() {
  const [steps, setSteps] = useState<Step[]>([
    { label: "Service Workers soportados", status: "pending" },
    { label: "Notifications soportadas", status: "pending" },
    { label: "Registrar /sw.js", status: "pending" },
    { label: "Permiso de notificaciones", status: "pending" },
    { label: "Crear suscripción push", status: "pending" },
    { label: "Guardar en servidor", status: "pending" },
    { label: "Enviar notificación de prueba", status: "pending" },
  ]);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) => setLog((l) => [...l, `${new Date().toLocaleTimeString()} ${msg}`]);

  const setStep = (i: number, status: Step["status"], detail?: string) => {
    setSteps((s) => s.map((step, idx) => idx === i ? { ...step, status, detail } : step));
  };

  const runTest = async () => {
    setRunning(true);
    setLog([]);
    setSteps((s) => s.map((step) => ({ ...step, status: "pending", detail: undefined })));

    // 1. Service Workers
    addLog("Verificando soporte de Service Workers...");
    if (!("serviceWorker" in navigator)) {
      setStep(0, "error", "No soportado en este navegador");
      setRunning(false);
      return;
    }
    setStep(0, "ok", "Soportado");

    // 2. Notifications API
    addLog("Verificando Notifications API...");
    if (!("Notification" in window)) {
      setStep(1, "error", "Notifications API no disponible");
      setRunning(false);
      return;
    }
    setStep(1, "ok", `Permiso actual: ${Notification.permission}`);

    // 3. Registrar SW
    addLog("Registrando /sw.js...");
    let reg: ServiceWorkerRegistration;
    try {
      reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      addLog(`SW registrado: ${reg.scope}`);
      setStep(2, "ok", `Scope: ${reg.scope} | Estado: ${reg.active ? "activo" : reg.installing ? "instalando" : "en espera"}`);
    } catch (err: any) {
      setStep(2, "error", err.message);
      setRunning(false);
      return;
    }

    // 4. Pedir permiso
    addLog("Solicitando permiso de notificaciones...");
    let permission: NotificationPermission;
    try {
      permission = await Notification.requestPermission();
      addLog(`Permiso: ${permission}`);
      if (permission !== "granted") {
        setStep(3, "error", `Permiso: ${permission} — debes tocar "Permitir"`);
        setRunning(false);
        return;
      }
      setStep(3, "ok", "Permiso concedido ✓");
    } catch (err: any) {
      setStep(3, "error", err.message);
      setRunning(false);
      return;
    }

    // 5. Crear suscripción
    addLog("Creando suscripción push...");
    let subscription: PushSubscription;
    try {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      addLog(`VAPID key: ${vapidKey ? vapidKey.slice(0, 20) + "..." : "NO CONFIGURADA ❌"}`);
      if (!vapidKey) {
        setStep(4, "error", "NEXT_PUBLIC_VAPID_PUBLIC_KEY no configurada");
        setRunning(false);
        return;
      }
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      const endpoint = subscription.endpoint;
      addLog(`Endpoint: ...${endpoint.slice(-40)}`);
      setStep(4, "ok", `Endpoint: ...${endpoint.slice(-30)}`);
    } catch (err: any) {
      setStep(4, "error", err.message);
      addLog(`ERROR suscripción: ${err.message}`);
      setRunning(false);
      return;
    }

    // 6. Guardar en servidor
    addLog("Guardando suscripción en el servidor...");
    try {
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription }),
      });
      const data = await res.json();
      addLog(`Servidor respondió: ${JSON.stringify(data)}`);
      if (!res.ok) throw new Error(JSON.stringify(data));
      setStep(5, "ok", "Guardado en servidor ✓");
    } catch (err: any) {
      setStep(5, "error", err.message);
      setRunning(false);
      return;
    }

    // 7. Enviar notificación de prueba
    addLog("Enviando notificación de prueba...");
    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "🎉 ¡Funciona en Android!",
          body: "Las notificaciones push están activas en tu celular.",
          url: "/",
          tag: "test-android",
        }),
      });
      const data = await res.json();
      addLog(`Push enviado: ${JSON.stringify(data)}`);
      if (!res.ok) throw new Error(JSON.stringify(data));
      setStep(6, "ok", "Notificación enviada — deberías verla en 3-5 segundos");
    } catch (err: any) {
      setStep(6, "error", err.message);
    }

    setRunning(false);
  };

  return (
    <div style={{ padding: "24px 20px 120px", maxWidth: 480, margin: "0 auto" }}>
      <h1 style={{ fontSize: "20px", fontWeight: "800", marginBottom: 4, color: "var(--text-primary)" }}>
        🔔 Diagnóstico Push
      </h1>
      <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: 24 }}>
        Toca el botón desde Android para ver qué está fallando paso a paso.
      </p>

      <button
        onClick={runTest}
        disabled={running}
        style={{
          width: "100%",
          padding: "14px",
          borderRadius: "14px",
          background: running ? "var(--bg-card-hover)" : "var(--red)",
          color: running ? "var(--text-muted)" : "#fff",
          border: "none",
          fontSize: "15px",
          fontWeight: "700",
          cursor: running ? "not-allowed" : "pointer",
          marginBottom: 24,
        }}
      >
        {running ? "Ejecutando diagnóstico..." : "▶ Ejecutar diagnóstico completo"}
      </button>

      {/* Pasos */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {steps.map((step, i) => (
          <div key={i} style={{
            padding: "12px 16px",
            borderRadius: "12px",
            background: step.status === "ok" ? "rgba(22,163,74,0.06)" : step.status === "error" ? "rgba(220,38,38,0.06)" : "var(--bg-card)",
            border: `1px solid ${step.status === "ok" ? "rgba(22,163,74,0.2)" : step.status === "error" ? "rgba(220,38,38,0.2)" : "var(--border)"}`,
          }}>
            <div style={{ fontSize: "14px", fontWeight: "600", display: "flex", gap: 8, alignItems: "center" }}>
              <span>{ICON[step.status]}</span>
              <span style={{ color: "var(--text-primary)" }}>{step.label}</span>
            </div>
            {step.detail && (
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: 4, marginLeft: 26, fontFamily: "monospace", wordBreak: "break-all" }}>
                {step.detail}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Log */}
      {log.length > 0 && (
        <div style={{
          background: "#0f172a",
          borderRadius: "12px",
          padding: "12px",
          maxHeight: 250,
          overflow: "auto",
        }}>
          <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "700", marginBottom: 8 }}>LOG TÉCNICO</div>
          {log.map((line, i) => (
            <div key={i} style={{ fontSize: "11px", color: "#e2e8f0", fontFamily: "monospace", marginBottom: 4 }}>
              {line}
            </div>
          ))}
        </div>
      )}

      {/* Guía de solución */}
      <div style={{ marginTop: 28 }}>
        <div style={{ fontSize: "13px", fontWeight: "800", color: "var(--text-primary)", marginBottom: 12 }}>
          🛠️ Si no llega la notificación
        </div>

        {[
          {
            emoji: "📱",
            title: "1. Revisar permisos del sistema Android",
            detail: "Ajustes → Aplicaciones → Chrome → Notificaciones → Activar todas",
          },
          {
            emoji: "🔔",
            title: "2. Revisar permiso en Chrome (Android)",
            detail: "Chrome → ⋮ → Configuración → Notificaciones → saleshelper-patricia.vercel.app → Permitir",
          },
          {
            emoji: "💾",
            title: "3. Si está instalada como app (PWA)",
            detail: "Ajustes → Aplicaciones → SalesHelper (o Patricia) → Notificaciones → Activar",
          },
          {
            emoji: "🖥️",
            title: "4. Debug avanzado (PC + cable USB)",
            detail: "Conecta el cel al PC → abre chrome://inspect/#service-workers → verás los logs [SW] en tiempo real",
          },
        ].map((item, i) => (
          <div key={i} style={{
            padding: "12px 14px",
            borderRadius: "10px",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            marginBottom: 8,
          }}>
            <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)" }}>
              {item.emoji} {item.title}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: 4 }}>
              {item.detail}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
