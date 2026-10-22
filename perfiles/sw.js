const CACHE = 'glauk-perfiles-v3';
const ASSETS = [
  './', './index.html', './manifest.json',
  './css/tailwind.css', './css/perfiles.css',
  './js/main.js', './js/api.js', './js/store.js', './js/domain.js', './js/catalog.js',
  './js/components/socio-card.js', './js/components/lista-socios.js',
  './js/components/modal-socio.js', './js/components/reglas-herencia.js',
  './js/components/reglas-editor.js',
  './js/controllers/directorio.js', './js/controllers/editor.js',
  './js/controllers/acciones.js',
  '../shared/js/dom.js', '../shared/js/http.js', '../shared/js/api-base.js',
  '../shared/brand/favicon.svg',
  '../shared/brand/icon-192.png', '../shared/brand/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
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
  // La configuración de despliegue y las APIs nunca se cachean. El filtro
  // incluye prefijos como /gateway/api/ para no servir respuestas dinámicas.
  if (url.pathname === '/api' || url.pathname.includes('/api/') || url.pathname.endsWith('/config.js')) return;
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (!response.ok || response.type !== 'basic') return response;
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(request, copy));
    return response;
  }).catch(() => request.mode === 'navigate' ? caches.match('./index.html') : Response.error())));
});
