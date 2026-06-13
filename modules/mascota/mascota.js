// modules/mascota/mascota.js
// Mascota de la compañía: un gato (estética cálida tipo mascota de Claude Code)
// con un pequeño motor de comportamiento. Se pasea por el CRM, se cuelga de las
// tarjetas, persigue/juega con el cursor, parpadea, se duerme y reacciona a los
// clics. Opt-in; persiste en config. No bloquea la UI (pointer-events: none).
import { config } from '../../js/db.js';

let _enabled = false;
let _tipo = 'gato';
let _el = null, _flip = null, _cat = null, _bubble = null;
let _raf = 0, _brainT = null, _blinkT = null;
let _onMove = null, _onClick = null, _onResize = null;

// Cursor + estado del "cerebro"
let _mx = 0, _my = 0, _mMovedAt = 0;
const _S = { x: 0, y: 0, mode: 'sit', tx: 0, ty: 0, facing: 1, hopUntil: 0, hangUntil: 0, modeSince: 0 };

const W = 92; // tamaño del sprite

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

const _reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const now = () => Date.now();
const clampX = (x) => Math.max(6, Math.min(window.innerWidth - W - 2, x));
const clampY = (y) => Math.max(6, Math.min(window.innerHeight - W - 2, y));
// Esquina inferior derecha ocupada por el dock de recordatorios: la mascota la evita al pasear.
function _avoidDock(x, y) {
  if (x > window.innerWidth - 240 && y > window.innerHeight - 150) return clampX(window.innerWidth - 270);
  return x;
}

function _injectStyle() {
  if (document.getElementById('mascota-style')) return;
  const s = document.createElement('style');
  s.id = 'mascota-style';
  s.textContent = `
    #mascota { position: fixed; left: 0; top: 0; width: ${W}px; height: ${W}px; z-index: 9000; pointer-events: none; user-select: none; will-change: transform; }
    #mascota .m-flip { width: 100%; height: 100%; transition: transform .25s ease; }
    #mascota .mascota-cat { width: 100%; height: 100%; filter: drop-shadow(0 6px 9px rgba(20,32,55,.22)); transform-origin: 50% 90%; }
    #mascota.m-walk .mascota-cat { animation: mascotaWalk .42s ease-in-out infinite; }
    #mascota.m-chase .mascota-cat { animation: mascotaWalk .26s ease-in-out infinite; }
    #mascota.m-hop  .mascota-cat { animation: mascotaHop .5s var(--ease,ease); }
    #mascota.m-hang .mascota-cat { animation: mascotaSway 2.4s ease-in-out infinite; transform-origin: 50% 12%; }
    #mascota .m-arms { opacity: 0; transition: opacity .2s; }
    #mascota.m-hang .m-arms { opacity: 1; }
    #mascota .m-eyelid { transform-origin: center; transform: scaleY(0); transition: transform .1s ease; }
    #mascota.m-blink .m-eyelid, #mascota.m-sleep .m-eyelid { transform: scaleY(1); }
    #mascota .m-tail { transform-origin: 70% 80%; animation: mascotaTail 2.6s ease-in-out infinite; }
    #mascota .m-z { opacity: 0; }
    #mascota.m-sleep .m-z { animation: mascotaZ 2.4s linear infinite; }
    #mascota .m-bubble { position: absolute; left: 50%; top: -10px; transform: translate(-50%,4px); background: var(--surface,#fff); color: var(--text,#2A3553); border: 1px solid var(--border,#E5E9F0); border-radius: 12px; padding: 4px 9px; font-size: 12px; font-weight: 600; white-space: nowrap; box-shadow: var(--shadow,0 4px 14px rgba(20,32,55,.12)); opacity: 0; transition: opacity .2s, transform .2s; font-family: var(--font, sans-serif); }
    #mascota.m-say .m-bubble { opacity: 1; transform: translate(-50%,-2px); }
    @keyframes mascotaWalk { 0%,100%{ transform: translateY(0) rotate(0) } 50%{ transform: translateY(-3px) rotate(.5deg) } }
    @keyframes mascotaHop  { 0%,100%{ transform: translateY(0) } 30%{ transform: translateY(-16px) } 55%{ transform: translateY(0) } 70%{ transform: translateY(-6px) } }
    @keyframes mascotaSway { 0%,100%{ transform: rotate(-7deg) } 50%{ transform: rotate(7deg) } }
    @keyframes mascotaTail { 0%,100%{ transform: rotate(-6deg) } 50%{ transform: rotate(12deg) } }
    @keyframes mascotaZ { 0%{ opacity:0; transform: translate(0,0) scale(.7) } 30%{ opacity:.9 } 100%{ opacity:0; transform: translate(8px,-18px) scale(1.1) } }
    @media (prefers-reduced-motion: reduce) { #mascota .mascota-cat, #mascota .m-tail, #mascota.m-sleep .m-z { animation: none !important } }
  `;
  document.head.appendChild(s);
}

