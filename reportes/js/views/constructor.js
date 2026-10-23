import { qs, el, clear } from '../../../shared/js/dom.js';
import { formatDate, formatMoney, formatNumber } from '../../../shared/js/format.js';

const LIMITE_TABLA = 50;
const LIMITE_REPORTE = 20;

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

  function normalizarResultado(resultado) {
    if (Array.isArray(resultado)) {
      return { rows: resultado, total: resultado.length };
    }
    const rows = Array.isArray(resultado?.rows) ? resultado.rows : [];
    const total = resultado?.total != null && Number.isFinite(Number(resultado.total))
      ? Number(resultado.total)
      : rows.length;
    return { rows, total: Math.max(0, total) };
  }

  function actualizarContador(mostrados, total) {
    const badge = qs('#movimientos-count');
    if (badge) {
      badge.textContent = total > mostrados
        ? `Mostrando ${mostrados} de ${total} movimientos`
        : `${mostrados} movimientos`;
    }

    const aviso = qs('#movimientos-aviso');
    if (aviso) {
      const incluidasJpeg = Math.min(mostrados, LIMITE_REPORTE);
      aviso.textContent = total > incluidasJpeg
        ? `La tabla muestra ${mostrados} de ${total} movimientos. El JPEG incluye ${incluidasJpeg}.`
        : '';
      aviso.classList.toggle('hidden', total <= incluidasJpeg);
    }
  }

  async function consultar() {
    const filtros = ctx.filtros.leer();
    ctx.filtros.resumen(filtros);
    try {
      const respuesta = await ctx.api.movimientos({
        socio: filtros.entidad || '', rol: filtros.rol || '', hash: filtros.hash || '',
        fechaInicio: filtros.desde || '', fechaFin: filtros.hasta || '', orden: filtros.orden,
        limit: 100, offset: 0
      });

      const normalizado = normalizarResultado(respuesta);
      let rows = normalizado.rows;
      let total = normalizado.total;

      // El lote es un filtro local: el backend histórico no lo recibe en ListFilters.
      if (filtros.lote) {
        rows = rows.filter((row) => String(row.lote_tasa_asignado || '').toUpperCase() === filtros.lote.toUpperCase());
        total = rows.length;
      }

      ctx.state.rows = rows;
      ctx.state.totalMovimientos = total;
      ctx.preview.reset();

      const body = qs('#movimientos-tabla');
      clear(body);
      if (!rows.length) {
        body.append(el('tr', {}, el('td', { colspan: '5', class: 'empty' }, 'No hay movimientos para estos filtros.')));
      } else {
        for (const row of rows.slice(0, LIMITE_TABLA)) {
          body.append(el('tr', {},
            el('td', {}, formatDate(row.fecha_hora_comprobante)),
            el('td', {}, row.nombre_socio_1 || '—'),
            el('td', {}, row.tipo_op1 || '—'),
            el('td', {}, formatMoney(row.monto, row.moneda)),
            el('td', {}, formatMoney(row.me1, 'USDT'))
          ));
        }
      }

      actualizarContador(Math.min(rows.length, LIMITE_TABLA), total);
      return { rows, total };
    } catch (err) {
      ctx.notify.error(err.message || 'No se pudieron consultar los movimientos.');
      actualizarContador(0, 0);
      return { rows: [], total: 0 };
    }
  }

  function construirReporte(filtros, resultado) {
    const host = qs('#reporte-render');
    if (!host) return;
    clear(host);

    const { rows, total } = normalizarResultado(resultado);
    const incluidas = rows.slice(0, LIMITE_REPORTE);

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
    for (const row of incluidas) {
      tbody.append(el('tr', {},
        el('td', {}, formatDate(row.fecha_hora_comprobante)),
        el('td', {}, row.nombre_socio_1 || '—'),
        el('td', {}, row.tipo_op1 || '—'),
        el('td', {}, formatMoney(row.monto, row.moneda)),
        el('td', {}, formatMoney(row.me1, 'USDT'))
      ));
    }
    if (!incluidas.length) {
      tbody.append(el('tr', {}, el('td', { colspan: '5', class: 'center' }, 'Sin movimientos.')));
    }
    table.append(tbody);
    host.append(table);

    if (total > incluidas.length) {
      host.append(el('div', { class: 'reporte-aviso' },
        `Mostrando ${incluidas.length} de ${total} movimientos.`));
    }

    const totalME1 = incluidas.reduce((sum, row) => sum + Number(row.me1 || 0), 0);
    host.append(el('div', { class: 'reporte-total' },
      `ME1 total (${incluidas.length} filas): ${formatNumber(totalME1, 2)}`));
    host.append(el('div', { class: 'reporte-foot' },
      el('span', {}, `${incluidas.length} de ${total} operaciones · lote ${filtros.lote || 'vigente'}`),
      el('span', {}, 'Reporte generado en el navegador · Glauk')
    ));
  }

  async function generar() {
    const filtros = ctx.filtros.leer();
    const resultado = await consultar();
    construirReporte(filtros, resultado);
    const { rows, total } = normalizarResultado(resultado);
    await ctx.preview.generar(
      qs('#reporte-render'),
      meta(filtros),
      rows.slice(0, LIMITE_REPORTE),
      total
    );
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
