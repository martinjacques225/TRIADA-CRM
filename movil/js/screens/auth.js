// ============================================================================
// screens/auth.js — Splash animado · Login · Crea tu contraseña.
// La UI es la del diseño móvil; la LÓGICA usa la misma Supabase Auth del CRM
// (signInWithPassword / resetPasswordForEmail / updateUser) vía app.signIn…
// ============================================================================
import { logo, ic, html, raw } from '../ui.js';

// ── Splash ──────────────────────────────────────────────────────────────────
export const splash = {
  chrome: false,
  render() {
    return `
    <section class="screen" style="position:absolute;inset:0;background:linear-gradient(150deg,#16234A,#0F1933);display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;overflow:hidden" id="splash">
      <div style="position:absolute;top:-10%;left:50%;transform:translateX(-50%);width:360px;height:360px;background:radial-gradient(circle,rgba(43,188,196,.28),transparent 62%);filter:blur(8px)"></div>
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;gap:34px">
        <div style="position:relative;width:128px;height:128px;display:flex;align-items:center;justify-content:center">
          <div style="position:absolute;inset:6px;border-radius:50%;background:radial-gradient(circle,rgba(43,188,196,.5),transparent 65%);animation:triaGlow 1.1s .62s var(--ease) forwards"></div>
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none" style="position:relative">
            <path d="M26 90 L60 62 L94 90" stroke="#5A6CA8" stroke-width="11" fill="none" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray:130;stroke-dashoffset:130;animation:triaDraw .52s var(--ease) .12s forwards"/>
            <path d="M26 73 L60 45 L94 73" stroke="#2BBCC4" stroke-width="11" fill="none" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray:130;stroke-dashoffset:130;animation:triaDraw .52s var(--ease) .32s forwards"/>
            <path d="M26 56 L60 28 L94 56" stroke="#3FB587" stroke-width="11" fill="none" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray:130;stroke-dashoffset:130;animation:triaDraw .52s var(--ease) .52s forwards"/>
          </svg>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:12px;opacity:0;animation:fadeUp .6s var(--ease) .92s forwards">
          <div style="font-family:var(--serif);font-weight:500;font-size:44px;color:#fff;letter-spacing:-.01em;line-height:1">Tríada<span style="color:#2BBCC4">·</span></div>
          <div style="font-size:11px;font-weight:700;letter-spacing:.26em;color:#8FA0C4;text-transform:uppercase">Consultoría 360 · CRM</div>
        </div>
      </div>
      <div style="position:absolute;bottom:calc(40px + env(safe-area-inset-bottom));left:0;right:0;text-align:center;font-size:12.5px;color:#5C6B92;opacity:0;animation:fadeIn .5s 1.5s forwards">Toca para continuar</div>
    </section>`;
  },
  mount(app) {
    const el = document.getElementById('splash');
    const go = () => app.afterSplash();
    el.addEventListener('click', go);
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;
    app._splashTimer = setTimeout(go, reduce ? 400 : 2100);
  },
};

