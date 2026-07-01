// modules/financiero/domain/analisis.js
// ── DOMINIO · Módulo Financiero trIA (M2 "Lector IA") ────────────────────────
// "Dirigir en vez de llamar" (SIN API): el CRM NO manda tus datos a ninguna API.
// Genera un prompt-director a medida que TÚ llevas a tu chat (Gemini/Claude) con
// tus documentos; la IA devuelve un JSON con contrato fijo; el CRM lo parsea y
// renderiza el Informe Financiero con la marca Tríada.
// Puro: sin DOM, sin red, sin Supabase → testeable en node.

// Método Tríada horneado en cada prompt (rigor, no la marca de un cliente).
const METODO =
  'Método Tríada (respétalo): análisis ORDENADO, jerárquico y accionable (nada a medias); '
  + 'lenguaje claro para un dueño de PYME (explica los tecnicismos); rigor con las cifras '
  + '(no inventes: si un dato falta, decláralo como supuesto); foco en decisiones, no solo en describir. '
  + 'Contexto: Chile — moneda CLP, IVA 19%, F29 del SII, PPM, cotizaciones previsionales (AFP/salud), '
  + 'gratificación legal. Español de Chile, tono cercano y profesional.';

// ── Los 3 tipos de análisis ──────────────────────────────────────────────────
// `docs`   = documentos sugeridos para el modo "adjuntar".
// `cifras` = campos del formulario para el modo "tipear" ({ id, label, hint? }).
// `foco`   = qué debe analizar la IA (se inyecta en el prompt).
export const FIN_TIPOS = [
  {
    id: 'cierre', label: 'Cierre de mes', icon: '📊',
    desc: 'Resultado del mes: ingresos, costos, margen y evolución de caja.',
    docs: 'Estado de Resultados (o mayor de resultados), balance de comprobación/tributario, '
        + 'cartola bancaria del mes y resumen de ventas y compras.',
    cifras: [
      { id: 'ingresos',        label: 'Ingresos por ventas (neto)', hint: 'Ventas del mes sin IVA' },
      { id: 'costo_ventas',    label: 'Costo de ventas',            hint: 'Costo directo de lo vendido' },
      { id: 'gastos_oper',     label: 'Gastos operacionales',       hint: 'Arriendo, servicios, etc.' },
      { id: 'remuneraciones',  label: 'Remuneraciones (costo empresa)', hint: 'Sueldos + leyes sociales' },
      { id: 'otros_ingresos',  label: 'Otros ingresos',             hint: 'Opcional' },
      { id: 'otros_gastos',    label: 'Otros gastos',               hint: 'Opcional' },
      { id: 'caja_inicial',    label: 'Saldo de caja inicial',      hint: 'Al comenzar el mes' },
      { id: 'caja_final',      label: 'Saldo de caja final',        hint: 'Al cerrar el mes' },
    ],
    foco: 'Calcula y explica: margen bruto, margen operacional y resultado neto del mes (monto y %); '
        + 'estructura de costos (qué pesa más); punto de equilibrio aproximado; evolución y salud de la caja; '
        + 'y las 3 alertas de rentabilidad más importantes con su acción concreta.',
  },
  {
    id: 'iva', label: 'IVA / F29', icon: '🧾',
    desc: 'Débito vs crédito fiscal, IVA a pagar o remanente, PPM y carga tributaria.',
    docs: 'Formulario 29 (F29) del período, libro de ventas y libro de compras, o el '
        + 'Registro de Compras y Ventas (RCV) del SII.',
    cifras: [
      { id: 'ventas_netas',   label: 'Ventas netas del período', hint: 'Base afecta a IVA' },
      { id: 'iva_debito',     label: 'IVA débito fiscal',        hint: '19% de las ventas' },
      { id: 'compras_netas',  label: 'Compras netas del período', hint: 'Base con derecho a crédito' },
      { id: 'iva_credito',    label: 'IVA crédito fiscal',       hint: '19% de las compras' },
      { id: 'remanente_ant',  label: 'Remanente de crédito anterior', hint: 'Opcional' },
      { id: 'ppm',            label: 'PPM del período',          hint: 'Pago provisional mensual' },
      { id: 'retenciones',    label: 'Retenciones (2ª categoría)', hint: 'Opcional' },
    ],
    foco: 'Determina el IVA a pagar o el remanente de crédito fiscal; compara débito vs crédito y explica la '
        + 'proporción; evalúa el PPM y la carga tributaria del mes; detecta señales de riesgo de cumplimiento '
        + 'ante el SII (desbalances, caídas de ventas, crédito inusual); y entrega alertas con acción.',
  },
  {
    id: 'remuneraciones', label: 'Remuneraciones', icon: '👥',
    desc: 'Costo total de sueldos (costo empresa), carga previsional y costo por trabajador.',
    docs: 'Liquidaciones de sueldo del mes, libro de remuneraciones y la planilla de cotizaciones '
        + 'previsionales (Previred).',
    cifras: [
      { id: 'total_haberes',   label: 'Total haberes (imponible + no imponible)', hint: 'Suma de sueldos brutos' },
      { id: 'sueldo_base',     label: 'Sueldos base (total)',     hint: 'Opcional' },
      { id: 'gratificaciones', label: 'Gratificaciones',          hint: 'Legal o contractual' },
      { id: 'cotiz_prev',      label: 'Cotizaciones previsionales (AFP)', hint: 'Descuento del trabajador' },
      { id: 'cotiz_salud',     label: 'Cotizaciones de salud',    hint: 'Fonasa / Isapre' },
      { id: 'impuesto_unico',  label: 'Impuesto único (2ª cat.)', hint: 'Opcional' },
      { id: 'total_liquido',   label: 'Total líquido pagado',     hint: 'Lo que recibe el equipo' },
      { id: 'num_trab',        label: 'N° de trabajadores',       hint: 'Dotación del mes' },
    ],
    foco: 'Calcula el costo empresa total de remuneraciones (incluyendo aportes del empleador); la carga '
        + 'previsional y de salud; el costo promedio por trabajador; y, si hay ingresos disponibles, la '
        + 'proporción de remuneraciones sobre ventas. Revisa topes imponibles y entrega alertas laborales con acción.',
  },
];

