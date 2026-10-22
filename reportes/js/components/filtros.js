import { qs, renderOptions } from '../../../shared/js/dom.js';
import { formatDateInput } from '../../../shared/js/format.js';

export function crearFiltros(ctx) {
  let mounted = false;
  let ultima = 0;
  let cache = null;

  async function cargar(rol = '') {
    const badge = qs('#filtros-cache');
    try {
      if (cache && Date.now() - ultima < 60000 && !rol) {
        aplicar(cache);
      } else {
        const data = await ctx.api.filtros(rol);
        cache = data;
        ultima = Date.now();
        aplicar(data);
      }
      if (badge) badge.textContent = 'Filtros vigentes';
    } catch (err) {
      if (badge) badge.textContent = 'Sin filtros';
      ctx.notify.error(err.message || 'No se pudieron cargar los filtros.');
    }
  }

  function aplicar(data) {
    const rolActual = qs('#filtro-rol')?.value || '';
    renderOptions(qs('#filtro-rol'), data.roles || [], 'Todos');
    if (rolActual) qs('#filtro-rol').value = rolActual;
    renderOptions(qs('#filtro-entidad'), data.entidades || [], 'Todas');
    renderOptions(qs('#filtro-hash'), data.hashes || [], 'Todos');
    ctx.state.filtros = {
      roles: data.roles || [], entidades: data.entidades || [], hashes: data.hashes || []
    };
  }

  function leer() {
    return {
      rol: qs('#filtro-rol')?.value || '',
      entidad: qs('#filtro-entidad')?.value || '',
      hash: qs('#filtro-hash')?.value || '',
      desde: qs('#filtro-desde')?.value || '',
      hasta: qs('#filtro-hasta')?.value || '',
      orden: qs('#filtro-orden')?.value || 'fecha_desc',
      lote: qs('#reporte-lote')?.value.trim() || ''
    };
  }

  function resumen(filtros) {
    const host = qs('#filtros-resumen');
    if (!host) return;
    const partes = [];
    if (filtros.rol) partes.push(`rol ${filtros.rol}`);
    if (filtros.entidad) partes.push(`entidad ${filtros.entidad}`);
    if (filtros.hash) partes.push('hash seleccionado');
    if (filtros.desde) partes.push(`desde ${filtros.desde}`);
    if (filtros.hasta) partes.push(`hasta ${filtros.hasta}`);
    host.textContent = partes.length ? partes.join(' · ') : 'Sin filtros: se consultarán los movimientos más recientes.';
  }

  function limpiar() {
    qs('#filtro-rol').value = '';
    qs('#filtro-entidad').value = '';
    qs('#filtro-hash').value = '';
    qs('#filtro-orden').value = 'fecha_desc';
    qs('#filtro-desde').value = formatDateInput(new Date());
    qs('#filtro-hasta').value = formatDateInput(new Date());
    resumen(leer());
    return leer();
  }

  function mount() {
    if (mounted) return;
    mounted = true;
    qs('#filtro-rol')?.addEventListener('change', (event) => cargar(event.target.value));
    qs('#btn-limpiar')?.addEventListener('click', limpiar);
  }

  function show() {
    if (!qs('#filtro-desde')?.value) limpiar();
  }

  return { mount, show, cargar, leer, resumen, limpiar };
}
