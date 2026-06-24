# HANDOFF — Tríada CRM Móvil (PWA de terreno)

> Documento vivo. Estado de la construcción de la app móvil.
> Última actualización: **2026-06-24**

---

## 0. Qué es

PWA **mobile-first instalable** = compañero de terreno del CRM de Diagnóstico 360.
Vive en **`movil/` DENTRO del repo `TRIADA-CRM`** y reutiliza *literalmente* la capa de
datos del escritorio (mismo Supabase `pqrjndirqtucoumijben`) + el cuestionario 360 y
(pronto) el motor del informe PDF. Decisión del usuario: subcarpeta, no repo aparte →
el 360 y el PDF quedan **idénticos por construcción** (mismos archivos, cero duplicación).

- **Diseño fuente:** Claude Design `Tríada CRM Móvil.dc.html` (copia local en
  `Desktop/files/PROYECTO CONSULTORIA/CRM-MOVIL-CLAUDE-DESIGN/Triada-CRM-Movil.dc.html`).
- **Despliegue ✅ EN VIVO:** https://martinjacques225.github.io/TRIADA-CRM/movil/ (GitHub Pages, push a `main`, commit `38d095a`). Verificado: index 200 + app.js/manifest/icons 200 + los archivos reutilizados del CRM (js/, modules/informe-ejecutivo/) 200. Arranca a login con Supabase real.
- **Red de seguridad de la barra final:** `index.html` redirige `/…/movil` → `/…/movil/` (si no, `serve`/hosts sin trailing-slash rompen los imports relativos `./js/app.js`).

## 1. Arquitectura

```
movil/
  index.html         · app real (importa ../js + ../modules del CRM)
  preview.html       · = app, pero con import-map → mocks del CRM (verificación sin auth real)
  manifest.json · sw.js · icon.svg
  css/tokens.css     · tokens EXACTOS del diseño (claro/oscuro/matrix) + reset + keyframes
  css/app.css        · sistema de componentes (shell, nav, FABs, sheets, cards, chips, inputs…)
  js/core.js         · ⭐ costura ÚNICA con ../../js/ (db, supabase, utils 360). El import-map lo remapea.
  js/ui.js           · logo, íconos de línea, openSheet, toast, openWhatsApp/openTel, haptic
  js/app.js          · controlador: boot, auth, router, chrome (nav+fabs), sheets (crear/más/trIA)
  js/screens/auth.js · splash animado · login · crea contraseña (Supabase Auth real)
  js/screens/hoy.js  · Hoy
  js/screens/leads.js· Leads
```

**Costura de datos:** todo cruce a `../../js/` y `../../modules/` pasa SOLO por `js/core.js`.
`preview.html` trae un `<script type="importmap">` que remapea `/js/supabase.js`→`/_preview/mock-supabase.js`
y `/js/db.js`→`/_preview/mock-db.js` (los mismos mocks del `preview.html` del escritorio).

## 2. Estado

| Fase | Qué | Estado |
|---|---|---|
| 1 | Cimientos: PWA shell, tokens (claro/oscuro/matrix), capa de datos, splash/login/crear-contraseña, bottom nav + FABs + sheets | ✅ verificado en Preview |
| 2 | Hoy · Leads | ✅ verificado |
| 2 | Captura · Ficha · Pipeline | ✅ verificado (incl. guardar lead E2E + cambiar etapa + tab Diagnóstico con scorePct) |
| 3 | Agenda · Nueva cita | ⬜ |
| 4 | Propuesta (ítems + IVA + cotización) | ⬜ |
| 5 | **⭐ Diagnóstico 360 EXACTO** (27 preguntas, sub-dimensiones, No/Parcial/Sí, guarda en `diagnosticos`) | ✅ verificado E2E (live scoring 100/0/17 = scorePct; guarda scoresTec/Ventas/Finanzas 0/0.5/1/null) |
| 6 | **⭐ Informe en PDF** (`movil/js/informe.js` reutiliza computeInforme+buildReportDoc+informe.css del CRM) | ✅ verificado: visor 8 págs en navegador + **PDF A4 real** renderizado con Chrome headless (idéntico al de PC) |
| 3 | **Agenda** (Lista/Día + filtro por tipo) · **Nueva cita** (form completo, date/time nativos, editar) | ✅ verificado |
| 4 | **Propuesta** (ítems + qty/precio + Subtotal→IVA 19%→Total en vivo) | ✅ verificado (math E2E) |
| 7 | **Perfil** (identidad sync, tema claro/oscuro/matrix con swatch, equipo, cambiar contraseña, cerrar sesión) | ✅ verificado |
| 7 | trIA real · panel de campana | ⬜ (stubs informativos) |
| 8 | PWA íconos PNG (512/192/180 full-bleed) · **deploy** | ✅ EN VIVO https://martinjacques225.github.io/TRIADA-CRM/movil/ |
| 9a | **Sync EN VIVO (Supabase Realtime)** móvil↔PC — `js/realtime.js` compartido | ✅ DESPLEGADO (commit `ffe54f1`); **inerte hasta correr `supabase/realtime.sql`** |
| 9b | **Aviso de "nueva versión"** (SW espera + banner) · **pull-to-refresh** en listas | ✅ verificado en Preview |
| 9c | **trIA real** (`movil/js/tria.js`, reglas sobre datos reales: reunión de hoy / pasos del pipeline / resumen / redactar+enviar WhatsApp) · **botón "Instalar app"** (prompt nativo Android + instrucciones iOS, en menú Más) | ✅ verificado |
| 9d | Alta multiusuario verificada (cuentas reales) · campana de recordatorios | ⬜ |

