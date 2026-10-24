/**
 * @file comprobantesTasasUtils.js
 * @description Fuente única de verdad para la tasa, el tipo, la moneda y el
 * subtotal de un socio. La tarjeta y el reporte comparten estas funciones de
 * resolución; el reporte aplica además la división directa monto / tasa.
 */

import { resolverNaturalezaComprobante } from '../services/comprobantesNaturalezaService.js';
import { aNumero as numero, formatearTasaPlana } from './comprobantesNumerosUtils.js?v=20261024_06';

export function normalizarTasaComercial(valor) {
  if (valor === 'N/A') return 1;
  const num = numero(valor, 1);
  if (!(num > 0)) return 1;

  const redondeada = Math.round(num * 1e6) / 1e6;
  return redondeada > 0 ? redondeada : 1;
}

/**
 * Formatea la tasa en formato decimal plano, sin comas de miles.
 *
 * - Entera: "1000", "1600", "3038".
 * - Fraccionaria: truncada a dos decimales con punto, "3.52".
 *
 * La antigua política por divisa (ARS entera, PEN con decimales) se retiró:
 * ahora la regla depende solo de si el valor es entero, y nunca se redondea.
 *
 * @param {number|string} valor Tasa ya proyectada por el Core.
 */
export function formatearTasaComercial(valor) {
  const num = numero(valor, NaN);
  return formatearTasaPlana(num);
}

/**
 * Tasa del lado del socio auditado, tal como la proyecta la tarjeta.
 * Orden de claves: tasa_1/tasa_2 del contrato canónico y alias tolerados.
 */
export function resolverTasaSocio(item = {}, posicion = 1) {
  const esSocio2 = Number(posicion) === 2;
  const bruta = esSocio2
    ? (item?.tasa_2 ?? item?.tasa2 ?? item?.tasa)
    : (item?.tasa_1 ?? item?.tasa1 ?? item?.tasa);
  return normalizarTasaComercial(bruta);
}

/**
 * Divisa con la que se cotiza la tasa: la del comprobante, no la moneda base
 * del socio. Para NELSY en ARS la tasa se publica como 1,664 / 1,600.
 */
export function resolverMonedaTasa(item = {}) {
  return String(item?.moneda || item?.moneda_local || '').trim().toUpperCase();
}

/**
 * Tipo resuelto por la jerarquía central de naturaleza.
 * Se conserva el nombre histórico para no romper los consumidores existentes.
 */
export function resolverTipoComprobante(item = {}) {
  return resolverNaturalezaComprobante(item);
}

/**
 * Moneda base del socio (la del subtotal). No se usa para formatear la tasa.
 */
export function resolverMonedaSocio(item = {}, posicion = 1) {
  const esSocio2 = Number(posicion) === 2;
  const moneda = esSocio2
    ? (item?.moneda_socio_2 || item?.moneda_base_socio2 || item?.moneda)
    : (item?.moneda_socio_1 || item?.moneda_base_socio1 || item?.moneda);
  return String(moneda || '').trim().toUpperCase();
}

/**
 * Subtotal firmado del socio, copiado directamente del Core/tarjeta.
 *
 * - `m1_socio`/`m2_socio` ya vienen computados por el mapeador.
 * - La polaridad se aplica solo cuando existe de forma explícita; si no, el
 *   importe del backend ya incorpora el signo y se respeta tal cual.
 * - Prohibido dividir el monto del recibo entre la tasa.
 */
export function resolverSubtotalSocio(item = {}, posicion = 1) {
  const esSocio2 = Number(posicion) === 2;
  const bruto = esSocio2
    ? (item?.m2_socio ?? item?.monto_2 ?? item?.monto2 ?? item?.me2)
    : (item?.m1_socio ?? item?.monto_1 ?? item?.monto1 ?? item?.me1);
  if (bruto === null || bruto === undefined || bruto === '') return 0;

  const valor = numero(bruto, 0);
  const polaridad = esSocio2
    ? (item?.polaridad_2 ?? item?.polaridad_socio_2 ?? item?.t2_polaridad ?? item?.grupo_2?.polaridad)
    : (item?.polaridad_1 ?? item?.polaridad_socio_1 ?? item?.t1_polaridad ?? item?.grupo_1?.polaridad);

  if (polaridad === null || polaridad === undefined || String(polaridad).trim() === '') {
    return valor;
  }

  const signo = String(polaridad).trim().startsWith('-') ? -1 : 1;
  return Math.abs(valor) * signo;
}