export const findTipo = (id) => FIN_TIPOS.find((t) => t.id === id) || FIN_TIPOS[0];

// La IA recomendada para leer documentos largos (contexto gigante). El usuario
// igual puede usar Claude; el prompt sirve para ambas.
export const LECTOR = { id: 'google', label: 'Gemini', icon: '🔵', url: 'https://gemini.google.com/app',
  nota: 'Recomendado para leer documentos (contexto amplio). También sirve Claude.' };

// ── Contrato de salida (lo que le pedimos a la IA que devuelva) ───────────────
// Es la estructura que el Informe Financiero sabe renderizar. Se documenta dentro
// del prompt para que la IA la respete al pie de la letra.
export const REPORT_SHAPE = `{
  "titulo": "string — título del informe (ej: 'Cierre de mes · Junio 2026')",
  "periodo": "string — período analizado",
  "moneda": "CLP",
  "resumen_ejecutivo": "string — 2 a 3 párrafos, claros, para el dueño del negocio",
  "salud": { "nivel": "critico | alerta | estable | optimo", "puntaje": 0-100, "titular": "string — una frase" },
  "indicadores": [
    { "nombre": "string", "valor": "string — con formato (ej: '$ 3.450.000' o '32%')",
      "señal": "positivo | neutro | negativo", "comentario": "string — breve, opcional" }
  ],
  "hallazgos":       [ { "titulo": "string", "detalle": "string", "severidad": "alta | media | baja" } ],
  "riesgos":         [ { "titulo": "string", "detalle": "string", "mitigacion": "string — opcional" } ],
  "recomendaciones": [ { "accion": "string", "impacto": "string", "prioridad": "alta | media | baja" } ],
  "proyeccion": "string — qué esperar el próximo mes y qué vigilar (opcional)"
}`;

