/**
 * @file comprobantesCargaService.js
 * @description Orquestador de carga: red, mapeo canónico y presentación
 * (orden y rango de hash). El backend es la fuente del universo, del total y
 * del filtro de socio.
 */

import {
  fetchComprobantesHasta,
  fetchComprobantesPagina
} from './comprobantesApiService.js?v=20261025_02';
import { prepararEdicionComprobante } from './comprobantesMapperService.js?v=20261025_02';
import {
  aplicarRangoHash,
  ordenarComprobantes
} from './comprobantesFilterService.js?v=20261025_02';

/**
 * Carga una página real de comprobantes para la vista de auditoría.
 * El backend ordena, filtra y pagina; el mapper solo adapta la fila a la vista.
 */
export async function cargarPaginaComprobantes(params = {}, opciones = {}) {
  const limit = Math.max(1, Number(opciones.limit) || 20);
  const offset = Math.max(0, Number(opciones.offset) || 0);
  const loteActivo = opciones.loteActivo || 'T070';

  const pagina = await fetchComprobantesPagina(params, { limit, offset });
  const items = pagina.lista.map(item => prepararEdicionComprobante(item, loteActivo));

  return {
    items,
    total: pagina.total,
    hasMore: pagina.hasMore,
    paginado: pagina.paginado,
    offset: pagina.offset,
    recibidos: pagina.recibidos
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

  const raw = await fetchComprobantesHasta(params, maximo);
  const lista = Array.isArray(raw) ? raw : [];
  const mapeados = lista.map(item => prepararEdicionComprobante(item, loteActivo));
  const ordenados = ordenarComprobantes(mapeados, orden);
  const acotados = aplicarRangoHash(ordenados, desdeHash, hastaHash);
  return acotados.slice(0, maximo);
}