function _catSvg() {
  return `<div class="m-bubble" id="mBubble"></div>
  <div class="m-flip">
  <svg class="mascota-cat" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-label="Mascota gato">
    <!-- bracitos que se aferran (solo visibles al colgarse) -->
    <g class="m-arms">
      <path d="M40 20 C36 8 34 4 34 1" stroke="#D49A6A" stroke-width="7" stroke-linecap="round" fill="none"/>
      <path d="M60 20 C64 8 66 4 66 1" stroke="#D49A6A" stroke-width="7" stroke-linecap="round" fill="none"/>
      <circle cx="34" cy="2" r="4.5" fill="#EDC197"/>
      <circle cx="66" cy="2" r="4.5" fill="#EDC197"/>
    </g>
    <!-- cola -->
    <path class="m-tail" d="M78 78 q22 2 16 -22 q-3 -12 -12 -10" fill="none" stroke="#D49A6A" stroke-width="9" stroke-linecap="round"/>
    <!-- cuerpo -->
    <path d="M28 92 q-6 -26 8 -38 h28 q14 12 8 38 z" fill="#E3B485"/>
    <!-- patitas -->
    <ellipse cx="40" cy="92" rx="6" ry="4" fill="#D49A6A"/>
    <ellipse cx="60" cy="92" rx="6" ry="4" fill="#D49A6A"/>
    <!-- cabeza -->
    <g>
      <path d="M30 40 L26 20 L44 32 Z" fill="#E3B485"/>
      <path d="M70 40 L74 20 L56 32 Z" fill="#E3B485"/>
      <path d="M32 36 L30 25 L40 32 Z" fill="#C98C5A"/>
      <path d="M68 36 L70 25 L60 32 Z" fill="#C98C5A"/>
      <ellipse cx="50" cy="50" rx="26" ry="23" fill="#EDC197"/>
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
      <path d="M47 58 h6 l-3 3 z" fill="#C9728B"/>
      <path d="M50 61 q-4 4 -8 1 M50 61 q4 4 8 1" fill="none" stroke="#B5763F" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M30 54 h-12 M31 58 h-12 M70 54 h12 M69 58 h12" stroke="#D7B791" stroke-width="1.3" stroke-linecap="round"/>
    </g>
    <text class="m-z" x="74" y="30" font-size="12" font-weight="800" fill="var(--text3,#94A0B6)">z</text>
  </svg></div>`;
}

function _cleanup() {
  if (_raf) { cancelAnimationFrame(_raf); _raf = 0; }
  if (_brainT) { clearTimeout(_brainT); _brainT = null; }
  if (_blinkT) { clearTimeout(_blinkT); _blinkT = null; }
  if (_onMove)   { window.removeEventListener('mousemove', _onMove); _onMove = null; }
  if (_onClick)  { window.removeEventListener('click', _onClick); _onClick = null; }
  if (_onResize) { window.removeEventListener('resize', _onResize); _onResize = null; }
  if (_el) { _el.remove(); _el = null; }
  _flip = _cat = _bubble = null;
}

