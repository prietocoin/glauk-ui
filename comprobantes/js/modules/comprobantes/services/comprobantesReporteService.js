/**
 * @file comprobantesReporteService.js
 * @description Captura el documento de estado de cuenta con ancho fijo de 800 px,
 * altura recortada al contenido real y un techo de seguridad para lotes largos.
 */

const ANCHO_REPORTE = 800;
const ALTO_MAXIMO = 6000;
const CLASE_CAPTURA = 'glauk-capturando-reporte';

function esperarLayout() {
  return new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

export async function capturarReporteEstadoCuenta(elemento, opciones = {}) {
  if (!elemento) throw new Error('No se encontró el documento del reporte.');
  if (typeof globalThis.html2canvas !== 'function') {
    throw new Error('El generador de imágenes no está disponible.');
  }

  const ancho = ANCHO_REPORTE;
  const altoMaximo = Math.max(1, Number(opciones.altoMaximo) || ALTO_MAXIMO);
  const estilosPrevios = {
    width: elemento.style.width,
    minWidth: elemento.style.minWidth,
    maxWidth: elemento.style.maxWidth,
    minHeight: elemento.style.minHeight,
    height: elemento.style.height,
    maxHeight: elemento.style.maxHeight,
    overflow: elemento.style.overflow
  };

  // Desactiva header/footer fijos, handle, sombra del diálogo y velo del
  // backdrop mientras html2canvas rasteriza. Sin esta clase, el chrome oscuro
  // del modal se pinta sobre las filas inferiores del documento.
  document.body.classList.add(CLASE_CAPTURA);

  try {
    elemento.style.width = `${ancho}px`;
    elemento.style.minWidth = `${ancho}px`;
    elemento.style.maxWidth = `${ancho}px`;
    elemento.style.minHeight = '0';
    elemento.style.height = 'auto';
    elemento.style.maxHeight = 'none';
    elemento.style.overflow = 'visible';

    if (document.fonts?.ready) await document.fonts.ready;
    await esperarLayout();

    // Auto-recorte: la altura se mide sobre el contenido real de la tabla y el
    // pie, evitando franjas blancas inferiores.
    const altoReal = Math.ceil(Math.max(elemento.scrollHeight, elemento.getBoundingClientRect().height, 1));
    const alto = Math.min(altoReal, altoMaximo);

    elemento.style.height = `${alto}px`;
    elemento.style.maxHeight = `${alto}px`;
    elemento.style.overflow = 'hidden';
    await esperarLayout();

    const canvas = await globalThis.html2canvas(elemento, {
      backgroundColor: '#ffffff',
      scale: 1,
      useCORS: true,
      logging: false,
      width: ancho,
      height: alto,
      windowWidth: ancho,
      windowHeight: alto
    });

    return canvas.toDataURL('image/jpeg', 0.92);
  } finally {
    document.body.classList.remove(CLASE_CAPTURA);
    Object.assign(elemento.style, estilosPrevios);
  }
}
