/**
 * @file comprobantesApiService.js
 * @description Servicio atómico de red para el CRUD de comprobantes contra el
 * backend Go unificado. Mantiene la paginación y los filtros de la interfaz
 * glauk2 sobre el contrato /api/v1/comprobantes.
 */

import { apiUrl } from '../../../../../shared/js/api-base.js?v=20261025_01';
import { aplicarRangoHash } from './comprobantesFilterService.js?v=20261025_01';

const API_RUTA = '/api/v1/comprobantes';

function obtenerIdentificadorValido(identificador, fallbackPayload = {}) {
  let target = '';

  if (typeof identificador === 'object' && identificador !== null) {
    target = identificador.hash_largo ||
             identificador.id ||
             identificador._id ||
             identificador.hash ||
             identificador.referencia || '';
  } else {
    target = identificador;
  }

  if (!target) {
    target = fallbackPayload?.hash_largo ||
             fallbackPayload?.hash ||
             fallbackPayload?.id ||
             fallbackPayload?._id ||
             fallbackPayload?.referencia || '';
  }

  return String(target || '').trim();
}

function normalizarFecha(valor) {
  const fecha = new Date(valor || 0);
  return isNaN(fecha.getTime()) ? 0 : fecha.getTime();
}

function ordenarLista(lista, orden) {
  const copia = [...lista];
  switch (orden) {
    case 'fecha_asc':
      return copia.sort((a, b) => normalizarFecha(a.fecha_hora_comprobante || a.timestamp_msg) - normalizarFecha(b.fecha_hora_comprobante || b.timestamp_msg));
    case 'monto_asc':
      return copia.sort((a, b) => (parseFloat(a.monto) || 0) - (parseFloat(b.monto) || 0));
    case 'monto_desc':
      return copia.sort((a, b) => (parseFloat(b.monto) || 0) - (parseFloat(a.monto) || 0));
    case 'fecha_desc':
    default:
      return copia.sort((a, b) => normalizarFecha(b.fecha_hora_comprobante || b.timestamp_msg) - normalizarFecha(a.fecha_hora_comprobante || a.timestamp_msg));
  }
}

const LIMITE_API = 100;
const MAXIMO_CONSULTA = 500;
// Tope interno para recuperar datos cuando el filtro de socio del backend
// devuelve cero aunque existan filas. La UI sigue mostrando como máximo 500.
export const MAXIMO_RECUPERACION = 2000;
// Bloque de carga progresiva por red que consume la vista de comprobantes.
export const LIMITE_PAGINA = 20;

function fechaISO(fecha) {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseFechaISO(valor) {
  const texto = String(valor || '').trim();
  if (!texto) return null;
  const fecha = new Date(`${texto}T00:00:00`);
  return isNaN(fecha.getTime()) ? null : fecha;
}

function dividirRangoFechas(desde, hasta) {
  const inicio = parseFechaISO(desde);
  const fin = parseFechaISO(hasta);
  if (!inicio || !fin || inicio >= fin) return null;

  const dias = Math.floor((fin.getTime() - inicio.getTime()) / 86400000);
  if (dias < 1) return null;

  const medio = new Date(inicio.getTime() + Math.floor(dias / 2) * 86400000);
  const siguiente = new Date(medio.getTime() + 86400000);

  return [
    { desde, hasta: fechaISO(medio) },
    { desde: fechaISO(siguiente), hasta }
  ];
}

function claveItem(item) {
  const c = item?.comprobante || item || {};
  const principal = String(c.hash_largo || c.id || c.referencia || '').trim().toLowerCase();
  if (principal) return principal;
  return `${c.fecha_hora_comprobante || c.fecha || ''}|${c.monto || ''}|${c.banco || ''}`;
}

async function consultarLista(params = {}) {
  const url = construirUrlConsulta(params);

  const res = await fetch(url.toString());
  const contentType = res.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    console.warn(`[comprobantesApiService ⚠️ Warning]: La API respondió con formato no JSON (${res.status}).`);
    return { lista: [], truncada: false };
  }
  if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);

  const json = await res.json();
  const lista = json?.comprobantes || json?.data || (Array.isArray(json) ? json : []);
  const normalizada = Array.isArray(lista) ? lista : [];
  return { lista: normalizada, truncada: normalizada.length >= LIMITE_API };
}

/**
 * Construye la URL de consulta compartida por la carga legacy y la paginada.
 * Los límites de hash son un recorte posicional local y nunca viajan a la API.
 */
