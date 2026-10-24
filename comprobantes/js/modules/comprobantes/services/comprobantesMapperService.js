/**
 * @file comprobantesMapperService.js
 * @description Mapeador atómico del frontend para la API v2 y la tabla comprobantes_final.
 */

import { extraerNombreSocio } from '../utils/comprobantesSocioUtils.js';
import {
  normalizarTasaComercial
} from '../utils/comprobantesTasasUtils.js';
import { resolverNaturalezaComprobante } from './comprobantesNaturalezaService.js';

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
 * Normaliza y enriquece el objeto recibido de la API v2 (comprobantes_final)
 * para consumo seguro en Alpine.js y renderizado instantáneo de cards 2x.
 */
export function prepararEdicionComprobante(item = {}, loteActivo = 'T070') {
  if (!item) return {};

  const c = item.comprobante || item;

  // 1. IDENTIFICADORES Y HASH LARGO
  const idReal = String(c.hash_largo || item.hash_largo || c.id || item.id || c.referencia || '').trim();
  const hashCortoFinal = c.hash_corto || item.hash_corto || (idReal ? idReal.slice(0, 8).toUpperCase() : 'HASH');

  // 2. FECHAS Y HORAS: el backend canónico entrega fecha_hora_comprobante.
  const fechaItem = formatearFechaItem(fechaDesdeItem(c, item));
  const rawTs = c.timestamp_msg || item.timestamp_msg || c.fecha_hora_comprobante || item.fecha_hora_comprobante || '';
  const fechaFmt = c.fecha_fmt || item.fecha_fmt || fechaItem.fecha;
  const horaFmt = c.hora_fmt || item.hora_fmt || fechaItem.hora;
  const diaHoraHumano = c.dia_hora_humano || item.dia_hora_humano || fechaItem.humano;
  const dateInput = c.fecha_hora_input || item.fecha_hora_input || fechaItem.input;

  // 3. MONTOS Y MONEDAS (Búsqueda exhaustiva sin caer en 0)
  const rawMonto = c.monto ?? item.monto ?? c.monto_local ?? item.monto_local ?? 0;
  const fallbackMonto = Math.abs(parseFloat(String(rawMonto).replace(/,/g, '')) || 0);
  const monedaFinal = String(c.moneda || item.moneda || 'USDT').toUpperCase().trim();

  // 4. ENTIDADES Y ROLES
  const socio1Real = extraerNombreSocio(item, 1);
  const socio2Real = extraerNombreSocio(item, 2);

  const rol1 = c.rol_1 || item.rol_1 || c.grupo_1?.rol || c.perfil_1?.rol || 'SOCIO';
  const rol2 = c.rol_2 || item.rol_2 || c.grupo_2?.rol || c.perfil_2?.rol || 'SOCIO';

  const t1 = normalizarTasaComercial(
    c.tasa_1 ?? item.tasa_1 ?? c.tasa_socio_1 ?? item.tasa_socio_1 ?? c.t1_tasa ?? item.t1_tasa ?? c.grupo_1?.tasa
  );
  const t2 = normalizarTasaComercial(
    c.tasa_2 ?? item.tasa_2 ?? c.tasa_socio_2 ?? item.tasa_socio_2 ?? c.t2_tasa ?? item.t2_tasa ?? c.grupo_2?.tasa
  );

  // PRESERVACIÓN FIEL DE MONTOS INDIVIDUALES DE SOCIO
  const rawM1 = c.m1_socio ?? item.m1_socio ?? c.monto_1 ?? item.monto_1 ??
    c.monto1 ?? item.monto1 ??
    c.monto_socio_1 ?? item.monto_socio_1 ?? c.monto_socio1 ?? item.monto_socio1 ??
    c.t1_monto ?? item.t1_monto ?? c.me1 ?? item.me1 ?? fallbackMonto;
  const rawM2 = c.m2_socio ?? item.m2_socio ?? c.monto_2 ?? item.monto_2 ??
    c.monto2 ?? item.monto2 ??
    c.monto_socio_2 ?? item.monto_socio_2 ?? c.monto_socio2 ?? item.monto_socio2 ??
    c.t2_monto ?? item.t2_monto ?? c.me2 ?? item.me2 ?? fallbackMonto;

  const calcM1 = Math.abs(parseFloat(String(rawM1).replace(/,/g, '')) || 0).toFixed(2);
  const calcM2 = Math.abs(parseFloat(String(rawM2).replace(/,/g, '')) || 0).toFixed(2);

  // 4.1 POLARIDADES: el contrato canónico la expresa en el signo de me1/me2.
  const signo1 = parseFloat(String(rawM1).replace(/,/g, '')) || 0;
  const signo2 = parseFloat(String(rawM2).replace(/,/g, '')) || 0;
  const pol1 = c.polaridad_1 || item.polaridad_1 || c.polaridad_socio_1 || item.polaridad_socio_1 ||
    c.t1_polaridad || item.t1_polaridad || c.grupo_1?.polaridad || item.grupo_1?.polaridad ||
    (signo1 < 0 ? '-' : '+');
  const pol2 = c.polaridad_2 || item.polaridad_2 || c.polaridad_socio_2 || item.polaridad_socio_2 ||
    c.t2_polaridad || item.t2_polaridad || c.grupo_2?.polaridad || item.grupo_2?.polaridad ||
    (signo2 < 0 ? '-' : (signo2 > 0 ? '+' : '-'));

  // 5. IMAGEN CLOUDFLARE R2
  const rawImg = c.url_r2_comprobante || item.url_r2_comprobante || c.link_img || item.link_img || c.url_imagen || item.url_imagen || '';

  // 6. DETECCIÓN ROBUSTA DE BANDERAS SOCIO 2x
  const s2Upper = String(socio2Real || '').trim().toUpperCase();
  const tieneSocio2Valido = !['', 'GENERAL', 'NO DEFINIDO', 'S/D', 'N/A', 'NULL', 'UNDEFINED', '-'].includes(s2Upper);
  const esX2 = (item.es_x2 !== undefined) ? Boolean(item.es_x2) : tieneSocio2Valido;

  // Naturaleza centralizada: moneda natural -> IRIS -> caption A -> tabla.
  // La tarjeta, el reporte y los totales consumen este mismo resultado.
  const tipoResuelto = resolverNaturalezaComprobante({
    socio_1: socio1Real,
    moneda: monedaFinal,
    caption: c.caption ?? item.caption ?? '',
    tipo: c.tipo || item.tipo,
    tipo_manual: c.tipo_manual || item.tipo_manual,
    tipo_op: c.tipo_op || item.tipo_op,
    tipo_op1: c.tipo_op1 || item.tipo_op1,
    t1_tipo: c.t1_tipo || item.t1_tipo
  });

  // Un abono es siempre positivo para el socio 1 y negativo para el socio 2.
  // Así la tarjeta, el reporte y los KPIs conservan el signo de la naturaleza
  // resuelta, incluso si la proyección del backend venía con otro tipo.
  const polaridad1Final = tipoResuelto === 'A' ? '+' : pol1;
  const polaridad2Final = tipoResuelto === 'A' ? '-' : pol2;

  return {
    ...item,
    ...c,
    // CLAVES PRIMARIAS E IDENTIFICADORES
    id: idReal,
    hash_largo: idReal,
    hash_corto: hashCortoFinal,

    // CAMPOS DE FECHA Y TIEMPO
    timestamp_msg: rawTs,
    fecha_fmt: fechaFmt,
    hora_fmt: horaFmt,
    dia_hora_humano: diaHoraHumano,
    fecha_hora_input: dateInput,
    fecha_hora_comprobante: dateInput,

    // METADATOS BANCARIOS
    banco: (c.banco && c.banco !== '-') ? String(c.banco).toUpperCase() : (item.banco ? String(item.banco).toUpperCase() : 'BANCO'),
    referencia: (c.referencia && c.referencia !== '-') ? String(c.referencia) : (item.referencia || 'N/A'),
    titular: (c.titular && c.titular !== '-') ? String(c.titular).toUpperCase() : (item.titular ? String(item.titular).toUpperCase() : 'TITULAR NO DEFINIDO'),

    // IMAGEN
    link_img: rawImg,
    url_r2_comprobante: rawImg,

    // SOCIO 1
    nombre_socio_1: socio1Real,
    socio_1: socio1Real,
    rol_1: rol1,
    badge_1: obtenerInsigniaRol(rol1),
    moneda_base_socio1: c.moneda_base_socio1 || c.moneda_socio_1 || item.moneda_base_socio1 || item.moneda_socio_1 || 'USDT',
    moneda_socio_1: c.moneda_socio_1 || item.moneda_socio_1 || c.moneda_base_socio1 || item.moneda_base_socio1 || 'USDT',
    tasa_1: t1,
    m1_socio: calcM1,
    monto_1: calcM1,
    me1: calcM1,
    polaridad_1: polaridad1Final,

    // SOCIO 2
    nombre_socio_2: socio2Real,
    socio_2: socio2Real,
    rol_2: rol2,
    badge_2: obtenerInsigniaRol(rol2),
    moneda_base_socio2: c.moneda_base_socio2 || c.moneda_socio_2 || item.moneda_base_socio2 || item.moneda_socio_2 || 'USDT',
    moneda_socio_2: c.moneda_socio_2 || item.moneda_socio_2 || c.moneda_base_socio2 || item.moneda_base_socio2 || 'USDT',
    tasa_2: t2,
    m2_socio: calcM2,
    monto_2: calcM2,
    me2: calcM2,
    polaridad_2: polaridad2Final,

    // REGLAS GENERALES Y LOTES
    es_x2: esX2,
    tipo_op: tipoResuelto,
    tipo_manual: tipoResuelto,
    moneda: monedaFinal,
    monto: fallbackMonto,
    monto_local: fallbackMonto,
    lote: c.lote || item.lote || c.lote_tasa_asignado || item.lote_tasa_asignado || c.lote_tasa || item.lote_tasa || loteActivo,
    lote_tasa_asignado: c.lote_tasa_asignado || item.lote_tasa_asignado || c.lote || item.lote || c.lote_tasa || item.lote_tasa || loteActivo,

    // GRUPOS COMPATIBILIDAD ANIDADA
    grupo_1: {
      grupo: socio1Real,
      rol: rol1,
      tasa: t1,
      polaridad: polaridad1Final,
      monto: calcM1,
      moneda_base: c.moneda_base_socio1 || c.moneda_socio_1 || item.moneda_base_socio1 || item.moneda_socio_1 || 'USDT',
      me: calcM1
    },
    grupo_2: {
      grupo: socio2Real,
      rol: rol2,
      tasa: t2,
      polaridad: polaridad2Final,
      monto: calcM2,
      moneda_base: c.moneda_base_socio2 || c.moneda_socio_2 || item.moneda_base_socio2 || item.moneda_socio_2 || 'USDT',
      me: calcM2
    }
  };
}
