/**
 * @file comprobantesFilterService.js
 * @description Utilidades de presentación sobre la lista que ya entregó el
 * backend: orden visual y rango posicional por hash. No filtra por dominio.
 */

/**
 * Ordenamiento único para la lista ya mapeada. El backend entrega el orden por
 * fecha; esta función conserva la posibilidad de ordenar el bloque cargado.
 */
export function ordenarComprobantes(lista = [], orden = 'fecha_desc') {
  if (!Array.isArray(lista)) return [];
  const criterio = String(orden || 'fecha_desc').toLowerCase();
  const fecha = item => {
    const raw = item.fecha_hora_comprobante || item.fecha_hora_iso || item.fecha || 0;
    const ms = new Date(raw).getTime();
    return isNaN(ms) ? 0 : ms;
  };
  const monto = item => parseFloat(item.monto ?? item.me1 ?? 0) || 0;

  return [...lista].sort((a, b) => {
    if (criterio === 'monto_desc') return monto(b) - monto(a);
    if (criterio === 'monto_asc') return monto(a) - monto(b);
    if (criterio === 'fecha_asc') return fecha(a) - fecha(b);
    return fecha(b) - fecha(a);
  });
}

/**
 * Identificador normalizado de un comprobante. Acepta tanto filas canónicas
 * (hash en la raíz) como respuestas anidadas (`item.comprobante`).
 */
function hashDeItem(item) {
  const c = item?.comprobante || item || {};
  return String(
    c.hash_largo || c.hash_corto || c.id || c.referencia ||
    item?.hash_largo || item?.hash_corto || item?.id || ''
  ).trim().toLowerCase();
}

/**
 * Resuelve la posición de un hash de referencia dentro de la lista visible.
 * Acepta hash completo, hash corto y prefijos de al menos 4 caracteres.
 */
export function resolverIndiceHash(hashes = [], referencia = '') {
  const target = String(referencia || '').trim().toLowerCase();
  if (!target) return -1;

  const exacto = hashes.indexOf(target);
  if (exacto !== -1) return exacto;

  if (target.length >= 4) {
    const prefijo = hashes.findIndex(hash => hash.startsWith(target));
    if (prefijo !== -1) return prefijo;
  }

  return -1;
}

/**
 * Recorta la lista al intervalo inclusivo delimitado por los hashes
 * seleccionados. El intervalo se interpreta sobre el orden actual de la lista,
 * por lo que debe aplicarse después de ordenar. Un límite no resoluble se
 * ignora (queda abierto) para no vaciar el listado por un hash incompleto.
 */
export function aplicarRangoHash(lista = [], desdeHash = '', hastaHash = '') {
  if (!Array.isArray(lista) || lista.length === 0) return [];
  const refDesde = String(desdeHash || '').trim();
  const refHasta = String(hastaHash || '').trim();
  if (!refDesde && !refHasta) return lista;

  const hashes = lista.map(hashDeItem);
  const idxDesde = resolverIndiceHash(hashes, refDesde);
  const idxHasta = resolverIndiceHash(hashes, refHasta);

  const inicio = idxDesde === -1 ? 0 : idxDesde;
  const fin = idxHasta === -1 ? hashes.length - 1 : idxHasta;
  const desde = Math.min(inicio, fin);
  const hasta = Math.max(inicio, fin);

  return lista.slice(desde, hasta + 1);
}
