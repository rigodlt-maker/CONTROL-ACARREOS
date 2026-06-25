const CACHE_NAME = 'acarreos-rompeolas-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/config.js',
  // Añade aquí tus logos, iconos o CSS externos si tienes
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  // Estrategia Cache-First
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
