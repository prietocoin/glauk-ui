/**
 * @file routerState.js
 * @description Estado de rutas y navegación de la interfaz.
 */

export function createRouterState() {
  return {
    vistaActiva: 'comprobantes', // 👈 Vista inicial predeterminada
    vistaDashboardSubmenu: 'balance',
    loteSeleccionadoInspector: ''
  };
}
