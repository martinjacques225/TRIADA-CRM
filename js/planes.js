// js/planes.js — Planes de venta y convenios (catálogo de negocio)
// NOTA: en la futura migración multiusuario esto pasa a tabla `planes`/`convenios` por organización.

export const PLANES = [
  { id: 'contado',          nombre: 'Plan Contado',          comision: 66000, color: '#22C55E', desc: 'Pago único $1.199.990 (2x1)',                badge: 'Mayor comisión', badgeType: 'gold', beca: true,  esContado: true  },
  { id: 'credito_12c',      nombre: 'Plan Crédito 12c',      comision: 38000, color: '#3B82F6', desc: 'Matrícula $176.000 + 12 cuotas de $115.000', badge: null,             beca: true,  esContado: false },
  { id: 'credito_13c',      nombre: 'Plan Crédito 13c',      comision: 35000, color: '#6366F1', desc: 'Matrícula $121.000 + 13 cuotas de $121.000', badge: null,             beca: true,  esContado: false },
  { id: 'convenio_contado', nombre: 'Plan Contado Convenio', comision: 60000, color: '#F59E0B', desc: 'Pago único $1.090.000 (2x1)',                badge: 'Convenio',       beca: true,  esContado: true  },
  { id: 'convenio_credito', nombre: 'Plan Crédito Convenio', comision: 33000, color: '#8B5CF6', desc: 'Matrícula $110.000 + 13 cuotas de $110.000', badge: 'Convenio',       beca: true,  esContado: false },
  { id: 'modulo',           nombre: 'Plan Módulo',           comision: 33000, color: '#EC4899', desc: 'Módulo individual $540.000',                 badge: null,             beca: false, esContado: false },
  { id: 'una_persona',      nombre: 'Plan 1 Persona',        comision: 52000, color: '#14B8A6', desc: 'Pago único $715.000',                        badge: null,             beca: false, esContado: true  },
  { id: 'plan_3x1',         nombre: 'Plan 3X1',              comision: 40000, color: '#0EA5E9', desc: 'Matrícula $190.000 + 13 cuotas de $138.000 (3 personas)', badge: '3 personas', beca: true,  esContado: false },
  { id: 'excepcional',      nombre: 'Plan Excepcional',      comision: null,  color: '#EF4444', desc: '$750.000 — solo retención extrema',          badge: 'Extraoficial',   beca: false, esContado: false, extraoficial: true }
];

export const CONVENIOS = [
  'Sindicato de Profesionales Clínica Santa María', 'Sindicato BancoEstado',
  'Sindicato de Profesionales Red-Salud Vitacura', 'Bomberos de Chile',
  'Aprotec', 'Fesumin', 'Sindicato N°1 de Trabajadores Anglo American',
  'Fundación Minera de Chile', 'Sindicato N°1 de trabajadores Minera Escondida',
  'FENASENF', 'Aprojunji', 'Anfumen', 'Tens',
  'Carabineros de Chile', 'ANSOG (Gendarmería)'
];
