/**
 * @file comprobantesCargaService.js
 * @description Orquestador de carga: red, mapeo canónico y presentación
 * (orden y rango de hash). El backend es la fuente del universo y del total;
 * solo hay un fallback local para el filtro de socio mientras la API no lo
 * resuelva.
 */

import {
  fetchComprobantesHasta,
  fetchComprobantesPagina,
  MAXIMO_RECUPERACION
} from './comprobantesApiService.js?v=20261025_01';
import { prepararEdicionComprobante } from './comprobantesMapperService.js?v=20261025_01';
import {
  aplicarRangoHash,
  ordenarComprobantes
} from './comprobantesFilterService.js?v=20261025_01';
import { coincideSocioEstricto } from '../utils/comprobantesSocioUtils.js?v=20261025_01';

/**
 * Carga una página real de comprobantes para la vista de auditoría.
 * El backend ordena y pagina; el mapper solo adapta la fila a la vista.
 */
export async function cargarPaginaComprobantes(params = {}, opciones = {}) {
  const limit = Math.max(1, Number(opciones.limit) || 20);
  const offset = Math.max(0, Number(opciones.offset) || 0);
  const loteActivo = opciones.loteActivo || 'T070';

  const pagina = await fetchComprobantesPagina(params, { limit, offset });
  let items = pagina.lista.map(item => prepararEdicionComprobante(item, loteActivo));
  let total = pagina.total;
  let hasMore = pagina.hasMore;
  let paginado = pagina.paginado;
  let offsetFinal = pagina.offset;
  let recibidos = pagina.recibidos;

  // El backend todavía responde 500/0 con ?socio=. Se conserva el envío del
  // filtro al servidor como camino principal y, solo si no hay filas, se relee
  // el universo sin socio y se filtra localmente para no romper la vista.
  if (params.socio && pagina.lista.length === 0) {
    const respaldo = await fetchComprobantesHasta(
      { ...params, socio: '' },
      MAXIMO_RECUPERACION
    );
    const filtrados = respaldo
      .map(item => prepararEdicionComprobante(item, loteActivo))
      .filter(item => coincideSocioEstricto(item, params.socio));
    items = filtrados;
    total = filtrados.length;
    hasMore = false;
    paginado = false;
    offsetFinal = 0;
    recibidos = filtrados.length;
  }

  return {
    items,
    total,
    hasMore,
    paginado,
    offset: offsetFinal,
    recibidos
  };
}

/**
 * Carga un bloque amplio para el reporte o para una vista que necesita el
 * universo acotado. El filtro de socio viaja al backend; el orden y el rango de
 * hash se resuelven como presentación.
 */
export async function cargarComprobantesFiltrados(params = {}, opciones = {}) {
  const maximo = Math.max(1, Number(opciones.maximo) || 500);
  const loteActivo = opciones.loteActivo || 'T070';
  const orden = params.orden || 'fecha_desc';
  const { desdeHash = '', hastaHash = '' } = params;

  let raw = await fetchComprobantesHasta(params, maximo);
  let filtroLocal = false;

  // Fallback temporal mientras el backend no resuelva ?socio=. El camino
  // principal sigue siendo el filtro del servidor.
  if (params.socio && raw.length === 0) {
    raw = await fetchComprobantesHasta({ ...params, socio: '' }, maximo);
    filtroLocal = true;
  }

  const lista = Array.isArray(raw) ? raw : [];
  const mapeados = lista
    .map(item => prepararEdicionComprobante(item, loteActivo))
    .filter(item => !filtroLocal || coincideSocioEstricto(item, params.socio));
  const ordenados = ordenarComprobantes(mapeados, orden);
  const acotados = aplicarRangoHash(ordenados, desdeHash, hastaHash);
  return acotados.slice(0, maximo);
}
