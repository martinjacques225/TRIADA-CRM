// modules/informe-ejecutivo/informe.engine.js
// Motor de análisis y generación de contenido del Informe Ejecutivo Tríada 360.
// Toma un diagnóstico + prospecto + evaluador y produce puntajes, clasificación,
// hallazgos, oportunidades, recomendaciones de servicios, plan de acción y narrativa.
// Evalúa 8 pilares con escala de madurez 1-5 (guardada como fracción 0..1).
// Única dependencia: constantes puras de js/utils.js + benchmarks — nada de red, así
// que sigue siendo testeable en node.
import { DIAG_GRUPOS, answerValue } from '../../js/utils.js';
import { benchmarkFor, VALOR_FACTOR, SERVICIOS } from './informe.benchmarks.js';

// ── Niveles de madurez (clasificación 0-100) ──
export const NIVELES = [
  { id:'Crítico',    min:0,  max:39,  color:'#B4524A', bg:'#F6EAE6', semaforo:'rojo',
    tag:'Requiere atención prioritaria',
    descShort:'La operación presenta fugas relevantes en varias áreas.',
    descLong:'En este nivel, la operación depende fuertemente de esfuerzos manuales y decisiones reactivas. Esto limita el crecimiento y expone al negocio a riesgos evitables que conviene abordar con prontitud.' },
  { id:'En Riesgo',  min:40, max:59,  color:'#C0892F', bg:'#F4ECDA', semaforo:'amarillo',
    tag:'Oportunidad de mejora significativa',
    descShort:'Existen bases, pero con brechas que frenan el crecimiento.',
    descLong:'La empresa cuenta con algunos elementos en su lugar, pero las brechas existentes generan ineficiencias y pérdida de oportunidades. Cerrarlas de forma ordenada libera valor en el corto plazo.' },
  { id:'Funcional',  min:60, max:79,  color:'#2F8C93', bg:'#E4EFEF', semaforo:'amarillo',
    tag:'Base sólida con espacio para optimizar',
    descShort:'La operación funciona; el foco está en optimizar.',
    descLong:'La empresa tiene una operación funcional y ordenada. El siguiente salto proviene de optimizar procesos y profundizar el uso de datos para decidir con mayor precisión.' },
  { id:'Optimizado', min:80, max:100, color:'#5E9E7E', bg:'#E9F0EA', semaforo:'verde',
    tag:'Desempeño destacado',
    descShort:'La empresa muestra madurez y buenas prácticas.',
    descLong:'La empresa opera con prácticas maduras y un buen nivel de control. El desafío es sostener la mejora continua y escalar lo que ya funciona bien.' },
];

export function nivelFor(score) {
  return NIVELES.find(n => score >= n.min && score <= n.max) || NIVELES[0];
}

// ── Definición de los 8 pilares del informe ──
// `key` coincide con los ids de DIAG_AREAS y con las claves de scores (jsonb).
export const AREAS_INFORME = [
  { key:'direccion',     label:'Dirección Estratégica',        short:'Estrategia',    icon:'🧭', color:'#16466B' },
  { key:'operacion',     label:'Operación y Procesos',         short:'Operación',     icon:'⚙️', color:'#3D6E92' },
  { key:'tecnologia',    label:'Tecnología y Automatización',  short:'Tecnología',    icon:'🖥️', color:'#5160C0' },
  { key:'ventas',        label:'Gestión Comercial y Ventas',   short:'Ventas',        icon:'📈', color:'#0C7C88' },
  { key:'marketing',     label:'Marketing y Posicionamiento',  short:'Marketing',     icon:'📣', color:'#2F8C93' },
  { key:'finanzas',      label:'Finanzas y Rentabilidad',      short:'Finanzas',      icon:'💰', color:'#2E9B73' },
  { key:'seguridad',     label:'Seguridad Digital',            short:'Seguridad',     icon:'🛡️', color:'#6E59C0' },
  { key:'oportunidades', label:'Oportunidades Perdidas',       short:'Oportunidades', icon:'🎯', color:'#C0892F' },
];

