/**
 * =================================================================
 * @file comprobantesFilterService.js
 * @path public/js/modules/comprobantes/services/comprobantesFilterService.js
 * @description Servicio atómico de cortafuegos (Filtro x2 estricto) y ordenamiento para comprobantes_final.
 * =================================================================
 */

import {
  normalizarSocio,
  coincideSocioEstricto,
  obtenerNombresSocio
} from '../utils/comprobantesSocioUtils.js';

export { normalizarSocio, coincideSocioEstricto } from '../utils/comprobantesSocioUtils.js';

export function limpiarFiltro(val) {
  if (!val) return '';
  const str = normalizarSocio(val);
  return (str === 'TODOS' || str === 'TODOS LOS SOCIOS' || str === 'GENERAL') ? '' : val;
}

export function filtrarPorSocioEstricto(lista = [], socio = '') {
  if (!Array.isArray(lista)) return [];
  return lista.filter(item => coincideSocioEstricto(item, socio));
}

/**
 * Ordenamiento único para la lista ya mapeada. Se aplica después de fusionar
 * los bloques de consulta para que la fecha/monto sean globales y no por lote.
 */
export function ordenarComprobantes(lista = [], orden = 'fecha_desc') {
  if (!Array.isArray(lista)) return [];
  const criterio = String(orden || 'fecha_desc').toLowerCase();
  const fecha = item => {
    const raw = item.fecha_hora_comprobante || item.fecha_hora_iso || item.fecha || 0;
    const ms = new Date(raw).getTime();
    return isNaN(ms) ? 0 : ms;
  };
  const monto = item => parseFloat(item.monto ?? item.m1_socio ?? item.me1 ?? 0) || 0;

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

export function filtrarComprobantesAtómico(listaBase = [], directorio = [], filtros = {}) {
  if (!Array.isArray(listaBase) || listaBase.length === 0) return [];

  let resultado = [...listaBase];

  // 🟢 0. CORTAFUEGOS OBLIGATORIO x2 (Descartar registros 1x / basura unipersonal)
  resultado = resultado.filter(item => {
    if (!item) return false;

    // Si viene la bandera directa desde comprobantes_final, la evaluamos
    if (typeof item.es_x2 === 'boolean') {
      if (!item.es_x2) return false;
    }

    return obtenerNombresSocio(item, 2).size > 0;
  });

  const socioBuscado = normalizarSocio(filtros.filtroSocio);

  // 1. CORTAFUEGOS DE SOCIO (coincidencia exacta en Socio 1 o Socio 2)
  if (socioBuscado && socioBuscado !== 'TODOS' && socioBuscado !== 'TODOS LOS SOCIOS') {
    resultado = resultado.filter(item => coincideSocioEstricto(item, socioBuscado));
  }

  // 2. FILTRADO POR FECHA INICIO
  if (filtros.filtroFechaInicio) {
    const startObj = new Date(String(filtros.filtroFechaInicio).trim() + 'T00:00:00');
    if (!isNaN(startObj.getTime())) {
      const startMs = startObj.getTime();

      resultado = resultado.filter(item => {
        const rawDate = item.fecha_hora_iso || item.fecha_fmt || item.fecha_hora_comprobante || item.fecha_hora_input || item.created_at;
        if (!rawDate) return true;
        const itemMs = new Date(rawDate).getTime();
        return !isNaN(itemMs) ? itemMs >= startMs : true;
      });
    }
  }

  // 3. FILTRADO POR FECHA FIN
  if (filtros.filtroFechaFin) {
    const endObj = new Date(String(filtros.filtroFechaFin).trim() + 'T23:59:59');
    if (!isNaN(endObj.getTime())) {
      const endMs = endObj.getTime();

      resultado = resultado.filter(item => {
        const rawDate = item.fecha_hora_iso || item.fecha_fmt || item.fecha_hora_comprobante || item.fecha_hora_input || item.created_at;
        if (!rawDate) return true;
        const itemMs = new Date(rawDate).getTime();
        return !isNaN(itemMs) ? itemMs <= endMs : true;
      });
    }
  }

  // 4. ORDENAMIENTO COMPLETO
  const criterioOrden = String(filtros.filtroOrden || 'fecha_desc').toLowerCase();

  return [...resultado].sort((a, b) => {
    // A) Orden por Monto
    if (criterioOrden === 'monto_desc') {
      return (parseFloat(b.monto) || 0) - (parseFloat(a.monto) || 0);
    }
    if (criterioOrden === 'monto_asc') {
      return (parseFloat(a.monto) || 0) - (parseFloat(b.monto) || 0);
    }

    // B) Orden por Fecha
    const dateA = a.fecha_hora_iso || a.fecha_fmt || a.fecha_hora_comprobante || a.fecha_hora_input || 0;
    const dateB = b.fecha_hora_iso || b.fecha_fmt || b.fecha_hora_comprobante || b.fecha_hora_input || 0;

    const msA = new Date(dateA).getTime() || 0;
    const msB = new Date(dateB).getTime() || 0;

    if (criterioOrden === 'fecha_asc') {
      return msA - msB; // Antiguos primero
    } else {
      return msB - msA; // Recientes primero (Default)
    }
  });
}
