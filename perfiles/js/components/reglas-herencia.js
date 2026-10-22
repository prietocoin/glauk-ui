import { escapeHTML } from '../../../shared/js/dom.js';

function etiquetaBase(base) {
  return base ? Number(base).toLocaleString() : '-';
}

function renderFila(regla) {
  const claseDep = regla.dep_op === '+' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold';
  const clasePago = regla.pago_op === '+' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold';
  return `
    <div class="px-4 py-2.5 border-b border-slate-800/50 last:border-0 flex items-center justify-between hover:bg-slate-800/30 transition">
      <div class="flex items-center gap-3">
        <span class="text-xs font-mono font-bold text-cyan-400">${escapeHTML(regla.iso)}</span>
        <div>
          <p class="text-xs font-bold text-slate-200">${escapeHTML(regla.nombre)} (${escapeHTML(regla.codigo)})</p>
          <p class="text-[10px] text-slate-500 font-mono">Base: ${escapeHTML(etiquetaBase(regla.base))}</p>
        </div>
      </div>

      <div class="flex items-center gap-4 text-xs font-mono">
        <div class="flex flex-col items-end">
          <span class="text-[9px] text-cyan-500/70 font-sans font-bold">DEPÓSITO (D)</span>
          <span class="text-slate-300">
            <span class="${claseDep}">${escapeHTML(regla.dep_op)}</span>
            <span>${escapeHTML(regla.deposito)}%</span>
          </span>
        </div>
        <div class="w-px h-6 bg-slate-800"></div>
        <div class="flex flex-col items-start">
          <span class="text-[9px] text-amber-500/70 font-sans font-bold">PAGO (P)</span>
          <span class="text-slate-300">
            <span class="${clasePago}">${escapeHTML(regla.pago_op)}</span>
            <span>${escapeHTML(regla.pago)}%</span>
          </span>
        </div>
      </div>
    </div>`;
}

// Vista de solo lectura para socios con herencia. La matriz se resuelve en el
// dominio (FUNDDA o GENERAL) y aquí solo se pinta, igual que el template x-if
// original.
export function renderReglasHerencia(reglas = []) {
  const filas = reglas.length
    ? reglas.map(renderFila).join('')
    : '<div class="p-6 text-center text-xs text-slate-500">FUNDDA no tiene reglas configuradas en la base de datos.</div>';

  return `
    <div class="space-y-4">
      <div class="bg-purple-950/40 border border-purple-500/40 rounded-xl p-3.5 flex items-start gap-3">
        <span class="text-lg">🔗</span>
        <div>
          <h4 class="text-xs font-bold text-purple-300 uppercase tracking-wide">Modo Herencia Activado (Solo Lectura)</h4>
          <p class="text-xs text-purple-200/80 mt-0.5">Este socio hereda la configuración del perfil matriz (FUNDDA). Los valores a continuación son referencias informativas.</p>
        </div>
      </div>

      <div class="bg-[#050a1e] border border-slate-800 rounded-xl overflow-hidden">
        <div class="px-4 py-2 bg-slate-900/50 border-b border-slate-800 flex justify-between items-center">
          <span class="text-xs font-bold text-slate-400 uppercase">Reglas del Perfil Matriz (FUNDDA)</span>
          <span class="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">${reglas.length} países</span>
        </div>
        <div class="max-h-[300px] overflow-y-auto">${filas}</div>
      </div>
    </div>`;
}
