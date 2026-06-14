// js/format.js — Estandarización y validación de datos (Fase 2)
// Helpers puros + cableado automático de inputs vía data-fmt.

// ── RUT chileno (módulo 11) ──
export function cleanRut(rut) {
  return String(rut || '').replace(/[^0-9kK]/g, '').toUpperCase();
}

export function formatRut(rut) {
  const c = cleanRut(rut);
  if (c.length < 2) return c;
  const body = c.slice(0, -1);
  const dv   = c.slice(-1);
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${withDots}-${dv}`;
}

export function validateRut(rut) {
  const c = cleanRut(rut);
  if (c.length < 2) return false;
  const body = c.slice(0, -1);
  const dv   = c.slice(-1);
  if (!/^\d+$/.test(body)) return false;
  let sum = 0, mul = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const res = 11 - (sum % 11);
  const dvCalc = res === 11 ? '0' : res === 10 ? 'K' : String(res);
  return dvCalc === dv;
}

// ── Teléfono Chile (+56 9 XXXX XXXX) ──
export function formatPhoneCL(v) {
  let d = String(v || '').replace(/\D/g, '');
  if (d.startsWith('56')) d = d.slice(2);
  d = d.slice(0, 9);
  if (!d) return '';
  if (d.length === 1) return `+56 ${d}`;
  if (d.length <= 5)  return `+56 ${d[0]} ${d.slice(1)}`;
  return `+56 ${d[0]} ${d.slice(1, 5)} ${d.slice(5)}`;
}

// ── Email ──
export function validateEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());
}

// ── Moneda CLP (parseo; el formateo vive en js/utils.js) ──
export function parseCLP(v) {
  const d = String(v || '').replace(/\D/g, '');
  return d ? Number(d) : 0;
}

// ── Texto ──
export function upper(v) {
  return String(v || '').toUpperCase();
}

// ── Cableado automático: inputs con [data-fmt] ──
// Uso: en el HTML del campo agrega data-fmt="upper|rut|phone|email|clp"
// y llama attachFormatting(contenedor) tras inyectar el HTML.
export function attachFormatting(root = document) {
  root.querySelectorAll('[data-fmt]').forEach(el => {
    if (el._fmtBound) return;        // evita doble binding
    el._fmtBound = true;
    const t = el.dataset.fmt;

    if (t === 'upper') {
      el.addEventListener('input', () => {
        const s = el.selectionStart;
        el.value = el.value.toUpperCase();
        try { el.setSelectionRange(s, s); } catch (_) {}
      });
    }
    if (t === 'rut') {
      el.addEventListener('blur', () => {
        if (!el.value.trim()) { el.style.borderColor = ''; return; }
        el.value = formatRut(el.value);
        el.style.borderColor = validateRut(el.value) ? 'var(--green)' : 'var(--danger)';
      });
    }
    if (t === 'phone') {
      el.addEventListener('blur', () => { if (el.value.trim()) el.value = formatPhoneCL(el.value); });
    }
    if (t === 'email') {
      el.addEventListener('blur', () => {
        el.style.borderColor = (!el.value.trim() || validateEmail(el.value)) ? '' : 'var(--danger)';
      });
    }
    if (t === 'clp') {
      el.addEventListener('input', () => {
        const d = el.value.replace(/\D/g, '');
        el.value = d ? Number(d).toLocaleString('es-CL') : '';
      });
    }
  });
}
