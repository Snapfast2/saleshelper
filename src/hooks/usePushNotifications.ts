"use client";
// src/hooks/usePushNotifications.ts
// Gestiona suscripción a Web Push Notifications usando /sw.js en public/

import { useState, useEffect, useCallback } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

type PermissionState = "default" | "granted" | "denied" | "unsupported";

export function usePushNotifications() {
  const [permissionState, setPermissionState] = useState<PermissionState>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Registrar el SW al montar
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) {
      setPermissionState("unsupported");
      return;
    }
    if (!("Notification" in window)) {
      setPermissionState("unsupported");
      return;
    }

    setPermissionState(Notification.permission as PermissionState);

    // Registrar /sw.js (sirve directamente desde public/)
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        setSwRegistration(reg);
        console.log("[SW] Registrado:", reg.scope);
        // Verificar si ya existe suscripción activa
        return reg.pushManager.getSubscription();
      })
      .then((sub) => {
        if (sub) {
          setIsSubscribed(true);
          setPermissionState("granted");
        }
      })
      .catch((err) => {
        console.error("[SW] Error al registrar:", err);
      });
  }, []);

  const subscribe = useCallback(async () => {
    if (!swRegistration) {
      console.error("[Push] SW no registrado aún");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Pedir permiso
      const permission = await Notification.requestPermission();
      setPermissionState(permission as PermissionState);

      if (permission !== "granted") {
        setIsLoading(false);
        return;
      }

      // 2. Suscribir al push manager
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      const subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      // 3. Guardar suscripción en el servidor
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription }),
      });

      if (!res.ok) throw new Error("Error al guardar suscripción");

      setIsSubscribed(true);
      console.log("[Push] Suscripción guardada ✅");

      // 4. Enviar notificación de prueba inmediata
      await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "¡SalesHelper activado! 🔔",
          body: "Recibirás recordatorios de seguimiento aquí.",
          url: "/",
          tag: "test",
        }),
      });
    } catch (err) {
      console.error("[Push] Error al suscribir:", err);
    } finally {
      setIsLoading(false);
    }
  }, [swRegistration]);

  // Revisar recordatorios pendientes al cargar
  const checkReminders = useCallback(async () => {
    if (!isSubscribed) return;
    try {
      await fetch("/api/push/check-reminders");
    } catch (_) {}
  }, [isSubscribed]);

  return {
    permissionState,
    isSubscribed,
    isLoading,
    subscribe,
    checkReminders,
  };
}
