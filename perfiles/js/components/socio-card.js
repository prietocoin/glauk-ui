import { escapeHTML } from '../../../shared/js/dom.js';

// Iconos SVG (currentColor) para que los estados iluminados apliquen color real.
const ICONO_RAYO = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z"/></svg>';
const ICONO_LINK = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11.4 4.5"/><path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07l1.42-1.42"/></svg>';
const ICONO_ENGANCHE = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>';
const ICONO_CESTO = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>';

/**
 * Tarjeta horizontal de alta densidad. Solo nombre + divisa a la izquierda y
 * cuatro acciones táctiles de 36x36 a la derecha. El JID, los spreads, el rol
 * y la configuración de monedas viven exclusivamente en el modal.
 */
export function renderSocioCard(socio) {
  const tasas = Boolean(socio?.mostrar?.tasas);
  const herencia = socio?.herencia === true || socio?.herencia === 'true';
  const nombre = escapeHTML(socio?.nombre || '');
  const moneda = escapeHTML(socio?.moneda_base || 'USDT');

  return `
    <div class="socio-card" data-socio="${nombre}">
      <div class="socio-card__main">
        <span class="socio-card__name" title="${nombre}">${nombre}</span>
        <span class="socio-card__currency">${moneda}</span>
      </div>

      <div class="socio-card__actions">
        <button type="button"
                data-accion="toggle"
                class="socio-action ${tasas ? 'is-wa-on' : 'is-off'}"
                aria-pressed="${tasas}"
                title="WhatsApp ${tasas ? 'activo' : 'inactivo'}"
                aria-label="Alternar WhatsApp">${ICONO_RAYO}</button>

        <button type="button"
                data-accion="herencia"
                class="socio-action ${herencia ? 'is-herencia-on' : 'is-off'}"
                aria-pressed="${herencia}"
                title="Herencia ${herencia ? 'activa' : 'inactiva'}"
                aria-label="Alternar herencia de tasas">${ICONO_LINK}</button>

        <button type="button"
                data-accion="configurar"
                class="socio-action is-config"
                title="Configurar socio"
                aria-label="Configurar socio">${ICONO_ENGANCHE}</button>

        <button type="button"
                data-accion="eliminar"
                class="socio-action is-delete"
                title="Eliminar socio"
                aria-label="Eliminar socio">${ICONO_CESTO}</button>
      </div>
    </div>`;
}
