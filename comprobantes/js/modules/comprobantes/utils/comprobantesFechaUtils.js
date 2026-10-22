/**
 * @file comprobantesFechaUtils.js
 * @description Rangos de fecha compartidos por Comprobantes y Reportes.
 */

export function obtenerRangoMesActualCaracas() {
  const timeZone = 'America/Caracas';
  const ahora = new Date();
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const primerDia = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const ultimoDia = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);

  return {
    fechaInicio: fmt.format(primerDia),
    fechaFin: fmt.format(ultimoDia)
  };
}
