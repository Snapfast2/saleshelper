// worker/index.js
// Código custom que next-pwa inyecta en el service worker generado
// Maneja notificaciones push y clicks en notificaciones

// ── Push Event: mostrar la notificación cuando llega del servidor ──
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};

  const title = data.title || '🏠 SalesHelper';
  const options = {
    body: data.body || 'Tienes una notificación nueva.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    data: { url: data.url || '/' },
    tag: data.tag || 'saleshelper-default',
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ── Notification Click: abrir la app en la ruta correcta ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si ya hay una ventana abierta de la app, enfocamos y navegamos
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(targetUrl);
          return;
        }
      }
      // Si no hay ventana abierta, abrimos una nueva
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
