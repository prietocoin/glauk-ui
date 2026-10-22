/**
 * @file api-base.js
 * @description Resolución única de la URL base de las APIs del frontend.
 *
 * Prioridad de configuración:
 *   1. window.__GLAUK_CONFIG__.apiBaseUrl
 *   2. <meta name="glauk-api-base" content="...">
 *   3. Cadena vacía (mismo origen, recomendado con reverse proxy)
 *
 * Ejemplos válidos para apiBaseUrl:
 *   ''                         -> /api/v1/...
 *   '/gateway'                 -> /gateway/api/v1/...
 *   'https://api.glauk.example' -> https://api.glauk.example/api/v1/...
 */

const CONFIG_KEY = '__GLAUK_CONFIG__';

function normalizarBase(valor) {
  const texto = String(valor ?? '').trim();
  if (!texto) return '';
  return texto.replace(/\/+$/, '');
}

/**
 * Devuelve la base configurada en tiempo de ejecución. Se evalúa en cada
 * llamada para permitir overrides antes de la primera petición.
 */
export function obtenerApiBase() {
  const config = globalThis[CONFIG_KEY];
  const desdeConfig = config && (config.apiBaseUrl ?? config.apiBase);
  const desdeMeta = globalThis.document
    ?.querySelector?.('meta[name="glauk-api-base"]')
    ?.getAttribute('content');

  return normalizarBase(desdeConfig ?? desdeMeta ?? '');
}

/**
 * Une la base configurada con una ruta de API sin duplicar barras.
 * Las URLs absolutas se respetan sin modificaciones.
 */
export function apiUrl(path = '') {
  const ruta = String(path ?? '').trim();
  if (!ruta) return obtenerApiBase();
  if (/^[a-z][a-z0-9+.-]*:/i.test(ruta) || ruta.startsWith('//')) return ruta;

  const base = obtenerApiBase();
  if (!base) return ruta.startsWith('/') ? ruta : `/${ruta}`;

  const rutaConBarra = ruta.startsWith('/') ? ruta : `/${ruta}`;
  return `${base}${rutaConBarra}`;
}

// Puente para código inline de Alpine que no puede importar módulos ES.
globalThis.GlaukAPI = {
  url: apiUrl,
  get base() {
    return obtenerApiBase();
  }
};
