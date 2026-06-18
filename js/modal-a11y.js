// js/modal-a11y.js — Accesibilidad del modal global (C1 / UX-1 de la Auditoría 360):
// focus-trap + cierre con Esc + retorno de foco al cerrar.
//
// Se engancha UNA vez vía MutationObserver sobre la clase `open` del #modalOverlay,
// así cubre TODOS los openers (_openModal, _openSimpleModal, openMeetingModal,
// renderPropuestaModal…) sin tocar cada uno. El markup ya es accesible
// (role="dialog" aria-modal aria-labelledby en index.html); esto agrega el
// comportamiento de teclado que faltaba.

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',');

export function initModalA11y() {
  const overlay = document.getElementById('modalOverlay');
  if (!overlay) return;
  const box = overlay.querySelector('.modal-box');
  if (!box) return;
  if (!box.hasAttribute('tabindex')) box.setAttribute('tabindex', '-1');

  let lastFocus = null;

  // Solo elementos realmente visibles (offsetParent null = display:none / oculto).
  const focusables = () =>
    Array.from(box.querySelectorAll(FOCUSABLE)).filter(el => el.offsetParent !== null);

  function onKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      document.getElementById('modalClose')?.click(); // ruta de cierre estándar
      return;
    }
    if (e.key !== 'Tab') return;
    const els = focusables();
    if (!els.length) { e.preventDefault(); box.focus(); return; }
    const first = els[0], last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function onOpen() {
    lastFocus = document.activeElement;             // recordar foco para devolverlo
    document.addEventListener('keydown', onKeydown, true);
    // Enfocar el primer campo del cuerpo (no el botón "cerrar"); si no hay, la caja.
    requestAnimationFrame(() => {
      const body = document.getElementById('modalBody');
      const target = (body && body.querySelector(FOCUSABLE)) || box;
      target?.focus();
    });
  }

  function onClose() {
    document.removeEventListener('keydown', onKeydown, true);
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    lastFocus = null;
  }

  let wasOpen = overlay.classList.contains('open');
  new MutationObserver(() => {
    const isOpen = overlay.classList.contains('open');
    if (isOpen === wasOpen) return;               // solo reaccionar a transiciones
    wasOpen = isOpen;
    if (isOpen) onOpen(); else onClose();
  }).observe(overlay, { attributes: true, attributeFilter: ['class'] });
}
