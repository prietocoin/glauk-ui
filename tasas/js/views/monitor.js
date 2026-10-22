import { qs } from '../../../shared/js/dom.js';
import { api } from '../api.js';
import { fusionarTasas } from '../config.js';
import { state } from '../state.js';
import { abrirModal, cerrarModal } from '../ui/modal.js';
import { showToast } from '../ui/toast.js';
import { renderMonitorGrid } from '../components/monitor-grid.js';

export function initMonitor() {
  const etiquetaLote = qs('#lblLoteActual');
  const grid = qs('#gridMonitor');
  const entradaBorrado = qs('#txtBatchIdToDelete');

  function actualizarValor(code, valor) {
    state.borradorTasas[code] = parseFloat(valor) || 0;
  }

  function aplicarMapa(mapaTasas) {
    state.borradorTasas = fusionarTasas(mapaTasas);
    renderMonitorGrid(grid, state.borradorTasas, actualizarValor);
  }

  function actualizarEtiquetaLote() {
    etiquetaLote.textContent = `Lote en Prod: ${state.loteActualCodigo}`;
  }

  async function refresh() {
    try {
      const datos = await api.monitor();
      state.loteActualCodigo = datos.id_tasa || 'T000';
      actualizarEtiquetaLote();
      aplicarMapa(datos.tasas || {});
    } catch (error) {
      console.error('Error monitor:', error);
    }
  }

  async function guardarLote() {
    showToast('💾 Guardando en tasas_glaukov...');
    try {
      const datos = await api.guardarLote(state.borradorTasas);
      state.loteActualCodigo = datos.id_tasa;
      actualizarEtiquetaLote();
      showToast(`✅ Lote ${datos.id_tasa} guardado en BD`);
    } catch (error) {
      showToast(`❌ Error: ${error.message}`);
    }
  }

  async function publicarLote() {
    showToast('⚡ Despachando lote a socios en ON...');
    try {
      const datos = await api.publicarLote(state.modoPruebaGlobal);
      showToast(`🚀 Publicado a ${datos.procesados} socios ON`);
    } catch (error) {
      showToast(`❌ Error al publicar: ${error.message}`);
    }
  }

  async function traerBorradorHoo() {
    showToast('📑 Leyendo datos de HOO...');
    try {
      const datos = await api.borradorHoo();
      if (!datos.borrador) {
        showToast('❌ No se recibieron datos de HOO');
        return;
      }
      aplicarMapa(datos.borrador);
      showToast('✅ Borrador cargado desde HOO');
    } catch (error) {
      showToast('❌ Error de conexión al leer HOO');
    }
  }

  async function enviarTasaRemesas() {
    showToast('⏳ Activando flujo de remesas...');
    try {
      await api.notificarRemesas();
      showToast('✅ Notificación insertada en BD');
    } catch (error) {
      showToast(`❌ Error: ${error.message}`);
    }
  }

  function abrirBorrado() {
    entradaBorrado.value = state.loteActualCodigo;
    abrirModal('modalDeleteBatch');
  }

  async function confirmarBorrado() {
    const batchId = entradaBorrado.value.trim();
    if (!batchId) {
      showToast('⚠️ Ingrese un ID de lote válido');
      return;
    }

    showToast(`🗑️ Borrando lote ${batchId}...`);
    try {
      await api.eliminarLote(batchId);
      showToast(`✅ Lote ${batchId} eliminado`);
      cerrarModal('modalDeleteBatch');
      await refresh();
    } catch (error) {
      showToast(`❌ ${error.message}`);
    }
  }

  function cambiarModoPrueba(checked) {
    state.modoPruebaGlobal = checked;
    showToast(`Prueba Lote: ${checked ? 'ON' : 'OFF'}`);
  }

  qs('#btnGuardarLote').addEventListener('click', guardarLote);
  qs('#btnPublicar').addEventListener('click', publicarLote);
  qs('#btnHoo').addEventListener('click', traerBorradorHoo);
  qs('#btnRemesas').addEventListener('click', enviarTasaRemesas);
  qs('#btnBorrarLote').addEventListener('click', abrirBorrado);
  qs('#btnConfirmarBorrar').addEventListener('click', confirmarBorrado);
  qs('#globalTestSwitch').addEventListener('change', (evento) => {
    cambiarModoPrueba(evento.target.checked);
  });

  return { refresh, aplicarMapa };
}
