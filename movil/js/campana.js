// ============================================================================
// campana.js — panel de recordatorios (la campana del top bar).
// Lista las reuniones próximas de HOY con cuenta regresiva + un aviso de leads
// por contactar. Sobre datos reales (citas + leads). Tocar lleva a la pantalla.
// ============================================================================
import { db, store, meetingType, todayStr, escHtml } from './core.js';
import { ic, openSheet, closeSheet } from './ui.js';

const e = escHtml;

// Cuenta regresiva hasta la cita. Devuelve null si ya pasó hace rato (>15 min).
function countdown(fecha, hora) {
  const now = new Date();
  const [h, m] = (hora || '00:00').split(':').map(Number);
  const target = new Date(fecha + 'T00:00:00');
  target.setHours(h || 0, m || 0, 0, 0);
  const diff = Math.round((target - now) / 60000);
  if (diff <= -15) return null;
  if (diff <= 5) return { label: 'ahora', soon: true };
  if (diff < 60) return { label: `en ${diff} min`, soon: diff <= 30 };
  const hrs = Math.floor(diff / 60), mins = diff % 60;
  return { label: mins ? `en ${hrs}h ${mins}min` : `en ${hrs}h`, soon: false };
}

// ¿Hay algo que recordar? (para el puntito de la campana en los headers)
export async function hasReminders() {
  try {
    const [citas, leads] = await Promise.all([db.citas.getAll(), db.prospectos.getAll()]);
    const today = todayStr();
    const upcoming = citas.some((c) => c.fecha === today && countdown(c.fecha, c.hora));
    return upcoming || leads.some((l) => l.estado === 'Nuevo');
  } catch (_) { return false; }
}

export async function openCampana(app) {
  const [citas, leads] = await Promise.all([db.citas.getAll().catch(() => []), db.prospectos.getAll().catch(() => [])]);
  const today = todayStr();
  const map = Object.fromEntries(leads.map((l) => [l.id, l.empresa || l.nombre]));

  const upcoming = citas
    .filter((c) => c.fecha === today)
    .map((c) => ({ c, cd: countdown(c.fecha, c.hora) }))
    .filter((x) => x.cd)
    .sort((a, b) => (a.c.hora || '').localeCompare(b.c.hora || ''));
  const porContactar = leads.filter((l) => l.estado === 'Nuevo').length;

  const items = upcoming.map(({ c, cd }) => {
    const t = meetingType(c.tipo), emp = c.prospectoId ? map[c.prospectoId] : '';
    return `<button class="cmp-item" data-go="agenda" style="width:100%;display:flex;align-items:center;gap:12px;background:var(--surface);border:1px solid var(--border);border-left:3px solid ${t.color};border-radius:var(--radius-sm);padding:12px 13px;margin-bottom:9px;cursor:pointer;text-align:left">
      <div style="flex:1;min-width:0"><div class="ell" style="font-weight:700;font-size:13.5px;color:var(--ink)">${e(c.titulo || t.label)}</div><div class="ell" style="font-size:11.5px;color:var(--text2);margin-top:2px">${emp ? e(emp) + ' · ' : ''}${e(c.hora || '')} · ${e(t.label)}</div></div>
      <span style="font-size:11.5px;font-weight:700;color:${cd.soon ? 'var(--danger)' : t.color};background:${cd.soon ? 'var(--danger-l)' : t.color + '14'};padding:4px 10px;border-radius:20px;white-space:nowrap;flex:none">${e(cd.label)}</span>
    </button>`;
  }).join('');

  // Reuniones recientes (últimos 2 días) donde te sumaron como participante (no las creaste tú).
  // Es el "aviso en la campana" si te perdiste la burbuja in-app o tenías la app cerrada.
  const me = store.user && store.user.id;
  const since = Date.now() - 2 * 24 * 60 * 60 * 1000;
  const invites = me ? citas.filter((c) =>
    Array.isArray(c.participantes) && c.participantes.includes(me) &&
    c.responsable && c.responsable !== me &&
    c.fechaCreacion && new Date(c.fechaCreacion).getTime() > since
  ).sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion)) : [];

  const inviteItems = invites.map((c) => {
    const t = meetingType(c.tipo), emp = c.prospectoId ? map[c.prospectoId] : '';
    return `<button class="cmp-item" data-go="agenda" style="width:100%;display:flex;align-items:center;gap:12px;background:var(--surface);border:1px solid var(--border);border-left:3px solid ${t.color};border-radius:var(--radius-sm);padding:12px 13px;margin-bottom:9px;cursor:pointer;text-align:left">
      <span style="width:34px;height:34px;border-radius:10px;background:${t.color}1A;color:${t.color};display:flex;align-items:center;justify-content:center;flex:none">${ic('bell', { size: 17 })}</span>
      <div style="flex:1;min-width:0"><div class="ell" style="font-weight:700;font-size:13.5px;color:var(--ink)">${e(c.titulo || t.label)}</div><div class="ell" style="font-size:11.5px;color:var(--text2);margin-top:2px">Te sumaron a esta reunión${emp ? ' · ' + e(emp) : ''}${c.fecha ? ' · ' + e(c.fecha) : ''}</div></div>
    </button>`;
  }).join('');
  const inviteSection = inviteItems
    ? `<div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text3);margin:2px 2px 8px">Nuevas reuniones contigo</div>${inviteItems}<div style="height:6px"></div>`
    : '';

  const nudge = porContactar ? `<button class="cmp-item" data-go="leads" style="width:100%;display:flex;align-items:center;gap:12px;background:var(--teal-l);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px 13px;margin-bottom:9px;cursor:pointer;text-align:left"><span style="width:34px;height:34px;border-radius:10px;background:var(--surface);color:var(--teal);display:flex;align-items:center;justify-content:center;flex:none">${ic('users', { size: 18 })}</span><div style="flex:1"><div style="font-weight:700;font-size:13.5px;color:var(--ink)">${porContactar} ${porContactar === 1 ? 'lead' : 'leads'} por contactar</div><div style="font-size:11.5px;color:var(--text2)">No los dejes enfriar</div></div></button>` : '';

  const empty = (!items && !nudge && !inviteItems)
    ? `<div style="text-align:center;padding:26px 10px;color:var(--text2)"><div class="empty__icon" style="margin:0 auto 12px">${ic('bell', { size: 26 })}</div><div class="empty__t" style="font-size:15px">Sin recordatorios próximos</div><div class="empty__d">Cuando tengas reuniones cercanas, aparecen aquí.</div></div>`
    : '';

  openSheet(`
    <div class="sheet__body">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <div class="sheet__title" style="margin:0">Recordatorios</div>
        <button data-close style="width:32px;height:32px;border-radius:50%;border:0;background:var(--surface2);color:var(--text2);cursor:pointer;display:flex;align-items:center;justify-content:center">${ic('x', { size: 16, sw: 2 })}</button>
      </div>
      ${empty}${inviteSection}${items}${nudge}
    </div>`, {
    onMount: (el) => {
      el.querySelector('[data-close]').addEventListener('click', closeSheet);
      el.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => { closeSheet(); app.navigate(b.getAttribute('data-go')); }));
    },
  });
}
