/**
 * @file comprobantesFormatters.js
 * @description Funciones puras atómicas para formateo visual e insignias de comprobantes.
 */

import { formatearMontoPlano } from './comprobantesNumerosUtils.js?v=20261025_01';

import {
  formatearTasaComercial,
  resolverTasaSocio,
  resolverTipoComprobante
} from './comprobantesTasasUtils.js?v=20261025_01';

export {
  formatearTasaComercial,
  resolverTasaSocio,
  resolverTipoComprobante,
  resolverMonedaTasa,
  resolverMonedaSocio,
  resolverSubtotalSocio,
  normalizarTasaComercial
} from './comprobantesTasasUtils.js?v=20261025_01';

/**
 * Monto plano de la interfaz: 2 decimales truncados, sin comas de miles.
 */
export function formatMonto(val) {
  return formatearMontoPlano(val);
}

/**
 * Tasa plana: entera tal cual (1600, 3038) y fraccionaria truncada a 2
 * decimales (3.52). Sin separadores de miles ni redondeo.
 */
export function formatTasa(val, moneda = '', tipo = '') {
  return formatearTasaComercial(val, moneda, tipo);
}

export function obtenerME1(item) {
  if (!item) return 0;
  return item.me1 !== undefined && item.me1 !== null
    ? item.me1
    : (item.monto_1 !== undefined ? item.monto_1 : item.monto || 0);
}

export function obtenerME2(item) {
  if (!item) return 0;
  return item.me2 !== undefined && item.me2 !== null
    ? item.me2
    : (item.monto_2 !== undefined ? item.monto_2 : 0);
}

export function obtenerTasaSocioCalculada(item, numSocio) {
  return resolverTasaSocio(item, numSocio);
}

export function claseInsignia(tipoOp) {
  const t = resolverTipoComprobante({ tipo_manual: tipoOp });
  if (t === 'D') return 'bg-emerald-950 text-emerald-300 border-emerald-500/40';
  if (t === 'P') return 'bg-rose-950 text-rose-300 border-rose-500/40';
  if (t === 'A') return 'bg-cyan-950 text-cyan-300 border-cyan-500/40';
  return 'bg-slate-800 text-slate-300 border-slate-600';
}

/**
 * 🟢 CORREGIDO: Soporta ISO string, Datetime SQL y Timestamps Unix (numéricos o string)
 * Formatea a "Día HH:MM AM/PM" (ej: Jueves 09:37 AM)
 */
export function formatDiaHora(fechaStr) {
  if (!fechaStr) return 'S/F';

  let date;

  // A) Si es un Timestamp numérico o string numérico puro (ej: "1791675914")
  const parsedNum = Number(fechaStr);
  if (!isNaN(parsedNum) && parsedNum > 0) {
    const ms = parsedNum < 10000000000 ? parsedNum * 1000 : parsedNum;
    date = new Date(ms);
  } else if (typeof fechaStr === 'string') {
    // B) Cadena de texto ISO o SQL (remplaza espacio por T)
    const iso = fechaStr.includes('T') ? fechaStr : fechaStr.replace(' ', 'T');
    date = new Date(iso);
  }

  if (!date || isNaN(date.getTime())) return 'S/F';

  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const diaNombre = dias[date.getDay()];

  let horas = date.getHours();
  const minutos = String(date.getMinutes()).padStart(2, '0');
  const ampm = horas >= 12 ? 'PM' : 'AM';

  horas = horas % 12;
  horas = horas ? horas : 12; // La hora '0' pasa a ser '12'

  return `${diaNombre} ${String(horas).padStart(2, '0')}:${minutos} ${ampm}`;
}
