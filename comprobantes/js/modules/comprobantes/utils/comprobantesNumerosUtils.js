/**
 * @file comprobantesNumerosUtils.js
 * @description Formato numérico plano de la interfaz de comprobantes: sin
 * separadores de miles y con truncamiento contable estricto a dos decimales.
 * Es la fuente única de `formatMonto`, `formatTasa` y del reporte de socios.
 */

/**
 * Parseo tolerante de importes que llegan como número o texto formateado.
 * Acepta "1,600", "155,457.00" y "155.457,00". Devuelve `fallback` si el
 * valor no es numérico.
 */
export function aNumero(valor, fallback = 0) {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : fallback;
  if (valor === null || valor === undefined) return fallback;

  const texto = String(valor).trim();
  if (!texto) return fallback;

  const limpio = /^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(texto)
    ? texto.replace(/,/g, '')
    : texto.replace(/\.(?=\d{3}\b)/g, '').replace(',', '.');

  const num = parseFloat(limpio);
  return Number.isFinite(num) ? num : fallback;
}

/**
 * Truncamiento estricto hacia cero a dos decimales, sin Math.round.
 *
 * Se desplaza el punto con una cadena exponencial (`4.29` -> `"4.29e2"` ->
 * `429`) en lugar de multiplicar por 100: la multiplicación binaria produce
 * `4.29 * 100 = 428.99999999999994` y truncaría a 4.28 en vez de 4.29.
 */
export function truncar2(valor) {
  const num = aNumero(valor, NaN);
  if (!Number.isFinite(num)) return 0;

  const signo = num < 0 ? -1 : 1;
  const abs = Math.abs(num);
  const desplazado = Number(`${abs}e2`);

  // Notación exponencial ya presente (1e+21) o valores fuera de rango: se usa
  // la vía aritmética como respaldo para no devolver NaN.
  if (!Number.isFinite(desplazado)) {
    return signo * (Math.trunc(abs * 100) / 100);
  }

  const truncado = Math.trunc(desplazado);
  const resultado = Number(`${truncado}e-2`);
  return signo * (Number.isFinite(resultado) ? resultado : truncado / 100);
}

/**
 * Monto plano: dos decimales truncados y sin comas de miles.
 * Ejemplos: "13720.00", "114600.00", "117765.86".
 */
export function formatearMontoPlano(valor) {
  return truncar2(valor).toFixed(2);
}

/**
 * Tasa plana: entera tal cual ("1000", "1600", "3038"); fraccionaria truncada
 * a dos decimales con punto ("3.52", "0.99"). Nunca usa comas de miles.
 */
export function formatearTasaPlana(valor) {
  const num = aNumero(valor, NaN);
  if (!Number.isFinite(num)) return '';
  if (Number.isInteger(num)) return String(num);
  return truncar2(num).toFixed(2);
}
