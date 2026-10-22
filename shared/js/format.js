const LOCALE = 'es-VE';

export function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (value === null || value === undefined || value === '') return 0;
  const cleaned = String(value).replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatNumber(value, digits = 2) {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: digits, maximumFractionDigits: digits
  }).format(toNumber(value));
}

export function formatMoney(value, currency = 'USDT') {
  return `${formatNumber(value)} ${String(currency || 'USDT').toUpperCase()}`;
}

export function formatPercent(value, digits = 2) {
  return `${formatNumber(value, digits)} %`;
}

export function asDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number' || /^\d+$/.test(String(value))) {
    const number = Number(value);
    return new Date(number < 1e12 ? number * 1000 : number);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value, withTime = false) {
  const date = asDate(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat(LOCALE, {
    day: '2-digit', month: '2-digit', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {})
  }).format(date);
}

export function formatDateTime(value) {
  return formatDate(value, true);
}

export function formatDateInput(value) {
  const date = asDate(value) || new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function truncate(value, max = 42) {
  const clean = String(value ?? '').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}
