// Los modales de Tasas son bottom-sheet en mobile y diálogo centrado en
// desktop. Mientras uno está abierto el documento no scrollea: el único scroll
// permitido es el del .modal-body.
function sincronizarBloqueoScroll() {
  const abierto = Boolean(document.querySelector('.modal:not(.hidden), .sheet:not(.hidden)'));
  document.body.classList.toggle('glauk-sheet-open', abierto);
}

export function abrirModal(id) {
  document.getElementById(id)?.classList.remove('hidden');
  sincronizarBloqueoScroll();
}

export function cerrarModal(id) {
  document.getElementById(id)?.classList.add('hidden');
  sincronizarBloqueoScroll();
}
