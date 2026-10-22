/**
 * @file comprobantesModalActions.js
 * @description Acciones del modal asociadas al estado de Alpine.js para edición directa en comprobantes_final.
 */
import { actualizarComprobanteApi, releerIaApi } from './comprobantesApiService.js';

export function crearAccionesModal(state) {
  return {
    abrirModalEdicion(item) {
      state.itemEdicion = JSON.parse(JSON.stringify(item));
      state.modalAbierto = true;
    },

    cerrarModal() {
      state.modalAbierto = false;
      state.itemEdicion = null;
    },

    recalcularMontosModal() {
      if (!state.itemEdicion) return;
      const item = state.itemEdicion;
      const montoLocal = Math.abs(parseFloat(item.monto || 0));
      const monedaRecibo = String(item.moneda || 'USDT').toUpperCase();

      const obtenerMonedaBase = (socio) => {
        if (!socio || socio === 'GENERAL') return 'USDT';
        const found = (state.directorio || []).find(d => (d.nombre || '').toUpperCase() === String(socio).toUpperCase());
        return found?.moneda_base || found?.moneda || 'USDT';
      };

      const obtenerTasa = (socio) => {
        if (!socio || socio === 'GENERAL') return 1.0;
        const found = (state.directorio || []).find(d => (d.nombre || '').toUpperCase() === String(socio).toUpperCase());
        return parseFloat(found?.tasa || found?.tasa_base || 1.0) || 1.0;
      };

      // Recálculo Socio 1
      const mBase1 = obtenerMonedaBase(item.nombre_socio_1);
      const tasa1 = obtenerTasa(item.nombre_socio_1);
      item.m1_socio = mBase1 === monedaRecibo ? montoLocal.toFixed(2) : (tasa1 > 0 ? (montoLocal / tasa1) : montoLocal).toFixed(2);

      // Recálculo Socio 2
      const mBase2 = obtenerMonedaBase(item.nombre_socio_2);
      const tasa2 = obtenerTasa(item.nombre_socio_2);
      item.m2_socio = mBase2 === monedaRecibo ? montoLocal.toFixed(2) : (tasa2 > 0 ? (montoLocal / tasa2) : montoLocal).toFixed(2);
    },

    async guardarCambiosModal() {
      if (!state.itemEdicion) return;

      const item = state.itemEdicion;
      const hashTarget = item.hash_largo || item.id;

      if (!hashTarget) {
        alert('❌ No se encontró el hash del comprobante.');
        return;
      }

      const payload = {
        hash_largo: hashTarget,
        banco: item.banco,
        referencia: item.referencia,
        titular: item.titular,
        socio_1: item.nombre_socio_1 || item.socio_1,
        socio_2: item.nombre_socio_2 || item.socio_2,
        tipo_manual: item.tipo_manual || 'D',
        moneda: item.moneda,
        monto: parseFloat(item.monto || 0),
        m1_socio: parseFloat(item.m1_socio || 0),
        m2_socio: parseFloat(item.m2_socio || 0),
        monto_1: parseFloat(item.m1_socio || 0),
        monto_2: parseFloat(item.m2_socio || 0),
        lote_tasa_asignado: item.lote_tasa_asignado || item.lote || 'T070'
      };

      try {
        state.cargando = true;

        await actualizarComprobanteApi(hashTarget, payload);

        // Actualizar datos en las listas reactivas de Alpine.js
        const idx = state.items.findIndex(i => (i.hash_largo || i.id) === hashTarget);
        if (idx !== -1) {
          state.items[idx] = { ...state.items[idx], ...payload, es_edicion_manual: true, esta_liquidado: true };
        }

        const idxTodos = state.todosLosItems.findIndex(i => (i.hash_largo || i.id) === hashTarget);
        if (idxTodos !== -1) {
          state.todosLosItems[idxTodos] = { ...state.todosLosItems[idxTodos], ...payload, es_edicion_manual: true, esta_liquidado: true };
        }

        state.cerrarModal();
      } catch (err) {
        console.error('❌ Error al guardar:', err);
        alert('Error al guardar cambios: ' + err.message);
      } finally {
        state.cargando = false;
      }
    },

    async releerIAModal() {
      if (!state.itemEdicion) return;
      const hashTarget = state.itemEdicion.hash_largo || state.itemEdicion.id;
      if (!hashTarget) return;

      try {
        await releerIaApi(hashTarget);
        alert('🤖 Re-lectura encolada con éxito');
        state.cerrarModal();
      } catch (err) {
        alert('Error al encolar re-lectura: ' + err.message);
      }
    }
  };
}
