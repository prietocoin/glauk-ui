/**
 * @file sw.js
 * @description Service Worker atómico para instalación PWA en glauk2.
 * Mantiene la app instalable sin almacenar en caché las peticiones de la API REST.
 * CACHE_VERSION se incrementa en cada despliegue para invalidar cachés previas.
 */

const CACHE_VERSION = 'glauk2-comprobantes-20261025_01';

self.addEventListener('install', () => {
  // Toma el control sin esperar a que se cierren las pestañas abiertas.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Purga cualquier caché de versiones anteriores de este scope.
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith('glauk2-comprobantes-') && key !== CACHE_VERSION)
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', () => {
  // Peticiones pasan directo a la red para garantizar datos contables en tiempo real
});
