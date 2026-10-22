/**
 * @file comprobantesState.js
 * Estado reactivo Alpine.js con carga progresiva por red (bloques de 20,
 * tope de 500 en pantalla) y degradación local si el backend no pagina.
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
import { cargarPaginaComprobantes } from '../services/comprobantesCargaService.js';
import { aplicarRangoHash } from '../services/comprobantesFilterService.js';
import { crearAccionesModal } from '../services/comprobantesModalActions.js';
import { prepararEdicionComprobante, obtenerInsigniaRol } from '../services/comprobantesMapperService.js';
import { capturarReporteEstadoCuenta } from '../services/comprobantesReporteService.js';
import { obtenerSaldoAnteriorSocio, obtenerSujetoAuditado } from '../services/comprobantesSaldosService.js';
import { obtenerRangoMesActualCaracas, formatearFechaLatina } from '../utils/comprobantesFechaUtils.js';

function claveComprobante(item) {
  const c = item?.comprobante || item || {};
  const principal = String(c.hash_largo || c.id || c.referencia || '').trim().toLowerCase();
  if (principal) return principal;
  return `${c.fecha_hora_comprobante || c.fecha || ''}|${c.monto || ''}|${c.banco || ''}`;
}

export function comprobantesState() {
  const { fechaInicio: inicioMes, fechaFin: finMes } = obtenerRangoMesActualCaracas();

  const state = {
    todosLosItems: [],
    items: [],
    directorio: [],
    cargando: false,
    cargandoMas: false,
    hayMasDatos: true,
    solicitudActual: 0,

    // Paginación por red
    totalRegistros: 0,
    siguienteOffset: 0,
    modoPaginacion: 'red',
    visibleLocal: 0,

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
      return calcularMovimientoFiltradoTotal(this.items, this.filtroSocio);
    },

    get saldoActualTotal() {
      return (parseFloat(this.saldoAnterior) || 0) + this.movimientoFiltradoTotal;
    },

    get sociosPendientesConsolidado() {
      return calcularSociosPendientesConsolidado(this.directorio, this.items, {
        fechaInicio: this.filtroFechaInicio, fechaFin: this.filtroFechaFin
      });
    },

    get hayDatosParciales() {
      const total = Number(this.totalRegistros) || 0;
      return total > 0 && this.items.length < total;
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
        const idxTodos = this.todosLosItems.findIndex(
          i => String(i.hash_largo || i.id).trim().toLowerCase() === targetHash
        );

        if (idxTodos !== -1) {
          this.todosLosItems[idxTodos] = prepararEdicionComprobante({
            ...this.todosLosItems[idxTodos],
            ...payload
          }, this.loteActivo);
          this.todosLosItems = [...this.todosLosItems];
          this.actualizarVisibles();
          return;
        }

        const idxVisibles = this.items.findIndex(
          i => String(i.hash_largo || i.id).trim().toLowerCase() === targetHash
        );
        if (idxVisibles !== -1) {
          this.items[idxVisibles] = prepararEdicionComprobante({
            ...this.items[idxVisibles],
            ...payload
          }, this.loteActivo);
          this.items = [...this.items];
          return;
        }

        this.resetearYRefrescar();
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

    paramsConsulta() {
      return {
        socio: this.filtroSocio,
        rol: this.filtroRol,
        fechaInicio: this.filtroFechaInicio,
        fechaFin: this.filtroFechaFin,
        orden: this.filtroOrden,
        hash: this.filtroHash
      };
    },

    /** Recalcula las tarjetas visibles aplicando el rango posicional de hash. */
    actualizarVisibles() {
      const universo = aplicarRangoHash(
        this.todosLosItems,
        this.filtroDesdeHash,
        this.filtroHastaHash
      );

      if (this.modoPaginacion === 'local') {
        this.totalRegistros = universo.length;
        this.items = universo.slice(0, Math.min(this.visibleLocal, this.capMaximoDOM));
        this.hayMasDatos = this.items.length < universo.length
          && this.items.length < this.capMaximoDOM;
        return;
      }

      this.items = universo;
      this.hayMasDatos = this.siguienteOffset < this.totalRegistros
        && this.todosLosItems.length < this.capMaximoDOM
        && this.items.length < this.capMaximoDOM;
    },

    /** Incorpora una página recién llegada sin volver a renderizar las previas. */
    procesarPagina(pagina) {
      const entrantes = Array.isArray(pagina?.items) ? pagina.items : [];

      // Backend sin limit/offset: se usa el bloque recibido como buffer local
      // y se revela de 20 en 20 sin repetir peticiones.
      if (!pagina?.paginado) {
        const vistos = new Set();
        const buffer = [];
        for (const item of entrantes) {
          if (buffer.length >= this.capMaximoDOM) break;
          const clave = claveComprobante(item);
          if (vistos.has(clave)) continue;
          vistos.add(clave);
          buffer.push(item);
        }
        this.modoPaginacion = 'local';
        this.todosLosItems = buffer;
        this.visibleLocal = Math.min(this.tamanoLote, this.capMaximoDOM);
        this.actualizarVisibles();
        return;
      }

      this.modoPaginacion = 'red';
      const existentes = new Set(this.todosLosItems.map(claveComprobante));
      let agregados = 0;

      for (const item of entrantes) {
        if (this.todosLosItems.length >= this.capMaximoDOM) break;
        const clave = claveComprobante(item);
        if (existentes.has(clave)) continue;
        existentes.add(clave);
        this.todosLosItems.push(item);
        agregados += 1;
      }

      this.siguienteOffset = Math.max(
        this.siguienteOffset,
        Number(pagina.offset || 0) + Number(pagina.recibidos || 0)
      );
      this.totalRegistros = Math.max(
        Number(this.totalRegistros) || 0,
        Number(pagina.total) || 0,
        this.siguienteOffset
      );

      this.actualizarVisibles();

      if (agregados === 0 && Number(pagina.recibidos) > 0) this.hayMasDatos = false;
      if (!pagina.hasMore) this.hayMasDatos = false;
      if (this.todosLosItems.length >= this.capMaximoDOM) this.hayMasDatos = false;
    },

    async resetearYRefrescar() {
      const token = ++this.solicitudActual;
      this.items = [];
      this.todosLosItems = [];
      this.totalRegistros = 0;
      this.siguienteOffset = 0;
      this.visibleLocal = 0;
      this.modoPaginacion = 'red';
      this.hayMasDatos = true;
      this.cargando = true;
      this.cargandoMas = false;

      try {
        // La primera pantalla solo descarga el primer bloque de 20.
        const pagina = await cargarPaginaComprobantes(this.paramsConsulta(), {
          limit: this.tamanoLote,
          offset: 0,
          loteActivo: this.loteActivo
        });
        if (token !== this.solicitudActual) return;
        this.procesarPagina(pagina);
      } catch (err) {
        console.error('❌ Error al cargar la primera página de comprobantes:', err);
      } finally {
        if (token === this.solicitudActual) this.cargando = false;
      }
    },

    async cargarSiguientePagina() {
      if (this.cargando || this.cargandoMas || !this.hayMasDatos) return;

      if (this.modoPaginacion === 'local') {
        this.visibleLocal = Math.min(this.visibleLocal + this.tamanoLote, this.capMaximoDOM);
        this.actualizarVisibles();
        return;
      }

      const token = this.solicitudActual;
      this.cargandoMas = true;
      try {
        const pagina = await cargarPaginaComprobantes(this.paramsConsulta(), {
          limit: this.tamanoLote,
          offset: this.siguienteOffset,
          loteActivo: this.loteActivo
        });
        if (token !== this.solicitudActual) return;
        this.procesarPagina(pagina);
      } catch (err) {
        console.error('❌ Error al cargar el siguiente bloque de comprobantes:', err);
      } finally {
        if (token === this.solicitudActual) this.cargandoMas = false;
      }
    },

    iniciarEscuchadoresScroll() {
      this.$nextTick(() => {
        const intentarCargar = () => {
          if (this.vistaActiva !== 'comprobantes' || this.cargando || this.cargandoMas || !this.hayMasDatos) return;

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

    async enviarReporteViaEvolution(socio = '') {
      const documento = document.getElementById('reporte-html-documento');
      if (!documento) {
        alert('No se encontró el documento del reporte.');
        return;
      }

      try {
        const base64 = await capturarReporteEstadoCuenta(documento);
        const socioReporte = String(socio || this.reporteSocio || '').trim() || 'GENERAL';
        const pagina = Number(this.reportePaginaSegura) || 1;
        const totalPaginas = Number(this.reporteTotalPaginas) || 1;
        const rango = this.reporteFechaInicio && this.reporteFechaFin
          ? ` | ${formatearFechaLatina(this.reporteFechaInicio)} al ${formatearFechaLatina(this.reporteFechaFin)}`
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
        const antes = this.todosLosItems.length;
        this.todosLosItems = this.todosLosItems.filter(
          item => String(item.id || item.hash_largo || '') !== idStr
        );
        const eliminados = antes - this.todosLosItems.length;

        if (eliminados > 0) {
          // El universo y la ventana del servidor se reducen en la misma
          // proporción para no saltar el siguiente registro al paginar.
          this.totalRegistros = Math.max(0, (Number(this.totalRegistros) || 0) - eliminados);
          if (this.modoPaginacion === 'red') {
            this.siguienteOffset = Math.max(0, this.siguienteOffset - eliminados);
          }
        }

        this.actualizarVisibles();
      }
    },

    formatMonto, formatTasa, obtenerME1, obtenerME2, obtenerTasaSocioCalculada, claseInsignia, formatDiaHora
  };

  Object.assign(state, crearAccionesModal(state));

  return state;
}
