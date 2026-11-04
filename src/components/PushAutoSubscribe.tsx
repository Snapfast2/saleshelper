'use client';
// src/components/PushAutoSubscribe.tsx
// Sincroniza la suscripción Push con Redis solo cuando aún no está registrada o cambió el endpoint.

import { useEffect } from "react";
import { getSharedSwRegistration, urlBase64ToUint8Array } from "@/hooks/usePushNotifications";

const PUSH_SYNC_KEY = "sh_push_ep";

export default function PushAutoSubscribe() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission !== "granted") return;

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;

    async function syncIfNeeded() {
      try {
        const reg = await getSharedSwRegistration();
        if (!reg) return;

        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey!),
          });
        }

        const syncedEndpoint = (() => {
          try {
            return localStorage.getItem(PUSH_SYNC_KEY);
          } catch {
            return null;
          }
        })();

        if (syncedEndpoint === sub.endpoint) {
          return;
        }

        const res = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: sub }),
        });

        if (res.ok) {
          try {
            localStorage.setItem(PUSH_SYNC_KEY, sub.endpoint);
          } catch {}
        }
      } catch {
        // Silencioso — no interrumpir la UX si algo falla
      }
    }

    syncIfNeeded();
  }, []);

  return null;
}
