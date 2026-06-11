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
        <div class="auth-logo">
          <svg width="46" height="46" viewBox="0 0 120 120" fill="none">
            <path d="M26 90 L60 62 L94 90" stroke="#16234A" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M26 73 L60 45 L94 73" stroke="#0C7C88" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M26 56 L60 28 L94 56" stroke="#2E9B73" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="auth-brand"><span class="auth-brand-name">Tríada</span><span class="auth-brand-tag">Diagnóstico CRM</span></span>
        </div>
        <h2 class="auth-title">Iniciar sesión</h2>
        <form id="authForm" autocomplete="on">
          <div class="auth-field">
            <label for="authEmail">Email</label>
            <input id="authEmail" type="email" name="email" autocomplete="email" required placeholder="tu@email.com">
          </div>
          <div class="auth-field">
            <label for="authPw">Contraseña</label>
            <input id="authPw" type="password" name="password" autocomplete="current-password" required placeholder="••••••••">
          </div>
          <div id="authErr" class="auth-err" hidden></div>
          <button type="submit" id="authBtn" class="btn btn-primary" style="width:100%;margin-top:8px">Entrar</button>
        </form>
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
      background:var(--bg,#f0f4f8);
      display:flex;align-items:center;justify-content:center;
    }
    .auth-card {
      background:var(--surface,#fff);
      border:1px solid var(--border,#E5E9F0);
      border-radius:20px;
      padding:2.5rem 2rem;
      width:min(400px,92vw);
      box-shadow:0 18px 48px rgba(20,32,55,.16);
      display:flex;flex-direction:column;gap:1.5rem;
    }
    .auth-logo { display:flex;align-items:center;gap:12px; }
    .auth-brand { display:flex;flex-direction:column;line-height:1; }
    .auth-brand-name { font-family:var(--serif,Georgia),serif;font-size:22px;font-weight:600;color:var(--ink,#142037);letter-spacing:.02em; }
    .auth-brand-tag { font-size:9.5px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:var(--primary,#0C7C88);margin-top:3px; }
    .auth-title { font-family:var(--serif,Georgia),serif;font-size:24px;font-weight:500;color:var(--ink,#142037);margin:0; }
    #authForm { display:flex;flex-direction:column;gap:14px; }
    .auth-field { display:flex;flex-direction:column;gap:5px; }
    .auth-field label { font-size:13px;font-weight:600;color:var(--text2,#5a6484); }
    .auth-field input {
      border:1.5px solid var(--border,#d1d8e8);
      border-radius:8px;padding:10px 12px;
      font-size:14px;background:var(--surface,#fff);
      color:var(--text,#1a2035);transition:border-color .15s;
    }
    .auth-field input:focus { outline:none;border-color:var(--primary,#0C7C88);box-shadow:var(--ring,0 0 0 3px rgba(12,124,136,.16)); }
    .auth-err {
      background:#fff0f0;border:1px solid #e0604f;
      border-radius:8px;padding:9px 12px;
      font-size:13px;color:#b94040;
    }
  `;
  document.head.appendChild(s);
}
