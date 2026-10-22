/**
 * @file directorioService.js
 * @description Servicio de consulta y normalización del directorio de socios.
 * Mapea la estructura JSONB 'mostrar' proveniente de PostgreSQL hacia las banderas
 * 'activo' y 'mostrar_dashboard' para la UI.
 */

import { apiUrl } from '../../../../../shared/js/api-base.js';

/**
 * Obtiene y normaliza la lista completa de socios del directorio.
 * @returns {Promise<Array>}
 */
export async function obtenerDirectorioNormalizado() {
  try {
    const response = await fetch(apiUrl('/api/directorio'));
    if (!response.ok) throw new Error('Error al consultar el directorio');

    const rawList = await response.json();
    if (!Array.isArray(rawList)) return [];

    return rawList.map(s => {
      let mostrarObj = s.mostrar;
      if (typeof mostrarObj === 'string') {
        try { mostrarObj = JSON.parse(mostrarObj); } catch (e) { mostrarObj = {}; }
      }
      mostrarObj = (typeof mostrarObj === 'object' && mostrarObj !== null) ? mostrarObj : {};

      const estaActivo = mostrarObj.tasas ?? s.activo ?? true;

      return {
        ...s,
        mostrar: mostrarObj,
        activo: Boolean(estaActivo),
        mostrar_dashboard: Boolean(mostrarObj.dashboard ?? s.mostrar_dashboard ?? true)
      };
    });
  } catch (err) {
    console.error('[directorioService ❌ Error al cargar directorio]:', err);
    return [];
  }
}
