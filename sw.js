const CACHE_NAME = 'nomi-manager-v3'; // bump version to force update
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
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    ))
  );
});

// Fetch: Cache ONLY same-origin (your app files). Never cache 3rd-party/API.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isSameOrigin = (url.origin === self.location.origin);

  // For anything NOT from your site (GitHub API, proxies, etc): just fetch it, don’t cache it.
  if (!isSameOrigin) {
    event.respondWith(fetch(event.request));
    return;
  }

  // For your site files: network-first, fallback to cache.
  event.respondWith(
    fetch(event.request, { cache: 'reload' })
      .then((networkResponse) => {
        // Save a copy of same-origin responses for offline use
        const copy = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return networkResponse;
      })
      .catch(async () => {
        // Offline (or fetch failed): try cached file
        const cached = await caches.match(event.request);
        if (cached) return cached;

        // If it's a navigation request (page load) and we don't have that exact URL,
        // serve index.html (helps SPAs work offline).
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }

        return cached; // will be undefined if nothing found
      })
  );
});
