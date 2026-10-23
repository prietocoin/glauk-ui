/**
 * @file sync.js
 * @description Señal de sincronización entre pestañas de Glauk.
 *
 * Perfiles y Comprobantes viven en documentos distintos. Cuando un socio cambia
 * su configuración de monedas, Comprobantes debe volver a proyectar importes con
 * el contrato nuevo (tipo, polar_D, polar_P, porcentajes) sin exigir recargar la
 * página. El canal principal es BroadcastChannel; localStorage queda como
 * respaldo para navegadores o contextos donde el canal no está disponible.
 */

const CANAL = 'glauk-socios';
const CLAVE_REVISION = 'glauk:socios:revision';

let canal = null;

function obtenerCanal() {
  if (canal) return canal;
  if (typeof globalThis.BroadcastChannel !== 'function') return null;
  try {
    canal = new globalThis.BroadcastChannel(CANAL);
  } catch {
    canal = null;
  }
  return canal;
}

function almacen() {
  try {
    return globalThis.localStorage || null;
  } catch {
    // En modo privado algunos navegadores lanzan al tocar localStorage.
    return null;
  }
}

/**
 * Publica que el directorio de socios cambió. Devuelve el evento emitido para
 * que el llamador pueda registrar la revisión en pruebas o auditoría.
 * @param {string} origen
 * @returns {{origen: string, revision: string, ts: number}}
 */
export function notificarSociosActualizados(origen = 'perfiles') {
  const evento = {
    origen,
    revision: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ts: Date.now()
  };
  const store = almacen();
  if (store) {
    try {
      store.setItem(CLAVE_REVISION, JSON.stringify(evento));
    } catch {
      /* sin persistencia: queda el BroadcastChannel */
    }
  }
  try {
    obtenerCanal()?.postMessage(evento);
  } catch {
    /* canal cerrado durante un reload */
  }
  return evento;
}

/**
 * Escucha cambios del directorio y devuelve la función para desuscribirse.
 * Deduplica por revisión porque un navegador con BroadcastChannel puede
 * entregar además el evento `storage` de la otra pestaña.
 * @param {(evento: {origen?: string, revision?: string, ts?: number}) => void} handler
 * @returns {() => void}
 */
export function escucharSociosActualizados(handler) {
  if (typeof handler !== 'function') return () => {};
  let ultimaRevision = '';
  const alRecibir = (evento) => {
    if (!evento || typeof evento !== 'object') return;
    const revision = String(evento.revision || '');
    if (revision && revision === ultimaRevision) return;
    ultimaRevision = revision;
    handler(evento);
  };
  const emisor = obtenerCanal();
  const onMessage = (evt) => alRecibir(evt?.data);
  const onStorage = (evt) => {
    if (!evt || evt.key !== CLAVE_REVISION || !evt.newValue) return;
    try {
      alRecibir(JSON.parse(evt.newValue));
    } catch {
      /* valor ajeno en la misma clave */
    }
  };
  if (emisor) emisor.addEventListener('message', onMessage);
  if (typeof globalThis.addEventListener === 'function') {
    globalThis.addEventListener('storage', onStorage);
  }
  return () => {
    if (emisor) emisor.removeEventListener('message', onMessage);
    if (typeof globalThis.removeEventListener === 'function') {
      globalThis.removeEventListener('storage', onStorage);
    }
  };
}

export const CANAL_SOCIOS = CANAL;
export const CLAVE_REVISION_SOCIOS = CLAVE_REVISION;
