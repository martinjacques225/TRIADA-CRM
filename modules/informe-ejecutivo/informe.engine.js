// modules/informe-ejecutivo/informe.engine.js
// Motor de análisis y generación de contenido del Informe Ejecutivo Tríada 360.
// Toma un diagnóstico + prospecto + evaluador y produce puntajes, clasificación,
// hallazgos, oportunidades, plan de acción y narrativa.
// Única dependencia: constantes puras de js/utils.js (sub-dimensiones + escala de
// respuesta) — nada de red, así que sigue siendo testeable en node.
import { DIAG_GRUPOS, answerValue } from '../../js/utils.js';
import { benchmarkFor, VALOR_FACTOR } from './informe.benchmarks.js';

// ── Niveles de madurez (clasificación 0-100) ──
export const NIVELES = [
  { id:'Crítico',    min:0,  max:39,  color:'#B4524A', bg:'#F6EAE6',
    tag:'Requiere atención prioritaria',
    descShort:'La operación presenta fugas relevantes en varias áreas.',
    descLong:'En este nivel, la operación depende fuertemente de esfuerzos manuales y decisiones reactivas. Esto limita el crecimiento y expone al negocio a riesgos evitables que conviene abordar con prontitud.' },
  { id:'En Riesgo',  min:40, max:59,  color:'#C0892F', bg:'#F4ECDA',
    tag:'Oportunidad de mejora significativa',
    descShort:'Existen bases, pero con brechas que frenan el crecimiento.',
    descLong:'La empresa cuenta con algunos elementos en su lugar, pero las brechas existentes generan ineficiencias y pérdida de oportunidades. Cerrarlas de forma ordenada libera valor en el corto plazo.' },
  { id:'Funcional',  min:60, max:79,  color:'#2F8C93', bg:'#E4EFEF',
    tag:'Base sólida con espacio para optimizar',
    descShort:'La operación funciona; el foco está en optimizar.',
    descLong:'La empresa tiene una operación funcional y ordenada. El siguiente salto proviene de optimizar procesos y profundizar el uso de datos para decidir con mayor precisión.' },
  { id:'Optimizado', min:80, max:100, color:'#5E9E7E', bg:'#E9F0EA',
    tag:'Desempeño destacado',
    descShort:'La empresa muestra madurez y buenas prácticas.',
    descLong:'La empresa opera con prácticas maduras y un buen nivel de control. El desafío es sostener la mejora continua y escalar lo que ya funciona bien.' },
];

export function nivelFor(score) {
  return NIVELES.find(n => score >= n.min && score <= n.max) || NIVELES[0];
}

// ── Definición de áreas del informe ──
// Colores por área alineados al sistema de marca del sitio web (crema + petróleo):
// Tecnología azul · Ventas teal · Finanzas verde.
export const AREAS_INFORME = [
  { key:'tec',      label:'Tecnología y Digitalización',    short:'Tecnología', icon:'🖥️', color:'#3D6E92', scoreKey:'scoresTec' },
  { key:'ventas',   label:'Gestión Comercial y Ventas',     short:'Ventas',     icon:'📈', color:'#2F8C93', scoreKey:'scoresVentas' },
  { key:'finanzas', label:'Finanzas y Gestión Empresarial', short:'Finanzas',   icon:'💰', color:'#5E9E7E', scoreKey:'scoresFinanzas' },
];

// ── Catálogo de FORTALEZAS (respuesta = Sí) ──
const STRENGTHS = {
  tec: [
    'Sistemas internos integrados que comparten información sin reingresar datos',
    'Información centralizada en una única fuente, accesible para el equipo',
    'Decisiones apoyadas en datos e indicadores, no solo en intuición',
    'Equipo con buena adopción de herramientas digitales en el día a día',
    'Tareas repetitivas automatizadas (facturación, reportes, recordatorios)',
    'Presencia digital activa y cuidada (web, redes, Google) acorde al rubro',
    'Respaldos automáticos de la información crítica del negocio',
    'Accesos, contraseñas y permisos gestionados con criterios de seguridad',
    'Responsable definido del soporte y la mejora tecnológica',
  ],
  ventas: [
    'Generación de prospectos constante, no dependiente solo del boca a boca',
    'Inversión en marketing planificada y medida por resultados',
    'Proceso de ventas documentado y replicable por todo el equipo',
    'Seguimiento comercial estructurado a cada prospecto y cotización',
    'Gestión de clientes y oportunidades apoyada en un CRM',
    'Tasa de conversión de cotizaciones medida y conocida',
    'Equipo comercial con metas claras y seguimiento regular',
    'Postventa activa para retener y hacer crecer a los clientes actuales',
    'Costo de adquisición y valor del cliente en el tiempo conocidos',
  ],
  finanzas: [
    'Finanzas del negocio separadas de las personales del dueño',
    'Flujo de caja proyectado con anticipación (3 meses o más)',
    'Revisión mensual de los resultados financieros',
    'Margen real conocido por producto o servicio',
    'Costos fijos y variables claramente identificados',
    'Indicadores de rentabilidad por línea de negocio o cliente',
    'Obligaciones tributarias y contables al día con el SII',
    'Presupuesto anual definido y comparado contra el desempeño real',
    'Acceso a financiamiento o capital de trabajo cuando se necesita',
  ],
};

