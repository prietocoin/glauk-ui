/**
 * @file comprobantesSocioUtils.js
 * @description Normalización y extracción robusta de identidades de socio.
 *
 * El backend canónico entrega `nombre_socio_1/2`, pero el panel también debe
 * tolerar respuestas legacy o intermedias (`socio_1/2`, `socio1/2`,
 * `t1_socio/t2_socio`, `emisor/receptor` y perfiles anidados).
 */

const RUTAS_SOCIO_1 = [
  ['nombre_socio_1'],
  ['nombre_socio1'],
  ['NombreSocio1'],
  ['socio_1'],
  ['socio1'],
  ['Socio1'],
  ['t1_socio'],
  ['socio_t1'],
  ['socio_1_nombre'],
  ['emisor'],
  ['nombre_emisor'],
  ['socio_emisor'],
  ['grupo_1'],
  ['grupo_1', 'grupo'],
  ['grupo_1', 'nombre'],
  ['grupo_1', 'socio'],
  ['grupo1'],
  ['grupo1', 'grupo'],
  ['grupo1', 'nombre'],
  ['perfil_1'],
  ['perfil_1', 'nombre'],
  ['perfil_1', 'socio'],
  ['perfil1'],
  ['perfil1', 'nombre'],
  ['socio']
];

const RUTAS_SOCIO_2 = [
  ['nombre_socio_2'],
  ['nombre_socio2'],
  ['NombreSocio2'],
  ['socio_2'],
  ['socio2'],
  ['Socio2'],
  ['t2_socio'],
  ['socio_t2'],
  ['socio_2_nombre'],
  ['receptor'],
  ['nombre_receptor'],
  ['socio_receptor'],
  ['grupo_2'],
  ['grupo_2', 'grupo'],
  ['grupo_2', 'nombre'],
  ['grupo_2', 'socio'],
  ['grupo2'],
  ['grupo2', 'grupo'],
  ['grupo2', 'nombre'],
  ['perfil_2'],
  ['perfil_2', 'nombre'],
  ['perfil_2', 'socio'],
  ['perfil2'],
  ['perfil2', 'nombre']
];

const PLACEHOLDERS = new Set([
  '', 'GENERAL', 'NO DEFINIDO', 'S/D', 'N/A', 'NULL', 'UNDEFINED', '-'
]);

function obtenerFuentes(item = {}) {
  const fuentes = [item?.comprobante, item, item?.data]
    .filter(fuente => fuente && typeof fuente === 'object');
  return [...new Set(fuentes)];
}

function leerRuta(objeto, ruta) {
  let actual = objeto;
  for (const clave of ruta) {
    if (actual === null || actual === undefined) return undefined;
    actual = actual[clave];
  }
  return actual;
}

function textoValido(valor) {
  if (valor === null || valor === undefined || typeof valor === 'object') return '';
  return String(valor).trim();
}

/**
 * Normaliza para comparar: sin acentos, sin espacios duplicados y en mayúsculas.
 */
export function normalizarSocio(valor) {
  return textoValido(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function esPlaceholder(normalizado) {
  return PLACEHOLDERS.has(normalizado);
}

/**
 * Devuelve el primer nombre real de la posición solicitada. Si el campo
 * canónico es GENERAL pero otro alias contiene el socio, prevalece el alias.
 */
export function extraerNombreSocio(item = {}, posicion = 1) {
  const rutas = Number(posicion) === 2 ? RUTAS_SOCIO_2 : RUTAS_SOCIO_1;
  let primero = '';

  for (const fuente of obtenerFuentes(item)) {
    for (const ruta of rutas) {
      const texto = textoValido(leerRuta(fuente, ruta));
      if (!texto) continue;
      if (!primero) primero = texto;
      if (!esPlaceholder(normalizarSocio(texto))) return texto;
    }
  }

  return primero || 'GENERAL';
}

/**
 * Conjunto normalizado de todos los nombres de socio de una posición. Permite
 * que un registro con campos inconsistentes coincida con cualquiera de ellos.
 */
export function obtenerNombresSocio(item = {}, posicion = 1) {
  const rutas = Number(posicion) === 2 ? RUTAS_SOCIO_2 : RUTAS_SOCIO_1;
  const nombres = new Set();

  for (const fuente of obtenerFuentes(item)) {
    for (const ruta of rutas) {
      const normalizado = normalizarSocio(leerRuta(fuente, ruta));
      if (normalizado && !esPlaceholder(normalizado)) nombres.add(normalizado);
    }
  }

  return nombres;
}

export function coincideSocioEstricto(item = {}, socio = '') {
  const objetivo = normalizarSocio(socio);
  if (!objetivo || objetivo === 'TODOS' || objetivo === 'TODOS LOS SOCIOS' || objetivo === 'GENERAL') {
    return true;
  }

  return obtenerNombresSocio(item, 1).has(objetivo)
    || obtenerNombresSocio(item, 2).has(objetivo);
}

/**
 * Indica en qué lado participa el socio. Si aparece en ambos, prevalece Socio 1.
 */
export function obtenerPosicionSocio(item = {}, socio = '') {
  const objetivo = normalizarSocio(socio);
  if (!objetivo || objetivo === 'TODOS' || objetivo === 'TODOS LOS SOCIOS' || objetivo === 'GENERAL') {
    return 1;
  }

  const s1 = obtenerNombresSocio(item, 1);
  const s2 = obtenerNombresSocio(item, 2);
  return s2.has(objetivo) && !s1.has(objetivo) ? 2 : 1;
}
