import { supabase } from './supabase.js';

export async function requireAuth() {
  // Llegada por enlace de invitación o recuperación de contraseña: Supabase ya
  // creó una sesión a partir del token del correo, pero el usuario todavía debe
  // FIJAR su contraseña antes de entrar. (__authFlow lo captura index.html del
  // hash de la URL, antes de que el cliente Supabase lo consuma y lo limpie.)
  const flow = window.__authFlow;
  if (flow === 'invite' || flow === 'recovery') {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) return _showSetPasswordScreen(session.user, flow);
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return session.user;
  return _showLoginScreen();
}

function _logoSvg() {
  return `<svg width="44" height="44" viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <path d="M26 90 L60 62 L94 90" stroke="#16234A" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M26 73 L60 45 L94 73" stroke="#0C7C88" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M26 56 L60 28 L94 56" stroke="#2E9B73" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
}

export async function getUser() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ?? null;
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.reload();
}

function _showLoginScreen() {
  return new Promise((resolve) => {
    _injectStyles();

    const el = document.createElement('div');
    el.id = 'authOverlay';
    el.innerHTML = `
      <div class="auth-card">
        <div class="auth-brandblock">
          <div class="auth-logo-tile">${_logoSvg()}</div>
          <div class="auth-wordmark">
            <span class="auth-brand-name">Tríada<span class="auth-brand-dot">·</span></span>
            <span class="auth-brand-tag">Consultoría 360 · Diagnóstico CRM</span>
          </div>
        </div>
        <div class="auth-divider"></div>
        <form id="authForm" autocomplete="on" class="auth-form">
          <h2 class="auth-title">Iniciar sesión</h2>
          <div class="auth-field">
            <label for="authEmail">Email</label>
            <input id="authEmail" type="email" name="email" autocomplete="email" required placeholder="tu@email.com">
          </div>
          <div class="auth-field">
            <label for="authPw">Contraseña</label>
            <input id="authPw" type="password" name="password" autocomplete="current-password" required placeholder="••••••••">
          </div>
          <div id="authErr" class="auth-err" hidden></div>
          <div id="authMsg" class="auth-ok" hidden></div>
          <button type="submit" id="authBtn" class="btn btn-primary auth-submit">Entrar</button>
          <button type="button" id="authForgot" class="auth-link">¿Olvidaste tu contraseña?</button>
        </form>
        <span class="auth-foot">Acceso reservado al equipo de Tríada Consultoría</span>
      </div>`;
    document.body.appendChild(el);

    document.getElementById('authForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('authEmail').value;
      const pw    = document.getElementById('authPw').value;
      const btn   = document.getElementById('authBtn');
      const err   = document.getElementById('authErr');
      btn.textContent = 'Entrando…';
      btn.disabled = true;
      err.hidden = true;
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error) {
        err.textContent = 'Email o contraseña incorrectos.';
        err.hidden = false;
        btn.textContent = 'Entrar';
        btn.disabled = false;
      } else {
        el.remove();
        resolve(data.user);
      }
    });

    // ¿Olvidaste tu contraseña? → envía correo de recuperación al email escrito.
    document.getElementById('authForgot').addEventListener('click', async () => {
      const email = document.getElementById('authEmail').value.trim();
      const err   = document.getElementById('authErr');
      const msg   = document.getElementById('authMsg');
      err.hidden = true; msg.hidden = true;
      if (!email) {
        err.textContent = 'Escribe tu email arriba y vuelve a tocar este enlace.';
        err.hidden = false;
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + window.location.pathname,
      });
      if (error) {
        err.textContent = 'No se pudo enviar el correo. Verifica el email.';
        err.hidden = false;
      } else {
        msg.textContent = 'Te enviamos un correo para restablecer tu contraseña. Revisa tu bandeja (y la carpeta de spam).';
        msg.hidden = false;
      }
    });
  });
}

// Pantalla para FIJAR contraseña tras una invitación (cuenta nueva) o una
// recuperación. Supabase ya dejó una sesión activa con el token del correo; aquí
// el usuario define su contraseña y recién entra al CRM.
function _showSetPasswordScreen(user, flow) {
  return new Promise((resolve) => {
    _injectStyles();
    const isInvite = flow === 'invite';

    const el = document.createElement('div');
    el.id = 'authOverlay';
    el.innerHTML = `
      <div class="auth-card">
        <div class="auth-brandblock">
          <div class="auth-logo-tile">${_logoSvg()}</div>
          <div class="auth-wordmark">
            <span class="auth-brand-name">Tríada<span class="auth-brand-dot">·</span></span>
            <span class="auth-brand-tag">Consultoría 360 · Diagnóstico CRM</span>
          </div>
        </div>
        <div class="auth-divider"></div>
        <form id="pwForm" autocomplete="on" class="auth-form">
          <h2 class="auth-title">${isInvite ? 'Crea tu contraseña' : 'Restablecer contraseña'}</h2>
          <p class="auth-hello">${isInvite ? 'Activando tu cuenta' : 'Restableciendo la cuenta'} <strong>${user.email || ''}</strong></p>
          <div class="auth-field">
            <label for="pw1">Nueva contraseña</label>
            <input id="pw1" type="password" autocomplete="new-password" required minlength="8" placeholder="Mínimo 8 caracteres">
          </div>
          <div class="auth-field">
            <label for="pw2">Repetir contraseña</label>
            <input id="pw2" type="password" autocomplete="new-password" required minlength="8" placeholder="••••••••">
          </div>
          <div id="pwErr" class="auth-err" hidden></div>
          <button type="submit" id="pwBtn" class="btn btn-primary auth-submit">${isInvite ? 'Activar mi cuenta' : 'Guardar contraseña'}</button>
        </form>
        <span class="auth-foot">Tríada Consultoría · acceso del equipo</span>
      </div>`;
    document.body.appendChild(el);

    document.getElementById('pwForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const pw1 = document.getElementById('pw1').value;
      const pw2 = document.getElementById('pw2').value;
      const btn = document.getElementById('pwBtn');
      const err = document.getElementById('pwErr');
      err.hidden = true;
      if (pw1.length < 8) { err.textContent = 'La contraseña debe tener al menos 8 caracteres.'; err.hidden = false; return; }
      if (pw1 !== pw2)    { err.textContent = 'Las contraseñas no coinciden.'; err.hidden = false; return; }
      btn.textContent = 'Guardando…';
      btn.disabled = true;
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) {
        err.textContent = 'No se pudo guardar la contraseña. Intenta de nuevo o pide una nueva invitación.';
        err.hidden = false;
        btn.textContent = isInvite ? 'Activar mi cuenta' : 'Guardar contraseña';
        btn.disabled = false;
      } else {
        window.__authFlow = null;
        // Limpia el token del hash de la URL para que un refresh no reabra esta pantalla.
        history.replaceState(null, '', window.location.pathname + window.location.search);
        el.remove();
        resolve(user);
      }
    });
  });
}

function _injectStyles() {
  if (document.getElementById('authStyles')) return;
  const s = document.createElement('style');
  s.id = 'authStyles';
  s.textContent = `
    #authOverlay {
      position:fixed;inset:0;z-index:9999;
      background:var(--bg,#F4F6F8);
      font-family:var(--font,system-ui,sans-serif);
      display:flex;align-items:center;justify-content:center;padding:24px;
      animation:authFade .4s var(--ease,ease);
    }
    @keyframes authFade { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
    .auth-card {
      background:var(--surface,#fff);
      border:1px solid var(--border,#E5E9F0);
      border-radius:22px;
      padding:2.6rem 2.1rem 2.1rem;
      width:min(380px,100%);
      box-shadow:0 24px 60px rgba(20,32,55,.14);
      display:flex;flex-direction:column;align-items:center;gap:1.5rem;
    }
    .auth-brandblock { display:flex;flex-direction:column;align-items:center;gap:15px; }
    .auth-logo-tile {
      width:76px;height:76px;border-radius:21px;
      background:linear-gradient(150deg,var(--teal-l,#E2F0F1),var(--surface,#fff));
      border:1px solid var(--border,#E5E9F0);
      display:flex;align-items:center;justify-content:center;
    }
    .auth-wordmark { display:flex;flex-direction:column;align-items:center;gap:5px; }
    .auth-brand-name { font-family:var(--serif,Georgia),serif;font-size:28px;font-weight:600;color:var(--ink,#142037);letter-spacing:.01em;line-height:1; }
    .auth-brand-dot { color:var(--teal,#0C7C88);margin-left:1px; }
    .auth-brand-tag { font-size:9.5px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--teal,#0C7C88); }
    .auth-divider { width:100%;height:1px;background:var(--border,#E5E9F0); }
    .auth-form { width:100%;display:flex;flex-direction:column;gap:14px; }
    .auth-title { font-family:var(--serif,Georgia),serif;font-size:21px;font-weight:500;color:var(--ink,#142037);margin:0 0 2px;text-align:center; }
    .auth-field { display:flex;flex-direction:column;gap:6px; }
    .auth-field label { font-size:13px;font-weight:600;color:var(--text2,#5E6A85); }
    .auth-field input {
      border:1.5px solid var(--border,#d1d8e8);
      border-radius:9px;padding:11px 13px;
      font-size:14px;font-family:inherit;background:var(--surface,#fff);
      color:var(--ink,#142037);transition:border-color .15s,box-shadow .15s;
    }
    .auth-field input::placeholder { color:var(--text3,#94A0B6); }
    .auth-field input:focus { outline:none;border-color:var(--primary,#0C7C88);box-shadow:var(--ring,0 0 0 3px rgba(12,124,136,.16)); }
    .auth-submit { width:100%;margin-top:4px;padding:11px;font-size:14px; }
    .auth-err {
      background:color-mix(in srgb,var(--danger,#C04F3F) 12%,var(--surface,#fff));
      border:1px solid var(--danger,#C04F3F);
      border-radius:9px;padding:10px 12px;
      font-size:13px;color:var(--danger,#C04F3F);
    }
    .auth-foot { font-size:12px;color:var(--text3,#94A0B6);text-align:center; }
    .auth-link {
      background:none;border:none;cursor:pointer;font-family:inherit;
      font-size:13px;font-weight:600;color:var(--primary,#0C7C88);
      text-align:center;padding:2px;align-self:center;
    }
    .auth-link:hover { text-decoration:underline; }
    .auth-hello { font-size:13px;color:var(--text2,#5E6A85);text-align:center;margin:-4px 0 2px; }
    .auth-ok {
      background:color-mix(in srgb,var(--success,#2E9B73) 12%,var(--surface,#fff));
      border:1px solid var(--success,#2E9B73);
      border-radius:9px;padding:10px 12px;
      font-size:13px;color:var(--success,#2E9B73);
    }
    @media (max-width:420px){ .auth-card{ padding:2rem 1.5rem;border-radius:18px; } }
  `;
  document.head.appendChild(s);
}
