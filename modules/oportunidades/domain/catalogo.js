// modules/oportunidades/domain/catalogo.js — CATÁLOGOS DEL MÓDULO (datos puros).
//
// Fuente de los códigos UNSPSC, los servicios y la carpeta documental: el documento
// de decisión "Proyecto Mercado Público" (Tríada, 30-jul-2026). No son inventados
// acá: si el documento cambia, se cambian acá y se anota en el HANDOFF.
//
// Nada de esto toca DOM ni red: es data + helpers puros (testeable en node).

// ── Servicios que Tríada puede ofrecer al Estado ──────────────────────────────
// `puedeHoy`: se ejecuta con el equipo actual, sin contratar.
// `riesgo`  : qué tan fácil es que el trabajo se salga de lo previsto.
export const SERVICIOS = [
  { slug: 'diagnostico-360',        nombre: 'Diagnóstico empresarial y plan de mejora', riesgo: 'bajo',  puedeHoy: true,  experiencia: 'alta',  semanas: [2, 4] },
  { slug: 'levantamiento-procesos', nombre: 'Levantamiento y optimización de procesos', riesgo: 'bajo',  puedeHoy: true,  experiencia: 'alta',  semanas: [3, 6] },
  { slug: 'sitio-web',              nombre: 'Diseño y desarrollo de sitios web',        riesgo: 'bajo',  puedeHoy: true,  experiencia: 'alta',  semanas: [4, 8] },
  { slug: 'dashboard',              nombre: 'Dashboards y sistemas de gestión',         riesgo: 'medio', puedeHoy: true,  experiencia: 'alta',  semanas: [4, 8] },
  { slug: 'software-mvp',           nombre: 'Software web pequeño o MVP',               riesgo: 'alto',  puedeHoy: true,  experiencia: 'alta',  semanas: [8, 16] },
  { slug: 'diagnostico-financiero', nombre: 'Diagnóstico contable y financiero',        riesgo: 'bajo',  puedeHoy: true,  experiencia: 'media', semanas: [2, 4] },
  { slug: 'formulacion-proyectos',  nombre: 'Apoyo en formulación de proyectos',        riesgo: 'bajo',  puedeHoy: true,  experiencia: 'alta',  semanas: [3, 6] },
  { slug: 'capacitacion-digital',   nombre: 'Capacitación en transformación digital',   riesgo: 'bajo',  puedeHoy: true,  experiencia: 'media', semanas: [1, 3] },
  // Levantamiento operativo de datos personales: se puede LEVANTAR, no interpretar.
  { slug: 'datos-personales',       nombre: 'Inventario y mapeo de datos personales',   riesgo: 'medio', puedeHoy: false, experiencia: 'alta',  semanas: [4, 8], requiereAliado: 'abogado' },
  { slug: 'brechas-21719',          nombre: 'Diagnóstico de brechas Ley 21.719',        riesgo: 'alto',  puedeHoy: false, experiencia: 'alta',  semanas: [4, 10], requiereAliado: 'abogado' },
];

export const servicioPorSlug = (slug) => SERVICIOS.find((s) => s.slug === slug) || null;

// ── Líneas rojas: qué NO se oferta todavía ───────────────────────────────────
// Se muestran en la ficha para que el descarte tenga un motivo escrito, no una
// corazonada. Cada una corresponde a una forma conocida de perder plata.
export const LIMITES = [
  { slug: 'juridico',   titulo: 'Opiniones jurídicas',  detalle: 'No se ofrecen opiniones jurídicas integrales sin abogado. Se puede diagnosticar y levantar; interpretar la ley no nos corresponde.' },
  { slug: 'auditoria',  titulo: 'Auditorías',           detalle: 'No se ofrecen auditorías sin las habilitaciones profesionales que la ley exige para firmarlas.' },
  { slug: 'soporte',    titulo: 'Soporte 24/7',         detalle: 'No se acepta soporte permanente sin equipo para cubrirlo.' },
  { slug: 'ambiguo',    titulo: 'Alcance ambiguo',      detalle: 'No se oferta software complejo con alcance abierto o mal definido.' },
  { slug: 'sin-experiencia', titulo: 'Experiencia institucional que no tenemos', detalle: 'Si las bases exigen experiencia con el Estado que Tríada aún no acredita, no se participa.' },
];

