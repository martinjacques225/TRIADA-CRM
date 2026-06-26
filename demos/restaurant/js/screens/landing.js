/* ============================================================================
   screens/landing.js · Landing pública — sitio web del restaurante
   La cara comercial que ve cualquier visitante: hero, carta destacada,
   reservas, opiniones, ubicación y CTA. Sin login.
   Portado 1:1 del prototipo de Claude Design (estilos inline para conservar
   la estética de marca de la landing, distinta del shell del CRM).
   ========================================================================== */

import { clp, esc } from '../util.js';
import { MENU } from '../data.js';

const GRADS = [
  'linear-gradient(135deg, #0E6F7B, #16234A)',
  'linear-gradient(135deg, #2E9B73, #0C7C88)',
  'linear-gradient(135deg, #1B3A63, #0C7C88)',
  'linear-gradient(135deg, #0C7C88, #2BA0AB)',
];

const FEATURED = ['e1', 'g1', 'f2', 'f3'];

const star = '<svg width="18" height="18" viewBox="0 0 24 24" fill="#C2871A" stroke="none"><path d="m12 2 3 6.5 7 .8-5 4.9 1.3 7-6.6-3.6L6 21.1l1.3-7-5-4.9 7-.8Z"/></svg>';
const stars = star.repeat(5);

function review(quote, name, role, avBg, initials) {
  return `<div style="background:#FFFFFF;border:1px solid #E5E9F0;border-radius:18px;padding:28px;box-shadow:0 4px 14px rgba(20,32,55,.06);">
    <div style="display:flex;gap:3px;margin-bottom:14px;">${stars}</div>
    <p style="margin:0 0 18px;font-size:15.5px;line-height:1.65;color:#2A3553;">${esc(quote)}</p>
    <div style="display:flex;align-items:center;gap:11px;"><div style="width:40px;height:40px;border-radius:9999px;background:${avBg};color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;">${initials}</div><div><div style="font-size:14px;font-weight:700;color:#142037;">${esc(name)}</div><div style="font-size:12.5px;color:#94A0B6;">${esc(role)}</div></div></div>
  </div>`;
}

