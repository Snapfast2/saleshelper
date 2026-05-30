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
    body: data.body || "Tienes una notificación",
    icon: "/icon-192.png",       // ← ruta correcta (sin /icons/)
    badge: "/icon-192.png",      // ← ruta correcta
    tag: data.tag || "saleshelper",
    data: {
      url: data.url || "/",
      waUrl: data.waUrl || null,
    },
    vibrate: [200, 100, 200],
    requireInteraction: false,
    actions: data.actions || [], // ← botones: "Ver perfil", "WhatsApp"
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Click en notificación o en botón de acción ──────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const action    = event.action;          // "ver-perfil" | "whatsapp" | ""
  const notifData = event.notification.data || {};
  const appOrigin = self.location.origin;

  let targetUrl;
  if (action === "whatsapp" && notifData.waUrl) {
    targetUrl = notifData.waUrl;           // abre WhatsApp Web / app
  } else {
    targetUrl = notifData.url || "/";      // abre la app
  }

  const isExternal = targetUrl.startsWith("http") &&
                     !targetUrl.startsWith(appOrigin);

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // Si es una URL interna y hay ventana abierta, reutilizarla
        if (!isExternal) {
          for (const client of clients) {
            if (client.url.startsWith(appOrigin)) {
              client.focus();
              client.navigate(targetUrl);
              return;
            }
          }
        }
        // Si no hay ventana abierta o es URL externa, abrir nueva
        return self.clients.openWindow(targetUrl);
      })
  );
});
