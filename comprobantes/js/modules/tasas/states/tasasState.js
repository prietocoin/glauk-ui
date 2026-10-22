/**
 * @file tasasState.js
 * @description Estado compartido de tasas para Directorio y Dashboard.
 */

import { obtenerClaseTalla } from '../utils/tallaSocio.js';
import { obtenerTasasVigentes } from '../services/tasasMercadoService.js';
import { despacharTasaIndividual } from '../services/despachoTasaIndividualService.js';

export function createTasasState() {
  return {
    loteActivo: '',

    async cargarTasasMercado() {
      const t = await obtenerTasasVigentes();
      this.loteActivo = t?.id_tasa || '';
    },

    async enviarTasaIndividual(socio, fPrueba = null) {
      await despacharTasaIndividual(this.loteActivo, socio, fPrueba);
    },

    getTallaClass(socio) {
      return obtenerClaseTalla(socio);
    }
  };
}
