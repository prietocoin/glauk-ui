import { qs } from '../../../shared/js/dom.js';
import { api } from '../api.js?v=20261024_24';
import { state } from '../store.js?v=20261024_24';
import {
  esHerencia, nuevaRegla, payloadGuardar, reglasSegunModo
} from '../domain.js';
import { renderModalSocio } from '../components/modal-socio.js?v=20261024_24';
import {
  baseMoneda, formatearTasa, renderReglasEditor, tasaResultante
} from '../components/reglas-editor.js?v=20261024_24';
import { renderReglasHerencia } from '../components/reglas-herencia.js';
import { notificarSociosActualizados } from '../../../shared/js/sync.js';

export function crearEditor({ recargar = async () => {}, alertar = globalThis.alert, confirmar = globalThis.confirm } = {}) {
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
      monedaParaAgregar: state.monedaParaAgregar,
      tasasBase: state.tasasBase
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
    // Bloquea el scroll del documento: en mobile el modal ocupa el viewport y
    // solo su body debe desplazarse.
    document.body.classList.add('glauk-sheet-open');
    render();
  }

  function cerrar() {
    state.modalAbierto = false;
    state.monedaParaAgregar = '';
    document.body.classList.remove('glauk-sheet-open');
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
    const regla = state.reglas[indice];
    if (!confirmar(`¿Quitar ${regla.codigo} de las monedas del socio?`)) return;
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

  // Lee los campos del propio modal antes de serializar. El estado puede quedar
  // desfasado si un evento no llegó a propagarse (autofill, tecleo rápido o un
  // cambio hecho fuera del listener), y el modal no debe guardar una foto
  // cosmética: DEF, porcentajes y signos se toman del DOM visible.
  function leerSocioDelDOM() {
    const socio = { ...state.socioEdicion };
    if (!root) return socio;
    root.querySelectorAll('[data-campo]:not([data-regla])').forEach((control) => {
      const campo = control.dataset.campo;
      if (campo === 'herencia') {
        socio.herencia = control.value === 'true';
      } else if (campo === 'nombre' || campo === 'moneda_base' || campo === 'saldo_inicial' || campo === 'id_grupo') {
        socio[campo] = control.value;
      }
    });
    return socio;
  }

  function leerReglasDelDOM() {
    const reglas = state.reglas.map((regla) => ({ ...regla }));
    if (!root) return reglas;
    const host = qs('#perfiles-reglas', root);
    if (!host) return reglas;
    host.querySelectorAll('[data-regla][data-campo]').forEach((control) => {
      const regla = reglas[Number(control.dataset.regla)];
      if (!regla) return;
      if (control.dataset.campo === 'tipo') {
        regla.tipo = control.value === 'P' ? 'P' : 'D';
      } else if (control.dataset.campo === 'deposito' || control.dataset.campo === 'pago') {
        regla[control.dataset.campo] = control.value;
      }
    });
    host.querySelectorAll('[data-accion][data-indice][data-signo]').forEach((boton) => {
      const regla = reglas[Number(boton.dataset.indice)];
      if (!regla) return;
      const signo = boton.dataset.signo === '-' ? '-' : '+';
      if (boton.dataset.accion === 'toggle-dep') regla.polar_D = signo;
      if (boton.dataset.accion === 'toggle-pago') regla.polar_P = signo;
    });
    return reglas;
  }

  async function guardar() {
    const socio = leerSocioDelDOM();
    const nombre = String(socio.nombre || '').trim();
    if (!nombre) {
      alertar('El nombre del socio es obligatorio');
      return;
    }
    const reglas = esHerencia(socio.herencia) ? state.reglas : leerReglasDelDOM();
    state.socioEdicion = socio;
    state.reglas = reglas;
    try {
      await api.guardar(payloadGuardar(socio, reglas));
    } catch (err) {
      avisarErrorGuardado(err);
      return;
    }
    cerrar();
    await recargar();
    notificarSociosActualizados('perfiles');
  }

  async function guardarHerencia() {
    try {
      await api.guardar(payloadGuardar(state.socioEdicion, state.reglas));
    } catch (err) {
      console.error('Error guardando herencia automáticamente:', err);
    } finally {
      await recargar();
      notificarSociosActualizados('perfiles');
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
      const i = Number(indice);
      const regla = state.reglas[i];
      if (!regla) return;
      regla[campo] = target.value;
      const tipo = campo === 'deposito' ? 'D' : 'P';
      const resultado = tasaResultante(baseMoneda(regla, state.tasasBase), target.value, tipo);
      const salida = qs(`[data-resultado="${i}-${campo}"]`, root);
      if (salida) salida.textContent = formatearTasa(resultado);
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
      case 'tipo':
        if (state.reglas[indice]) {
          state.reglas[indice].tipo = boton.dataset.tipo === 'P' ? 'P' : 'D';
          renderReglas();
        }
        break;
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
