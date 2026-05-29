// public/sw.js
// Service Worker de SalesHelper — maneja Push Notifications
// Este archivo se sirve directamente desde /sw.js

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// ── Push Notifications ──────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "SalesHelper", body: event.data.text() };
  }

  const title = data.title || "SalesHelper";
  const options = {
    body: data.body || "Tienes un recordatorio pendiente",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.tag || "saleshelper",
    data: { url: data.url || "/" },
    vibrate: [200, 100, 200],
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Click en notificación → abre la app ────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // Si ya hay una ventana abierta, enfocarla
        for (const client of clients) {
          if (client.url.includes(self.location.origin)) {
            client.focus();
            client.navigate(targetUrl);
            return;
          }
        }
        // Si no, abrir una nueva
        return self.clients.openWindow(targetUrl);
      })
  );
});
