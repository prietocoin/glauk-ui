/**
 * @file despachoTasaIndividualService.js
 * @description Servicio atómico para el reenvío o disparo individual de cartelera por socio.
 * Valida lote/socio, solicita confirmación e invoca el endpoint HTTP.
 */

import { apiUrl } from '../../../../../shared/js/api-base.js';

/**
 * Dispara el envío de la cartelera de un socio específico a la API de backend.
 * @param {string} loteActivo - Identificador del lote (ej. 'T052').
 * @param {Object} socioObj - Objeto con la información básica del socio.
 * @param {boolean|null} fuerzaModoPrueba - Sobrescritura opcional proveniente del modal.
 * @returns {Promise<boolean>} 'true' si el despacho fue exitoso.
 */
export async function despacharTasaIndividual(loteActivo, socioObj, fuerzaModoPrueba = null) {
  if (!loteActivo) {
    alert('No hay un lote activo en producción para enviar.');
    return false;
  }
  if (!socioObj?.nombre) {
    alert('No se ha definido un socio válido para enviar.');
    return false;
  }

  const esPrueba = Boolean(fuerzaModoPrueba);
  const modoTexto = esPrueba ? '🧪 [GRUPO PRUEBA]' : '🚀 [PRODUCCIÓN]';

  const confirmacion = confirm(`⚡ ¿Enviar cartelera [${loteActivo}] para ${socioObj.nombre} ${modoTexto}?`);
  if (!confirmacion) return false;

  try {
    const response = await fetch(apiUrl('/api/v1/tasas/disparar'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        socio: socioObj.nombre,
        modo_prueba: esPrueba
      })
    });

    const res = await response.json();
    if (!response.ok || !res.success) throw new Error(res.error || 'Error al despachar tasa');

    alert(`✅ Cartelera de ${socioObj.nombre} despachada ${modoTexto}.`);
    return true;
  } catch (err) {
    console.error('[despachoTasaIndividual ❌]', err);
    alert('❌ Error al enviar tasa individual: ' + err.message);
    return false;
  }
}
