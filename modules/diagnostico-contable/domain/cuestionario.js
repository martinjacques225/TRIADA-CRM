// modules/diagnostico-contable/domain/cuestionario.js
// CATÁLOGO DEL CUESTIONARIO — Diagnóstico Contable y Tributario.
//
// Este archivo es la CONFIGURACIÓN del instrumento: etapas, preguntas, opciones,
// puntos, pesos y condiciones. Cambiar la metodología es editar acá, no tocar la
// UI ni el motor de puntaje. Todo es data pura, sin DOM y sin Supabase, para
// poder testearlo en node.
//
// INDEPENDIENTE del Diagnóstico 360 (js/utils.js · DIAG_AREAS/DIAG_PREGUNTAS).
// Ni un id, ni una escala, ni un puntaje se comparten entre los dos módulos.
//
// ── Escala de calificación por respuesta (0 a 3) ──
//   3 = condición saludable
//   2 = condición aceptable con observaciones
//   1 = condición débil
//   0 = alerta importante o desconocimiento crítico
//
// ── Pesos ──
//   3 = regularización contable, auditoría IFRS, inscripción CMF, opinión del
//       auditor, control de ingresos adicionales y operaciones relacionadas
//   2 = régimen tributario, hallazgos pendientes, artículo 33 bis y estructura
//       societaria (participación, beneficiarios finales, documentación)
//   1 = moneda base y elementos administrativos secundarios
//   0 = no puntúa (identificación, ruteo, datos de contexto y de dimensionamiento)
//
// Nota sobre la moneda: la moneda elegida NO es mejor ni peor (peso 0). El peso 1
// que la metodología asigna a "moneda base" se aplica a su definición formal y
// consistencia (F3B), que es lo único que habla de control interno.

export const PUNTOS_MAX = 3;

/** Las cinco etapas del levantamiento. La 5 no tiene preguntas: es el resultado. */
export const ETAPAS = [
  { id: 'identificacion', n: 1, label: 'Identificación',        sub: 'Quién es la empresa y quién responde.' },
  { id: 'necesidad',      n: 2, label: 'Necesidad principal',   sub: 'Qué la trae a esta conversación.' },
  { id: 'financiera',     n: 3, label: 'Evaluación financiera', sub: 'Contabilidad, base de preparación y auditoría.' },
  { id: 'tributaria',     n: 4, label: 'Evaluación tributaria', sub: 'Régimen, ingresos, activos y estructura societaria.' },
  { id: 'resultado',      n: 5, label: 'Resultado',             sub: 'Puntaje, alertas y recomendación comercial.' },
];

export const etapaMeta = (id) => ETAPAS.find((e) => e.id === id) || null;
export const etapaPorNumero = (n) => ETAPAS.find((e) => e.n === n) || ETAPAS[0];

// ─────────────────────────────────────────────────────────────────────────────
// Catálogos auxiliares
// ─────────────────────────────────────────────────────────────────────────────

export const INDUSTRIAS = [
  'Agroindustria', 'Alimentos y bebidas', 'Comercio y retail', 'Construcción e inmobiliaria',
  'Educación', 'Energía', 'Forestal', 'Logística y transporte', 'Manufactura industrial',
  'Minería', 'Pesca y acuicultura', 'Salud', 'Servicios financieros',
  'Servicios profesionales', 'Tecnología', 'Turismo y hotelería', 'Otra',
];

export const MONEDAS = [
  { v: 'clp', label: 'Peso chileno (CLP)' },
  { v: 'uf',  label: 'Unidad de Fomento (UF)' },
];

/** Etiqueta legible de una opción, buscando en la pregunta correspondiente. */
export function opcionLabel(preguntaId, valor) {
  const p = preguntaPorId(preguntaId);
  if (!p) return String(valor ?? '');
  const o = (p.opciones || []).find((x) => x.v === valor);
  return o ? o.label : String(valor ?? '');
}

