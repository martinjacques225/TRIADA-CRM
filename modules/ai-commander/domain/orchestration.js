// modules/ai-commander/domain/orchestration.js
// ── DOMINIO · Mesa de Orquesta (reparto multi-IA SIN API) ────────────────────
// El Director NO llama a ninguna API: DIRIGE. Según el tipo de proyecto genera
// un prompt a medida para cada IA (según su fuerte), el usuario los pega en sus
// chats (Claude/ChatGPT/Gemini — que ya paga) y trae las respuestas; luego el
// Director arma un meta-prompt de SÍNTESIS que combina las tres.
// Puro: sin DOM, sin red, sin Supabase → testeable en node.

// Proveedores en orden de la mesa. `base` = rol que juega esa IA.
export const ORQ_PROVIDERS = [
  { id: 'openai',    label: 'ChatGPT', icon: '🟢', url: 'https://chat.openai.com/',
    base: 'el Creativo — ideas rápidas, copy persuasivo, variaciones y naming' },
  { id: 'anthropic', label: 'Claude',  icon: '🟣', url: 'https://claude.ai/new',
    base: 'el Arquitecto/Director — estructura, arquitectura, código, seguridad y redacción con marca' },
  { id: 'google',    label: 'Gemini',  icon: '🔵', url: 'https://gemini.google.com/app',
    base: 'el Investigador — contexto amplio, research de mercado, datos y benchmarking' },
];

// La IA que hace la síntesis final (el director de verdad).
export const DIRECTOR = ORQ_PROVIDERS.find(p => p.id === 'anthropic');

// Método Tríada inyectado en cada prompt: rigor de construcción, no la marca de
// un cliente concreto (esa va en el contexto).
const METODO = 'Método Tríada (respétalo siempre): entrega ORDENADA, jerárquica y accionable (nada a medias); '
  + 'estructura modular y clara; buenas prácticas de seguridad (sin exponer secretos, accesibilidad AA); '
  + 'coherencia con el sistema de marca indicado. Español de Chile, tono cercano y profesional.';

export const PROJECT_TYPES = [
  { id: 'landing', label: 'Landing / Sitio web', icon: '🌐', asks: {
    openai:    'Titulares, subtítulos y CTAs de alto impacto (3 variaciones c/u) y microcopy persuasivo por sección. Propón 3 ángulos de mensaje y un naming si aplica.',
    anthropic: 'Arquitectura de la página: secciones en orden, jerarquía de contenido, wireframe textual, specs técnicas (stack, responsive, accesibilidad AA, performance) y seguridad. Entrega el copy final estructurado por sección.',
    google:    'Research de mercado: 3-5 competidores/referentes (qué hacen bien), palabras clave SEO y ángulos diferenciadores. Cierra con oportunidades detectadas.' } },
  { id: 'app', label: 'App / Producto', icon: '📱', asks: {
    openai:    'Nombres de features, microcopy, textos de onboarding y estados vacíos. Propón el gancho del producto y 3 variantes de propuesta de valor.',
    anthropic: 'Arquitectura del producto: modelo de datos, módulos, flujo de usuario, roles/permisos, stack y consideraciones de seguridad y escalabilidad. Entrega un plan de implementación por fases.',
    google:    'Benchmarking de 3-5 apps similares: features esperadas, precios y qué las diferencia. Lista lo imprescindible vs. lo deseable.' } },
  { id: 'crm', label: 'CRM / Plataforma interna', icon: '🗂️', asks: {
    openai:    'Nomenclatura de módulos, textos de UI y microcopy que hagan la herramienta clara y amable para el equipo.',
    anthropic: 'Módulos del sistema, esquema de datos, roles y permisos (RLS), flujos clave y seguridad. Entrega el mapa de la plataforma y un plan por fases.',
    google:    'Research del proceso del rubro: cómo trabajan hoy, qué datos manejan, qué reportes necesitan. Detecta cuellos de botella que la plataforma debe resolver.' } },
  { id: 'informe', label: 'Informe / Análisis', icon: '📊', asks: {
    openai:    'Resumen ejecutivo, títulos de secciones y frases clave que comuniquen los hallazgos con claridad e impacto.',
    anthropic: 'Estructura del informe: índice, narrativa, cómo presentar cada hallazgo, conclusiones y recomendaciones accionables. Cuida el rigor y la coherencia.',
    google:    'Análisis del tema/datos: benchmarks, cifras de referencia, fuentes y contexto de mercado que respalden el informe.' } },
  { id: 'marca', label: 'Marca / Branding', icon: '🎨', asks: {
    openai:    'Naming, taglines y conceptos creativos (3-5 rutas). Propón el territorio de marca y su tono de voz.',
    anthropic: 'Sistema de marca coherente: principios, personalidad, tono de voz, guía de aplicación y cómo mantener consistencia. Estructura el entregable.',
    google:    'Research de referentes y tendencias del rubro: qué hacen las marcas líderes, códigos visuales y oportunidades de diferenciación.' } },
  { id: 'contenido', label: 'Contenido / Marketing', icon: '📣', asks: {
    openai:    'Copies y variaciones para las piezas, guiones cortos (reels/posts) y ganchos. Propón 5-10 ideas de contenido.',
    anthropic: 'Estrategia y estructura: objetivos, calendario, formatos por canal y cómo medir. Ordénalo en un plan accionable.',
    google:    'Research de audiencia y tendencias: qué consume el público, formatos que funcionan hoy e ideas de video (incl. Veo). Referentes a seguir.' } },
  { id: 'generico', label: 'Genérico / Otro', icon: '✳️', asks: {
    openai:    'Aporta ideas, opciones creativas y redacción clara para el objetivo. Propón variaciones y quick wins.',
    anthropic: 'Aporta estructura, plan accionable, decisiones clave (con trade-offs), riesgos y consideraciones de calidad/seguridad.',
    google:    'Aporta research, datos de referencia, benchmarks y contexto de mercado relevantes para el objetivo.' } },
];

