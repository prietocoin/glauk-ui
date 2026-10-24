/**
 * @file mobile-nav.js
 * Inyecta la barra de navegación inferior compartida por toda la suite.
 * En desktop la barra se oculta por CSS y se conserva el sidebar propio.
 *
 * Los cuatro destinos replican exactamente la arquitectura del sidebar:
 * Comprobantes, Tasas, Socios y Dashboard. El antiguo módulo "Reportes"
 * (constructor visual) quedó retirado: el reporte formal de socio se abre
 * desde la Inspección de Lotes del Dashboard o desde cada comprobante.
 */

function icono(contenido) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${contenido}</svg>`;
}

const ITEMS = [
  {
    href: '/comprobantes/',
    label: 'Comprobantes',
    icon: icono('<path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z"/>')
  },
  {
    href: '/tasas/',
    label: 'Tasas',
    icon: icono('<path d="M13 7h8m0 0v8m0-8-8 8-4-4-6 6"/>')
  },
  {
    href: '/perfiles/',
    label: 'Socios',
    icon: icono('<path d="M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM7 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z"/>')
  },
  {
    href: '/dashboard/',
    label: 'Dashboard',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>'
  }
];

function normalizarRuta(pathname) {
  const ruta = String(pathname || '/').replace(/\/+$/, '');
  return ruta || '/';
}

/**
 * El Dashboard vive dentro del SPA de comprobantes y se alcanza con
 * `/comprobantes/?vista=dashboard`; la ruta `/dashboard/` redirige allí.
 */
function enDashboard() {
  if (normalizarRuta(window.location.pathname) === '/dashboard') return true;
  const vista = new URLSearchParams(window.location.search || '').get('vista');
  return vista === 'dashboard';
}

function itemActivo(pathname) {
  if (enDashboard()) return ITEMS.find((item) => item.href === '/dashboard/') || null;
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
