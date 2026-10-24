/**
 * @file saldosFilterUtils.js
 * @description Utilidades de filtrado y formateo para comprobantes.
 */

import { formatearTasaComercial } from './comprobantesTasasUtils.js';

export function formatMonto(val) {
  const num = parseFloat(val) || 0;
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatTasa(val, moneda = '', tipo = '') {
  // Delegado en la fuente única: redondeo comercial, nunca truncamiento.
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
  if (!item) return 1.0;
  return numSocio === 1 ? (item.tasa_1 || 1.0) : (item.tasa_2 || 1.0);
}

export function claseInsignia(tipoOp) {
  const t = String(tipoOp || 'D').toUpperCase().trim();
  if (t === 'D') return 'bg-emerald-950 text-emerald-300 border-emerald-500/40';
  if (t === 'P') return 'bg-rose-950 text-rose-300 border-rose-500/40';
  if (t === 'A') return 'bg-cyan-950 text-cyan-300 border-cyan-500/40';
  return 'bg-slate-800 text-slate-300 border-slate-600';
}

export function filtrarComprobantesPorRango(comprobantes, fechaInicio, fechaFin) {
  if (!Array.isArray(comprobantes)) return [];

  if (fechaInicio && typeof fechaInicio === 'object' && !(fechaInicio instanceof Date)) {
    fechaFin = fechaInicio.fechaFin ?? fechaFin;
    fechaInicio = fechaInicio.fechaInicio;
  }

  const inicio = fechaInicio ? new Date(`${String(fechaInicio).trim()}T00:00:00`) : null;
  const fin = fechaFin ? new Date(`${String(fechaFin).trim()}T23:59:59`) : null;
  const inicioMs = inicio && !isNaN(inicio.getTime()) ? inicio.getTime() : null;
  const finMs = fin && !isNaN(fin.getTime()) ? fin.getTime() : null;

  return comprobantes.filter(item => {
    const raw = item?.fecha_hora_comprobante || item?.timestamp_msg || item?.fecha;
    if (!raw) return true;

    const fecha = new Date(raw);
    const ms = fecha.getTime();
    if (isNaN(ms)) return true;
    if (inicioMs !== null && ms < inicioMs) return false;
    if (finMs !== null && ms > finMs) return false;
    return true;
  });
}
