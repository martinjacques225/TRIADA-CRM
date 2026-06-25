# HANDOFF — Tríada CRM Móvil (PWA de terreno)

> Documento vivo · fuente de verdad del proyecto.
> Última actualización: **2026-06-25** · Estado: **✅ COMPLETO y DESPLEGADO**

---

## 0. Qué es y dónde está

PWA **mobile-first instalable** = compañero de terreno del CRM de Diagnóstico 360. Vive en
**`movil/` DENTRO del repo `TRIADA-CRM`** y reutiliza *literalmente* la capa de datos del
escritorio (mismo Supabase `pqrjndirqtucoumijben`), el cuestionario 360 (`js/utils.js`) y el
motor del informe PDF (`modules/informe-ejecutivo/`) → el **360 y el PDF son idénticos al de PC
por construcción** (mismos archivos, cero duplicación). Decisión del usuario: subcarpeta, no repo aparte.

- **EN VIVO:** https://martinjacques225.github.io/TRIADA-CRM/movil/ (GitHub Pages, push a `main`).
- **Instalable:** no se baja de tienda; se "Agrega a inicio" desde el navegador (botón "Instalar app" en menú Más).
- **Diseño fuente:** Claude Design `Tríada CRM Móvil.dc.html` (copia local en `Desktop/files/PROYECTO CONSULTORIA/CRM-MOVIL-CLAUDE-DESIGN/Triada-CRM-Movil.dc.html`).
- **Mismo equipo, misma cuenta, mismos datos y seguridad (RLS)** que el CRM de escritorio.

## 1. Arquitectura

```
movil/
  index.html        · app real (redirección barra-final + captura __authFlow + ../js/icons.js + js/app.js)
  preview.html      · = app con import-map → mocks del CRM (GITIGNORED, solo dev/verificación)
  manifest.json · sw.js (v2, update-prompt) · icon.svg · icon-512/192/180.png (PNG full-bleed)
  css/tokens.css    · tokens EXACTOS del diseño (claro/oscuro/matrix) + reset + keyframes
  css/app.css       · componentes (shell, nav, FABs, sheets, cards, chips, inputs, ptr, upd-bar, tria-dot…)
  js/core.js        · ⭐ COSTURA ÚNICA con ../../js/ (db, supabase, realtime, utils 360) + store + helpers
  js/ui.js          · logo, íconos de línea, openSheet, toast, openWhatsApp/openTel, supabaseUpdatePassword, haptic
  js/app.js         · controlador: boot, auth, router, chrome, sheets, REALTIME, update-SW, pull-to-refresh, install
  js/informe.js     · ⭐ Informe PDF (reutiliza computeInforme + buildReportDoc del CRM)
  js/tria.js        · asistente trIA (reglas sobre datos reales)
  js/campana.js     · panel de recordatorios
  js/screens/       · auth · hoy · leads · captura · ficha · pipeline · diagnostico · agenda · cita · propuesta · perfil
```

**Costura de datos:** todo cruce a `../../js/` y `../../modules/` pasa SOLO por `js/core.js`.
Reutiliza del CRM: `js/{supabase,db,utils,format,icons,realtime}.js`, `modules/informe-ejecutivo/*`,
y en preview los mocks `/_preview/mock-{supabase,db}.js` (vía import-map de `preview.html`).
**Cambios al CRM de PC (compartidos):** `js/realtime.js` (nuevo), `js/db.js` (+`clearReadCache`),
`app.js` (arranca Realtime). Supabase: `supabase/realtime.sql` + `supabase/team.sql` (nuevos).

## 2. Funcionalidades (todas ✅ desplegadas y verificadas)

