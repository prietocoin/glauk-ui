export function initPWA() {
  let deferredPrompt = null;
  const boton = document.getElementById('btnInstallPWA');

  window.addEventListener('beforeinstallprompt', (evento) => {
    evento.preventDefault();
    deferredPrompt = evento;
    boton?.classList.remove('hidden');
  });

  boton?.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') boton.classList.add('hidden');
    deferredPrompt = null;
  });

  if (!('serviceWorker' in navigator)) return;
  const registrar = () => {
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.log('SW Registration error:', error);
    });
  };
  if (document.readyState === 'complete') registrar();
  else window.addEventListener('load', registrar, { once: true });
}
