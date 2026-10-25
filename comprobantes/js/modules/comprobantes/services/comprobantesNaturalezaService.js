/**
 * @file comprobantesNaturalezaService.js
 * @description Fuente única de verdad para la naturaleza de un comprobante.
 *
 * Jerarquía estricta de negocio:
 *   1. Moneda del comprobante === moneda natural del socio 1 -> A.
 *      Excepción: IRIS no recibe abono automático por esta vía.
 *   2. IRIS: su tabla contractual manda; no se fuerza abono automático.
 *   3. Caption explícito con "A" / "ABONO" -> A (también para IRIS).
 *   4. Tabla de socio 1 x moneda -> D/P.
 *
 * La exclusión de IRIS en el paso 1 impide el abono automático por moneda base;
 * un caption explícito A sigue siendo evidencia suficiente de abono.
 */

import { normalizarSocio } from '../utils/comprobantesSocioUtils.js?v=20261025_01';

let catalogoSociosActual = {};

function normalizarLetra(valor) {
  const letra = String(valor || '').trim().split('-')[0].toUpperCase();
  return letra === 'A' || letra === 'P' || letra === 'D' ? letra : 'D';
}

function monedasDe(socio) {
  const monedas = socio?.monedas;
  if (typeof monedas === 'string') {
    try { return JSON.parse(monedas || '{}'); } catch { return {}; }
  }
  return monedas && typeof monedas === 'object' ? monedas : {};
}

/**
 * Construye `catalogoSocios` desde el directorio:
 *   { [socio]: { moneda_natural, tabla_monedas: { ARS: 'P', PEN: 'D', ... } } }
 *
 * Un socio con herencia usa la tabla de FUNDDA, igual que la proyección del
 * Core; su moneda natural sigue siendo la propia.
 */
export function construirCatalogoSocios(directorio = []) {
  const socios = Array.isArray(directorio) ? directorio : [];
  const fundda = socios.find(socio => normalizarSocio(socio?.nombre) === 'FUNDDA');
  const catalogo = {};

  for (const socio of socios) {
    const nombre = String(socio?.nombre || '').trim();
    if (!nombre) continue;

    const fuenteMonedas = socio?.herencia && fundda ? fundda.monedas : socio?.monedas;
    const monedas = monedasDe({ monedas: fuenteMonedas });
    const tablaMonedas = {};

    for (const [codigoBruto, config] of Object.entries(monedas)) {
      const codigo = String(codigoBruto || '').trim().toUpperCase();
      if (!codigo) continue;
      tablaMonedas[codigo] = normalizarLetra(config?.tipo ?? config?.def ?? config?.naturaleza);
    }

    const configSocio = {
      moneda_natural: String(
        socio?.moneda_base || socio?.moneda_socio || socio?.moneda || ''
      ).trim().toUpperCase(),
      tabla_monedas: tablaMonedas
    };

    // Se indexa por nombre visible y por alias normalizado para tolerar
    // mayúsculas, acentos y espacios accidentales.
    catalogo[nombre] = configSocio;
    catalogo[normalizarSocio(nombre)] = configSocio;
  }

  return catalogo;
}

export function establecerCatalogoSocios(catalogo) {
  catalogoSociosActual = catalogo && typeof catalogo === 'object' ? catalogo : {};
}

export function obtenerCatalogoSocios() {
  return catalogoSociosActual;
}

function resolverPorTabla(configSocio, moneda, comprobante) {
  const desdeTabla = configSocio?.tabla_monedas?.[moneda];
  if (desdeTabla) return normalizarLetra(desdeTabla);

  return normalizarLetra(
    comprobante?.tipo
    || comprobante?.tipo_manual
    || comprobante?.tipo_op
    || comprobante?.tipo_op1
    || comprobante?.t1_tipo
    || 'D'
  );
}

/**
 * Resuelve la naturaleza con la jerarquía de 4 pasos.
 *
 * @param {Object} comprobante Fila de comprobante (cruda o mapeada).
 * @param {Object} catalogoSocios Catálogo construido por construirCatalogoSocios.
 * @returns {'D'|'P'|'A'}
 */
export function resolverNaturaleza(comprobante = {}, catalogoSocios = {}) {
  const socio1 = String(
    comprobante?.socio_1
    || comprobante?.socio1_alias
    || comprobante?.nombre_socio_1
    || ''
  ).trim();

  const configSocio1 = catalogoSocios?.[socio1]
    || catalogoSocios?.[normalizarSocio(socio1)]
    || {};

  const moneda = String(comprobante?.moneda || '').trim().toUpperCase();
  const monedaNatural = String(configSocio1?.moneda_natural || '').trim().toUpperCase();
  const caption = String(
    comprobante?.caption || comprobante?.descripcion || ''
  ).trim().toUpperCase();

  const tieneCaptionA = /\bA\b/.test(caption)
    || caption.includes('TIPO: A')
    || caption.includes('ABONO');

  const esIris = normalizarSocio(socio1) === 'IRIS';

  // PASO 1: coincidencia con la moneda natural del socio 1 (abono automático).
  // IRIS queda excluido: no se le fuerza un abono por coincidir con su moneda
  // base. Su tabla contractual se aplica salvo que un caption declare A.
  if (!esIris && moneda && monedaNatural && moneda === monedaNatural) {
    return 'A';
  }

  // PASO 2/3: un caption explícito con 'A' es evidencia de abono, también para
  // IRIS (su regla especial solo impide el abono automático por moneda).
  if (tieneCaptionA) {
    return 'A';
  }

  // PASO 4: mapeo general socio 1 x moneda (incluye la tabla contractual IRIS).
  return resolverPorTabla(configSocio1, moneda, comprobante);
}

/**
 * Atajo para tarjetas/reportes: usa el catálogo vigente cargado desde el
 * directorio. Si aún no hay catálogo, cae al tipo del comprobante.
 */
export function resolverNaturalezaComprobante(comprobante = {}) {
  return resolverNaturaleza(comprobante, catalogoSociosActual);
}