| Área | Detalle |
|---|---|
| **Auth** | Splash animado · Login · Crear contraseña (invitación/recuperación) — Supabase Auth real |
| **Pantallas** | Hoy · Leads · Captura (RUT mód-11) · Ficha (tabs) · Pipeline · Agenda (Lista/Día) · Nueva cita (date/time nativos, editar) · Propuesta (ítems + Subtotal→IVA 19%→Total + **Cotización PDF** A4 con marca Tríada, datos del lead y T&C) · Perfil (tema swatch, equipo, cambiar contraseña, cerrar sesión) |
| **⭐ Diagnóstico 360** | EXACTO al de PC en contenido **Y forma** (2026-06-25): las **27 preguntas (3 áreas × 9) en UN SOLO scroll** apiladas como el PC (ya NO una-a-la-vez por tabs), cabecera de área con ícono + puntaje en vivo, toggle No/Parcial/Sí, progreso X/27, resumen "Puntaje por área" + **Hallazgos y Oportunidades** (textarea, parseados por línea → paridad PC). Tabs superiores = **salto rápido + scroll-spy** (IntersectionObserver). Botón Guardar = **footer sticky** (ver §6). Guarda en `diagnosticos` (scoresTec/Ventas/Finanzas 0/0.5/1 + hallazgos/oportunidades). Usa `DIAG_PREGUNTAS`/`DIAG_GRUPOS`/`scorePct` del CRM |
| **⭐ Informe PDF** | `js/informe.js` reutiliza el motor del CRM → 8 págs A4 idénticas; "Descargar PDF" = `window.print()`. **+ "Compartir" (2026-06-25):** genera el informe como PDF de 8 hojas A4 (vía `js/pdfshare.js`, html2canvas `windowWidth:1120`) y lo manda al **share nativo** (WhatsApp/Correo con adjunto); estado de carga en el botón. Verificado con PDF A4 real (Chrome headless + html2canvas) |
| **Sync EN VIVO** | `js/realtime.js` (móvil **y** PC): un cambio en un dispositivo refresca el otro solo. Móvil refresca listas conservando scroll; PC refresca salvo modal abierto |
| **Actualizaciones** | sw.js v2 (espera sin skipWaiting) + banner "Nueva versión" → SKIP_WAITING + reload · **pull-to-refresh** en listas |
| **trIA** | Asistente de reglas (sin IA externa) sobre datos reales: reunión de hoy / pasos del pipeline / resumen / redactar+enviar WhatsApp. Cada respuesta trae acción. Rotulado IA |
| **Campana** | Recordatorios: reuniones de hoy con cuenta regresiva + leads por contactar; badge condicional |
| **Multiusuario** | Mismo Auth + RLS/roles que el CRM. Alta del equipo guiada (ver §3) |
| **PWA** | Instalable (íconos PNG), tema claro/oscuro/matrix, **responsive verificado 320–360px (cero desbordes)** |

## 3. Supabase — SQL a correr y estado del equipo

- `supabase/realtime.sql` — **✅ CORRIDO** (sync en vivo ACTIVO). Habilita Realtime por tabla.
- `supabase/team.sql` — **✅ CORRIDO**. Equipo dado de alta: **Vicente Rojas** (vicente@grupotriada.cl) +
  **Ignacia Uribe** (ignacia@grupotriada.cl), ambos `consultor`/`comercial` por defecto.
- **Falta confirmar (acciones del usuario en el dashboard, no son SQL):**
  - **Auth → URL Configuration:** Site URL = `…/TRIADA-CRM/movil/` + Redirect URLs con `…/TRIADA-CRM/` y `…/TRIADA-CRM/movil/`.
  - **Auth → Users → Invite** a vicente@ e ignacia@ (el trigger `handle_new_user` les crea el perfil solo).
  - Que ambos abran el email → "Crea tu contraseña" → entran.

## 4. Lo que queda (opcional, no bloquea)

- **Notificaciones push reales** (que suene el teléfono con los recordatorios de `citas.recordatorios`).
- **Cotización PDF + Compartir — HECHOS (2026-06-25)** → `movil/js/cotizacion.js`: A4 con marca Tríada (reutiliza el scaffolding del Informe 360), datos de contacto del lead, ítems, IVA y **T&C del sitio** (abono 50% inicial + 50% restante + kickoff + renovación + enlace grupotriada.cl/terminos); emisor con el contacto oficial (config.php). **"Descargar PDF"** = `window.print()` (A4 vector). **"Compartir"** (en la propuesta y en el visor) genera el PDF como **archivo** (html2canvas + jsPDF) y lo pasa al **share nativo** del teléfono → WhatsApp/Correo con el PDF adjunto; fallback = descarga + wa.me/mailto al lead. Verificado (PDF A4 1 pág fiel + fallback). *(Único opcional que queda del módulo propuesta: nada — completo.)*
- **SMTP propio** en Supabase para que las invitaciones no caigan en spam.
- **Overview / "Mapa de pantallas"** sigue siendo un stub (baja prioridad).

## 5. Cómo verificar (Preview MCP)

1. Servidor `triada-crm` (`.claude/launch.json` de PROYECTO CONSULTORIA) sirve la raíz del repo en **:5174**.
2. Abrir **`/movil/preview.html`** (mocks, sin auth real). NO `/movil/` (esa es la app real con Supabase real).
3. El harness **recarga y descarta el query string** en cada screenshot → forzar pantalla/tema con **localStorage**
   (solo en preview.html): `__movil_dev_screen` (hoy/leads/captura/ficha/pipeline/agenda/cita/propuesta/diagnostico/perfil),
   `__movil_dev_lead` (p4), `__movil_dev_theme` (dark/matrix) → `location.reload()` + screenshot. Limpiar con `removeItem`.
