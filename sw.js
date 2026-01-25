const CACHE_NAME = 'nomi-manager-live';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './logo.svg'
];

// Install: Cache core files immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Activate: Take control immediately
self.addEventListener('activate', (event) => {
  self.clients.claim();
});

// Fetch: NETWORK FIRST, FALLBACK TO CACHE
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // 1. If the network works, clone the response, update the cache, and serve it.
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        // 2. If the network fails (offline), try to serve from the cache.
        return caches.match(event.request);
      })
  );
});
