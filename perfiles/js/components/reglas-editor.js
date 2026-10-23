import { CATALOGO_MONEDAS } from '../catalog.js';
import { escapeHTML } from '../../../shared/js/dom.js';

function etiquetaBase(base) {
  return base ? Number(base).toLocaleString() : '-';
}

function opcionesCatalogo(seleccionada, reglas) {
  return Object.entries(CATALOGO_MONEDAS).map(([codigo, meta]) => {
    const usada = reglas.some((regla) => regla.codigo === codigo);
    const selected = codigo === seleccionada ? ' selected' : '';
    const disabled = usada ? ' disabled' : '';
    return `<option value="${codigo}"${selected}${disabled}>${escapeHTML(meta.iso)} ${escapeHTML(meta.nombre)} (${codigo})</option>`;
  }).join('');
}

function renderRegla(regla, index) {
  const claseDep = regla.polar_D === '+' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : 'border-rose-500/40 bg-rose-500/10 text-rose-400';
  const clasePago = regla.polar_P === '-' ? 'border-rose-500/40 bg-rose-500/10 text-rose-400' : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400';
  const textoDep = regla.polar_D === '+' ? '+ Suma' : '- Resta';
  const textoPago = regla.polar_P === '-' ? '- Resta' : '+ Suma';
  const base = escapeHTML(etiquetaBase(regla.base));
  return `
    <div class="bg-[#050a1e] border border-purple-500/30 hover:border-purple-500/50 rounded-xl p-3.5 space-y-3 shadow-md transition">
      <div class="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <div class="flex items-center gap-2">
          <span class="text-xs font-mono font-bold text-cyan-400">${escapeHTML(regla.iso)}</span>
          <span class="text-sm font-bold text-white tracking-wide">${escapeHTML(regla.nombre)} (${escapeHTML(regla.codigo)})</span>
        </div>

        <div class="flex items-center gap-3">
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] font-bold uppercase text-slate-400">DEF:</span>
            <select data-regla="${index}" data-campo="tipo" class="bg-[#030611] border border-slate-700 text-xs text-cyan-400 rounded px-2 py-0.5 font-bold focus:outline-none">
              <option value="D"${regla.tipo === 'D' ? ' selected' : ''}>D (Depósito)</option>
              <option value="P"${regla.tipo === 'P' ? ' selected' : ''}>P (Pago)</option>
            </select>
          </div>

          <button type="button" data-accion="eliminar-moneda" data-indice="${index}" class="text-slate-400 hover:text-rose-400 text-sm transition p-1" title="Quitar país">🗑</button>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="bg-[#030611] rounded-lg p-2.5 space-y-1.5 border border-cyan-950/80">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold text-cyan-400">DEPÓSITO (D) %</span>
            <span class="text-[10px] font-mono text-slate-500">${base}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <input type="number" step="0.01" data-regla="${index}" data-campo="deposito" value="${escapeHTML(regla.deposito)}" class="w-full bg-[#070e23] border border-slate-800 rounded px-2 py-1 text-center font-bold text-xs text-white focus:outline-none focus:border-cyan-500">
            <button type="button" data-accion="toggle-dep" data-indice="${index}" class="px-2 py-1 rounded text-[11px] font-bold border shrink-0 transition ${claseDep}">${textoDep}</button>
          </div>
        </div>

        <div class="bg-[#030611] rounded-lg p-2.5 space-y-1.5 border border-amber-950/80">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold text-amber-400">PAGO (P) %</span>
            <span class="text-[10px] font-mono text-slate-500">${base}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <input type="number" step="0.01" data-regla="${index}" data-campo="pago" value="${escapeHTML(regla.pago)}" class="w-full bg-[#070e23] border border-slate-800 rounded px-2 py-1 text-center font-bold text-xs text-white focus:outline-none focus:border-amber-500">
            <button type="button" data-accion="toggle-pago" data-indice="${index}" class="px-2 py-1 rounded text-[11px] font-bold border shrink-0 transition ${clasePago}">${textoPago}</button>
          </div>
        </div>
      </div>
    </div>`;
}

// Vista editable: selector de catálogo, tarjetas por moneda y empty state.
export function renderReglasEditor(reglas = [], monedaParaAgregar = '') {
  const tarjetas = reglas.length
    ? `<div class="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[380px] overflow-y-auto pr-1">${reglas.map(renderRegla).join('')}</div>`
    : '';
  const vacio = reglas.length === 0
    ? '<div class="text-center py-6 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">Sin reglas configuradas.</div>'
    : '';
  const deshabilitado = monedaParaAgregar ? '' : ' disabled';
  return `
    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 class="text-xs font-bold text-slate-200 tracking-wider uppercase flex items-center gap-2">
          <span>Reglas Individuales (%)</span>
          <span class="text-[10px] px-2 py-0.5 rounded border bg-cyan-500/10 text-cyan-300 border-cyan-500/20">${reglas.length} activas</span>
        </h3>

        <div class="flex items-center gap-2">
          <select id="perfiles-moneda-agregar" class="bg-[#030611] border border-slate-700 text-xs rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500">
            <option value="">Seleccionar país/moneda...</option>
            ${opcionesCatalogo(monedaParaAgregar, reglas)}
          </select>
          <button type="button" data-accion="agregar-moneda"${deshabilitado} class="px-3 py-1.5 rounded-lg border border-cyan-500/50 bg-cyan-500/10 text-cyan-400 text-xs font-bold hover:bg-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1">+ Agregar Moneda</button>
        </div>
      </div>

      ${tarjetas}
      ${vacio}
    </div>`;
}
