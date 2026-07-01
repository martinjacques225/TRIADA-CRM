// ============================================================================
// screens/demos.js — Vitrina de demos (plantillas de producto try-before-buy).
// Cada demo se abre a pantalla completa con TODAS sus funciones. Las demos viven
// vendorizadas junto a la PWA (../demos/<id>/, mismo despliegue de GitHub Pages),
// así no dependen de terceros. Agregar una demo = una entrada en DEMOS.
// ============================================================================
import { escHtml } from '../core.js';
import { ic, toast, haptic } from '../ui.js';

const e = escHtml;

// `url` se resuelve contra la ubicación de la app: relativa (../demos/…) para las
// que servimos nosotros, o absoluta si algún día una vive en otro dominio.
const DEMOS = [
  {
    id: 'conserje',
    nombre: 'Conserje IA',
    tagline: 'trIA atiende, agenda y cierra por ti, 24/7',
    desc: 'trIA contesta tu WhatsApp y tu teléfono a cualquier hora: responde, agenda citas, captura leads, resume llamadas y cotiza —dejando cada cosa anotada en tu CRM. Elige una situación y míralo resolverla solo, en un teléfono real. Demo con conversaciones de ejemplo.',
    chips: ['WhatsApp 24/7', 'Agenda sola', 'Capta leads', 'Resume llamadas'],
    url: '../demos/conserje/',
    icon: 'whatsapp',
    grad: ['#25A560', 'var(--navy)'],
  },
  {
    id: 'remodela',
    nombre: 'Simulador de Remodelación',
    tagline: 'Mira tu espacio remodelado antes de invertir',
    desc: 'Sube una foto de tu espacio y trIA te lo muestra remodelado en varios estilos, con su paleta, materiales y presupuesto. Trae 4 espacios de ejemplo —living, cocina, dormitorio y local comercial—, cada uno con sus estilos. Arrastra para comparar el antes y el después, en fotorrealista.',
    chips: ['Antes/después', '4 espacios', 'Varios estilos', 'Presupuesto'],
    url: '../demos/remodela/',
    icon: 'home',
    grad: ['#C57B57', 'var(--navy)'],
  },
  {
    id: 'documentos',
    nombre: 'Generador de Documentos',
    tagline: 'Cotizaciones, contratos y cartas con tu marca',
    desc: 'Elige el tipo de documento —cotización, contrato, carta o recibo—, pon tu marca (nombre y color) y trIA lo arma con aspecto profesional en segundos, editable en vivo y listo para descargar en PDF. Demo con datos de ejemplo.',
    chips: ['Cotización', 'Contrato', 'Carta', 'Recibo'],
    url: '../demos/documentos/',
    icon: 'fileText',
    grad: ['#C2871A', 'var(--navy)'],
  },
  {
    id: 'academia',
    nombre: 'Academia Online',
    tagline: 'Vende tus cursos con un tutor IA',
    desc: 'Tu escuela online con tu marca: video-lecciones, un tutor trIA que responde las dudas de cada alumno al instante, seguimiento de progreso y certificado al finalizar. Toma la lección de ejemplo y ve cómo funciona. Demo sin backend.',
    chips: ['Cursos', 'Tutor trIA', 'Progreso', 'Certificado'],
    url: '../demos/academia/',
    icon: 'video',
    grad: ['#5B4B8A', 'var(--navy)'],
  },
  {
    id: 'tienda',
    nombre: 'Tienda Online',
    tagline: 'Tu ecommerce con marca, carrito y pago',
    desc: 'Una tienda para vender por internet con tu marca: catálogo, buscador con trIA, carrito, checkout y confirmación de pedido. Arma una compra en la tienda de ejemplo y llega hasta el pago. Demo sin backend ni cobros reales.',
    chips: ['Catálogo', 'Carrito', 'Checkout', 'trIA'],
    url: '../demos/tienda/',
    icon: 'cart',
    grad: ['#7A5230', 'var(--navy)'],
  },
  {
    id: 'inventario',
    nombre: 'Control de Inventario',
    tagline: 'Tu stock bajo control, sin planillas',
    desc: 'Panel de inventario con el valor de tu bodega, alertas de quiebre y por agotarse, y reposición sugerida por trIA. Ajusta el stock con + / − y mira cómo se actualizan los indicadores y las alertas en vivo. Demo con un almacén de ejemplo.',
    chips: ['Stock', 'Alertas', 'Valor', 'Reposición trIA'],
    url: '../demos/inventario/',
    icon: 'package',
    grad: ['var(--teal)', 'var(--navy)'],
  },
  {
    id: 'encuestas',
    nombre: 'Encuestas',
    tagline: 'Escucha a tus clientes, con resumen de trIA',
    desc: 'Encuestas de satisfacción y NPS con resultados en vivo y un resumen inteligente de trIA. Responde la encuesta de ejemplo (estrellas, NPS, opciones y comentario) y mira cómo se mueven los resultados y el análisis. Demo sin backend.',
    chips: ['Satisfacción', 'NPS', 'Resultados', 'Resumen trIA'],
    url: '../demos/encuestas/',
    icon: 'clipboard',
    grad: ['#2F8C93', 'var(--navy)'],
  },
  {
    id: 'proyectos',
    nombre: 'Gestión de Proyectos',
    tagline: 'Tablero kanban con avance de trIA',
    desc: 'Un tablero para que tus proyectos avancen a la vista de todos: tareas con responsable, prioridad y plazo, en columnas Por hacer → En progreso → En revisión → Listo. Arrastra las tarjetas y mira el avance y el resumen de trIA actualizarse. Demo sin backend.',
    chips: ['Kanban', 'Tareas', 'Avance', 'Resumen trIA'],
    url: '../demos/proyectos/',
    icon: 'kanban',
    grad: ['#3E6E8E', 'var(--navy)'],
  },
  {
    id: 'analizador',
    nombre: 'Analizador Comercial',
    tagline: 'Descubre dónde se te caen las ventas',
    desc: 'trIA lee tu embudo de ventas de punta a punta y detecta dónde se pierde la plata: cuellos de botella, cotizaciones que se enfrían, vendedores bajo la media y clientes sin seguimiento. Ajusta tus números y mira la salud comercial y las ventas en riesgo moverse en vivo, con un plan para recuperarlas. Demo con un equipo de ejemplo.',
    chips: ['Embudo', 'Conversión', 'Ranking equipo', 'Plan trIA'],
    url: '../demos/analizador/',
    icon: 'funnel',
    grad: ['#3D7E8C', 'var(--navy)'],
  },
  {
    id: 'documental',
    nombre: 'Centro Documental',
    tagline: 'Tus documentos, con acceso por rol',
    desc: 'Contratos, manuales, facturas y certificaciones en un solo lugar, con permisos por rol: cambia entre Administración, RRHH, Finanzas y Colaborador y mira cómo la bóveda reserva lo confidencial de cada área. Busca, filtra, abre y sube documentos. Demo con datos de ejemplo.',
    chips: ['Permisos por rol', 'Buscar', 'Categorías', 'Subir'],
    url: '../demos/documental/',
    icon: 'lock',
    grad: ['#4A5D7E', 'var(--navy)'],
  },
  {
    id: 'contratacion',
    nombre: 'Contratación Inteligente',
    tagline: 'trIA rankea a tus candidatos',
    desc: 'Sube CV, pruebas y entrevistas y trIA evalúa a cada candidato y arma un ranking según lo que valoras. Mueve el peso de cada criterio —experiencia, habilidades, prueba, entrevista— y mira el ranking reordenarse en vivo, con la ficha de cada persona (fortalezas, banderas y resumen de trIA). Demo con candidatos de ejemplo.',
    chips: ['Ranking', 'CV + pruebas', 'Criterios', 'Fichas'],
    url: '../demos/contratacion/',
    icon: 'userPlus',
    grad: ['#6B5B95', 'var(--navy)'],
  },
  {
    id: 'compras',
    nombre: 'Gestión de Compras',
    tagline: 'A quién comprar, no solo lo más barato',
    desc: 'Sube tus cotizaciones y trIA las compara por precio, plazo, garantía y reputación, te muestra el precio de mercado y recomienda al proveedor que más conviene. Cambia la cantidad, agrega una cotización y mira el ahorro y la recomendación actualizarse en vivo. Demo con una compra de ejemplo.',
    chips: ['Cotizaciones', 'Precio de mercado', 'Ahorro', 'Recomienda trIA'],
    url: '../demos/compras/',
    icon: 'tag',
    grad: ['#2F7E6B', 'var(--navy)'],
  },
  {
    id: 'pedidos',
    nombre: 'Pedidos Online',
    tagline: 'Tu carta digital con seguimiento en vivo',
    desc: 'Tu carta para pedir por internet: el cliente arma su pedido, elige retiro o delivery y sigue en vivo cada paso —recibido, en cocina, en camino, entregado—. Arma un pedido en el local de ejemplo y mira el seguimiento avanzar solo. Demo sin backend ni cobros reales.',
    chips: ['Carta digital', 'Carrito', 'Retiro/Delivery', 'Seguimiento en vivo'],
    url: '../demos/pedidos/',
    icon: 'bag',
    grad: ['#B0632A', 'var(--navy)'],
  },
  {
    id: 'auditor',
    nombre: 'Auditor de Imagen',
    tagline: 'Cómo te ve un cliente antes de que hables',
    desc: 'Responde un autodiagnóstico rápido —logo, web, redes, coherencia y presencia— y trIA audita tu imagen corporativa: un puntaje de 0 a 100, los hallazgos por dimensión y un plan concreto para verte a la altura de tu trabajo.',
    chips: ['Logo', 'Web', 'Redes', 'Coherencia'],
    url: '../demos/auditor/',
    icon: 'eye',
    grad: ['var(--teal)', 'var(--navy)'],
  },
  {
    id: 'gemelo',
    nombre: 'Gemelo Virtual',
    tagline: 'Simula tus decisiones antes de tomarlas',
    desc: 'Pon tu negocio (ventas, margen, costos) y mueve las palancas —subir precios, contratar, invertir en vender— para ver EN VIVO qué pasa con tu utilidad, tu margen y tu proyección a 12 meses. Decidir con datos, no con corazonadas.',
    chips: ['Precios', 'Contratar', 'Proyección', 'Utilidad'],
    url: '../demos/gemelo/',
    icon: 'coins',
    grad: ['var(--teal)', 'var(--navy)'],
  },
  {
    id: 'fugas',
    nombre: 'Detección de Fugas',
    tagline: 'Descubre dónde se te va la plata',
    desc: 'trIA lee los números de un negocio (compras, ventas, gastos, operación) y detecta sobrecostos, mermas, horas perdidas y gastos hormiga: cuánto se fuga al mes y cómo cerrarlo. Demo con una empresa de ejemplo.',
    chips: ['Sobrecostos', 'Mermas', 'Horas perdidas', 'Gastos hormiga'],
    url: '../demos/fugas/',
    icon: 'trending',
    grad: ['var(--teal)', 'var(--navy)'],
  },
  {
    id: 'restaurant',
    nombre: 'CRM de Restaurantes',
    tagline: 'Operación completa en 4 roles',
    desc: 'Admin, Mesero, Cocina (KDS) y Cajero, cada uno con su propio panel. El flujo real encadena los roles: el mesero envía el pedido → la cocina lo prepara → la caja cobra.',
    chips: ['Admin', 'Mesero', 'Cocina KDS', 'Cajero'],
    url: '../demos/restaurant/',
    icon: 'utensils',
    grad: ['var(--teal)', 'var(--navy)'],
  },
  {
    id: 'barberia',
    nombre: 'Barbería Triada',
    tagline: 'Plataforma 4-en-1 con trIA',
    desc: 'Sitio web, reservas por WhatsApp acompañadas por trIA, escuela de cursos y el CRM del barbero. Trae un riel para cambiar color, tema y dispositivo en vivo frente al cliente.',
    chips: ['Web', 'Reservas', 'Cursos', 'CRM'],
    url: '../demos/barberia/',
    icon: 'scissors',
    grad: ['#1F6F5C', 'var(--navy)'],
  },
];

