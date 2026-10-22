/**
 * =================================================================
 * @file comprobantesSaldosService.js
 * @path public/js/modules/comprobantes/services/comprobantesSaldosService.js
 * @description Servicio atómico para resolución de saldos e identificación de sujetos.
 * =================================================================
 */

import { normalizarSocio } from '../utils/comprobantesSocioUtils.js';

export function obtenerSaldoAnteriorSocio(directorio = [], socioNombre = '') {
  const socioNom = normalizarSocio(socioNombre);
  if (!socioNom || socioNom === 'TODOS' || socioNom === 'TODOS LOS SOCIOS' || socioNom === 'GENERAL') {
    return 0;
  }

  const socioFound = (directorio || []).find(d => {
    const nom = typeof d === 'string' ? d : (d?.nombre || '');
    return normalizarSocio(nom) === socioNom;
  });

  if (typeof socioFound === 'object' && socioFound !== null) {
    const saldoVal = socioFound.saldo_inicial ?? socioFound.saldo_anterior;
    return (saldoVal !== undefined && saldoVal !== null) ? parseFloat(saldoVal) || 0 : 0;
  }

  return 0;
}

/**
 * Servicio puro: Resuelve el nombre del sujeto auditado a mostrar en el KPI.
 * Retorna 'TODOS LOS SOCIOS' únicamente cuando el filtro esté vacío o sea 'TODOS'.
 */
export function obtenerSujetoAuditado(filtroSocio = '') {
  if (!filtroSocio) return 'TODOS LOS SOCIOS';
  const str = normalizarSocio(filtroSocio);
  if (!str || str === 'TODOS' || str === 'TODOS LOS SOCIOS' || str === 'GENERAL') {
    return 'TODOS LOS SOCIOS';
  }
  return str;
}
