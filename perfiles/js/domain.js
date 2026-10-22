import { metaMoneda, isoMoneda } from './catalog.js';

// Convierte cualquier representación histórica de `herencia` al booleano que
// espera la API. Se acepta "true" porque el HTML antiguo usaba un <select>.
export function esHerencia(valor) {
  return valor === true || valor === 'true';
}

// El backend actual siempre entrega un objeto, pero se conserva la tolerancia
// al JSON serializado que podía devolver el backend Node original.
export function parseMonedas(raw) {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) || {};
    } catch {
      return {};
    }
  }
  return raw && typeof raw === 'object' ? raw : {};
}

// FUNDDA es la matriz canónica; GENERAL es el respaldo histórico. Se respeta el
// orden del directorio, que llega ordenado por nombre desde PostgreSQL.
export function buscarMatriz(socios = []) {
  return (socios || []).find((socio) => {
    const nombre = String(socio?.nombre || '').trim().toUpperCase();
    return nombre === 'FUNDDA' || nombre === 'GENERAL';
  }) || null;
}

export function reglasDeMonedas(raw) {
  const monedas = parseMonedas(raw);
  return Object.entries(monedas).map(([codigo, data]) => {
    const regla = data && typeof data === 'object' ? data : {};
    const meta = metaMoneda(codigo);
    return {
      codigo,
      nombre: meta.nombre || codigo,
      iso: isoMoneda(codigo, meta),
      base: meta.base || '',
      def: regla.def || 'D',
      deposito: regla.deposito ?? regla.deposito_pct ?? 0,
      dep_op: regla.dep_op || regla.deposito_op || '+',
      pago: regla.pago ?? regla.pago_pct ?? 0,
      pago_op: regla.pago_op || '-'
    };
  });
}

export function reglasHeredadas(socios = []) {
  return reglasDeMonedas(buscarMatriz(socios)?.monedas);
}

export function reglasPropias(socio) {
  return reglasDeMonedas(socio?.monedas);
}

export function reglasSegunModo(socios, socio) {
  return esHerencia(socio?.herencia)
    ? reglasHeredadas(socios)
    : reglasPropias(socio);
}

export function nuevaRegla(codigo) {
  const meta = metaMoneda(codigo);
  return {
    codigo,
    nombre: meta.nombre || codigo,
    iso: isoMoneda(codigo, meta),
    base: meta.base || '',
    def: 'D',
    deposito: 0,
    dep_op: '+',
    pago: 0,
    pago_op: '-'
  };
}

// Forma canónica que espera /api/v1/perfiles/guardar. Los operadores y el def
// se envían explícitos para no depender de los defaults del backend.
export function construirMonedas(reglas = []) {
  const monedas = {};
  for (const regla of reglas) {
    monedas[regla.codigo] = {
      def: regla.def,
      deposito: parseFloat(regla.deposito) || 0,
      dep_op: regla.dep_op,
      pago: parseFloat(regla.pago) || 0,
      pago_op: regla.pago_op
    };
  }
  return monedas;
}

export function payloadGuardar(socio, reglas) {
  const herencia = esHerencia(socio?.herencia);
  return {
    ...socio,
    herencia,
    monedas: herencia ? parseMonedas(socio?.monedas) : construirMonedas(reglas)
  };
}

// Búsqueda idéntica a la original: solo nombre e id_grupo, sin rol ni moneda.
export function sociosFiltrados(socios = [], busqueda = '') {
  if (!String(busqueda || '').trim()) return socios;
  const consulta = String(busqueda).toLowerCase();
  return socios.filter((socio) =>
    (socio.nombre && socio.nombre.toLowerCase().includes(consulta)) ||
    (socio.id_grupo && socio.id_grupo.toLowerCase().includes(consulta))
  );
}

export function esEntidadProtegida(nombre) {
  const canonico = String(nombre || '').trim().toUpperCase();
  return canonico === 'FUNDDA' || canonico === 'GENERAL';
}
