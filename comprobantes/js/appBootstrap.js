/**
 * @file appBootstrap.js
 * @description Bootstrapper principal de Alpine.js para Glauk2 Engine.
 */

import { createRouterState } from './shared/states/routerState.js';
import { createTasasState } from './modules/tasas/states/tasasState.js';
import { createDirectorioState } from './modules/directorio/states/directorioState.js';
import { comprobantesState } from './modules/comprobantes/states/comprobantesState.js';
import { createComprobantesReporteState } from './modules/comprobantes/states/comprobantesReporteState.js';

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

    // Inicialización global del ciclo de vida
    app.init = async function init() {
      await Promise.all([
        this.cargarTasasMercado ? this.cargarTasasMercado() : Promise.resolve(),
        this.cargarDirectorio ? this.cargarDirectorio() : Promise.resolve(),
        this.cargarComprobantes ? this.cargarComprobantes() : Promise.resolve()
      ]);

      this.$nextTick(() => {
        if (this.escucharActualizacionesGlobales) this.escucharActualizacionesGlobales();
        if (this.iniciarEscuchadoresScroll) this.iniciarEscuchadoresScroll();
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
