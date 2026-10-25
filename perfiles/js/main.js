import { api } from './api.js?v=20261024_23';
import { state } from './store.js?v=20261024_23';
import { crearEditor } from './controllers/editor.js?v=20261024_23';
import { crearDirectorio } from './controllers/directorio.js?v=20261024_23';
import { crearAcciones } from './controllers/acciones.js?v=20261024_23';

async function recargarSocios() {
  try {
    state.socios = await api.listar();
  } catch (err) {
    console.error('Error cargando socios:', err);
  }
  directorio.render();
}

// Lote activo de tasas para la píldora "base" y el cálculo en vivo del spread.
async function cargarTasasBase() {
  try {
    state.tasasBase = await api.tasasUltimas();
  } catch (err) {
    console.warn('No se pudo cargar el lote activo de tasas:', err);
  }
  if (state.modalAbierto) editor.render();
}

const editor = crearEditor({ recargar: recargarSocios });
const directorio = crearDirectorio({
  recargar: recargarSocios,
  editar: (socio) => editor.abrir(socio)
});
const acciones = crearAcciones({
  recargar: recargarSocios,
  editar: (socio) => editor.abrir(socio)
});

function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const script = new URL('../sw.js', import.meta.url);
  const scope = new URL('../', import.meta.url).pathname;
  navigator.serviceWorker.register(script, { scope }).catch(() => { /* offline opcional */ });
}

function boot() {
  directorio.mount();
  editor.mount();
  acciones.mount();
  registrarServiceWorker();
  directorio.render();
  void cargarTasasBase();
  void recargarSocios();
}

boot();
