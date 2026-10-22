import { qs } from '../../../shared/js/dom.js';
import { api } from '../api.js';
import { state } from '../state.js';
import { abrirModal, cerrarModal } from '../ui/modal.js';
import { showToast } from '../ui/toast.js';

export function initPreview() {
  const modal = qs('#modalPreview');
  const spinner = qs('#previewSpinner');
  const imagen = qs('#imgPreviewCartelera');
  const nombre = qs('#lblModalPartnerName');
  const interruptorPrueba = qs('#chkModalPartnerTest');

  function liberarImagen() {
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    state.previewUrl = '';
    imagen.src = '';
  }

  function cerrar() {
    cerrarModal('modalPreview');
    liberarImagen();
  }

  async function abrir() {
    const socio = state.socioActivo;
    if (!socio) return;

    liberarImagen();
    nombre.textContent = socio.nombre;
    interruptorPrueba.checked = Boolean(socio.modo_prueba);
    abrirModal('modalPreview');
    spinner.classList.remove('hidden');
    imagen.classList.add('hidden');

    try {
      const blob = await api.renderBlob(socio.nombre);
      state.previewUrl = URL.createObjectURL(blob);
      imagen.src = state.previewUrl;
      imagen.classList.remove('hidden');
      spinner.classList.add('hidden');
    } catch (error) {
      showToast('❌ Error generando cartelera');
      cerrar();
    }
  }

  function descargar() {
    if (!state.previewUrl || imagen.classList.contains('hidden')) {
      showToast('⚠️ Primero genera la vista previa');
      return;
    }

    const enlace = document.createElement('a');
    enlace.href = state.previewUrl;
    const nombreSocio = state.socioActivo
      ? state.socioActivo.nombre.replace(/[^a-z0-9]/gi, '_')
      : 'socio';
    enlace.download = `Cartelera_${nombreSocio}.png`;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    showToast('📥 Descargando cartelera...');
  }

  function alternarPrueba(checked) {
    const socio = state.socioActivo;
    if (!socio) return;
    socio.modo_prueba = checked;
    showToast(`Prueba Socio (${socio.nombre}): ${checked ? 'ON' : 'OFF'}`);
  }

  async function reenviar() {
    const socio = state.socioActivo;
    if (!socio) return;

    showToast(`⚡ Enviando cartelera a ${socio.nombre}...`);
    try {
      await api.disparar(socio.nombre, socio.modo_prueba);
      showToast(`✅ Cartelera enviada para ${socio.nombre}`);
    } catch (error) {
      showToast(`❌ Error: ${error.message}`);
    }
  }

  qs('#btnVerPrevia').addEventListener('click', abrir);
  qs('#btnDownload').addEventListener('click', descargar);
  qs('#btnResend').addEventListener('click', reenviar);
  interruptorPrueba.addEventListener('change', (evento) => {
    alternarPrueba(evento.target.checked);
  });
  modal.querySelectorAll('[data-close-modal="modalPreview"]').forEach((boton) => {
    boton.addEventListener('click', cerrar);
  });

  return { abrir, cerrar };
}
