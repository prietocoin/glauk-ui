/**
 * @file sw.js
 * @description Service Worker atómico para instalación PWA en glauk2.
 * Mantiene la app instalable sin almacenar en caché las peticiones de la API REST.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // Peticiones pasan directo a la red para garantizar datos contables en tiempo real
});