// ── Catálogo de FORTALEZAS (madurez alta: rating 4-5) ──
const STRENGTHS = {
  direccion: [
    'Objetivos anuales claros, escritos y conocidos por todo el equipo',
    'Métricas definidas para saber, con datos, si el negocio crece',
    'Decisiones importantes apoyadas en información, no solo en intuición',
    'Revisión periódica de los indicadores clave del negocio',
    'Desafíos prioritarios identificados, con un plan para enfrentarlos',
  ],
  operacion: [
    'Información que se ingresa una sola vez, sin reprocesos',
    'Equipo que accede rápido a la información que necesita',
    'Tareas repetitivas ordenadas y bajo control de tiempo',
    'Procesos clave documentados, no dependientes de una persona',
    'Continuidad operativa asegurada ante la ausencia de alguien clave',
    'Dueño liberado de lo administrativo para enfocarse en crecer',
  ],
  tecnologia: [
    'Operación apoyada en herramientas digitales adecuadas al negocio',
    'Sistemas que comparten información entre sí, sin islas',
    'Información de clientes ordenada en una sola fuente',
    'Procesos automatizados que funcionan sin intervención manual',
    'Claridad sobre qué tareas conviene automatizar primero',
  ],
  ventas: [
    'Flujo de prospectos constante y predecible',
    'Seguimiento sistemático cuando un cliente deja de responder',
    'Seguimiento ordenado de cada cotización hasta su cierre',
    'Capacidad de responder a tiempo, sin perder ventas por demora',
    'Visibilidad en vivo de los prospectos activos y su etapa',
    'Tasa de conversión medida y gestionada para mejorar',
    'Mejores clientes identificados y su valor en el tiempo conocido',
  ],
  marketing: [
    'Generación de demanda por canales propios, sin depender del boca a boca',
    'Volumen de oportunidades comerciales acorde a las metas',
    'Inversión guiada por los canales que traen mejores clientes',
    'Presencia profesional y actualizada al buscar la empresa online',
    'Empresa activa donde están sus clientes (redes, Google, web)',
    'Estrategia de recompra y fidelización en marcha',
  ],
  finanzas: [
    'Finanzas del negocio separadas de las personales',
    'Claridad sobre qué productos o servicios generan utilidad',
    'Margen real conocido por producto o servicio',
    'Flujo de caja proyectado con confianza a tres meses',
    'Plan de reacción ante una caída de ventas',
    'Revisión financiera mensual contra un presupuesto',
  ],
  seguridad: [
    'Capacidad de recuperar la información ante un incidente',
    'Respaldos automáticos y periódicos de la información crítica',
    'Responsable claro de la seguridad informática',
    'Accesos y permisos controlados por colaborador',
    'Revocación inmediata de accesos al salir un colaborador',
  ],
  oportunidades: [
    'Claridad sobre cuántos clientes o ventas se pierden al mes',
    'Muy pocas ventas perdidas por falta de seguimiento',
    'Alta tasa de aprovechamiento de las oportunidades que llegan',
    'Tiempo mínimo perdido en tareas repetitivas',
    'Cuellos de botella identificados y en proceso de resolución',
  ],
};

