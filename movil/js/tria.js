// ============================================================================
// tria.js — Asistente trIA (hoja inferior). Rule-based, SIN backend de IA (misma
// decisión que el CRM de PC): responde con datos REALES del negocio y entrega
// acciones (ver agenda/pipeline/leads, redactar y enviar WhatsApp). Rotulado IA.
// ============================================================================
import { db, store, meetingType, todayStr, escHtml, heat } from './core.js';
import { logo, ic, openSheet, closeSheet, openWhatsApp } from './ui.js';

const e = escHtml;
const CHIPS = ['Prepárame la reunión de hoy', 'Próximos pasos del pipeline', 'Resume mis prospectos', 'Redacta WhatsApp de seguimiento'];
let _thread = [];

function msgHtml(m, i) {
  if (m.role === 'user') return `<div style="align-self:flex-end;max-width:84%;background:var(--teal);color:#fff;border-radius:16px 16px 4px 16px;padding:10px 14px;font-size:13.5px;line-height:1.45">${e(m.text)}</div>`;
  return `<div style="align-self:flex-start;max-width:90%;background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:16px 16px 16px 4px;padding:11px 14px;font-size:13.5px;line-height:1.5">${m.text}${m.cta ? `<div><button data-cta="${i}" style="margin-top:9px;display:inline-flex;align-items:center;gap:6px;background:var(--surface);border:1px solid var(--teal);color:var(--teal);border-radius:20px;padding:6px 13px;font-family:var(--font);font-size:12.5px;font-weight:700;cursor:pointer">${e(m.cta.label)} ${ic('next', { size: 14, sw: 2.2 })}</button></div>` : ''}</div>`;
}
const thinkingHtml = () => `<div style="align-self:flex-start;background:var(--surface2);border:1px solid var(--border);border-radius:16px;padding:13px 16px;display:flex;gap:5px"><span class="tria-dot"></span><span class="tria-dot" style="animation-delay:.15s"></span><span class="tria-dot" style="animation-delay:.3s"></span></div>`;

function renderThread(app, el, thinking) {
  const thread = el.querySelector('#tria-thread');
  thread.innerHTML = _thread.map(msgHtml).join('') + (thinking ? thinkingHtml() : '');
  thread.querySelectorAll('[data-cta]').forEach((b) => b.addEventListener('click', () => {
    const m = _thread[+b.getAttribute('data-cta')]; if (m && m.cta && m.cta.run) m.cta.run(app);
  }));
  thread.scrollTop = thread.scrollHeight;
}

async function ask(app, el, text) {
  _thread.push({ role: 'user', text });
  renderThread(app, el, true);
  await new Promise((r) => setTimeout(r, 480));
  let reply;
  try { reply = await compute(text); } catch (err) { console.error('trIA', err); reply = { role: 'tria', text: 'Tuve un problema leyendo tus datos. Intenta de nuevo.' }; }
  _thread.push(reply);
  renderThread(app, el, false);
}

// ── Motor de reglas (sobre datos reales) ────────────────────────────────────
async function compute(text) {
  const t = (text || '').toLowerCase();
  const [leads, citas, props] = await Promise.all([
    db.prospectos.getAll().catch(() => []),
    db.citas.getAll().catch(() => []),
    db.propuestas.getAll().catch(() => []),
  ]);
  if (/reuni|hoy|prepár|prepar|agenda/.test(t)) return reunionHoy(citas, leads);
  if (/pipeline|embudo|paso|próximo|proximo/.test(t)) return pipelinePasos(leads, props);
  if (/whats|wasap|redacta|mensaje|seguimiento|escrib/.test(t)) return draftWhatsApp(leads);
  if (/resum|prospecto|lead|cliente/.test(t)) return resumenProspectos(leads);
  return fallback();
}

const go = (screen, params) => ({ run: (app) => { closeSheet(); app.navigate(screen, params || {}); } });

