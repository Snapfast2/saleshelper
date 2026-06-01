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
  console.log("[SW] Push recibido", event.data ? "con datos" : "SIN datos");
  if (!event.data) {
    console.warn("[SW] Push vacío — ignorado");
    return;
  }

  let data = {};
  try {
    data = event.data.json();
    console.log("[SW] Payload:", JSON.stringify(data));
  } catch (e) {
    data = { title: "SalesHelper", body: event.data.text() };
    console.warn("[SW] No se pudo parsear JSON, usando texto plano");
  }

  const title = data.title || "SalesHelper";
  const options = {
    body: data.body || "Tienes una notificación",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || "saleshelper",
    data: {
      url: data.url || "/",
      waUrl: data.waUrl || null,
    },
    vibrate: [200, 100, 200],
    requireInteraction: false,
    actions: data.actions || [],
  };

  console.log("[SW] Mostrando notificación:", title);
  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => console.log("[SW] Notificación mostrada OK"))
      .catch((err) => console.error("[SW] Error mostrando notificación:", err))
  );
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
