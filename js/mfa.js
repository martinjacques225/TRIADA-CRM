// js/mfa.js — Verificación en dos pasos (MFA · TOTP) para accesos sensibles.
//
// Enfoque "solo nómina": el enrolamiento y el reto se disparan ON-DEMAND al
// entrar a Nómina; NO se toca el login del CRM (cero riesgo de dejar a nadie
// fuera). La seguridad REAL la impone la base de datos —`can_ver_nomina()` exige
// `aal2`—; esta capa es solo la experiencia para llegar a ese nivel.
import { supabase } from './supabase.js';
import { toast, escHtml } from './utils.js';

// ¿La sesión actual completó la verificación en dos pasos (aal2)?
export async function isAAL2() {
  try {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    return data?.currentLevel === 'aal2';
  } catch { return false; }
}

// ¿El usuario tiene un factor TOTP ya verificado (aunque esta sesión sea aal1)?
export async function hasVerifiedFactor() {
  try {
    const { data } = await supabase.auth.mfa.listFactors();
    return (data?.totp || []).length > 0;
  } catch { return false; }
}

// ── Modal genérico (overlay theme-aware) ──
function _modal(innerHtml) {
  _injectStyles();
  const el = document.createElement('div');
  el.className = 'mfa-overlay';
  el.innerHTML = `<div class="mfa-card">${innerHtml}</div>`;
  document.body.appendChild(el);
  return el;
}

