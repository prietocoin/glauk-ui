import { qs, qsa } from '../../shared/js/dom.js';
import { success, error } from '../../shared/js/toast.js';
import { api } from './api.js';
import { crearFiltros } from './components/filtros.js';
import { crearPreview } from './components/preview.js';
import { crearConstructor } from './views/constructor.js';
import { crearPlantillas } from './views/plantillas.js';

const state = {
  view: 'constructor', socios: [], rows: [], totalMovimientos: 0,
  filtros: { roles: [], entidades: [], hashes: [] },
  reporte: { blob: null, base64: '', key: '', meta: null }
};

const ctx = { api, state, notify: { success, error }, navigate };

const filtros = crearFiltros(ctx);
const preview = crearPreview(ctx);
const constructor = crearConstructor(ctx);
const plantillas = crearPlantillas(ctx);
ctx.filtros = filtros;
ctx.preview = preview;
ctx.constructor = constructor;

const views = { constructor, plantillas };

function navigate(view) {
  state.view = view;
  qsa('[data-view]').forEach((tab) => tab.classList.toggle('active', tab.dataset.view === view));
  qsa('.view').forEach((section) => section.classList.toggle('hidden', section.id !== `view-${view}`));
  views[view]?.show?.();
}

async function cargarSocios() {
  try {
    state.socios = await api.socios();
    const select = qs('#reporte-socio');
    select.replaceChildren();
    select.append(new Option('Seleccione un socio…', ''));
    for (const socio of state.socios) select.append(new Option(socio.nombre, socio.nombre));
  } catch (err) {
    error(err.message || 'No se pudieron cargar los socios.');
  }
}

function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const script = new URL('../sw.js', import.meta.url);
  const scope = new URL('../', import.meta.url).pathname;
  navigator.serviceWorker.register(script, { scope }).catch(() => { /* offline opcional */ });
}

async function boot() {
  qsa('[data-view]').forEach((tab) => tab.addEventListener('click', () => navigate(tab.dataset.view)));
  filtros.mount();
  preview.mount();
  constructor.mount();
  plantillas.mount();
  registrarServiceWorker();
  await Promise.all([cargarSocios(), filtros.cargar()]);
  constructor.show();
  navigate('constructor');
}

boot().catch((err) => error(err.message || 'No se pudo iniciar Reportes.'));
