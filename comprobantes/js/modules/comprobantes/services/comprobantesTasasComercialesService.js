/**
 * @file comprobantesTasasComercialesService.js
 * @description Catálogo de tasas comerciales (compra/venta) por socio, lote y
 * divisa, construido con los mismos datos y la misma precisión que publica la
 * cartelera oficial.
 *
 * Motivo: la proyección del comprobante trunca la tasa de pago
 * (1632 × 0.98 = 1599,36 → 1599), mientras que la cartelera vende a
 * 1632 / 1.02 = 1600. El reporte debe mostrar la tasa comercial oficial y no
 * el artefacto truncado del backend. El subtotal sigue viniendo del Core.
 */

import { apiUrl } from '../../../../../shared/js/api-base.js';
import { normalizarSocio } from '../utils/comprobantesSocioUtils.js';
import {
  resolverMonedaTasa,
  resolverTipoComprobante
} from '../utils/comprobantesTasasUtils.js?v=20261024_06';

// Divisas de referencia: valen 1 aunque el lote no las cotice.
const DIVISAS_FIJAS = new Set(['USD', 'USDT', 'PYUSD', 'ECU', 'PAN']);
const PRECISION_ESCALA = 1e8;
const PRECISION_EPSILON = 0.0000001;

let cachePromesa = null;
let cacheCatalogo = null;

function numero(valor) {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;
  if (valor === null || valor === undefined) return 0;
  const limpio = String(valor).trim().replace(/,/g, '');
  const num = parseFloat(limpio);
  return Number.isFinite(num) ? num : 0;
}

function normalizarDivisa(valor) {
  return String(valor || '').trim().toUpperCase();
}

/**
 * Reproduce `calculator.ApplyRatePrecision` del Core: redondea a 8 decimales y
 * después recorta según la magnitud. Para ARS/CLP/COP/PYG (> 99,99) devuelve el
 * entero truncado de la cartelera (1664, 1600, ...).
 */
function aplicarPrecisionComercial(valor) {
  if (!Number.isFinite(valor) || valor === 0) return 0;

  const signo = valor < 0 ? -1 : 1;
  const redondeado = Math.round(Math.abs(valor) * PRECISION_ESCALA) / PRECISION_ESCALA;
  let resultado;

  if (redondeado > 99.99) {
    resultado = Math.trunc(redondeado);
  } else if (redondeado >= 10) {
    resultado = Math.trunc((redondeado + PRECISION_EPSILON) * 100) / 100;
  } else {
    const magnitud = Math.floor(Math.log10(redondeado));
    const factor = Math.pow(10, 2 - magnitud);
    resultado = Math.trunc((redondeado + PRECISION_EPSILON) * factor) / factor;
  }

  return signo * resultado;
}

function tasaBase(tasas, monedaBase) {
  const codigo = normalizarDivisa(monedaBase) || 'USDT';
  if (DIVISAS_FIJAS.has(codigo)) return 1;
  const valor = numero(tasas?.[codigo]);
  return valor > 0 ? valor : 1;
}

function tasasDelLote(lote) {
  const tasas = lote?.tasas;
  if (tasas && typeof tasas === 'object') return tasas;
  return {};
}

