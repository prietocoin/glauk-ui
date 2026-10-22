/**
 * @file comprobantesState.js
 * Estado reactivo Alpine.js con Paginación Real Servidor + Buffer Incremental desde comprobantes_final.
 */

import {
  formatMonto, formatTasa, obtenerME1, obtenerME2,
  obtenerTasaSocioCalculada, claseInsignia, formatDiaHora
} from '../utils/comprobantesFormatters.js';

import { apiUrl } from '../../../../../shared/js/api-base.js';

import {
  calcularSociosPendientesConsolidado,
  calcularMovimientoFiltradoTotal
} from '../services/saldosCalculatorService.js';

import { eliminarComprobantePorHash } from '../services/comprobantesApiService.js';
import { cargarComprobantesFiltrados } from '../services/comprobantesCargaService.js';
import { crearAccionesModal } from '../services/comprobantesModalActions.js';
import { prepararEdicionComprobante, obtenerInsigniaRol } from '../services/comprobantesMapperService.js';
import { capturarReporteEstadoCuenta } from '../services/comprobantesReporteService.js';
import { obtenerSaldoAnteriorSocio, obtenerSujetoAuditado } from '../services/comprobantesSaldosService.js';
import { obtenerRangoMesActualCaracas } from '../utils/comprobantesFechaUtils.js';

