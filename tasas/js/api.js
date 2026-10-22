import { apiUrl } from '../../shared/js/api-base.js';

const BASE = '/api/v1/tasas';

async function solicitarJson(ruta, opciones = {}) {
  const init = { ...opciones };
  if (init.body && !init.headers) {
    init.headers = { 'Content-Type': 'application/json' };
  }
  const respuesta = await fetch(apiUrl(`${BASE}${ruta}`), init);
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok || datos.success === false) {
    throw new Error(datos.error || `Error HTTP ${respuesta.status}`);
  }
  return datos;
}

export const api = {
  monitor() {
    return solicitarJson('/monitor');
  },

  socios() {
    return solicitarJson('/socios');
  },

  borradorHoo() {
    return solicitarJson('/hoo-borrador');
  },

  guardarLote(tasas) {
    return solicitarJson('/guardar-lote', {
      method: 'POST',
      body: JSON.stringify({ tasas })
    });
  },

  publicarLote(modoPruebaGlobal) {
    return solicitarJson('/publicar-lote', {
      method: 'POST',
      body: JSON.stringify({ modo_prueba_global: modoPruebaGlobal })
    });
  },

  notificarRemesas() {
    return solicitarJson('/notificar-remesas', { method: 'POST' });
  },

  eliminarLote(idTasa) {
    return solicitarJson(`/lote/${encodeURIComponent(idTasa)}`, { method: 'DELETE' });
  },

  guardarSocio(nombre, cambios) {
    return solicitarJson(`/socios/${encodeURIComponent(nombre)}`, {
      method: 'PUT',
      body: JSON.stringify(cambios)
    });
  },

  disparar(socio, modoPrueba) {
    return solicitarJson('/disparar', {
      method: 'POST',
      body: JSON.stringify({ socio, modo_prueba: modoPrueba })
    });
  },

  async renderBlob(nombre) {
    const respuesta = await fetch(apiUrl(`${BASE}/render/${encodeURIComponent(nombre)}`));
    if (!respuesta.ok) throw new Error('Error al renderizar');
    return respuesta.blob();
  }
};
