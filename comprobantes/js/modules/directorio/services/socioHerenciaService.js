/**
 * @file socioHerenciaService.js
 * @description Servicio atómico para conmutar y guardar el estado de herencia de un socio.
 * Prepara el payload completo con los JSONB de 'mostrar' y 'monedas' para evitar sobrescrituras corruptas.
 */

import { apiUrl } from '../../../../../shared/js/api-base.js';

/**
 * Alterna la bandera de herencia de un socio y guarda su configuración.
 * @param {Object} socio - Objeto del socio a modificar.
 * @returns {Promise<boolean>} Estado actualizado de herencia.
 */
export async function alternarHerenciaSocio(socio) {
  if (!socio?.nombre) return false;

  const nuevaHerencia = !socio.herencia;
  socio.herencia = nuevaHerencia;

  let monedasObj = socio.monedas;
  if (typeof monedasObj === 'string') {
    try { monedasObj = JSON.parse(monedasObj); } catch (e) { monedasObj = {}; }
  }

  let mostrarObj = socio.mostrar;
  if (typeof mostrarObj === 'string') {
    try { mostrarObj = JSON.parse(mostrarObj); } catch (e) { mostrarObj = {}; }
  }

  const payload = {
    nombre: socio.nombre,
    rol: socio.rol || socio.roles || 'SOCIO',
    moneda_base: String(socio.moneda_base || socio.moneda_socio || 'USDT').toUpperCase().trim(),
    id_grupo: socio.id_grupo || socio.whatsapp || '',
    saldo_inicial: parseFloat(socio.saldo_inicial ?? socio.saldo_anterior ?? 0) || 0,
    mostrar: mostrarObj || { tasas: true, dashboard: true },
    monedas: monedasObj || {},
    herencia: Boolean(nuevaHerencia)
  };

  try {
    const response = await fetch(apiUrl('/api/socios/config'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const res = await response.json();
    if (!response.ok || !res.success) throw new Error(res.error || 'Error al actualizar herencia');

    return nuevaHerencia;
  } catch (err) {
    console.error('[socioHerenciaService ❌ Error al alternar herencia]:', err);
    // Revertir estado local si falla la persistencia
    socio.herencia = !nuevaHerencia;
    alert('❌ No se pudo guardar el cambio de herencia.');
    return !nuevaHerencia;
  }
}
