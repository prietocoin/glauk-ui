import { get, post, idempotencyKey } from '../../shared/js/http.js';

export const filtros = (rol = '') =>
  get('/api/v1/reportes/filtros', { params: { rol } }).then((data) => data?.data || data || {});
export const movimientos = (params = {}) => get('/api/v1/comprobantes', { params });
export const socios = () => get('/api/v1/perfiles');

export function enviarImagen(payload, key = idempotencyKey()) {
  return post('/api/v1/reportes/imagen', payload, { idempotencyKey: key, timeout: 30000 })
    .then((data) => ({ ...data, _idempotencyKey: key }));
}

export const enviarTexto = (payload, key = idempotencyKey()) =>
  post('/api/v1/reportes/texto', payload, { idempotencyKey: key, timeout: 30000 });

export const api = { filtros, movimientos, socios, enviarImagen, enviarTexto };
