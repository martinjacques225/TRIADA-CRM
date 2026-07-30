// js/format.js — Estandarización y validación de datos (Fase 2)
// Helpers puros + cableado automático de inputs vía data-fmt.
//
// ── REGLA DEL CRM (2026-07-29) ──────────────────────────────────────────────
// El dato se guarda SIEMPRE canónico, sin importar cómo lo escriba el vendedor:
//   texto    → MAYÚSCULAS, sin espacios dobles  ("juan  pérez" → "JUAN PÉREZ")
//   RUT      → 12.345.678-9                     ("123456789"   → "12.345.678-9")
//   teléfono → +56912345678                     ("9 1234 5678" → "+56912345678")
//   email    → minúsculas                       (algunos buzones son sensibles)
// El dígito verificador se COMPRUEBA pero NO bloquea el guardado: avisa y sigue.
// En terreno, perder el lead por un typo en el RUT es peor que guardar el typo.
//
// Los catálogos (rubro, tamaño, dolor, origen, etapa) NO se tocan: son enums de
// <select>; pasarlos a mayúsculas rompería el pipeline y los filtros.

// ── RUT chileno (módulo 11) ──
export function cleanRut(rut) {
  return String(rut || '').replace(/[^0-9kK]/g, '').toUpperCase();
}

/** Cualquier entrada → 12.345.678-9. No juzga el dígito verificador. */
export function formatRut(rut) {
  const c = cleanRut(rut);
  if (c.length < 2) return c;
  const body = c.slice(0, -1);
  const dv   = c.slice(-1);
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${withDots}-${dv}`;
}

/** Dígito verificador correcto (módulo 11). Solo para AVISAR, nunca para bloquear. */
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

// ── Teléfono Chile → +56912345678 (compacto, sin espacios) ──
// Formato compacto a propósito: es el que aceptan wa.me, tel: y el clic-a-llamar
// del móvil sin reprocesar, y el que se puede copiar/pegar de un tirón.
// Idempotente: reformatear la salida devuelve lo mismo (lo exige el vivo del
// input, que reingiere su propio "+56" en cada tecla).
export function formatPhoneCL(v) {
  let d = String(v || '').replace(/\D/g, '').replace(/^0+/, '');
  // Quita el prefijo país que ya venía (o el que agregamos nosotros al tipear).
  // SIN tope de largo: con `d.length > 2` el caso `d === '56'` no se limpiaba, se
  // tomaba por número y se le volvía a anteponer el prefijo → '+56' se convertía
  // en '+5656'. Borrando de a un carácter el campo quedaba atascado oscilando
  // entre '+565' y '+5656' y NUNCA se podía vaciar (bug reportado 2026-07-30).
  // Ahora, al borrar el último dígito del cuerpo, '+56' → '' y el campo queda
  // limpio, que es lo que espera quien está borrando para retipear.
  while (d.startsWith('56')) d = d.slice(2);
  d = d.slice(0, 9);
  return d ? '+56' + d : '';
}

/** Móvil chileno bien formado: +569 + 8 dígitos. Solo para avisar. */
export function validatePhoneCL(v) {
  return /^\+569\d{8}$/.test(formatPhoneCL(v));
}

// ── Email ──
export function validateEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());
}

/** Email canónico: minúsculas y sin espacios (el resto de los datos va en MAYÚSCULAS). */
export function normalizeEmail(v) {
  return String(v || '').trim().toLowerCase();
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

/** Texto canónico del CRM: MAYÚSCULAS, sin espacios dobles ni bordes. */
export function normalizeText(v) {
  return String(v || '').replace(/\s+/g, ' ').trim().toUpperCase();
}

// ── Cableado automático: inputs con [data-fmt] ──
// Uso: en el HTML del campo agrega data-fmt="upper|rut|phone|email|clp"
// y llama attachFormatting(contenedor) tras inyectar el HTML.
// Sirve igual en el CRM de escritorio y en la PWA móvil (mismo DOM, misma regla).

// El cursor se recoloca contando los caracteres significativos que quedaban a su
// DERECHA. Es lo único que sobrevive a un formateador que inserta puntos, guión y
// un prefijo "+56" que el usuario no tipeó.
function _applyLive(el, fmt, isSig) {
  const old = el.value;
  const caret = el.selectionStart ?? old.length;
  let right = 0;
  for (let i = caret; i < old.length; i++) if (isSig(old[i])) right++;
  const out = fmt(old);
  if (out === old) return;
  el.value = out;
  let pos = out.length, seen = 0;
  while (pos > 0 && seen < right) { pos--; if (isSig(out[pos])) seen++; }
  try { el.setSelectionRange(pos, pos); } catch (_) {}
}

const _isDigit    = (c) => c >= '0' && c <= '9';
const _isRutChar  = (c) => _isDigit(c) || c === 'K' || c === 'k';

export function attachFormatting(root = document) {
  root.querySelectorAll('[data-fmt]').forEach(el => {
    if (el._fmtBound) return;        // evita doble binding
    el._fmtBound = true;
    const t = el.dataset.fmt;

    if (t === 'upper') {
      // En vivo: lo que se ve escrito es lo que se guarda.
      el.addEventListener('input', () => _applyLive(el, upper, () => true));
      el.addEventListener('blur',  () => { el.value = normalizeText(el.value); });
      if (el.value) el.value = upper(el.value);
    }
    if (t === 'rut') {
      // Se arma solo mientras tipea: 123456789 → 12.345.678-9.
      el.addEventListener('input', () => {
        _applyLive(el, formatRut, _isRutChar);
        el.style.borderColor = '';   // sin veredicto hasta que termine de escribir
      });
      el.addEventListener('blur', () => {
        el.value = formatRut(el.value);
        // Verde/ámbar es un aviso, no un bloqueo: el RUT se guarda igual.
        el.style.borderColor = !el.value ? ''
          : validateRut(el.value) ? 'var(--green)' : 'var(--warn, #C08A2E)';
      });
      if (el.value) el.value = formatRut(el.value);
    }
    if (t === 'phone') {
      // Teclado numérico en el teléfono + formato +56912345678 en vivo.
      el.setAttribute('inputmode', 'tel');
      el.setAttribute('autocomplete', 'tel');
      el.addEventListener('input', () => _applyLive(el, formatPhoneCL, _isDigit));
      el.addEventListener('blur',  () => { el.value = formatPhoneCL(el.value); });
      if (el.value) el.value = formatPhoneCL(el.value);
    }
    if (t === 'email') {
      el.setAttribute('inputmode', 'email');
      el.addEventListener('blur', () => {
        el.value = normalizeEmail(el.value);
        el.style.borderColor = (!el.value || validateEmail(el.value)) ? '' : 'var(--danger)';
      });
    }
    if (t === 'clp') {
      el.setAttribute('inputmode', 'numeric');
      el.addEventListener('input', () => {
        const d = el.value.replace(/\D/g, '');
        el.value = d ? Number(d).toLocaleString('es-CL') : '';
      });
    }
  });
}
