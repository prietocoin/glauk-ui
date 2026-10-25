/**
 * @file saldosCalculatorService.js
 * @description Servicio matemático puro para cálculo algebraico de saldos y movimientos desde comprobantes_final.
 */
import { filtrarComprobantesPorRango } from '../utils/saldosFilterUtils.js?v=20261025_01';
import { truncar2 } from '../utils/comprobantesNumerosUtils.js?v=20261025_01';
import {
  normalizarSocio,
  obtenerNombresSocio,
  obtenerPosicionSocio
} from '../utils/comprobantesSocioUtils.js?v=20261025_01';

/**
 * Movimiento firmado de un socio en un comprobante. Devuelve 0 si el socio no
 * participa en la fila, evitando sumar el lado 1 por defecto.
 */
export function obtenerMovimientoSocio(item = {}, socioTarget = '') {
  if (!item) return 0;

  const normalizado = normalizarSocio(socioTarget);
  const target = ['', 'TODOS', 'TODOS LOS SOCIOS', 'GENERAL'].includes(normalizado)
    ? ''
    : normalizado;
  if (target) {
    const participa = obtenerNombresSocio(item, 1).has(target)
      || obtenerNombresSocio(item, 2).has(target);
    if (!participa) return 0;
  }

  const posicion = obtenerPosicionSocio(item, target);
  const valor = posicion === 2
    ? parseFloat(item.me2 ?? item.m2_socio ?? item.monto_2 ?? item.monto2 ?? item.monto ?? 0) || 0
    : parseFloat(item.me1 ?? item.m1_socio ?? item.monto_1 ?? item.monto1 ?? item.monto ?? 0) || 0;

  // El signo ya viene en el importe congelado. No se multiplica otra vez por
  // polaridad_1/2: eso invertiría los abonos y los pagos.
  return valor;
}

/**
 * Suma o resta los movimientos de un socio en específico considerando su polaridad.
 */
export function calcularMovimientoFiltradoTotal(comprobantes = [], socioTarget = '') {
  if (!Array.isArray(comprobantes)) return 0;
  return comprobantes.reduce((sum, item) => sum + obtenerMovimientoSocio(item, socioTarget), 0);
}

/**
 * Resumen consolidado de socios con saldos pendientes activos.
 */
export function calcularSociosPendientesConsolidado(directorio = [], comprobantes = [], filtros = {}) {
  if (!Array.isArray(directorio)) return [];

  const compFiltrados = filtrarComprobantesPorRango(comprobantes, filtros);

  return directorio
    .filter(socio => {
      let mostrarObj = socio.mostrar;
      if (typeof mostrarObj === 'string') {
        try { mostrarObj = JSON.parse(mostrarObj); } catch (e) { mostrarObj = {}; }
      }
      return (mostrarObj?.dashboard ?? true) !== false;
    })
    .map(socio => {
      const nombreUpper = normalizarSocio(socio.nombre);
      const saldoBase = parseFloat(socio.saldo_inicial ?? socio.saldo_anterior) || 0;
      const movimientoHistorico = nombreUpper
        ? compFiltrados.reduce(
          (acc, item) => acc + obtenerMovimientoSocio(item, nombreUpper),
          0
        )
        : 0;
      const saldoFinal = truncar2(saldoBase + movimientoHistorico);

      return {
        nombre: socio.nombre,
        moneda: (socio.moneda_base || socio.moneda_socio || 'USDT').toUpperCase(),
        saldoBase,
        movimientoHistorico,
        saldoFinal
      };
    })
    .filter(s => Math.abs(s.saldoFinal) >= 0.01);
}
