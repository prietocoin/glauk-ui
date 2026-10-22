/**
 * @file tasasMercadoService.js
 * @description Servicio atómico de lectura de la tasa oficial vigente en producción.
 */

import { apiUrl } from '../../../../../shared/js/api-base.js';

/**
 * Consulta la última tasa oficial de mercado publicada en producción.
 * @returns {Promise<{id_tasa: string, tasas: Object}>}
 */
export async function obtenerTasasVigentes() {
  try {
    const response = await fetch(apiUrl('/api/v1/tasas/monitor'));
    if (!response.ok) throw new Error('Error al consultar tasas vigentes');

    const res = await response.json();
    if (!res) return { id_tasa: '', tasas: {} };

    return {
      id_tasa: res.id_tasa || '',
      tasas: res.tasas || {}
    };
  } catch (err) {
    console.error('[tasasMercadoService ❌ Error al cargar tasas mercado]:', err);
    return { id_tasa: '', tasas: {} };
  }
}
