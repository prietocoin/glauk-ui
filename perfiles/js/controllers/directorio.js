import { qs } from '../../../shared/js/dom.js';
import { api } from '../api.js';
import { state } from '../store.js';
import { esEntidadProtegida, esHerencia, payloadGuardar, reglasSegunModo, sociosFiltrados } from '../domain.js';
import { renderListaSocios } from '../components/lista-socios.js?v=20261024_18';

export function crearDirectorio({
  recargar = async () => {},
  editar = () => {},
  confirmar = globalThis.confirm,
  alertar = globalThis.alert
} = {}) {
  let montado = false;

  function render() {
    const total = qs('#perfiles-total');
    if (total) total.textContent = `Total: ${state.socios.length} socios registrados`;
    const host = qs('#perfiles-lista');
    if (host) host.innerHTML = renderListaSocios(sociosFiltrados(state.socios, state.busqueda));
  }

  async function toggleSocio(socio) {
    const nuevoEstado = !(socio.mostrar?.tasas);
    try {
      await api.toggle(socio.nombre, nuevoEstado);
      if (!socio.mostrar || typeof socio.mostrar !== 'object') socio.mostrar = {};
      socio.mostrar.tasas = nuevoEstado;
      render();
    } catch {
      alertar('Error actualizando estado');
    }
  }

  async function toggleHerencia(socio) {
    const actual = esHerencia(socio.herencia);
    const objetivo = { ...socio, herencia: !actual };
    const reglas = reglasSegunModo(state.socios, socio);
    try {
      await api.guardar(payloadGuardar(objetivo, reglas));
      socio.herencia = !actual;
      render();
    } catch {
      alertar('Error actualizando herencia');
    }
  }

  async function eliminarSocio(socio) {
    if (esEntidadProtegida(socio.nombre)) {
      alertar('No se puede eliminar la entidad matriz FUNDDA');
      return;
    }
    if (!confirmar(`¿Eliminar al socio ${socio.nombre}?`)) return;
    try {
      await api.eliminar(socio.nombre);
      await recargar();
    } catch {
      alertar('Error al eliminar socio');
    }
  }

  async function onClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const boton = target.closest('[data-accion]');
    const tarjeta = target.closest('[data-socio]');
    if (!boton || !tarjeta) return;
    const socio = state.socios.find((item) => item.nombre === tarjeta.dataset.socio);
    if (!socio) return;
    switch (boton.dataset.accion) {
      case 'configurar': editar(socio); break;
      case 'toggle': await toggleSocio(socio); break;
      case 'herencia': await toggleHerencia(socio); break;
      case 'eliminar': await eliminarSocio(socio); break;
      default: break;
    }
  }

  function mount() {
    if (montado) return;
    montado = true;
    qs('#perfiles-busqueda')?.addEventListener('input', (event) => {
      state.busqueda = event.target.value;
      render();
    });
    qs('#perfiles-lista')?.addEventListener('click', onClick);
  }

  return { mount, render };
}
