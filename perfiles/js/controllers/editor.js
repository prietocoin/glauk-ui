import { qs } from '../../../shared/js/dom.js';
import { api } from '../api.js';
import { state } from '../store.js';
import {
  esHerencia, nuevaRegla, payloadGuardar, reglasSegunModo
} from '../domain.js';
import { renderModalSocio } from '../components/modal-socio.js';
import { renderReglasEditor } from '../components/reglas-editor.js';
import { renderReglasHerencia } from '../components/reglas-herencia.js';

export function crearEditor({ recargar = async () => {}, alertar = globalThis.alert } = {}) {
  let root = null;
  let montado = false;

  function render() {
    if (!root) return;
    if (!state.modalAbierto) {
      root.replaceChildren();
      return;
    }
    root.innerHTML = renderModalSocio({
      socio: state.socioEdicion,
      reglas: state.reglas,
      monedaParaAgregar: state.monedaParaAgregar
    });
  }

  function renderReglas() {
    const host = qs('#perfiles-reglas', root);
    if (!host) return;
    host.innerHTML = esHerencia(state.socioEdicion.herencia)
      ? renderReglasHerencia(state.reglas)
      : renderReglasEditor(state.reglas, state.monedaParaAgregar);
  }

  function actualizarTitulo(nombre) {
    const titulo = qs('#perfiles-modal-nombre', root);
    if (titulo) titulo.textContent = nombre || 'Nuevo Socio';
  }

  function abrir(socio) {
    if (socio) {
      state.socioEdicion = JSON.parse(JSON.stringify(socio));
      state.socioEdicion.herencia = Boolean(socio.herencia);
    } else {
      state.socioEdicion = {
        nombre: '',
        moneda_base: 'USDT',
        saldo_inicial: 0,
        herencia: false,
        id_grupo: '',
        mostrar: { tasas: true, dashboard: true },
        monedas: {}
      };
    }
    state.reglas = reglasSegunModo(state.socios, state.socioEdicion);
    state.monedaParaAgregar = '';
    state.modalAbierto = true;
    render();
  }

  function cerrar() {
    state.modalAbierto = false;
    state.monedaParaAgregar = '';
    render();
  }

  function agregarMoneda() {
    const codigo = state.monedaParaAgregar;
    if (!codigo || state.reglas.some((regla) => regla.codigo === codigo)) return;
    state.reglas.push(nuevaRegla(codigo));
    state.monedaParaAgregar = '';
    renderReglas();
  }

  function eliminarMoneda(indice) {
    if (!Number.isInteger(indice) || !state.reglas[indice]) return;
    state.reglas.splice(indice, 1);
    renderReglas();
  }

  function alternarSigno(indice, tipo) {
    const regla = state.reglas[indice];
    if (!regla) return;
    if (tipo === 'dep') regla.polar_D = regla.polar_D === '+' ? '-' : '+';
    if (tipo === 'pago') regla.polar_P = regla.polar_P === '-' ? '+' : '-';
    renderReglas();
  }

  function avisarErrorGuardado(err) {
    if (err?.status) {
      alertar(`Error al guardar: ${err.body?.error || 'Fallo en el servidor'}`);
    } else {
      alertar('Error de conexión al guardar socio');
    }
  }

  async function guardar() {
    const nombre = String(state.socioEdicion.nombre || '').trim();
    if (!nombre) {
      alertar('El nombre del socio es obligatorio');
      return;
    }
    try {
      await api.guardar(payloadGuardar(state.socioEdicion, state.reglas));
    } catch (err) {
      avisarErrorGuardado(err);
      return;
    }
    cerrar();
    await recargar();
  }

  async function guardarHerencia() {
    try {
      await api.guardar(payloadGuardar(state.socioEdicion, state.reglas));
    } catch (err) {
      console.error('Error guardando herencia automáticamente:', err);
    } finally {
      await recargar();
    }
  }

  function onInput(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.id === 'perfiles-moneda-agregar') {
      state.monedaParaAgregar = target.value;
      const boton = qs('[data-accion="agregar-moneda"]', root);
      if (boton) boton.disabled = !target.value;
      return;
    }
    const indice = target.dataset.regla;
    const campo = target.dataset.campo;
    if (indice !== undefined && (campo === 'deposito' || campo === 'pago')) {
      state.reglas[Number(indice)][campo] = target.value;
      return;
    }
    if (campo === 'nombre' || campo === 'saldo_inicial' || campo === 'id_grupo') {
      state.socioEdicion[campo] = target.value;
      if (campo === 'nombre') actualizarTitulo(target.value);
    }
  }

  function onChange(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const campo = target.dataset.campo;
    if (campo === 'herencia') {
      state.socioEdicion.herencia = target.value === 'true';
      state.reglas = reglasSegunModo(state.socios, state.socioEdicion);
      render();
      void guardarHerencia();
      return;
    }
    if (campo === 'moneda_base') {
      state.socioEdicion.moneda_base = target.value;
      return;
    }
    const indice = Number(target.dataset.regla);
    if (campo === 'tipo' && Number.isInteger(indice) && state.reglas[indice]) {
      state.reglas[indice].tipo = target.value === 'P' ? 'P' : 'D';
    }
  }

  function onClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const boton = target.closest('[data-accion]');
    if (!boton) {
      if (target.matches('[data-modal-overlay]')) cerrar();
      return;
    }
    const indice = Number(boton.dataset.indice);
    switch (boton.dataset.accion) {
      case 'cerrar': cerrar(); break;
      case 'guardar': void guardar(); break;
      case 'agregar-moneda': agregarMoneda(); break;
      case 'eliminar-moneda': eliminarMoneda(indice); break;
      case 'toggle-dep': alternarSigno(indice, 'dep'); break;
      case 'toggle-pago': alternarSigno(indice, 'pago'); break;
      default: break;
    }
  }

  function onKeydown(event) {
    if (state.modalAbierto && event.key === 'Escape') cerrar();
  }

  function mount() {
    if (montado) return;
    montado = true;
    root = qs('#perfiles-modal-root');
    if (!root) return;
    root.addEventListener('click', onClick);
    root.addEventListener('input', onInput);
    root.addEventListener('change', onChange);
    document.addEventListener('keydown', onKeydown);
  }

  return { mount, abrir, cerrar, render };
}
