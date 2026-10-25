/**
 * @file pwa.js
 * @description Registro del service worker con scope del tenant.
 * El parámetro ?v= cambia en cada despliegue para forzar la actualización
 * del service worker sin requerir Ctrl+F5 en los navegadores de los clientes.
 */

const SW_VERSION = '20261025_02';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = new URL(`../sw.js?v=${SW_VERSION}`, import.meta.url);

    navigator.serviceWorker
      .register(swUrl, { updateViaCache: 'none' })
      .then((registration) => registration.update())
      .catch((err) => {
        console.warn('Error al registrar Service Worker PWA:', err);
      });
  });
}
