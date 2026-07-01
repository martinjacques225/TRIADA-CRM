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