// ── Catálogo de HALLAZGOS (madurez baja: rating 1-2) ──
const FINDINGS = {
  direccion: [
    { titulo:'Negocio sin objetivos claros para el año', riesgo:'Alto',
      impacto:'Sin un norte definido, el equipo rema en direcciones distintas y el esfuerzo se diluye sin avanzar hacia una meta común.' },
    { titulo:'Crecimiento que no se mide', riesgo:'Medio',
      impacto:'Sin una forma objetiva de medir el avance, es imposible saber si las decisiones funcionan o solo se "siente" que el negocio va bien.' },
    { titulo:'Decisiones basadas solo en intuición', riesgo:'Alto',
      impacto:'Decidir sin datos hace que los problemas se detecten tarde y que las oportunidades pasen inadvertidas.' },
    { titulo:'Indicadores del negocio sin seguimiento', riesgo:'Medio',
      impacto:'Sin revisar los números con regularidad, los desvíos se descubren cuando ya son difíciles de corregir.' },
    { titulo:'Desafíos del negocio sin diagnóstico ni plan', riesgo:'Medio',
      impacto:'Cuando los problemas de fondo no están identificados, la energía se gasta apagando incendios en vez de resolver las causas.' },
  ],
  operacion: [
    { titulo:'Doble digitación de la misma información', riesgo:'Medio',
      impacto:'Reingresar los mismos datos en varios lugares consume horas y multiplica los errores entre áreas.' },
    { titulo:'Tiempo perdido buscando información', riesgo:'Medio',
      impacto:'Cuando los datos están dispersos, el equipo gasta a diario minutos valiosos solo en encontrarlos.' },
    { titulo:'Tareas repetitivas que consumen la semana', riesgo:'Alto',
      impacto:'El trabajo manual y repetitivo drena horas que podrían dedicarse a vender o atender mejor a los clientes.' },
    { titulo:'Procesos no documentados', riesgo:'Alto',
      impacto:'Si todo vive en la cabeza de las personas, capacitar, delegar o crecer se vuelve lento y riesgoso.' },
    { titulo:'Operación dependiente de personas clave', riesgo:'Alto',
      impacto:'Si quien "sabe cómo se hace" falta o renuncia, la operación se frena y el negocio queda expuesto.' },
    { titulo:'Dueño absorbido por lo administrativo', riesgo:'Medio',
      impacto:'Mientras el dueño apaga incendios operativos, nadie está pensando en cómo hacer crecer la empresa.' },
  ],
  tecnologia: [
    { titulo:'Operación apoyada en planillas y papel', riesgo:'Medio',
      impacto:'Las herramientas improvisadas no escalan: a mayor volumen, más errores y más trabajo manual.' },
    { titulo:'Sistemas desconectados entre sí', riesgo:'Alto',
      impacto:'La información vive en islas; el equipo duplica trabajo y se pierde la trazabilidad entre áreas.' },
    { titulo:'Información de clientes dispersa', riesgo:'Alto',
      impacto:'Datos repartidos en libretas, correos y cabezas se traducen en oportunidades perdidas y mala atención.' },
    { titulo:'Procesos sin automatizar', riesgo:'Alto',
      impacto:'Todo lo que se hace a mano consume tiempo y depende de que alguien se acuerde de hacerlo.' },
    { titulo:'Sin un plan de qué automatizar', riesgo:'Bajo',
      impacto:'Sin identificar las tareas de mayor carga manual, la tecnología nunca llega a aliviar al equipo.' },
  ],
  ventas: [
    { titulo:'Llegada de clientes impredecible', riesgo:'Alto',
      impacto:'Si las ventas dependen del boca a boca o la suerte, el negocio sube y baja sin control y no se puede planificar.' },
    { titulo:'Prospectos que se enfrían sin seguimiento', riesgo:'Alto',
      impacto:'Cada cliente que deja de responder y nadie retoma es una venta que se regala a la competencia.' },
    { titulo:'Cotizaciones sin seguimiento estructurado', riesgo:'Alto',
      impacto:'Oportunidades que ya estaban al alcance se pierden simplemente por no insistir de forma ordenada.' },
    { titulo:'Ventas perdidas por no responder a tiempo', riesgo:'Alto',
      impacto:'En ventas, la velocidad de respuesta define quién cierra: responder tarde es perder frente a quien respondió primero.' },
    { titulo:'Sin visibilidad de los prospectos activos', riesgo:'Medio',
      impacto:'No saber cuántas oportunidades hay ni en qué etapa están hace imposible proyectar ventas y enfocar al equipo.' },
    { titulo:'Conversión de cotizaciones desconocida', riesgo:'Medio',
      impacto:'Si no se sabe cuántas cotizaciones se cierran ni por qué se pierden, no hay forma de mejorar el cierre.' },
    { titulo:'Mejores clientes y su valor sin identificar', riesgo:'Medio',
      impacto:'Sin saber quiénes son los clientes más valiosos, se trata a todos igual y se deja de cultivar a los que más dejan.' },
  ],
  marketing: [
    { titulo:'Dependencia total de las recomendaciones', riesgo:'Alto',
      impacto:'Si toda la llegada de clientes depende del boca a boca, el crecimiento tiene techo y queda fuera de control de la empresa.' },
    { titulo:'Pocas oportunidades comerciales generadas', riesgo:'Alto',
      impacto:'Sin un flujo suficiente de nuevas oportunidades, el equipo comercial trabaja sobre una base que no alcanza para crecer.' },
    { titulo:'Marketing sin medición de resultados', riesgo:'Medio',
      impacto:'Invertir sin saber qué canal trae a los mejores clientes diluye el presupuesto sin retorno claro.' },
    { titulo:'Presencia digital débil o desactualizada', riesgo:'Medio',
      impacto:'Quien busca la empresa en internet y no la encuentra —o ve algo descuidado— se lleva una mala primera impresión.' },
    { titulo:'Ausencia donde están los clientes', riesgo:'Medio',
      impacto:'Si la empresa no está presente en los canales donde su cliente decide, la competencia ocupa ese espacio.' },
    { titulo:'Sin estrategia de recompra', riesgo:'Medio',
      impacto:'Concentrar todo en captar y olvidar a quien ya compró deja sobre la mesa la venta más fácil y rentable.' },
  ],
  finanzas: [
    { titulo:'Finanzas del negocio mezcladas con las personales', riesgo:'Alto',
      impacto:'Mezclar la plata del negocio con la personal hace imposible saber si la empresa realmente gana; se decide a ciegas.' },
    { titulo:'Productos rentables y no rentables sin distinguir', riesgo:'Alto',
      impacto:'Sin saber qué genera utilidad, se invierte energía en vender lo que drena caja en vez de lo que deja.' },
    { titulo:'Margen real desconocido', riesgo:'Alto',
      impacto:'Vender sin conocer el margen real puede significar crecer en ventas y, aun así, perder plata.' },
    { titulo:'Flujo de caja sin proyección', riesgo:'Alto',
      impacto:'Sin proyectar la caja, la empresa reacciona a los apuros de liquidez en vez de anticiparlos.' },
    { titulo:'Negocio sin plan ante una caída de ventas', riesgo:'Medio',
      impacto:'Si una baja de 20% en ventas pondría en jaque al negocio, la empresa está más expuesta de lo que cree.' },
    { titulo:'Sin revisión financiera ni presupuesto', riesgo:'Medio',
      impacto:'Sin comparar los resultados contra un plan, no hay forma de saber a tiempo si el año va bien o mal.' },
  ],
  seguridad: [
    { titulo:'Información del negocio sin red de seguridad', riesgo:'Alto',
      impacto:'Un robo, una falla o un error humano podría borrar datos clave del negocio sin vuelta atrás.' },
    { titulo:'Sin respaldos automáticos', riesgo:'Alto',
      impacto:'Si los respaldos dependen de que alguien se acuerde, el día que falle uno será justo el día que se necesitaba.' },
    { titulo:'Nadie a cargo de la seguridad informática', riesgo:'Medio',
      impacto:'Sin un responsable, la seguridad se vuelve tierra de nadie hasta que ocurre el incidente.' },
    { titulo:'Accesos y permisos sin control', riesgo:'Alto',
      impacto:'Contraseñas compartidas y permisos abiertos exponen al negocio a fraudes y fugas de información.' },
    { titulo:'Accesos que no se revocan al salir alguien', riesgo:'Alto',
      impacto:'Un ex colaborador que conserva acceso es una puerta abierta a datos sensibles y clientes.' },
  ],
  oportunidades: [
    { titulo:'Pérdida de clientes que nadie cuantifica', riesgo:'Alto',
      impacto:'Lo que no se mide no se gestiona: si no se sabe cuántos clientes se pierden, la fuga sigue mes a mes en silencio.' },
    { titulo:'Ventas perdidas por falta de seguimiento', riesgo:'Alto',
      impacto:'Cada oportunidad que no se retoma es ingreso que se va directo a la competencia sin pelearlo.' },
    { titulo:'Oportunidades que llegan y no se atienden', riesgo:'Alto',
      impacto:'Recibir interés y no responder es pagar por atraer clientes para luego dejarlos ir en la puerta.' },
    { titulo:'Horas drenadas en tareas repetitivas', riesgo:'Medio',
      impacto:'El tiempo que se va en lo repetitivo es tiempo que no se dedica a vender, atender ni hacer crecer el negocio.' },
    { titulo:'Cuellos de botella sin identificar', riesgo:'Medio',
      impacto:'Mientras el principal cuello de botella siga oculto, todo el esfuerzo extra choca contra el mismo límite.' },
  ],
};

