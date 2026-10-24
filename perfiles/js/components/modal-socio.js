import { MONEDAS_BASE } from '../catalog.js';
import { esHerencia } from '../domain.js';
import { escapeHTML } from '../../../shared/js/dom.js';
import { renderReglasHerencia } from './reglas-herencia.js';
import { renderReglasEditor } from './reglas-editor.js';

function opcionesBase(seleccionada) {
  return MONEDAS_BASE.map((opcion) => {
    if (opcion.separator) return `<option disabled>${opcion.label}</option>`;
    const selected = opcion.value === seleccionada ? ' selected' : '';
    return `<option value="${opcion.value}"${selected}>${opcion.label}</option>`;
  }).join('');
}

function campoBase(herencia) {
  return herencia
    ? 'bg-slate-900/50 text-slate-400 cursor-not-allowed border-slate-800'
    : 'bg-slate-900 text-white focus:border-cyan-500 border-slate-700';
}

function campoSaldo(herencia) {
  return herencia
    ? 'bg-slate-900/50 text-slate-400 cursor-not-allowed border-slate-800'
    : 'bg-slate-900 text-white border-slate-700';
}

function campoJid(herencia) {
  return herencia
    ? 'bg-slate-900/50 text-slate-500 cursor-not-allowed border-slate-800'
    : 'bg-slate-900 text-cyan-300 border-slate-700';
}

function reglasDelModo(herencia, reglas, monedaParaAgregar) {
  return herencia
    ? renderReglasHerencia(reglas)
    : renderReglasEditor(reglas, monedaParaAgregar);
}

// Footer fijo del modal: siempre visible, con objetivos táctiles de 44px.
function footer(herencia) {
  if (herencia) {
    return `<footer class="glauk-modal__footer">
      <button type="button" data-accion="cerrar" class="min-h-11 px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition">Cerrar Vista</button>
    </footer>`;
  }
  return `<footer class="glauk-modal__footer">
      <button type="button" data-accion="cerrar" class="min-h-11 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition">Cancelar</button>
      <button type="button" data-accion="guardar" class="min-h-11 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-lg">💾 Guardar Cambios</button>
    </footer>`;
}

// Modal de configuración. Mantiene la estructura y clases del original, pero
// recibe el estado ya resuelto por el controlador.
//
// Anatomía mobile-first obligatoria: handle + header fijo + body scrolleable +
// footer fijo. El diálogo nunca scrollea completo, así "Guardar Cambios" queda
// siempre accesible con el pulgar.
export function renderModalSocio({ socio = {}, reglas = [], monedaParaAgregar = '' }) {
  const herencia = esHerencia(socio.herencia);
  const deshabilitado = herencia ? ' disabled' : '';
  const nombre = escapeHTML(socio.nombre || '');
  const saldo = escapeHTML(socio.saldo_inicial ?? '');
  const jid = escapeHTML(socio.id_grupo || '');
  const opciones = opcionesBase(socio.moneda_base || 'USDT');

  return `
    <div class="glauk-modal" data-modal-overlay>
      <div class="glauk-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="perfiles-modal-titulo" data-modal-dialog>
        <div class="glauk-modal__handle" aria-hidden="true"></div>

        <header class="glauk-modal__header">
          <h3 id="perfiles-modal-titulo" class="min-w-0">
            <span class="block truncate">Configuración de Socio</span>
            <span id="perfiles-modal-nombre" class="block truncate text-cyan-400 text-[12px]">${nombre || 'Nuevo Socio'}</span>
          </h3>
          <button type="button" data-accion="cerrar" class="glauk-modal__close" aria-label="Cerrar configuración">✕</button>
        </header>

        <div class="glauk-modal__body">

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="text-[11px] font-semibold text-slate-400 uppercase" for="perfiles-campo-nombre">Nombre Socio</label>
              <input id="perfiles-campo-nombre" type="text" data-campo="nombre" value="${nombre}"${deshabilitado} class="w-full mt-1 rounded-xl px-3 py-2.5 text-sm focus:outline-none border ${campoBase(herencia)}">
            </div>
            <div>
              <label class="text-[11px] font-semibold text-slate-400 uppercase" for="perfiles-campo-moneda">Moneda Nativa (Base)</label>
              <select id="perfiles-campo-moneda" data-campo="moneda_base"${deshabilitado} class="w-full mt-1 rounded-xl px-3 py-2.5 text-sm focus:outline-none border ${campoBase(herencia)}">
                ${opciones}
              </select>
            </div>
            <div>
              <label class="text-[11px] font-semibold text-slate-400 uppercase" for="perfiles-campo-saldo">Saldo Inicial Base</label>
              <input id="perfiles-campo-saldo" type="number" step="0.01" inputmode="decimal" data-campo="saldo_inicial" value="${saldo}"${deshabilitado} class="w-full mt-1 rounded-xl px-3 py-2.5 text-sm border ${campoSaldo(herencia)}">
            </div>
            <div>
              <label class="text-[11px] font-semibold text-slate-400 uppercase" for="perfiles-campo-herencia">¿Hereda Tasas?</label>
              <select id="perfiles-campo-herencia" data-campo="herencia" class="w-full mt-1 bg-slate-900 border border-purple-500/60 rounded-xl px-3 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.15)]">
                <option value="false"${herencia ? '' : ' selected'}>NO</option>
                <option value="true"${herencia ? ' selected' : ''}>SÍ</option>
              </select>
            </div>
          </div>

          <div>
            <label class="text-[11px] font-semibold text-slate-400 uppercase" for="perfiles-campo-jid">WhatsApp Remote JID / ID Grupo</label>
            <input id="perfiles-campo-jid" type="text" data-campo="id_grupo" value="${jid}"${deshabilitado} class="w-full mt-1 rounded-xl px-3 py-2.5 text-sm font-mono border ${campoJid(herencia)}">
          </div>

          <div class="border-t border-slate-800 pt-4" id="perfiles-reglas">
            ${reglasDelModo(herencia, reglas, monedaParaAgregar)}
          </div>

        </div>

        ${footer(herencia)}
      </div>
    </div>`;
}