const byId = (id) => DEMOS.find((d) => d.id === id);
// URL absoluta (para abrir/compartir), resolviendo relativas contra la app.
const absUrl = (url) => { try { return new URL(url, location.href).href; } catch (_) { return url; } };

function openDemo(d) {
  haptic();
  window.open(absUrl(d.url), '_blank', 'noopener');
}

async function shareDemo(d) {
  const url = absUrl(d.url);
  if (navigator.share) {
    try { await navigator.share({ title: `Demo Tríada · ${d.nombre}`, text: `Mira esta demo de ${d.nombre} que armamos en Tríada:`, url }); }
    catch (_) { /* el usuario canceló el diálogo nativo: no molestar */ }
    return;
  }
  try { await navigator.clipboard.writeText(url); toast('Enlace copiado ✓', 'ok'); }
  catch (_) { toast(url, 'info', 6000); }
}

function demoCard(d) {
  return `
    <article class="card card--tap" data-demo="${e(d.id)}" style="padding:0;overflow:hidden;border-radius:var(--radius-lg)">
      <div style="display:flex;align-items:center;gap:13px;padding:16px 16px 0">
        <span style="width:54px;height:54px;border-radius:16px;display:flex;align-items:center;justify-content:center;color:#fff;flex:none;background:linear-gradient(150deg,${d.grad[0]},${d.grad[1]});box-shadow:var(--shadow-sm)">${ic(d.icon, { size: 26, sw: 1.9 })}</span>
        <div style="flex:1;min-width:0">
          <div class="serif" style="font-size:18px;font-weight:600;color:var(--ink);line-height:1.15">${e(d.nombre)}</div>
          <div class="ell" style="font-size:12.5px;color:var(--teal);font-weight:600;margin-top:2px">${e(d.tagline)}</div>
        </div>
        <span class="badge" style="color:var(--green);background:var(--green-l);flex:none"><span class="dot"></span>En vivo</span>
      </div>
      <p style="margin:11px 16px 0;font-size:13px;color:var(--text2);line-height:1.5">${e(d.desc)}</p>
      <div class="chip-wrap" style="padding:12px 16px 0">${d.chips.map((c) => `<span class="chip" style="cursor:default;padding:5px 11px;font-size:11.5px">${e(c)}</span>`).join('')}</div>
      <div style="display:flex;gap:9px;padding:14px 16px">
        <button class="btn btn--primary btn--sm" data-open="${e(d.id)}" style="flex:1">${ic('external', { size: 16, sw: 2 })} Abrir demo</button>
        <button class="btn btn--ghost btn--sm" data-share="${e(d.id)}" aria-label="Compartir enlace" style="width:46px;padding:0">${ic('share', { size: 17 })}</button>
      </div>
    </article>`;
}

