/**
 * @file directorioAccionesService.js
 * @description Acciones masivas e individuales administrativas para el directorio en glauk2.
 */

import { apiUrl } from '../../../../../shared/js/api-base.js';

/**
 * Desactiva el envío de tasas de todos los socios del directorio.
 * @returns {Promise<boolean>}
 */
export async function apagarTodosLosSocios() {
  if (!confirm('¿Deseas apagar/desactivar todas las carteleras de los socios?')) return false;
  try {
    const response = await fetch(apiUrl('/api/socios/desactivar-todos'), { method: 'PATCH' });
    const res = await response.json();
    return Boolean(response.ok && res.success);
  } catch (err) {
    console.error('[directorioAcciones ❌ Error al apagar todos]:', err);
    return false;
  }
}

/**
 * Guarda en plantilla la lista de socios activos actualmente.
 */
export async function memorizarSociosVigentes() {
  try {
    const response = await fetch(apiUrl('/api/socios/guardar-vigentes'), { method: 'POST' });
    const res = await response.json();
    if (response.ok && res.success) {
      alert('Plantilla de socios vigentes memorizada.');
    } else {
      throw new Error(res.error || 'Error al guardar vigentes');
    }
  } catch (err) {
    console.error('[directorioAcciones ❌ Error al memorizar]:', err);
    alert('❌ Error al memorizar vigentes: ' + err.message);
  }
}

/**
 * Restaura el estado de visibilidad de socios desde la plantilla memorizada.
 * @returns {Promise<boolean>}
 */
export async function restaurarSociosVigentes() {
  try {
    const response = await fetch(apiUrl('/api/socios/restaurar-vigentes'), { method: 'POST' });
    const res = await response.json();
    if (response.ok && res.success) {
      alert('Socios vigentes restaurados.');
      return true;
    }
    return false;
  } catch (err) {
    console.error('[directorioAcciones ❌ Error al restaurar]:', err);
    alert('❌ Error al restaurar vigentes: ' + err.message);
    return false;
  }
}

/**
 * Elimina un socio del directorio de forma permanente.
 * @param {string} nombreSocio - Nombre del socio.
 * @returns {Promise<boolean>}
 */
export async function eliminarSocioDelDirectorio(nombreSocio) {
  if (!nombreSocio || !confirm(`¿Eliminar permanentemente a ${nombreSocio}?`)) return false;
  try {
    const response = await fetch(apiUrl(`/api/directorio/${encodeURIComponent(nombreSocio)}`), {
      method: 'DELETE'
    });
    const res = await response.json();
    return Boolean(response.ok && res.success);
  } catch (err) {
    console.error('[directorioAcciones ❌ Error al eliminar socio]:', err);
    return false;
  }
}
