// Contrato de render (§3.6.1): el navegador produce el JPEG y el backend nunca
// recibe HTML. El lienzo lógico es 1080×1350, la escala física se limita a 2 y
// el fondo siempre es blanco para que WhatsApp no interprete transparencias.
const ANCHO = 1080;
const ALTO = 1350;
const CALIDAD_INICIAL = 0.90;
const CALIDAD_MINIMA = 0.6;
const MAX_BYTES = 8 * 1024 * 1024;

// El tamaño lógico se valida antes de tocar el DOM. Un cero o un NaN produciría
// un canvas vacío y un JPEG que WhatsApp podría aceptar sin que el operador
// perciba que el reporte no contiene información.
function dimensiones(ancho, alto) {
  const width = Math.round(Number(ancho));
  const height = Math.round(Number(alto));
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('Las dimensiones del reporte no son válidas.');
  }
  return { width, height };
}

// Dos es el techo de densidad: un teléfono con ratio 3 no debe multiplicar por
// tres los píxeles del reporte ni disparar el peso del JPEG.
function escalaDispositivo() {
  const ratio = globalThis.devicePixelRatio || globalThis.window?.devicePixelRatio || 1;
  return Math.min(ratio, 2);
}

async function esperarFuentes() {
  if (document.fonts?.ready) await document.fonts.ready;
}

// Las imágenes locales se marcan como CORS antes del render. El logo vive en
// /shared/brand, por lo que no depende de recursos remotos.
function prepararImagenes(elemento) {
  for (const image of elemento.querySelectorAll('img')) {
    if (!image.src.startsWith('data:')) image.crossOrigin = 'anonymous';
  }
}

// El lienzo de salida siempre se pinta de blanco. html2canvas también recibe
// backgroundColor, pero esta segunda capa evita transparencias si el navegador
// ignora la opción o si el elemento tiene un fondo declarado con alpha.
function crearLienzo(ancho, alto, escala) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(ancho * escala);
  canvas.height = Math.round(alto * escala);
  const context = canvas.getContext('2d', { alpha: false });
  context.fillStyle = '#FFFFFF';
  context.fillRect(0, 0, canvas.width, canvas.height);
  return { canvas, context };
}

function toBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('El canvas no pudo producir un JPEG.'));
    }, 'image/jpeg', quality);
  });
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error || new Error('No se pudo leer el JPEG.'));
    reader.readAsDataURL(blob);
  });
}

// html2canvas se carga desde el vendor local. Si falta, el error es explícito:
// el panel no debe enviar un reporte vacío ni degradar silenciosamente a texto.
async function rasterizar(elemento, ancho, alto, escala) {
  if (typeof globalThis.html2canvas !== 'function') {
    throw new Error('html2canvas no está disponible; revise el vendor local.');
  }
  return globalThis.html2canvas(elemento, {
    backgroundColor: '#FFFFFF',
    scale: escala,
    logging: false,
    useCORS: true,
    width: ancho,
    height: alto,
    windowWidth: ancho,
    windowHeight: alto
  });
}

export async function generarReporteJPEG({ elemento, ancho = ANCHO, alto = ALTO } = {}) {
  if (!elemento) throw new Error('Falta el elemento del reporte.');
  const { width, height } = dimensiones(ancho, alto);
  await esperarFuentes();
  prepararImagenes(elemento);

  const escala = escalaDispositivo();
  const rendered = await rasterizar(elemento, width, height, escala);
  const { canvas, context } = crearLienzo(width, height, escala);
  context.drawImage(rendered, 0, 0, canvas.width, canvas.height);

  let calidad = CALIDAD_INICIAL;
  let blob = await toBlob(canvas, calidad);
  while (blob.size > MAX_BYTES && calidad > CALIDAD_MINIMA) {
    calidad = Math.max(CALIDAD_MINIMA, Number((calidad - 0.05).toFixed(2)));
    blob = await toBlob(canvas, calidad);
  }
  if (blob.size > MAX_BYTES) {
    throw new Error('El reporte supera el tamaño máximo; reduzca el contenido.');
  }
  return { blob, base64: await blobToBase64(blob) };
}

export function descargarBlob(blob, nombre = 'reporte.jpg') {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nombre;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