**Responsividad verificada (Preview MCP):** barrido de overflow horizontal en **320px y 360px** sobre las
13 pantallas → **cero desbordes** (ningún elemento fuera del viewport salvo los chip-rows con scroll propio,
que es intencional). Consola limpia. Capturas OK de todas. Patrón clave de los forms: `_form` se carga una
vez por navegación (`_formKey`) y los inputs se vuelcan a `_form` (`syncInputs`) antes de cada re-pintado →
re-render no pierde lo escrito ni las selecciones.

## 3. Cómo verificar (Preview MCP)

1. Servidor `triada-crm` (`.claude/launch.json` de PROYECTO CONSULTORIA) sirve la raíz del repo en **:5174**.
2. Abrir **`/movil/preview.html`** (NO `/movil/` — esa es la app real con Supabase real).
3. El harness **recarga la página y descarta el query string** en cada screenshot → para
   forzar pantalla/tema usar **localStorage** (sobrevive al reload), solo en `preview.html`:
   - `localStorage.setItem('__movil_dev_screen','leads')` · valores: hoy/leads/captura/ficha/pipeline/agenda/cita/propuesta/diagnostico/perfil
   - `localStorage.setItem('__movil_dev_lead','p4')` (para Ficha)
   - `localStorage.setItem('__movil_dev_theme','dark')` · dark/matrix
   - luego `location.reload()` + screenshot. Limpiar con `removeItem` al terminar.

## 4. Gotchas

- **Rutas de import:** desde `movil/js/*` el CRM está en `../../js/`; desde `movil/js/screens/*`
  NO se importa el CRM directo → todo pasa por `../core.js`. Una sola ruta cruzada que mantener.
- **`serve` usa clean-URLs** (quita `.html`) y el reload del preview pierde el `?query` → usar localStorage (arriba).
- **Service worker:** solo se registra en prod (https, no localhost) para no ensuciar la verificación.
- **Mock supabase** del escritorio no tiene `updateUser`/`resetPasswordForEmail` → `app.js` los llama defensivamente (no rompe el preview).
- Inputs a `font-size:16px` para evitar el zoom de iOS al enfocar.

## 5. Próximo paso

**Listo: shell + auth + Hoy · Leads · Captura · Ficha · Pipeline + ⭐360 + ⭐Informe PDF.**
El 360 y el PDF reutilizan los MISMOS archivos del escritorio (`js/utils.js` y
`modules/informe-ejecutivo/`) → idénticos por construcción.

Falta (no prioritario): **Agenda + Nueva cita**, **Propuesta** (ítems + IVA + cotización),
**trIA** real, **Perfil** real (temas/sync), panel de campana, íconos PNG del manifest, y **deploy**
(GitHub Pages `…/TRIADA-CRM/movil/`). Stubs actuales: agenda, cita, propuesta, perfil, overview, trIA.

### Verificar el PDF fielmente (Chrome headless, método del informe)
`computeInforme`+`buildReportDoc` son puros → corren en Node. Harness de muestra en
`Desktop/files/_movil_pdf/` (`render-informe.mjs` → HTML → `chrome --headless=new --print-to-pdf`).
**Gotcha nuevo:** el visor tiene `animation:fadeIn` (opacity 0→1); en impresión estática headless NO
completa → páginas en blanco. Fix del harness: `@media print{*{animation:none!important;transition:none!important}}`
+ `--virtual-time-budget`. (La app real NO sufre esto: al hacer `window.print()` la animación ya terminó.)

## 6. "App en todo el sentido" — sync móvil↔PC · usuarios · actualizaciones

Lo pidió el usuario explícitamente. La arquitectura YA lo entrega en su base (por eso la Opción A):

- **Sincronización:** móvil y PC comparten el **mismo proyecto Supabase** → la MISMA base de datos.
  Un lead/cita/propuesta/360 capturado en el celular YA está en el CRM de PC y viceversa (misma tabla,
  sin export/import). HOY se refleja **al refrescar/navegar** (caché de lectura 15s en `js/db.js`, que se
  invalida en cada escritura). Para que sea **instantáneo/en vivo**: agregar **Supabase Realtime**
  (suscripción a cambios) en el móvil **y en el escritorio** + habilitar Realtime por tabla en Supabase.
- **Usuarios:** mismo **Supabase Auth** + mismas **RLS/roles/multitenancy** que el CRM de PC (ya auditados,
  ver [[project_auditoria_seguridad_enterprise]]). Cada socio entra con su cuenta; `responsable` se asigna
  solo (`db.setCurrentUser`). Falta: que el usuario termine el alta del equipo en Supabase (invitaciones +
  SQL de rol), igual que para el escritorio.
- **Actualizaciones:** PWA + service worker **network-first** → al volver a abrir, trae la versión nueva.
  Falta: **aviso explícito** "hay versión nueva, recargar" (escuchar `updatefound`/`controllerchange`).

**Backlog para que sea 100% 'app de verdad':** (1) ✅ **Realtime en móvil+PC DESPLEGADO** (`js/realtime.js`
compartido; móvil refresca listas conservando scroll, PC refresca salvo modal abierto; `db.clearReadCache`).
**Solo falta correr `supabase/realtime.sql`** (idempotente) en el SQL Editor de Supabase para activarlo —
hasta entonces es inerte. RLS sigue mandando. (2) ✅ **aviso de actualización** (sw.js v2 espera sin skipWaiting + `_showUpdate` banner → SKIP_WAITING + reload),
(3) ✅ **pull-to-refresh** en listas (`_initPull`, touch desde arriba → clearReadCache + re-render),
(4) verificar alta multiusuario end-to-end con cuentas reales, (5) trIA real, (6) campana.
