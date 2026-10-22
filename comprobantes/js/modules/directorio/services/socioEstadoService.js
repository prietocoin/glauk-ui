/**
 * @file socioEstadoService.js
 * @description Manejador atómico para conmutar el switch de WhatsApp (WA) de un socio.
 */

import { apiUrl } from '../../../../../shared/js/api-base.js';

/**
 * Invierte el estado de activación de WhatsApp del socio y persiste el cambio.
 * @param {Object} socio - Objeto del socio a modificar.
 * @returns {Promise<boolean>} Nuevo estado de activación.
 */
export async function alternarEstadoSocioWA(socio) {
  if (!socio?.nombre) return false;

  let mostrarObj = typeof socio.mostrar === 'string'
    ? JSON.parse(socio.mostrar || '{}')
    : (socio.mostrar || {});
  mostrarObj = (typeof mostrarObj === 'object' && mostrarObj !== null) ? mostrarObj : {};

  const nuevoEstado = !Boolean(mostrarObj.tasas ?? socio.activo ?? true);

  socio.activo = nuevoEstado;
  mostrarObj.tasas = nuevoEstado;
  socio.mostrar = mostrarObj;

  try {
    const response = await fetch(apiUrl(`/api/socios/${encodeURIComponent(socio.nombre)}/estado`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activo: nuevoEstado
      })
    });

    const res = await response.json();
    if (!response.ok || !res.success) throw new Error(res.error || 'Error al actualizar estado');

    return nuevoEstado;
  } catch (err) {
    console.error('[socioEstadoService ❌ Error al conmutar estado]:', err);
    // Revertir cambio local si falla el backend
    socio.activo = !nuevoEstado;
    mostrarObj.tasas = !nuevoEstado;
    alert('❌ No se pudo guardar el cambio de estado.');
    return !nuevoEstado;
  }
}