export default {
  chrome: false,
  render() {
    return `
    <section class="screen">
      <header class="hdr hdr--bar">
        <div>
          <h1 class="hdr__title">Demos</h1>
          <div class="hdr__sub">Plantillas para mostrar en vivo</div>
        </div>
        <button class="icon-btn icon-btn--bare" id="demClose" style="width:38px;height:38px" aria-label="Cerrar">${ic('x', { size: 20, sw: 2 })}</button>
      </header>

      <div class="pad">
        <p style="font-size:13px;color:var(--text2);line-height:1.5;margin:2px 2px 16px">
          Productos que armamos en Tríada, listos para probar. Toca uno y se abre completo, con todas sus funciones — ideal para mostrarlo en una reunión.
        </p>
        <div class="list list--lg">
          ${DEMOS.map(demoCard).join('')}
        </div>
        <div style="display:flex;align-items:center;justify-content:center;gap:7px;margin-top:22px;font-size:11.5px;color:var(--text3)">
          ${ic('external', { size: 13, sw: 1.8 })} Se abren en una pestaña aparte; vuelves a la app cuando quieras.
        </div>
      </div>
    </section>`;
  },

  mount(app) {
    const host = document.getElementById('screen');
    host.querySelector('#demClose').addEventListener('click', () => app.navigate('hoy'));
    // Tarjeta completa = abrir. Los botones internos paran la propagación para no
    // disparar dos veces (abrir) o abrir cuando se quería compartir.
    host.querySelectorAll('[data-demo]').forEach((c) => c.addEventListener('click', () => { const d = byId(c.getAttribute('data-demo')); if (d) openDemo(d); }));
    host.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', (ev) => { ev.stopPropagation(); const d = byId(b.getAttribute('data-open')); if (d) openDemo(d); }));
    host.querySelectorAll('[data-share]').forEach((b) => b.addEventListener('click', (ev) => { ev.stopPropagation(); const d = byId(b.getAttribute('data-share')); if (d) shareDemo(d); }));
  },
};