// ─────────────────────────────────────────────────────────────────────────────
// ETAPA 1 · IDENTIFICACIÓN — no puntúa (lo dice la metodología, explícito)
// ─────────────────────────────────────────────────────────────────────────────
export const CAMPOS_IDENTIFICACION = [
  { id: 'razonSocial',        label: 'Razón social',                    tipo: 'texto',    requerido: true, fmt: 'upper', col: 2 },
  { id: 'nombreFantasia',     label: 'Nombre de fantasía',              tipo: 'texto',    fmt: 'upper' },
  { id: 'rut',                label: 'RUT',                             tipo: 'texto',    fmt: 'rut', hint: 'Opcional.' },
  { id: 'actividadEconomica', label: 'Actividad económica',             tipo: 'texto',    col: 2 },
  { id: 'industria',          label: 'Industria',                       tipo: 'select',   opciones: INDUSTRIAS },
  { id: 'trabajadores',       label: 'N.º aproximado de trabajadores',  tipo: 'numero',   min: 0 },
  { id: 'sociedadesGrupo',    label: 'N.º de sociedades del grupo',     tipo: 'numero',   min: 0, hint: 'Incluida esta empresa.' },
  { id: 'entrevistadoNombre', label: 'Nombre del entrevistado',         tipo: 'texto',    fmt: 'upper' },
  { id: 'entrevistadoCargo',  label: 'Cargo',                           tipo: 'texto',    fmt: 'upper' },
  { id: 'entrevistadoEmail',  label: 'Correo',                          tipo: 'texto',    fmt: 'email' },
  { id: 'entrevistadoFono',   label: 'Teléfono',                        tipo: 'texto',    fmt: 'phone' },
  { id: 'ejecutivo',          label: 'Ejecutivo TRIADA',                tipo: 'equipo' },
  { id: 'fecha',              label: 'Fecha',                           tipo: 'fecha',    requerido: true },
  { id: 'observacionesIni',   label: 'Observaciones iniciales',         tipo: 'textarea', col: 2 },
];

// ─────────────────────────────────────────────────────────────────────────────
// PREGUNTAS (etapas 2 a 4)
// ─────────────────────────────────────────────────────────────────────────────
//
// tipo:
//   'unica'      → una opción (radio). Puntúa según `puntos` de la opción.
//   'multiple'   → varias opciones (checkbox). Informativa salvo que se indique.
//   'texto' | 'textarea' | 'numero' | 'moneda' → dato abierto, no puntúa.
//   'inventario' → lista de elementos, cada uno con sub-preguntas (T3).
//   'activos'    → tabla de activos fijos que el ejecutivo va agregando (T4).
//
// `cuando(r)` decide si la pregunta corresponde al recorrido de esta empresa.
// Si devuelve false, la pregunta NO se muestra Y NO entra al denominador del
// puntaje: "Excluir preguntas que no correspondan al recorrido de la empresa".

const esIfrs = (r) => r?.F2 === 'ifrs' || r?.F2 === 'ambos';
const hayAuditoria = (r) => r?.F4 === 'si' || r?.F4 === 'en_proceso';

