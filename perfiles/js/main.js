import { api } from './api.js';
import { state } from './store.js';
import { crearEditor } from './controllers/editor.js';
import { crearDirectorio } from './controllers/directorio.js';
import { crearAcciones } from './controllers/acciones.js';

async function recargarSocios() {
  try {
    state.socios = await api.listar();
  } catch (err) {
    console.error('Error cargando socios:', err);
  }
  directorio.render();
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
  void recargarSocios();
}

boot();
