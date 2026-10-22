/**
 * @file comprobantesReporteState.js
 * @description Estado independiente del reporte individual por socio. No altera
 * el filtro ni el listado principal del Dashboard.
 */

import { cargarComprobantesFiltrados } from '../services/comprobantesCargaService.js';
import { aplicarRangoHash, resolverIndiceHash } from '../services/comprobantesFilterService.js';
import {
  calcularMovimientoFiltradoTotal,
  obtenerMovimientoSocio
} from '../services/saldosCalculatorService.js';
import { obtenerSaldoAnteriorSocio } from '../services/comprobantesSaldosService.js';
import { normalizarSocio, obtenerPosicionSocio } from '../utils/comprobantesSocioUtils.js';
import { formatearFechaLatina, obtenerRangoMesActualCaracas } from '../utils/comprobantesFechaUtils.js';

function numero(valor, fallback = 0) {
  const num = parseFloat(valor);
  return Number.isFinite(num) ? num : fallback;
}

function claveReporte(item = {}) {
  return String(item?.hash_largo || item?.id || '').trim().toLowerCase();
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
    reporteSocio: '',
    reporteFechaInicio: inicioMes,
    reporteFechaFin: finMes,
    reporteDesdeHash: '',
    reporteHastaHash: '',
    reporteOrden: 'fecha_asc',
    reporteItemsBase: [],
    reporteSaldoAnterior: 0,
    reporteCargando: false,
    reporteSolicitudActual: 0,
    reportePaginaActual: 1,
    reporteItemsPorPagina: 10,

    get reporteEsDescendente() {
      return this.reporteOrden === 'fecha_desc';
    },

    /**
     * Listado visible del reporte: el rango de hashes se interpreta como un
     * intervalo inclusivo posicional sobre el orden seleccionado.
     */
    get reporteItems() {
      return aplicarRangoHash(
        this.reporteItemsBase,
        this.reporteDesdeHash,
        this.reporteHastaHash
      );
    },

    get reporteMovimientoTotal() {
      return calcularMovimientoFiltradoTotal(this.reporteItems, this.reporteSocio);
    },

    get reporteIndicesRango() {
      const items = Array.isArray(this.reporteItemsBase) ? this.reporteItemsBase : [];
      const claves = new Set(this.reporteItems.map(claveReporte).filter(Boolean));
      let inicio = -1;
      let fin = -1;

      items.forEach((item, indice) => {
        const clave = claveReporte(item);
        if (!clave || !claves.has(clave)) return;
        if (inicio === -1) inicio = indice;
        fin = indice;
      });

      return { inicio, fin };
    },

    /**
     * Saldo inmediatamente anterior al primer comprobante del intervalo
     * filtrado. Incluye los movimientos que quedaron fuera del rango de hash.
     */
    get reporteSaldoInicialRango() {
      const base = numero(this.reporteSaldoAnterior) || 0;
      const { inicio, fin } = this.reporteIndicesRango;
      if (inicio === -1) return base;

      const items = Array.isArray(this.reporteItemsBase) ? this.reporteItemsBase : [];
      // En ASC los anteriores están antes del inicio; en DESC, después del fin.
      const anteriores = this.reporteEsDescendente
        ? items.slice(fin + 1)
        : items.slice(0, inicio);

      return base + anteriores.reduce(
        (sum, item) => sum + obtenerMovimientoSocio(item, this.reporteSocio),
        0
      );
    },

    get reporteSaldoFinalRango() {
      return this.reporteSaldoInicialRango + this.reporteMovimientoTotal;
    },

    get reporteSaldoFinal() {
      return this.reporteSaldoFinalRango;
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
      // ASC: la página avanza sumando desde el saldo inicial del rango.
      // DESC: las filas van de la más reciente a la más antigua, por lo que la
      // apertura parte del saldo final y retrocede con lo ya mostrado.
      return this.reporteEsDescendente
        ? this.reporteSaldoFinalRango - this.reporteMovimientoAntesPagina
        : this.reporteSaldoInicialRango + this.reporteMovimientoAntesPagina;
    },

    get reporteSaldoFinalPagina() {
      const signo = this.reporteEsDescendente ? -1 : 1;
      return this.reporteSaldoAnteriorPagina + (signo * this.reporteMovimientoPagina);
    },

    get reporteOpcionesHash() {
      const items = Array.isArray(this.reporteItemsBase) ? this.reporteItemsBase : [];
      const vistos = new Set();
      return items.filter(item => {
        const hash = String(item?.hash_largo || item?.id || '').trim();
        if (!hash || vistos.has(hash)) return false;
        vistos.add(hash);
        return true;
      });
    },

    get reporteRangoTexto() {
      if (this.reporteFechaInicio && this.reporteFechaFin) {
        const desde = formatearFechaLatina(this.reporteFechaInicio);
        const hasta = formatearFechaLatina(this.reporteFechaFin);
        return `${desde} al ${hasta}`;
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
      this.reporteDesdeHash = this.filtroDesdeHash || '';
      this.reporteHastaHash = this.filtroHastaHash || '';
      this.reporteOrden = this.filtroOrden === 'fecha_desc' ? 'fecha_desc' : 'fecha_asc';
      this.reporteSaldoAnterior = obtenerSaldoAnteriorSocio(this.directorio, socio);
      this.reporteItemsBase = [];
      this.reportePaginaActual = 1;
      this.modalReporteAbierto = true;

      return this.cargarReporteSocio();
    },

    async cargarReporteSocio() {
      const socio = String(this.reporteSocio || '').trim();
      if (!socio) {
        this.reporteItemsBase = [];
        return;
      }

      const token = ++this.reporteSolicitudActual;
      this.reporteCargando = true;
      this.reporteItemsBase = [];

      try {
        const items = await cargarComprobantesFiltrados({
          socio,
          fechaInicio: this.reporteFechaInicio,
          fechaFin: this.reporteFechaFin,
          orden: this.reporteOrden === 'fecha_desc' ? 'fecha_desc' : 'fecha_asc'
        }, {
          maximo: Number(this.capMaximoDOM) || 500,
          loteActivo: this.loteActivo
        });

        if (token !== this.reporteSolicitudActual) return;

        this.reporteItemsBase = Array.isArray(items) ? items : [];
        this.normalizarRangoHashReporte();
        this.reporteSaldoAnterior = obtenerSaldoAnteriorSocio(this.directorio, socio);
        this.reportePaginaActual = Math.min(
          Math.max(1, this.reportePaginaActual),
          this.reporteTotalPaginas
        );
      } catch (err) {
        if (token === this.reporteSolicitudActual) {
          console.error('[comprobantesReporte ❌ Error al cargar reporte]:', err);
          this.reporteItemsBase = [];
        }
      } finally {
        if (token === this.reporteSolicitudActual) this.reporteCargando = false;
      }
    },

    recargarReporte() {
      this.reportePaginaActual = 1;
      return this.cargarReporteSocio();
    },

    reiniciarPaginaReporte() {
      this.reportePaginaActual = 1;
    },

    /**
     * Descarta límites de hash heredados del Dashboard que no existan en el
     * listado del socio, evitando controles con valores fantasma.
     */
    normalizarRangoHashReporte() {
      if (!this.reporteDesdeHash && !this.reporteHastaHash) return;
      const hashes = this.reporteItemsBase.map(item => String(item?.hash_largo || item?.id || '').trim().toLowerCase());
      if (this.reporteDesdeHash && resolverIndiceHash(hashes, this.reporteDesdeHash) === -1) {
        this.reporteDesdeHash = '';
      }
      if (this.reporteHastaHash && resolverIndiceHash(hashes, this.reporteHastaHash) === -1) {
        this.reporteHastaHash = '';
      }
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
