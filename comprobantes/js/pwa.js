/**
 * @file pwa.js
 * @description Registro del service worker con scope del tenant.
 */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(new URL('../sw.js', import.meta.url)).catch((err) => {
      console.warn('Error al registrar Service Worker PWA:', err);
    });
  });
}
