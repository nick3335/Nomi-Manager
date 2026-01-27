const CACHE_NAME = 'nomi-manager-v2'; // 1. Changed name to force update
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

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  self.clients.claim();
  // 2. Delete old caches that don't match current version
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      })
    ))
  );
});

// Fetch: NETWORK FIRST, FALLBACK TO CACHE
self.addEventListener('fetch', (event) => {
  // Only handle GET requests (POST/PUT cannot be cached)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    // 3. { cache: 'reload' } forces the browser to go to the network, ignoring HTTP cache
    fetch(event.request, { cache: 'reload' })
      .then((networkResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        // If offline, serve from cache
        return caches.match(event.request);
      })
  );
});
