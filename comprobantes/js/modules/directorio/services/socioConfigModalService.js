/**
 * @file socioConfigModalService.js
 * @description Mapeo y persistencia para el modal de configuración de socios.
 */

import { apiUrl } from '../../../../../shared/js/api-base.js';

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
    return {
      code,
      nombre: info.nombre,
      bandera: info.bandera,
      activo: cfg.activo ?? true,
      pctD: cfg.porcentaje?.deposito || 0,
      pctP: cfg.porcentaje?.pago || 0,
      polaridadSuma: cfg.polaridad === '+' || cfg.polaridad === undefined,
      naturaleza: cfg.tipo || 'D'
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
    const code = p.code.toUpperCase();
    monedasFinales[code] = {
      activo: Boolean(p.activo),
      tipo: p.naturaleza || 'D',
      polaridad: p.polaridadSuma ? '+' : '-',
      porcentaje: {
        deposito: Math.abs(parseFloat(p.pctD) || 0),
        pago: Math.abs(parseFloat(p.pctP) || 0)
      }
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
