/**
 * @file comprobantesReporteService.js
 * @description Captura el documento de estado de cuenta con ancho fijo de 800 px,
 * altura recortada al contenido real y un techo de seguridad para lotes largos.
 */

const ANCHO_REPORTE = 800;
const ALTO_MAXIMO = 6000;
const CLASE_CAPTURA = 'glauk-capturando-reporte';
// Densidad de render: 2x sobre los 800 px lógicos entrega 1600 px físicos de
// ancho, el rango que WhatsApp conserva nítido al abrir la imagen.
const ESCALA_OBJETIVO = 2;
// Techo de píxeles del canvas. Safari/iOS invalida canvas por encima de ~16.7
// millones de píxeles (4096×4096); en reportes muy largos se reduce la escala
// en vez de producir una imagen en blanco.
const PIXELES_MAXIMOS = 16000000;
const CALIDAD_JPEG = 0.95;

function esperarLayout() {
  return new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

/**
 * Escala efectiva: usa la densidad objetivo salvo que el área del canvas supere
 * el techo del navegador. Nunca baja de 1 para no degradar bajo el tamaño lógico.
 */
function escalaSegura(ancho, alto, deseada) {
  const objetivo = Math.max(1, Number(deseada) || ESCALA_OBJETIVO);
  const limite = Math.sqrt(PIXELES_MAXIMOS / Math.max(1, ancho * alto));
  return Math.max(1, Math.min(objetivo, limite));
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

  // El lienzo vive dentro de un contenedor con scroll horizontal en móvil.
  // Antes de rasterizar se vuelve al origen para que html2canvas no capture el
  // documento desplazado, y se restaura la posición al terminar.
  const contenedorScroll = elemento.closest('.glauk-reporte-scroll');
  const scrollPrevio = contenedorScroll ? contenedorScroll.scrollLeft : 0;
  if (contenedorScroll) contenedorScroll.scrollLeft = 0;

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

    const escala = escalaSegura(ancho, alto, opciones.escala);

    const canvas = await globalThis.html2canvas(elemento, {
      backgroundColor: '#ffffff',
      scale: escala,
      useCORS: true,
      // Los recursos del reporte son locales; allowTaint evita que un logo
      // remoto con CORS incompleto se descarte silenciosamente.
      allowTaint: true,
      imageTimeout: 0,
      logging: false,
      width: ancho,
      height: alto,
      windowWidth: ancho,
      windowHeight: alto
    });

    // JPEG de alta calidad: a 1600 px de ancho el texto de tasas y montos se
    // mantiene legible al hacer zoom.
    return canvas.toDataURL('image/jpeg', CALIDAD_JPEG);
  } finally {
    document.body.classList.remove(CLASE_CAPTURA);
    Object.assign(elemento.style, estilosPrevios);
    if (contenedorScroll) contenedorScroll.scrollLeft = scrollPrevio;
  }
}
