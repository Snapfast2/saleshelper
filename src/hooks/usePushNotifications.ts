"use client";
// src/hooks/usePushNotifications.ts
// Gestiona suscripción a Web Push Notifications usando un registro singleton de /sw.js

import { useState, useEffect, useCallback, useRef } from "react";

export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

let sharedSwPromise: Promise<ServiceWorkerRegistration | null> | null = null;

/**
 * Registra /sw.js una sola vez por sesión y comparte la promesa entre todos los componentes.
 */
export function getSharedSwRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return Promise.resolve(null);
  }
  if (!sharedSwPromise) {
    sharedSwPromise = (async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        if (reg.installing) {
          await new Promise<void>((resolve) => {
            reg.installing!.addEventListener("statechange", (e) => {
              if ((e.target as ServiceWorker).state === "activated") resolve();
            });
          });
        }
        return await navigator.serviceWorker.ready;
      } catch (err) {
        console.error("[SW] Error al registrar:", err);
        sharedSwPromise = null;
        return null;
      }
    })();
  }
  return sharedSwPromise;
}

type PermissionState = "default" | "granted" | "denied" | "unsupported";

export function usePushNotifications() {
  const [permissionState, setPermissionState] = useState<PermissionState>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const regRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("Notification" in window) || !("PushManager" in window)) {
      setPermissionState("unsupported");
      return;
    }

    setPermissionState(Notification.permission as PermissionState);

    let cancelled = false;
    getSharedSwRegistration().then(async (readyReg) => {
      if (!readyReg || cancelled) return;
      regRef.current = readyReg;
      try {
        const sub = await readyReg.pushManager.getSubscription();
        if (sub && !cancelled) {
          setIsSubscribed(true);
          setPermissionState("granted");
        }
      } catch {}
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const subscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      let reg = regRef.current;
      if (!reg) {
        reg = await getSharedSwRegistration();
        regRef.current = reg;
      }
      if (!reg) throw new Error("Service Worker no disponible");

      const permission = await Notification.requestPermission();
      setPermissionState(permission as PermissionState);
      if (permission !== "granted") {
        setIsLoading(false);
        return;
      }

      const oldSub = await reg.pushManager.getSubscription();
      if (oldSub) await oldSub.unsubscribe();

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription }),
      });
      if (!res.ok) throw new Error("Error al guardar suscripción");

      try {
        localStorage.setItem("sh_push_ep", subscription.endpoint);
      } catch {}

      setIsSubscribed(true);

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
    } catch {}
  }, [isSubscribed]);

  return {
    permissionState,
    isSubscribed,
    isLoading,
    subscribe,
    checkReminders,
  };
}
