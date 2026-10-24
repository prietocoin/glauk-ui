/**
 * @file sw.js
 * @description Service Worker de retirada para el antiguo módulo Reportes.
 * La vista "Constructor Visual" fue eliminada: este worker borra la caché
 * heredada y se desregistra para que /reportes/ redirija al Dashboard.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const claves = await caches.keys();
    await Promise.all(claves.map((clave) => caches.delete(clave)));
    await self.registration.unregister();
  })());
});

self.addEventListener('fetch', () => {
  // Sin estrategia de caché: todas las peticiones van a la red.
});
