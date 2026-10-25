/**
 * @file tasas.js
 * @description Formato estricto de tasas para el módulo de perfiles.
 *
 * Reglas:
 *   > 99.99        -> entero truncado ("1037")
 *   1.00 .. 99.99  -> dos decimales truncados ("5.30")
 *   < 1.00         -> tres cifras significativas truncadas ("0.940")
 *
 * Sin Math.round. El desplazamiento decimal se hace por cadena para evitar
 * artefactos binarios (4.29 * 100 = 428.99999999999994).
 */

function truncarA(valor, decimales) {
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

export function formatearTasaEstricta(valor) {
  const num = Number(valor);
  if (!Number.isFinite(num) || num === 0) return '0';

  const abs = Math.abs(num);

  // REGLA 1: mayor a 99.99 -> entero truncado puro.
  if (abs > 99.99) return String(Math.trunc(num));

  // REGLA 2: entre 1.00 y 99.99 -> dos decimales truncados.
  if (abs >= 1) return truncarA(num, 2).toFixed(2);

  // REGLA 3: menor a 1.00 -> tres cifras significativas truncadas.
  const orden = Math.floor(Math.log10(abs));
  const decimales = Math.max(0, 3 - 1 - orden);
  return truncarA(num, decimales).toFixed(decimales);
}
