/**
 * @file socioConfigModalService.js
 * @description Mapeo y persistencia para el modal de configuración de socios.
 */

import { apiUrl } from '../../../../../shared/js/api-base.js';

function signoCanonico(valor, defecto) {
  const texto = String(valor ?? '').trim();
  return texto === '+' || texto === '-' ? texto : defecto;
}

function contraparte(signo) {
  return signo === '-' ? '+' : '-';
}

/**
 * Prepara el objeto borrador para vincular en el formulario del modal.
 * @param {Object} socioObj - Datos crudos del socio.
 * @param {Object} infoMonedasMaestra - Diccionario maestro de banderas y nombres.
 * @returns {Object}
 */
export function prepararEdicionSocio(socioObj, infoMonedasMaestra = {}) {
  let monedasConfig = typeof socioObj.monedas === 'string'
    ? JSON.parse(socioObj.monedas || '{}')
    : (socioObj.monedas || {});
  let mostrarConfig = typeof socioObj.mostrar === 'string'
    ? JSON.parse(socioObj.mostrar || '{}')
    : (socioObj.mostrar || {});

  const paisesArray = Object.keys(monedasConfig).map(code => {
    const info = infoMonedasMaestra[code] || { nombre: code, bandera: '🌐' };
    const cfg = monedasConfig[code] || {};
    const porcentaje = cfg.porcentaje && typeof cfg.porcentaje === 'object' ? cfg.porcentaje : {};
    // polar_D / polar_P son la fuente de verdad; polaridad y los operadores
    // planos quedan como respaldo de perfiles históricos. El borrador conserva
    // ambos signos para que guardar otro campo no los colapse en uno solo.
    const polarD = signoCanonico(cfg.polar_D ?? cfg.dep_op, signoCanonico(cfg.polaridad, '+'));
    const polarP = signoCanonico(cfg.polar_P ?? cfg.pago_op, contraparte(polarD));
    return {
      code,
      nombre: info.nombre,
      bandera: info.bandera,
      activo: cfg.activo ?? true,
      pctD: porcentaje.deposito ?? cfg.deposito ?? 0,
      pctP: porcentaje.pago ?? cfg.pago ?? 0,
      polarD,
      polarP,
      polaridadSuma: polarD === '+',
      naturaleza: cfg.tipo || cfg.def || 'D'
    };
  });

  return {
    nombre: socioObj.nombre || '',
    roles: socioObj.rol || socioObj.roles || 'SOCIO',
    moneda_socio: String(socioObj.moneda_base || socioObj.moneda_socio || 'USDT').toUpperCase().trim(),
    whatsapp: socioObj.id_grupo || socioObj.whatsapp || '',
    saldo_anterior: parseFloat(socioObj.saldo_inicial ?? socioObj.saldo_anterior ?? 0) || 0,
    activo: mostrarConfig.tasas ?? socioObj.activo ?? true,
    mostrar_dashboard: mostrarConfig.dashboard ?? socioObj.mostrar_dashboard ?? true,
    herencia: Boolean(socioObj.herencia),
    paises: paisesArray
  };
}

/**
 * Persiste la configuración editada del socio hacia el backend.
 * @param {Object} socioConfigEdit - Estado del socio en edición.
 */
export async function guardarConfiguracionSocio(socioConfigEdit) {
  if (!socioConfigEdit || !socioConfigEdit.nombre.trim()) {
    throw new Error('Por favor especifica el nombre del socio.');
  }

  const monedasFinales = {};
  (socioConfigEdit.paises || []).forEach(p => {
    const code = String(p.code || '').trim().toUpperCase();
    if (!code) return;
    const tipo = String(p.naturaleza || p.tipo || 'D').trim().toUpperCase() === 'P' ? 'P' : 'D';
    // Reenviar los signos canónicos que llegaron del backend. Antes solo se
    // emitía `polaridad`, de modo que un guardado de otro campo (dashboard,
    // herencia) borraba polar_D / polar_P del JSONB.
    const polarD = signoCanonico(p.polarD ?? p.polar_D, p.polaridadSuma === false ? '-' : '+');
    const polarP = signoCanonico(p.polarP ?? p.polar_P, contraparte(polarD));
    const deposito = Math.abs(parseFloat(p.pctD) || 0);
    const pago = Math.abs(parseFloat(p.pctP) || 0);
    monedasFinales[code] = {
      activo: Boolean(p.activo),
      tipo,
      polar_D: polarD,
      polar_P: polarP,
      polaridad: polarD,
      porcentaje: { deposito, pago },
      // Alias planos: el codec los reescribe, pero se envían para no perder
      // compatibilidad con cualquier lector histórico intermedio.
      def: tipo,
      deposito,
      dep_op: polarD,
      pago,
      pago_op: polarP
    };
  });

  const payload = {
    nombre: socioConfigEdit.nombre,
    rol: socioConfigEdit.roles,
    moneda_base: String(socioConfigEdit.moneda_socio || 'USDT').toUpperCase().trim(),
    id_grupo: socioConfigEdit.whatsapp,
    saldo_inicial: parseFloat(socioConfigEdit.saldo_anterior) || 0,
    herencia: Boolean(socioConfigEdit.herencia),
    mostrar: {
      tasas: Boolean(socioConfigEdit.activo),
      dashboard: Boolean(socioConfigEdit.mostrar_dashboard)
    },
    monedas: monedasFinales
  };

  const response = await fetch(apiUrl('/api/socios/config'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const res = await response.json();
  if (!response.ok || !res.success) {
    throw new Error(res.error || 'Error al guardar la configuración del socio.');
  }
}
