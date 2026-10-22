/**
 * @file listaMonedasActivas.js
 * @description Catálogo maestro de las 18 monedas activas soportadas por Glauk2 Engine.
 * Ubicación: public/js/shared/constants/listaMonedasActivas.js
 */

export const LISTA_MONEDAS_ACTIVAS = [
  { code: 'ARS', label: 'ARS (Peso Argentino)', nombre: 'Argentina', bandera: '🇦🇷' },
  { code: 'BOB', label: 'BOB (Boliviano)', nombre: 'Bolivia', bandera: '🇧🇴' },
  { code: 'BRL', label: 'BRL (Real Brasileño)', nombre: 'Brazil', bandera: '🇧🇷' },
  { code: 'CAD', label: 'CAD (Dólar Canadiense)', nombre: 'Canada', bandera: '🇨🇦' },
  { code: 'CLP', label: 'CLP (Peso Chileno)', nombre: 'Chile', bandera: '🇨🇱' },
  { code: 'COP', label: 'COP (Peso Colombiano)', nombre: 'Colombia', bandera: '🇨🇴' },
  { code: 'CRC', label: 'CRC (Colón Costarricense)', nombre: 'Costa Rica', bandera: '🇨🇷' },
  { code: 'DOP', label: 'DOP (Peso Dominicano)', nombre: 'Dominicana', bandera: '🇩🇴' },
  { code: 'ECU', label: 'ECU (Dólar Ecuador)', nombre: 'Ecuador', bandera: '🇪🇨' },
  { code: 'EUR', label: 'EUR (Euro)', nombre: 'Europa', bandera: '🇪🇺' },
  { code: 'MXN', label: 'MXN (Peso Mexicano)', nombre: 'Mexico', bandera: '🇲🇽' },
  { code: 'PAN', label: 'PAN (Balboa / Dólar Panamá)', nombre: 'Panamá', bandera: '🇵🇦' },
  { code: 'PEN', label: 'PEN (Sol Peruano)', nombre: 'Peru', bandera: '🇵🇪' },
  { code: 'PYG', label: 'PYG (Guaraní Paraguayo)', nombre: 'Paraguay', bandera: '🇵🇾' },
  { code: 'PYUSD', label: 'PYUSD (PayPal USD)', nombre: 'PYUSD', bandera: '🪙' },
  { code: 'USD', label: 'USD (EEUU - Zelle)', nombre: 'EEUU-Zelle', bandera: '🇺🇸' },
  { code: 'USDT', label: 'USDT (Tether)', nombre: 'USDT', bandera: '🪙' },
  { code: 'VES', label: 'VES (Bolívar Venezolano)', nombre: 'Venezuela', bandera: '🇻🇪' }
];

/**
 * Genera el diccionario maestro mapeado por código de moneda.
 * @returns {Object<string, {nombre: string, bandera: string}>}
 */
export function obtenerInfoMonedasMaestra() {
  const map = {};
  LISTA_MONEDAS_ACTIVAS.forEach(m => {
    map[m.code] = { nombre: m.nombre, bandera: m.bandera };
  });
  return map;
}
