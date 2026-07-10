// sw.js — Service Worker de Control de Acarreos (Rompeolas Oriente)
//
// NOTA: este archivo no existía en el repositorio (verificado jul-2026).
// index.html ya intentaba registrarlo, pero fallaba en silencio. Este es un
// service worker nuevo, versión v1.
//
// Qué hace: cachea el "app shell" (los archivos que casi nunca cambian de
// nombre: index.html, manifest.json, iconos) para que la app cargue rápido
// y pueda abrirse aunque no haya conexión en el momento. NO cachea llamadas
// a Firebase/Firestore — esas siempre van a la red, para no servir datos
// viejos de acarreos.
//
// CÓMO SUBIR DE VERSIÓN: cada vez que cambies algo en index.html (o
// manifest.json/iconos) que el usuario deba ver sí o sí, sube el número de
// CACHE_NAME de aquí abajo (v1 -> v2 -> v3...). Eso hace que, al activarse
// el nuevo service worker, se borre el caché viejo y se vuelva a descargar
// todo. Si no subes el número, el navegador puede seguir sirviendo el
// index.html viejo desde caché aunque ya hayas subido uno nuevo al hosting.

const CACHE_NAME = 'control-acarreos-v11.1';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

// Instala el service worker y precachea el app shell.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()) // activa la versión nueva de inmediato, sin esperar a cerrar todas las pestañas
  );
});

// Al activarse, borra cualquier caché de una versión anterior (v1, v2... ya
// obsoletas) para no acumular basura ni servir archivos viejos por error.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(
        nombres
          .filter((nombre) => nombre !== CACHE_NAME)
          .map((nombre) => caches.delete(nombre))
      )
    ).then(() => self.clients.claim())
  );
});

// Estrategia de red:
// - Peticiones a Firebase/Firestore/Google APIs: SIEMPRE van a la red
//   directa, nunca se cachean (los datos de acarreos deben ser siempre
//   los más recientes).
// - Resto de peticiones (el app shell y cualquier otro recurso propio):
//   "network-first" — intenta la red primero (para tener siempre la
//   versión más nueva si hay internet) y solo si falla (sin conexión) usa
//   lo que haya en caché.
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  const esFirebaseOExterno =
    url.includes('firestore.googleapis.com') ||
    url.includes('firebaseio.com') ||
    url.includes('googleapis.com') ||
    url.includes('gstatic.com') ||
    url.includes('cdnjs.cloudflare.com');

  if (esFirebaseOExterno || event.request.method !== 'GET') {
    return; // deja que el navegador maneje la petición normalmente, sin intervenir
  }

  event.respondWith(
    fetch(event.request)
      .then((respuestaRed) => {
        const copia = respuestaRed.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
        return respuestaRed;
      })
      .catch(() => caches.match(event.request))
  );
});
