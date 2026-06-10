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