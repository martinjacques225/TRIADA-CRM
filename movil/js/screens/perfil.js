// ============================================================================
// screens/perfil.js — Mi cuenta (sincronizada con el perfil del CRM).
// Identidad · cuenta · tema (claro/oscuro/matrix) · equipo · cerrar sesión.
// ============================================================================
import { db, store, escHtml, initials, memberColor, areaLabel } from '../core.js';
import { ic, toast, openSheet, closeSheet, supabaseUpdatePassword } from '../ui.js';

const e = escHtml;
const THEMES = [['light', 'Claro'], ['dark', 'Oscuro'], ['matrix', 'Matrix']];

export default {
  chrome: false,
  async render(app) {
    const me = store.profile || {};
    const nombre = me.nombre || (store.user && store.user.email) || 'Consultor';
    const email = (store.user && store.user.email) || me.email || '—';
    const team = await db.profiles.getAll().catch(() => []);

    // Cada botón lleva data-theme → los tokens de ese tema aplican DENTRO del botón,
    // así cada uno es un "swatch" que previsualiza su tema. El activo va con anillo + check.
    const themeBtn = ([id, label]) => {
      const on = store.theme === id;
      return `<button class="pf-theme" data-theme="${id}" style="flex:1;height:48px;border:1px solid var(--border);background:var(--surface);color:var(--text);border-radius:var(--radius-sm);font-family:var(--font);font-weight:700;font-size:13px;cursor:pointer;position:relative;transition:var(--tr);${on ? 'border-color:var(--teal);box-shadow:0 0 0 2px var(--teal)' : ''}">${label}${on ? `<span style="position:absolute;top:5px;right:7px;color:var(--teal);display:flex">${ic('check', { size: 13, sw: 2.8 })}</span>` : ''}</button>`;
    };
    const teamRow = (m, i, last) => `<div style="display:flex;align-items:center;gap:12px;padding:12px 15px;${last ? '' : 'border-bottom:1px solid var(--border)'}"><span style="width:38px;height:38px;border-radius:50%;background:${memberColor(i)};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex:none">${e(initials(m.nombre))}</span><div style="flex:1;min-width:0"><div class="ell" style="font-size:14px;font-weight:600;color:var(--ink)">${e(m.nombre)}</div><div class="ell" style="font-size:11.5px;color:var(--text2)">${e(m.cargo || m.rol || 'Consultor')}${m.area ? ' · ' + e(areaLabel(m.area)) : ''}</div></div></div>`;
    const acctRow = (id, icon, label) => `<button class="pf-acct" data-acct="${id}" style="width:100%;display:flex;align-items:center;gap:12px;padding:14px 15px;background:none;border:0;cursor:pointer;text-align:left">${ic(icon, { size: 19, sw: 1.7 })}<span style="flex:1;font-size:14px;font-weight:600;color:var(--ink)">${label}</span>${ic('next', { size: 17, sw: 2 })}</button>`;
    const sectionTitle = (t) => `<div style="font-size:11.5px;font-weight:700;letter-spacing:.06em;color:var(--text3);text-transform:uppercase;margin:22px 4px 9px">${t}</div>`;

    return `
    <section class="screen">
      <header class="hdr hdr--bar">
        <h1 class="hdr__title">Mi cuenta</h1>
        <button class="icon-btn icon-btn--bare" id="pfClose" style="width:38px;height:38px" aria-label="Cerrar">${ic('x', { size: 20, sw: 2 })}</button>
      </header>

      <div class="pad">
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px;box-shadow:var(--shadow-sm);text-align:center">
          <div style="width:74px;height:74px;border-radius:50%;background:linear-gradient(150deg,var(--teal),var(--navy));color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:26px;margin:0 auto 12px">${e(initials(nombre))}</div>
          <div class="serif" style="font-size:21px;font-weight:600;color:var(--ink)">${e(nombre)}</div>
          <div class="ell" style="font-size:13px;color:var(--text2);margin-top:2px">${e(email)}</div>
          <div style="display:flex;align-items:center;justify-content:center;gap:7px;margin-top:11px;flex-wrap:wrap">
            <span style="font-size:11px;font-weight:700;color:var(--navy);background:var(--navy-l);padding:4px 11px;border-radius:20px">${e(me.cargo || me.rol || 'Consultor')}</span>
            ${me.area ? `<span style="font-size:11px;font-weight:700;color:var(--teal);background:var(--teal-l);padding:4px 11px;border-radius:20px">${e(areaLabel(me.area))}</span>` : ''}
          </div>
          <div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-top:14px;font-size:11.5px;color:var(--text3)">${ic('refresh', { size: 14, sw: 1.8 })}Sincronizado con tu cuenta de Tríada CRM</div>
        </div>

        ${sectionTitle('Cuenta')}
        <div class="card" style="padding:0;overflow:hidden">${acctRow('email', 'mail', 'Cambiar correo')}<div style="height:1px;background:var(--border)"></div>${acctRow('pass', 'lock', 'Cambiar contraseña')}</div>

        ${sectionTitle('Tema')}
        <div style="display:flex;gap:8px">${THEMES.map(themeBtn).join('')}</div>

        ${sectionTitle('Equipo')}
        <div class="card" style="padding:0;overflow:hidden">${team.length ? team.map((m, i) => teamRow(m, i, i === team.length - 1)).join('') : `<div class="muted" style="padding:16px;font-size:13px;text-align:center">Solo tú por ahora.</div>`}</div>

        <button class="btn" id="pfLogout" style="width:100%;margin-top:22px;height:48px;border:1px solid var(--danger);background:var(--surface);color:var(--danger);font-size:14.5px">${ic('logout', { size: 18 })} Cerrar sesión</button>
      </div>
    </section>`;
  },

  mount(app) {
    const host = document.getElementById('screen');
    host.querySelector('#pfClose').addEventListener('click', () => app.navigate('hoy'));
    host.querySelectorAll('.pf-theme').forEach((b) => b.addEventListener('click', () => { app.setTheme(b.getAttribute('data-theme')); app.renderScreen(); }));
    host.querySelector('#pfLogout').addEventListener('click', () => app.signOut());
    host.querySelectorAll('.pf-acct').forEach((b) => b.addEventListener('click', () => {
      const k = b.getAttribute('data-acct');
      if (k === 'pass') openChangePassword(app);
      else toast('Cambiar correo: requiere confirmación por email (próxima fase)', 'info');
    }));
  },
};

function openChangePassword(app) {
  openSheet(`
    <div class="sheet__body">
      <div class="sheet__title">Cambiar contraseña</div>
      <label class="field__label" for="npw">Nueva contraseña</label>
      <input id="npw" class="input" type="password" autocomplete="new-password" placeholder="Mínimo 8 caracteres" style="margin-bottom:12px">
      <div id="npwErr" class="auth-err-m" hidden></div>
      <button class="btn btn--primary btn--block" id="npwSave" style="margin-bottom:4px">Guardar contraseña</button>
    </div>`, {
    onMount: (el) => {
      el.querySelector('#npwSave').addEventListener('click', async (ev) => {
        const v = el.querySelector('#npw').value;
        const err = el.querySelector('#npwErr');
        err.hidden = true;
        if (v.length < 8) { err.textContent = 'Mínimo 8 caracteres.'; err.hidden = false; return; }
        ev.target.disabled = true;
        const res = await supabaseUpdatePassword(app.supabase, v);
        if (res.error) { err.textContent = 'No se pudo cambiar. Intenta de nuevo.'; err.hidden = false; ev.target.disabled = false; }
        else { closeSheet(); toast('Contraseña actualizada ✓', 'ok'); }
      });
    },
  });
}
