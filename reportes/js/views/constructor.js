import { qs, el, clear } from '../../../shared/js/dom.js';
import { formatDate, formatMoney, formatNumber } from '../../../shared/js/format.js';

export function crearConstructor(ctx) {
  let mounted = false;

  function meta(filtros) {
    return {
      socio: qs('#reporte-socio')?.value || '',
      entidad: filtros.entidad || 'Todas',
      rol: filtros.rol || 'Todos',
      desde: filtros.desde || '—',
      hasta: filtros.hasta || '—',
      lote: filtros.lote || 'Vigente',
      hash: filtros.hash || 'Todos'
    };
  }

  async function consultar() {
    const filtros = ctx.filtros.leer();
    ctx.filtros.resumen(filtros);
    try {
      let rows = await ctx.api.movimientos({
        socio: filtros.entidad || '', rol: filtros.rol || '', hash: filtros.hash || '',
        fechaInicio: filtros.desde || '', fechaFin: filtros.hasta || '', orden: filtros.orden
      });
      if (!Array.isArray(rows)) rows = [];
      if (filtros.lote) {
        rows = rows.filter((row) => String(row.lote_tasa_asignado || '').toUpperCase() === filtros.lote.toUpperCase());
      }
      ctx.state.rows = rows;
      ctx.preview.reset();
      const body = qs('#movimientos-tabla');
      clear(body);
      if (!rows.length) {
        body.append(el('tr', {}, el('td', { colspan: '5', class: 'empty' }, 'No hay movimientos para estos filtros.')));
      } else {
        for (const row of rows.slice(0, 50)) {
          body.append(el('tr', {},
            el('td', {}, formatDate(row.fecha_hora_comprobante)),
            el('td', {}, row.nombre_socio_1 || '—'),
            el('td', {}, row.tipo_op1 || '—'),
            el('td', {}, formatMoney(row.monto, row.moneda)),
            el('td', {}, formatMoney(row.me1, 'USDT'))
          ));
        }
      }
      qs('#movimientos-count').textContent = `${rows.length} filas`;
      return rows;
    } catch (err) {
      ctx.notify.error(err.message || 'No se pudieron consultar los movimientos.');
      return [];
    }
  }

  function construirReporte(filtros, rows) {
    const host = qs('#reporte-render');
    if (!host) return;
    clear(host);
    const logo = el('img', { src: '../shared/brand/logo-fundablock.png', alt: 'FUNDABLOCK', style: 'width:88px;height:auto' });
    host.append(el('header', {},
      el('div', { class: 'row' }, logo, el('div', {}, el('h2', {}, 'FUNDABLOCK'), el('p', {}, 'Glaukov Engine · Reportes'))),
      el('div', { style: 'text-align:right' }, el('h1', {}, 'REPORTE'), el('small', {}, formatDate(new Date(), true)))
    ));
    host.append(el('div', { class: 'reporte-meta' },
      el('div', {}, el('strong', {}, 'Entidad'), el('div', {}, filtros.entidad || 'Todas')),
      el('div', {}, el('strong', {}, 'Rol'), el('div', {}, filtros.rol || 'Todos')),
      el('div', {}, el('strong', {}, 'Periodo'), el('div', {}, `${filtros.desde || '—'} / ${filtros.hasta || '—'}`))
    ));
    const table = el('table', {}, el('thead', {}, el('tr', {},
      ['Fecha', 'Socio', 'Operación', 'Monto', 'ME1'].map((title) => el('th', {}, title))
    )));
    const tbody = el('tbody');
    for (const row of rows.slice(0, 20)) tbody.append(el('tr', {},
      el('td', {}, formatDate(row.fecha_hora_comprobante)),
      el('td', {}, row.nombre_socio_1 || '—'),
      el('td', {}, row.tipo_op1 || '—'),
      el('td', {}, formatMoney(row.monto, row.moneda)),
      el('td', {}, formatMoney(row.me1, 'USDT'))
    ));
    if (!rows.length) tbody.append(el('tr', {}, el('td', { colspan: '5', class: 'center' }, 'Sin movimientos.')));
    table.append(tbody);
    host.append(table);
    const total = rows.reduce((sum, row) => sum + Number(row.me1 || 0), 0);
    host.append(el('div', { class: 'reporte-total' }, `ME1 total: ${formatNumber(total, 2)}`));
    host.append(el('div', { class: 'reporte-foot' },
      el('span', {}, `${rows.length} operaciones · lote ${filtros.lote || 'vigente'}`),
      el('span', {}, 'Reporte generado en el navegador · Glauk')
    ));
  }

  async function generar() {
    const filtros = ctx.filtros.leer();
    const rows = await consultar();
    construirReporte(filtros, rows);
    await ctx.preview.generar(qs('#reporte-render'), meta(ctx.filtros.leer()), rows);
  }

  function mount() {
    if (mounted) return;
    mounted = true;
    qs('#btn-consultar')?.addEventListener('click', consultar);
    qs('#btn-generar')?.addEventListener('click', generar);
  }

  function show() {
    ctx.filtros.show();
  }

  return { mount, show, consultar, generar, construirReporte };
}
