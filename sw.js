// sw.js — Service Worker del Menú Digital
// Estrategia: cache-first con actualización en segundo plano (stale-while-revalidate)
// Objetivo: la app debe abrir y funcionar SIN internet ni wifi después de la primera visita.

const CACHE_NAME = 'menu-paco-cache-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch((err) => console.error('[SW] Error precacheando:', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Solo interceptamos peticiones GET del mismo origen.
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const networkFetch = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse); // sin red: usamos lo que haya en caché

      // Si ya tenemos algo en caché, lo servimos de inmediato (rápido y offline-first);
      // si no, esperamos la red.
      return cachedResponse || networkFetch;
    })
  );
});
