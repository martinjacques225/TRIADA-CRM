// js/geo.js — Dirección del lead → navegación en mapas.
// Puro: no toca DOM, red ni estado (igual que mappers.js) → testeable en node.
// Lo usan el CRM de escritorio y la PWA móvil (esta vía movil/js/core.js).
//
// Por qué texto y no coordenadas: no hay API de geocodificación contratada; los
// mapas resuelven la dirección escrita al abrirse. Ver supabase/leads_direccion_*.sql.

const PAIS = 'Chile';

/** Partes de la dirección, en orden, sin vacíos ni duplicados (comuna == región). */
function _partes(lead) {
  const l = lead || {};
  const trim = (v) => (v == null ? '' : String(v).trim());
  const out = [];
  [trim(l.direccion), trim(l.comuna), trim(l.region)].forEach((p) => {
    if (!p) return;
    if (out.some((x) => x.toLowerCase() === p.toLowerCase())) return;
    out.push(p);
  });
  return out;
}

/** "Av. San Miguel 1234, Molina, Maule" · '' si el lead no tiene nada cargado. */
export function direccionCompleta(lead) {
  return _partes(lead).join(', ');
}

/** "Av. San Miguel 1234, Molina" — sin la región, para las tarjetas (espacio corto).
    La región sí va en la consulta al mapa, donde ayuda a desambiguar. */
export function direccionCorta(lead) {
  const l = lead || {};
  return _partes({ direccion: l.direccion, comuna: l.comuna }).join(', ');
}

/** true si hay algo que navegar. La región SOLA no sirve: es media zona del país. */
export function tieneDireccion(lead) {
  const l = lead || {};
  return !!((l.direccion && String(l.direccion).trim()) || (l.comuna && String(l.comuna).trim()));
}

/** Consulta para el mapa: la dirección + ", Chile" (evita saltar de país al geocodificar).
    Si solo hay región devuelve '' — mandar al mapa "Maule, Chile" no lleva a ninguna
    parte útil, y es la misma regla con la que se muestra el botón (tieneDireccion). */
export function mapsQuery(lead) {
  if (!tieneDireccion(lead)) return '';
  const dir = direccionCompleta(lead);
  return /chile\s*$/i.test(dir) ? dir : `${dir}, ${PAIS}`;
}

/** Google Maps con la ruta YA iniciada desde donde estés (abre la app en el teléfono). */
export function googleMapsUrl(lead) {
  const q = mapsQuery(lead);
  if (!q) return '';
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}&travelmode=driving&dir_action=navigate`;
}

/** Google Maps en modo "ver el punto" (sin navegar): útil para ubicarse antes de salir. */
export function googleMapsVerUrl(lead) {
  const q = mapsQuery(lead);
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : '';
}

/** Waze — `navigate=yes` arranca la navegación al tiro. */
export function wazeUrl(lead) {
  const q = mapsQuery(lead);
  return q ? `https://waze.com/ul?q=${encodeURIComponent(q)}&navigate=yes` : '';
}

/** Apple Maps (iPhone sin Google Maps instalado). dirflg=d → en auto. */
export function appleMapsUrl(lead) {
  const q = mapsQuery(lead);
  return q ? `https://maps.apple.com/?daddr=${encodeURIComponent(q)}&dirflg=d` : '';
}

/** El mapa "por defecto" del dispositivo: Apple Maps en iPhone/iPad, Google en el resto. */
export function mapaPorDefectoUrl(lead, userAgent = '') {
  return /iphone|ipad|ipod/i.test(userAgent) ? appleMapsUrl(lead) : googleMapsUrl(lead);
}