function reunionHoy(citas, leads) {
  const today = todayStr();
  const map = Object.fromEntries(leads.map((l) => [l.id, l.empresa || l.nombre]));
  const hoy = citas.filter((c) => c.fecha === today).sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
  if (!hoy.length) return { role: 'tria', text: 'Hoy no tienes reuniones agendadas. ¿Agendamos una?', cta: { label: 'Nueva cita', ...go('cita') } };
  const items = hoy.map((c) => { const tp = meetingType(c.tipo); const emp = c.prospectoId ? map[c.prospectoId] : ''; return `• <b>${e(c.hora || '')}</b> — ${e(c.titulo || tp.label)}${emp ? ` (${e(emp)})` : ''}`; }).join('<br>');
  return { role: 'tria', text: `Hoy tienes <b>${hoy.length} ${hoy.length === 1 ? 'reunión' : 'reuniones'}</b>:<br>${items}<br><br>La próxima es a las <b>${e(hoy[0].hora || '')}</b>. Llega con margen y revisa la ficha del prospecto antes.`, cta: { label: 'Ver agenda', ...go('agenda') } };
}

function pipelinePasos(leads, props) {
  const cnt = (estado) => leads.filter((l) => l.estado === estado).length;
  const nuevos = cnt('Nuevo'), agendados = cnt('Diagnóstico Agendado'), realizados = cnt('Diagnóstico Realizado'), negociando = cnt('Negociando');
  const activas = props.filter((p) => !['aceptada', 'rechazada'].includes(String(p.estado || '').toLowerCase())).length;
  const sug = nuevos ? `Parte por contactar los <b>${nuevos}</b> nuevos — son los que se enfrían más rápido.`
    : realizados ? `Tienes <b>${realizados}</b> con diagnóstico listo: prepárales la propuesta esta semana.`
    : negociando ? `Empuja los <b>${negociando}</b> que están negociando hacia el cierre.`
    : 'Vas al día: mantén el seguimiento de los que avanzan.';
  return { role: 'tria', text: `En tu embudo:<br>• <b>${nuevos}</b> nuevos por contactar<br>• <b>${agendados}</b> con diagnóstico agendado<br>• <b>${realizados}</b> listos para propuesta<br>• <b>${negociando}</b> negociando · <b>${activas}</b> propuestas activas<br><br>${sug}`, cta: { label: 'Ver pipeline', ...go('pipeline') } };
}

function resumenProspectos(leads) {
  if (!leads.length) return { role: 'tria', text: 'Aún no tienes prospectos cargados. Captura el primero en terreno.', cta: { label: 'Capturar lead', ...go('captura') } };
  const calientes = leads.filter((l) => heat(l.scoring).label === 'Caliente');
  const top = (calientes.length ? calientes : leads).slice(0, 3);
  const items = top.map((l) => `• <b>${e(l.nombre)}</b> (${e(l.empresa || '—')}) — ${e(l.estado)}${l.dolorPrincipal ? `, busca ${e(l.dolorPrincipal.toLowerCase())}` : ''}`).join('<br>');
  return { role: 'tria', text: `Tienes <b>${leads.length} prospectos</b>${calientes.length ? `, <b>${calientes.length}</b> calientes` : ''}.<br>${items}<br><br>Foco sugerido: <b>${e(top[0].nombre)}</b>.`, cta: { label: 'Ver leads', ...go('leads') } };
}