async function solicitarJson(ruta) {
  // El reporte espera este catálogo; un endpoint colgado no debe bloquearlo.
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), 8000);
  try {
    const respuesta = await fetch(apiUrl(ruta), { signal: controlador.signal });
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status} en ${ruta}`);
    return respuesta.json();
  } finally {
    clearTimeout(temporizador);
  }
}

function construirCatalogo(historial, perfiles) {
  const catalogo = {};
  const lotes = Array.isArray(historial) ? historial : [];
  const socios = Array.isArray(perfiles?.socios) ? perfiles.socios : [];

  for (const perfil of socios) {
    const nombre = normalizarSocio(perfil?.nombre);
    if (!nombre) continue;

    const porLote = {};
    for (const lote of lotes) {
      const idLote = String(lote?.id_tasa || '').trim().toUpperCase();
      if (!idLote) continue;

      const tasas = tasasDelLote(lote);
      const base = tasaBase(tasas, perfil?.moneda_base);
      const porDivisa = {};

      for (const [codigoBruto, config] of Object.entries(perfil?.monedas || {})) {
        if (!config || config.activo === false) continue;

        const codigo = normalizarDivisa(codigoBruto);
        if (!codigo) continue;

        const bruta = numero(tasas[codigo]);
        const cotizada = bruta > 0 || DIVISAS_FIJAS.has(codigo);
        if (!cotizada) continue;

        const tasaDivisa = DIVISAS_FIJAS.has(codigo) && bruta <= 0 ? 1 : bruta;
        const cruzada = tasaDivisa / base;
        if (!(cruzada > 0)) continue;

        const deposito = Math.abs(numero(config?.porcentaje?.deposito)) / 100;
        const pago = Math.abs(numero(config?.porcentaje?.pago)) / 100;

        porDivisa[codigo] = {
          compra: aplicarPrecisionComercial(cruzada * (1 + deposito)),
          venta: aplicarPrecisionComercial(cruzada / (1 + pago))
        };
      }

      porLote[idLote] = porDivisa;
    }

    catalogo[nombre] = porLote;
  }

  return catalogo;
}

/**
 * Carga (una sola vez por sesión) el historial de lotes y los perfiles, y
 * construye el catálogo comercial de todos los socios.
 */
export function obtenerCatalogoTasasComerciales() {
  if (cacheCatalogo) return Promise.resolve(cacheCatalogo);
  if (cachePromesa) return cachePromesa;

  cachePromesa = Promise.all([
    solicitarJson('/api/tasas/historial'),
    solicitarJson('/api/v1/tasas/socios')
  ])
    .then(([historial, perfiles]) => {
      cacheCatalogo = construirCatalogo(historial, perfiles);
      return cacheCatalogo;
    })
    .catch((err) => {
      console.warn('[comprobantesTasasComerciales ⚠️ Catálogo no disponible]:', err?.message || err);
      cacheCatalogo = {};
      return cacheCatalogo;
    })
    .finally(() => {
      cachePromesa = null;
    });

  return cachePromesa;
}

export function catalogoTasasComercialActual() {
  return cacheCatalogo || {};
}

/**
 * Tasa comercial oficial del lado del socio: compra para D, venta para P y
 * paridad 1.00 para abonos. Devuelve null cuando el lote o la divisa no están
 * en el catálogo; el llamador puede caer a tasa_1/tasa_2.
 */
export function resolverTasaComercialCatalogo(catalogo, socio, lote, divisa, tipo) {
  const letra = String(tipo || '').trim().toUpperCase();
  const codigoDivisa = normalizarDivisa(divisa);

  // Los abonos y las operaciones en USDT no dependen de la cartelera: su tasa
  // comercial es la paridad 1.00.
  if (letra === 'A' || codigoDivisa === 'USDT') return 1;

  if (!catalogo || !socio || !lote || !codigoDivisa) return null;

  const precios = catalogo[normalizarSocio(socio)]?.[String(lote).trim().toUpperCase()]?.[codigoDivisa];
  if (!precios) return null;
  if (letra === 'D') return precios.compra > 0 ? precios.compra : null;
  if (letra === 'P') return precios.venta > 0 ? precios.venta : null;
  return null;
}

/**
 * Atajo para una fila de comprobante ya mapeada: resuelve socio, lote, divisa y
 * tipo desde el propio ítem.
 */
export function resolverTasaComercialItem(item, posicion, catalogo) {
  const esSocio2 = Number(posicion) === 2;
  const socio = esSocio2
    ? (item?.socio_2 || item?.nombre_socio_2)
    : (item?.socio_1 || item?.nombre_socio_1);
  const lote = item?.lote_tasa_asignado || item?.lote || item?.lote_tasa || '';
  const divisa = resolverMonedaTasa(item);
  const tipo = resolverTipoComprobante(item);
  return resolverTasaComercialCatalogo(catalogo, socio, lote, divisa, tipo);
}