function _apply() {
  _injectStyle();
  _cleanup();
  if (!_enabled) return;

  _el = document.createElement('div');
  _el.id = 'mascota';
  _el.className = 'mascota m-sit';
  _el.innerHTML = _catSvg();
  document.body.appendChild(_el);
  _flip   = _el.querySelector('.m-flip');
  _cat    = _el.querySelector('.mascota-cat');
  _bubble = _el.querySelector('#mBubble');

  // Nace abajo-izquierda (el dock de recordatorios vive abajo-derecha)
  _S.x = clampX(24);
  _S.y = clampY(window.innerHeight - 130);
  _S.mode = 'sit'; _S.modeSince = now();
  _mx = _S.x + W / 2; _my = _S.y;
  _draw();

  _onMove = (e) => {
    _mx = e.clientX; _my = e.clientY; _mMovedAt = now();
    if (_S.mode === 'sleep') _setMode('sit');
    // Si el cursor pasa cerca y la mascota está tranquila, se pone a jugar
    if ((_S.mode === 'sit' || _S.mode === 'walk')) {
      const d = Math.hypot(_mx - (_S.x + W / 2), _my - (_S.y + W / 2));
      if (d < 150) _setMode('chase');
    }
  };
  _onClick = (e) => {
    const d = Math.hypot(e.clientX - (_S.x + W / 2), e.clientY - (_S.y + W / 2));
    if (d < W * 0.7) _react();
  };
  _onResize = () => { _S.x = clampX(_S.x); _S.y = clampY(_S.y); _draw(); };
  window.addEventListener('mousemove', _onMove);
  window.addEventListener('click', _onClick);
  window.addEventListener('resize', _onResize);

  _blink();
  _brain();
  _raf = requestAnimationFrame(_tick);
}

function _setMode(mode) {
  if (!_el) return;
  _S.mode = mode; _S.modeSince = now();
  _el.className = 'mascota m-' + mode;
  if (mode === 'hang') _S.hangUntil = now() + 6000 + Math.random() * 5000;
}

const _frases = ['miau 🐾', '¡prr! 😸', '¿jugamos?', 'miiiau', '😺', '¡atrápame!'];
function _react() {
  if (!_el) return;
  _el.classList.remove('m-hop'); void _el.offsetWidth; _el.classList.add('m-hop');
  setTimeout(() => _el && _el.classList.remove('m-hop'), 500);
  _say(_frases[Math.floor(Math.random() * _frases.length)]);
}
function _say(txt) {
  if (!_bubble) return;
  _bubble.textContent = txt;
  _el.classList.add('m-say');
  clearTimeout(_say._t);
  _say._t = setTimeout(() => _el && _el.classList.remove('m-say'), 1700);
}

function _blink() {
  if (!_el) return;
  if (_S.mode !== 'sleep' && _S.mode !== 'hang') {
    _el.classList.add('m-blink');
    setTimeout(() => _el && _el.classList.remove('m-blink'), 140);
  }
  _blinkT = setTimeout(_blink, 2600 + Math.random() * 3400);
}

// Elige una tarjeta visible para colgarse de su borde superior
function _pickCard() {
  const cards = [...document.querySelectorAll('.card, .kpi-card')];
  const opts = cards.map(c => c.getBoundingClientRect()).filter(r =>
    r.width > 130 && r.top > 70 && r.top < window.innerHeight - 130 && r.left > 30 && r.right < window.innerWidth - 10);
  if (!opts.length) return null;
  const r = opts[Math.floor(Math.random() * opts.length)];
  return { x: clampX(r.left + Math.min(r.width - 60, 18)), y: clampY(r.top - 28) };
}