function _datosBlock(modo, cifras, tipo) {
  if (modo === 'cifras') {
    const filas = (tipo.cifras || [])
      .map((c) => {
        const v = cifras?.[c.id];
        return (v === undefined || v === null || v === '') ? null : `- ${c.label}: ${v}`;
      })
      .filter(Boolean);
    return filas.length
      ? `DATOS DEL PERÍODO (tipeados por el usuario, en CLP salvo que se indique):\n${filas.join('\n')}\n`
      : 'DATOS DEL PERÍODO: (el usuario no tipeó cifras; pídelas o trabaja con supuestos declarados).\n';
  }
  // modo documentos
  return `DOCUMENTOS ADJUNTOS: el usuario adjuntó en este mismo chat los archivos del período `
       + `(${tipo.docs}). Analízalos directamente. Si algún dato no aparece, decláralo como supuesto.\n`;
}

function _ctxBlock(contexto) {
  const c = (contexto || '').trim();
  return c ? `\nCONTEXTO DEL NEGOCIO (rubro / tamaño / notas):\n${c}\n` : '';
}

/**
 * Prompt-director para el análisis financiero. Puro.
 * @param {{tipo?:string, periodo?:string, contexto?:string, modo?:'documentos'|'cifras', cifras?:object}} brief
 */
export function buildFinancePrompt(brief = {}) {
  const tipo = findTipo(brief.tipo);
  const periodo = (brief.periodo || '').trim() || '(indica el período)';
  const modo = brief.modo === 'cifras' ? 'cifras' : 'documentos';
  return `Eres un analista financiero senior de Tríada (consultora chilena), experto en PYMES.
Vas a producir un informe de "${tipo.label}" para el período ${periodo}.

${METODO}

${_datosBlock(modo, brief.cifras, tipo)}${_ctxBlock(brief.contexto)}
QUÉ ANALIZAR:
${tipo.foco}

FORMATO DE SALIDA — OBLIGATORIO:
Responde ÚNICAMENTE con un bloque de código JSON válido (empieza en \`\`\`json y termina en \`\`\`),
sin texto antes ni después. Respeta exactamente esta estructura (no agregues ni quites claves de primer nivel):
\`\`\`json
${REPORT_SHAPE}
\`\`\`
Reglas: montos en pesos chilenos con separador de miles; los porcentajes con "%"; entre 4 y 8 indicadores;
entre 2 y 5 hallazgos, riesgos y recomendaciones; usa "señal"/"severidad"/"prioridad" solo con los valores permitidos.`;
}

// ── Parser tolerante de la respuesta de la IA ────────────────────────────────
const _NIVELES = new Set(['critico', 'alerta', 'estable', 'optimo']);
const _SEÑAL   = new Set(['positivo', 'neutro', 'negativo']);
const _SEV     = new Set(['alta', 'media', 'baja']);

const _str = (v) => (v === undefined || v === null) ? '' : String(v);
const _arr = (v) => Array.isArray(v) ? v : [];
function _clampPuntaje(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return null;
  return Math.max(0, Math.min(100, Math.round(x)));
}
function _oneOf(v, set, fallback) {
  const s = _str(v).toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, ''); // 'crítico' → 'critico'
  return set.has(s) ? s : fallback;
}

/**
 * Extrae el objeto JSON de un texto que puede venir con fences ```json, con
 * texto alrededor, o con comas colgantes. Puro. No lanza.
 * @returns {{ ok:true, data:object } | { ok:false, error:string }}
 */
