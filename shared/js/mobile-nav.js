/**
 * @file mobile-nav.js
 * Inyecta la barra de navegación inferior compartida por toda la suite.
 * En desktop la barra se oculta por CSS y se conserva el sidebar propio.
 */

const ITEMS = [
  { href: '/comprobantes/', label: 'Comprobantes', icon: '🧾' },
  { href: '/tasas/', label: 'Tasas', icon: '📈' },
  { href: '/perfiles/', label: 'Socios', icon: '👥' },
  { href: '/reportes/', label: 'Reportes', icon: '📊' }
];

function normalizarRuta(pathname) {
  const ruta = String(pathname || '/').replace(/\/+$/, '');
  return ruta || '/';
}

function itemActivo(pathname) {
  const ruta = normalizarRuta(pathname);
  if (ruta === '/') return ITEMS[0];
  return ITEMS.find((item) => {
    const base = normalizarRuta(item.href);
    return ruta === base || ruta.startsWith(`${base}/`);
  }) || null;
}

function render() {
  if (document.querySelector('.glauk-bottom-nav')) return;

  const activo = itemActivo(window.location.pathname);
  const nav = document.createElement('nav');
  nav.className = 'glauk-bottom-nav';
  nav.setAttribute('aria-label', 'Navegación principal');
  nav.innerHTML = ITEMS.map((item) => {
    const isActive = activo && activo.href === item.href;
    return `
      <a href="${item.href}"
         class="${isActive ? 'is-active' : ''}"
         ${isActive ? 'aria-current="page"' : ''}>
        <span class="glauk-nav-icon" aria-hidden="true">${item.icon}</span>
        <span class="glauk-nav-label">${item.label}</span>
      </a>
    `;
  }).join('');

  document.body.append(nav);
  document.body.classList.add('glauk-has-bottom-nav');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', render, { once: true });
} else {
  render();
}
