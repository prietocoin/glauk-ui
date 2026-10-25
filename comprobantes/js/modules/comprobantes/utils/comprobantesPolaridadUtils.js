/**
 * @file comprobantesPolaridadUtils.js
 * @description Resolución dinámica del signo de cada socio a partir de la
 * configuración de la moneda en Perfiles (polar_D / polar_P).
 *
 * Reglas:
 *   - D/P: manda la regla configurada para el socio y la divisa.
 *   - Sin configuración: D = -1 (resta), P = +1 (suma).
 *   - Socio 2: usa su propia regla si existe; si no, es el inverso exacto del
 *     impacto de Socio 1.
 *   - A: respeta el sentido de transferencia que ya trae el Core.
 */

function normalizar(valor) {
  return String(valor ?? '').trim().toUpperCase();
}

function monedasDe(socio) {
  let monedas = socio?.monedas;
  if (typeof monedas === 'string') {
    try { monedas = JSON.parse(monedas || '{}'); } catch { monedas = {}; }
  }
  return monedas && typeof monedas === 'object' ? monedas : {};
}

function buscarSocio(directorio, nombre) {
  const lista = Array.isArray(directorio) ? directorio : [];
  const objetivo = normalizar(nombre);
  if (!objetivo) return null;

  const socio = lista.find((item) => normalizar(item?.nombre || item?.alias) === objetivo);
  if (!socio) return null;

  const hereda = socio.herencia === true || socio.herencia === 'true';
  if (!hereda) return socio;

  return lista.find((item) => ['FUNDDA', 'GENERAL'].includes(normalizar(item?.nombre))) || socio;
}

function signoDesdeRegla(regla) {
  const texto = normalizar(regla).toLowerCase();
  if (!texto) return null;
  if (texto.includes('resta') || texto === '-' || texto.includes('sub') || texto.includes('negativ')) {
    return -1;
  }
  if (texto.includes('suma') || texto === '+' || texto.includes('add') || texto.includes('positiv')) {
    return 1;
  }
  return null;
}

/**
 * Devuelve -1/1 según la regla del socio para la divisa y naturaleza, o null
 * cuando no hay una regla explícita.
 */
export function signoConfigurado(directorio, nombreSocio, moneda, naturaleza) {
  const socio = buscarSocio(directorio, nombreSocio);
  if (!socio) return null;

  const config = monedasDe(socio)[normalizar(moneda)] || null;
  if (!config) return null;

  const letra = normalizar(naturaleza);
  const regla = letra === 'P'
    ? (config.polar_P ?? config.pago_op ?? config.pago_operacion ?? config.regla_pago ?? config.pago_signo)
    : (config.polar_D ?? config.dep_op ?? config.deposito_operacion ?? config.regla_deposito ?? config.deposito_signo);

  return signoDesdeRegla(regla);
}

function signoCore(item, esSocio2) {
  const valor = esSocio2
    ? Number(item?.me2_firmado ?? item?.m2_firmado ?? item?.me2 ?? item?.m2_socio ?? item?.monto_2 ?? 0)
    : Number(item?.me1_firmado ?? item?.m1_firmado ?? item?.me1 ?? item?.m1_socio ?? item?.monto_1 ?? 0);
  if (valor < 0) return -1;
  if (valor > 0) return 1;
  return 0;
}

/**
 * Signo contable final del socio (1 = suma/verde, -1 = resta/rojo).
 */
export function resolverSignoSocio(directorio, item = {}, posicion = 1) {
  const esSocio2 = Number(posicion) === 2;
  const naturaleza = normalizar(
    item?.tipo_manual || item?.tipo || item?.tipo_op || item?.tipo_op1 || 'D'
  ).split('-')[0];

  if (naturaleza === 'A') {
    const s1 = signoCore(item, false);
    const s2 = signoCore(item, true);

    if (esSocio2) {
      // Nunca dos socios con el mismo signo en un abono: si el Core trae
      // ambos positivos, el lado 2 es la contraparte negativa.
      if (s2 !== 0 && s1 !== 0) return s2 === s1 ? -s1 : s2;
      if (s2 !== 0) return s2;
      return s1 !== 0 ? -s1 : 1;
    }

    if (s1 !== 0) return s1;
    return s2 !== 0 ? -s2 : -1;
  }

  const nombre1 = item?.socio_1 || item?.nombre_socio_1 || '';
  const nombre2 = item?.socio_2 || item?.nombre_socio_2 || '';
  const moneda = normalizar(item?.moneda || item?.moneda_local);

  const defecto = naturaleza === 'P' ? 1 : -1;
  const signo1 = signoConfigurado(directorio, nombre1, moneda, naturaleza) ?? defecto;

  if (!esSocio2) return signo1;

  // Socio 2 solo usa regla propia cuando la divisa es su cuenta nativa; en una
  // operación cruzada es la contraparte exacta del impacto de Socio 1.
  const socio2 = buscarSocio(directorio, nombre2);
  const base2 = normalizar(socio2?.moneda_base || socio2?.moneda_socio || socio2?.moneda);
  const tieneCuentaPropia = Boolean(base2) && base2 === moneda;
  const signo2 = tieneCuentaPropia
    ? signoConfigurado(directorio, nombre2, moneda, naturaleza)
    : null;

  return signo2 !== null ? signo2 : -signo1;
}
