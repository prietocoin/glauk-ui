/**
 * @file comprobantesReporteService.js
 * @description Captura el documento de estado de cuenta con ancho 1080/800,
 * altura recortada al contenido real y un techo de 1500 px.
 */

const ANCHO_DEFECTO = 1080;
const ANCHOS_VALIDOS = new Set([800, 1080]);
const ALTO_MAXIMO = 1500;

export function normalizarAnchoReporte(valor) {
  const ancho = Math.round(Number(valor));
  return ANCHOS_VALIDOS.has(ancho) ? ancho : ANCHO_DEFECTO;
}

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

  const ancho = normalizarAnchoReporte(opciones.ancho);
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
    Object.assign(elemento.style, estilosPrevios);
  }
}
