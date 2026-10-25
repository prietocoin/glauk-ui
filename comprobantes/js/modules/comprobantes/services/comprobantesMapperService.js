/**
 * @file comprobantesMapperService.js
 * @description Mapea la fila canónica de /api/v1/comprobantes al modelo de
 * presentación. No recalcula importes, tasas, naturaleza ni polaridad: conserva
 * los valores firmados que ya proyectó el backend.
 */

import { extraerNombreSocio } from '../utils/comprobantesSocioUtils.js?v=20261025_02';

function fechaDesdeItem(c, item) {
  const raw = c.fecha_hora_comprobante || item.fecha_hora_comprobante ||
              c.fecha_hora_iso || item.fecha_hora_iso ||
              c.timestamp_msg || item.timestamp_msg;
  if (!raw) return null;

  if (typeof raw === 'number' || /^\d+$/.test(String(raw))) {
    const num = Number(raw);
    return new Date(num < 1e10 ? num * 1000 : num);
  }

  const texto = String(raw);
  const fecha = new Date(texto.includes('T') ? texto : texto.replace(' ', 'T'));
  return isNaN(fecha.getTime()) ? null : fecha;
}

function partesCaracas(fecha) {
  return Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Caracas', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(fecha).filter(p => p.type !== 'literal').map(p => [p.type, p.value])
  );
}

function formatearFechaItem(fecha) {
  if (!fecha) return { fecha: 'S/F', hora: 'S/F', humano: 'S/F', input: '' };
  const p = partesCaracas(fecha);
  const hora = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Caracas', hour: '2-digit', minute: '2-digit', hour12: true
  }).format(fecha);
  const dia = new Intl.DateTimeFormat('es-VE', {
    timeZone: 'America/Caracas', weekday: 'long'
  }).format(fecha);
  const diaCapital = dia.charAt(0).toUpperCase() + dia.slice(1);
  return {
    fecha: `${p.day}/${p.month}/${p.year}`,
    hora,
    humano: `${diaCapital} ${hora}`,
    input: `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`
  };
}

function numero(valor, fallback = 0) {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : fallback;
  if (valor === null || valor === undefined || valor === '') return fallback;
  const limpio = String(valor).trim().replace(/,/g, '');
  const num = Number(limpio);
  return Number.isFinite(num) ? num : fallback;
}

function signo(valor) {
  return numero(valor, 0) < 0 ? '-' : '+';
}

const PLACEHOLDERS_SOCIO = new Set([
  '', 'GENERAL', 'NO DEFINIDO', 'S/D', 'N/A', 'NULL', 'UNDEFINED', '-'
]);

function tieneSocio2(nombre) {
  return !PLACEHOLDERS_SOCIO.has(String(nombre || '').trim().toUpperCase());
}

function tipoCrudo(c, item) {
  return c.tipo_op1 || item.tipo_op1 || c.tipo_op || item.tipo_op ||
    c.tipo_manual || item.tipo_manual || c.tipo || item.tipo || 'D';
}

function letraTipo(valor) {
  const letra = String(valor || '').trim().split('-')[0].toUpperCase();
  return letra === 'A' || letra === 'P' || letra === 'D' ? letra : 'D';
}

/**
 * Devuelve la micro-insignia visual según el ROL de la entidad.
 */
export function obtenerInsigniaRol(rol) {
  const r = String(rol || '').toUpperCase().trim();
  switch (r) {
    case 'ADMIN': return '💎';
    case 'ASESOR': return '👔';
    case 'PROVEEDOR': return '🏦';
    case 'SOCIO': default: return '🤝';
  }
}

/**
 * Normaliza y enriquece la fila canónica para Alpine.js. Los campos financieros
 * se copian tal cual llegan del backend; el único trabajo local es de identidad,
 * fecha, presentación y compatibilidad de nombres.
 */
