import { supabase } from './supabase.js';

export async function requireAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return session.user;
  return _showLoginScreen();
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
          <div class="auth-logo-tile">
            <svg width="44" height="44" viewBox="0 0 120 120" fill="none" aria-hidden="true">
              <path d="M26 90 L60 62 L94 90" stroke="#16234A" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M26 73 L60 45 L94 73" stroke="#0C7C88" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M26 56 L60 28 L94 56" stroke="#2E9B73" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
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
          <button type="submit" id="authBtn" class="btn btn-primary auth-submit">Entrar</button>
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
    @media (max-width:420px){ .auth-card{ padding:2rem 1.5rem;border-radius:18px; } }
  `;
  document.head.appendChild(s);
}
