let temporizador = null;

export function showToast(mensaje) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = mensaje;
  toast.classList.remove('hidden');
  if (temporizador) clearTimeout(temporizador);
  temporizador = setTimeout(() => toast.classList.add('hidden'), 2200);
}
