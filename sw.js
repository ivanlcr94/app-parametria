// ══════════════════════════════════════════════════
//  SERVICE WORKER — Parametría
//  Estrategia: Cache-first con fallback a red.
//  Diseñado para funcionar 100% offline (sin Wi-Fi/
//  datos), incluso en redes locales sin internet.
// ══════════════════════════════════════════════════

const CACHE_NAME = 'parametria-v3'; // subir versión al actualizar archivos

// Todos los recursos que la app necesita para funcionar sin red.
// IMPORTANTE: no incluir URLs externas (CDN/Google Fonts) — todo
// debe ser local para que el cacheo funcione sin internet.
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './jspdf.umd.min.js',
  './logo_macroplast.png',
  './icon-192.png',
  './icon-512.png',
];

// ── INSTALL: cachear todos los recursos esenciales ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('SW install error:', err))
  );
});

// ── ACTIVATE: limpiar caches viejos ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: cache-first, con actualización en segundo plano cuando hay red ──
self.addEventListener('fetch', event => {
  // Solo manejar peticiones GET del mismo origen
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Si está en cache, responder inmediato (rápido y funciona offline)
      if (cachedResponse) {
        // Intentar refrescar el cache en segundo plano si hay red disponible
        fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse));
          }
        }).catch(() => { /* sin red: no pasa nada, ya respondimos desde cache */ });
        return cachedResponse;
      }

      // No está en cache → intentar red, y guardar copia para la próxima vez
      return fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return networkResponse;
      }).catch(() => {
        // Sin red y sin cache para este recurso — si es navegación, devolver index.html
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
