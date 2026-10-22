import { el } from '../../../shared/js/dom.js';

function construirFila(socio, alSeleccionar) {
  const activo = socio.activo !== false;
  const fila = el('button', {
    type: 'button',
    class: 'partner-option',
    onclick: () => alSeleccionar(socio.nombre)
  });

  const principal = el(
    'span',
    { class: 'partner-option-main' },
    el('span', { class: `status-dot${activo ? ' active' : ''}` }),
    el('span', { class: 'partner-name' }, socio.nombre)
  );

  fila.append(principal, el('span', { class: 'partner-base' }, socio.moneda_base || 'USDT'));
  return fila;
}

export function renderPartnerList(contenedor, socios, filtro, alSeleccionar) {
  const busqueda = String(filtro || '').toLowerCase();
  const visibles = socios
    .filter((socio) => String(socio.nombre || '').toLowerCase().includes(busqueda))
    .map((socio) => construirFila(socio, alSeleccionar));
  contenedor.replaceChildren(...visibles);
}
