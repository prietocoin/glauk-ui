export const state = {
  socios: [],
  socioActivo: null,
  modoPruebaGlobal: true,
  borradorTasas: {},
  loteActualCodigo: 'T000',
  previewUrl: ''
};

export function socioSeleccionado() {
  return state.socioActivo;
}
