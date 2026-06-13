// modules/mascota/mascota.js
// Mascota de la compañía: un gato flotante (estética cálida tipo mascota de
// Claude Code) que sigue el cursor con la mirada, parpadea, se duerme al ocio y
// reacciona al clic. Versión base; las interacciones avanzadas (colgarse de las
// cards, jugar con el mouse, fondos interactivos) llegan en una etapa dedicada.
import { config } from '../../js/db.js';

let _enabled = false;
let _tipo = 'gato';
let _el = null;          // contenedor flotante
let _onMove = null;
let _idleTimer = null;
let _raf = 0;
let _target = { x: 0, y: 0 };

const MASCOTAS = [
  { id: 'gato',  label: 'Gato',  emoji: '🐱', disabled: false },
  { id: 'robot', label: 'Robot', emoji: '🤖', disabled: true  },
  { id: 'buho',  label: 'Búho',  emoji: '🦉', disabled: true  },
];
export function mascotasDisponibles() { return MASCOTAS; }
export function mascotaEnabled() { return _enabled; }
export function mascotaTipo() { return _tipo; }

export async function initMascota() {
  const en = await config.get('mascotaEnabled');
  _enabled = en === '1';                       // opt-in: apagada por defecto
  _tipo = (await config.get('mascotaTipo')) || 'gato';
  _apply();
}

export async function setMascotaEnabled(on) {
  _enabled = !!on;
  await config.set('mascotaEnabled', on ? '1' : '0');
  _apply();
}

export async function setMascota(tipo) {
  _tipo = tipo;
  await config.set('mascotaTipo', tipo);
  if (_enabled) _apply();
}

function _injectStyle() {
  if (document.getElementById('mascota-style')) return;
  const s = document.createElement('style');
  s.id = 'mascota-style';
  s.textContent = `
    #mascota { position: fixed; right: 22px; bottom: 22px; width: 92px; height: 92px; z-index: 9000; pointer-events: none; user-select: none; }
    #mascota .mascota-cat { width: 100%; height: 100%; pointer-events: auto; cursor: pointer; filter: drop-shadow(0 6px 10px rgba(20,32,55,.22)); transform-origin: 50% 100%; transition: transform .18s var(--ease,ease); }
    #mascota .mascota-cat:hover { transform: translateY(-2px); }
    #mascota.mascota-hop .mascota-cat { animation: mascotaHop .5s var(--ease,ease); }
    #mascota .m-eyelid { transform-origin: center; transform: scaleY(0); transition: transform .12s ease; }
    #mascota.mascota-blink .m-eyelid,
    #mascota.mascota-sleep .m-eyelid { transform: scaleY(1); }
    #mascota .m-tail { transform-origin: 70% 80%; animation: mascotaTail 2.6s ease-in-out infinite; }
    #mascota .m-z { opacity: 0; }
    #mascota.mascota-sleep .m-z { animation: mascotaZ 2.4s linear infinite; }
    #mascota .m-bubble { position: absolute; right: 78px; bottom: 60px; background: var(--surface,#fff); color: var(--text,#2A3553); border: 1px solid var(--border,#E5E9F0); border-radius: 12px; padding: 5px 10px; font-size: 12px; font-weight: 600; white-space: nowrap; box-shadow: var(--shadow,0 4px 14px rgba(20,32,55,.12)); opacity: 0; transform: translateY(4px); transition: opacity .2s, transform .2s; pointer-events: none; font-family: var(--font, sans-serif); }
    #mascota.mascota-say .m-bubble { opacity: 1; transform: translateY(0); }
    @keyframes mascotaHop { 0%,100%{ transform: translateY(0) } 30%{ transform: translateY(-16px) } 55%{ transform: translateY(0) } 70%{ transform: translateY(-6px) } }
    @keyframes mascotaTail { 0%,100%{ transform: rotate(-6deg) } 50%{ transform: rotate(12deg) } }
    @keyframes mascotaZ { 0%{ opacity:0; transform: translate(0,0) scale(.7) } 30%{ opacity:.9 } 100%{ opacity:0; transform: translate(8px,-18px) scale(1.1) } }
    @media (prefers-reduced-motion: reduce) { #mascota .m-tail, #mascota.mascota-sleep .m-z { animation: none } }
  `;
  document.head.appendChild(s);
}

