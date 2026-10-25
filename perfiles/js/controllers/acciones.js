import { qs } from '../../../shared/js/dom.js';
import { api } from '../api.js?v=20261024_24';

export function crearAcciones({
  recargar = async () => {},
  editar = () => {},
  confirmar = globalThis.confirm,
  alertar = globalThis.alert
} = {}) {
  let montado = false;

  async function apagarTodos() {
    if (!confirmar('¿Deseas apagar las tasas de todos los socios excepto FUNDDA?')) return;
    try {
      await api.apagarTodos();
      await recargar();
    } catch {
      alertar('Error al apagar todos');
    }
  }

  async function memorizarPlantilla() {
    try {
      const data = await api.memorizar();
      alertar(data?.message || 'Plantilla memorizada');
    } catch {
      alertar('Error guardando plantilla');
    }
  }

  async function restaurarPlantilla() {
    if (!confirmar('¿Restaurar la última plantilla de socios activos?')) return;
    try {
      const data = await api.restaurar();
      alertar(data?.message || 'Plantilla restaurada');
      await recargar();
    } catch {
      alertar('Error restaurando plantilla');
    }
  }

  function mount() {
    if (montado) return;
    montado = true;
    qs('#btn-refrescar')?.addEventListener('click', () => { void recargar(); });
    qs('#btn-apagar-todos')?.addEventListener('click', () => { void apagarTodos(); });
    qs('#btn-memorizar')?.addEventListener('click', () => { void memorizarPlantilla(); });
    qs('#btn-restaurar')?.addEventListener('click', () => { void restaurarPlantilla(); });
    qs('#btn-nuevo')?.addEventListener('click', () => editar(null));
  }

  return { mount };
}
