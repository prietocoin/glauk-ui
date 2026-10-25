/**
 * @file comprobantesCargaService.js
 * @description Orquestador de carga: red, mapeo canónico, filtro estricto y
 * recuperación local cuando el filtro de socio del backend no devuelve filas.
 */

import {
  fetchComprobantesHasta,
  fetchComprobantesPagina,
  MAXIMO_RECUPERACION
} from './comprobantesApiService.js';
import { prepararEdicionComprobante } from './comprobantesMapperService.js?v=20261024_17';
import {
  aplicarRangoHash,
  filtrarPorSocioEstricto,
  ordenarComprobantes
} from './comprobantesFilterService.js';
import { normalizarSocio } from '../utils/comprobantesSocioUtils.js';
import { esComprobante2x } from '../utils/comprobantes2xUtils.js';

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
  // Guardián 2x: ningún huérfano, broadcast o fila GENERAL avanza al estado.
  const validos = mapeados.filter(esComprobante2x);
  const estrictos = filtrarPorSocioEstricto(validos, socio);
  const ordenados = ordenarComprobantes(estrictos, orden);
  // El rango por hash es posicional sobre el orden visible: se aplica al final.
  const acotados = aplicarRangoHash(ordenados, desdeHash, hastaHash);
  return acotados.slice(0, maximo);
}

/**
 * Carga una página real de comprobantes para la vista de auditoría.
 *
 * No reordena: el backend ya devuelve las filas en el orden solicitado y
 * reordenar por bloque rompería la continuidad del scroll. El filtro estricto
 * de socio se mantiene como cortafuegos sobre cada página.
 */
export async function cargarPaginaComprobantes(params = {}, opciones = {}) {
  const limit = Math.max(1, Number(opciones.limit) || 20);
  const offset = Math.max(0, Number(opciones.offset) || 0);
  const loteActivo = opciones.loteActivo || 'T070';
  const socio = String(params.socio || '').trim();

  const pagina = await fetchComprobantesPagina(params, { limit, offset });
  const mapeados = pagina.lista.map(item => prepararEdicionComprobante(item, loteActivo));
  const validos = mapeados.filter(esComprobante2x);
  const descartados2x = mapeados.length - validos.length;
  const estrictos = filtrarPorSocioEstricto(validos, socio);

  // Rescate legacy: si la primera página de un socio activo llega vacía, se
  // reintenta sin el parámetro `socio` y se filtra localmente. El resultado se
  // entrega como bloque único (`paginado: false`) para que el estado lo revele
  // de 20 en 20 sin repetir peticiones.
  if (offset === 0 && esFiltroSocioActivo(socio) && pagina.lista.length === 0) {
    const respaldo = await fetchComprobantesHasta({ ...params, socio: '' }, MAXIMO_RECUPERACION);
    const mapeadosRespaldo = respaldo.map(item => prepararEdicionComprobante(item, loteActivo));
    const validosRespaldo = mapeadosRespaldo.filter(esComprobante2x);
    const filtrados = filtrarPorSocioEstricto(validosRespaldo, socio);
    return {
      items: ordenarComprobantes(filtrados, params.orden || 'fecha_desc'),
      total: filtrados.length,
      hasMore: false,
      paginado: false,
      offset: 0,
      recibidos: respaldo.length,
      descartados2x: mapeadosRespaldo.length - validosRespaldo.length
    };
  }

  return {
    items: estrictos,
    total: pagina.total,
    hasMore: pagina.hasMore,
    paginado: pagina.paginado,
    offset: pagina.offset,
    recibidos: pagina.recibidos,
    descartados2x
  };
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
  // El reporte de estado de cuenta necesita ver ambos lados del comprobante
  // (socio_1 y socio_2) para no omitir abonos. En ese caso el filtro de socio
  // se resuelve 100% en el cliente con `filtrarPorSocioEstricto`.
  const filtroSocioEnApi = opciones.filtroSocioEnApi !== false;
  const paramsConsulta = filtroSocioEnApi ? paramsBase : { ...paramsBase, socio: '' };

  const rawPrincipal = await fetchComprobantesHasta(paramsConsulta, maximo);
  let resultado = mapearFiltrarYOrdenar(
    rawPrincipal, socio, loteActivo, orden, maximo, desdeHash, hastaHash
  );

  if (filtroSocioEnApi && esFiltroSocioActivo(socio) && resultado.length === 0) {
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