// Enrola un factor TOTP: muestra el QR + pide el código. Devuelve true si quedó
// verificado (la sesión sube a aal2). Si se cancela a medias, limpia el factor.
export async function enrollMfaFlow() {
  // Limpia factores TOTP a medio enrolar de intentos previos (no dejar basura).
  try {
    const { data: fs } = await supabase.auth.mfa.listFactors();
    for (const f of (fs?.all || []).filter(x => x.factor_type === 'totp' && x.status === 'unverified')) {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
  } catch { /* no crítico */ }

  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
  if (error) { toast('No se pudo iniciar la verificación en dos pasos', 'error'); return false; }
  const factorId = data.id;
  const qr = data.totp?.qr_code || '';
  const secret = data.totp?.secret || '';

  return await new Promise((resolve) => {
    const el = _modal(`
      <h2 class="mfa-title">Verificación en dos pasos</h2>
      <p class="mfa-sub"><strong>1.</strong> Abre tu app de autenticación (Google Authenticator, Authy, 1Password, Microsoft Authenticator…) y escanea este código:</p>
      <div class="mfa-qr">${qr ? `<img src="${escHtml(qr)}" alt="Código QR" width="176" height="176">` : '<span class="mfa-err">No se pudo generar el QR</span>'}</div>
      <p class="mfa-secret">¿No puedes escanear? Ingresa esta clave a mano:<br><code>${escHtml(secret)}</code></p>
      <p class="mfa-sub"><strong>2.</strong> Escribe el código de 6 dígitos que muestra la app:</p>
      <input id="mfaCode" class="mfa-input" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000">
      <div id="mfaErr" class="mfa-err" hidden></div>
      <div class="mfa-actions">
        <button id="mfaCancel" class="btn btn-ghost btn-sm" type="button">Cancelar</button>
        <button id="mfaOk" class="btn btn-primary btn-sm" type="button">Activar</button>
      </div>
    `);
    const close = (v) => { el.remove(); resolve(v); };
    el.querySelector('#mfaCancel').onclick = async () => {
      try { await supabase.auth.mfa.unenroll({ factorId }); } catch { /* best-effort */ }
      close(false);
    };
    el.querySelector('#mfaOk').onclick = async () => {
      const code = el.querySelector('#mfaCode').value.trim();
      const err = el.querySelector('#mfaErr');
      err.hidden = true;
      if (!/^\d{6}$/.test(code)) { err.textContent = 'Ingresa los 6 dígitos que muestra la app.'; err.hidden = false; return; }
      const { error: vErr } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      if (vErr) { err.textContent = 'Código incorrecto. Revisa que la hora de tu teléfono esté automática e intenta de nuevo.'; err.hidden = false; return; }
      toast('Verificación en dos pasos activada', 'success');
      close(true);
    };
  });
}

// Reto para una sesión con factor ya verificado: pide el código para subir a
// aal2. Si no hay factor, cae al enrolamiento. Devuelve true si quedó en aal2.
export async function challengeMfaFlow() {
  let factor = null;
  try {
    const { data } = await supabase.auth.mfa.listFactors();
    factor = (data?.totp || [])[0] || null;
  } catch { /* ignore */ }
  if (!factor) return await enrollMfaFlow();

  return await new Promise((resolve) => {
    const el = _modal(`
      <h2 class="mfa-title">Ingresa tu código</h2>
      <p class="mfa-sub">Escribe el código de 6 dígitos de tu app de autenticación para ver la nómina.</p>
      <input id="mfaCode" class="mfa-input" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000">
      <div id="mfaErr" class="mfa-err" hidden></div>
      <div class="mfa-actions">
        <button id="mfaCancel" class="btn btn-ghost btn-sm" type="button">Cancelar</button>
        <button id="mfaOk" class="btn btn-primary btn-sm" type="button">Verificar</button>
      </div>
    `);
    const close = (v) => { el.remove(); resolve(v); };
    el.querySelector('#mfaCancel').onclick = () => close(false);
    el.querySelector('#mfaOk').onclick = async () => {
      const code = el.querySelector('#mfaCode').value.trim();
      const err = el.querySelector('#mfaErr');
      err.hidden = true;
      if (!/^\d{6}$/.test(code)) { err.textContent = 'Ingresa los 6 dígitos.'; err.hidden = false; return; }
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
      if (error) { err.textContent = 'Código incorrecto. Intenta de nuevo.'; err.hidden = false; return; }
      close(true);
    };
  });
}

function _injectStyles() {
  if (document.getElementById('mfaStyles')) return;
  const s = document.createElement('style');
  s.id = 'mfaStyles';
  s.textContent = `
    .mfa-overlay{ position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;
      padding:20px;background:color-mix(in srgb,var(--ink,#142037) 42%,transparent);backdrop-filter:blur(2px); }
    .mfa-card{ background:var(--surface,#fff);border:1px solid var(--border,#E5E9F0);border-radius:18px;
      padding:26px 24px;width:min(420px,100%);box-shadow:0 24px 60px rgba(20,32,55,.22);
      display:flex;flex-direction:column;gap:12px;text-align:center;max-height:92vh;overflow:auto; }
    .mfa-title{ font-family:var(--serif,Georgia),serif;font-size:20px;font-weight:600;color:var(--text,#142037);margin:0; }
    .mfa-sub{ font-size:13px;color:var(--text2,#5E6A85);margin:0;text-align:left;line-height:1.5; }
    .mfa-qr{ display:flex;justify-content:center;padding:8px;background:#fff;border-radius:12px;border:1px solid var(--border,#E5E9F0); }
    .mfa-secret{ font-size:11.5px;color:var(--text3,#94A0B6);margin:0;line-height:1.6; }
    .mfa-secret code{ font-size:12.5px;color:var(--text,#142037);background:var(--surface2,#F4F6F8);padding:3px 7px;border-radius:6px;letter-spacing:.06em; }
    .mfa-input{ border:1.5px solid var(--border,#d1d8e8);border-radius:10px;padding:12px;font-size:22px;
      text-align:center;letter-spacing:.4em;font-family:inherit;background:var(--surface,#fff);color:var(--text,#142037); }
    .mfa-input:focus{ outline:none;border-color:var(--primary,#0C7C88);box-shadow:0 0 0 3px rgba(12,124,136,.16); }
    .mfa-err{ background:color-mix(in srgb,var(--danger,#C04F3F) 12%,var(--surface,#fff));border:1px solid var(--danger,#C04F3F);
      border-radius:9px;padding:9px 11px;font-size:12.5px;color:var(--danger,#C04F3F);text-align:left; }
    .mfa-actions{ display:flex;gap:10px;justify-content:flex-end;margin-top:4px; }
  `;
  document.head.appendChild(s);
}
