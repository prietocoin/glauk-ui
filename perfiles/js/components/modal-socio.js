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

// Modal de configuración. Mantiene la estructura y clases del original, pero
// recibe el estado ya resuelto por el controlador.
export function renderModalSocio({ socio = {}, reglas = [], monedaParaAgregar = '' }) {
  const herencia = esHerencia(socio.herencia);
  const deshabilitado = herencia ? ' disabled' : '';
  const nombre = escapeHTML(socio.nombre || '');
  const saldo = escapeHTML(socio.saldo_inicial ?? '');
  const jid = escapeHTML(socio.id_grupo || '');
  const opciones = opcionesBase(socio.moneda_base || 'USDT');
  const footer = herencia
    ? `<div class="flex items-center justify-end pt-3 border-t border-slate-800">
         <button type="button" data-accion="cerrar" class="px-5 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition">Cerrar Vista</button>
       </div>`
    : `<div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
         <button type="button" data-accion="cerrar" class="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition">Cancelar</button>
         <button type="button" data-accion="guardar" class="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-lg">💾 Guardar Cambios</button>
       </div>`;

  return `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto" data-modal-overlay>
      <div class="bg-[#070e23] border border-cyan-500/40 rounded-xl w-full max-w-4xl p-5 md:p-6 space-y-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="perfiles-modal-titulo">
        <h2 id="perfiles-modal-titulo" class="text-lg font-bold text-white flex items-center justify-between border-b border-slate-800 pb-3">
          <span>Configuración de Socio: <span id="perfiles-modal-nombre" class="text-cyan-400">${nombre || 'Nuevo Socio'}</span></span>
          <button type="button" data-accion="cerrar" class="text-slate-400 hover:text-white text-sm">✕</button>
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="text-[11px] font-semibold text-slate-400 uppercase">Nombre Socio</label>
            <input type="text" data-campo="nombre" value="${nombre}"${deshabilitado} class="w-full mt-1 rounded px-3 py-1.5 text-sm focus:outline-none border ${campoBase(herencia)}">
          </div>
          <div>
            <label class="text-[11px] font-semibold text-slate-400 uppercase">Moneda Nativa (Base)</label>
            <select data-campo="moneda_base"${deshabilitado} class="w-full mt-1 rounded px-3 py-1.5 text-sm focus:outline-none border ${campoBase(herencia)}">
              ${opciones}
            </select>
          </div>
          <div>
            <label class="text-[11px] font-semibold text-slate-400 uppercase">Saldo Inicial Base</label>
            <input type="number" step="0.01" data-campo="saldo_inicial" value="${saldo}"${deshabilitado} class="w-full mt-1 rounded px-3 py-1.5 text-sm border ${campoSaldo(herencia)}">
          </div>
          <div>
            <label class="text-[11px] font-semibold text-slate-400 uppercase">¿Hereda Tasas?</label>
            <select data-campo="herencia" class="w-full mt-1 bg-slate-900 border border-purple-500/60 rounded px-3 py-1.5 text-sm text-white font-bold focus:outline-none focus:border-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.15)]">
              <option value="false"${herencia ? '' : ' selected'}>NO</option>
              <option value="true"${herencia ? ' selected' : ''}>SÍ</option>
            </select>
          </div>
        </div>

        <div>
          <label class="text-[11px] font-semibold text-slate-400 uppercase">WhatsApp Remote JID / ID Grupo</label>
          <input type="text" data-campo="id_grupo" value="${jid}"${deshabilitado} class="w-full mt-1 rounded px-3 py-1.5 text-sm font-mono border ${campoJid(herencia)}">
        </div>

        <div class="border-t border-slate-800 pt-5 space-y-4" id="perfiles-reglas">
          ${reglasDelModo(herencia, reglas, monedaParaAgregar)}
        </div>

        ${footer}
      </div>
    </div>`;
}