export const PREGUNTAS = [
  // ══ ETAPA 2 · NECESIDAD PRINCIPAL ══════════════════════════════════════════
  // Orienta la conversación comercial. No puntúa: querer ordenarse no es una falla.
  {
    id: 'N1', etapa: 'necesidad', tipo: 'multiple', peso: 0, requerido: true,
    texto: '¿Cuál es actualmente el principal punto de interés o preocupación de la empresa?',
    ayuda: 'Se puede marcar más de una.',
    opciones: [
      { v: 'financiera',  label: 'Situación financiera' },
      { v: 'tributaria',  label: 'Situación tributaria' },
      { v: 'auditoria',   label: 'Auditoría y validación de estados financieros' },
      { v: 'integral',    label: 'Diagnóstico financiero y tributario integral' },
      { v: 'preventiva',  label: 'Revisión preventiva' },
      { v: 'otro',        label: 'Otro', abre: 'N1_otro' },
    ],
  },
  { id: 'N1_otro', etapa: 'necesidad', tipo: 'texto', peso: 0, texto: '¿Cuál?', oculta: true,
    cuando: (r) => Array.isArray(r?.N1) && r.N1.includes('otro') },

  {
    id: 'N2', etapa: 'necesidad', tipo: 'unica', peso: 0, requerido: true,
    texto: '¿Qué situación motivó esta revisión?',
    opciones: [
      { v: 'crecimiento',    label: 'Crecimiento de la empresa' },
      { v: 'societarios',    label: 'Cambios societarios' },
      { v: 'obs_auditoria',  label: 'Observaciones de auditoría' },
      { v: 'fiscalizacion',  label: 'Fiscalización o requerimiento' },
      { v: 'financiamiento', label: 'Búsqueda de financiamiento' },
      { v: 'inversionistas', label: 'Incorporación de inversionistas' },
      { v: 'compraventa',    label: 'Compra o venta de la empresa' },
      { v: 'reorganizacion', label: 'Reorganización empresarial' },
      { v: 'preventiva',     label: 'Revisión preventiva' },
      { v: 'otro',           label: 'Otro', abre: 'N2_otro' },
    ],
  },
  { id: 'N2_otro', etapa: 'necesidad', tipo: 'texto', peso: 0, texto: '¿Cuál?', oculta: true,
    cuando: (r) => r?.N2 === 'otro' },

  // ══ ETAPA 3 · EVALUACIÓN FINANCIERA ════════════════════════════════════════
  {
    id: 'F1', etapa: 'financiera', bloque: 'Situación contable', tipo: 'unica', peso: 3, requerido: true,
    texto: '¿La contabilidad de la empresa se encuentra regularizada y actualizada?',
    opciones: [
      { v: 'actualizada',  label: 'Sí, completamente actualizada',                puntos: 3 },
      { v: 'dif_menores',  label: 'Está actualizada, pero existen diferencias menores', puntos: 2 },
      { v: 'atrasos',      label: 'Presenta atrasos o información pendiente',      puntos: 1 },
      { v: 'no_regular',   label: 'No se encuentra regularizada',                  puntos: 0 },
      { v: 'no_se',        label: 'No lo sé',                                      puntos: 0, desconocido: true },
    ],
  },
  {
    // Peso 0: elegir IFRS o balance tributario no es bueno ni malo. Lo que hace
    // esta respuesta es DEFINIR EL RECORRIDO (abre la rama de auditoría) y el
    // precio inicial. Un "No lo sé" acá no resta puntos, pero sí deja el precio
    // sujeto a revisión de antecedentes y cuenta como respuesta desconocida.
    id: 'F2', etapa: 'financiera', bloque: 'Base de preparación', tipo: 'unica', peso: 0, requerido: true,
    texto: '¿Cómo prepara actualmente la empresa su información financiera?',
    ayuda: 'Esta respuesta determina el recorrido posterior y el precio inicial.',
    opciones: [
      { v: 'ifrs',        label: 'Bajo normas IFRS/NIIF' },
      { v: 'tributario',  label: 'Mediante balance tributario' },
      { v: 'ambos',       label: 'Utiliza ambos según el propósito' },
      { v: 'no_se',       label: 'No lo sé', desconocido: true },
    ],
  },
  {
    id: 'F3', etapa: 'financiera', bloque: 'Moneda de las operaciones', tipo: 'unica', peso: 0,
    texto: '¿Cuál es la moneda base de las operaciones de la empresa?',
    opciones: [
      { v: 'clp',   label: 'Peso chileno' },
      { v: 'usd',   label: 'Dólar estadounidense' },
      { v: 'eur',   label: 'Euro' },
      { v: 'uf',    label: 'Unidad de Fomento' },
      { v: 'otra',  label: 'Otra', abre: 'F3_otra' },
      { v: 'no_se', label: 'No lo sé', desconocido: true },
    ],
  },
  { id: 'F3_otra', etapa: 'financiera', tipo: 'texto', peso: 0, texto: '¿Cuál?', oculta: true,
    cuando: (r) => r?.F3 === 'otra' },
  {
    id: 'F3B', etapa: 'financiera', bloque: 'Moneda de las operaciones', tipo: 'unica', peso: 1,
    texto: '¿Esta moneda se encuentra formalmente definida y se aplica consistentemente?',
    condicion: 'Solo si ya se respondió la moneda base (F3).',
    cuando: (r) => !!r?.F3,
    opciones: [
      { v: 'definida_doc',   label: 'Sí, está definida y documentada',                    puntos: 3 },
      { v: 'definida_sindoc', label: 'Está definida, pero no existe documentación suficiente', puntos: 2 },
      { v: 'inconsistente',  label: 'Existen inconsistencias',                            puntos: 1 },
      { v: 'no_se',          label: 'No lo sé',                                           puntos: 0, desconocido: true },
    ],
  },

  // ── Rama condicional IFRS ──
  {
    id: 'F4', etapa: 'financiera', bloque: 'Auditoría externa', tipo: 'unica', peso: 3, requerido: true,
    texto: '¿Los estados financieros preparados bajo IFRS cuentan con auditoría externa?',
    condicion: 'Solo si la empresa prepara bajo IFRS o usa ambos criterios.',
    cuando: esIfrs,
    opciones: [
      { v: 'si',         label: 'Sí',                       puntos: 3 },
      { v: 'en_proceso', label: 'La auditoría está en proceso', puntos: 2 },
      { v: 'no',         label: 'No',                       puntos: 0 },
      { v: 'no_se',      label: 'No lo sé',                 puntos: 0, desconocido: true },
    ],
  },
  {
    id: 'F5', etapa: 'financiera', bloque: 'Auditoría externa', tipo: 'texto', peso: 0,
    texto: '¿Qué empresa o profesional realiza actualmente la auditoría externa?',
    ayuda: 'Antecedente para la revisión de Sebastián. No afecta el puntaje.',
    condicion: 'Solo bajo IFRS y con auditoría contratada o en proceso.',
    cuando: (r) => esIfrs(r) && hayAuditoria(r),
  },
  {
    id: 'F6', etapa: 'financiera', bloque: 'Auditoría externa', tipo: 'unica', peso: 3,
    texto: '¿La empresa que realiza la auditoría está inscrita en la Comisión para el Mercado Financiero (CMF)?',
    ayuda: 'Si la respuesta es "No" o "No lo sé", queda como antecedente a validar; no es una conclusión sobre la validez del trabajo.',
    condicion: 'Solo bajo IFRS y con auditoría contratada o en proceso.',
    cuando: (r) => esIfrs(r) && hayAuditoria(r),
    opciones: [
      { v: 'si',          label: 'Sí',                            puntos: 3 },
      { v: 'verificando', label: 'La inscripción se está verificando', puntos: 2 },
      { v: 'no',          label: 'No',                            puntos: 0 },
      { v: 'no_se',       label: 'No lo sé',                      puntos: 0, desconocido: true },
    ],
  },
  {
    id: 'F7', etapa: 'financiera', bloque: 'Auditoría externa', tipo: 'unica', peso: 3,
    texto: '¿Cuál fue la última opinión emitida por el auditor externo?',
    condicion: 'Solo bajo IFRS y con auditoría contratada o en proceso.',
    cuando: (r) => esIfrs(r) && hayAuditoria(r),
    opciones: [
      { v: 'sin_salvedades', label: 'Opinión sin salvedades', puntos: 3,
        ayuda: 'El auditor concluye que los estados financieros están razonablemente presentados.' },
      { v: 'con_salvedades', label: 'Opinión con salvedades', puntos: 2,
        ayuda: 'Razonables, salvo por materias puntuales que el auditor identifica.' },
      { v: 'adversa',        label: 'Opinión adversa',        puntos: 0,
        ayuda: 'El auditor concluye que los estados financieros NO están razonablemente presentados.' },
      { v: 'abstencion',     label: 'Abstención de opinión',  puntos: 0,
        ayuda: 'El auditor no pudo obtener evidencia suficiente para pronunciarse.' },
      { v: 'sin_opinion',    label: 'Todavía no existe una opinión', puntos: 1,
        ayuda: 'El trabajo aún no concluye o es el primer período auditado.' },
      { v: 'no_se',          label: 'No lo sé',               puntos: 0, desconocido: true },
    ],
  },
  {
    id: 'F8', etapa: 'financiera', bloque: 'Auditoría externa', tipo: 'unica', peso: 2,
    texto: '¿Existen observaciones o hallazgos pendientes de auditorías anteriores?',
    condicion: 'Solo si la empresa prepara bajo IFRS o usa ambos criterios.',
    cuando: esIfrs,
    opciones: [
      { v: 'no_existen',   label: 'No existen',                              puntos: 3 },
      { v: 'resueltos',    label: 'Existieron, pero fueron resueltos',       puntos: 3 },
      { v: 'con_plan',     label: 'Existen y cuentan con un plan de corrección', puntos: 2 },
      { v: 'sin_plan',     label: 'Existen y no cuentan con un plan de corrección', puntos: 0 },
      { v: 'no_se',        label: 'No lo sé',                                puntos: 0, desconocido: true },
    ],
  },

  // ══ ETAPA 4 · EVALUACIÓN TRIBUTARIA ════════════════════════════════════════
  {
    id: 'T1', etapa: 'tributaria', bloque: 'Régimen tributario', tipo: 'unica', peso: 2, requerido: true,
    texto: '¿Cuál es el régimen tributario actual de la empresa?',
    ayuda: 'Ningún régimen es bueno o malo por sí solo. La alerta aparece cuando se desconoce o no ha sido revisado.',
    opciones: [
      { v: 'general_14a',  label: 'Régimen General, artículo 14 A', puntos: 3 },
      { v: 'propyme_gen',  label: 'Pro Pyme General',               puntos: 3 },
      { v: 'propyme_tra',  label: 'Pro Pyme Transparente',          puntos: 3 },
      { v: 'presunta',     label: 'Renta presunta',                 puntos: 3 },
      { v: 'otro',         label: 'Otro',                           puntos: 2, abre: 'T1_otro' },
      { v: 'no_se',        label: 'No lo sé',                       puntos: 0, desconocido: true },
    ],
  },
  { id: 'T1_otro', etapa: 'tributaria', tipo: 'texto', peso: 0, texto: '¿Cuál?', oculta: true,
    cuando: (r) => r?.T1 === 'otro' },

  // ── T2 · Facturación: dimensiona tamaño y complejidad. No baja el puntaje. ──
  { id: 'T2_moneda',   etapa: 'tributaria', bloque: 'Facturación', tipo: 'unica', peso: 0,
    texto: 'Moneda en que se declara la facturación',
    opciones: MONEDAS.map((m) => ({ v: m.v, label: m.label })) },
  { id: 'T2_ultimo',   etapa: 'tributaria', bloque: 'Facturación', tipo: 'moneda', peso: 0,
    texto: 'Facturación del último año' },
  { id: 'T2_promedio', etapa: 'tributaria', bloque: 'Facturación', tipo: 'moneda', peso: 0,
    texto: 'Facturación promedio de los últimos tres años' },
  {
    // Peso 1 (elemento administrativo): crecer o decrecer no habla de salud
    // contable; no tener la información consolidada, sí.
    id: 'T2_evolucion', etapa: 'tributaria', bloque: 'Facturación', tipo: 'unica', peso: 1,
    texto: 'Evolución de la facturación',
    opciones: [
      { v: 'aumento',    label: 'Aumento considerable',              puntos: 3 },
      { v: 'estable',    label: 'Relativamente estable',             puntos: 3 },
      { v: 'disminucion', label: 'Disminución considerable',         puntos: 3 },
      { v: 'sin_info',   label: 'No existe información consolidada', puntos: 1 },
      { v: 'no_se',      label: 'No lo sé',                          puntos: 0, desconocido: true },
    ],
  },

  // ── T3 · Otros ingresos e inversiones ──
  // Tener inversiones NO es negativo. El riesgo aparece cuando no están
  // contabilizadas, declaradas o respaldadas. Por eso el puntaje no sale de la
  // selección sino del CONTROL declarado sobre cada elemento (ver puntaje.js).
  {
    id: 'T3', etapa: 'tributaria', bloque: 'Otros ingresos e inversiones', tipo: 'inventario', peso: 3, requerido: true,
    texto: 'Además de su actividad principal, ¿la empresa mantiene inversiones o recibe ingresos provenientes de otras fuentes?',
    ayuda: 'Marca lo que corresponda; por cada elemento se piden los antecedentes de control.',
    opciones: [
      { v: 'fondos_mutuos', label: 'Fondos mutuos' },
      { v: 'deposito',      label: 'Depósitos a plazo' },
      { v: 'cripto',        label: 'Criptomonedas' },
      { v: 'acciones',      label: 'Acciones o inversiones en bolsa' },
      { v: 'inmuebles',     label: 'Bienes raíces' },
      { v: 'sociedades',    label: 'Participación en otras sociedades' },
      { v: 'extranjeras',   label: 'Inversiones extranjeras' },
      { v: 'otros',         label: 'Otros ingresos' },
      { v: 'ninguna',       label: 'No posee inversiones ni ingresos adicionales', exclusiva: true, puntos: 3 },
      { v: 'no_se',         label: 'No lo sé', exclusiva: true, puntos: 0, desconocido: true },
    ],
    // Sub-preguntas por cada elemento marcado. Las tres últimas son las que puntúan.
    subcampos: [
      { id: 'monto',     label: 'Monto aproximado',                 tipo: 'moneda' },
      { id: 'renta',     label: 'Ingresos o rentabilidad del último año', tipo: 'moneda' },
      { id: 'titular',   label: 'Titular',  tipo: 'unica', opciones: [
        { v: 'empresa',     label: 'La empresa' },
        { v: 'relacionada', label: 'Sociedad relacionada' },
        { v: 'socio',       label: 'Un socio' },
        { v: 'no_se',       label: 'No lo sé', desconocido: true },
      ] },
      { id: 'contabilizado', label: '¿Está contabilizado?',                  tipo: 'control', puntua: true },
      { id: 'declarado',     label: '¿Está incorporado en las declaraciones tributarias?', tipo: 'control', puntua: true },
      { id: 'respaldo',      label: '¿Cuenta con documentación de respaldo?', tipo: 'control', puntua: true },
    ],
  },

  // ── T4 · Activos fijos: dimensiona y habilita el 33 bis. No puntúa. ──
  {
    id: 'T4', etapa: 'tributaria', bloque: 'Inversiones en activos fijos', tipo: 'unica', peso: 0,
    texto: '¿La empresa ha realizado inversiones importantes en activos fijos durante los últimos tres años?',
    opciones: [
      { v: 'si',    label: 'Sí' },
      { v: 'no',    label: 'No' },
      { v: 'no_se', label: 'No lo sé', desconocido: true },
    ],
  },
  {
    id: 'T4_detalle', etapa: 'tributaria', bloque: 'Inversiones en activos fijos', tipo: 'activos', peso: 0,
    texto: 'Detalle de las inversiones',
    condicion: 'Solo si hubo inversiones importantes en activos fijos (T4 = Sí).',
    cuando: (r) => r?.T4 === 'si',
    columnas: [
      { id: 'tipo',       label: 'Tipo de activo',   tipo: 'texto' },
      { id: 'anio',       label: 'Año',              tipo: 'numero', min: 1900, max: 2100 },
      { id: 'valor',      label: 'Valor aproximado', tipo: 'moneda' },
      { id: 'condicion',  label: 'Condición',        tipo: 'select', opciones: [
        { v: 'nuevo', label: 'Nuevo' }, { v: 'usado', label: 'Usado' }] },
      { id: 'via',        label: 'Vía',              tipo: 'select', opciones: [
        { v: 'compra', label: 'Compra' }, { v: 'construccion', label: 'Construcción' }, { v: 'leasing', label: 'Leasing' }] },
      { id: 'operaciones', label: 'N.º de operaciones', tipo: 'numero', min: 0 },
    ],
  },
  {
    id: 'T5', etapa: 'tributaria', bloque: 'Inversiones en activos fijos', tipo: 'unica', peso: 2,
    texto: '¿La empresa evaluó o utilizó el crédito tributario por inversiones en activos fijos del artículo 33 bis?',
    ayuda: 'El artículo 33 bis de la Ley de la Renta permite un crédito contra el impuesto de primera categoría por ciertas inversiones en activo fijo. Si aplica, y en qué porcentaje, debe evaluarlo un especialista.',
    condicion: 'Solo si hubo inversiones importantes en activos fijos (T4 = Sí).',
    cuando: (r) => r?.T4 === 'si',
    opciones: [
      { v: 'usado_respaldo', label: 'Fue utilizado y cuenta con respaldo',                 puntos: 3 },
      { v: 'evaluado_no',    label: 'Fue evaluado, pero no correspondía utilizarlo',       puntos: 3 },
      { v: 'quizas_no',      label: 'Existían inversiones, pero posiblemente no fue utilizado', puntos: 1 },
      { v: 'nunca',          label: 'Nunca se ha evaluado',                                puntos: 0 },
      { v: 'no_se',          label: 'No lo sé',                                            puntos: 0, desconocido: true },
    ],
  },

  // ── T6 a T8 · Estructura societaria y operaciones relacionadas ──
  {
    id: 'T6', etapa: 'tributaria', bloque: 'Estructura societaria', tipo: 'unica', peso: 1, requerido: true,
    texto: '¿Cuál es la figura societaria de la empresa?',
    opciones: [
      { v: 'spa',       label: 'SpA',                                  puntos: 3 },
      { v: 'sa_abierta', label: 'Sociedad Anónima abierta',            puntos: 3 },
      { v: 'sa_cerrada', label: 'Sociedad Anónima cerrada',            puntos: 3 },
      { v: 'ltda',      label: 'Sociedad de Responsabilidad Limitada', puntos: 3 },
      { v: 'otra',      label: 'Otra',                                 puntos: 2, abre: 'T6_otra' },
      { v: 'no_se',     label: 'No lo sé',                             puntos: 0, desconocido: true },
    ],
  },
  { id: 'T6_otra', etapa: 'tributaria', tipo: 'texto', peso: 0, texto: '¿Cuál?', oculta: true,
    cuando: (r) => r?.T6 === 'otra' },
  {
    id: 'T7', etapa: 'tributaria', bloque: 'Estructura societaria', tipo: 'unica', peso: 1,
    texto: '¿Cómo están constituidos los socios o accionistas?',
    opciones: [
      { v: 'naturales',   label: 'Personas naturales',    puntos: 3 },
      { v: 'juridicas',   label: 'Personas jurídicas',    puntos: 3 },
      { v: 'chilenas',    label: 'Sociedades chilenas',   puntos: 3 },
      { v: 'extranjeras', label: 'Sociedades extranjeras', puntos: 2 },
      { v: 'mixta',       label: 'Estructura mixta',      puntos: 2 },
      { v: 'no_se',       label: 'No lo sé',              puntos: 0, desconocido: true },
    ],
  },
  {
    id: 'T7A', etapa: 'tributaria', bloque: 'Estructura societaria', tipo: 'unica', peso: 2,
    texto: '¿Se conoce el porcentaje de participación de cada socio?',
    opciones: [
      { v: 'si_doc',  label: 'Sí, y está documentado',      puntos: 3 },
      { v: 'si',      label: 'Sí, pero sin documentación formal', puntos: 2 },
      { v: 'parcial', label: 'Solo parcialmente',           puntos: 1 },
      { v: 'no',      label: 'No',                          puntos: 0 },
      { v: 'no_se',   label: 'No lo sé',                    puntos: 0, desconocido: true },
    ],
  },
  {
    id: 'T7B', etapa: 'tributaria', bloque: 'Estructura societaria', tipo: 'unica', peso: 2,
    texto: '¿Están identificados los beneficiarios finales?',
    ayuda: 'Personas naturales que en último término controlan la sociedad.',
    opciones: [
      { v: 'si_doc',  label: 'Sí, y están documentados',    puntos: 3 },
      { v: 'si',      label: 'Sí, pero sin documentación formal', puntos: 2 },
      { v: 'parcial', label: 'Solo parcialmente',           puntos: 1 },
      { v: 'no',      label: 'No',                          puntos: 0 },
      { v: 'no_se',   label: 'No lo sé',                    puntos: 0, desconocido: true },
    ],
  },
  {
    id: 'T7C', etapa: 'tributaria', bloque: 'Estructura societaria', tipo: 'unica', peso: 0,
    texto: '¿Existen empresas relacionadas?',
    opciones: [
      { v: 'si',    label: 'Sí' },
      { v: 'no',    label: 'No' },
      { v: 'no_se', label: 'No lo sé', desconocido: true },
    ],
  },
  {
    id: 'T7D', etapa: 'tributaria', bloque: 'Estructura societaria', tipo: 'unica', peso: 2,
    texto: '¿La estructura societaria está actualizada y documentada?',
    opciones: [
      { v: 'si',      label: 'Sí, actualizada y documentada',      puntos: 3 },
      { v: 'parcial', label: 'Documentada, pero no actualizada',   puntos: 2 },
      { v: 'debil',   label: 'Sin documentación suficiente',       puntos: 1 },
      { v: 'no',      label: 'No está documentada',                puntos: 0 },
      { v: 'no_se',   label: 'No lo sé',                           puntos: 0, desconocido: true },
    ],
  },
  {
    id: 'T8', etapa: 'tributaria', bloque: 'Operaciones relacionadas', tipo: 'unica', peso: 3, requerido: true,
    texto: '¿Existen préstamos, pagos, servicios u otras operaciones entre la empresa, sus socios o sociedades relacionadas?',
    opciones: [
      { v: 'no_existen',  label: 'No existen',                                  puntos: 3 },
      { v: 'documentadas', label: 'Sí, y están completamente documentadas',     puntos: 3 },
      { v: 'parcial',     label: 'Sí, pero la documentación es parcial',        puntos: 1 },
      { v: 'sin_respaldo', label: 'Sí, y no cuentan con respaldo suficiente',   puntos: 0 },
      { v: 'no_se',       label: 'No lo sé',                                    puntos: 0, desconocido: true },
    ],
  },
];