export const findType = (id) => PROJECT_TYPES.find(t => t.id === id) || PROJECT_TYPES[PROJECT_TYPES.length - 1];

function _ctxBlock(contexto) {
  const c = (contexto || '').trim();
  return c
    ? `\nCONTEXTO / MARCA / PÚBLICO:\n${c}\n`
    : '\n(Si no se indica marca, respeta la identidad que defina el cliente y pregunta lo mínimo si falta algo clave.)\n';
}

/** Prompt para UNA IA. Puro. */
export function buildPrompt(provider, brief = {}) {
  const type = findType(brief.tipo);
  const obj = (brief.objetivo || '').trim() || '(describe el objetivo)';
  return `Eres ${provider.base}, colaborando en un equipo dirigido por Tríada.

${METODO}

OBJETIVO DEL PROYECTO (${type.label}):
${obj}
${_ctxBlock(brief.contexto)}
TU ENTREGA ESPECÍFICA:
${type.asks[provider.id]}

Formato: respuesta lista para integrar, bien estructurada con encabezados. Marca claramente supuestos y lo que falte por definir.`;
}

/** Los 3 prompts del reparto. Puro. */
export function buildFanout(brief = {}) {
  return ORQ_PROVIDERS.map(p => ({
    providerId: p.id, label: p.label, icon: p.icon, url: p.url, rol: p.base,
    prompt: buildPrompt(p, brief),
  }));
}

/** Meta-prompt de síntesis para el Director (Claude). Puro. */
export function buildSynthesis(brief = {}, responses = {}) {
  const type = findType(brief.tipo);
  const obj = (brief.objetivo || '').trim() || '(objetivo)';
  const blocks = ORQ_PROVIDERS.map(p => {
    const r = (responses[p.id] || '').trim();
    return `### Respuesta de ${p.label} (${p.icon})\n${r || '(sin respuesta)'}`;
  }).join('\n\n');
  return `Eres el DIRECTOR DE ORQUESTA de Tríada. Tres IAs trabajaron el mismo objetivo en paralelo; tu trabajo es un análisis SUPERIOR que las combine.

${METODO}

OBJETIVO (${type.label}):
${obj}
${_ctxBlock(brief.contexto)}
RESPUESTAS DE CADA IA:
${blocks}

HAZ ESTO:
1. Compara las tres: qué aporta cada una, dónde coinciden y dónde se contradicen.
2. Toma lo MEJOR de cada una y descarta lo débil (di por qué).
3. Detecta vacíos o riesgos que ninguna cubrió.
4. Entrega UN plan final único, accionable y ordenado, con estructura, marca y seguridad Tríada.
5. Cierra con los PRÓXIMOS PASOS concretos (checklist).`;
}
