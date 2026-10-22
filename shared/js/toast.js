const ICONS = { success: '✓', error: '!', info: 'i', warning: '△' };

function host() {
  let node = document.getElementById('toast-host');
  if (!node) {
    node = document.createElement('div');
    node.id = 'toast-host';
    node.className = 'toast-host';
    node.setAttribute('aria-live', 'polite');
    document.body.append(node);
  }
  return node;
}

export function notify(message, { type = 'info', timeout = 4500 } = {}) {
  const node = document.createElement('div');
  node.className = `toast toast-${type}`;
  node.setAttribute('role', type === 'error' ? 'alert' : 'status');
  const icon = document.createElement('span');
  icon.className = 'toast-icon';
  icon.textContent = ICONS[type] || ICONS.info;
  const text = document.createElement('span');
  text.className = 'toast-text';
  text.textContent = String(message ?? '');
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'toast-close';
  close.setAttribute('aria-label', 'Cerrar notificación');
  close.textContent = '×';
  const remove = () => node.remove();
  close.addEventListener('click', remove);
  node.append(icon, text, close);
  host().append(node);
  if (timeout > 0) setTimeout(remove, timeout);
  return node;
}

export const success = (message, options = {}) => notify(message, { ...options, type: 'success' });
export const error = (message, options = {}) => notify(message, { ...options, type: 'error', timeout: 7000 });
export const info = (message, options = {}) => notify(message, { ...options, type: 'info' });
export const warning = (message, options = {}) => notify(message, { ...options, type: 'warning' });

export function clearToasts() {
  document.getElementById('toast-host')?.replaceChildren();
}
