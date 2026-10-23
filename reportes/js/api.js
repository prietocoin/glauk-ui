import { get, post, idempotencyKey } from '../../shared/js/http.js';

export const filtros = (rol = '') =>
  get('/api/v1/reportes/filtros', { params: { rol } }).then((data) => data?.data || data || {});

function numeroCabecera(headers, nombre) {
  const valor = headers?.get?.(nombre);
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

/**
 * Devuelve las filas y los metadatos de paginación del backend.
 * El contrato raíz sigue siendo un array; total/limit/offset/hasMore
 * viajan en cabeceras X-Total-Count, X-Limit, X-Offset y X-Has-More.
 */
export async function movimientos(params = {}) {
  const respuesta = await get('/api/v1/comprobantes', {
    params: { limit: 100, offset: 0, ...params },
    includeResponse: true
  });

  const payload = respuesta?.data;
  const rows = Array.isArray(payload)
    ? payload
    : (Array.isArray(payload?.data) ? payload.data : []);
  const headers = respuesta?.headers;
  const totalCabecera = numeroCabecera(headers, 'X-Total-Count');
  const limitCabecera = numeroCabecera(headers, 'X-Limit');
  const offsetCabecera = numeroCabecera(headers, 'X-Offset');
  const hasMoreCabecera = String(headers?.get?.('X-Has-More') || '').toLowerCase() === 'true';
  const total = totalCabecera ?? rows.length;

  return {
    rows,
    total,
    limit: limitCabecera ?? rows.length,
    offset: offsetCabecera ?? 0,
    hasMore: hasMoreCabecera || rows.length < total
  };
}

export const socios = () => get('/api/v1/perfiles');

export function enviarImagen(payload, key = idempotencyKey()) {
  return post('/api/v1/reportes/imagen', payload, { idempotencyKey: key, timeout: 30000 })
    .then((data) => ({ ...data, _idempotencyKey: key }));
}

export const enviarTexto = (payload, key = idempotencyKey()) =>
  post('/api/v1/reportes/texto', payload, { idempotencyKey: key, timeout: 30000 });

export const api = { filtros, movimientos, socios, enviarImagen, enviarTexto };
