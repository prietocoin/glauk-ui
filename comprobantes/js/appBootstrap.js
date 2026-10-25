/**
 * @file appBootstrap.js
 * @description Bootstrapper principal de Alpine.js para Glauk2 Engine.
 */

import { createRouterState } from './shared/states/routerState.js';
import { createTasasState } from './modules/tasas/states/tasasState.js';
import { createDirectorioState } from './modules/directorio/states/directorioState.js';
import { comprobantesState } from './modules/comprobantes/states/comprobantesState.js?v=20261024_24';
import { createComprobantesReporteState } from './modules/comprobantes/states/comprobantesReporteState.js?v=20261024_24';
import { escucharSociosActualizados } from '../../shared/js/sync.js';

/**
 * Copia el estado preservando descriptores. Un spread simple evaluaría los
 * getters (por ejemplo comprobantes y movimientoFiltradoTotal) antes de que
 * Alpine cargue los datos, dejando valores estáticos en cero.
 */
function componerEstado(destino, fuente) {
  for (const clave of Object.keys(fuente)) {
    Object.defineProperty(destino, clave, Object.getOwnPropertyDescriptor(fuente, clave));
  }
  return destino;
}

function registrarApp() {
  Alpine.data('app', () => {
    const app = componerEstado({}, createRouterState());
    componerEstado(app, createTasasState());
    componerEstado(app, createDirectorioState());
    componerEstado(app, comprobantesState());
    componerEstado(app, createComprobantesReporteState());

    // Vista por defecto
    app.vistaActiva = 'comprobantes';

    // La barra móvil enlaza al Dashboard oficial en /dashboard/, que redirige
    // a /comprobantes/?vista=dashboard. Al bootear se respeta ese parámetro.
    const vistaSolicitada = new URLSearchParams(window.location.search).get('vista');
    if (vistaSolicitada === 'dashboard') {
      app.vistaActiva = 'dashboard';
    }

    // Reacción a un guardado de Perfiles: el backend sanea las monedas
    // históricas al leer el directorio, así que ese GET debe completarse antes
    // de proyectar los comprobantes. Si se consultara primero el listado, el
    // primer render seguiría usando la heurística vieja de polaridad.
    app.refrescarPorCambioDeSocios = async function refrescarPorCambioDeSocios() {
      if (this.cargarDirectorio) await this.cargarDirectorio();
      if (this.cargarComprobantes) await this.cargarComprobantes();
    };

    // Inicialización global del ciclo de vida
    app.init = async function init() {
      if (this.cargarDirectorio) await this.cargarDirectorio();

      await Promise.all([
        this.cargarTasasMercado ? this.cargarTasasMercado() : Promise.resolve(),
        this.cargarComprobantes ? this.cargarComprobantes() : Promise.resolve()
      ]);

      // Catálogo de compra/venta oficial por socio y lote. No bloquea el primer
      // render: las tarjetas se actualizan cuando termina la carga.
      if (this.cargarCatalogoTasas) this.cargarCatalogoTasas();

      this.$nextTick(() => {
        if (this.escucharActualizacionesGlobales) this.escucharActualizacionesGlobales();
        if (this.iniciarEscuchadoresScroll) this.iniciarEscuchadoresScroll();
      });

      this.desuscribirSocios = escucharSociosActualizados(() => {
        void this.refrescarPorCambioDeSocios();
      });
    };

    return app;
  });
}

if (window.Alpine) {
  registrarApp();
} else {
  document.addEventListener('alpine:init', registrarApp);
}