export function prepararEdicionComprobante(item = {}, loteActivo = 'T070') {
  if (!item) return {};

  const c = item.comprobante || item;

  // 1. IDENTIFICADORES
  const idReal = String(c.hash_largo || item.hash_largo || c.id || item.id || c.referencia || '').trim();
  const hashCortoFinal = c.hash_corto || item.hash_corto || (idReal ? idReal.slice(0, 8).toUpperCase() : 'HASH');

  // 2. FECHAS
  const fechaItem = formatearFechaItem(fechaDesdeItem(c, item));
  const rawTs = c.timestamp_msg || item.timestamp_msg || c.fecha_hora_comprobante || item.fecha_hora_comprobante || '';
  const fechaFmt = c.fecha_fmt || item.fecha_fmt || fechaItem.fecha;
  const horaFmt = c.hora_fmt || item.hora_fmt || fechaItem.hora;
  const diaHoraHumano = c.dia_hora_humano || item.dia_hora_humano || fechaItem.humano;
  const dateInput = c.fecha_hora_input || item.fecha_hora_input || fechaItem.input;

  // 3. IMPORTES Y DIVISA: se conservan firmados y sin renormalizar.
  const monto = numero(c.monto ?? item.monto ?? c.monto_local ?? item.monto_local, 0);
  const monedaFinal = String(c.moneda || item.moneda || 'USDT').toUpperCase().trim();

  // 4. SOCIOS Y ROLES
  const socio1Real = extraerNombreSocio(item, 1);
  const socio2Real = extraerNombreSocio(item, 2);
  const rol1 = c.rol_1 || item.rol_1 || 'SOCIO';
  const rol2 = c.rol_2 || item.rol_2 || 'SOCIO';

  // 5. TASAS E IMPORTES CONGELADOS
  const tasa1 = numero(c.tasa_1 ?? item.tasa_1 ?? c.tasa1 ?? item.tasa1, 0);
  const tasa2 = numero(c.tasa_2 ?? item.tasa_2 ?? c.tasa2 ?? item.tasa2, 0);
  const monto1 = numero(c.monto_1 ?? item.monto_1 ?? c.monto1 ?? item.monto1, 0);
  const monto2 = numero(c.monto_2 ?? item.monto_2 ?? c.monto2 ?? item.monto2, 0);
  const me1 = numero(c.me1 ?? item.me1 ?? c.m1_socio ?? item.m1_socio ?? monto1, 0);
  const me2 = numero(c.me2 ?? item.me2 ?? c.m2_socio ?? item.m2_socio ?? monto2, 0);

  // 6. NATURALEZA: la etiqueta del backend manda. No se reconstruye la jerarquía.
  const tipo1 = String(tipoCrudo(c, item)).trim();
  const tipo2 = String(c.tipo_op2 || item.tipo_op2 || tipo1).trim();
  const letra = letraTipo(tipo1);

  // 7. IMAGEN
  const rawImg = c.url_r2_comprobante || item.url_r2_comprobante ||
    c.link_img || item.link_img || c.url_imagen || item.url_imagen || '';

  // 8. BADGE 2x: solo cuando existe una contraparte real.
  const esX2 = tieneSocio2(socio2Real);

  const monedaBase1 = c.moneda_base_socio1 || c.moneda_socio_1 || item.moneda_base_socio1 || item.moneda_socio_1 || 'USDT';
  const monedaBase2 = c.moneda_base_socio2 || c.moneda_socio_2 || item.moneda_base_socio2 || item.moneda_socio_2 || 'USDT';

  return {
    ...item,
    ...c,

    id: idReal,
    hash_largo: idReal,
    hash_corto: hashCortoFinal,

    timestamp_msg: rawTs,
    fecha_fmt: fechaFmt,
    hora_fmt: horaFmt,
    dia_hora_humano: diaHoraHumano,
    fecha_hora_input: dateInput,
    fecha_hora_comprobante: dateInput,

    banco: (c.banco && c.banco !== '-') ? String(c.banco).toUpperCase() : (item.banco ? String(item.banco).toUpperCase() : 'BANCO'),
    referencia: (c.referencia && c.referencia !== '-') ? String(c.referencia) : (item.referencia || 'N/A'),
    titular: (c.titular && c.titular !== '-') ? String(c.titular).toUpperCase() : (item.titular ? String(item.titular).toUpperCase() : 'TITULAR NO DEFINIDO'),

    link_img: rawImg,
    url_r2_comprobante: rawImg,

    nombre_socio_1: socio1Real,
    socio_1: socio1Real,
    rol_1: rol1,
    badge_1: obtenerInsigniaRol(rol1),
    moneda_base_socio1: monedaBase1,
    moneda_socio_1: monedaBase1,
    tasa_1: tasa1,
    monto_1: monto1,
    me1: me1,
    m1_socio: me1,
    me1_firmado: me1,
    polaridad_1: signo(me1 !== 0 ? me1 : monto1),

    nombre_socio_2: socio2Real,
    socio_2: socio2Real,
    rol_2: rol2,
    badge_2: obtenerInsigniaRol(rol2),
    moneda_base_socio2: monedaBase2,
    moneda_socio_2: monedaBase2,
    tasa_2: tasa2,
    monto_2: monto2,
    me2: me2,
    m2_socio: me2,
    me2_firmado: me2,
    polaridad_2: signo(me2 !== 0 ? me2 : monto2),

    es_x2: esX2,
    tipo_op1: tipo1,
    tipo_op2: tipo2,
    tipo_op: letra,
    tipo_manual: letra,

    moneda: monedaFinal,
    monto: monto,
    monto_local: monto,
    lote: c.lote || item.lote || c.lote_tasa_asignado || item.lote_tasa_asignado || c.lote_tasa || item.lote_tasa || loteActivo,
    lote_tasa_asignado: c.lote_tasa_asignado || item.lote_tasa_asignado || c.lote || item.lote || c.lote_tasa || item.lote_tasa || loteActivo,

    grupo_1: {
      grupo: socio1Real,
      rol: rol1,
      tasa: tasa1,
      polaridad: signo(me1 !== 0 ? me1 : monto1),
      monto: me1,
      moneda_base: monedaBase1,
      me: me1
    },
    grupo_2: {
      grupo: socio2Real,
      rol: rol2,
      tasa: tasa2,
      polaridad: signo(me2 !== 0 ? me2 : monto2),
      monto: me2,
      moneda_base: monedaBase2,
      me: me2
    }
  };
}
