import { qs } from '../../../shared/js/dom.js';
import { api } from '../api.js';
import { MONEDAS_CHECKLIST } from '../config.js';
import { state } from '../state.js';
import { abrirModal, cerrarModal } from '../ui/modal.js';
import { showToast } from '../ui/toast.js';
import { renderChecklistGrid } from '../components/checklist-grid.js';
import { renderPartnerList } from '../components/partner-list.js';

export function initSocios() {
  const etiquetaSocio = qs('#lblSelectedPartner');
  const etiquetaBase = qs('#lblPartnerBase');
  const botonPerfil = qs('#btnTogglePerfil');
  const banner = qs('#bannerSocioOff');
  const grid = qs('#checklistGrid');
  const listaSocios = qs('#partnerListContainer');
  const buscador = qs('#txtSearchPartner');

  function actualizarPerfilUI(activo) {
    botonPerfil.textContent = activo ? 'ON' : 'OFF';
    botonPerfil.classList.toggle('on', activo);
    botonPerfil.classList.toggle('off', !activo);
    banner.classList.toggle('hidden', activo);
    grid.classList.toggle('is-disabled', !activo);
  }

  function renderChecklist() {
    if (!state.socioActivo) return;
    renderChecklistGrid(grid, state.socioActivo, alternarPais);
  }

  function cerrarHojaSocios() {
    cerrarModal('partnerSheet');
  }

  function seleccionarSocio(nombre) {
    const socio = state.socios.find(
      (candidato) => String(candidato.nombre).toLowerCase() === String(nombre).toLowerCase()
    );
    if (!socio) return;

    if (!socio.monedas) socio.monedas = {};
    state.socioActivo = socio;
    etiquetaSocio.textContent = socio.nombre;
    etiquetaBase.textContent = `Base: ${socio.moneda_base || 'USDT'}`;
    actualizarPerfilUI(socio.activo !== false);
    renderChecklist();
    cerrarHojaSocios();
  }

  function abrirHojaSocios() {
    abrirModal('partnerSheet');
    renderPartnerList(listaSocios, state.socios, '', seleccionarSocio);
  }

  function filtrarSocios() {
    renderPartnerList(listaSocios, state.socios, buscador.value, seleccionarSocio);
  }

  function alternarPais(code) {
    if (!state.socioActivo || state.socioActivo.activo === false) return;
    if (!state.socioActivo.monedas[code]) state.socioActivo.monedas[code] = {};
    state.socioActivo.monedas[code].activo = !state.socioActivo.monedas[code].activo;
    renderChecklist();
  }

  function marcarTodos(status) {
    if (!state.socioActivo || state.socioActivo.activo === false) return;
    MONEDAS_CHECKLIST.forEach((code) => {
      if (!state.socioActivo.monedas[code]) state.socioActivo.monedas[code] = {};
      state.socioActivo.monedas[code].activo = status;
    });
    renderChecklist();
  }

  function alternarPerfil() {
    if (!state.socioActivo) return;
    state.socioActivo.activo = state.socioActivo.activo === false;
    actualizarPerfilUI(state.socioActivo.activo);
  }

  async function guardarCambios() {
    if (!state.socioActivo) return;
    try {
      await api.guardarSocio(state.socioActivo.nombre, {
        monedas: state.socioActivo.monedas,
        activo: state.socioActivo.activo,
        modo_prueba: state.socioActivo.modo_prueba
      });
      showToast(`💾 Guardado para ${state.socioActivo.nombre}`);
    } catch (error) {
      showToast(`❌ ${error.message}`);
    }
  }

  async function refresh() {
    try {
      const datos = await api.socios();
      if (datos.socios?.length > 0) {
        state.socios = datos.socios;
        seleccionarSocio(state.socios[0].nombre);
      }
    } catch (error) {
      console.error('Error socios:', error);
    }
  }

  qs('#btnOpenPartner').addEventListener('click', abrirHojaSocios);
  qs('#btnTogglePerfil').addEventListener('click', alternarPerfil);
  qs('#btnGuardarSocio').addEventListener('click', guardarCambios);
  buscador.addEventListener('input', filtrarSocios);
  document.querySelectorAll('[data-check-all]').forEach((boton) => {
    boton.addEventListener('click', () => marcarTodos(boton.dataset.checkAll === 'true'));
  });

  return { refresh, seleccionarSocio };
}
