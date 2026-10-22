export const MAPA_BANDERAS_ISO = {
  ARS: 'ar', BRL: 'br', CLP: 'cl', COP: 'co', MXN: 'mx',
  PEN: 'pe', PYG: 'py', VES: 've', USD: 'us', USDT: 'tt',
  PYUSD: 'pp', BOB: 'bo', EUR: 'eu', ECU: 'ec', PAN: 'pa',
  CRC: 'cr', CAD: 'ca', DOP: 'do'
};

export const BANDERAS_EMOJI_FALLBACK = {
  COP: '🇨🇴', PEN: '🇵🇪', ARS: '🇦🇷', BRL: '🇧🇷', MXN: '🇲🇽', EUR: '🇪🇺',
  USD: '🇺🇸', USDT: '🪙', PYUSD: '💵', PYG: '🇵🇾', VES: '🇻🇪', CLP: '🇨🇱',
  DOP: '🇩🇴', CRC: '🇨🇷', BOB: '🇧🇴', ECU: '🇪🇨', PAN: '🇵🇦', CAD: '🇨🇦'
};

export const MONEDAS_DEFAULT = {
  ARS: 0, BOB: 0, BRL: 0, CAD: 0, CLP: 0, COP: 0,
  CRC: 0, DOP: 0, EUR: 0, MXN: 0, PEN: 0, PYG: 0,
  VES: 0, USD: 1.00, USDT: 1.00, PYUSD: 1.20, ECU: 1.00, PAN: 1.00
};

export const MONEDAS_CHECKLIST = Object.keys(MAPA_BANDERAS_ISO);

const FLAGS_BASE = new URL('../flags/', import.meta.url);

export function obtenerUrlBandera(code) {
  const limpio = code == null ? '' : String(code);
  const filename = MAPA_BANDERAS_ISO[limpio.toUpperCase()] || limpio.toLowerCase().substring(0, 2);
  return new URL(`${filename}.png`, FLAGS_BASE).href;
}

export function esClaveMeta(clave) {
  return clave !== 'ID' && clave !== 'CREATED_AT';
}

export function fusionarTasas(mapaTasas) {
  return { ...MONEDAS_DEFAULT, ...(mapaTasas || {}) };
}
