'use client';
// src/components/PushAutoSubscribe.tsx
// Se ejecuta silenciosamente al abrir la app.
// Si el usuario ya dio permiso → refresca la suscripción en Redis.
// Sin UI, sin popups, sin llamadas a Domus.

import { useEffect } from 'react';

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export default function PushAutoSubscribe() {
  useEffect(() => {
    // Solo actúa si ya tiene permiso — nunca vuelve a preguntar
    if (!('serviceWorker' in navigator)) return;
    if (!('PushManager' in window)) return;
    if (Notification.permission !== 'granted') return;

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;

    async function refresh() {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        await navigator.serviceWorker.ready;

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey!) as any,
        });

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub }),
        });
      } catch {
        // Silencioso — no interrumpir la UX si algo falla
      }
    }

    refresh();
  }, []);

  return null; // Sin UI
}
