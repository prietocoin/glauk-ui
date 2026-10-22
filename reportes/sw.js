const CACHE = 'glauk-reportes-v2';
const ASSETS = [
  './', './index.html', './manifest.json', './js/main.js', './js/api.js',
  './js/views/constructor.js', './js/views/plantillas.js',
  './js/components/filtros.js', './js/components/preview.js',
  '../shared/css/base.css', '../shared/css/components.css', '../shared/css/print.css',
  '../shared/js/dom.js', '../shared/js/http.js', '../shared/js/api-base.js', '../shared/js/format.js',
  '../shared/js/toast.js', '../shared/js/reporte-canvas.js',
  '../shared/vendor/html2canvas.min.js', '../shared/brand/favicon.svg',
  '../shared/brand/logo-fundablock.png',
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
