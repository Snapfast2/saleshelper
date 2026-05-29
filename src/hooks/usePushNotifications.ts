"use client";
// src/hooks/usePushNotifications.ts
// Gestiona suscripción a Web Push Notifications usando /sw.js en public/

import { useState, useEffect, useCallback, useRef } from "react";

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
  const regRef = useRef<ServiceWorkerRegistration | null>(null);

  // Registrar el SW al montar
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("Notification" in window) || !("PushManager" in window)) {
      setPermissionState("unsupported");
      return;
    }

    setPermissionState(Notification.permission as PermissionState);

    // Registrar /sw.js — waitUntil active before using pushManager
    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

        // Esperar a que el SW esté activo (puede ser primera instalación)
        if (reg.installing) {
          await new Promise<void>((resolve) => {
            reg.installing!.addEventListener("statechange", (e) => {
              if ((e.target as ServiceWorker).state === "activated") resolve();
            });
          });
        }

        // Asegurarse de que navigator.serviceWorker.ready está listo
        const readyReg = await navigator.serviceWorker.ready;
        regRef.current = readyReg;

        // Verificar si ya hay suscripción activa
        const sub = await readyReg.pushManager.getSubscription();
        if (sub) {
          setIsSubscribed(true);
          setPermissionState("granted");
        }
      } catch (err) {
        console.error("[SW] Error al registrar:", err);
      }
    };

    register();
  }, []);

  const subscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      // Asegurarse de tener el registro del SW
      let reg = regRef.current;
      if (!reg) {
        reg = await navigator.serviceWorker.ready;
        regRef.current = reg;
      }

      // 1. Pedir permiso
      const permission = await Notification.requestPermission();
      setPermissionState(permission as PermissionState);
      if (permission !== "granted") {
        setIsLoading(false);
        return;
      }

      // 2. Eliminar suscripción anterior si existe
      const oldSub = await reg.pushManager.getSubscription();
      if (oldSub) await oldSub.unsubscribe();

      // 3. Crear nueva suscripción
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      // 4. Guardar en servidor
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription }),
      });
      if (!res.ok) throw new Error("Error al guardar suscripción");

      setIsSubscribed(true);
      console.log("[Push] Suscripción guardada ✅");

      // 5. Notificación de prueba con pequeño delay para que el server la procese
      await new Promise((r) => setTimeout(r, 800));
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
      console.error("[Push] Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