// ── Códigos UNSPSC (los que el portal usa para clasificar lo que vendemos) ────
export const UNSPSC = [
  { codigo: '80101504', descripcion: 'Asesorías en planificación estratégica',        area: 'Gestión',    principal: true },
  { codigo: '80101505', descripcion: 'Asesorías en gestión estratégica',              area: 'Gestión',    principal: true },
  { codigo: '80101507', descripcion: 'Asesorías informáticas',                        area: 'Tecnología', principal: true },
  { codigo: '80101508', descripcion: 'Asesorías en inteligencia de negocios',         area: 'Tecnología', principal: true },
  { codigo: '80101603', descripcion: 'Evaluación económica o financiera de proyectos', area: 'Finanzas',  principal: true },
  { codigo: '80101604', descripcion: 'Asesorías en gestión de proyectos',             area: 'Gestión',    principal: true },
  { codigo: '81112103', descripcion: 'Servicios de diseño de sitio web',              area: 'Tecnología', principal: true },
  { codigo: '81111504', descripcion: 'Programación de aplicaciones',                  area: 'Tecnología', principal: true },
  { codigo: '81111508', descripcion: 'Implantación de aplicaciones',                  area: 'Tecnología', principal: true },
  { codigo: '81111509', descripcion: 'Desarrollo de aplicaciones para Internet o intranet', area: 'Tecnología', principal: true },
  { codigo: '84111505', descripcion: 'Servicios de contabilidad',                     area: 'Finanzas',   principal: true },
  { codigo: '84111502', descripcion: 'Contabilidad financiera',                       area: 'Finanzas',   principal: true },
  { codigo: '84111503', descripcion: 'Contabilidad tributaria',                       area: 'Finanzas',   principal: true },
  { codigo: '84111504', descripcion: 'Servicios de mantención de libros contables',   area: 'Finanzas',   principal: true },
  // Secundarios: se evalúan uno por uno antes de marcarlos en el portal.
  { codigo: '81111510', descripcion: 'Desarrollo de aplicaciones cliente-servidor',   area: 'Tecnología', principal: false, condicion: 'Sin reparos' },
  { codigo: '81112105', descripcion: 'Servicios de operación de sitios web',          area: 'Tecnología', principal: false, condicion: 'Solo si hay equipo para soporte continuo' },
  { codigo: '84101501', descripcion: 'Asesorías y asistencia financiera',             area: 'Finanzas',   principal: false, condicion: 'Sin reparos' },
  { codigo: '84111601', descripcion: 'Auditorías de balances anuales',                area: 'Finanzas',   principal: false, condicion: 'Solo con las habilitaciones profesionales exigidas' },
];

export const unspscPorCodigo = (c) => UNSPSC.find((u) => u.codigo === String(c)) || null;

// ── Procedimientos y modalidades ─────────────────────────────────────────────
export const TIPOS_PROCEDIMIENTO = [
  { v: 'compra_agil',       label: 'Compra Ágil' },
  { v: 'licitacion_publica', label: 'Licitación pública' },
  { v: 'licitacion_privada', label: 'Licitación privada' },
  { v: 'trato_directo',     label: 'Trato directo' },
  { v: 'convenio_marco',    label: 'Convenio marco' },
];

export const MODALIDADES = [
  { v: 'remota',     label: 'Remota' },
  { v: 'presencial', label: 'Presencial' },
  { v: 'mixta',      label: 'Mixta' },
];

export const REGIONES = [
  'Arica y Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama', 'Coquimbo', 'Valparaíso',
  'Metropolitana', "O'Higgins", 'Maule', 'Ñuble', 'Biobío', 'La Araucanía', 'Los Ríos',
  'Los Lagos', 'Aysén', 'Magallanes', 'Nacional',
];

