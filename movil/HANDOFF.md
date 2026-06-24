# HANDOFF — Tríada CRM Móvil (PWA de terreno)

> Documento vivo · fuente de verdad del proyecto.
> Última actualización: **2026-06-24** · Estado: **✅ COMPLETO y DESPLEGADO**

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
| **Pantallas** | Hoy · Leads · Captura (RUT mód-11) · Ficha (tabs) · Pipeline · Agenda (Lista/Día) · Nueva cita (date/time nativos, editar) · Propuesta (ítems + Subtotal→IVA 19%→Total) · Perfil (tema swatch, equipo, cambiar contraseña, cerrar sesión) |
| **⭐ Diagnóstico 360** | EXACTO al de PC: 27 preguntas/sub-dimensiones, toggle No/Parcial/Sí, progreso X/27 + puntaje por área en vivo, guarda en `diagnosticos` (scoresTec/Ventas/Finanzas 0/0.5/1). Usa `DIAG_PREGUNTAS`/`scorePct` del CRM |
| **⭐ Informe PDF** | `js/informe.js` reutiliza el motor del CRM → 8 págs A4 idénticas; "Descargar PDF" = `window.print()` (en móvil = Guardar/Compartir como PDF). Verificado con PDF A4 real (Chrome headless) |
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
- **Cotización de la propuesta en PDF** (hoy los botones "Cotización PDF"/"Compartir" son stubs; armar como el informe 360).
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
