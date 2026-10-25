import { get, post, patch, del } from '../../shared/js/http.js';

const BASE = '/api/v1/perfiles';

// GET /api/v1/perfiles responde un array raíz, no un envelope {success,data}.
export const listar = () => get(BASE).then((datos) => (Array.isArray(datos) ? datos : []));

// POST /api/v1/perfiles/guardar responde {success,data}; el panel recarga el
// directorio y no consume el perfil devuelto.
export const guardar = (payload) => post(`${BASE}/guardar`, payload);

export const toggle = (nombre, activo) =>
  patch(`${BASE}/${encodeURIComponent(nombre)}/estado`, { activo });

export const eliminar = (nombre) => del(`${BASE}/${encodeURIComponent(nombre)}`);

// Lote activo de tasas: alimenta la píldora "base" y el cálculo en vivo del
// spread en las tarjetas de moneda del modal.
export const tasasUltimas = () => get('/api/tasas/ultimas');

export const apagarTodos = () => post(`${BASE}/apagar-todos`);
export const memorizar = () => post(`${BASE}/plantilla/memorizar`);
export const restaurar = () => post(`${BASE}/plantilla/restaurar`);

export const api = {
  listar, guardar, toggle, eliminar, apagarTodos, memorizar, restaurar, tasasUltimas
};
