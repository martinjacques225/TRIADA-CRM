// modules/informe-ejecutivo/informe.benchmarks.js
// Referencia Tríada de madurez por rubro y tamaño + factores de cuantificación +
// catálogo de servicios recomendados por pilar.
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

// Ajuste leve (+/− puntos) por rubro y pilar. Refleja dónde cada sector suele estar
// más fuerte o más débil. Objetos dispersos: lo no listado vale 0 (acotado a ±5).
const SECTOR_TILT = {
  'Comercio / retail': { tecnologia: +2, ventas: +4, marketing: +3, finanzas: -2, oportunidades: -2 },
  'Servicios':         { tecnologia: +4, ventas: +2, direccion: +2, marketing: +2 },
  'Gastronomía':       { tecnologia: -2, ventas: +2, marketing: +2, finanzas: -4, operacion: -2 },
  'Salud':             { tecnologia: +2, seguridad: +3, ventas: -2, finanzas: +2 },
  'Construcción':      { tecnologia: -4, operacion: +2, finanzas: +2, marketing: -2 },
  'Manufactura':       { operacion: +3, ventas: -2, finanzas: +4, tecnologia: 0 },
  'Otro':              {},
};

// Puntaje de referencia esperado para un pilar, dado rubro y tamaño. Acotado 20-90.
export function benchmarkFor(areaKey, giro, tamano) {
  const base = BASE_BY_SIZE[tamano] ?? BASE_DEFAULT;
  const tilt = (SECTOR_TILT[giro] || SECTOR_TILT['Otro'])[areaKey] || 0;
  return Math.max(20, Math.min(90, base + tilt));
}

// Factor de "valor en juego": fracción de la facturación anual que la madurez de
// cada pilar puede mover (techo de referencia). Ventas y oportunidades perdidas pesan
// más (ingresos directos), luego marketing/finanzas, después la operación y la base.
export const VALOR_FACTOR = {
  ventas:        0.12,
  oportunidades: 0.10,
  marketing:     0.08,
  finanzas:      0.08,
  operacion:     0.06,
  tecnologia:    0.05,
  direccion:     0.05,
  seguridad:     0.03,
};

// ── Recomendaciones inteligentes: servicios Tríada por pilar ──
// Cuando un pilar puntúa bajo, el informe propone estos servicios como remedio.
// El orden refleja prioridad sugerida de implementación.
export const SERVICIOS = {
  direccion:     ['Consultoría Estratégica', 'Transformación Digital', 'Tablero de Indicadores (BI)'],
  operacion:     ['ERP', 'Automatización de Procesos', 'Integración de Sistemas'],
  tecnologia:    ['Digitalización', 'Migración a la Nube', 'Automatización', 'Inteligencia Artificial'],
  ventas:        ['CRM', 'Automatización Comercial', 'Seguimiento Automático', 'IA para Atención de Clientes'],
  marketing:     ['Landing Pages', 'SEO', 'Google Business', 'Campañas Digitales'],
  finanzas:      ['ERP / Gestión Financiera', 'Tableros de Rentabilidad', 'Automatización de Reportes'],
  seguridad:     ['Respaldo en la Nube', 'Gestión de Accesos', 'Auditoría de Seguridad'],
  oportunidades: ['CRM', 'Seguimiento Automático', 'Automatización de Procesos', 'Inteligencia Artificial'],
};
