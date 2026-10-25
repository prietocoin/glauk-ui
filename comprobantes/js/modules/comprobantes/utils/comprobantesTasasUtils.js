/**
 * @file comprobantesTasasUtils.js
 * @description Lectura de las tasas, el tipo y el subtotal que ya proyectó el
 * backend. No aplica spreads, no redondea y no reconstruye la polaridad.
 */

import { aNumero as numero, formatearTasaPlana } from './comprobantesNumerosUtils.js?v=20261025_01';

/**
 * La tasa del backend ya está truncada por el snapshot. Solo se valida que sea
 * numérica; no se redondea ni se sustituye por 1.
 */
export function normalizarTasaComercial(valor) {
  const num = numero(valor, 0);
  return Number.isFinite(num) && num > 0 ? num : 0;
}

/**
 * Formatea la tasa en formato decimal plano, sin comas de miles.
 * Es presentación: el valor viene del backend.
 */
export function formatearTasaComercial(valor) {
  return formatearTasaPlana(numero(valor, NaN));
}

/**
 * Tasa del lado del socio tal como la proyecta el backend.
 */
export function resolverTasaSocio(item = {}, posicion = 1) {
  const esSocio2 = Number(posicion) === 2;
  const bruta = esSocio2
    ? (item?.tasa_2 ?? item?.tasa2)
    : (item?.tasa_1 ?? item?.tasa1);
  return normalizarTasaComercial(bruta);
}

/**
 * Divisa con la que se cotiza la tasa: la del comprobante.
 */
export function resolverMonedaTasa(item = {}) {
  return String(item?.moneda || item?.moneda_local || '').trim().toUpperCase();
}

/**
 * Tipo de operación congelado por el backend. Se acepta el alias histórico
 * `tipo_manual`, pero nunca se consulta la tabla de perfiles. Para el socio 2
 * se prefiere `tipo_op2` cuando existe.
 */
export function resolverTipoComprobante(item = {}, posicion = 1) {
  const esSocio2 = Number(posicion) === 2;
  const bruto = esSocio2
    ? (item?.tipo_op2 || item?.tipo_op1 || item?.tipo_op || item?.tipo_manual || item?.tipo || 'D')
    : (item?.tipo_op1 || item?.tipo_op2 || item?.tipo_op || item?.tipo_manual || item?.tipo || 'D');
  const letra = String(bruto).trim().split('-')[0].toUpperCase();
  return letra === 'A' || letra === 'P' || letra === 'D' ? letra : 'D';
}

/**
 * Moneda base del socio (la del subtotal).
 */
export function resolverMonedaSocio(item = {}, posicion = 1) {
  const esSocio2 = Number(posicion) === 2;
  const moneda = esSocio2
    ? (item?.moneda_socio_2 || item?.moneda_base_socio2 || item?.moneda)
    : (item?.moneda_socio_1 || item?.moneda_base_socio1 || item?.moneda);
  return String(moneda || '').trim().toUpperCase();
}

/**
 * Subtotal firmado del socio, copiado directamente del snapshot del backend.
 * No se multiplica por `polaridad_1/2`: el signo ya está en `me1`/`me2`.
 */
export function resolverSubtotalSocio(item = {}, posicion = 1) {
  const esSocio2 = Number(posicion) === 2;
  const bruto = esSocio2
    ? (item?.me2 ?? item?.m2_socio ?? item?.monto_2 ?? item?.monto2)
    : (item?.me1 ?? item?.m1_socio ?? item?.monto_1 ?? item?.monto1);
  return numero(bruto, 0);
}