// ── Catálogo de OPORTUNIDADES (remedio a cada hallazgo) ──
const OPPS = {
  direccion: [
    { titulo:'Definir objetivos anuales y bajarlos a metas medibles', beneficio:'Un norte común que alinea a todo el equipo',  esfuerzo:'Bajo',  impacto:'Alto' },
    { titulo:'Establecer indicadores de crecimiento del negocio',     beneficio:'Saber con datos si la empresa avanza',          esfuerzo:'Bajo',  impacto:'Medio' },
    { titulo:'Implementar un tablero de control para decidir con datos', beneficio:'Decisiones más rápidas y certeras',           esfuerzo:'Medio', impacto:'Alto' },
    { titulo:'Instaurar una revisión periódica de indicadores',       beneficio:'Detectar desvíos a tiempo y corregir rápido',   esfuerzo:'Bajo',  impacto:'Medio' },
    { titulo:'Diagnosticar los desafíos clave y construir un plan',   beneficio:'Foco en lo que de verdad mueve el negocio',     esfuerzo:'Medio', impacto:'Alto' },
  ],
  operacion: [
    { titulo:'Eliminar la doble digitación integrando los sistemas',  beneficio:'Fin del reproceso y menos errores',             esfuerzo:'Medio', impacto:'Alto' },
    { titulo:'Centralizar la información en un solo lugar',            beneficio:'Acceso inmediato y orden en el equipo',         esfuerzo:'Medio', impacto:'Medio' },
    { titulo:'Automatizar las tareas repetitivas de la semana',       beneficio:'Recuperar horas del equipo cada semana',        esfuerzo:'Medio', impacto:'Alto' },
    { titulo:'Documentar y estandarizar los procesos clave',          beneficio:'Delegar y capacitar sin fricción',              esfuerzo:'Bajo',  impacto:'Alto' },
    { titulo:'Reducir la dependencia de personas con procesos claros',beneficio:'Continuidad asegurada del negocio',             esfuerzo:'Medio', impacto:'Alto' },
    { titulo:'Liberar al dueño de lo administrativo',                 beneficio:'Tiempo para estrategia y crecimiento',          esfuerzo:'Medio', impacto:'Alto' },
  ],
  tecnologia: [
    { titulo:'Digitalizar la operación con herramientas adecuadas',   beneficio:'Procesos que escalan y menos errores',          esfuerzo:'Medio', impacto:'Alto' },
    { titulo:'Integrar los sistemas en una plataforma conectada',     beneficio:'Trazabilidad de punta a punta',                 esfuerzo:'Alto',  impacto:'Alto' },
    { titulo:'Centralizar la información de clientes (CRM)',           beneficio:'Cero fuga de oportunidades',                    esfuerzo:'Medio', impacto:'Alto' },
    { titulo:'Automatizar los procesos de mayor carga manual',        beneficio:'Recuperar horas y eliminar olvidos',            esfuerzo:'Medio', impacto:'Alto' },
    { titulo:'Priorizar qué automatizar con un mapa de tareas',       beneficio:'Quick wins de automatización claros',           esfuerzo:'Bajo',  impacto:'Medio' },
  ],
  ventas: [
    { titulo:'Construir un flujo predecible de prospectos',           beneficio:'Oportunidades constantes mes a mes',            esfuerzo:'Medio', impacto:'Alto' },
    { titulo:'Implementar seguimiento automático de prospectos',      beneficio:'Recuperar ventas que hoy se enfrían',           esfuerzo:'Bajo',  impacto:'Alto' },
    { titulo:'Ordenar el seguimiento de cotizaciones en un CRM',      beneficio:'Más cierres sobre las oportunidades actuales',   esfuerzo:'Medio', impacto:'Alto' },
    { titulo:'Asegurar respuesta rápida con alertas y automatización',beneficio:'Ganar las ventas que se pierden por demora',     esfuerzo:'Bajo',  impacto:'Alto' },
    { titulo:'Tener un pipeline visible de prospectos activos',       beneficio:'Proyectar ventas y enfocar al equipo',          esfuerzo:'Bajo',  impacto:'Alto' },
    { titulo:'Medir y mejorar la tasa de conversión',                 beneficio:'Identificar fugas y subir el cierre',           esfuerzo:'Bajo',  impacto:'Medio' },
    { titulo:'Segmentar clientes y calcular su valor de vida',        beneficio:'Foco e inversión en quienes más dejan',         esfuerzo:'Medio', impacto:'Alto' },
  ],
  marketing: [
    { titulo:'Crear canales propios de generación de demanda',        beneficio:'Clientes que no dependen del boca a boca',       esfuerzo:'Medio', impacto:'Alto' },
    { titulo:'Lanzar campañas digitales para más oportunidades',      beneficio:'Más prospectos calificados al mes',             esfuerzo:'Medio', impacto:'Alto' },
    { titulo:'Medir el retorno de cada canal y campaña',              beneficio:'Invertir solo en lo que funciona',              esfuerzo:'Bajo',  impacto:'Medio' },
    { titulo:'Fortalecer la presencia digital (web y Google)',        beneficio:'Más confianza y visibilidad al ser buscado',     esfuerzo:'Medio', impacto:'Medio' },
    { titulo:'Posicionar la empresa donde está su cliente',           beneficio:'Estar presente en el momento de decidir',       esfuerzo:'Medio', impacto:'Medio' },
    { titulo:'Diseñar una estrategia de recompra y fidelización',     beneficio:'Más ventas a quienes ya confían',               esfuerzo:'Medio', impacto:'Alto' },
  ],
  finanzas: [
    { titulo:'Separar las finanzas del negocio de las personales',    beneficio:'Claridad real sobre la salud del negocio',       esfuerzo:'Bajo',  impacto:'Alto' },
    { titulo:'Identificar los productos y clientes más rentables',    beneficio:'Enfocar el negocio en lo que deja',             esfuerzo:'Medio', impacto:'Alto' },
    { titulo:'Calcular el margen real por producto o servicio',       beneficio:'Precios y decisiones sobre base sólida',        esfuerzo:'Medio', impacto:'Alto' },
    { titulo:'Proyectar el flujo de caja a 3 meses',                  beneficio:'Anticipar la liquidez y evitar apuros',         esfuerzo:'Bajo',  impacto:'Alto' },
    { titulo:'Construir un plan de contingencia financiera',          beneficio:'Resiliencia ante caídas de venta',              esfuerzo:'Bajo',  impacto:'Medio' },
    { titulo:'Implementar revisión mensual contra presupuesto',       beneficio:'Control del desvío mes a mes',                  esfuerzo:'Bajo',  impacto:'Medio' },
  ],
  seguridad: [
    { titulo:'Implementar un plan de respaldo y recuperación',        beneficio:'Continuidad del negocio ante incidentes',        esfuerzo:'Bajo',  impacto:'Alto' },
    { titulo:'Configurar respaldos automáticos en la nube',           beneficio:'Tranquilidad sin depender de la memoria',       esfuerzo:'Bajo',  impacto:'Alto' },
    { titulo:'Designar un responsable de seguridad digital',          beneficio:'Seguridad gestionada, no improvisada',          esfuerzo:'Bajo',  impacto:'Medio' },
    { titulo:'Ordenar accesos y permisos por rol',                    beneficio:'Menor riesgo de fraude y fuga de datos',        esfuerzo:'Medio', impacto:'Alto' },
    { titulo:'Establecer un protocolo de baja de accesos',            beneficio:'Cerrar puertas abiertas de inmediato',          esfuerzo:'Bajo',  impacto:'Medio' },
  ],
  oportunidades: [
    { titulo:'Medir la fuga de clientes y sus causas',               beneficio:'Visibilizar y frenar la pérdida mensual',        esfuerzo:'Bajo',  impacto:'Alto' },
    { titulo:'Cerrar la fuga con seguimiento automático',            beneficio:'Recuperar ventas hoy perdidas',                 esfuerzo:'Bajo',  impacto:'Alto' },
    { titulo:'Asegurar que ninguna oportunidad quede sin atender',   beneficio:'Aprovechar todo lo que ya llega',               esfuerzo:'Medio', impacto:'Alto' },
    { titulo:'Recuperar horas automatizando lo repetitivo',         beneficio:'Tiempo para lo que genera valor',               esfuerzo:'Medio', impacto:'Alto' },
    { titulo:'Identificar y resolver el principal cuello de botella',beneficio:'Destrabar el crecimiento del negocio',          esfuerzo:'Medio', impacto:'Alto' },
  ],
};