export function extractJson(text) {
  const raw = _str(text).trim();
  if (!raw) return { ok: false, error: 'No hay texto para analizar.' };

  // 1) Contenido de un bloque de código ```json … ``` o ``` … ``` (el más largo).
  let candidate = null;
  const fences = [...raw.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map((m) => m[1].trim());
  if (fences.length) candidate = fences.sort((a, b) => b.length - a.length)[0];

  // 2) Si no hubo fence, tomar del primer "{" al último "}".
  if (!candidate) {
    const i = raw.indexOf('{'), j = raw.lastIndexOf('}');
    if (i === -1 || j === -1 || j < i) return { ok: false, error: 'No se encontró un objeto JSON en la respuesta.' };
    candidate = raw.slice(i, j + 1);
  }

  const tries = [
    candidate,
    candidate.replace(/,\s*([}\]])/g, '$1'),        // quita comas colgantes
    candidate.replace(/[“”]/g, '"'),      // comillas “tipográficas” → "
  ];
  for (const t of tries) {
    try {
      const obj = JSON.parse(t);
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) return { ok: true, data: obj };
    } catch (_) { /* siguiente intento */ }
  }
  return { ok: false, error: 'La respuesta no es un JSON válido. Revisa que hayas copiado el bloque completo.' };
}

/**
 * Normaliza un objeto arbitrario al shape del informe, con defensas: asegura
 * arrays, recorta enums a valores válidos, todo string. Puro. Siempre retorna
 * un informe renderizable. `_ok` indica si el shape traía contenido útil.
 */
export function normalizeReport(obj = {}) {
  const salud = obj.salud && typeof obj.salud === 'object' ? obj.salud : {};
  const indicadores = _arr(obj.indicadores).map((x) => ({
    nombre:     _str(x?.nombre),
    valor:      _str(x?.valor),
    señal:      _oneOf(x?.señal ?? x?.senal, _SEÑAL, 'neutro'),
    comentario: _str(x?.comentario),
  })).filter((x) => x.nombre || x.valor);
  const hallazgos = _arr(obj.hallazgos).map((x) => ({
    titulo:    _str(x?.titulo),
    detalle:   _str(x?.detalle),
    severidad: _oneOf(x?.severidad, _SEV, 'media'),
  })).filter((x) => x.titulo || x.detalle);
  const riesgos = _arr(obj.riesgos).map((x) => ({
    titulo:     _str(x?.titulo),
    detalle:    _str(x?.detalle),
    mitigacion: _str(x?.mitigacion),
  })).filter((x) => x.titulo || x.detalle);
  const recomendaciones = _arr(obj.recomendaciones).map((x) => ({
    accion:    _str(x?.accion),
    impacto:   _str(x?.impacto),
    prioridad: _oneOf(x?.prioridad, _SEV, 'media'),
  })).filter((x) => x.accion);

  const report = {
    titulo:            _str(obj.titulo),
    periodo:           _str(obj.periodo),
    moneda:            _str(obj.moneda) || 'CLP',
    resumen_ejecutivo: _str(obj.resumen_ejecutivo ?? obj.resumen),
    salud: {
      nivel:   _oneOf(salud.nivel, _NIVELES, 'estable'),
      puntaje: _clampPuntaje(salud.puntaje),
      titular: _str(salud.titular),
    },
    indicadores, hallazgos, riesgos, recomendaciones,
    proyeccion: _str(obj.proyeccion),
  };
  report._ok = !!(report.resumen_ejecutivo || indicadores.length || hallazgos.length);
  return report;
}

/**
 * Punta a punta: extrae + normaliza. Puro. No lanza.
 * @returns {{ ok:boolean, report?:object, error?:string }}
 */
export function parseFinanceReport(text) {
  const ex = extractJson(text);
  if (!ex.ok) return { ok: false, error: ex.error };
  const report = normalizeReport(ex.data);
  if (!report._ok) return { ok: false, error: 'El JSON no trae contenido de informe (resumen/indicadores).' };
  return { ok: true, report };
}
