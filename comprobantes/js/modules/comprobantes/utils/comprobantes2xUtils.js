/**
 * @file comprobantes2xUtils.js
 * @description Guardián único de comprobantes 2x.
 *
 * Regla de dominio: solo se muestran/contabilizan comprobantes con el flag 2x
 * o con emparejamiento dual válido (socio 1 y socio 2 reales) y monto mayor a
 * cero. Registros huérfanos, broadcasts, borradores o filas GENERAL se
 * descartan antes de llegar a tarjetas, KPIs o reportes.
 */

const PLACEHOLDERS_SOCIO = new Set([
  '', 'GENERAL', 'NO DEFINIDO', 'S/D', 'N/A', 'NULL', 'UNDEFINED', '-'
]);

function texto(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor).trim().toUpperCase();
}

function primerTexto(...valores) {
  for (const valor of valores) {
    const textoValor = texto(valor);
    if (textoValor) return textoValor;
  }
  return '';
}

function montoComprobante(c = {}) {
  // Mismo orden que la regla de negocio: recibo, monto de socio 1, monto base.
  const crudo = c.monto_recibo || c.monto1 || c.monto || 0;
  const numero = parseFloat(String(crudo).replace(/,/g, ''));
  return Number.isFinite(numero) ? Math.abs(numero) : 0;
}

/**
 * Valida que el comprobante cumpla la condición 2x.
 *
 * @param {Object} c Comprobante crudo o ya mapeado.
 * @returns {boolean}
 */
export function esComprobante2x(c = {}) {
  if (!c || typeof c !== 'object') return false;

  const tieneFlag2x = Boolean(
    c.es_2x || c.is_2x || c.pareado
  );

  const socio1 = primerTexto(
    c.socio_1, c.nombre_socio_1, c.socio1_alias, c.socio1
  );
  const socio2 = primerTexto(
    c.socio_2, c.nombre_socio_2, c.socio2_alias, c.socio2
  );

  const sociosValidos = !PLACEHOLDERS_SOCIO.has(socio1)
    && !PLACEHOLDERS_SOCIO.has(socio2);

  const tieneMonto = montoComprobante(c) > 0;

  return tieneFlag2x || (sociosValidos && tieneMonto);
}

export const esValido2x = esComprobante2x;

export function filtrarComprobantes2x(lista = []) {
  return Array.isArray(lista) ? lista.filter(esComprobante2x) : [];
}
