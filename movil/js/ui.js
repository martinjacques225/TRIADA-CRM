// ============================================================================
// ui.js — helpers de presentación compartidos por todas las pantallas.
// (render seguro, logo de marca, set de íconos de línea, hojas inferiores, toasts)
// ============================================================================
import { html, raw } from './core.js';
export { html, raw };

// ── Logo de los 3 chevrons ─────────────────────────────────────────────────
// light=true → trazos blancos translúcidos (sobre fondos navy: splash, FABs).
export function logo(size = 26, { light = false, sw = 13 } = {}) {
  const c = light
    ? ['rgba(255,255,255,.55)', 'rgba(255,255,255,.8)', '#fff']
    : ['var(--navy)', 'var(--teal)', 'var(--green)'];
  return `<svg width="${size}" height="${size}" viewBox="0 0 120 120" fill="none" aria-hidden="true">
    <path d="M26 90 L60 62 L94 90" stroke="${c[0]}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M26 73 L60 45 L94 73" stroke="${c[1]}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M26 56 L60 28 L94 56" stroke="${c[2]}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

// ── Íconos de línea (viewBox 24, stroke currentColor) ──────────────────────
const ICONS = {
  bell:       '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M10.5 21a1.8 1.8 0 0 0 3 0"/>',
  search:     '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  whatsapp:   '<path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.5L3 21l2.1-5.6A8.4 8.4 0 1 1 21 11.5Z"/>',
  phone:      '<path d="M22 16.9v2.9a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 4h2.9a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 11.7a16 16 0 0 0 6 6l1.1-1.1a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/>',
  video:      '<path d="m22 8-6 4 6 4V8Z"/><rect x="2" y="6" width="14" height="12" rx="2.5"/>',
  back:       '<path d="m15 18-6-6 6-6"/>',
  next:       '<path d="m9 6 6 6-6 6"/>',
  plus:       '<path d="M12 5v14M5 12h14"/>',
  check:      '<path d="M20 6 9 17l-5-5"/>',
  mail:       '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 7 8.5 6 8.5-6"/>',
  lock:       '<rect x="4" y="10" width="16" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  eye:        '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  home:       '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/>',
  users:      '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/><path d="M16 6.5a3 3 0 0 1 0 5.5M17.5 19c0-2-.8-3.6-2-4.6"/>',
  userPlus:   '<path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="8" r="3.5"/><path d="M19 8v6M22 11h-6"/>',
  user:       '<circle cx="12" cy="8" r="3.6"/><path d="M5 20c0-3.6 3-6 7-6s7 2.4 7 6"/>',
  calendar:   '<rect x="3.5" y="5" width="17" height="16" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
  funnel:     '<path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z"/>',
  dots:       '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  refresh:    '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v5h-5"/>',
  x:          '<path d="M18 6 6 18M6 6l12 12"/>',
  send:       '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  fileText:   '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
  diag360:    '<path d="M12 3a9 9 0 1 0 9 9"/><path d="M12 3v9l6 3"/>',
  grid:       '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  cpu:        '<rect x="6.5" y="6.5" width="11" height="11" rx="2"/><path d="M9.5 9.5h5v5h-5z"/><path d="M9 2.5v3M15 2.5v3M9 18.5v3M15 18.5v3M2.5 9h3M2.5 15h3M18.5 9h3M18.5 15h3"/>',
  trending:   '<path d="M3 17l6-6 4 4 7-7"/><path d="M15 8h6v6"/>',
  coins:      '<ellipse cx="8.5" cy="7" rx="5.5" ry="2.8"/><path d="M3 7v4.5c0 1.5 2.5 2.8 5.5 2.8"/><path d="M3 11.5V16c0 1.5 2.5 2.8 5.5 2.8"/><ellipse cx="15.5" cy="14" rx="5.5" ry="2.8"/><path d="M21 14v4.5c0 1.5-2.5 2.8-5.5 2.8"/>',
  clock:      '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  pin:        '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2.6"/>',
  edit:       '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  logout:     '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  trash:      '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  share:      '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M16 6l-4-4-4 4M12 2v14"/>',
  external:   '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  appWindow:  '<rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="M2.5 9.5h19M6 7h.01M8.5 7h.01"/>',
  cart:       '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.4 12.3a1.5 1.5 0 0 0 1.5 1.2h8.2a1.5 1.5 0 0 0 1.5-1.2L21 7H6"/>',
  utensils:   '<path d="M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
  scissors:   '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88"/><path d="M14.47 14.48 20 20"/><path d="M8.12 8.12 12 12"/>',
};

export function ic(name, { size = 20, sw = 1.8 } = {}) {
  const body = ICONS[name] || '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

// ── Hoja inferior (bottom sheet) ────────────────────────────────────────────
export function openSheet(inner, { onClose, onMount, dismissible = true } = {}) {
  const root = document.getElementById('sheet-root');
  if (!root) return () => {};
  root.innerHTML = `<div class="sheet-overlay"><div class="sheet"><div class="sheet__grab"></div>${inner}</div></div>`;
  const overlay = root.firstElementChild;
  const sheetEl = overlay.querySelector('.sheet');
  const close = () => { root.innerHTML = ''; onClose && onClose(); };
  overlay.addEventListener('click', (e) => { if (dismissible && e.target === overlay) close(); });
  if (onMount) onMount(sheetEl, close);
  return close;
}
export function closeSheet() { const r = document.getElementById('sheet-root'); if (r) r.innerHTML = ''; }

// ── Toast ───────────────────────────────────────────────────────────────────
export function toast(msg, type = 'info', ms = 3000) {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const t = document.createElement('div');
  t.className = `toast toast--${type}`;
  t.textContent = msg;
  root.appendChild(t);
  setTimeout(() => t.remove(), ms);
}

// Vibración corta (donde el dispositivo lo soporte) para feedback táctil.
export function haptic(ms = 8) { try { navigator.vibrate && navigator.vibrate(ms); } catch (_) {} }

// ── Contacto rápido (WhatsApp / llamar) ─────────────────────────────────────
export function openWhatsApp(phone, text) {
  const d = String(phone || '').replace(/\D/g, '');
  if (!d) { toast('Sin teléfono registrado', 'info'); return; }
  const num = d.startsWith('56') ? d : ('56' + d.replace(/^0+/, ''));
  window.open(`https://wa.me/${num}${text ? `?text=${encodeURIComponent(text)}` : ''}`, '_blank');
}
export function openTel(phone) {
  const d = String(phone || '').replace(/[^\d+]/g, '');
  if (!d) { toast('Sin teléfono registrado', 'info'); return; }
  window.location.href = `tel:${d}`;
}

// Cambiar contraseña vía Supabase (defensivo: el mock del preview no tiene updateUser).
export async function supabaseUpdatePassword(supabase, password) {
  const fn = supabase && supabase.auth && supabase.auth.updateUser;
  if (!fn) return { error: null };
  try { return await fn.call(supabase.auth, { password }); } catch (error) { return { error }; }
}