// ── Catálogo de HALLAZGOS (respuesta = No) ──
const FINDINGS = {
  tec: [
    { titulo:'Sistemas y herramientas desconectados', riesgo:'Medio',
      impacto:'La información vive en silos; el equipo duplica trabajo y se pierde trazabilidad entre áreas.' },
    { titulo:'Datos dispersos y poco accesibles', riesgo:'Alto',
      impacto:'Sin una única fuente de verdad, las decisiones se toman con información incompleta o desactualizada.' },
    { titulo:'Decisiones sin datos ni indicadores', riesgo:'Medio',
      impacto:'Al decidir por intuición, los problemas se detectan tarde y las oportunidades pasan inadvertidas.' },
    { titulo:'Operación apoyada en planillas y papel', riesgo:'Medio',
      impacto:'El trabajo manual limita la productividad y no escala cuando crece el volumen de la operación.' },
    { titulo:'Procesos manuales sin automatización', riesgo:'Alto',
      impacto:'Tareas repetitivas consumen horas del equipo que podrían destinarse a actividades de mayor valor.' },
    { titulo:'Presencia digital débil o desactualizada', riesgo:'Medio',
      impacto:'Clientes que buscan en internet no encuentran a la empresa o se llevan una mala primera impresión.' },
    { titulo:'Sin respaldos de la información crítica', riesgo:'Alto',
      impacto:'Una falla, un robo o un error humano podría borrar datos clave del negocio sin vuelta atrás.' },
    { titulo:'Gestión informal de accesos y contraseñas', riesgo:'Alto',
      impacto:'Contraseñas compartidas y permisos sin control exponen al negocio a fraudes y fugas de datos.' },
    { titulo:'Sin responsable de la tecnología', riesgo:'Bajo',
      impacto:'Los problemas técnicos se resuelven a la rápida y la mejora digital nunca termina de avanzar.' },
  ],
  ventas: [
    { titulo:'Llegada de prospectos irregular y dependiente del boca a boca', riesgo:'Alto',
      impacto:'Las ventas suben y bajan sin control porque no hay un flujo predecible de nuevas oportunidades.' },
    { titulo:'Marketing improvisado y sin medición', riesgo:'Medio',
      impacto:'Se invierte en difusión sin saber qué funciona; el presupuesto se diluye sin retorno claro.' },
    { titulo:'Proceso de ventas no documentado', riesgo:'Alto',
      impacto:'Cada vendedor opera a su manera; los resultados dependen de personas y no de un sistema replicable.' },
    { titulo:'Falta de seguimiento comercial estructurado', riesgo:'Alto',
      impacto:'Oportunidades se enfrían sin gestión; se pierden ventas que ya estaban al alcance.' },
    { titulo:'Ausencia de un CRM', riesgo:'Alto',
      impacto:'La relación con clientes y prospectos se gestiona de memoria o en planillas, con alto riesgo de fuga.' },
    { titulo:'Sin medición de conversión de cotizaciones', riesgo:'Medio',
      impacto:'No se sabe cuántas cotizaciones se cierran ni por qué se pierden las demás.' },
    { titulo:'Equipo comercial sin metas ni seguimiento', riesgo:'Medio',
      impacto:'Sin objetivos claros y revisión periódica, el desempeño comercial es errático e impredecible.' },
    { titulo:'Sin postventa ni gestión de clientes actuales', riesgo:'Medio',
      impacto:'Se invierte todo en captar y poco en retener; se deja de vender a quien ya confía en la empresa.' },
    { titulo:'Costo de adquisición y valor del cliente desconocidos', riesgo:'Medio',
      impacto:'Sin saber cuánto cuesta y cuánto deja un cliente, no hay forma de decidir cuánto invertir en crecer.' },
  ],
  finanzas: [
    { titulo:'Finanzas del negocio mezcladas con las personales', riesgo:'Alto',
      impacto:'Es imposible saber si el negocio realmente gana plata; las decisiones se toman a ciegas.' },
    { titulo:'Flujo de caja sin proyección', riesgo:'Alto',
      impacto:'La empresa reacciona a los problemas de liquidez en lugar de anticiparlos.' },
    { titulo:'Sin revisión financiera periódica', riesgo:'Medio',
      impacto:'Los estados financieros no guían la gestión; los desvíos se detectan demasiado tarde.' },
    { titulo:'Margen real desconocido por producto/servicio', riesgo:'Alto',
      impacto:'Se vende sin saber qué genera utilidad y qué drena caja cada mes.' },
    { titulo:'Estructura de costos poco clara', riesgo:'Medio',
      impacto:'Sin distinguir costos fijos y variables, es difícil fijar precios y controlar gastos.' },
    { titulo:'Falta de indicadores de rentabilidad', riesgo:'Bajo',
      impacto:'No hay visibilidad de qué líneas de negocio o clientes realmente aportan al resultado.' },
    { titulo:'Cumplimiento tributario y contable con brechas', riesgo:'Alto',
      impacto:'Atrasos o errores con el SII derivan en multas, intereses y riesgo de fiscalización.' },
    { titulo:'Sin presupuesto anual de referencia', riesgo:'Medio',
      impacto:'Sin un plan financiero, no hay contra qué medir si el año va bien o mal.' },
    { titulo:'Acceso limitado a financiamiento', riesgo:'Medio',
      impacto:'Sin capital de trabajo a la mano, se frenan compras, pedidos o crecimiento por falta de caja.' },
  ],
};

