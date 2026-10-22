/**
 * @file comprobantesFechaUtils.js
 * @description Rangos de fecha compartidos por Comprobantes y Reportes.
 */

/**
 * Convierte una fecha ISO (YYYY-MM-DD), un timestamp o un Date al formato
 * latino estricto DD/MM/YYYY usado en las cabeceras y pies del reporte.
 */
export function formatearFechaLatina(valor) {
  if (valor === null || valor === undefined || valor === '') return '';

  const texto = String(valor).trim();
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;

  const fecha = valor instanceof Date ? valor : new Date(valor);
  if (isNaN(fecha.getTime())) return texto;

  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${fecha.getFullYear()}`;
}

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
