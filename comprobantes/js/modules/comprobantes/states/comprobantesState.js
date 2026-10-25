/**
 * @file comprobantesState.js
 * Estado reactivo Alpine.js con carga progresiva por red (bloques de 20,
 * tope de 500 en pantalla) y degradación local si el backend no pagina.
 */

import {
  formatMonto, formatTasa, obtenerME1, obtenerME2,
  obtenerTasaSocioCalculada, claseInsignia, formatDiaHora,
  resolverTipoComprobante, resolverTasaSocio
} from '../utils/comprobantesFormatters.js?v=20261025_01';

import { apiUrl } from '../../../../../shared/js/api-base.js?v=20261025_01';
import { notify } from '../../../../../shared/js/toast.js?v=20261025_01';

import {
  calcularSociosPendientesConsolidado,
  calcularMovimientoFiltradoTotal
} from '../services/saldosCalculatorService.js?v=20261025_01';

import {
  eliminarComprobantePorHash,
  fetchComprobantePorHash
} from '../services/comprobantesApiService.js?v=20261025_01';
import { cargarPaginaComprobantes } from '../services/comprobantesCargaService.js?v=20261025_01';
import { aplicarRangoHash } from '../services/comprobantesFilterService.js?v=20261025_01';
import { prepararEdicionComprobante, obtenerInsigniaRol } from '../services/comprobantesMapperService.js?v=20261025_01';
import { capturarReporteEstadoCuenta } from '../services/comprobantesReporteService.js?v=20261025_01';
import { obtenerSaldoAnteriorSocio, obtenerSujetoAuditado } from '../services/comprobantesSaldosService.js?v=20261025_01';
import { obtenerRangoMesActualCaracas, formatearFechaLatina } from '../utils/comprobantesFechaUtils.js?v=20261025_01';

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

    // BottomSheet de filtros y detalle táctil de tarjeta.
    filtrosSheetAbierto: false,
    menuMovilAbierto: false,
    filtrosBorrador: {
      rol: '',
      socio: '',
      fechaInicio: inicioMes,
      fechaFin: finMes,
      desdeHash: '',
      hastaHash: '',
      orden: 'fecha_desc',
      hash: ''
    },
    filtroChip: 'todos',
    detalleAbierto: false,
    itemDetalle: null,
    lightboxAbierto: false,
    lightboxImagen: '',

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

    get filtrosActivosCount() {
      let total = 0;
      if (this.filtroRol) total += 1;
      if (this.filtroSocio) total += 1;
      if (this.filtroFechaInicio) total += 1;
      if (this.filtroFechaFin) total += 1;
      if (this.filtroDesdeHash) total += 1;
      if (this.filtroHastaHash) total += 1;
      if (this.filtroOrden && this.filtroOrden !== 'fecha_desc') total += 1;
      if (this.filtroHash) total += 1;
      return total;
    },

    init() {
      this.$nextTick(() => {
        this.escucharActualizacionesGlobales();
        this.resetearYRefrescar();
        this.iniciarEscuchadoresScroll();
      });
      window.addEventListener('keydown', (evt) => {
        if (evt.key !== 'Escape') return;
        if (this.lightboxAbierto) this.cerrarLightbox();
        else if (this.detalleAbierto) this.cerrarDetalle();
      });
    },

    escucharActualizacionesGlobales() {
      window.addEventListener('comprobante-actualizado', async (evt) => {
        const payload = evt.detail || {};
        const hash = String(payload.hash_largo || payload.id || '').trim();
        if (!hash) return;

        try {
          const raw = await fetchComprobantePorHash(hash);
          if (!raw) {
            await this.resetearYRefrescar();
            return;
          }

          const actualizado = prepararEdicionComprobante(raw, this.loteActivo);
          const target = hash.toLowerCase();
          const reemplazar = (lista) => {
            const idx = lista.findIndex(
              i => String(i.hash_largo || i.id).trim().toLowerCase() === target
            );
            if (idx === -1) return false;
            lista[idx] = actualizado;
            return true;
          };

          const enUniverso = reemplazar(this.todosLosItems);
          reemplazar(this.items);
          this.todosLosItems = [...this.todosLosItems];
          this.items = [...this.items];

          if (enUniverso) this.actualizarVisibles();
          else await this.resetearYRefrescar();
        } catch (err) {
          console.error('[comprobantesState ❌ Error al refrescar comprobante]:', err);
          await this.resetearYRefrescar();
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

    filtrosActuales() {
      return {
        rol: this.filtroRol,
        socio: this.filtroSocio,
        fechaInicio: this.filtroFechaInicio,
        fechaFin: this.filtroFechaFin,
        desdeHash: this.filtroDesdeHash,
        hastaHash: this.filtroHastaHash,
        orden: this.filtroOrden,
        hash: this.filtroHash
      };
    },

    fechaHoyCaracas() {
      const partes = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Caracas',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).formatToParts(new Date());
      const valor = (tipo) => partes.find((parte) => parte.type === tipo)?.value || '';
      return `${valor('year')}-${valor('month')}-${valor('day')}`;
    },

    actualizarBloqueoScroll() {
      document.body.classList.toggle(
        'glauk-sheet-open',
        Boolean(this.filtrosSheetAbierto || this.detalleAbierto || this.menuMovilAbierto || this.lightboxAbierto)
      );
    },

    abrirMenuMovil() {
      this.menuMovilAbierto = true;
      this.actualizarBloqueoScroll();
    },

    cerrarMenuMovil() {
      this.menuMovilAbierto = false;
      this.actualizarBloqueoScroll();
    },

    abrirFiltros() {
      this.filtrosBorrador = this.filtrosActuales();
      this.filtrosSheetAbierto = true;
      this.actualizarBloqueoScroll();
    },

    cerrarFiltros() {
      this.filtrosSheetAbierto = false;
      this.actualizarBloqueoScroll();
    },

    limpiarFiltros() {
      this.filtrosBorrador = {
        rol: '',
        socio: '',
        fechaInicio: '',
        fechaFin: '',
        desdeHash: '',
        hastaHash: '',
        orden: 'fecha_desc',
        hash: ''
      };
    },

    async aplicarFiltros() {
      const borrador = this.filtrosBorrador;
      if (borrador.fechaInicio && borrador.fechaFin && borrador.fechaInicio > borrador.fechaFin) {
        notify('La fecha inicial no puede ser posterior a la fecha final.', { type: 'warning' });
        return;
      }

      this.filtroRol = String(borrador.rol || '').trim();
      this.filtroSocio = String(borrador.socio || '').trim();
      this.filtroFechaInicio = String(borrador.fechaInicio || '').trim();
      this.filtroFechaFin = String(borrador.fechaFin || '').trim();
      this.filtroDesdeHash = String(borrador.desdeHash || '').trim();
      this.filtroHastaHash = String(borrador.hastaHash || '').trim();
      this.filtroOrden = String(borrador.orden || 'fecha_desc');
      this.filtroHash = String(borrador.hash || '').trim();
      this.filtroChip = 'todos';
      this.saldoAnterior = obtenerSaldoAnteriorSocio(this.directorio, this.filtroSocio);
      this.filtrosSheetAbierto = false;
      this.actualizarBloqueoScroll();
      return this.resetearYRefrescar();
    },

    aplicarChip(tipo) {
      if (tipo === 'hoy') {
        const hoy = this.fechaHoyCaracas();
        this.filtroFechaInicio = hoy;
        this.filtroFechaFin = hoy;
        this.filtroChip = 'hoy';
        return this.resetearYRefrescar();
      }

      const { fechaInicio, fechaFin } = obtenerRangoMesActualCaracas();
      this.filtroFechaInicio = fechaInicio;
      this.filtroFechaFin = fechaFin;
      this.filtroChip = 'todos';
      return this.resetearYRefrescar();
    },

    urlRecibo(item) {
      if (!item) return '';
      return item.link_img || item.url_r2_comprobante || item.url_imagen || '';
    },

    abrirDetalle(item) {
      if (!item) return;
      this.itemDetalle = item;
      this.detalleAbierto = true;
      this.actualizarBloqueoScroll();
    },

    cerrarDetalle() {
      this.detalleAbierto = false;
      this.itemDetalle = null;
      this.actualizarBloqueoScroll();
    },

    // Visor de imagen (lightbox). Se usa tanto desde la miniatura de la
    // tarjeta como desde la imagen del detalle.
    abrirLightbox(item, evento) {
      if (evento && typeof evento.stopPropagation === 'function') evento.stopPropagation();
      const url = this.urlRecibo(item);
      if (!url) return;
      this.lightboxImagen = url;
      this.lightboxAbierto = true;
      this.actualizarBloqueoScroll();
    },

    cerrarLightbox() {
      this.lightboxAbierto = false;
      this.lightboxImagen = '';
      this.actualizarBloqueoScroll();
    },

    editarDesdeDetalle() {
      const item = this.itemDetalle;
      this.cerrarDetalle();
      if (item) {
        window.dispatchEvent(new CustomEvent('abrir-modal-edicion', { detail: item }));
      }
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
        this.todosLosItems || [],
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
        this.totalRegistros = buffer.length;
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
      // El total es exactamente el universo que reporta la API.
      this.totalRegistros = Math.max(0, Number(pagina.total) || 0);

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

    resolverTasaComprobante(item, posicion = 1) {
      return resolverTasaSocio(item, posicion);
    },

    /**
     * Signo del subtotal congelado. No consulta Perfiles: el signo ya viene en
     * me1/me2 (o en monto_1/monto_2) desde el backend.
     */
    signoSocio(item, posicion = 1) {
      const valor = Number(posicion) === 2
        ? (item?.me2 ?? item?.monto_2 ?? 0)
        : (item?.me1 ?? item?.monto_1 ?? 0);
      return Number(valor) < 0 ? -1 : 1;
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
        notify('Comprobante eliminado correctamente.', { type: 'success' });
      } catch (err) {
        console.error('❌ Error al eliminar:', err);
        notify(
          `No se pudo eliminar el comprobante: ${err.message || 'error del servidor'}`,
          { type: 'error' }
        );
      }
    },

    formatMonto, formatTasa, obtenerME1, obtenerME2, obtenerTasaSocioCalculada, claseInsignia, formatDiaHora,
    resolverTipoComprobante
  };

  return state;
}