const _porId = Object.fromEntries(PREGUNTAS.map((p) => [p.id, p]));
export const preguntaPorId = (id) => _porId[id] || null;

/** Preguntas de una etapa que corresponden a este recorrido, en orden. */
export function preguntasDeEtapa(etapaId, respuestas = {}) {
  return PREGUNTAS.filter((p) => p.etapa === etapaId && aplica(p, respuestas));
}

/** ¿Esta pregunta corresponde al recorrido de esta empresa? */
export function aplica(pregunta, respuestas = {}) {
  if (!pregunta) return false;
  if (typeof pregunta.cuando !== 'function') return true;
  return !!pregunta.cuando(respuestas);
}

/** Todas las preguntas aplicables (etapas 2 a 4), en orden de catálogo. */
export function preguntasAplicables(respuestas = {}) {
  return PREGUNTAS.filter((p) => aplica(p, respuestas));
}

/** Bloques (subtítulos) de una etapa, con sus preguntas ya filtradas. */
export function bloquesDeEtapa(etapaId, respuestas = {}) {
  const out = [];
  preguntasDeEtapa(etapaId, respuestas).forEach((p) => {
    if (p.oculta) return;                    // se dibuja pegada a la que la abre
    const label = p.bloque || '';
    const ultimo = out[out.length - 1];
    if (ultimo && ultimo.label === label) ultimo.preguntas.push(p);
    else out.push({ label, preguntas: [p] });
  });
  return out;
}

/**
 * ¿Está respondida? Vale para todos los tipos.
 * OJO: `0` es una respuesta válida en los campos numéricos (facturación cero).
 */
export function respondida(pregunta, respuestas = {}) {
  const v = respuestas?.[pregunta.id];
  if (v === null || v === undefined || v === '') return false;
  if (Array.isArray(v)) return v.length > 0;
  if (pregunta.tipo === 'inventario') return Array.isArray(v?.seleccion) && v.seleccion.length > 0;
  if (pregunta.tipo === 'activos') return Array.isArray(v) && v.length > 0;
  return true;
}

/** Requeridas de una etapa que siguen sin respuesta (bloquean "Siguiente"). */
export function faltantesDeEtapa(etapaId, respuestas = {}) {
  return preguntasDeEtapa(etapaId, respuestas)
    .filter((p) => p.requerido && !respondida(p, respuestas))
    .map((p) => p.id);
}