export function comprobantesState() {
  const { fechaInicio: inicioMes, fechaFin: finMes } = obtenerRangoMesActualCaracas();

  const state = {
    todosLosItems: [],
    items: [],
    directorio: [],
    cargando: false,
    hayMasDatos: true,
    solicitudActual: 0,

    tamanoLote: 20,
    capMaximoDOM: 500,

    modalAbierto: false,
    itemEdicion: null,
    loteActivo: 'T070',

    filtroRol: '',
    filtroSocio: '',
    filtroFechaInicio: inicioMes,
    filtroFechaFin: finMes,
    filtroDesdeHash: '',
    filtroHastaHash: '',
    filtroOrden: 'fecha_desc',
    filtroHash: '',
    saldoAnterior: 0,

    obtenerSujetoAuditado,
    obtenerInsigniaRol,

    get comprobantes() {
      return this.todosLosItems;
    },

    get movimientoFiltradoTotal() {
      return calcularMovimientoFiltradoTotal(this.todosLosItems, this.filtroSocio);
    },

    get saldoActualTotal() {
      return (parseFloat(this.saldoAnterior) || 0) + this.movimientoFiltradoTotal;
    },

    get sociosPendientesConsolidado() {
      return calcularSociosPendientesConsolidado(this.directorio, this.todosLosItems, {
        fechaInicio: this.filtroFechaInicio, fechaFin: this.filtroFechaFin
      });
    },

    init() {
      this.$nextTick(() => {
        this.escucharActualizacionesGlobales();
        this.resetearYRefrescar();
        this.iniciarEscuchadoresScroll();
      });
    },

    escucharActualizacionesGlobales() {
      window.addEventListener('comprobante-actualizado', (evt) => {
        const payload = evt.detail;
        if (!payload || !payload.hash_largo) return;

        const targetHash = String(payload.hash_largo).trim().toLowerCase();

        const idxTodos = this.todosLosItems.findIndex(i => String(i.hash_largo || i.id).trim().toLowerCase() === targetHash);
        if (idxTodos !== -1) {
          this.todosLosItems[idxTodos] = prepararEdicionComprobante({
            ...this.todosLosItems[idxTodos],
            ...payload
          }, this.loteActivo);
        }

        const idxVisibles = this.items.findIndex(i => String(i.hash_largo || i.id).trim().toLowerCase() === targetHash);
        if (idxVisibles !== -1) {
          this.items[idxVisibles] = prepararEdicionComprobante({
            ...this.items[idxVisibles],
            ...payload
          }, this.loteActivo);

          this.items = [...this.items];
        } else if (idxTodos === -1) {
          this.resetearYRefrescar();
        }
      });
    },

    actualizarSocioSeleccionado() {
      this.filtroSocio = String(this.filtroSocio || '').trim();
      this.saldoAnterior = obtenerSaldoAnteriorSocio(this.directorio, this.filtroSocio);
      return this.resetearYRefrescar();
    },

    async verComprobantesDeSocio(nombre = '') {
      this.filtroSocio = String(nombre || '').trim();
      this.saldoAnterior = obtenerSaldoAnteriorSocio(this.directorio, this.filtroSocio);
      this.vistaActiva = 'comprobantes';
      return this.resetearYRefrescar();
    },

    async cargarComprobantes() {
      return this.resetearYRefrescar();
    },

    async resetearYRefrescar() {
      const token = ++this.solicitudActual;
      this.items = [];
      this.todosLosItems = [];
      this.hayMasDatos = false;
      this.cargando = true;

      try {
        const params = {
          socio: this.filtroSocio,
          rol: this.filtroRol,
          fechaInicio: this.filtroFechaInicio,
          fechaFin: this.filtroFechaFin,
          desdeHash: this.filtroDesdeHash,
          hastaHash: this.filtroHastaHash,
          orden: this.filtroOrden,
          hash: this.filtroHash
        };

        const ordenados = await cargarComprobantesFiltrados(params, {
          maximo: this.capMaximoDOM,
          loteActivo: this.loteActivo
        });
        if (token !== this.solicitudActual) return;

        this.todosLosItems = ordenados.slice(0, this.capMaximoDOM);
        this.items = this.todosLosItems.slice(0, this.tamanoLote);
        this.hayMasDatos = this.items.length < this.todosLosItems.length;
      } catch (err) {
        console.error('❌ Error al cargar lote de comprobantes:', err);
      } finally {
        if (token === this.solicitudActual) this.cargando = false;
      }
    },

    cargarSiguientePagina() {
      if (this.cargando || !this.hayMasDatos) return;

      const proximoLimite = Math.min(
        this.items.length + this.tamanoLote,
        this.capMaximoDOM,
        this.todosLosItems.length
      );

      this.items = this.todosLosItems.slice(0, proximoLimite);
      this.hayMasDatos = this.items.length < this.todosLosItems.length;
    },

    iniciarEscuchadoresScroll() {
      this.$nextTick(() => {
        const intentarCargar = () => {
          if (this.vistaActiva !== 'comprobantes' || this.cargando || !this.hayMasDatos) return;

          const sentinel = document.getElementById('sentinel-scroll');
          if (!sentinel) return;

          const rect = sentinel.getBoundingClientRect();
          const vh = window.innerHeight || document.documentElement.clientHeight;

          if (rect.top <= vh + 600) {
            this.cargarSiguientePagina();
          }
        };

        document.addEventListener('scroll', intentarCargar, { capture: true, passive: true });
        window.addEventListener('scroll', intentarCargar, { passive: true });
        document.addEventListener('wheel', intentarCargar, { capture: true, passive: true });
        document.addEventListener('touchmove', intentarCargar, { capture: true, passive: true });

        const sentinel = document.getElementById('sentinel-scroll');
        if (sentinel) {
          const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
              intentarCargar();
            }
          }, { rootMargin: '400px' });

          observer.observe(sentinel);
        }
      });
    },

    async enviarReporteViaEvolution(socio = '', ancho = 1080) {
      const documento = document.getElementById('reporte-html-documento');
      if (!documento) {
        alert('No se encontró el documento del reporte.');
        return;
      }

      try {
        const base64 = await capturarReporteEstadoCuenta(documento, { ancho });
        const socioReporte = String(socio || this.reporteSocio || '').trim() || 'GENERAL';
        const pagina = Number(this.reportePaginaSegura) || 1;
        const totalPaginas = Number(this.reporteTotalPaginas) || 1;
        const rango = this.reporteFechaInicio && this.reporteFechaFin
          ? ` | ${this.reporteFechaInicio} al ${this.reporteFechaFin}`
          : '';
        const response = await fetch(apiUrl('/api/v1/reportes/imagen'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            socio: socioReporte,
            caption: `Estado de cuenta ${socioReporte}${rango} | Pag. ${pagina}/${totalPaginas}`,
            fileName: `estado-cuenta-${Date.now()}.jpg`,
            mimeType: 'image/jpeg',
            base64
          })
        });
        const res = await response.json().catch(() => ({}));
        if (!response.ok || res.success === false) {
          throw new Error(res.error || res.message || `HTTP ${response.status}`);
        }
        const detalle = res.data || res;
        alert(detalle.simulated
          ? '🧪 Reporte generado en modo simulación (Evolution no configurado).'
          : '✅ Reporte enviado por Evolution.');
      } catch (err) {
        console.error('[comprobantesState ❌ Error al enviar reporte]:', err);
        alert('❌ Error al enviar el reporte: ' + err.message);
      }
    },

    async eliminarComprobante(identificador) {
      if (!identificador) return;

      if (!confirm('¿Confirmas que deseas eliminar este comprobante?')) return;

      const idStr = String(identificador).trim();

      try {
        await eliminarComprobantePorHash(idStr);
      } catch (err) {
        console.error('❌ Error al eliminar:', err);
      } finally {
        this.items = this.items.filter(item => String(item.id || item.hash_largo || '') !== idStr);
        this.todosLosItems = this.todosLosItems.filter(item => String(item.id || item.hash_largo || '') !== idStr);
        this.hayMasDatos = this.items.length < this.todosLosItems.length;
      }
    },

    formatMonto, formatTasa, obtenerME1, obtenerME2, obtenerTasaSocioCalculada, claseInsignia, formatDiaHora
  };

  Object.assign(state, crearAccionesModal(state));

  return state;
}
