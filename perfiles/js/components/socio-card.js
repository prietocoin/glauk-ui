import { escapeHTML } from '../../../shared/js/dom.js';

// Tarjeta del directorio. Conserva las clases, badges y acciones del HTML
// original de PerfilHub; solo se sustituyen x-text/x-for por interpolación
// segura y data-attributes para la delegación de eventos.
export function renderSocioCard(socio) {
  const tasas = Boolean(socio?.mostrar?.tasas);
  const herencia = Boolean(socio?.herencia);
  const nombre = escapeHTML(socio?.nombre || '');
  const rol = escapeHTML(socio?.rol || 'SOCIO');
  const moneda = escapeHTML(socio?.moneda_base || 'USDT');
  const jid = escapeHTML(socio?.id_grupo || 'Sin JID configurado');
  const claseWa = tasas
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
    : 'bg-slate-800 text-slate-400 border-slate-700';
  const clasePunto = tasas ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500';
  const claseHerencia = herencia
    ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
    : 'bg-slate-800 text-slate-400 border-slate-700';
  const claseToggle = tasas
    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
    : 'bg-slate-800 text-slate-500 border-slate-700';

  return `
    <div class="bg-[#070e23] border border-slate-800/90 hover:border-slate-700/80 rounded-xl p-3 md:p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition shadow-sm" data-socio="${nombre}">
      <div class="flex flex-wrap items-center gap-3">
        <span class="text-base font-bold text-white tracking-wide">${nombre}</span>

        <span class="text-[11px] font-semibold px-2 py-0.5 rounded-md border flex items-center gap-1 ${claseWa}">
          <span class="w-1.5 h-1.5 rounded-full ${clasePunto}"></span>
          <span>${tasas ? 'WA: Activo' : 'WA: Inactivo'}</span>
        </span>

        <span class="text-[11px] font-semibold px-2 py-0.5 rounded-md border ${claseHerencia}">
          <span>${herencia ? '🔗 HERENCIA: ON' : '⛓️‍💥 HERENCIA: OFF'}</span>
        </span>

        <span class="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">${rol}</span>
        <span class="text-[11px] font-semibold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">${moneda}</span>
        <span class="text-xs text-slate-400 font-mono">${jid}</span>
      </div>

      <div class="flex items-center gap-2 self-end md:self-auto">
        <button type="button" data-accion="toggle" class="p-2 rounded-lg border hover:scale-105 transition ${claseToggle}" title="Activar/Desactivar Tasas">⚡</button>
        <button type="button" data-accion="configurar" class="px-3 py-1.5 rounded-lg border border-purple-500/40 bg-purple-600/20 text-purple-200 text-xs font-semibold hover:bg-purple-600/30 transition flex items-center gap-1.5">⚙ Configurar</button>
        <button type="button" data-accion="eliminar" class="p-2 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition" title="Eliminar socio">🗑</button>
      </div>
    </div>`;
}