function draftWhatsApp(leads) {
  const withTel = (l) => l.telefono;
  const pick = leads.filter((l) => l.estado === 'Nuevo' && withTel(l))[0]
    || leads.filter((l) => heat(l.scoring).label === 'Caliente' && withTel(l))[0]
    || leads.filter(withTel)[0];
  if (!pick) return { role: 'tria', text: 'No encuentro un prospecto con teléfono para escribirle. Agrega uno con su número y lo redactamos.', cta: { label: 'Capturar lead', ...go('captura') } };
  const nombre = (pick.nombre || '').split(' ')[0];
  const draft = `Hola ${nombre}, te escribo de Tríada Consultoría 👋. Quería retomar para contarte cómo un Diagnóstico 360 puede ayudar a ${pick.empresa || 'tu negocio'}. ¿Tienes unos minutos esta semana?`;
  return { role: 'tria', text: `Borrador para <b>${e(pick.nombre)}</b>${pick.empresa ? ` (${e(pick.empresa)})` : ''}:<br><br>«${e(draft)}»`, cta: { label: 'Enviar por WhatsApp', run: () => openWhatsApp(pick.telefono, draft) } };
}

const fallback = () => ({ role: 'tria', text: 'Puedo ayudarte con:<br>• Resumir tus prospectos<br>• Próximos pasos del pipeline<br>• Redactar un WhatsApp de seguimiento<br>• Prepararte la reunión de hoy<br><br>Toca un atajo o escríbeme.' });

// ── Hoja ────────────────────────────────────────────────────────────────────
export function openTria(app) {
  _thread = [];
  openSheet(`
    <div style="display:flex;align-items:center;gap:12px;padding:6px 20px 14px;border-bottom:1px solid var(--border)">
      <div style="width:46px;height:46px;border-radius:14px;background:linear-gradient(150deg,var(--navy),var(--navy-d));display:flex;align-items:center;justify-content:center;flex:none"><span class="tria-breath">${logo(24, { light: true, sw: 12 })}</span></div>
      <div style="flex:1"><div style="display:flex;align-items:center;gap:7px"><span class="serif" style="font-size:18px;font-weight:600;color:var(--ink)">trIA</span><span class="tria-ia">ASISTENTE IA</span></div><div style="font-size:12px;color:var(--text2)">Tu copiloto de terreno</div></div>
      <button data-close style="width:34px;height:34px;border-radius:50%;border:0;background:var(--surface2);color:var(--text2);cursor:pointer;display:flex;align-items:center;justify-content:center">${ic('x', { size: 17, sw: 2 })}</button>
    </div>
    <div id="tria-thread" style="padding:16px 20px;display:flex;flex-direction:column;gap:10px;min-height:120px;max-height:46vh;overflow-y:auto"></div>
    <div class="chip-row" id="tria-chips" style="padding:0 20px 12px">${CHIPS.map((c) => `<button class="chip" data-chip="${e(c)}">${e(c)}</button>`).join('')}</div>
    <div style="padding:0 20px 8px;display:flex;gap:9px;align-items:center">
      <div style="flex:1;display:flex;align-items:center;gap:8px;background:var(--surface2);border:1px solid var(--border);border-radius:24px;padding:0 6px 0 15px;height:46px">
        <input id="tria-input" placeholder="Escríbele a trIA…" style="border:0;background:none;outline:none;flex:1;font-family:var(--font);font-size:14px;color:var(--text)">
        <button data-send style="width:36px;height:36px;border-radius:50%;border:0;background:var(--teal);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex:none">${ic('send', { size: 17 })}</button>
      </div>
    </div>`, {
    onMount: (el) => {
      const first = ((store.profile && store.profile.nombre) || 'Martín').split(' ')[0];
      _thread.push({ role: 'tria', text: `Hola ${e(first)} 👋 Soy <b>trIA</b>, tu asistente. ¿En qué te ayudo en terreno?` });
      renderThread(app, el);
      el.querySelector('[data-close]').addEventListener('click', closeSheet);
      el.querySelector('#tria-chips').addEventListener('click', (ev) => { const b = ev.target.closest('[data-chip]'); if (b) ask(app, el, b.getAttribute('data-chip')); });
      const input = el.querySelector('#tria-input');
      const send = () => { const v = input.value.trim(); if (v) { input.value = ''; ask(app, el, v); } };
      el.querySelector('[data-send]').addEventListener('click', send);
      input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') send(); });
    },
  });
}