function construirUrlConsulta(params = {}, paginacion = {}) {
  const {
    socio = '',
    rol = '',
    fechaInicio = '',
    fechaFin = '',
    orden = 'fecha_desc',
    hash = ''
  } = params;

  const url = new URL(apiUrl(API_RUTA), window.location.origin);
  const socioNormalizado = String(socio || '').trim().toUpperCase();
  if (socioNormalizado && socioNormalizado !== 'TODOS' && socioNormalizado !== 'TODOS LOS SOCIOS' && socioNormalizado !== 'GENERAL') {
    url.searchParams.append('socio', String(socio).trim());
  }
  if (rol && rol.toUpperCase() !== 'TODOS') url.searchParams.append('rol', rol.trim());
  if (fechaInicio) url.searchParams.append('fechaInicio', fechaInicio.trim());
  if (fechaFin) url.searchParams.append('fechaFin', fechaFin.trim());
  if (hash) url.searchParams.append('hash', hash.trim());
  if (orden === 'fecha_asc' || orden === 'fecha_desc') url.searchParams.append('orden', orden);
  if (paginacion.limit != null) url.searchParams.append('limit', String(paginacion.limit));
  if (paginacion.offset != null) url.searchParams.append('offset', String(paginacion.offset));

  return url;
}

function leerEnteroCabecera(res, nombre) {
  const valor = res.headers.get(nombre);
  if (valor === null || valor === '') return null;
  const numero = Number.parseInt(valor, 10);
  return Number.isFinite(numero) ? numero : null;
}

/**
 * Solicita una página real al backend (limit/offset) y devuelve los metadatos
 * de paginación necesarios para el scroll progresivo.
 *
 * El contrato canónico mantiene un array raíz y expone el universo filtrado en
 * las cabeceras X-Total-Count / X-Has-More. Si el backend aún no las envía y
 * devuelve más filas que la ventana pedida, se marca `paginado: false` para
 * que la UI degrade a paginación local sobre el bloque recibido.
 */
export async function fetchComprobantesPagina(params = {}, opciones = {}) {
  const limit = Math.min(
    Math.max(Number(opciones.limit) || LIMITE_PAGINA, 1),
    LIMITE_API
  );
  const offset = Math.max(Number(opciones.offset) || 0, 0);

  try {
    const res = await fetch(construirUrlConsulta(params, { limit, offset }).toString());
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn(`[comprobantesApiService ⚠️ Warning]: La API respondió con formato no JSON (${res.status}).`);
      return { lista: [], total: offset, hasMore: false, paginado: true, limit, offset, recibidos: 0 };
    }
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);

    const json = await res.json();
    const bruta = Array.isArray(json)
      ? json
      : (json?.comprobantes || json?.items || json?.data || []);
    const lista = Array.isArray(bruta) ? bruta : [];

    const totalCabecera = leerEnteroCabecera(res, 'x-total-count');
    const hasMoreCabecera = res.headers.get('x-has-more');
    const tieneMetadatos = totalCabecera !== null || hasMoreCabecera !== null;
    // Un backend sin paginación devuelve su tope físico (100) aunque se pidan 20.
    const respetoVentana = tieneMetadatos || lista.length <= limit;

    const total = totalCabecera !== null
      ? Math.max(totalCabecera, offset + lista.length)
      : offset + lista.length;
    const hasMore = hasMoreCabecera !== null
      ? hasMoreCabecera === 'true'
      : (respetoVentana && lista.length >= limit);

    return {
      lista,
      total,
      hasMore,
      paginado: respetoVentana,
      limit,
      offset,
      recibidos: lista.length
    };
  } catch (err) {
    console.error('[comprobantesApiService ❌ Fetch Error]:', err.message);
    return { lista: [], total: offset, hasMore: false, paginado: true, limit, offset, recibidos: 0 };
  }
}

/**
 * Recupera una sola fila canónica por hash. Se usa después del PUT para
 * actualizar la UI con la entidad que proyecta el backend, no con el payload
 * local del formulario.
 */
export async function fetchComprobantePorHash(hashLargo) {
  const target = String(hashLargo || '').trim();
  if (!target) return null;
  const pagina = await fetchComprobantesPagina({ hash: target }, { limit: 1, offset: 0 });
  return pagina.lista[0] || null;
}

/**
 * Reúne hasta el tope solicitado respetando el límite físico de 100 filas por
 * consulta del backend. Si un bloque llega lleno, parte el rango de fechas y
 * consulta los dos subrangos. El máximo de recuperación es 2000; la UI
 * normal sigue solicitando 500.
 */
