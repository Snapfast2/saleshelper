// public/sw.js
// Service Worker de SalesHelper — maneja Push Notifications

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function isSafeWhatsAppUrl(url) {
  return typeof url === "string" && /^https:\/\/wa\.me\/\d{7,15}(\?[^\s]{0,300})?$/.test(url);
}

function resolveSafeInternalUrl(rawUrl, origin) {
  if (typeof rawUrl !== "string" || !rawUrl.startsWith("/") || rawUrl.startsWith("//")) {
    return origin + "/";
  }
  try {
    const resolved = new URL(rawUrl, origin);
    return resolved.origin === origin ? resolved.href : origin + "/";
  } catch {
    return origin + "/";
  }
}

// ── Push Notifications ──────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "SalesHelper", body: event.data.text() };
  }

  const title = typeof data.title === "string" && data.title ? data.title : "SalesHelper";
  const options = {
    body: typeof data.body === "string" && data.body ? data.body : "Tienes una notificación",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: typeof data.tag === "string" && data.tag ? data.tag : "saleshelper",
    renotify: Boolean(data.renotify),
    data: {
      url: typeof data.url === "string" ? data.url : "/",
      waUrl: isSafeWhatsAppUrl(data.waUrl) ? data.waUrl : null,
    },
    vibrate: [200, 100, 200],
    requireInteraction: false,
    actions: Array.isArray(data.actions) ? data.actions : [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Click en notificación o en botón de acción ──────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const action = event.action;
  const notifData = event.notification.data || {};
  const appOrigin = self.location.origin;

  const openWhatsApp = action === "whatsapp" && isSafeWhatsAppUrl(notifData.waUrl);
  const targetUrl = openWhatsApp
    ? notifData.waUrl
    : resolveSafeInternalUrl(notifData.url, appOrigin);

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        if (!openWhatsApp) {
          for (const client of clients) {
            if (client.url.startsWith(appOrigin)) {
              client.focus();
              client.navigate(targetUrl);
              return;
            }
          }
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});
