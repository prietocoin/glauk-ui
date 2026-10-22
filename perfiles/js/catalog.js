// Catálogo estático heredado de PerfilHub. El orden importa: alimenta el
// selector "Agregar Moneda" y se conserva igual al de perfilesgo.
export const CATALOGO_MONEDAS = Object.freeze({
  ARS: { nombre: 'Argentina', iso: 'AR', base: 1602 },
  VES: { nombre: 'Venezuela', iso: 'VE', base: 1000 },
  PEN: { nombre: 'Perú', iso: 'PE', base: 3.45 },
  COP: { nombre: 'Colombia', iso: 'CO', base: 3175 },
  CLP: { nombre: 'Chile', iso: 'CL', base: 988 },
  BRL: { nombre: 'Brasil', iso: 'BR', base: 5.05 },
  BOB: { nombre: 'Bolivia', iso: 'BO', base: 11.86 },
  USD: { nombre: 'Dólar USA', iso: 'US', base: 1 },
  USDT: { nombre: 'Tether USDT', iso: 'US', base: 1 },
  PYUSD: { nombre: 'PayPal USD', iso: 'US', base: 1.2 },
  EUR: { nombre: 'Euro', iso: 'EU', base: 0.9 },
  MXN: { nombre: 'México', iso: 'MX', base: 18.54 },
  CAD: { nombre: 'Canadá', iso: 'CA', base: 1.45 },
  CRC: { nombre: 'Costa Rica', iso: 'CR', base: 456 },
  DOP: { nombre: 'Rep. Dominicana', iso: 'DO', base: 62.09 },
  PYG: { nombre: 'Paraguay', iso: 'PY', base: 5781 },
  ECU: { nombre: 'Ecuador', iso: 'EC', base: 1 },
  PAN: { nombre: 'Panamá', iso: 'PA', base: 1 }
});

// Orden y etiquetas del selector "Moneda Nativa (Base)" del modal original.
export const MONEDAS_BASE = Object.freeze([
  { value: 'USDT', label: 'USDT (Tether)' },
  { value: 'PYUSD', label: 'PYUSD (PayPal USD)' },
  { value: 'USD', label: 'USD (Dólar USA)' },
  { separator: true, label: '──────────' },
  { value: 'ARS', label: 'ARS (Argentina)' },
  { value: 'BOB', label: 'BOB (Bolivia)' },
  { value: 'BRL', label: 'BRL (Brasil)' },
  { value: 'CAD', label: 'CAD (Canadá)' },
  { value: 'CLP', label: 'CLP (Chile)' },
  { value: 'COP', label: 'COP (Colombia)' },
  { value: 'CRC', label: 'CRC (Costa Rica)' },
  { value: 'DOP', label: 'DOP (Rep. Dominicana)' },
  { value: 'ECU', label: 'ECU (Ecuador)' },
  { value: 'EUR', label: 'EUR (Euro)' },
  { value: 'MXN', label: 'MXN (México)' },
  { value: 'PAN', label: 'PAN (Panamá)' },
  { value: 'PEN', label: 'PEN (Perú)' },
  { value: 'PYG', label: 'PYG (Paraguay)' },
  { value: 'VES', label: 'VES (Venezuela)' }
]);

export function metaMoneda(codigo) {
  return CATALOGO_MONEDAS[codigo] || {};
}

export function isoMoneda(codigo, meta = {}) {
  return meta.iso || String(codigo || '').substring(0, 2);
}