// ── Pesos para priorización ──
const RIESGO_W   = { Alto:3, Medio:2, Bajo:1 };
const IMPACTO_W  = { Alto:3, Medio:2, Bajo:1 };
const ESFUERZO_W = { Bajo:3, Medio:2, Alto:1 }; // menor esfuerzo => mayor prioridad

// Tier de prioridad de una oportunidad a partir de su puntaje compuesto.
function _prioridadTier(p) {
  if (p >= 6)   return 'Alta';
  if (p >= 4.5) return 'Media';
  return 'Baja';
}

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

// Lee el arreglo de respuestas de un pilar, soportando el shape nuevo (diag.scores)
// y el viejo (diag.scoresTec / scoresVentas / scoresFinanzas → tecnologia/ventas/finanzas).
function _areaArr(diag, key) {
  if (diag.scores && Array.isArray(diag.scores[key])) return diag.scores[key];
  const legacy = { tecnologia:'scoresTec', ventas:'scoresVentas', finanzas:'scoresFinanzas' }[key];
  return (legacy && diag[legacy]) || [];
}

// ── Cuantificación económica (valor en juego) ──
function _parseMonto(v) {
  if (typeof v === 'number') return v > 0 ? v : 0;
  const n = parseInt(String(v ?? '').replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
function _economia(areas, facturacionEst) {
  const fact = _parseMonto(facturacionEst);
  if (!fact) return null;
  const porArea = areas.filter(a => a.evaluada).map(a => {
    const gap = Math.max(0, (100 - a.score) / 100);
    const alto = Math.round(fact * (VALOR_FACTOR[a.key] || 0.05) * gap);
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

  // 1) Pilares con puntaje, nivel, fortalezas y debilidades.
  //    Clasificación por madurez: rating 4-5 (≥0.75) = fortaleza · rating 1-2 (≤0.25)
  //    = hallazgo · rating 3 (0.5) y sin responder no generan ni fortaleza ni hallazgo.
  const areas = AREAS_INFORME.map(a => {
    const arr = _areaArr(diag, a.key);
    const answered = arr.filter(v => v !== null && v !== undefined);
    const evaluada = answered.length > 0;
    const yesIdx = [], noIdx = [];
    arr.forEach((v, i) => {
      if (v === null || v === undefined) return;
      const av = answerValue(v);
      if (av >= 0.75) yesIdx.push(i);
      else if (av <= 0.25) noIdx.push(i);
    });
    const score = _scoreArea(arr);
    const targetScore = Math.min(95, score + Math.round((100 - score) * 0.6));
    return {
      ...a,
      score, targetScore, evaluada,
      nivel: nivelFor(score),
      subdimensiones: _subdimensiones(a.key, arr),
      fortalezas: yesIdx.map(i => STRENGTHS[a.key][i]).filter(Boolean),
      debilidades: noIdx.map(i => FINDINGS[a.key][i]?.titulo).filter(Boolean),
      _noIdx: noIdx,
    };
  });

  const evaluadas = areas.filter(a => a.evaluada);
  const base = evaluadas.length ? evaluadas : areas;

  // 2) Índice general + nivel + objetivo (solo sobre pilares evaluados)
  const overall = Math.round(base.reduce((s, a) => s + a.score, 0) / base.length);
  const nivel = nivelFor(overall);
  const target = Math.round(base.reduce((s, a) => s + a.targetScore, 0) / base.length);

  // 2.5) Benchmark (referencia Tríada por rubro/tamaño) + cuantificación ($)
  const benchmarkContext = !!(prospecto?.rubro || prospecto?.tamano);
  areas.forEach(a => {
    a.benchmark = benchmarkFor(a.key, prospecto?.rubro, prospecto?.tamano);
    a.vsBenchmark = a.score - a.benchmark;
  });
  const benchmarkOverall = Math.round(base.reduce((s, a) => s + a.benchmark, 0) / base.length);
  const economia = _economia(areas, prospecto?.facturacionEst);

  // 3) HALLAZGOS — todos los "rating bajo", ordenados por riesgo, top 6
  let hallazgos = [];
  areas.forEach(a => {
    a._noIdx.forEach(i => {
      const f = FINDINGS[a.key][i];
      if (f) hallazgos.push({ ...f, area: a.short, areaColor: a.color, areaIcon: a.icon });
    });
  });
  hallazgos.sort((x, y) => RIESGO_W[y.riesgo] - RIESGO_W[x.riesgo]);
  (diag.hallazgos || []).forEach(h => {
    if (hallazgos.length < 6) hallazgos.push({ titulo: h, impacto: 'Observación registrada por el consultor durante el diagnóstico.', riesgo: 'Medio', area: 'Transversal', areaColor: '#16234A', areaIcon: '📌' });
  });
  const topHallazgos = hallazgos.slice(0, 6);

  // 4) OPORTUNIDADES — remedios priorizados con tier Alta/Media/Baja, top 6
  let oportunidades = [];
  areas.forEach(a => {
    a._noIdx.forEach(i => {
      const o = OPPS[a.key][i];
      if (o) {
        const prioridad = IMPACTO_W[o.impacto] * 1.5 + ESFUERZO_W[o.esfuerzo];
        oportunidades.push({ ...o, area: a.short, areaColor: a.color, areaKey: a.key, prioridad, tier: _prioridadTier(prioridad) });
      }
    });
  });
  oportunidades.sort((x, y) => y.prioridad - x.prioridad);
  (diag.oportunidades || []).forEach(o => {
    if (oportunidades.length < 6) oportunidades.push({ titulo: o, beneficio: 'Oportunidad identificada por el consultor.', esfuerzo: 'Medio', impacto: 'Medio', area: 'Transversal', areaColor: '#16234A', prioridad: 0, tier: 'Media' });
  });
  const topOportunidades = oportunidades.slice(0, 6);

  // 5) RECOMENDACIONES INTELIGENTES — servicios Tríada por pilar bajo el umbral (<60),
  //    del más débil al más fuerte. Es el puente diagnóstico → propuesta comercial.
  const recomendaciones = evaluadas
    .filter(a => a.score < 60)
    .sort((x, y) => x.score - y.score)
    .map(a => ({ areaKey: a.key, area: a.label, short: a.short, color: a.color, icon: a.icon,
      score: a.score, nivel: a.nivel, servicios: SERVICIOS[a.key] || [] }));

  // 6) PLAN DE ACCIÓN — agrupar oportunidades por horizonte (según esfuerzo)
  const plan = _buildPlan(oportunidades);

  // 7) Narrativa dinámica
  const ordenadas = [...base].sort((a, b) => a.score - b.score);
  const peor = ordenadas[0];
  const segundaPeor = ordenadas[1] || ordenadas[0];
  const mejor = ordenadas[ordenadas.length - 1];

  const narrativaCtx = { empresa, overall, nivel, target, areas: base, mejor, peor, segundaPeor,
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
    recomendaciones,
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
  if (!corto.length)   corto.push({ titulo:'Designar un responsable interno del plan de mejora', beneficio:'Asegurar avance y accountability', area:'Transversal', areaColor:'#16234A' });
  if (!mediano.length) mediano.push({ titulo:'Capacitar al equipo en los nuevos procesos y herramientas', beneficio:'Adopción efectiva y sostenida', area:'Transversal', areaColor:'#16234A' });
  if (!largo.length)   largo.push({ titulo:'Revisar y ajustar la estrategia según los resultados', beneficio:'Mejora continua basada en evidencia', area:'Transversal', areaColor:'#16234A' });
  return {
    corto:   corto.slice(0, 5),
    mediano: mediano.slice(0, 5),
    largo:   largo.slice(0, 4),
  };
}

// ── Generadores de narrativa ──
function _fmtM(n) {
  const v = n || 0;
  return v >= 1e6 ? '$' + Math.round(v / 1e6).toLocaleString('es-CL') + 'M' : '$' + Math.round(v).toLocaleString('es-CL');
}

// Insight cruzado: qué historia cuentan los pilares EN CONJUNTO. Generalizado a N áreas.
function _insightPatron(areas) {
  const sorted = [...areas].sort((a, b) => b.score - a.score);
  if (sorted.length < 2) {
    return 'El diagnóstico evalúa la madurez del negocio para enfocar dónde está la mayor oportunidad de mejora.';
  }
  const best = sorted[0], worst = sorted[sorted.length - 1];
  const segundoPeor = sorted[sorted.length - 2];
  const spread = best.score - worst.score;
  if (spread <= 12) {
    if (best.score >= 70) return 'Los pilares avanzan parejos y a buen nivel: el salto vendrá de optimizar el conjunto y sostener las buenas prácticas, más que de corregir un punto aislado.';
    if (worst.score < 45) return 'Los pilares comparten brechas de magnitud similar: conviene ordenar primero lo esencial en cada uno antes de pensar en optimizar.';
    return 'La madurez es pareja entre los pilares evaluados, sin un punto crítico aislado; lo más rentable es subir el conjunto un escalón de forma coordinada.';
  }
  return `El desempeño es desparejo: ${best.short} opera como fortaleza (${best.score}/100), mientras ${worst.short} (${worst.score}/100) y ${segundoPeor.short} (${segundoPeor.score}/100) concentran la mayor brecha y, con ella, el mayor potencial de mejora.`;
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
