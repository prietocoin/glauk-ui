// Estado único de la vista. Los controladores lo mutan y vuelven a renderizar
// los componentes; no hay lógica de negocio ni llamadas HTTP en este módulo.
export const state = {
  socios: [],
  busqueda: '',
  modalAbierto: false,
  socioEdicion: {},
  reglas: [],
  monedaParaAgregar: '',
  tasasBase: null
};
