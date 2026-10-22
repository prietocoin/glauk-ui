/**
 * @file comprobantesCargaService.js
 * @description Orquestador de carga: red, mapeo canónico, filtro estricto y
 * recuperación local cuando el filtro de socio del backend no devuelve filas.
 */

import {
  fetchComprobantesHasta,
  MAXIMO_RECUPERACION
} from './comprobantesApiService.js';
import { prepararEdicionComprobante } from './comprobantesMapperService.js';
import {
  aplicarRangoHash,
  filtrarPorSocioEstricto,
  ordenarComprobantes
} from './comprobantesFilterService.js';
import { normalizarSocio } from '../utils/comprobantesSocioUtils.js';

function esFiltroSocioActivo(socio = '') {
  const normalizado = normalizarSocio(socio);
  return Boolean(normalizado)
    && normalizado !== 'TODOS'
    && normalizado !== 'TODOS LOS SOCIOS'
    && normalizado !== 'GENERAL';
}

function mapearFiltrarYOrdenar(raw, socio, loteActivo, orden, maximo, desdeHash, hastaHash) {
  const lista = Array.isArray(raw) ? raw : [];
  const mapeados = lista.map(item => prepararEdicionComprobante(item, loteActivo));
  const estrictos = filtrarPorSocioEstricto(mapeados, socio);
  const ordenados = ordenarComprobantes(estrictos, orden);
  // El rango por hash es posicional sobre el orden visible: se aplica al final.
  const acotados = aplicarRangoHash(ordenados, desdeHash, hastaHash);
  return acotados.slice(0, maximo);
}

/**
 * Carga comprobantes aplicando el filtro de socio en el cliente.
 *
 * Si la API devuelve cero para un socio activo, se reintenta sin el parámetro
 * `socio` con un tope de recuperación mayor y se filtra localmente. Esto evita
 * el falso "0 ítems" cuando el backend no logra aplicar el filtro.
 */
export async function cargarComprobantesFiltrados(params = {}, opciones = {}) {
  const maximo = Math.max(1, Number(opciones.maximo) || 500);
  const loteActivo = opciones.loteActivo || 'T070';
  const socio = String(params.socio || '').trim();
  const orden = params.orden || 'fecha_desc';
  const { desdeHash = '', hastaHash = '' } = params;
  const paramsBase = { ...params, socio };

  const rawPrincipal = await fetchComprobantesHasta(paramsBase, maximo);
  let resultado = mapearFiltrarYOrdenar(
    rawPrincipal, socio, loteActivo, orden, maximo, desdeHash, hastaHash
  );

  if (esFiltroSocioActivo(socio) && resultado.length === 0) {
    const topeRecuperacion = Math.max(maximo, MAXIMO_RECUPERACION);
    const rawRespaldo = await fetchComprobantesHasta(
      { ...paramsBase, socio: '' },
      topeRecuperacion
    );
    resultado = mapearFiltrarYOrdenar(
      rawRespaldo, socio, loteActivo, orden, maximo, desdeHash, hastaHash
    );
  }

  return resultado;
}
