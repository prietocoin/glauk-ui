/**
 * @file comprobantesReporteState.js
 * @description Estado independiente del reporte individual por socio. No altera
 * el filtro ni el listado principal del Dashboard.
 */

import { cargarComprobantesFiltrados } from '../services/comprobantesCargaService.js';
import {
  aplicarRangoHash,
  coincideSocioEstricto,
  resolverIndiceHash
} from '../services/comprobantesFilterService.js';
import { obtenerSaldoAnteriorSocio } from '../services/comprobantesSaldosService.js';
import {
  catalogoTasasComercialActual,
  obtenerCatalogoTasasComerciales,
  resolverTasaComercialItem
} from '../services/comprobantesTasasComercialesService.js';
import {
  construirCatalogoSocios,
  establecerCatalogoSocios
} from '../services/comprobantesNaturalezaService.js';
import { esComprobante2x } from '../utils/comprobantes2xUtils.js';
import { normalizarSocio, obtenerPosicionSocio } from '../utils/comprobantesSocioUtils.js';
import {
  resolverMonedaSocio,
  resolverMonedaTasa,
  resolverSubtotalSocio,
  resolverTasaSocio,
  resolverTipoComprobante
} from '../utils/comprobantesTasasUtils.js';
import {
  dentroRangoCaracas,
  fechaCaracasISO,
  formatearFechaLatina,
  obtenerRangoMesActualCaracas,
  sumarDiasISO
} from '../utils/comprobantesFechaUtils.js';

function numero(valor, fallback = 0) {
  const num = parseFloat(valor);
  return Number.isFinite(num) ? num : fallback;
}

function claveReporte(item = {}) {
  return String(item?.hash_largo || item?.id || '').trim().toLowerCase();
}

function formatearFechaReporte(item = {}) {
  const fecha = fechaCaracasISO(item);
  if (!fecha) return '-';

  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
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
    reporteCatalogoTasasListo: 0,
    reporteSaldoAnterior: 0,
    reporteCargando: false,
    reporteSolicitudActual: 0,
    reportePaginaActual: 1,
    reporteItemsPorPagina: 20,

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
      // Suma directa de los subtotales de las filas listadas. No se recalcula
      // ningún importe ni se divide el monto del recibo entre la tasa.
      return this.reporteItems.reduce(
        (sum, item) => sum + this.reporteMovimientoItem(item),
        0
      );
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
        (sum, item) => sum + this.reporteMovimientoItem(item),
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
        .reduce((sum, item) => sum + this.reporteMovimientoItem(item), 0);
    },

    get reporteMovimientoPagina() {
      return this.reporteItemsPagina
        .reduce((sum, item) => sum + this.reporteMovimientoItem(item), 0);
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
        // La naturaleza se resuelve con el catálogo del directorio antes de
        // mapear los comprobantes; así las tarjetas y el reporte comparten la
        // misma jerarquía (moneda natural -> IRIS -> caption A -> tabla).
        establecerCatalogoSocios(construirCatalogoSocios(this.directorio));

        // El catálogo comercial se carga en paralelo. Es la fuente de la tasa
        // oficial (compra/venta) que pinta la cartelera; si falla, la columna
        // TASA cae a tasa_1/tasa_2 sin bloquear el reporte.
        const catalogoPromesa = obtenerCatalogoTasasComerciales().catch(() => ({}));

        // El backend filtra por fecha UTC (creado_en). Un abono de las 20:36 de
        // Caracas se guarda como 00:36Z del día siguiente, así que se consulta
        // hasta fechaFin + 1 día y luego se recorta por el día real de Caracas.
        const finConsulta = sumarDiasISO(this.reporteFechaFin, 1) || this.reporteFechaFin;

        const items = await cargarComprobantesFiltrados({
          socio,
          fechaInicio: this.reporteFechaInicio,
          fechaFin: finConsulta,
          orden: this.reporteOrden === 'fecha_desc' ? 'fecha_desc' : 'fecha_asc'
        }, {
          // Se consulta sin el filtro de socio del backend y se resuelve en el
          // cliente para incluir ambos lados del comprobante (abonos 'A').
          maximo: 2000,
          loteActivo: this.loteActivo,
          filtroSocioEnApi: false
        });

        await catalogoPromesa;
        if (token !== this.reporteSolicitudActual) return;
        this.reporteCatalogoTasasListo += 1;

        this.reporteItemsBase = (Array.isArray(items) ? items : [])
          // Un abono 'A' puede tener al socio auditado como socio_1 o socio_2
          // (y con alias distintos): nunca debe quedar fuera.
          .filter(item => coincideSocioEstricto(item, socio))
          // La ventana UTC ampliada puede traer filas del día siguiente en
          // Caracas. Solo se listan las que pertenecen al rango auditado.
          .filter(item => dentroRangoCaracas(item, this.reporteFechaInicio, this.reporteFechaFin))
          // Guardián 2x: el reporte tampoco consume huérfanos ni filas 1x.
          .filter(esComprobante2x);
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
      // Subtotal ya computado por el Core (m1_socio/m2_socio + polaridad).
      // No se divide el monto del recibo entre la tasa ni se recalculan spreads.
      return resolverSubtotalSocio(item, this.reportePosicionItem(item));
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
      // La tasa oficial de la cartelera (compra para D, venta para P, 1.00 para
      // A) manda. Se lee de un catálogo ya computado, no se recalcula aquí.
      // Si el lote no está en el catálogo, se usa la tasa del lado del socio.
      void this.reporteCatalogoTasasListo;
      const posicion = this.reportePosicionItem(item);
      const oficial = resolverTasaComercialItem(
        item,
        posicion,
        catalogoTasasComercialActual()
      );
      return (oficial !== null && oficial > 0)
        ? oficial
        : resolverTasaSocio(item, posicion);
    },

    /**
     * Divisa con la que se cotiza la tasa (la del comprobante). Para NELSY en
     * ARS permite imprimir 1,664 / 1,600 sin truncar a 1,599.
     */
    reporteMonedaTasaItem(item) {
      return resolverMonedaTasa(item) || this.reporteMoneda;
    },

    reporteMonedaItem(item) {
      return resolverMonedaSocio(item, this.reportePosicionItem(item)) || this.reporteMoneda;
    },

    reporteTipoItem(item) {
      // Exactamente el mismo tipo resuelto que pinta la tarjeta.
      return resolverTipoComprobante(item);
    },

    reporteHashItem(item) {
      return String(item?.hash_corto || item?.hash_largo || '').slice(0, 8);
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
