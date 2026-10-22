import { qs, clear, el } from '../../../shared/js/dom.js';

const KEY = 'glauk.reportes.plantillas';

function leer() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function guardarStorage(items) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* almacenamiento lleno */ }
}

export function crearPlantillas(ctx) {
  let mounted = false;

  function capturar() {
    return {
      rol: qs('#filtro-rol')?.value || '',
      entidad: qs('#filtro-entidad')?.value || '',
      hash: qs('#filtro-hash')?.value || '',
      desde: qs('#filtro-desde')?.value || '',
      hasta: qs('#filtro-hasta')?.value || '',
      orden: qs('#filtro-orden')?.value || 'fecha_desc',
      lote: qs('#reporte-lote')?.value || '',
      socio: qs('#reporte-socio')?.value || '',
      caption: qs('#reporte-caption')?.value || ''
    };
  }

  function aplicar(item) {
    qs('#filtro-rol').value = item.rol || '';
    qs('#filtro-entidad').value = item.entidad || '';
    qs('#filtro-hash').value = item.hash || '';
    qs('#filtro-desde').value = item.desde || '';
    qs('#filtro-hasta').value = item.hasta || '';
    qs('#filtro-orden').value = item.orden || 'fecha_desc';
    qs('#reporte-lote').value = item.lote || '';
    qs('#reporte-socio').value = item.socio || '';
    qs('#reporte-caption').value = item.caption || '';
    ctx.navigate('constructor');
    ctx.notify.success(`Plantilla “${item.nombre}” aplicada.`);
  }

  function render() {
    const host = qs('#plantillas-lista');
    if (!host) return;
    clear(host);
    const items = leer();
    if (!items.length) {
      host.append(el('div', { class: 'empty' }, 'Todavía no hay plantillas guardadas.'));
      return;
    }
    const grid = el('div', { class: 'grid cols-2' });
    for (const item of items) {
      const aplicarBtn = el('button', { class: 'btn btn-primary btn-sm', type: 'button' }, 'Aplicar');
      aplicarBtn.addEventListener('click', () => aplicar(item));
      const borrarBtn = el('button', { class: 'btn btn-danger btn-sm', type: 'button' }, 'Eliminar');
      borrarBtn.addEventListener('click', () => eliminar(item.nombre));
      grid.append(el('div', { class: 'panel stack' },
        el('div', { class: 'row between' }, el('strong', {}, item.nombre), el('span', { class: 'badge' }, item.creado || '—')),
        el('div', { class: 'small muted' }, [item.entidad || 'Todas', item.rol || 'Todos', item.desde, item.hasta].filter(Boolean).join(' · ')),
        el('div', { class: 'row' }, aplicarBtn, borrarBtn)
      ));
    }
    host.append(grid);
  }

  function guardar() {
    const nombre = qs('#plantilla-nombre')?.value.trim();
    if (!nombre) {
      ctx.notify.error('Escriba un nombre para la plantilla.');
      return;
    }
    const items = leer().filter((item) => item.nombre !== nombre);
    items.unshift({ nombre, ...capturar(), creado: new Date().toLocaleDateString('es-VE') });
    guardarStorage(items.slice(0, 20));
    if (qs('#plantilla-nombre')) qs('#plantilla-nombre').value = '';
    render();
    ctx.notify.success('Plantilla guardada en este navegador.');
  }

  function eliminar(nombre) {
    if (!globalThis.confirm(`¿Eliminar la plantilla “${nombre}”?`)) return;
    guardarStorage(leer().filter((item) => item.nombre !== nombre));
    render();
    ctx.notify.success('Plantilla eliminada.');
  }

  function mount() {
    if (mounted) return;
    mounted = true;
    qs('#btn-guardar-plantilla')?.addEventListener('click', guardar);
  }

  function show() { render(); }

  return { mount, show, render };
}
