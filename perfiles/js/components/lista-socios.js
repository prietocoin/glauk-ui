import { renderSocioCard } from './socio-card.js?v=20261024_24';

// Lista completa o empty state. El contenedor conserva `space-y-2.5`, por lo
// que las tarjetas mantienen el mismo ritmo vertical que el original.
export function renderListaSocios(socios = []) {
  if (!socios.length) {
    return '<div class="text-center py-12 text-slate-500 text-sm">No se encontraron socios que coincidan con la búsqueda.</div>';
  }
  return socios.map(renderSocioCard).join('');
}
