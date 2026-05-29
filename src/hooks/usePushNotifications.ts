'use client';
// src/hooks/usePushNotifications.ts
// Hook para solicitar permiso, suscribirse a push y verificar el estado

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

  // Verificar el estado actual de permisos y suscripción
  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermissionState("unsupported");
      return;
    }
    setPermissionState(Notification.permission as PermissionState);

    // Verificar si ya estamos suscritos
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub);
      });
    }).catch(() => {});
  }, []);

  // Solicitar permiso y suscribirse
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return false;

    setIsLoading(true);
    try {
      // 1. Pedir permiso al usuario
      const permission = await Notification.requestPermission();
      setPermissionState(permission as PermissionState);
      if (permission !== "granted") {
        setIsLoading(false);
        return false;
      }

      // 2. Esperar el service worker y suscribirse
      const reg = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      // 3. Enviar la suscripción al servidor
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription }),
      });

      if (res.ok) {
        setIsSubscribed(true);
        setIsLoading(false);
        return true;
      }
    } catch (err) {
      console.error("[usePushNotifications] Error al suscribirse:", err);
    }

    setIsLoading(false);
    return false;
  }, []);

  // Verificar recordatorios pendientes en el servidor (llamar al abrir la app)
  const checkReminders = useCallback(async () => {
    try {
      await fetch("/api/push/check-reminders");
    } catch (_) {}
  }, []);

  // Enviar una notificación de prueba
  const sendTest = useCallback(async () => {
    try {
      await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "🏠 SalesHelper funciona!",
          body: "Las notificaciones push están activas en tu celular ✅",
          url: "/",
          tag: "test",
        }),
      });
    } catch (err) {
      console.error("[usePushNotifications] Error en prueba:", err);
    }
  }, []);

  return {
    permissionState,
    isSubscribed,
    isLoading,
    subscribe,
    checkReminders,
    sendTest,
    isSupported: permissionState !== "unsupported",
  };
}
