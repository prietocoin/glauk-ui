import { apiUrl } from './api-base.js';

const DEFAULT_TIMEOUT = 15000;

export class HTTPError extends Error {
  constructor(message, { status = 0, code = 'NETWORK_ERROR', body = null } = {}) {
    super(message);
    this.name = 'HTTPError';
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

export function requestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function idempotencyKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `idem-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function queryString(params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, value);
  }
  const text = query.toString();
  return text ? `?${text}` : '';
}

async function errorFrom(response) {
  const text = await response.text();
  let body = text;
  try { body = text ? JSON.parse(text) : null; } catch { /* text is fine */ }
  const message = body?.error || body?.message || `HTTP ${response.status}`;
  const code = body?.code || 'HTTP_ERROR';
  return new HTTPError(message, { status: response.status, code, body });
}

export async function request(path, options = {}) {
  const {
    method = 'GET', body, headers = {}, timeout = DEFAULT_TIMEOUT,
    idempotencyKey: idem, params, responseType = 'json', includeResponse = false
  } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const requestHeaders = {
    Accept: 'application/json',
    'X-Request-Id': headers['X-Request-Id'] || requestId(),
    ...headers
  };
  if (idem) requestHeaders['Idempotency-Key'] = idem;
  let payload;
  if (body !== undefined && body !== null) {
    if (body instanceof FormData) {
      payload = body;
    } else {
      requestHeaders['Content-Type'] ||= 'application/json';
      payload = JSON.stringify(body);
    }
  }
  try {
    const response = await fetch(`${apiUrl(path)}${queryString(params)}`, {
      method, headers: requestHeaders, body: payload,
      credentials: 'same-origin', signal: controller.signal
    });
    if (responseType === 'blob') {
      if (!response.ok) throw await errorFrom(response);
      const blob = await response.blob();
      return includeResponse
        ? { data: blob, headers: response.headers, status: response.status }
        : blob;
    }
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!response.ok) {
      const message = data?.error || data?.message || `HTTP ${response.status}`;
      throw new HTTPError(message, {
        status: response.status, code: data?.code || 'HTTP_ERROR', body: data
      });
    }
    if (data && data.success === false) {
      throw new HTTPError(data.error || data.message || 'Operación rechazada', {
        status: response.status, code: data.code || 'API_ERROR', body: data
      });
    }
    return includeResponse
      ? { data, headers: response.headers, status: response.status }
      : data;
  } catch (error) {
    if (error instanceof HTTPError) throw error;
    if (error.name === 'AbortError') {
      throw new HTTPError('Tiempo de espera agotado', { code: 'TIMEOUT' });
    }
    throw new HTTPError('No se pudo conectar con el servidor', { body: error });
  } finally {
    clearTimeout(timer);
  }
}

export const get = (path, options = {}) => request(path, { ...options, method: 'GET' });
export const post = (path, body, options = {}) => request(path, { ...options, method: 'POST', body });
export const put = (path, body, options = {}) => request(path, { ...options, method: 'PUT', body });
export const patch = (path, body, options = {}) => request(path, { ...options, method: 'PATCH', body });
export const del = (path, options = {}) => request(path, { ...options, method: 'DELETE' });

export const http = { request, get, post, put, patch, delete: del };