// ── Catálogo de OPORTUNIDADES (remedio a cada hallazgo) ──
const OPPS = {
  tec: [
    { titulo:'Integrar los sistemas en una plataforma conectada',      beneficio:'Fin de la doble digitación y trazabilidad de punta a punta', esfuerzo:'Alto',  impacto:'Alto' },
    { titulo:'Centralizar la información en una única fuente de verdad',beneficio:'Decisiones basadas en datos confiables y al día',           esfuerzo:'Medio', impacto:'Alto' },
    { titulo:'Implementar un tablero de indicadores del negocio',      beneficio:'Visibilidad del desempeño y alertas tempranas',             esfuerzo:'Medio', impacto:'Alto' },
    { titulo:'Digitalizar el flujo de trabajo del equipo',            beneficio:'Mayor productividad y procesos que escalan',                esfuerzo:'Medio', impacto:'Medio' },
    { titulo:'Automatizar las tareas repetitivas clave',              beneficio:'Recuperar horas del equipo cada semana',                   esfuerzo:'Medio', impacto:'Alto' },
    { titulo:'Fortalecer la presencia digital (web, Google y redes)', beneficio:'Más visibilidad y confianza ante quien busca online',       esfuerzo:'Medio', impacto:'Medio' },
    { titulo:'Configurar respaldos automáticos en la nube',           beneficio:'Continuidad del negocio ante cualquier incidente',          esfuerzo:'Bajo',  impacto:'Alto' },
    { titulo:'Ordenar accesos con gestor de contraseñas y permisos',  beneficio:'Menor riesgo de fraude y resguardo de datos personales',    esfuerzo:'Bajo',  impacto:'Medio' },
    { titulo:'Designar un responsable o socio tecnológico',           beneficio:'Soporte confiable y un plan de mejora sostenido',           esfuerzo:'Bajo',  impacto:'Medio' },
  ],
  ventas: [
    { titulo:'Construir un motor de generación de demanda',            beneficio:'Flujo predecible de oportunidades mes a mes',               esfuerzo:'Medio', impacto:'Alto' },
    { titulo:'Planificar y medir las campañas de marketing',           beneficio:'Cada peso invertido con retorno medible',                  esfuerzo:'Medio', impacto:'Medio' },
    { titulo:'Documentar y estandarizar el proceso de ventas',         beneficio:'Resultados predecibles e independientes de las personas',   esfuerzo:'Bajo',  impacto:'Alto' },
    { titulo:'Implementar un seguimiento comercial estructurado',      beneficio:'Recuperar ventas que hoy se enfrían sin gestión',           esfuerzo:'Bajo',  impacto:'Alto' },
    { titulo:'Implementar un CRM para gestionar clientes',             beneficio:'Cero fuga de oportunidades y relación trazable',            esfuerzo:'Medio', impacto:'Alto' },
    { titulo:'Medir la conversión de cotizaciones',                    beneficio:'Identificar fugas y subir la tasa de cierre',               esfuerzo:'Bajo',  impacto:'Medio' },
    { titulo:'Definir metas comerciales con seguimiento periódico',    beneficio:'Equipo enfocado y desempeño consistente',                  esfuerzo:'Bajo',  impacto:'Medio' },
    { titulo:'Diseñar un proceso de postventa y fidelización',         beneficio:'Más recompra y mayor valor por cliente',                   esfuerzo:'Medio', impacto:'Alto' },
    { titulo:'Calcular el costo de adquisición y el valor por cliente',beneficio:'Saber cuánto invertir para crecer con rentabilidad',        esfuerzo:'Medio', impacto:'Medio' },
  ],
  finanzas: [
    { titulo:'Separar las finanzas del negocio de las personales',     beneficio:'Claridad real sobre la salud del negocio',                 esfuerzo:'Bajo',  impacto:'Alto' },
    { titulo:'Proyectar el flujo de caja a 3-6 meses',                 beneficio:'Anticipar necesidades de liquidez y evitar apuros',         esfuerzo:'Bajo',  impacto:'Alto' },
    { titulo:'Establecer una revisión financiera mensual',             beneficio:'Detectar desvíos a tiempo y corregir rápido',              esfuerzo:'Bajo',  impacto:'Medio' },
    { titulo:'Calcular el margen real por producto/servicio',          beneficio:'Enfocar el negocio en lo que genera utilidad',             esfuerzo:'Medio', impacto:'Alto' },
    { titulo:'Clarificar la estructura de costos',                     beneficio:'Precios y control de gasto sobre base sólida',              esfuerzo:'Medio', impacto:'Medio' },
    { titulo:'Construir indicadores de rentabilidad por línea/cliente',beneficio:'Visibilidad de qué aporta de verdad al resultado',          esfuerzo:'Medio', impacto:'Alto' },
    { titulo:'Ordenar el cumplimiento tributario y contable',          beneficio:'Tranquilidad ante el SII y fin de multas evitables',        esfuerzo:'Bajo',  impacto:'Medio' },
    { titulo:'Construir un presupuesto anual y seguirlo',              beneficio:'Un norte claro y control del desvío mes a mes',             esfuerzo:'Medio', impacto:'Medio' },
    { titulo:'Ordenar las finanzas para acceder a financiamiento',     beneficio:'Capital disponible para crecer sin ahogar la caja',         esfuerzo:'Medio', impacto:'Medio' },
  ],
};

