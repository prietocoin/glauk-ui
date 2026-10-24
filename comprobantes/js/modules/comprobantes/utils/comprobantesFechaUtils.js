/**
 * @file comprobantesFechaUtils.js
 * @description Rangos de fecha compartidos por Comprobantes y Reportes.
 */

const ZONA_REPORTE = 'America/Caracas';

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

/**
 * Suma o resta días a una fecha ISO (YYYY-MM-DD) sin depender de la zona
 * horaria del navegador. Se usa para ampliar la ventana de consulta del
 * backend y luego filtrar por el día real de Caracas.
 */
export function sumarDiasISO(fechaISO, dias = 1) {
  const match = String(fechaISO || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '';

  const fecha = new Date(Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]) + Number(dias || 0)
  ));
  return fecha.toISOString().slice(0, 10);
}

/**
 * Devuelve la fecha (YYYY-MM-DD) del comprobante en America/Caracas.
 *
 * El mapeador ya entrega `fecha_hora_comprobante` como hora de Caracas sin
 * zona (YYYY-MM-DDTHH:mm), así que ese valor se usa tal cual. Para filas
 * crudas con ISO/Z o timestamp se convierte explícitamente a Caracas: un
 * abono del 24/10 00:41Z pertenece al 23/10 en Caracas.
 */
export function fechaCaracasISO(item = {}) {
  const raw = item?.fecha_hora_comprobante
    || item?.fecha_hora_iso
    || item?.fecha_recibo
    || item?.fecha
    || item?.fecha_proceso
    || item?.created_at
    || item?.timestamp_msg;
  if (raw === null || raw === undefined || raw === '') return '';

  const texto = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto;

  // Fila ya mapeada: la hora está expresada directamente en Caracas.
  const mapeada = Boolean(item?.fecha_hora_input || item?.fecha_fmt || item?.dia_hora_humano);
  const sinZona = texto.match(/^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}(?::\d{2})?$/);
  if (mapeada && sinZona) return sinZona[1];

  let fecha;
  if (/^\d+$/.test(texto)) {
    const num = Number(texto);
    fecha = new Date(num < 1e10 ? num * 1000 : num);
  } else {
    fecha = new Date(texto.includes('T') ? texto : texto.replace(' ', 'T'));
  }
  if (isNaN(fecha.getTime())) return '';

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_REPORTE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(fecha);
}

/**
 * Indica si el comprobante cae dentro del rango inclusivo de días de Caracas.
 * Las filas sin fecha se conservan para no ocultar información por un dato
 * incompleto.
 */
export function dentroRangoCaracas(item = {}, fechaInicio = '', fechaFin = '') {
  const fecha = fechaCaracasISO(item);
  if (!fecha) return true;

  const inicio = String(fechaInicio || '').trim().slice(0, 10);
  const fin = String(fechaFin || '').trim().slice(0, 10);
  if (inicio && fecha < inicio) return false;
  if (fin && fecha > fin) return false;
  return true;
}

export function obtenerRangoMesActualCaracas() {
  const timeZone = ZONA_REPORTE;
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
