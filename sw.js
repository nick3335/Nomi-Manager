// sw.js — SAFE APP-SHELL CACHING (no API/GitHub caching)

const CACHE_NAME = 'nomi-manager-v5-appshell';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './logo.svg',
  './styles.css',
  './chat.css',
  './theme.js',
  './app.js',
  './chat.js'
];

// Install: precache core app shell
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Activate: remove old caches + take control
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : null)));
    await self.clients.claim();
  })());
});

// Helpers
function isSameOrigin(req) {
  try {
    return new URL(req.url).origin === self.location.origin;
  } catch {
    return false;
  }
}

function isStaticAsset(req) {
  // Only cache same-origin “app shell” file types
  if (!isSameOrigin(req)) return false;

  const url = new URL(req.url);

  // Navigation handled separately
  if (req.mode === 'navigate') return false;

  // Cache common static types
  const dest = req.destination; // 'script', 'style', 'image', 'font', 'manifest', etc.
  if (['script', 'style', 'image', 'font', 'manifest'].includes(dest)) return true;

  // Fallback: cache these extensions if destination is empty
  return /\.(html|css|js|svg|png|jpg|jpeg|webp|ico|json|woff2?)$/i.test(url.pathname);
}

// Fetch:
// - Cross-origin => network only (no caching)
// - Navigations => network-first, offline fallback to cached index.html
// - Same-origin static assets => stale-while-revalidate
self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') return;

  // Never cache cross-origin (GitHub/Nomi/worker/etc.)
  if (!isSameOrigin(req)) {
    return; // let browser fetch normally
  }

  // 1) Page navigations (SPA load / refresh)
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        // Cache the navigation response (helps offline reload)
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        // Try cached page, else fall back to cached index.html
        return (await caches.match(req)) || (await caches.match(new Request('./index.html')));
      }
    })());
    return;
  }

  // 2) Static assets (CSS/JS/SVG/etc.) — stale-while-revalidate
  if (isStaticAsset(req)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);

      const fetchPromise = fetch(req)
        .then((res) => {
          // Cache only successful responses
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })());
    return;
  }

  // 3) Anything else same-origin => network only (no caching)
});