export function renderLanding() {
  const dishes = FEATURED.map((id, i) => {
    const m = MENU.find(x => x.id === id);
    return `<div class="lp-card" style="background:#FFFFFF;border:1px solid #E5E9F0;border-radius:18px;overflow:hidden;box-shadow:0 4px 14px rgba(20,32,55,.06);transition:transform .2s, box-shadow .2s;">
      <div style="height:170px;background:${GRADS[i % GRADS.length]};position:relative;overflow:hidden;">
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none" style="position:absolute;right:-16px;bottom:-16px;opacity:0.26;"><path d="M26 90 L60 62 L94 90" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M26 73 L60 45 L94 73" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M26 56 L60 28 L94 56" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <div style="padding:18px 20px 20px;">
        <h3 style="margin:0;font-size:17px;font-weight:700;color:#142037;">${esc(m.name)}</h3>
        <p style="margin:6px 0 14px;font-size:13px;color:#94A0B6;line-height:1.5;min-height:38px;">${esc(m.desc)}</p>
        <span style="font-family:var(--font-serif);font-size:20px;font-weight:600;color:#0A626C;font-variant-numeric:tabular-nums;">${clp(m.price)}</span>
      </div>
    </div>`;
  }).join('');

  return `<div data-screen="landing" style="background:#FFFFFF;">
    <style>
      /* Tipografía de marca: Newsreader con eje óptico activo en titulares. */
      [data-screen="landing"] h1, [data-screen="landing"] h2, [data-screen="landing"] h3 { font-optical-sizing: auto; }
      [data-screen="landing"] h2 { letter-spacing: -0.015em; }
      .lp-card:hover { transform: translateY(-4px); box-shadow: 0 18px 40px rgba(20,32,55,.14); }
      .lp-btn { transition: all .18s; }
      .lp-btn-primary:hover { background:#2BA0AB !important; transform: translateY(-2px); }
      .lp-btn-teal:hover { background:#0A626C !important; transform: translateY(-1px); }
      .lp-btn-ghost:hover { background:rgba(255,255,255,0.08) !important; }
      .lp-btn-white:hover { background:#ECF7F8 !important; transform: translateY(-2px); }
      @media (max-width: 860px){
        .lp-h1 { font-size: 40px !important; }
        .lp-nav-links { display:none !important; }
        .lp-grid-4 { grid-template-columns: repeat(2, 1fr) !important; }
        .lp-grid-2 { grid-template-columns: 1fr !important; }
        .lp-grid-3 { grid-template-columns: 1fr !important; }
        .lp-section { padding: 56px 22px !important; }
        .lp-hero-pad { padding: 40px 22px 64px !important; }
      }
    </style>

    <!-- HERO -->
    <section style="position:relative;background:linear-gradient(150deg, #16234A, #0F1933);color:#fff;overflow:hidden;">
      <div style="position:absolute;top:-120px;right:-80px;width:520px;height:520px;background:radial-gradient(circle, rgba(43,160,171,0.28), transparent 65%);pointer-events:none;"></div>
      <div style="position:absolute;right:4%;top:50%;transform:translateY(-50%);opacity:0.1;pointer-events:none;"><svg width="360" height="360" viewBox="0 0 120 120" fill="none"><path d="M26 90 L60 62 L94 90" stroke="#7FE0CF" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="M26 73 L60 45 L94 73" stroke="#7FE0CF" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="M26 56 L60 28 L94 56" stroke="#7FE0CF" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg></div>

      <div style="position:relative;max-width:1180px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;padding:24px 40px;">
        <div style="display:flex;align-items:center;gap:11px;">
          <svg width="28" height="28" viewBox="0 0 120 120" fill="none"><path d="M26 90 L60 62 L94 90" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/><path d="M26 73 L60 45 L94 73" stroke="#2BA0AB" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/><path d="M26 56 L60 28 L94 56" stroke="#3FB587" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span style="font-family:var(--font-serif);font-optical-sizing:auto;font-size:21px;font-weight:600;letter-spacing:-0.01em;">Restaurante Tríada<span style="color:#2BA0AB;">.</span></span>
        </div>
        <div class="lp-nav-links" style="display:flex;align-items:center;gap:30px;">
          <button data-action="landing:verCarta" style="border:none;background:none;cursor:pointer;font-family:inherit;font-size:14px;font-weight:500;color:#AEB9D4;">Carta</button>
          <span style="font-size:14px;font-weight:500;color:#AEB9D4;">Reservas</span>
          <span style="font-size:14px;font-weight:500;color:#AEB9D4;">Ubicación</span>
          <button data-action="landing:reservar" class="lp-btn lp-btn-white" style="height:42px;padding:0 20px;border:none;cursor:pointer;font-family:inherit;font-size:14px;font-weight:600;color:#142037;background:#fff;border-radius:10px;">Reservar</button>
        </div>
      </div>

      <div class="lp-hero-pad" style="position:relative;max-width:1180px;margin:0 auto;padding:64px 40px 96px;">
        <div style="max-width:680px;">
          <div style="display:inline-flex;align-items:center;gap:8px;font-size:11.5px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#7FE0CF;margin-bottom:22px;"><span style="width:24px;height:1px;background:#7FE0CF;"></span>Cocina internacional · Talca</div>
          <h1 class="lp-h1" style="margin:0;color:#FFFFFF;font-family:var(--font-serif);font-optical-sizing:auto;font-size:64px;font-weight:500;line-height:1.04;letter-spacing:-0.022em;">Sabores del mundo, en el corazón de Talca</h1>
          <p style="margin:26px 0 0;font-size:18px;line-height:1.6;color:#C2CBE0;max-width:540px;">Una mesa donde la cocina de autor se encuentra con el producto local. Reserva tu experiencia y déjanos sorprenderte.</p>
          <div style="display:flex;gap:13px;margin-top:36px;flex-wrap:wrap;">
            <button data-action="landing:reservar" class="lp-btn lp-btn-primary" style="display:inline-flex;align-items:center;gap:9px;height:52px;padding:0 26px;border:none;cursor:pointer;font-family:inherit;font-size:16px;font-weight:600;color:#fff;background:#0C7C88;border-radius:12px;box-shadow:0 8px 24px rgba(12,124,136,.4);">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="2.5"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>Reservar una mesa
            </button>
            <button data-action="landing:verCarta" class="lp-btn lp-btn-ghost" style="display:inline-flex;align-items:center;gap:9px;height:52px;padding:0 24px;border:1px solid rgba(255,255,255,0.24);cursor:pointer;font-family:inherit;font-size:16px;font-weight:600;color:#fff;background:transparent;border-radius:12px;">Ver nuestra carta</button>
          </div>
          <div style="display:flex;gap:44px;margin-top:56px;flex-wrap:wrap;">
            <div><div style="font-family:var(--font-serif);font-size:34px;font-weight:600;">12</div><div style="font-size:13px;color:#8C99B5;margin-top:2px;">años de historia</div></div>
            <div><div style="font-family:var(--font-serif);font-size:34px;font-weight:600;">60+</div><div style="font-size:13px;color:#8C99B5;margin-top:2px;">platos de autor</div></div>
            <div><div style="font-family:var(--font-serif);font-size:34px;font-weight:600;">4,9</div><div style="font-size:13px;color:#8C99B5;margin-top:2px;">valoración media</div></div>
          </div>
        </div>
      </div>
    </section>

    <!-- MENÚ DESTACADO -->
    <section class="lp-section" style="max-width:1180px;margin:0 auto;padding:96px 40px;">
      <div style="text-align:center;margin-bottom:48px;">
        <div style="font-size:11.5px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#0C7C88;margin-bottom:12px;">Nuestra carta</div>
        <h2 style="margin:0;font-family:var(--font-serif);font-size:42px;font-weight:600;color:#142037;letter-spacing:-0.01em;">Platos destacados</h2>
      </div>
      <div class="lp-grid-4" style="display:grid;grid-template-columns:repeat(4, 1fr);gap:22px;">
        ${dishes}
      </div>
      <div style="text-align:center;margin-top:40px;">
        <button data-action="landing:verCarta" class="lp-btn lp-btn-teal" style="display:inline-flex;align-items:center;gap:9px;height:50px;padding:0 26px;border:none;cursor:pointer;font-family:inherit;font-size:15px;font-weight:700;color:#fff;background:#0C7C88;border-radius:12px;box-shadow:0 6px 16px rgba(12,124,136,.3);">Ver carta completa<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
      </div>
    </section>

    <!-- RESERVAS -->
    <section class="lp-section" style="background:#F4F6F8;padding:88px 40px;">
      <div class="lp-grid-2" style="max-width:1000px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center;">
        <div>
          <div style="font-size:11.5px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#0C7C88;margin-bottom:12px;">Reservas</div>
          <h2 style="margin:0 0 16px;font-family:var(--font-serif);font-size:38px;font-weight:600;color:#142037;line-height:1.1;">Asegura tu mesa</h2>
          <p style="margin:0;font-size:16px;line-height:1.6;color:#5E6A85;">Reserva en segundos. Confirmamos por WhatsApp y recordamos tus preferencias para tu próxima visita.</p>
          <div style="display:flex;align-items:center;gap:10px;margin-top:24px;font-size:14px;color:#5E6A85;font-weight:500;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2E9B73" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>Confirmación inmediata · sin costo</div>
        </div>
        <div style="background:#FFFFFF;border:1px solid #E5E9F0;border-radius:18px;padding:26px;box-shadow:0 18px 48px rgba(20,32,55,.1);">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
            <div><label style="display:block;font-size:12px;font-weight:700;color:#5E6A85;margin-bottom:7px;">Fecha</label><div style="height:46px;display:flex;align-items:center;padding:0 13px;border:1px solid #D6DCE6;border-radius:10px;font-size:14px;color:#142037;font-weight:600;">Sáb 13 jun</div></div>
            <div><label style="display:block;font-size:12px;font-weight:700;color:#5E6A85;margin-bottom:7px;">Hora</label><div style="height:46px;display:flex;align-items:center;padding:0 13px;border:1px solid #D6DCE6;border-radius:10px;font-size:14px;color:#142037;font-weight:600;">21:00 hrs</div></div>
          </div>
          <div style="margin-bottom:18px;"><label style="display:block;font-size:12px;font-weight:700;color:#5E6A85;margin-bottom:7px;">Comensales</label><div style="height:46px;display:flex;align-items:center;padding:0 13px;border:1px solid #D6DCE6;border-radius:10px;font-size:14px;color:#142037;font-weight:600;">2 personas</div></div>
          <button data-action="landing:reservar" class="lp-btn lp-btn-teal" style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;height:50px;border:none;cursor:pointer;font-family:inherit;font-size:15.5px;font-weight:700;color:#fff;background:#0C7C88;border-radius:12px;box-shadow:0 6px 16px rgba(12,124,136,.3);">Confirmar reserva</button>
        </div>
      </div>
    </section>

    <!-- OPINIONES -->
    <section class="lp-section" style="max-width:1180px;margin:0 auto;padding:96px 40px;">
      <div style="text-align:center;margin-bottom:48px;">
        <div style="font-size:11.5px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#0C7C88;margin-bottom:12px;">Opiniones</div>
        <h2 style="margin:0;font-family:var(--font-serif);font-size:42px;font-weight:600;color:#142037;">Lo que dicen nuestros comensales</h2>
      </div>
      <div class="lp-grid-3" style="display:grid;grid-template-columns:repeat(3, 1fr);gap:22px;">
        ${review('"El ceviche de reineta es una locura y la atención impecable. Nuestro lugar favorito en Talca para celebrar."', 'Isabel Fuentes', 'Clienta frecuente', '#16234A', 'IF')}
        ${review('"Reservamos para un evento de empresa y todo salió perfecto. El privado y el menú degustación, de primer nivel."', 'Grupo Maule SpA', 'Cliente corporativo', '#5160C0', 'GM')}
        ${review('"La carta de vinos del Maule y el lomo vetado son imperdibles. Volvería cada semana sin dudarlo."', 'Andrés Cáceres', 'Cliente VIP', '#0C7C88', 'AC')}
      </div>
    </section>

    <!-- UBICACIÓN -->
    <section class="lp-section" style="background:#F4F6F8;padding:88px 40px;">
      <div class="lp-grid-2" style="max-width:1180px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:stretch;">
        <div style="position:relative;min-height:320px;border-radius:20px;overflow:hidden;background:linear-gradient(150deg, #1B3A63, #0C7C88);box-shadow:0 18px 48px rgba(20,32,55,.12);">
          <div style="position:absolute;inset:0;opacity:0.14;background-image:linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px);background-size:40px 40px;"></div>
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%, -50%);display:flex;flex-direction:column;align-items:center;gap:10px;color:#fff;">
            <div style="width:54px;height:54px;border-radius:9999px;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 20px rgba(0,0,0,.25);"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0C7C88" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>
            <span style="font-size:14px;font-weight:600;">1 Sur 1234, Talca</span>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;justify-content:center;">
          <div style="font-size:11.5px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#0C7C88;margin-bottom:12px;">Ubicación</div>
          <h2 style="margin:0 0 22px;font-family:var(--font-serif);font-size:38px;font-weight:600;color:#142037;line-height:1.1;">Te esperamos en el centro de Talca</h2>
          <div style="display:flex;flex-direction:column;gap:16px;">
            <div style="display:flex;align-items:flex-start;gap:13px;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0C7C88" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="margin-top:1px;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg><div><div style="font-size:15px;font-weight:700;color:#142037;">Dirección</div><div style="font-size:14px;color:#5E6A85;">1 Sur 1234, Talca · Región del Maule</div></div></div>
            <div style="display:flex;align-items:flex-start;gap:13px;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0C7C88" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="margin-top:1px;"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><div><div style="font-size:15px;font-weight:700;color:#142037;">Horario</div><div style="font-size:14px;color:#5E6A85;">Mar a Dom · 12:30 a 23:30 hrs</div></div></div>
            <div style="display:flex;align-items:flex-start;gap:13px;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0C7C88" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="margin-top:1px;"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.5-1.1a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2Z"/></svg><div><div style="font-size:15px;font-weight:700;color:#142037;">Contacto</div><div style="font-size:14px;color:#5E6A85;">+56 71 234 5678 · hola@triada.cl</div></div></div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA FINAL + FOOTER -->
    <section style="background:linear-gradient(150deg, #16234A, #0F1933);color:#fff;padding:80px 40px 40px;">
      <div style="max-width:760px;margin:0 auto;text-align:center;">
        <h2 style="margin:0;color:#FFFFFF;font-family:var(--font-serif);font-size:44px;font-weight:500;line-height:1.08;letter-spacing:-0.01em;">Una experiencia que querrás repetir</h2>
        <p style="margin:18px 0 32px;font-size:17px;color:#C2CBE0;">Reserva hoy y vive la cocina internacional de Talca.</p>
        <button data-action="landing:reservar" class="lp-btn lp-btn-white" style="display:inline-flex;align-items:center;gap:9px;height:54px;padding:0 30px;border:none;cursor:pointer;font-family:inherit;font-size:16px;font-weight:600;color:#142037;background:#fff;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.3);">Reservar una mesa</button>
      </div>
      <div style="max-width:1180px;margin:64px auto 0;padding-top:28px;border-top:1px solid rgba(255,255,255,0.12);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <svg width="22" height="22" viewBox="0 0 120 120" fill="none"><path d="M26 90 L60 62 L94 90" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/><path d="M26 73 L60 45 L94 73" stroke="#2BA0AB" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/><path d="M26 56 L60 28 L94 56" stroke="#3FB587" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span style="font-family:var(--font-serif);font-optical-sizing:auto;font-size:16px;font-weight:600;">Restaurante Tríada<span style="color:#2BA0AB;">.</span></span>
        </div>
        <span style="font-size:13px;color:#8C99B5;">© 2026 Restaurante Tríada · Talca, Chile</span>
      </div>
    </section>
  </div>`;
}
