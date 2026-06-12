const CACHE_NAME = 'phoenix-v1';
const OFFLINE_URL = '/';

// Install standard assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([OFFLINE_URL]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Network-first strategy (Crucial for live trade streaming)
self.addEventListener('fetch', (event) => {
  // Only handle standard HTTP/HTTPS requests (ignores chrome extensions/firebase websockets)
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request).then((response) => {
          return response || caches.match(OFFLINE_URL);
        });
      })
  );
});

// ─────────────────────────────────────────────────────────────────────────
// PUSH NOTIFICATIONS (Phoenix web push)
// Receives a push from the server and shows a notification, even when the
// dashboard tab is closed. Tapping it focuses/opens the dashboard.
// ─────────────────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = {}; }

  const title = data.title || 'Phoenix';
  const options = {
    body:  data.body || '',
    icon:  data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    tag:   data.tag || 'phoenix-signal',
    data:  { url: data.url || '/' },
    vibrate: [100, 50, 100],
    requireInteraction: false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
