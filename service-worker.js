const CACHE_VERSION = 'ledger-v1';
const APP_SHELL = [
  './',
  './calculate2.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install: pre-cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for app shell & same-origin, network-first fallback for everything else,
// with an offline fallback to the cached shell for navigations.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((res) => {
          // Cache successful same-origin responses (e.g. fonts, future assets) for next time
          if (res && res.status === 200 && (req.url.startsWith(self.location.origin) || req.url.includes('fonts.g'))) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => {
          // Offline and not cached: fall back to the app shell for page navigations
          if (req.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