// ── Carpeta maestra del proveedor (7 categorías) ─────────────────────────────
// "Cuando aparece una oportunidad hay horas, no días. Si hay que buscar un
// certificado, la oportunidad ya se perdió."
export const CATEGORIAS_DOC = [
  { v: '01_corporativo',           label: 'Corporativo',            items: ['Escritura o estatuto', 'Certificado de vigencia', 'Modificaciones', 'Poderes', 'RUT y e-RUT', 'Identificación del representante legal', 'Antecedentes de socios y beneficiarios finales'] },
  { v: '02_tributario_financiero', label: 'Tributario y financiero', items: ['Inicio de actividades', 'Actividades económicas', 'Situación tributaria', 'Datos bancarios', 'Certificados tributarios', 'Antecedentes laborales y previsionales', 'Comprobantes del Registro de Proveedores'] },
  { v: '03_equipo',                label: 'Equipo',                 items: ['CV de cada socio', 'Títulos', 'Diplomados', 'Certificaciones', 'Certificados de experiencia individual'] },
  { v: '04_experiencia',           label: 'Experiencia',            items: ['Fichas de proyectos', 'Certificados de clientes', 'Contratos', 'Órdenes de compra', 'Facturas', 'Recepciones conformes', 'Portafolio autorizado'] },
  { v: '05_plantillas_oferta',     label: 'Plantillas de oferta',   items: ['Cotización Compra Ágil', 'Matriz de cumplimiento', 'Oferta técnica', 'Oferta económica', 'Metodología', 'Carta Gantt', 'Ficha de experiencia', 'Declaraciones', 'Checklist antes de ofertar'] },
  { v: '06_compliance',            label: 'Compliance',             items: ['Programa de integridad', 'Código de conducta', 'Política de conflictos de interés', 'Política de regalos y beneficios', 'Canal interno de consultas', 'Política de protección de datos', 'Compromisos de confidencialidad'] },
  { v: '07_procesos',              label: 'Procesos',               items: ['Una subcarpeta por oportunidad, nombrada con el ID del proceso'] },
];

export const categoriaDocLabel = (v) => (CATEGORIAS_DOC.find((c) => c.v === v)?.label) || v || '—';

// ── Checklist base del paquete de oferta ─────────────────────────────────────
// `obligatorio: false` = depende de las bases; se marca "no aplica" con un clic.
export const CHECKLIST_OFERTA = [
  { tipo: 'cotizacion',      nombre: 'Cotización económica',        obligatorio: true },
  { tipo: 'oferta_tecnica',  nombre: 'Oferta técnica',              obligatorio: true },
  { tipo: 'matriz',          nombre: 'Matriz de cumplimiento',      obligatorio: true },
  { tipo: 'metodologia',     nombre: 'Metodología',                 obligatorio: true },
  { tipo: 'gantt',           nombre: 'Carta Gantt',                 obligatorio: true },
  { tipo: 'entregables',     nombre: 'Descripción de entregables',  obligatorio: true },
  { tipo: 'presentacion',    nombre: 'Presentación de Tríada',      obligatorio: false },
  { tipo: 'cv',              nombre: 'CV del equipo',               obligatorio: true },
  { tipo: 'certificados',    nombre: 'Títulos y certificados',      obligatorio: true },
  { tipo: 'experiencia',     nombre: 'Fichas de experiencia',       obligatorio: false },
  { tipo: 'declaraciones',   nombre: 'Declaraciones exigidas',      obligatorio: false },
  { tipo: 'garantia',        nombre: 'Garantía / boleta',           obligatorio: false },
];

// ── Roles de la cotización (los tres socios + apoyos) ────────────────────────
export const ROLES_COSTO = ['Comercial', 'TI', 'Contable', 'Consultor', 'Analista', 'Diseño', 'Subcontrato'];