4. Realtime, SW-update e install **no corren** en preview (no-op en mock / gated a prod) — se prueban con la app real.

## 6. Gotchas (todos ya resueltos en el código)

- **Costura de imports:** desde `movil/js/*` → `../../js/`; las screens NO importan el CRM directo, pasan por `core.js`.
- **Barra final:** `serve`/hosts sin trailing-slash hacen que `./js/app.js` resuelva mal → `index.html` redirige `/…/movil`→`/…/movil/`. GH Pages ya la agrega.
- **Reload del preview pierde el `?query`** y `serve` quita `.html` → usar localStorage (§5).
- **Service worker:** solo se registra en prod (https, no localhost). v2 ESPERA (sin skipWaiting) para el banner de update.
- **Realtime:** inerte sin `supabase/realtime.sql`. RLS sigue mandando (cada quien recibe solo lo suyo).
- **Mock supabase** del CRM no tiene `updateUser`/`resetPasswordForEmail`/`channel` → se llaman defensivamente (preview no rompe).
- **Forms:** `_form` se carga 1 vez por navegación (`_formKey`) + `syncInputs()` antes de cada re-render → no se pierde lo escrito.
- **PDF headless:** el visor tiene `animation:fadeIn` → en print estático headless deja páginas en blanco. Fix del harness de verificación: `@media print{*{animation:none!important;transition:none!important}}` + `--virtual-time-budget` + `--user-data-dir` (instancia nueva). La app real NO sufre esto (al `print()` la animación ya terminó). Harness en `Desktop/files/_movil_pdf/`.
- **Screenshots del Preview MCP** se pusieron intermitentes en sesiones largas (timeouts) → reiniciar el server; la verificación funcional vía `preview_eval` es más robusta.
- **`.action-bar` (footer de formularios) — RESUELTO globalmente (2026-06-25):** la clase usaba `position:absolute;bottom:0` anclada a `#screen` (scroll container) → `bottom:0` se resolvía contra la altura **visible**, no la del contenido, así que en cualquier form más alto que el viewport el botón flotaba a media lista y se iba al scrollear. **Fix:** `.action-bar{position:sticky}` + las 4 pantallas de formulario (diagnóstico/cita/captura/propuesta) con `.screen{display:flex;flex-direction:column}` y `.pad-form{flex:1}` → el botón queda SIEMPRE de footer abajo (pinned al viewport en todo scroll, sin tapar el último campo). Verificado en las 4. **Ojo de verificación:** la animación de entrada `.screen{animation:scrn}` hace un `translateY(8px)` y la pestaña del preview EN SEGUNDO PLANO la congela (gotcha de [[reference_preview_mcp_gotchas]]) → al medir la barra sale 8px corrida; forzar `animation:none` antes de medir (en el dispositivo real la animación termina y queda exacta).
- **`.fab--create` (botón "+"):** el ícono usa `currentColor`; la clase no fijaba `color`, así que el "+" salía **negro** sobre el botón navy (muddy). Fix: `color:#fff` → "+" blanco nítido (como el logo claro del FAB de trIA sobre teal).
- **Compartir PDFs (cotización + informe) — helpers en `js/pdfshare.js`:** `wa.me`/`mailto` NO adjuntan archivos → el único camino web para "enviar el PDF" es `navigator.share({files})` (share nativo del teléfono). El PDF-archivo se genera con **html2canvas + jsPDF** (CDN, `import()` dinámico — no hay CSP en el móvil). **Dos estrategias según el documento:** (a) **cotización** = una hoja A4 **auto-contenida** (tokens `--rep-*` inline + ancho 794px, SIN la clase `.report-page`) → la media query responsive de informe.css no la afecta; paginación con clamp (si `imgH ≤ 297mm+2` va a 1 hoja, evita 2ª página vacía por redondeo). (b) **informe** = SÍ usa toda `informe.css` (no se puede auto-contener) → se captura cada `.report-page` con **`html2canvas({windowWidth:1120})`**, que simula ventana de escritorio y **derrota el breakpoint <880px** (sin esto, una hoja A4 ~794px se reflowea a móvil). `pdfshare.nodeToA4Pdf(node, {perPage, windowWidth})` cubre ambos. El "Descargar PDF" (window.print → @media print) es vector y separado del share. El informe (8 hojas) tarda ~13s+ → estado de carga en el botón.