// ── Login ───────────────────────────────────────────────────────────────────
export const login = {
  chrome: false,
  render() {
    return `
    <section class="screen screen--center">
      <div style="display:flex;flex-direction:column;align-items:center;margin-bottom:30px">
        <div class="logo-tile" style="width:78px;height:78px;border-radius:22px">${logo(50, { sw: 12 })}</div>
        <div class="wordmark" style="font-size:30px;margin-top:18px">Tríada<span class="brand-dot">·</span></div>
        <div class="eyebrow" style="margin-top:4px">Consultoría 360 · CRM</div>
      </div>
      <form id="loginForm" autocomplete="on" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px 22px;box-shadow:var(--shadow)">
        <div class="serif" style="font-size:22px;font-weight:600;color:var(--ink);margin-bottom:18px">Inicia sesión</div>
        <label class="field__label" for="lgEmail">Email</label>
        <div class="input-wrap" style="margin-bottom:15px">
          <span style="color:var(--text3);display:flex">${ic('mail', { size: 18, sw: 1.7 })}</span>
          <input id="lgEmail" class="input" type="email" name="email" autocomplete="email" required placeholder="tu@grupotriada.cl">
        </div>
        <label class="field__label" for="lgPw">Contraseña</label>
        <div class="input-wrap" style="margin-bottom:8px">
          <span style="color:var(--text3);display:flex">${ic('lock', { size: 18, sw: 1.7 })}</span>
          <input id="lgPw" class="input" type="password" name="password" autocomplete="current-password" required placeholder="••••••••">
          <button type="button" id="lgEye" aria-label="Mostrar contraseña" style="border:0;background:none;color:var(--text3);cursor:pointer;display:flex;padding:0">${ic('eye', { size: 18, sw: 1.7 })}</button>
        </div>
        <div style="text-align:right;margin-bottom:18px"><span id="lgForgot" class="link">¿Olvidaste tu contraseña?</span></div>
        <div id="lgErr" class="auth-err-m" hidden></div>
        <div id="lgMsg" class="auth-ok-m" hidden></div>
        <button type="submit" id="lgBtn" class="btn btn--primary btn--block">Entrar</button>
        <div id="lgCrear" style="text-align:center;margin-top:14px;font-size:12.5px;color:var(--text2);cursor:pointer">¿Te invitaron? <span style="color:var(--teal);font-weight:600">Crea tu contraseña</span></div>
      </form>
      <div style="text-align:center;margin-top:26px;font-size:12px;color:var(--text3)">Acceso reservado al equipo de Tríada Consultoría.</div>
    </section>`;
  },
  mount(app) {
    const form = document.getElementById('loginForm');
    const err = document.getElementById('lgErr');
    const msg = document.getElementById('lgMsg');
    const btn = document.getElementById('lgBtn');
    document.getElementById('lgEye').addEventListener('click', () => {
      const i = document.getElementById('lgPw');
      i.type = i.type === 'password' ? 'text' : 'password';
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.hidden = true; msg.hidden = true;
      const email = document.getElementById('lgEmail').value.trim();
      const pw = document.getElementById('lgPw').value;
      btn.textContent = 'Entrando…'; btn.disabled = true;
      const res = await app.signIn(email, pw);
      if (res.error) {
        err.textContent = 'Email o contraseña incorrectos.'; err.hidden = false;
        btn.textContent = 'Entrar'; btn.disabled = false;
      }
    });
    document.getElementById('lgForgot').addEventListener('click', async () => {
      err.hidden = true; msg.hidden = true;
      const email = document.getElementById('lgEmail').value.trim();
      if (!email) { err.textContent = 'Escribe tu email arriba y vuelve a tocar este enlace.'; err.hidden = false; return; }
      const res = await app.resetPassword(email);
      if (res.error) { err.textContent = 'No se pudo enviar el correo. Verifica el email.'; err.hidden = false; }
      else { msg.textContent = 'Te enviamos un correo para restablecer tu contraseña. Revisa tu bandeja (y spam).'; msg.hidden = false; }
    });
    document.getElementById('lgCrear').addEventListener('click', () => app.navigate('crearpass'));
  },
};

// ── Crea tu contraseña (invitación / recuperación) ──────────────────────────
export const crearpass = {
  chrome: false,
  render(app) {
    const email = (app.store.user && app.store.user.email) || 'tu cuenta';
    return `
    <section class="screen screen--center">
      <div id="cpBack" style="position:absolute;top:calc(20px + env(safe-area-inset-top));left:22px;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text2)">${ic('back', { size: 22, sw: 1.9 })}</div>
      <div style="display:flex;flex-direction:column;align-items:center;margin-bottom:26px">
        <div class="logo-tile" style="width:64px;height:64px;border-radius:18px">${logo(40, { sw: 12 })}</div>
      </div>
      <form id="cpForm" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px 22px;box-shadow:var(--shadow)">
        <div class="serif" style="font-size:22px;font-weight:600;color:var(--ink)">Crea tu contraseña</div>
        <div style="font-size:13px;color:var(--text2);margin:6px 0 20px;line-height:1.5">Te invitaron al equipo de Tríada. Define tu contraseña para activar <b style="color:var(--text)">${email}</b>.</div>
        <label class="field__label" for="cp1">Nueva contraseña</label>
        <div class="input-wrap" style="margin-bottom:15px"><span style="color:var(--text3);display:flex">${ic('lock', { size: 18, sw: 1.7 })}</span><input id="cp1" class="input" type="password" autocomplete="new-password" minlength="8" placeholder="Mínimo 8 caracteres"></div>
        <label class="field__label" for="cp2">Repetir contraseña</label>
        <div class="input-wrap" style="margin-bottom:8px"><span style="color:var(--text3);display:flex">${ic('lock', { size: 18, sw: 1.7 })}</span><input id="cp2" class="input" type="password" autocomplete="new-password" minlength="8" placeholder="••••••••"></div>
        <div id="cpErr" class="auth-err-m" hidden style="margin-top:12px"></div>
        <button type="submit" id="cpBtn" class="btn btn--primary btn--block" style="margin-top:14px">Activar mi cuenta</button>
      </form>
    </section>`;
  },
  mount(app) {
    document.getElementById('cpBack').addEventListener('click', () => app.navigate('login'));
    const form = document.getElementById('cpForm');
    const err = document.getElementById('cpErr');
    const btn = document.getElementById('cpBtn');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.hidden = true;
      const p1 = document.getElementById('cp1').value, p2 = document.getElementById('cp2').value;
      if (p1.length < 8) { err.textContent = 'La contraseña debe tener al menos 8 caracteres.'; err.hidden = false; return; }
      if (p1 !== p2) { err.textContent = 'Las contraseñas no coinciden.'; err.hidden = false; return; }
      btn.textContent = 'Guardando…'; btn.disabled = true;
      const res = await app.setPassword(p1);
      if (res.error) { err.textContent = 'No se pudo guardar. Pide una nueva invitación.'; err.hidden = false; btn.textContent = 'Activar mi cuenta'; btn.disabled = false; }
    });
  },
};
