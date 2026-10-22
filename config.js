/*
 * Configuración de despliegue del frontend Glauk UI.
 *
 * apiBaseUrl define dónde vive el backend:
 *   ''                          -> mismo origen (recomendado con reverse proxy)
 *   '/gateway'                  -> prefijo same-origin
 *   'https://api.glauk.example' -> API externa
 *
 * También puede definirse antes de este archivo mediante
 * window.__GLAUK_CONFIG__ = { apiBaseUrl: '...' } o con
 * <meta name="glauk-api-base" content="...">.
 */
(() => {
  const metaApiBase = document
    .querySelector?.('meta[name="glauk-api-base"]')
    ?.getAttribute('content');

  window.__GLAUK_CONFIG__ = Object.assign(
    { apiBaseUrl: metaApiBase || '' },
    window.__GLAUK_CONFIG__ || {}
  );
})();
