/**
 * @file comprobantesReporteState.js
 * @description Estado independiente del reporte individual por socio. No altera
 * el filtro ni el listado principal del Dashboard.
 */

import { cargarComprobantesFiltrados } from '../services/comprobantesCargaService.js';
import {
  calcularMovimientoFiltradoTotal,
  obtenerMovimientoSocio
} from '../services/saldosCalculatorService.js';
import { obtenerSaldoAnteriorSocio } from '../services/comprobantesSaldosService.js';
import { normalizarSocio, obtenerPosicionSocio } from '../utils/comprobantesSocioUtils.js';
import { obtenerRangoMesActualCaracas } from '../utils/comprobantesFechaUtils.js';

function numero(valor, fallback = 0) {
  const num = parseFloat(valor);
  return Number.isFinite(num) ? num : fallback;
}

function formatearFechaReporte(item = {}) {
  const raw = item.fecha_hora_comprobante || item.timestamp_msg;
  if (!raw) return '-';

  const texto = String(raw);
  const fecha = /^\d+$/.test(texto)
    ? new Date(Number(texto) < 1e10 ? Number(texto) * 1000 : Number(texto))
    : /^\d{4}-\d{2}-\d{2}$/.test(texto)
      ? new Date(`${texto}T00:00:00`)
      : new Date(raw);

  if (isNaN(fecha.getTime())) return '-';
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${fecha.getFullYear()}`;
}

export function createComprobantesReporteState() {
  const { fechaInicio: inicioMes, fechaFin: finMes } = obtenerRangoMesActualCaracas();

  return {
    modalReporteAbierto: false,
    generandoImagen: false,
    anchoReporte: 1080,
    reporteSocio: '',
    reporteFechaInicio: inicioMes,
    reporteFechaFin: finMes,
    reporteItems: [],
    reporteSaldoAnterior: 0,
    reporteCargando: false,
    reporteSolicitudActual: 0,
    reportePaginaActual: 1,
    reporteItemsPorPagina: 10,

    get reporteMovimientoTotal() {
      return calcularMovimientoFiltradoTotal(this.reporteItems, this.reporteSocio);
    },

    get reporteSaldoFinal() {
      return (numero(this.reporteSaldoAnterior) || 0) + this.reporteMovimientoTotal;
    },

    get reporteTotalPaginas() {
      return Math.max(1, Math.ceil(this.reporteItems.length / this.reporteItemsPorPagina));
    },

    get reportePaginaSegura() {
      return Math.min(Math.max(1, Number(this.reportePaginaActual) || 1), this.reporteTotalPaginas);
    },

    get reporteItemsPagina() {
      const inicio = (this.reportePaginaSegura - 1) * this.reporteItemsPorPagina;
      return this.reporteItems.slice(inicio, inicio + this.reporteItemsPorPagina);
    },

    get reporteMovimientoAntesPagina() {
      const fin = (this.reportePaginaSegura - 1) * this.reporteItemsPorPagina;
      return this.reporteItems
        .slice(0, fin)
        .reduce((sum, item) => sum + obtenerMovimientoSocio(item, this.reporteSocio), 0);
    },

    get reporteMovimientoPagina() {
      return this.reporteItemsPagina
        .reduce((sum, item) => sum + obtenerMovimientoSocio(item, this.reporteSocio), 0);
    },

    get reporteSaldoAnteriorPagina() {
      return (numero(this.reporteSaldoAnterior) || 0) + this.reporteMovimientoAntesPagina;
    },

    get reporteSaldoFinalPagina() {
      return this.reporteSaldoAnteriorPagina + this.reporteMovimientoPagina;
    },

    get reporteRangoTexto() {
      if (this.reporteFechaInicio && this.reporteFechaFin) {
        return `${this.reporteFechaInicio} al ${this.reporteFechaFin}`;
      }
      return 'Mes en curso';
    },

    get reporteMoneda() {
      const objetivo = normalizarSocio(this.reporteSocio);
      const socio = (this.directorio || []).find(d => normalizarSocio(d?.nombre) === objetivo);
      if (socio) {
        const moneda = socio.moneda_base || socio.moneda_socio || socio.moneda;
        if (moneda) return String(moneda).toUpperCase();
      }

      const item = this.reporteItems[0];
      return String(item?.moneda_socio_1 || item?.moneda_socio_2 || item?.moneda || 'USDT').toUpperCase();
    },

    async abrirReporteSocio(nombre = '') {
      const socio = String(nombre || '').trim();
      if (!socio) return;

      this.reporteSocio = socio;
      this.reporteFechaInicio = this.filtroFechaInicio || inicioMes;
      this.reporteFechaFin = this.filtroFechaFin || finMes;
      this.reporteSaldoAnterior = obtenerSaldoAnteriorSocio(this.directorio, socio);
      this.reporteItems = [];
      this.reportePaginaActual = 1;
      this.modalReporteAbierto = true;
      this.anchoReporte = 1080;

      return this.cargarReporteSocio();
    },

    async cargarReporteSocio() {
      const socio = String(this.reporteSocio || '').trim();
      if (!socio) {
        this.reporteItems = [];
        return;
      }

      const token = ++this.reporteSolicitudActual;
      this.reporteCargando = true;
      this.reporteItems = [];

      try {
        const items = await cargarComprobantesFiltrados({
          socio,
          fechaInicio: this.reporteFechaInicio,
          fechaFin: this.reporteFechaFin,
          orden: 'fecha_asc'
        }, {
          maximo: Number(this.capMaximoDOM) || 500,
          loteActivo: this.loteActivo
        });

        if (token !== this.reporteSolicitudActual) return;

        this.reporteItems = Array.isArray(items) ? items : [];
        this.reporteSaldoAnterior = obtenerSaldoAnteriorSocio(this.directorio, socio);
        this.reportePaginaActual = Math.min(
          Math.max(1, this.reportePaginaActual),
          this.reporteTotalPaginas
        );
      } catch (err) {
        if (token === this.reporteSolicitudActual) {
          console.error('[comprobantesReporte ❌ Error al cargar reporte]:', err);
          this.reporteItems = [];
        }
      } finally {
        if (token === this.reporteSolicitudActual) this.reporteCargando = false;
      }
    },

    recargarReporte() {
      this.reportePaginaActual = 1;
      return this.cargarReporteSocio();
    },

    reportePaginaAnterior() {
      if (this.reportePaginaSegura > 1) this.reportePaginaActual = this.reportePaginaSegura - 1;
    },

    reportePaginaSiguiente() {
      if (this.reportePaginaSegura < this.reporteTotalPaginas) {
        this.reportePaginaActual = this.reportePaginaSegura + 1;
      }
    },

    reporteMovimientoItem(item) {
      return obtenerMovimientoSocio(item, this.reporteSocio);
    },

    reporteMontoItem(item) {
      return Math.abs(this.reporteMovimientoItem(item));
    },

    reporteMontoOriginalItem(item) {
      return Math.abs(numero(item?.monto ?? item?.monto_local, 0));
    },

    reporteMonedaOriginalItem(item) {
      return String(item?.moneda || this.reporteMoneda).toUpperCase();
    },

    reporteSignoItem(item) {
      return this.reporteMovimientoItem(item) < 0 ? '-' : '+';
    },

    reportePosicionItem(item) {
      return obtenerPosicionSocio(item, this.reporteSocio);
    },

    reporteTasaItem(item) {
      const posicion = this.reportePosicionItem(item);
      const tasa = posicion === 2
        ? numero(item?.tasa_2, 1)
        : numero(item?.tasa_1, 1);
      return tasa > 0 ? tasa : 1;
    },

    reporteMonedaItem(item) {
      const posicion = this.reportePosicionItem(item);
      const moneda = posicion === 2
        ? (item?.moneda_socio_2 || item?.moneda)
        : (item?.moneda_socio_1 || item?.moneda);
      return String(moneda || this.reporteMoneda).toUpperCase();
    },

    reporteTipoItem(item) {
      return String(item?.tipo_op || item?.tipo_manual || 'D').split('-')[0].toUpperCase();
    },

    reporteHashItem(item) {
      return String(item?.hash_corto || item?.hash_largo || '').slice(0, 7);
    },

    reporteTitularItem(item) {
      return String(item?.titular || item?.banco || '-').trim();
    },

    reporteBancoItem(item) {
      return String(item?.banco || '-').trim();
    },

    reporteFechaItem(item) {
      return formatearFechaReporte(item);
    }
  };
}
