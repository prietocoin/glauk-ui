export function abrirModal(id) {
  document.getElementById(id)?.classList.remove('hidden');
}

export function cerrarModal(id) {
  document.getElementById(id)?.classList.add('hidden');
}
