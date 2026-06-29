// ─────────────────────────────────────────────────────────────
// CONTROL ACARREOS — Service Worker
// Estrategia:
//   • App shell (HTML, librerías CDN) → Cache First
//   • Firestore / Firebase Auth (API calls) → Network Only
//     (los datos en la nube siempre necesitan red; la cola
//      offline en IndexedDB es la que aguanta sin señal)
// ─────────────────────────────────────────────────────────────

const CACHE_NAME = 'acarreos-v3';

// Recursos que se cachean en el momento de instalación del SW.
// Incluimos la raíz del repo de GitHub Pages tal cual la sirve.
const APP_SHELL = [
  './',
  './index.html',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js'
];

// ── INSTALL: precaché del app shell ──────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())   // activa el SW inmediatamente
  );
});

// ── ACTIVATE: limpia caches viejos ───────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())  // toma control de todas las pestañas abiertas
  );
});

// ── FETCH: lógica de respuesta ────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 1. Firestore, Firebase Auth y cualquier API de Google → siempre red
  //    Si no hay red, deja que el error llegue normal (la app ya maneja offline con IndexedDB)
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebase.googleapis.com')  ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com') ||
    url.hostname.includes('gstatic.com')  // Firebase SDK imports
  ) {
    // Network Only — no intentamos caché para estas URLs
    return;
  }

  // 2. Para todo lo demás (app shell, CDN libs): Cache First con fallback a red
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      // No está en caché → buscar en red y guardar para la próxima
      return fetch(event.request)
        .then(response => {
          // Solo cacheamos respuestas válidas (no errores, no opaque de terceros problemáticos)
          if (
            response &&
            response.status === 200 &&
            (response.type === 'basic' || response.type === 'cors')
          ) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(() => {
          // Sin red y sin caché: si es una navegación, devolver el HTML principal
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html') || caches.match('./');
          }
          // Para otros recursos (imágenes, etc.) simplemente falla silenciosamente
        });
    })
  );
});
