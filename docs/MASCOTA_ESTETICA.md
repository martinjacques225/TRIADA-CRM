# Mascota (gato) — Estética actual · handoff para rediseño

> **Para Claude Design.** Este doc tiene TODO el aspecto visual del gato del CRM (SVG,
> paleta, dimensiones, animaciones) y, al final, **lo que NO se puede romper** para que el
> nuevo diseño siga funcionando con el motor de comportamiento.
> Archivo fuente: `modules/mascota/mascota.js`. Generado: 2026-06-13.

---

## 0. Qué es

Un gato vectorial (estética cálida, tipo mascota de Claude Code) que vive flotando sobre el
CRM. Es un sprite **SVG de 92×92 px** (`viewBox 0 0 100 100`), posicionado `position: fixed`,
`z-index: 9000`, `pointer-events: none` (no bloquea clics). Es opt-in (apagado por defecto).
El comportamiento (pasear, perseguir el cursor, colgarse de tarjetas, dormir, parpadear) lo
mueve un motor en JS; **el rediseño es puramente del dibujo y los colores**, no de la lógica.

- Tamaño del sprite: `W = 92` px (constante en JS). El `viewBox` interno es `0 0 100 100`.
- Sombra base: `filter: drop-shadow(0 6px 9px rgba(20,32,55,.22))` sobre `.mascota-cat`.
- Punto de pivote por defecto: `transform-origin: 50% 90%` (patas). Al colgarse cambia a
  `50% 12%` (se cuelga desde la cabeza/bracitos).

---

## 1. Paleta de colores (hex actuales)

| Rol | Hex | Dónde |
|---|---|---|
| Cuerpo / orejas (exterior) | `#E3B485` | torso, triángulos de orejas |
| Cara (relleno principal) | `#EDC197` | óvalo de la cara, paletas de las patitas internas, **párpados** |
| Marrón medio (cola, bracitos, patitas, orejas interior-base) | `#D49A6A` | cola, brazos al colgarse, patitas, líneas |
| Marrón orejas (interior) | `#C98C5A` | relleno interior de las orejas |
| Pupilas | `#2A2A33` | ojos (casi negro) |
| Blanco de los ojos | `#FFFFFF` | esclerótica |
| Nariz | `#C9728B` | triángulo de la nariz (rosa/malva) |
| Boca | `#B5763F` | trazo de la boca |
| Bigotes | `#D7B791` | 4 trazos finos a los lados |
| Almohadillas de los bracitos | `#EDC197` | círculos en las puntas de los brazos |

> Los **párpados** usan el mismo `#EDC197` de la cara a propósito: al parpadear "tapan" el ojo
> con color de piel. Si cambias el color de la cara, cambia también el de los párpados para que
> el blink se vea natural.

Colores del **bocadillo de diálogo** (usan variables del tema del CRM, con fallback):
`--surface (#fff)` fondo · `--text (#2A3553)` texto · `--border (#E5E9F0)` borde ·
`--shadow (0 4px 14px rgba(20,32,55,.12))` · `--font` tipografía · la "z" de dormir usa
`--text3 (#94A0B6)`.

---

## 2. SVG actual (verbatim)

Estructura: `#mascota` › `.m-bubble#mBubble` (bocadillo) + `.m-flip` (wrapper para voltear
izquierda/derecha) › `svg.mascota-cat`. Dentro del SVG, de atrás hacia delante: bracitos →
cola → cuerpo → patitas → cabeza (orejas, cara, ojos, nariz, boca, bigotes) → "z" de dormir.

```html
<div class="m-bubble" id="mBubble"></div>
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
</svg></div>
```

---

## 3. CSS / estilos (verbatim, inyectado como `#mascota-style`)

```css
#mascota { position: fixed; left: 0; top: 0; width: 92px; height: 92px; z-index: 9000; pointer-events: none; user-select: none; will-change: transform; }
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
```

---

## 4. Animaciones / estados (qué pasa visualmente)

| Estado (clase en `#mascota`) | Efecto visual |
|---|---|
| `m-sit` | quieto, sentado (sin animación de cuerpo; cola siempre se mueve) |
| `m-walk` | caminata suave (`mascotaWalk` .42s: sube/baja 3px + leve giro) |
| `m-chase` | igual que walk pero rápido (.26s) — persigue el cursor |
| `m-hop` | brinco/pounce (`mascotaHop` .5s, sube 16px y rebota) |
| `m-hang` | colgado del borde de una tarjeta: aparecen los bracitos (`.m-arms`) y oscila (`mascotaSway`, pivote arriba 50% 12%) |
| `m-blink` | párpados `scaleY 0→1` 140 ms |
| `m-sleep` | párpados cerrados + "z" flotando (`mascotaZ`) |
| `m-say` | aparece el bocadillo con texto (`#mBubble`) |
| (siempre) | cola oscila (`mascotaTail` 2.6s); ojos siguen el cursor (ver §5) |

Frases del bocadillo (texto, no estética): `miau 🐾`, `¡prr! 😸`, `¿jugamos?`, `miiiau`, `😺`, `¡atrápame!`, `😼`.

---

## 5. Seguimiento de ojos (mecánica que el dibujo debe soportar)

El motor mueve las **pupilas** hacia el cursor en cada frame con un `transform: translate(ox oy)`
sobre `#mPupilL` y `#mPupilR`. El rango de desplazamiento es ~±2.6 px en X y ±2.8 px en Y
(normalizado por la dirección al cursor; X se invierte con el flip). Por eso las pupilas
**deben ser elementos propios, separados del blanco del ojo**, y tener un poco de blanco
alrededor para que el movimiento se note. Si rediseñas los ojos, mantén pupila ≠ esclerótica.

---

## 6. ⛔ Contrato — lo que NO se puede romper

Para que el nuevo dibujo siga funcionando con el motor de comportamiento (`mascota.js`), el SVG
que entregue Claude Design **debe conservar exactamente estos hooks** (clases/IDs y estructura):

- **Wrapper:** todo dentro de `.m-flip` (el motor le aplica `scaleX(±1)` para voltear).
- **`svg.mascota-cat`** — es el elemento animado; la clase es obligatoria.
- **`.m-arms`** — grupo de los bracitos (oculto salvo al colgarse). Puede rediseñarse, pero la
  clase debe existir y empezar oculto.
- **`.m-tail`** — la cola (animada). `transform-origin: 70% 80%`.
- **`.m-eyelid`** ×2 — párpados (uno por ojo) para parpadeo/dormir.
- **`.m-pupil` con IDs `#mPupilL` y `#mPupilR`** — pupilas; el motor les inyecta `translate`.
- **`.m-z`** — la "z" de dormir.
- **`.m-bubble` con id `mBubble`** — bocadillo de diálogo (fuera del `<svg>`, dentro de `#mascota`).
- **`viewBox="0 0 100 100"`** — mantener el sistema de coordenadas 100×100 (el motor asume ese
  marco y un sprite de 92px). Si cambias el viewBox, hay que ajustar `W` y los pivotes en JS.
- Estados por clase en `#mascota` que el CSS espera: `m-sit`, `m-walk`, `m-chase`, `m-hop`,
  `m-hang`, `m-blink`, `m-sleep`, `m-say`. Si renombras animaciones, mantené estos selectores.

> Libre de rediseñar: formas, proporciones, paleta, grosores, detalles (incluso cambiar de gato
> a otro animal), siempre que se respeten los hooks de arriba. Si quieres tocar tamaño del sprite
> o el viewBox, avísame y ajusto `mascota.js` (constante `W`, clamps y pivotes) en consecuencia.
```
