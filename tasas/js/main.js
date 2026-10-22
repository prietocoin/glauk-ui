import { qsa } from '../../shared/js/dom.js';
import { initPWA } from './pwa.js';
import { cerrarModal } from './ui/modal.js';
import { initMonitor } from './views/monitor.js';
import { initSocios } from './views/socios.js';
import { initPreview } from './views/preview.js';

const monitor = initMonitor();
const socios = initSocios();
initPreview();

function switchTab(numero) {
  const esMonitor = numero === 1;
  document.getElementById('tab1').classList.toggle('hidden', !esMonitor);
  document.getElementById('tab2').classList.toggle('hidden', esMonitor);
  document.getElementById('stickyFooter').classList.toggle('hidden', esMonitor);

  const boton1 = document.getElementById('btnTab1');
  const boton2 = document.getElementById('btnTab2');
  boton1.classList.toggle('active', esMonitor);
  boton2.classList.toggle('active', !esMonitor);
  boton1.setAttribute('aria-selected', String(esMonitor));
  boton2.setAttribute('aria-selected', String(!esMonitor));
}

qsa('[data-tab]').forEach((boton) => {
  boton.addEventListener('click', () => switchTab(Number(boton.dataset.tab)));
});

document.addEventListener('click', (evento) => {
  const boton = evento.target.closest('[data-close-modal]');
  if (boton) cerrarModal(boton.dataset.closeModal);
});

switchTab(1);
initPWA();

window.addEventListener('load', async () => {
  await monitor.refresh();
  await socios.refresh();
});