// ── Pesos para priorización ──
const RIESGO_W   = { Alto:3, Medio:2, Bajo:1 };
const IMPACTO_W  = { Alto:3, Medio:2, Bajo:1 };
const ESFUERZO_W = { Bajo:3, Medio:2, Alto:1 }; // menor esfuerzo => mayor prioridad

function _scoreArea(arr) {
  const a = arr || [];
  if (!a.length) return 0;
  const sum = a.reduce((s, v) => s + answerValue(v), 0);
  return Math.round((sum / a.length) * 100);
}

// Puntaje por sub-dimensión: parte el arreglo plano del área según DIAG_GRUPOS.
function _subdimensiones(areaKey, arr) {
  const grupos = DIAG_GRUPOS[areaKey] || [];
  let gi = 0;
  return grupos.map(g => {
    const slice = (arr || []).slice(gi, gi + g.n);
    gi += g.n;
    return { label: g.label, score: _scoreArea(slice) };
  });
}

// ── Cuantificación económica (valor en juego) ──
// Lee la facturación anual estimada del prospecto (numérica). Si no hay número
// utilizable, devuelve null y el informe no muestra cifras (sin falsa precisión).
function _parseMonto(v) {
  if (typeof v === 'number') return v > 0 ? v : 0;
  const n = parseInt(String(v ?? '').replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
function _economia(areas, facturacionEst) {
  const fact = _parseMonto(facturacionEst);
  if (!fact) return null;
  // Por área: valor en juego = facturación × factor del área × brecha de madurez.
  // Se reporta como rango [50% .. 100%] del techo, para dimensionar (no prometer).
  const porArea = areas.map(a => {
    const gap = Math.max(0, (100 - a.score) / 100);
    const alto = Math.round(fact * (VALOR_FACTOR[a.key] || 0.06) * gap);
    return { area: a.short, areaKey: a.key, color: a.color, bajo: Math.round(alto * 0.5), alto };
  });
  return {
    fact,
    porArea,
    totalBajo: porArea.reduce((s, x) => s + x.bajo, 0),
    totalAlto: porArea.reduce((s, x) => s + x.alto, 0),
  };
}

// ── Código único de informe (determinístico y estable) ──
export function codigoInforme(diag) {
  const d = new Date(diag.fecha || Date.now());
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const id = String(diag.id || Math.floor(Math.random() * 9999)).padStart(4, '0');
  return `TR360-${yy}${mm}${dd}-${id}`;
}

// ════════════════════════════════════════════════════
// COMPUTE: genera el modelo completo del informe
// ════════════════════════════════════════════════════
export function computeInforme(diag, prospecto, evaluador = {}) {
  const empresa = (prospecto?.empresa || prospecto?.nombre || 'La empresa').trim();

  // 1) Áreas con puntaje, nivel, fortalezas y debilidades
  const areas = AREAS_INFORME.map(a => {
    const arr = diag[a.scoreKey] || [];
    // Escala graduada: Sí (true/1) = fortaleza · No (false/0) = hallazgo.
    // Parcial (0.5) y sin responder (null) no generan fortaleza ni hallazgo;
    // solo mueven el puntaje (crédito parcial).
    const yesIdx = arr.map((v, i) => ({ v, i })).filter(x => x.v === true || x.v === 1).map(x => x.i);
    const noIdx  = arr.map((v, i) => ({ v, i })).filter(x => x.v === false || x.v === 0).map(x => x.i);
    const score = _scoreArea(arr);
    const targetScore = Math.min(95, score + Math.round((100 - score) * 0.6));
    return {
      ...a,
      score, targetScore,
      nivel: nivelFor(score),
      subdimensiones: _subdimensiones(a.key, arr),
      fortalezas: yesIdx.map(i => STRENGTHS[a.key][i]).filter(Boolean),
      debilidades: noIdx.map(i => FINDINGS[a.key][i]?.titulo).filter(Boolean),
      _noIdx: noIdx,
    };
  });

  // 2) Índice general + nivel + objetivo
  const overall = Math.round(areas.reduce((s, a) => s + a.score, 0) / areas.length);
  const nivel = nivelFor(overall);
  const target = Math.round(areas.reduce((s, a) => s + a.targetScore, 0) / areas.length);

  // 2.5) Benchmark (referencia Tríada por rubro/tamaño) + cuantificación ($)
  const benchmarkContext = !!(prospecto?.rubro || prospecto?.tamano);
  areas.forEach(a => {
    a.benchmark = benchmarkFor(a.key, prospecto?.rubro, prospecto?.tamano);
    a.vsBenchmark = a.score - a.benchmark;
  });
  const benchmarkOverall = Math.round(areas.reduce((s, a) => s + a.benchmark, 0) / areas.length);
  const economia = _economia(areas, prospecto?.facturacionEst);

  // 3) HALLAZGOS — todos los "No", ordenados por riesgo, top 5
  let hallazgos = [];
  areas.forEach(a => {
    a._noIdx.forEach(i => {
      const f = FINDINGS[a.key][i];
      if (f) hallazgos.push({ ...f, area: a.short, areaColor: a.color, areaIcon: a.icon });
    });
  });
  hallazgos.sort((x, y) => RIESGO_W[y.riesgo] - RIESGO_W[x.riesgo]);
  // sumar hallazgos manuales del consultor si hay espacio
  (diag.hallazgos || []).forEach(h => {
    if (hallazgos.length < 5) hallazgos.push({ titulo: h, impacto: 'Observación registrada por el consultor durante el diagnóstico.', riesgo: 'Medio', area: 'Transversal', areaColor: '#16234A', areaIcon: '📌' });
  });
  const topHallazgos = hallazgos.slice(0, 5);

  // 4) OPORTUNIDADES — remedios priorizados, top 5
  let oportunidades = [];
  areas.forEach(a => {
    a._noIdx.forEach(i => {
      const o = OPPS[a.key][i];
      if (o) {
        const prioridad = IMPACTO_W[o.impacto] * 1.5 + ESFUERZO_W[o.esfuerzo];
        oportunidades.push({ ...o, area: a.short, areaColor: a.color, areaKey: a.key, prioridad });
      }
    });
  });
  oportunidades.sort((x, y) => y.prioridad - x.prioridad);
  (diag.oportunidades || []).forEach(o => {
    if (oportunidades.length < 5) oportunidades.push({ titulo: o, beneficio: 'Oportunidad identificada por el consultor.', esfuerzo: 'Medio', impacto: 'Medio', area: 'Transversal', areaColor: '#16234A', prioridad: 0 });
  });
  const topOportunidades = oportunidades.slice(0, 5);

  // 5) PLAN DE ACCIÓN — agrupar oportunidades por horizonte (según esfuerzo)
  const plan = _buildPlan(oportunidades);

  // 6) Narrativa dinámica
  const ordenadas = [...areas].sort((a, b) => a.score - b.score);
  const peor = ordenadas[0];
  const segundaPeor = ordenadas[1];
  const mejor = ordenadas[ordenadas.length - 1];

  const narrativaCtx = { empresa, overall, nivel, target, areas, mejor, peor, segundaPeor,
    benchmarkContext, benchmarkOverall, economia, nHallazgos: topHallazgos.length };
  const resumenEjecutivo = _resumen(narrativaCtx);
  const conclusion = _conclusion(narrativaCtx);

  return {
    codigo: codigoInforme(diag),
    fecha: diag.fecha || new Date().toISOString(),
    empresa,
    prospecto,
    evaluador,
    overall, nivel, target, potencial: target - overall,
    benchmarkContext, benchmarkOverall, economia,
    areas,
    hallazgos: topHallazgos,
    oportunidades: topOportunidades,
    plan,
    resumenEjecutivo,
    conclusion,
  };
}

// ── Plan de acción por horizonte ──
function _buildPlan(opps) {
  const corto = [], mediano = [], largo = [];
  opps.forEach(o => {
    const item = { titulo: o.titulo, beneficio: o.beneficio, area: o.area, areaColor: o.areaColor };
    if (o.esfuerzo === 'Bajo')      corto.push(item);
    else if (o.esfuerzo === 'Medio') mediano.push(item);
    else                             largo.push(item);
  });
  // Rellenos estratégicos si alguna fase queda vacía
  if (!corto.length)   corto.push({ titulo:'Designar un responsable interno del plan de mejora', beneficio:'Asegurar avance y accountability', area:'Transversal', areaColor:'#16234A' });
  if (!mediano.length) mediano.push({ titulo:'Capacitar al equipo en los nuevos procesos y herramientas', beneficio:'Adopción efectiva y sostenida', area:'Transversal', areaColor:'#16234A' });
  if (!largo.length)   largo.push({ titulo:'Revisar y ajustar la estrategia según los resultados', beneficio:'Mejora continua basada en evidencia', area:'Transversal', areaColor:'#16234A' });
  return {
    corto:   corto.slice(0, 4),
    mediano: mediano.slice(0, 4),
    largo:   largo.slice(0, 4),
  };
}

// ── Generadores de narrativa (reglas con detección de patrón cruzado) ──
function _fmtM(n) {
  const v = n || 0;
  return v >= 1e6 ? '$' + Math.round(v / 1e6).toLocaleString('es-CL') + 'M' : '$' + Math.round(v).toLocaleString('es-CL');
}

// Insight cruzado: qué historia cuentan las 3 áreas EN CONJUNTO (no área por área).
function _insightPatron(areas) {
  const sorted = [...areas].sort((a, b) => b.score - a.score);
  const best = sorted[0], worst = sorted[sorted.length - 1];
  const spread = best.score - worst.score;
  if (spread <= 12) {
    if (best.score >= 70) return 'Las tres áreas avanzan parejas y a buen nivel: el salto vendrá de optimizar el conjunto y sostener las buenas prácticas, más que de corregir un punto aislado.';
    if (worst.score < 45) return 'Las tres áreas comparten brechas de magnitud similar: conviene ordenar primero lo esencial en cada una antes de pensar en optimizar.';
    return 'La madurez es pareja entre las tres áreas, sin un punto crítico aislado; lo más rentable es subir el conjunto un escalón de forma coordinada.';
  }
  const patrones = {
    'ventas>finanzas': 'El motor comercial funciona, pero la gestión financiera no lo sostiene: se vende bien y, aun así, el resultado se diluye por falta de control de márgenes y caja. El foco no es vender más, sino capturar lo que ya se vende.',
    'ventas>tec':      'Las ventas avanzan a pulso, sin el soporte tecnológico que las haría escalables y predecibles: el crecimiento depende de las personas y su memoria, no de un sistema. Ahí está el techo.',
    'tec>ventas':      'La base digital está instalada, pero no se traduce en ventas: hay capacidad esperando un proceso comercial que genere demanda y cierre de forma consistente.',
    'tec>finanzas':    'Hay orden tecnológico, pero la gestión financiera no aprovecha esa información para decidir: el control del negocio va por detrás de su digitalización.',
    'finanzas>ventas': 'Las finanzas están bajo control, pero el crecimiento comercial no acompaña: el negocio se administra bien; falta venderle más y mejor al mercado.',
    'finanzas>tec':    'La gestión financiera es sólida, pero se sostiene en procesos manuales: digitalizar liberaría tiempo, reduciría errores y daría escala al control que ya existe.',
  };
  return patrones[`${best.key}>${worst.key}`]
    || `El desempeño es desparejo: ${best.short} funciona como fortaleza mientras ${worst.short} concentra la mayor brecha.`;
}

function _resumen(ctx) {
  const { empresa, overall, nivel, target, areas, benchmarkContext, benchmarkOverall, economia } = ctx;
  const p = [];
  p.push(`${empresa} obtiene un Índice General de Madurez Empresarial de ${overall}/100, ubicándose en un nivel «${nivel.id}».`);
  if (benchmarkContext) {
    const d = overall - benchmarkOverall;
    p.push(d >= 3
      ? `Eso la sitúa ${d} puntos por sobre la referencia estimada de su rubro y tamaño (${benchmarkOverall}/100): una base de partida favorable.`
      : d <= -3
        ? `Eso la sitúa ${Math.abs(d)} puntos por debajo de la referencia estimada de su rubro y tamaño (${benchmarkOverall}/100), donde se concentra la urgencia.`
        : `Eso la deja en línea con la referencia estimada de su rubro y tamaño (${benchmarkOverall}/100).`);
  }
  p.push(_insightPatron(areas));
  if (economia) {
    p.push(`Cerrar estas brechas equivale del orden de ${_fmtM(economia.totalBajo)} a ${_fmtM(economia.totalAlto)} al año en valor en juego —una referencia para priorizar, no una promesa de resultado.`);
  }
  p.push(`Con un plan estructurado y enfocado en lo de mayor impacto, el diagnóstico proyecta alcanzar un nivel cercano a ${target}/100.`);
  return p.join(' ');
}

// ── Generador de conclusión ejecutiva ──
function _conclusion(ctx) {
  const { empresa, overall, nivel, target, mejor, peor, economia } = ctx;
  const valorFrase = economia
    ? `—del orden de ${_fmtM(economia.totalBajo)} a ${_fmtM(economia.totalAlto)} al año— `
    : '—tiempo, ventas o control— ';
  return [
    `${empresa} se encuentra hoy en un nivel de madurez «${nivel.id}», con un Índice General de ${overall}/100. ${nivel.descLong}`,
    `El diagnóstico concentró sus hallazgos prioritarios en ${peor.short} (${peor.score}/100): ahí está el valor ${valorFrase}que la empresa hoy deja sobre la mesa y que un plan ordenado permite capturar.`,
    `Al mismo tiempo, ${mejor.short} (${mejor.score}/100) ${mejor.score >= 60 ? 'opera como un activo sobre el cual apalancar el crecimiento' : 'parte de una base algo más firme'}. Las oportunidades detectadas son accionables: con foco y método, ${empresa} puede proyectar un nivel cercano a ${target}/100.`,
    `La recomendación es partir por las acciones de corto plazo de alto impacto y bajo esfuerzo: generan resultados visibles rápido y construyen el impulso para los cambios de mayor alcance.`,
  ];
}
