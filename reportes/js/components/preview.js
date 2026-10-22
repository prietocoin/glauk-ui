import { qs, el } from '../../../shared/js/dom.js';
import { generarReporteJPEG, descargarBlob } from '../../../shared/js/reporte-canvas.js';
import { idempotencyKey } from '../../../shared/js/http.js';

export function crearPreview(ctx) {
  let mounted = false;

  function reset() {
    ctx.state.reporte = { blob: null, base64: '', key: '', meta: null };
    qs('#btn-descargar').disabled = true;
    qs('#btn-enviar').disabled = true;
    qs('#canvas-estado').textContent = 'Listo';
    qs('#reportes-badge').textContent = 'Sin generar';
    qs('#reporte-preview').replaceChildren(el('div', { class: 'empty' }, 'Genere el reporte para ver la vista previa.'));
    qs('#reporte-resultado').textContent = '';
  }

  async function generar(elemento, meta, filas) {
    try {
      qs('#canvas-estado').textContent = 'Generando…';
      qs('#btn-generar').disabled = true;
      const resultado = await generarReporteJPEG({ elemento });
      ctx.state.reporte = {
        blob: resultado.blob, base64: resultado.base64,
        key: idempotencyKey(), meta: { ...meta, filas: filas.length }
      };
      const image = el('img', { src: `data:image/jpeg;base64,${resultado.base64}`, alt: 'Vista previa del reporte' });
      qs('#reporte-preview').replaceChildren(image);
      qs('#btn-descargar').disabled = false;
      qs('#btn-enviar').disabled = false;
      qs('#canvas-estado').textContent = `${Math.round(resultado.blob.size / 1024)} KiB`;
      qs('#reportes-badge').textContent = 'JPEG listo';
      qs('#reporte-resultado').textContent = `${filas.length} movimientos incluidos.`;
      ctx.notify.success('Reporte rasterizado en el navegador.');
    } catch (err) {
      qs('#canvas-estado').textContent = 'Error';
      ctx.notify.error(err.message || 'No se pudo generar el JPEG.');
    } finally {
      qs('#btn-generar').disabled = false;
    }
  }

  function descargar() {
    const reporte = ctx.state.reporte;
    if (!reporte.blob) return;
    descargarBlob(reporte.blob, `reporte-${reporte.meta?.socio || 'glauk'}.jpg`);
  }

  async function enviar() {
    const reporte = ctx.state.reporte;
    if (!reporte.base64) return;
    const socio = qs('#reporte-socio')?.value || reporte.meta?.socio || '';
    if (!socio) {
      ctx.notify.error('Seleccione un socio destino.');
      return;
    }
    const caption = qs('#reporte-caption')?.value.trim() || `Reporte de ${socio}`;
    const button = qs('#btn-enviar');
    button.disabled = true;
    try {
      const data = await ctx.api.enviarImagen({
        socio, caption, base64: reporte.base64,
        mimeType: 'image/jpeg', fileName: `reporte-${socio}.jpg`
      }, reporte.key);
      const result = data?.data || data;
      qs('#reporte-resultado').textContent = `Enviado · ${result?.messageId || 'sin ID'}${result?.simulated ? ' · simulado' : ''}`;
      qs('#reportes-badge').textContent = 'Enviado';
      reporte.key = idempotencyKey();
      ctx.notify.success('Reporte enviado por WhatsApp.');
    } catch (err) {
      qs('#reporte-resultado').textContent = err.message || 'No se pudo enviar.';
      ctx.notify.error(err.message || 'No se pudo enviar el reporte.');
    } finally {
      button.disabled = false;
    }
  }

  function mount() {
    if (mounted) return;
    mounted = true;
    qs('#btn-descargar')?.addEventListener('click', descargar);
    qs('#btn-enviar')?.addEventListener('click', enviar);
  }

  return { mount, generar, descargar, enviar, reset };
}
