import { CATALOGO_MONEDAS } from '../catalog.js';
import { formatTasa } from '../../../shared/js/formatters.js?v=20261024_24';
import { escapeHTML } from '../../../shared/js/dom.js';

/** Truncamiento estricto a 2 decimales (sin Math.round). */
export function truncar2(valor) {
  const num = Number(valor);
  if (!Number.isFinite(num)) return 0;
  return Math.trunc(num * 100) / 100;
}

/** Tasa base de la divisa en el lote activo; cae al catálogo si no existe. */
export function baseMoneda(regla, tasasBase) {
  const delLote = Number(tasasBase?.tasas?.[regla?.codigo]);
  if (Number.isFinite(delLote) && delLote > 0) return delLote;
  const delCatalogo = Number(regla?.base ?? CATALOGO_MONEDAS[regla?.codigo]?.base);
  return Number.isFinite(delCatalogo) && delCatalogo > 0 ? delCatalogo : 0;
}

/**
 * Tasa resultante del spread. Réplica exacta del Core:
 *   D -> base * (1 + deposito/100)
 *   P -> base * (1 - pago/100)
 * con truncamiento atómico a 2 decimales.
 */
export function tasaResultante(base, porcentaje, tipo) {
  const pct = Math.abs(Number(porcentaje) || 0) / 100;
  const factor = String(tipo).toUpperCase() === 'P' ? 1 - pct : 1 + pct;
  return truncar2((Number(base) || 0) * factor);
}

/** Formato universal de tasa (regla compartida de toda la plataforma). */
export const formatearTasa = formatTasa;

function urlBandera(regla) {
  const iso = String(regla?.iso || '').trim().toLowerCase();
  return iso ? `/tasas/flags/${iso}.png` : '';
}

function opcionesCatalogo(seleccionada, reglas) {
  return Object.entries(CATALOGO_MONEDAS).map(([codigo, meta]) => {
    const usada = reglas.some((regla) => regla.codigo === codigo);
    const selected = codigo === seleccionada ? ' selected' : '';
    const disabled = usada ? ' disabled' : '';
    return `<option value="${codigo}"${selected}${disabled}>${escapeHTML(meta.iso)} ${escapeHTML(meta.nombre)} (${codigo})</option>`;
  }).join('');
}

function renderDef(regla, index) {
  const esD = regla.tipo !== 'P';
  return `
    <div class="regla-def" role="group" aria-label="Naturaleza por defecto de ${escapeHTML(regla.codigo)}">
      <span class="regla-def-label">DEF</span>
      <button type="button" data-accion="tipo" data-indice="${index}" data-tipo="D"
              class="${esD ? 'is-active' : ''}" aria-pressed="${esD}" title="Defecto Depósito">D</button>
      <button type="button" data-accion="tipo" data-indice="${index}" data-tipo="P"
              class="${esD ? '' : 'is-active'}" aria-pressed="${!esD}" title="Defecto Pago">P</button>
    </div>`;
}

function renderOperacion({ regla, index, campo, tipo, base, flecha }) {
  const esDeposito = tipo === 'D';
  const polar = esDeposito ? regla.polar_D : regla.polar_P;
  const positivo = polar === '+';
  const porcentaje = esDeposito ? regla.deposito : regla.pago;
  const resultado = tasaResultante(base, porcentaje, tipo);
  const titulo = positivo ? '+ Suma' : '- Resta';

  return `
    <div class="regla-op ${esDeposito ? 'is-dep' : 'is-pago'}">
      <div class="regla-op-head">
        <span class="regla-arrow" aria-hidden="true">${flecha}</span>
        <span>${esDeposito ? 'DEPÓSITO (D) %' : 'PAGO (P) %'}</span>
      </div>
      <div class="regla-op-row">
        <input type="number" step="0.01" inputmode="decimal"
               aria-label="${esDeposito ? 'Spread de depósito' : 'Spread de pago'} de ${escapeHTML(regla.codigo)}"
               data-regla="${index}" data-campo="${campo}"
               value="${escapeHTML(porcentaje)}">
        <span class="regla-result" data-resultado="${index}-${campo}" title="Tasa resultante">${formatearTasa(resultado)}</span>
        <button type="button"
                data-accion="${esDeposito ? 'toggle-dep' : 'toggle-pago'}"
                data-indice="${index}"
                data-signo="${escapeHTML(polar)}"
                class="regla-sign ${positivo ? 'is-pos' : 'is-neg'}"
                title="${titulo}"
                aria-label="${titulo}">${positivo ? '+' : '-'}</button>
      </div>
    </div>`;
}

function renderRegla(regla, index, tasasBase) {
  const base = baseMoneda(regla, tasasBase);
  const bandera = urlBandera(regla);
  const alt = `Bandera ${escapeHTML(regla.codigo)}`;

  return `
    <div class="regla-card">
      <div class="regla-head">
        <div class="regla-id">
          ${bandera ? `<img class="regla-flag" src="${bandera}" alt="${alt}" loading="lazy" onerror="this.style.display='none'">` : ''}
          <span class="regla-name">${escapeHTML(regla.nombre)} <span class="regla-code">(${escapeHTML(regla.codigo)})</span></span>
        </div>

        <div class="regla-head-actions">
          <span class="regla-base" title="Tasa base del lote activo">${formatearTasa(base)}</span>
          ${renderDef(regla, index)}
          <button type="button" data-accion="eliminar-moneda" data-indice="${index}"
                  class="regla-del" title="Quitar moneda" aria-label="Quitar ${escapeHTML(regla.codigo)}">🗑️</button>
        </div>
      </div>

      <div class="regla-ops">
        ${renderOperacion({ regla, index, campo: 'deposito', tipo: 'D', base, flecha: '↓' })}
        ${renderOperacion({ regla, index, campo: 'pago', tipo: 'P', base, flecha: '↑' })}
      </div>
    </div>`;
}

// Vista editable: selector de catálogo, tarjetas por moneda y empty state.
// Sin scroll interno: el único scroll es el body del modal.
export function renderReglasEditor(reglas = [], monedaParaAgregar = '', tasasBase = null) {
  const tarjetas = reglas.length
    ? `<div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">${reglas.map((regla, index) => renderRegla(regla, index, tasasBase)).join('')}</div>`
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

        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <select id="perfiles-moneda-agregar" aria-label="Moneda para agregar" class="min-h-11 bg-[#030611] border border-slate-700 text-xs rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500">
            <option value="">Seleccionar país/moneda...</option>
            ${opcionesCatalogo(monedaParaAgregar, reglas)}
          </select>
          <button type="button" data-accion="agregar-moneda"${deshabilitado} class="min-h-11 px-3 py-2 rounded-lg border border-cyan-500/50 bg-cyan-500/10 text-cyan-400 text-xs font-bold hover:bg-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-1">+ Agregar Moneda</button>
        </div>
      </div>

      ${tarjetas}
      ${vacio}
    </div>`;
}