export async function fetchComprobantesHasta(params = {}, maximo = MAXIMO_CONSULTA) {
  const tope = Math.min(Math.max(Number(maximo) || MAXIMO_CONSULTA, 1), MAXIMO_RECUPERACION);
  const acumulado = [];
  const vistos = new Set();

  const agregar = (lista = []) => {
    for (const item of lista) {
      if (acumulado.length >= tope) return;
      const clave = claveItem(item);
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      acumulado.push(item);
    }
  };

  async function recolectar(desde, hasta, profundidad = 0) {
    if (acumulado.length >= tope) return;

    const respuesta = await consultarLista({ ...params, fechaInicio: desde || '', fechaFin: hasta || '' });
    const partes = respuesta.truncada && desde && hasta && profundidad < 8
      ? dividirRangoFechas(desde, hasta)
      : null;

    if (partes && acumulado.length + respuesta.lista.length < tope) {
      await recolectar(partes[0].desde, partes[0].hasta, profundidad + 1);
      if (acumulado.length >= tope) return;
      await recolectar(partes[1].desde, partes[1].hasta, profundidad + 1);
      return;
    }

    agregar(respuesta.lista);
  }

  try {
    await recolectar(params.fechaInicio || '', params.fechaFin || '');
    return ordenarLista(acumulado, params.orden || 'fecha_desc');
  } catch (err) {
    console.error('[comprobantesApiService ❌ Fetch Error]:', err.message);
    return [];
  }
}

/**
 * Carga los comprobantes y emula la paginación de la API v2 sobre el contrato
 * canónico. Se conserva para consumidores que necesitan una página puntual.
 */
export async function fetchComprobantesPaginados(params = {}) {
  try {
    const { page = 1, limit = 20, desdeHash = '', hastaHash = '', orden = 'fecha_desc' } = params;
    const respuesta = await consultarLista(params);
    const ordenada = ordenarLista(respuesta.lista, orden);
    const filtrada = aplicarRangoHash(ordenada, desdeHash, hastaHash);
    const inicio = Math.max(0, (Number(page) - 1) * Number(limit));
    return filtrada.slice(inicio, inicio + Number(limit));
  } catch (err) {
    console.error('[comprobantesApiService ❌ Fetch Error]:', err.message);
    return [];
  }
}

/**
 * Guarda cambios de un comprobante editado (PUT directo al contrato canónico).
 */
export async function guardarCambiosComprobante(hashLargo, payload = {}, loteActivo = 'T070') {
  try {
    const idValido = obtenerIdentificadorValido(hashLargo, payload);
    if (!idValido) {
      throw new Error('No se proporcionó un hash o ID válido para actualizar');
    }

    const dataPayload = (typeof hashLargo === 'object' && hashLargo !== null) ? hashLargo : payload;
    const body = { ...dataPayload, loteActivo };
    if (!body.lote_tasa_asignado && !body.lote_tasa) body.lote_tasa_asignado = loteActivo;

    const res = await fetch(apiUrl(`${API_RUTA}/${encodeURIComponent(idValido)}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    return await res.json().catch(() => true);
  } catch (err) {
    console.error('[comprobantesApiService ❌ Save Error]:', err.message);
    throw err;
  }
}

/**
 * Solicita relectura con IA.
 */
export async function solicitarRelecturaIA(hashLargo) {
  try {
    const idValido = obtenerIdentificadorValido(hashLargo);
    if (!idValido) {
      throw new Error('No se proporcionó un hash o ID válido para releer con IA');
    }

    const res = await fetch(apiUrl(`${API_RUTA}/${encodeURIComponent(idValido)}/releer`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    return await res.json().catch(() => true);
  } catch (err) {
    console.error('[comprobantesApiService ❌ IA Re-read Error]:', err.message);
    throw err;
  }
}

/**
 * Elimina un comprobante por su hash o ID.
 */
export async function eliminarComprobantePorHash(hashLargo) {
  try {
    const idValido = obtenerIdentificadorValido(hashLargo);
    if (!idValido) {
      throw new Error('No se proporcionó un hash o ID válido para eliminar');
    }

    const res = await fetch(apiUrl(`${API_RUTA}/${encodeURIComponent(idValido)}`), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.success === false) {
      throw new Error(data?.error || data?.message || `HTTP Error: ${res.status}`);
    }
    return data || true;
  } catch (err) {
    console.error('[comprobantesApiService ❌ Delete Error]:', err.message);
    throw err;
  }
}

export {
  guardarCambiosComprobante as actualizarComprobanteApi,
  solicitarRelecturaIA as releerIaApi
};
