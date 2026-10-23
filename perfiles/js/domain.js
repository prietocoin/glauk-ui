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

// Normaliza el tipo de operación por defecto de la moneda (DEF D/P).
export function tipoDeMoneda(regla = {}) {
  const tipo = String(regla.tipo ?? regla.def ?? '').trim().toUpperCase();
  return tipo === 'P' ? 'P' : 'D';
}

// Normaliza polar_D / polar_P. El signo canónico manda sobre los alias legacy.
export function signoDeMoneda(valor, defecto) {
  const signo = String(valor ?? '').trim();
  if (signo === '+' || signo === '-') return signo;
  return defecto;
}

function numeroDeMoneda(valor) {
  const numero = typeof valor === 'number' ? valor : parseFloat(valor);
  return Number.isFinite(numero) ? numero : 0;
}

function porcentajeDe(regla) {
  return regla?.porcentaje && typeof regla.porcentaje === 'object' ? regla.porcentaje : {};
}

export function reglasDeMonedas(raw) {
  const monedas = parseMonedas(raw);
  return Object.entries(monedas).map(([codigo, data]) => {
    const regla = data && typeof data === 'object' ? data : {};
    const porcentaje = porcentajeDe(regla);
    const meta = metaMoneda(codigo);
    return {
      codigo,
      nombre: meta.nombre || codigo,
      iso: isoMoneda(codigo, meta),
      base: meta.base || '',
      activo: regla.activo !== false,
      tipo: tipoDeMoneda(regla),
      deposito: numeroDeMoneda(porcentaje.deposito ?? regla.deposito ?? regla.deposito_pct),
      polar_D: signoDeMoneda(regla.polar_D ?? regla.dep_op ?? regla.deposito_op, '+'),
      pago: numeroDeMoneda(porcentaje.pago ?? regla.pago ?? regla.pago_pct),
      polar_P: signoDeMoneda(regla.polar_P ?? regla.pago_op, '-')
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
    activo: true,
    tipo: 'D',
    deposito: 0,
    polar_D: '+',
    pago: 0,
    polar_P: '-'
  };
}

// Forma canónica que espera /api/v1/perfiles/guardar. Se envían las cinco claves
// del contrato (activo, tipo, polar_D, polar_P, porcentaje) y sus alias legacy
// coherentes, de modo que ningún lector histórico pierda la configuración.
export function construirMonedas(reglas = []) {
  const monedas = {};
  for (const regla of reglas) {
    const tipo = tipoDeMoneda(regla);
    const polar_D = signoDeMoneda(regla.polar_D, '+');
    const polar_P = signoDeMoneda(regla.polar_P, '-');
    const deposito = numeroDeMoneda(regla.deposito);
    const pago = numeroDeMoneda(regla.pago);
    monedas[regla.codigo] = {
      activo: regla.activo !== false,
      tipo,
      polar_D,
      polar_P,
      porcentaje: { deposito, pago },
      // Alias legacy: mismo valor que las claves canónicas.
      def: tipo,
      deposito,
      dep_op: polar_D,
      pago,
      pago_op: polar_P
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
