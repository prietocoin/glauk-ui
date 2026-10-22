import { el } from '../../../shared/js/dom.js';
import {
  BANDERAS_EMOJI_FALLBACK,
  MONEDAS_CHECKLIST,
  obtenerUrlBandera
} from '../config.js';

function construirBandera(code) {
  const imagen = el('img', {
    class: 'flag',
    src: obtenerUrlBandera(code),
    alt: `Bandera ${code}`
  });
  const respaldo = el('span', { class: 'flag-fallback' });
  imagen.addEventListener('error', () => {
    imagen.remove();
    respaldo.textContent = BANDERAS_EMOJI_FALLBACK[code] || '🌐';
  });
  return [imagen, respaldo];
}

function construirBoton(code, activo, alAlternar) {
  const boton = el('button', {
    type: 'button',
    class: `check-card${activo ? ' selected' : ''}`,
    onclick: () => alAlternar(code)
  });
  const principal = el(
    'span',
    { class: 'check-card-main' },
    construirBandera(code),
    el('span', {}, code)
  );
  boton.append(principal, el('span', { class: 'check-mark' }, activo ? '✅' : '⬜'));
  return boton;
}

export function renderChecklistGrid(contenedor, socio, alAlternar) {
  let activos = 0;
  const botones = MONEDAS_CHECKLIST.map((code) => {
    const activo = Boolean(socio?.monedas?.[code]?.activo);
    if (activo) activos += 1;
    return construirBoton(code, activo, alAlternar);
  });

  contenedor.replaceChildren(...botones);
  document.getElementById('lblActiveCount').textContent = String(activos);
  document.getElementById('lblTotalCount').textContent = String(MONEDAS_CHECKLIST.length);
}
