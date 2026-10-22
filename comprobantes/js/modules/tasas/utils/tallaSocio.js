/**
 * @file tallaSocio.js
 * @description Clasificación de tallas (S, M, L) según las monedas activas del socio.
 */

/**
 * Determina la categoría de talla (S, M, L) según las monedas activas del socio.
 * @param {Object} socioObj - Datos del socio.
 * @returns {{label: string, color: string}}
 */
export function obtenerClaseTalla(socioObj) {
  let monedasObj = socioObj?.monedas;
  if (typeof monedasObj === 'string') {
    try { monedasObj = JSON.parse(monedasObj); } catch (e) { monedasObj = {}; }
  }
  monedasObj = (typeof monedasObj === 'object' && monedasObj !== null) ? monedasObj : {};

  const count = Object.keys(monedasObj).filter(k => monedasObj[k]?.activo).length || 3;

  if (count <= 3) return { label: `Talla: S [${count}]`, color: 'border-cyan-500/40 text-cyan-300 bg-cyan-950/40' };
  if (count <= 6) return { label: `Talla: M [${count}]`, color: 'border-amber-500/40 text-amber-300 bg-amber-950/40' };
  return { label: `Talla: L [${count}]`, color: 'border-purple-500/40 text-purple-300 bg-purple-950/40' };
}
