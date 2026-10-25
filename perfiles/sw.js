/**
 * @file sw.js
 * @description Service Worker del directorio de socios. La estrategia es
 * network-first para que una corrección de tasas llegue en la siguiente carga;
 * la caché solo se usa como respaldo offline.
 */

const CACHE = 'glauk-perfiles-v5-tasas-20261024-99';
const ASSETS = [
  './', './index.html', './manifest.json',
  './css/tailwind.css', './css/perfiles.css',
  './js/main.js', './js/api.js', './js/store.js', './js/domain.js', './js/catalog.js',
  './js/components/socio-card.js', './js/components/lista-socios.js',
  './js/components/modal-socio.js', './js/components/reglas-herencia.js',
  './js/components/reglas-editor.js',
  './js/controllers/directorio.js', './js/controllers/editor.js',
  './js/controllers/acciones.js',
  './js/utils/tasas.js',
  '../shared/js/dom.js', '../shared/js/http.js', '../shared/js/api-base.js',
  '../shared/brand/favicon.svg',
  '../shared/brand/icon-192.png', '../shared/brand/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return;
  // Configuración y APIs siempre van a la red, nunca a caché.
  if (url.pathname === '/api' || url.pathname.includes('/api/') || url.pathname.endsWith('/config.js')) return;

  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response && response.ok && response.type === 'basic') {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
      }
      return response;
    } catch {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (request.mode === 'navigate') {
        const shell = await caches.match('./index.html');
        if (shell) return shell;
      }
      return Response.error();
    }
  })());
});
