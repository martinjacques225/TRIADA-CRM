// modules/informe-ejecutivo/informe.benchmarks.js
// Referencia Tríada de madurez por rubro y tamaño + factores de cuantificación.
// ⚠️ Valores CURADOS por criterio experto (no es un dataset en vivo). Sirven para
// dar contexto relativo ("tu 61 vs ~58 esperado en tu rubro") y para dimensionar
// el valor en juego. Editar acá cuando se junten datos reales.
// Sin dependencias de red → testeable en node.

// Puntaje esperado base (0-100) por tamaño de empresa: a mayor tamaño, más
// formalización/recursos y por lo tanto mayor madurez esperada.
const BASE_BY_SIZE = {
  '1 a 5':      46,
  '6 a 20':     55,
  '21 a 50':    63,
  'Más de 50':  71,
};
const BASE_DEFAULT = 56;

// Ajuste leve (+/− puntos) por rubro y área. Refleja dónde cada sector suele estar
// más fuerte o más débil. Acotado a ±5 para no inventar diferencias grandes.
const SECTOR_TILT = {
  'Comercio / retail': { tec: +2, ventas: +4, finanzas: -2 },
  'Servicios':         { tec: +4, ventas: +2, finanzas:  0 },
  'Gastronomía':       { tec: -2, ventas: +2, finanzas: -4 },
  'Salud':             { tec: +2, ventas: -2, finanzas: +2 },
  'Construcción':      { tec: -4, ventas:  0, finanzas: +2 },
  'Manufactura':       { tec:  0, ventas: -2, finanzas: +4 },
  'Otro':              { tec:  0, ventas:  0, finanzas:  0 },
};

// Puntaje de referencia esperado para un área, dado rubro y tamaño. Acotado 20-90.
export function benchmarkFor(areaKey, giro, tamano) {
  const base = BASE_BY_SIZE[tamano] ?? BASE_DEFAULT;
  const tilt = (SECTOR_TILT[giro] || SECTOR_TILT['Otro'])[areaKey] || 0;
  return Math.max(20, Math.min(90, base + tilt));
}

// Factor de "valor en juego": fracción de la facturación anual que la madurez de
// cada área puede mover (techo de referencia). Ventas pesa más (ventas perdidas /
// conversión), luego finanzas (margen / caja) y tecnología (productividad).
export const VALOR_FACTOR = { tec: 0.06, ventas: 0.12, finanzas: 0.08 };
