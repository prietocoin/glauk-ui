/**
 * @file formatters.js
 * @description Regla universal de presentación de tasas y montos contables.
 *
 * Tasas:
 *   > 99.99        -> entero truncado ("1634")
 *   1.00 .. 99.99  -> dos decimales truncados ("5.30")
 *   < 1.00         -> tres cifras significativas truncadas ("0.985")
 *
 * Montos:
 *   siempre dos decimales truncados, sin separadores de miles ("1742.20").
 *
 * Prohibido redondear: no se usa Math.round en ningún punto.
 */

/**
 * Trunca hacia cero con desplazamiento decimal por cadena, evitando el error
 * binario de `4.29 * 100 = 428.99999999999994`.
 */
export function truncarDecimales(valor, decimales = 0) {
  const num = Number(valor);
  if (!Number.isFinite(num)) return 0;

  const lugares = Math.max(0, Math.trunc(decimales));
  const signo = num < 0 ? -1 : 1;
  const abs = Math.abs(num);
  const desplazado = Number(`${abs}e${lugares}`);

  if (!Number.isFinite(desplazado)) {
    const factor = Math.pow(10, lugares);
    return signo * (Math.trunc(abs * factor) / factor);
  }

  return signo * (Math.trunc(desplazado) / Math.pow(10, lugares));
}

/** Formato universal de tasa según magnitud. */
export function formatTasa(valor) {
  const num = Number(valor);
  if (!Number.isFinite(num) || num === 0) return '0';

  const abs = Math.abs(num);
  if (abs > 99.99) return String(Math.trunc(num));
  if (abs >= 1) return truncarDecimales(num, 2).toFixed(2);

  const orden = Math.floor(Math.log10(abs));
  const decimales = Math.max(0, 3 - 1 - orden);
  return truncarDecimales(num, decimales).toFixed(decimales);
}

/** Monto contable plano: dos decimales truncados, sin comas. */
export function formatMontoContable(valor) {
  const num = Number(valor);
  if (!Number.isFinite(num)) return '0.00';
  return truncarDecimales(num, 2).toFixed(2);
}
