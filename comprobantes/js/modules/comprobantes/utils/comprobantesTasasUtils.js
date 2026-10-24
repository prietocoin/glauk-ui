/**
 * @file comprobantesTasasUtils.js
 * @description Fuente única de verdad para la tasa, el tipo, la moneda y el
 * subtotal de un socio. La tarjeta y el reporte consumen exactamente estas
 * funciones: el reporte es un espejo pasivo y nunca recalcula importes.
 */

import { resolverNaturalezaComprobante } from '../services/comprobantesNaturalezaService.js';

// Divisas cuya cartelera comercial se publica sin decimales. En estas monedas
// la tasa se redondea comercialmente (1.599,99 -> 1.600) y jamás se trunca.
const DIVISAS_TASA_SIN_DECIMALES = new Set(['ARS', 'CLP', 'COP', 'PYG']);

// Divisas que conservan sus decimales comerciales aunque la magnitud sea alta.
const DIVISAS_TASA_CON_DECIMALES = new Set(['PEN', 'BRL', 'EUR', 'USD']);

function numero(valor, fallback = 0) {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : fallback;
  if (valor === null || valor === undefined) return fallback;

  const texto = String(valor).trim();
  if (!texto) return fallback;

  // Acepta "1,600" (miles en-US) y "1.599,99" / "3,52" (decimal latino).
  const limpio = /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(texto)
    ? texto.replace(/,/g, '')
    : texto.replace(/\.(?=\d{3}\b)/g, '').replace(',', '.');
  const num = parseFloat(limpio);
  return Number.isFinite(num) ? num : fallback;
}

/**
 * Conserva la tasa comercial exacta y solo elimina el ruido binario del
 * transporte (1599.9999999998 -> 1600). No trunca ni recorta decimales.
 */
export function normalizarTasaComercial(valor) {
  if (valor === 'N/A') return 1;
  const num = numero(valor, 1);
  if (!(num > 0)) return 1;

  const redondeada = Math.round(num * 1e6) / 1e6;
  return redondeada > 0 ? redondeada : 1;
}

/**
 * Formatea la tasa con la política comercial de la divisa del comprobante.
 *
 * @param {number|string} valor Tasa ya proyectada por el Core.
 * @param {string} moneda Divisa de la operación (ARS, PEN, USD, ...).
 * @param {string} tipo Tipo resuelto ('D', 'P', 'A'). Un abono de paridad se
 *   muestra como "1.00" para que la fila no parezca sin tasa.
 */
export function formatearTasaComercial(valor, moneda = '', tipo = '') {
  const num = numero(valor, 0);
  if (!Number.isFinite(num)) return '0.00';

  const letra = String(tipo || '').trim().split('-')[0].toUpperCase();
  if (letra === 'A' && Math.abs(num - 1) < 1e-9) return '1.00';

  const codigo = String(moneda || '').trim().toUpperCase();
  const sinDecimales = DIVISAS_TASA_SIN_DECIMALES.has(codigo);
  const conDecimales = DIVISAS_TASA_CON_DECIMALES.has(codigo);

  // Política comercial:
  //  - ARS/CLP/COP/PYG: entero desde 1 (1.600), decimales solo en paridades.
  //  - PEN/BRL/EUR/USD: siempre sus dos decimales comerciales (3.52).
  //  - Resto (VES/MXN/...): regla histórica por magnitud; 995 se publica
  //    entero y 18,80 conserva dos decimales.
  let entero;
  if (sinDecimales) {
    entero = Math.abs(num) >= 1;
  } else if (conDecimales) {
    entero = false;
  } else {
    entero = Math.abs(num) > 99.99;
  }

  return entero
    ? Math.round(num).toLocaleString('en-US', { maximumFractionDigits: 0 })
    : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