// Gato cálido, redondeado, ojos grandes con pupilas móviles.
function _catSvg() {
  return `<div class="m-bubble" id="mBubble"></div>
  <svg class="mascota-cat" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-label="Mascota gato">
    <!-- cola -->
    <path class="m-tail" d="M78 78 q22 2 16 -22 q-3 -12 -12 -10" fill="none" stroke="#D49A6A" stroke-width="9" stroke-linecap="round"/>
    <!-- cuerpo -->
    <path d="M28 92 q-6 -26 8 -38 h28 q14 12 8 38 z" fill="#E3B485"/>
    <!-- cabeza -->
    <g>
      <!-- orejas -->
      <path d="M30 40 L26 20 L44 32 Z" fill="#E3B485"/>
      <path d="M70 40 L74 20 L56 32 Z" fill="#E3B485"/>
      <path d="M32 36 L30 25 L40 32 Z" fill="#C98C5A"/>
      <path d="M68 36 L70 25 L60 32 Z" fill="#C98C5A"/>
      <!-- cara -->
      <ellipse cx="50" cy="50" rx="26" ry="23" fill="#EDC197"/>
      <!-- ojos (blanco + pupila móvil + párpado) -->
      <g>
        <ellipse cx="40" cy="49" rx="7" ry="8.5" fill="#fff"/>
        <ellipse class="m-pupil" id="mPupilL" cx="40" cy="50" rx="3.6" ry="4.6" fill="#2A2A33"/>
        <rect class="m-eyelid" x="32.5" y="40" width="15" height="10" rx="5" fill="#EDC197"/>
      </g>
      <g>
        <ellipse cx="60" cy="49" rx="7" ry="8.5" fill="#fff"/>
        <ellipse class="m-pupil" id="mPupilR" cx="60" cy="50" rx="3.6" ry="4.6" fill="#2A2A33"/>
        <rect class="m-eyelid" x="52.5" y="40" width="15" height="10" rx="5" fill="#EDC197"/>
      </g>
      <!-- nariz + boca -->
      <path d="M47 58 h6 l-3 3 z" fill="#C9728B"/>
      <path d="M50 61 q-4 4 -8 1 M50 61 q4 4 8 1" fill="none" stroke="#B5763F" stroke-width="1.6" stroke-linecap="round"/>
      <!-- bigotes -->
      <path d="M30 54 h-12 M31 58 h-12 M70 54 h12 M69 58 h12" stroke="#D7B791" stroke-width="1.3" stroke-linecap="round"/>
    </g>
    <!-- z de sueño -->
    <text class="m-z" x="74" y="30" font-size="12" font-weight="800" fill="var(--text3,#94A0B6)">z</text>
  </svg>`;
}

function _apply() {
  _injectStyle();
  // limpiar estado previo
  if (_onMove) { window.removeEventListener('mousemove', _onMove); _onMove = null; }
  if (_idleTimer) { clearTimeout(_idleTimer); _idleTimer = null; }
  if (_raf) { cancelAnimationFrame(_raf); _raf = 0; }
  if (_el) { _el.remove(); _el = null; }
  if (!_enabled) return;

  _el = document.createElement('div');
  _el.id = 'mascota';
  _el.innerHTML = _catSvg();
  document.body.appendChild(_el);

  const cat = _el.querySelector('.mascota-cat');
  const pL = _el.querySelector('#mPupilL');
  const pR = _el.querySelector('#mPupilR');
  const bubble = _el.querySelector('#mBubble');

  // ── seguir el cursor con la mirada ──
  const follow = () => {
    _raf = 0;
    const r = _el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height * 0.5;
    const dx = _target.x - cx, dy = _target.y - cy;
    const d = Math.hypot(dx, dy) || 1;
    const ox = (dx / d) * 2.6, oy = (dy / d) * 2.8;
    if (pL) pL.setAttribute('transform', `translate(${ox} ${oy})`);
    if (pR) pR.setAttribute('transform', `translate(${ox} ${oy})`);
  };
  _onMove = (e) => {
    _target.x = e.clientX; _target.y = e.clientY;
    _el.classList.remove('mascota-sleep');
    if (!_raf) _raf = requestAnimationFrame(follow);
    // reiniciar temporizador de ocio → dormir tras 7 s sin movimiento
    if (_idleTimer) clearTimeout(_idleTimer);
    _idleTimer = setTimeout(() => _el && _el.classList.add('mascota-sleep'), 7000);
  };
  window.addEventListener('mousemove', _onMove);

  // ── parpadeo periódico ──
  const blink = () => {
    if (!_el) return;
    if (!_el.classList.contains('mascota-sleep')) {
      _el.classList.add('mascota-blink');
      setTimeout(() => _el && _el.classList.remove('mascota-blink'), 150);
    }
    setTimeout(blink, 2600 + Math.random() * 3200);
  };
  setTimeout(blink, 2400);

  // ── reacción al clic ──
  const frases = ['miau 🐾', '¡prr! 😸', 'aquí estoy', '¿trabajando? 💪', 'miiiau'];
  cat.addEventListener('click', () => {
    if (!_el) return;
    _el.classList.remove('mascota-sleep', 'mascota-hop');
    void _el.offsetWidth;             // reflow para re-disparar la animación
    _el.classList.add('mascota-hop');
    setTimeout(() => _el && _el.classList.remove('mascota-hop'), 500);
    bubble.textContent = frases[Math.floor(Math.random() * frases.length)];
    _el.classList.add('mascota-say');
    clearTimeout(_apply._sayT);
    _apply._sayT = setTimeout(() => _el && _el.classList.remove('mascota-say'), 1800);
  });

  // arranca con temporizador de ocio
  _idleTimer = setTimeout(() => _el && _el.classList.add('mascota-sleep'), 7000);
}