// "Cerebro": cada pocos segundos decide qué hacer estando tranquila
function _brain() {
  const reschedule = () => { _brainT = setTimeout(_brain, 3500 + Math.random() * 4000); };
  if (!_el) return;
  const idleMouse = now() - _mMovedAt > 2600;

  if (_S.mode === 'sit') {
    const r = Math.random();
    if (!idleMouse && Math.hypot(_mx - (_S.x + W / 2), _my - (_S.y + W / 2)) < 160) {
      _setMode('chase');
    } else if (r < 0.42) {                      // pasear a un punto al azar
      _S.ty = clampY(40 + Math.random() * (window.innerHeight - 160));
      _S.tx = _avoidDock(clampX(40 + Math.random() * (window.innerWidth - 160)), _S.ty);
      _setMode('walk');
    } else if (r < 0.7) {                        // colgarse de una card
      const c = _pickCard();
      if (c) { _S.tx = c.x; _S.ty = c.y; _setMode('walk'); _S._thenHang = true; }
    } else if (r < 0.85 && idleMouse) {          // dormitar
      _setMode('sleep');
    }
  }
  reschedule();
}

function _steer(speed) {
  const dx = _S.tx - _S.x, dy = _S.ty - _S.y;
  const d = Math.hypot(dx, dy);
  if (d < 4) return true;                         // llegó
  _S.x = clampX(_S.x + dx * speed);
  _S.y = clampY(_S.y + dy * speed);
  if (Math.abs(dx) > 1.5) _S.facing = dx < 0 ? 1 : -1;  // mira hacia donde va
  return false;
}

function _tick() {
  if (!_enabled || !_el) return;
  const t = now();

  if (_S.mode === 'chase') {
    _S.tx = clampX(_mx - W / 2); _S.ty = clampY(_my - W / 2);
    const dx = _S.tx - _S.x, dy = _S.ty - _S.y;
    const d = Math.hypot(dx, dy);
    _S.x = clampX(_S.x + dx * 0.12); _S.y = clampY(_S.y + dy * 0.12);
    if (Math.abs(dx) > 1.5) _S.facing = dx < 0 ? 1 : -1;
    if (d < 64 && t > _S.hopUntil) {              // ¡pounce!
      _S.hopUntil = t + 800;
      _el.classList.remove('m-hop'); void _el.offsetWidth; _el.classList.add('m-hop');
      setTimeout(() => _el && _el.classList.remove('m-hop'), 500);
      if (Math.random() < 0.5) _say('😼');
    }
    if (t - _mMovedAt > 2600) _setMode('sit');     // el cursor se quedó quieto → descansa
  } else if (_S.mode === 'walk') {
    if (_steer(0.06)) {
      if (_S._thenHang) { _S._thenHang = false; _setMode('hang'); }
      else _setMode('sit');
    }
  } else if (_S.mode === 'hang') {
    if (t > _S.hangUntil) {                         // se suelta y sigue
      _S.ty = clampY(_S.y + 90); _setMode('walk');
    }
  }

  _draw();
  _raf = requestAnimationFrame(_tick);
}

function _draw() {
  if (!_el) return;
  _el.style.transform = `translate(${Math.round(_S.x)}px, ${Math.round(_S.y)}px)`;
  if (_flip) _flip.style.transform = `scaleX(${_S.facing})`;
  // Los ojos siguen el cursor cuando está tranquila/jugando
  const pL = _el.querySelector('#mPupilL'), pR = _el.querySelector('#mPupilR');
  if (pL && pR && _S.mode !== 'sleep') {
    const cx = _S.x + W / 2, cy = _S.y + W * 0.5;
    const dx = _mx - cx, dy = _my - cy, d = Math.hypot(dx, dy) || 1;
    const ox = (dx / d) * 2.6 * _S.facing, oy = (dy / d) * 2.8;
    pL.setAttribute('transform', `translate(${ox} ${oy})`);
    pR.setAttribute('transform', `translate(${ox} ${oy})`);
  }
}
