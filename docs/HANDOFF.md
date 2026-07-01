# HANDOFF — TRIADA CRM
> **Documento vivo. Fuente de verdad del estado del proyecto.**
> Última actualización: **2026-06-30**

---

## 📖 Cómo usar este documento (protocolo para Claude)

1. **Al INICIO de cada sesión:** lee **`AGENTS.md`** y **`SECURITY.md`** en la raíz, luego este archivo completo *antes* de actuar. Es tu contexto base.
2. **Antes de afirmar que algo "funciona":** verifícalo. Este handoff ya tuvo 3 ✅ falsos
   (ver §6). No confíes en un ✅ viejo sin contrastar código ↔ esquema real.
3. **Al FINAL de cada sesión:** actualiza §1 (estado), §4 (próximos pasos) y agrega una
   entrada en §7 (bitácora). Mantén el doc honesto: si algo está roto, ponlo en 🔴.
4. **Convención de estado:** ✅ verificado funcionando · 🟡 hecho, sin verificar a fondo ·
   🔴 roto / bloqueado · ⬜ pendiente.

---

## 0. Orientación rápida

| | |
|---|---|
| **Producto** | CRM de Diagnóstico 360 para consultoría (pipeline → diagnóstico → propuesta → cliente → factura) |
| **Repo** | https://github.com/martinjacques225/TRIADA-CRM (rama `main`) |
| **Deploy** | https://martinjacques225.github.io/TRIADA-CRM/ (GitHub Pages desde `main`, auto-deploy al push; ~1 min + hard-refresh Ctrl+Shift+R por caché de `.js`) |
| **Backend** | Supabase proyecto `pqrjndirqtucoumijben` (región São Paulo) |
| **Stack** | Vanilla JS (ES Modules, sin build/bundler), Supabase JS por CDN, GitHub Pages |
| **Modo de trabajo** | El usuario decide/diseña; Claude ejecuta con autonomía y **push directo**. Solo se pide permiso para *decisiones* (modelo de datos, taxonomías, etc.) |

> ⚠️ **GOTCHA crítico — hay 2 carpetas TRIADA-CRM:**
> - ✅ **Canónica (esta):** `C:\Users\velve\Documents\GitHub\TRIADA-CRM` — el CRM de Diagnóstico, lo que se trabaja.
> - ❌ `C:\Users\velve\Desktop\files\PROYECTO CONSULTORIA\TRIADA-CRM` — CRM comercial viejo, **NO** es el target.

---

## 1. Estado actual (al 2026-06-30)

### 🆕 Módulo Financiero trIA (M2 "Lector IA" del Plan Maestro) — análisis financiero SIN API (2026-06-30 cont.)
> **Flagship de la Ola 1.** Mismo enfoque "dirigir en vez de llamar" de la Mesa de Orquesta, especializado en finanzas. **Construido y verificado en preview (E2E por DOM); falta la mirada logueada del usuario + un F29 real.**
> - **🆕 Modo AUTOMÁTICO (el "botón mágico") — 2026-06-30 cont.:** el usuario pidió saltarse el copy-paste. Ahora el botón principal es **"Generar informe"**: el CRM llama a **Gemini** vía la Edge Function `analizar-financiero` (llave server-side, `verify_jwt`), parsea el JSON y abre el informe A4 **solo, sin copiar ni pegar**. El copy-paste queda como **respaldo** ("o hacerlo manual") y como **fallback automático** si la IA no está configurada (503 `no_key`) o falla. Costo Gemini Flash ≈ centavos/informe (tier gratis probable). Decisión del usuario: **abrir Gemini API** (revierte el "sin API" **solo para este módulo**, que el Plan Maestro §7-D1 ya contemplaba). ⬜ **Falta que el usuario ponga `GEMINI_API_KEY` en los secrets de la Edge Function** (guía entregada). Verificado: EF desplegada (401 sin auth) + flujo automático E2E en preview con EF mockeada (botón → informe directo, el copy-paste nunca aparece) + `node --check` + 77/77 tests.
> - **🆕 Informe unificado con la piel del Informe 360 — 2026-06-30 cont.:** el usuario pidió que el informe se vea como **cualquier otro informe Tríada**. El visor ahora **reusa la piel del Informe Ejecutivo 360**: `informe-fin.view.js` emite `.informe-viewer` + `.report-page`/`.cover-page`/`.rh-title`/`.hallazgo-card`/`.oport-card` + tokens `--rep-*` de `informe.css` + **`ringGauge` del 360** (importado de `informe-ejecutivo/informe.charts.js`). `financiero.css` bajó a solo las tarjetas de indicadores (`.fin-kpi`, scope `.informe-viewer`); se borró el visor `.finr-*` propio. Usa `has-report-open` → **hereda el `@media print` del 360** (se fue el conflicto que antes se esquivaba con `has-fin-report`). Verificado en preview: `viewerClass=informe-viewer`, portada petróleo, gauge circular, `--rep-teal=#1C7A82` heredado; 77/77 tests (+4 aserciones de piel).
> - **🆕 Paridad móvil — 2026-06-30 cont.:** `movil/js/screens/financiero.js` (default `{render,mount}`, patrón `biblioteca.js`): lista + flujo (tipo/período/modo · adjuntar-con-cámara o cifras) + **botón "Generar informe"** (Gemini) con fallback manual + `openFinReport`. Reusa `db.analisisFinancieros` + dominio + `openFinReport` **vía `movil/js/core.js`** (costura única). Registrada en `movil/js/app.js` (SCREENS + "Más → Análisis Financiero", ícono `trending`) + `financiero.css` en `movil/index.html` y `movil/preview.html`. Verificado `node --check` + import+render en preview móvil; falta prueba logueada en teléfono. Simplificación: sin selector de cliente en móvil (queda "interno"; editable en PC).
> - **✅ AUTOMÁTICO EN VIVO — 2026-06-30 cont.:** el usuario puso la `GEMINI_API_KEY` en los secrets de la EF y **generó un informe real logueado** ("está perfecto"). Modelo: **`gemini-2.5-flash` con thinking DESACTIVADO** (`thinkingConfig.thinkingBudget:0`) + fallback a `gemini-2.0-flash`/`-lite`, `maxOutputTokens:8192` (EF v4). **Gotchas resueltos:** (1) `gemini-2.0-flash` y `-lite` dan **429 (sin cuota)** en el proyecto free tier del usuario → por eso 2.5-flash va **primero**; (2) 2.5-flash **con** thinking se comía los tokens pensando (24s → JSON vacío → "no se encontró JSON") → apagarlo lo dejó en ~13s con JSON completo. La EF loguea `modelo/finish/len` (sin datos del usuario). El pendiente "falta la mirada logueada" del automático queda **CERRADO**.
> - **Qué hace:** subes/tipeas tus datos financieros → el CRM genera un **prompt-director** a medida → lo llevas a tu IA (Gemini/Claude, que ya pagas) con tus documentos → pegas el JSON → el CRM lo renderiza como **Informe Financiero A4 con la marca Tríada** (imprimible a PDF). **Cero API, cero costo** — el CRM dirige, no llama.
> - **3 tipos de análisis** (decisión del usuario: los 3 desde el inicio): **Cierre de mes**, **IVA / F29** y **Remuneraciones**, cada uno con documentos sugeridos + formulario de cifras (contexto chileno: F29, PPM, Previred, IVA 19%, gratificación legal). **2 modos de entrada** (decisión: ambos): adjuntar documentos (a la bóveda) o tipear cifras.
> - **Backend** (migración `modulo_financiero` aplicada por MCP; espejo `supabase/financiero.sql`): tabla `analisis_financieros` (org_id auto-estampado, correlativo `FIN-`, enums `fin_tipo`/`fin_estado`/`fin_modo`, RLS multitenant `auth_org_id()`, borrar = admin **o** el creador) + bucket **PRIVADO** `financiero` con RLS por `{org_id}/`. Verificado en vivo: 18 columnas, 4+4 policies, `next_correlativo` es SECURITY DEFINER (el `FIN-` funciona bajo la RLS de `correlativos`), advisors **sin hueco nuevo** (`analisis_financieros` no aparece en `rls_enabled_no_policy`).
> - **Arquitectura** (capas, patrón `ai-commander`): `modules/financiero/domain/analisis.js` (**PURO**: `FIN_TIPOS` + `buildFinancePrompt` + `parseFinanceReport`) · `presentation/financiero.view.js` (flujo 3 fases, delegación, sin onclick inline) · `presentation/informe-fin.view.js` (visor A4, `buildFinReportDoc` puro) · `financiero.js` (root: lista + KPIs). Capa de datos: `js/db.js` repo `analisisFinancieros` (getAll cacheado, add/update/remove, `uploadDoc`/`signedUrl`/`removeDoc` al bucket) + mapper `finFromSupa`/`finToSupa` (`js/mappers.js`, con guards de enum). Nav: sección **Análisis → Análisis Financiero**.
> - **El contrato de salida:** el prompt pide a la IA un JSON con estructura fija (resumen, salud {nivel,puntaje,titular}, indicadores, hallazgos, riesgos, recomendaciones, proyección). `parseFinanceReport` es **tolerante**: extrae de ` ```json `, del `{…}` suelto, comas colgantes y comillas tipográficas; si viene inválido, no pierde el texto crudo (fallback con toast).
> - **Verificado:** ✅ `node --check` (7 archivos) · ✅ **77/77 tests** (22 nuevos: prompt, parser, armado del informe, mappers) · ✅ **flujo E2E en preview** (elegir tipo → modo cifras → prompt de 2617 chars con contrato → pegar JSON en ` ```json ` → informe A4 de 4 págs [portada+salud, 4 KPIs, hallazgos, recomendaciones, proyección] → guardar → aparece en la lista con botón "Informe"). 🟡 falta la mirada del usuario logueado + probar con un F29/liquidación real.
> - **Gotcha del harness resuelto (de paso):** `_preview/mock-db.js` **no exportaba `documentos`** (quedó sin actualizar desde la Biblioteca) → `app.js` no booteaba en el preview (nada de esto afecta producción, que usa el `db.js` real). Se agregó `documentos` + `analisisFinancieros` al mock (gitignored) y los 2 `<link>` CSS que faltaban en `preview.html`.
> - **Seguridad:** datos financieros = sensibles → bucket privado + RLS por org (patrón Biblioteca). La UI deja **explícito** que el usuario lleva SUS datos a SU chat (no el CRM por detrás). Coherente con "sin API" y con `SECURITY.md §7`.

### 🆕 Director de Orquesta — Mesa de Orquesta (orquestación multi-IA SIN API) (2026-06-30 cont.)
> El usuario **no quiere pagar API** (gasto grande). Solución construida: el Director **dirige** en vez de llamar. Motor M5 del Plan Maestro. Commit `c696518`, **EN VIVO**.
> - **Hallazgo:** la DB del módulo (`ai_commander.sql`) **ya estaba aplicada** y verificada (4 tablas + 5 enums + RLS `*_org` + `aic_audit_row`). La memoria decía "falta correr" — era falso; NO había SQL pendiente.
> - **Mesa de Orquesta** (pestaña estrella + por defecto del Director de Orquesta): flujo **copy-paste en 3 fases** — (1) describes objetivo + tipo (7: landing/app/crm/informe/marca/contenido/genérico) → genera **1 prompt a medida por IA** (ChatGPT=creativo, Claude=arquitecto/director, Gemini=investigador) con método Tríada horneado + copiar/abrir chat; (2) pegas las 3 respuestas; (3) **meta-prompt de síntesis** para pegar en Claude. Usa los chats que ya se pagan → **cero costo de API**.
> - **Arquitectura (Clean, reusada):** `domain/orchestration.js` (puro) + `presentation/orquesta.view.js` (autocableada) + wiring en `ai-commander.js` (tab first + default `orquesta`) + `ui.js` (ícono) + `ai-commander.css`.
> - **Verificado:** ✅ `node --check` (5) · ✅ **50/50 tests** (6 nuevos de orquestación) · 🟡 falta la mirada visual del usuario en la app.
> - **Descartado por presupuesto:** Edge Function `ai-complete`/API keys. `AI_CONFIG.edgeFunctionUrl=null` sigue a propósito (el Prompt Builder viejo queda en `no_conectado`).
> - **✅ Incrementos hechos (commit `dbb2aca`):** (1) **Guardar sesión** → persiste prompts+respuestas+síntesis+plan final al proyecto (auto-crea proyecto desde el objetivo), visible en Historial IA (`AIService.saveManualResponse`, sin API); (2) **Descargar carpeta (.zip)** por proyecto (botón en Proyectos y en la Mesa) → `README.md` + `tareas.md` + `orquesta/*.md`, JSZip por CDN (`presentation/project-export.js`). +5 tests (55/55).

### 🆕 Biblioteca de documentos (Ola 0 del Plan Maestro) (2026-06-30 cont.)
> Repositorio documental compartido de la organización — **primer uso de Supabase Storage**.
> Parte del **Plan Maestro** (`PLAN-MAESTRO-TRIADA.md` en la raíz de PROYECTO CONSULTORIA): motor **M4 "Bóveda"**.
> - **Backend** (migración `biblioteca_documentos` aplicada por MCP; espejo en `supabase/biblioteca.sql`):
>   tabla `public.documentos` (org_id auto-estampado con `set_org_id`, RLS multitenant `auth_org_id()` +
>   subselect) + bucket **PRIVADO** `biblioteca` con RLS por `{org_id}/…`. Leer + subir = cualquier
>   miembro de la org; **borrar = solo admin** (`is_admin()`). Descarga por **URL firmada** temporal.
> - **PC:** módulo `modules/biblioteca/` (nueva sección **Recursos** en el nav) — KPIs, buscador, filtros
>   por categoría, **subida multi-archivo con arrastrar-soltar**, descargar/editar/borrar.
> - **Móvil:** pantalla `movil/js/screens/biblioteca.js` (**Más → Biblioteca**), paridad total; reutiliza
>   el mismo `db.documentos`.
> - **Capa de datos:** `js/db.js` repo `documentos` (getAll cacheado, add con rollback del archivo si
>   falla la fila, update, remove, signedUrl) + `_getOrgId()` + mapper `docFromSupa` (`js/mappers.js`).
> - **Verificado:** ✅ `node --check` (6 archivos) · ✅ 44/44 tests · ✅ advisors de seguridad sin hueco
>   nuevo (`documentos` con políticas; no aparece en `rls_enabled_no_policy`).
> - ✅ **19 documentos cargados** (2026-06-30) por Claude vía Edge Function temporal `biblioteca-seed`
>   (service_role del lado servidor; **ya neutralizada** a stub 410 — se puede borrar del panel): 9 Contratos,
>   5 Comercial, 3 Propuestas, 1 Precios, 1 Marca. Todos org Tríada, autor Martín. Verificado: **19 fichas =
>   19 objetos en Storage**. (Fuentes: `05-VENTAS` + `06-MARCA`.)
> - 🟡 **Falta solo la comprobación visual del usuario:** abrir Biblioteca en la app y descargar uno (la
>   descarga usa URL firmada; la RLS de Storage se validó contra las políticas reales, pero no se pudo
>   hacer clic logueado desde acá).
> - **Siguiente de la Ola 0:** activar **Director de Orquesta** (correr `supabase/ai_commander.sql` + seam IA).

### 🆕 Equipo (cargo+áreas+editor) + Notificaciones de reunión (in-app + Web Push) (2026-06-30 cont.)
> Tres cambios pedidos por el usuario, **todos EN VIVO** (commits `b2d2295`, `3609f12`, `1c43d31`):
> - **Cargo por persona + áreas.** Nueva columna `profiles.cargo` (puesto visible: CEO/CTO/Gerenta
>   de Finanzas/Diseñadora) **separada de `role`** (permisos admin/consultor). Nueva área **Diseño**
>   (`area_t += 'diseno'`). Equipo fijado: Martín CEO/Desarrollo (admin), Vicente CTO/Comercial,
>   Ignacia Gerenta de Finanzas/Finanzas, Jeinny Diseñadora/Diseño. El cargo+área se ven en la
>   agenda (creador y participantes) y en la app móvil (perfil). `js/utils.js` `AREA_LABELS`/
>   `areaLabel`/`TEAM_AREAS` (etiquetas compartidas).
> - **Editor de Equipo** en CRM → Configuración → **Equipo** (solo admin): edita nombre/cargo/área/
>   activo sin SQL. `js/db.js` `profiles.listAll`/`profiles.update`; RLS `profiles_self_update`
>   (admin edita a todos) + trigger guard ya protegían del lado servidor.
> - **Notificación al sumarte a una reunión** (móvil): (1) **burbuja in-app** vía Realtime cuando
>   la app está abierta ("Se ha generado una reunión con tu participación"); (2) **push del sistema
>   con la app cerrada** (Web Push real): tablas `push_subscriptions`+`app_config`, llaves VAPID en
>   BD (privada solo service_role), **Edge Function `notify-meeting`** (la dispara `citas.add`),
>   `movil/sw.js` con handlers push/notificationclick, botón "Activar" en Mi perfil.
> - **Migración + Edge Function aplicadas por MCP de Supabase** (no SQL manual). Verificado: cripto
>   de `web-push` corre en Deno (generateRequestDetails produce request cifrado+firmado), función
>   autentica (401 sin sesión), editor guarda, cargos se muestran (PC+móvil) — todo por DOM/MCP.
> - ⬜ **Lo único pendiente = test del usuario en el teléfono:** instalar/actualizar la PWA, Mi
>   perfil → **Activar notificaciones** (dar permiso; en iOS requiere la app instalada), y crear una
>   cita con un participante para ver llegar el push. Cada miembro del equipo debe activar 1 vez.
> - Backlog futuro opcional: replicar la **burbuja in-app en PC** (hoy solo móvil; el push igual les
>   llega al celular); push también para otros eventos (lead asignado, etc.).

### 🆕 Atribución de citas en la Agenda compartida — "¿de quién es esta cita?" (2026-06-30)
> Pedido del usuario: en la agenda (compartida por todo el equipo), cuando se crea una cita debe
> verse **quién la creó**, y si hay **2 citas a la misma hora** debe distinguirse de quién es cada una.
> - **Hallazgo:** los datos YA estaban. `citas.responsable` se guarda solo al crear (`js/db.js`
>   `citas.add` → `responsable = usuario actual`; `setCurrentUser` se llama al login en PC `app.js:184`
>   y móvil `movil/js/app.js:216`), viaja de vuelta en `citaFromSupa` (`js/mappers.js`) y se preserva
>   al editar. La agenda **ya era compartida** (`citas.getAll()` sin filtro por usuario). Faltaba solo
>   **mostrarlo**. **Sin migración de BD** (la columna `responsable` ya existe; calendar.sql ya corrido).
> - **Trabajo (solo presentación), `modules/agenda/agenda.js` + `agenda.css`:**
>   - Avatar del **creador** (color estable por miembro + iniciales + tooltip "Creada por X") en cada
>     evento de **Mes** y **Semana**, en el popover **"+N más"** del día, y línea "· Creada por X" en **Lista**.
>   - **Detalle** de la reunión: línea destacada "Creada por [avatar] Nombre · Rol".
>   - **Modal crear/editar:** banner "Organiza esta reunión / Creada por …" + chip **"Agenda compartida
>     del equipo"** (deja explícito que todos la ven).
>   - **Vista Semana — reparto de solapes:** dos citas a la misma hora ya **no se tapaban** entre sí;
>     ahora se reparten **lado a lado** (nueva fn pura `packOverlaps` en `js/utils.js`, con tests).
> - **Verificado** (preview con mocks, 2026-06-30): Mes (avatares por evento + colisión 09:00 apilada),
>   Semana (colisiones 09:00 y 15:00 lado a lado, c/u con su creador), Detalle ("Creada por Martín
>   Jacques · Consultor"), modal crear ("Organiza… · tú" + "Agenda compartida del equipo"), Lista
>   ("Empresa · Creada por X"). Tests **44/44** (7 nuevos de `packOverlaps`), `node --check` OK.
>   *(El screenshot del preview se cuelga con modal/timers abiertos — gotcha headless conocido; el
>   contenido se verificó por extracción de DOM.)*
> - ✅ **PUSHEADO Y EN VIVO** (commit `224d453`, 2026-06-30) en PC **y app móvil** (paridad incluida en
>   el mismo commit: `movil/js/screens/agenda.js` muestra el creador en cada tarjeta de Lista/Día;
>   `movil/js/screens/cita.js` el banner de organizador + chip "Compartida").
> - ⬜ Único pendiente menor: citas viejas sin `responsable` no muestran avatar (degradación esperada).

### 🆕 Rediseño completo del Diagnóstico 360 → 8 pilares + escala de madurez 1-5 (2026-06-26)
> El cuestionario pasó de **3 áreas (Tec/Ventas/Finanzas) en No/Parcial/Sí** a **8 pilares
> estratégicos** calificados con una **escala de madurez 1-5** (1 Muy deficiente … 5 Excelente).
> Pilares: **Dirección Estratégica · Operación y Procesos · Tecnología y Automatización ·
> Ventas y Desarrollo Comercial · Marketing y Posicionamiento · Finanzas · Seguridad Digital ·
> Oportunidades Perdidas** (45 preguntas, redactadas como afirmaciones conversacionales que
> revelan dolores, estilo consultora ejecutiva). El motor del Informe (8 pilares, semáforo,
> radar octagonal, **nueva página "Recomendaciones Tríada"** que mapea cada pilar débil a
> servicios — CRM/ERP/Landing/SEO/IA/etc., prioridad Alta/Media/Baja) es **compartido por PC y
> móvil** → ambos quedan idénticos. **Sin migración de BD**: `scores` es jsonb flexible; las
> respuestas se guardan como fracción 0..1 → **100% retrocompatible** (diagnósticos viejos de 3
> áreas siguen renderizando, solo muestran sus áreas evaluadas). Archivos: `js/utils.js`
> (8 pilares + `MADUREZ`/`ratingToFrac`), `informe.engine.js`/`.view.js`/`.charts.js`/`.benchmarks.js`,
> `modules/diagnosticos/*`, `movil/js/screens/diagnostico.js`, `js/mappers.js` (+alias legacy),
> consumidores de tarjetas (modals/ficha/app/informes). Verificado: 37/37 tests, render E2E en
> node + preview con mocks (PC modal 225 botones, móvil 8 pilares, informe 9 págs). Detalle en §7.

### 🆕 Fix del PDF del Informe 360 — ya no se desordena al imprimir (2026-06-23)
> El visor se veía bien pero el **PDF se desordenaba por completo** (8 págs → 16, con contenido
> recortado y piezas flotando en hojas casi en blanco). Causa: el breakpoint móvil
> `@media (max-width:880px)` del visor se activaba **al imprimir** (una hoja A4 mide ~794px < 880px)
> → colapsaba todas las grillas a 1 columna. Fix en `modules/informe-ejecutivo/informe.css`:
> `@media screen and (...)` (nunca aplica en impresión) + `.report-page` sin alto fijo
> (`min-height` + `break-inside:avoid`, fluye en vez de recortar) + `box-sizing:border-box`
> explícito (210×297mm exactos). Commit `642faee`, en vivo. **Verificado** renderizando el motor
> real por Chrome headless en modo impresión. **Trade-off aceptado por el usuario ("dejar fluir"):**
> diagnósticos densos pasan a 9-10 págs sin recortar nada. Detalle en §7. Cierra el "prueba del PDF
> real" que quedaba pendiente de B5.

### 🆕 Diagnóstico 360 ampliado + Informe Ejecutivo con identidad del sitio (2026-06-23)
> El usuario pidió ampliar el **contenido** del Diagnóstico 360 (tenía pocas preguntas) y darle al
> **informe final la identidad del sitio web** (`grupotriada.cl`). Pusheado (`e54be3e`).
> - **Cuestionario 15 → 27 preguntas** (9 por área, 3 sub-dimensiones c/u). Decisión del usuario:
>   **profundizar las 3 áreas** (Tec·Ventas·Finanzas, la regla de 3 de la marca), NO agregar áreas.
>   Temas nuevos: respaldos, ciberseguridad/Ley 21.719, presencia digital, postventa, CAC/LTV,
>   separación finanzas personales, SII, presupuesto, financiamiento. En `js/utils.js`
>   (`DIAG_PREGUNTAS` + `DIAG_GRUPOS`).
> - **Motor del informe (`informe.engine.js`)**: catálogos paralelos fortaleza/hallazgo/oportunidad
>   expandidos a 9×3, **alineados 1:1 por índice** con las preguntas (si tocas una pregunta, toca su
>   catálogo). Puntaje **dinámico** vía `scorePct(arr)` (largo real) en `utils.js`; reemplazó el `/5`
>   hardcodeado en app.js, modals.js, informes.js, diagnosticos.js. **Diagnósticos viejos de 5
>   respuestas NO rompen** (puntaje ok); solo las etiquetas del informe pueden correrse → rehacerlos
>   si fueran reales (eran de prueba).
> - **Modal (`diagnosticos.js` + `.css`)**: preguntas agrupadas por sub-dimensión, tarjetas de
>   resumen por área y **barra de progreso global**. Sigue en la piel del CRM (themea claro/oscuro/Matrix).
> - **Informe Ejecutivo re-skineado a la marca del sitio** (`informe.css` reescrito + `view.js` +
>   `charts.js`): crema + petróleo, **Spectral / Libre Franklin**, color por área
>   `#3D6E92/#2F8C93/#5E9E7E`, niveles de madurez alineados, portada petróleo con aura, cifras en
>   Spectral, íconos de área como puntos de color (sin emoji). **Tokens scope-eados a
>   `.informe-viewer`** → NO afecta al resto del CRM. Fuentes vía Google Fonts (patrón ya usado).
> - **Formulario público** (`diagnostico-publico.html`) **sin cambios** (queda en 15; decisión del
>   usuario: máxima conversión). Su scoring también tolera 5 o 9 respuestas (`scorePct`).
> - **Verificado:** 35/35 tests, `node --check` OK (8 archivos), render de las 8 páginas del informe
>   y del modal en el preview (claro/oscuro, layout A4 de 2 columnas), 0 errores de consola.

### 🔎 Nuevo: Auditoría 360 (2026-06-17) — informe + plan-checklist vivo
> Revisión profunda multi-disciplina (seguridad/OWASP · arquitectura · backend · DB · escalabilidad ·
> calidad · UX/UI/accesibilidad · costos). Informe completo en **`docs/AUDITORIA_360_2026-06-17.md`**;
> **plan accionable con checkboxes en §4.0** (tachar al completar, para retomar entre sesiones).
> Veredicto: seguridad **~7/10** (buen diseño, falta *verificar con login* + hardening de superficie
> pública/cabeceras), ingeniería **~6/10** (deuda raíz = god-object `window._app` + `onclick` inline
> que bloquea la CSP). 1 crítico-de-verificación (CR-1/A1), 4 ALTOS, varios MEDIO/BAJO. Nada nuevo
> roto: es deuda, no regresión.


### 🟡 Nuevo: Alta de socios por INVITACIÓN (2026-06-14 cont. 5) — código pusheado, faltan pasos del usuario en Supabase
> El usuario quiere sumar a sus 3 socios sin pedirles correo/contraseña: invitarlos por email,
> que se registren solos y luego cambien sus propios datos. Implementado con **invitaciones de
> Supabase Auth** (funcionan aunque el signup público esté OFF — las invita el admin, no el público).
> - **`index.html`** — script en `<head>` captura `window.__authFlow` del hash (`type=invite|recovery|...`)
>   ANTES de que el cliente Supabase consuma el token.
> - **`js/auth.js`** — `requireAuth()` detecta el flujo de invitación/recuperación y muestra
>   `_showSetPasswordScreen()` (crear/restablecer contraseña con `supabase.auth.updateUser`). Login
>   ahora tiene **"¿Olvidaste tu contraseña?"** (`resetPasswordForEmail` con `redirectTo` a la app).
>   Logo factorizado a `_logoSvg()`. El login normal queda **idéntico** (el branch nuevo solo corre con token).
> - **`modules/configuracion/configuracion.js`** — tarjeta **"Mi cuenta"**: cambiar correo
>   (`updateUser({email})`) y contraseña (`updateUser({password})`) del usuario logueado.
> - Verificado por `node --check` (auth.js, configuracion.js OK). **No verificable en preview** (los
>   tokens de invite/recovery y `updateUser` requieren sesión Supabase real; el harness usa mocks).
> - ⬜ **PENDIENTE DEL USUARIO en Supabase** (ver §4): (1) Authentication → URL Configuration →
>   Site URL + Redirect URLs = `https://martinjacques225.github.io/TRIADA-CRM/`; (2) Authentication →
>   Users → invitar los 3 emails (dejar "Allow new users to sign up" en OFF); (3) SQL Editor:
>   `update profiles set role='admin', nombre='...' where email='...';` ×3 (decisión del usuario: los 3 = **admin**).

### 🔴 Nuevo: Auditoría Profunda (2026-06-14 cont. 4) — 3 CRÍTICOS NUEVOS, 2 fixes de código aplicados
> Auditoría enterprise de segunda generación (arquitectura, seguridad, DB, escalabilidad, perf,
> calidad). Confirma que los cimientos son sólidos (RLS multitenant, audit, escaping con disciplina,
> AI-Commander en Clean Architecture) pero encuentra **3 huecos que invalidan parte de esa fortaleza**:
> - **C-1 🔴 Signup público = bypass total del acceso** — el modelo es *single-org real* (todos caen en
>   la org por defecto vía `handle_new_user`), así que el ÚNICO límite de acceso es quién puede
>   autenticarse. El `anon key` es público. **Si Supabase tiene "Enable signups" activo (default),
>   cualquiera hace `supabase.auth.signUp()` y entra a leer/escribir TODO el CRM.** ⬜ **SOLO EL USUARIO
>   puede cerrarlo:** Supabase → Authentication → "Allow new users to sign up" = OFF. Es la
>   "verificación auth pendiente" que arrastra el handoff. **Lo más urgente de todo.**
> - **C-2 🔴 Tabla `correlativos` sin RLS** — escribible/legible por anónimos vía PostgREST; sobrescribir
>   `ultimo` fuerza colisión de `codigo` único → se rompen TODAS las altas (DoS). ✅ **Fix entregado:**
>   `supabase/correlativos_rls.sql` (RLS deny-all + `next_correlativo` SECURITY DEFINER). ⬜ Correr.
> - **C-3 🟠 XSS almacenado por comilla simple** — `escHtml()` no escapaba `'`; en `modals.js:155` el
>   campo `empresa` (controlable desde el insert anónimo del landing) caía en un string JS dentro de un
>   `onclick` → XSS al pulsar "Compartir 360" en sesión autenticada. ✅ **Aplicado en código:**
>   `escHtml()` ahora escapa `'`→`&#39;` (`js/utils.js`) + el dato sale del onclick a un `data-share`
>   (`modules/modals/modals.js`). `node --check` OK.
> - **Backlog priorizado del informe:** P1 (CSP meta, SRI/pin de Supabase, CAPTCHA en form público,
>   audit de `profiles.role`), P2 (paginación/columnas selectivas, KPIs server-side, Realtime vs
>   polling, FK on delete cascade, retención de PII en audit), P3 (tests+CI, event delegation,
>   coherencia arquitectónica, correlativos por-org para multi-tenant real).
> - Scores: Arq 6.5 · **Seg 5.0** (→~7 al cerrar C-1/C-2/C-3) · Escala 4.5 · Perf 6.0 · Mant 6.0 · UX 7.5.

### 🧹 Nuevo: Limpieza P0/P1 (2026-06-14 cont. 3) — código muerto/duplicado/innecesario
> Alcance "Solo lo seguro": **−979 líneas, 0 cambio de comportamiento.** Eliminada carpeta `tools/`
> (dead weight), `formatCLP` duplicada en `format.js`, `formatPercent`/`avatarHtml`/`initials`/
> `clearReadCache` muertas, campo muerto `historial`, y 10 imports sin usar en 7 módulos. Verificado
> por `node --check` + resolución de imports cross-module. Informe: **`docs/LIMPIEZA_P0_P1.md`** (incluye
> el P0/P1 excluido por chocar con "mismo comportamiento": paginación, bundling, correlativos, RPC,
> rate-limit, observabilidad). ⬜ Sin commitear — pendiente decidir el push.

### 🛡️ Nuevo: Auditoría de Ingeniería Empresarial (2026-06-14) — informe + fixes críticos
> Auditoría integral de 12 fases (ver **`docs/AUDITORIA_EMPRESARIAL.md`**). Veredicto:
> MVP competente pero **NO vendible como SaaS multi-empresa tal cual** — es single-tenant
> con DB global compartida. 5 bloqueadores CRÍTICOS, mayormente capa Supabase.
> - **C-4 XSS** ✅ **aplicado en código** — `escHtml()` en `home.js` (líneas 69, 86-87) e
>   `informes.js:217` (facturas vencidas) + helper `html\`\`` auto-escape en `js/utils.js`
>   (`node --check` OK en los 3). Cerraba robo de sesión vía lead con `<img onerror>`.
> - **C-1 multitenancy + C-2 anti-privesc + C-3 RBAC + C-5 audit inmutable** ✅ **corrido**
>   (`supabase/multitenancy.sql`, idempotente/no-destructivo) + **hardening del trigger anónimo
>   re-aplicado**. **Verificado en vivo (REST anon):** tabla `orgs` existe; `org_id` en las 8
>   tablas (200 [] = columna OK + RLS); anon NO lee `leads`; anon NO escribe en leads(manual)/
>   facturas/clientes/profiles (401/42501). 🟡 **Falta verificar CON sesión auth:** que el
>   privesc falle para un consultor, que `actividad` registre y sea inmutable, y que el backfill
>   dejara `org_id` no-null en filas viejas. El deployment actual (1 equipo) sigue funcionando.
> - Notas/scores y backlog CRÍTICO/ALTO/MEDIO/BAJO en el informe. Próximo de seguridad:
>   índices core + paginación + rate-limit en insert anónimo + capa API (Edge Functions).

### Nuevo: Rectificaciones del usuario — Batches 1-3 (2026-06-12) 🟡 verificado en preview, falta en prod
> Tanda de 8 rectificaciones pedidas por el usuario. **Los 3 batches hechos y
> pusheados.** Único pendiente operativo: correr `supabase/presupuestos.sql`.
>
> **Batch 2 (Análisis + Configuración):** Informes reescritos (flujo de leads
> 24h/7d/30d, actividad, y cobranza: pagadas / por cobrar en plazo / vencidas +
> días de mora con tabla); Configuración con tamaño de fuente (zoom raíz, 4
> niveles), 3 temas (Claro/Oscuro/**Matrix** verde franquicia), **mascota** gato
> (sigue cursor, parpadea, duerme, reacciona al clic — opt-in), y export Agenda/
> Cartera (CSV) + Informe (PDF) en vez del export JSON. Mascota en
> `modules/mascota/mascota.js`; tema Matrix en `styles.css`.
>
> **Batch 3 (Propuesta/Presupuesto):** Propuesta = solo programa neto **sin IVA**
> + botón Cotización PDF. Módulo **Presupuesto** real (programa + mano de obra +
> IVA + plan de servicio) sobre tabla nueva `presupuestos` (capa en `db.js`,
> fail-soft con `isMissingTable`). Helper compartido `js/pdf.js`
> (`openCorporateDoc`) para ambos PDF corporativos. ✅ **`supabase/presupuestos.sql`
> ejecutado y verificado en vivo (2026-06-12)**: probe REST con key publishable →
> `presupuestos` devuelve `200 []` para las 16 columnas (tabla + columnas OK, sin
> 42703) y RLS activa. El módulo ya está operativo en prod.
>
> **Batch 4 (Mascota avanzada):** motor de comportamiento del gato (sit/walk/chase/
> hang/sleep): pasea por el CRM, persigue y juega con el cursor (pounce), se cuelga
> del borde superior de tarjetas, parpadea, duerme y reacciona al clic. rAF +
> steering, pointer-events:none, cleanup completo, prefers-reduced-motion. Verificado
> avanzando frames a mano (el preview headless pausa rAF). Pendiente futuro: fondos
> de pantalla interactivos.
- **NAV reorganizado** ✅ (preview) — `app.js`: estructura `NAV_SECTIONS` (reemplaza el
  slice de `NAV_ITEMS`). Orden de presentación: **Principal** (Inicio·Leads·Pipeline·Agenda)
  · **Gestión** (Prospectos·Diagnóstico·Propuesta·Presupuesto·Clientes·Facturación)
  · **Desarrollo** (Director de Orquesta) · **Análisis** (Informes). Configuración sale del
  nav (sigue accesible por el footer/engranaje).
- **AI Commander → "Director de Orquesta"** ✅ — renombrado en nav, título del módulo
  (`ai-commander.js`) y aviso de setup (`presentation/ui.js`). IDs internos (`ai-commander`,
  `window._aic`) sin cambios.
- **Marca + dedup** ✅ — quitado el botón "Nuevo prospecto" duplicado bajo el logo. Marca
  con más personalidad (badge con gradiente, animación sutil de la flecha superior con
  `prefers-reduced-motion`, wordmark "Tríada· / Consultoría 360") en `styles.css`.
- **Módulo Clientes** ✅ (preview) `modules/clientes/clientes.js` — cartera (KPIs + tabla con
  resumen de facturación por cliente) + **"Añadir cliente"** tomando CUALQUIER prospecto
  (cualquier etapa, incl. Descartado) o ficha manual. **Resuelve "Factura no detecta cliente"**:
  ahora hay forma de crear la ficha desde aquí. Modal en `modals.js`
  (`openAddClienteModal`/`deleteCliente`/`openFacturaModalForCliente`). Verificado E2E en
  preview: alta desde prospecto Descartado crea fila; valida RUT módulo-11 (consistente con
  el modal de prospecto, por eso un RUT inválido aborta el alta).
- **Módulo Leads (bandeja)** ✅ (preview) `modules/leads/leads.js` — inbox con KPIs (por
  contactar / contactados / últimas 24 h / 7 días), filtros, búsqueda, **contacto rápido
  WhatsApp/Zoom/Llamar** por tarjeta, y **carga masiva** (pegar `Nombre; Empresa; Email;
  Teléfono; Rubro` por línea → `prospectos.add`).
- **Módulo Prospectos (gestión)** ✅ (preview) `modules/prospectos/prospectos.js` — tabla
  completa de todos los estados con búsqueda, filtro por etapa, stat-chips y contacto.
- **Botones de contacto en Inicio** ✅ — `home.js` recientes con WhatsApp/Zoom/Llamar
  (`event.stopPropagation` para no abrir la ficha).
- **Handlers** `contactWhatsApp` (arma `wa.me/56…` con saludo) y `contactZoom`
  (`zoom.us/start/videomeeting`) en `window._app`.
- **Presupuesto** 🟡 vista de transición (`modules/presupuestos/presupuestos.js`) que explica
  el rol Propuesta vs Presupuesto. **Módulo real + `supabase/presupuestos.sql` + Propuesta→PDF
  pendientes (Batch 3).**
- Verificado: `node --check` (10 archivos), boot del harness con mocks, recorrido de las 4
  vistas nuevas con **0 errores de consola**, alta de cliente E2E, link WhatsApp correcto.
  `_preview/mock-db.js` actualizado (gitignored) con shape real de clientes/facturas para
  que el preview sea representativo. **No verificado contra Supabase real (requiere login).**

### Nuevo: Calendario de reuniones (2026-06-12) — handoff Claude Design implementado
- **Agenda → calendario completo** 🟡 — `modules/agenda/agenda.js` reescrito: vistas **Mes / Semana / Lista** (conmutador persiste en localStorage), navegación mes/semana + botón Hoy, leyenda-filtro por tipo (clic oculta/muestra), clic en día/celda crea reunión, clic en evento abre detalle. Verificado en preview (3 vistas, claro/oscuro, 0 errores de consola); **falta verificar en producción con datos reales**.
- **Modelo de reunión** 🟡 — 7 tipos slug en `citas.tipo` (`emergencia/rutina/negocio/diagnostico/seguimiento/propuesta/interna`, constantes en `utils.js` con mapeo de labels legacy), participantes (UUIDs de `profiles`), recordatorios (minutos), recurrencia (daily/weekly/monthly expandida client-side), duración, vínculo a prospecto, estado (se mantiene Pendiente/Confirmada/Realizada/Cancelada; Cancelada no se pinta).
- **Recordatorios + alertas** 🟡 — `modules/agenda/reminders.js`: dock flotante en todos los módulos (avisos activos + próximas con cuenta regresiva), campana del topbar con badge de no-leídos (inyectada en `#topbarActions`), notificaciones push in-app que se disparan solas (timers re-programados cada 60 s). Leídos persisten en localStorage.
- ✅ **`supabase/calendar.sql` ejecutado y verificado (2026-06-12)**: probe en vivo confirma que `citas` ya tiene `duracion_min, participantes, recordatorios, recurrencia` (las 4 devuelven `200 []` en vez de `42703`). Persistencia completa del calendario habilitada. El fallback 42703 de `db.js` queda como red de seguridad pero ya no se dispara.
- **Modal de cita viejo eliminado** — `openCitaModal/openCitaModalForProspecto` (modals.js) redirigen al modal de reunión nuevo. El filtro "Mis citas" de la agenda vieja fue reemplazado por el modelo de participantes.
- **Equipo** — se lee de `profiles` (`profiles.getAll()` en db.js, sólo `activo`); colores estables por índice. Con 1 solo usuario el picker muestra 1 persona (ver P1: crear consultores).

### Funcionando
- **Auth / login** ✅ — `js/auth.js` bloquea el CRM hasta autenticar (Supabase Auth). Usuario admin creado y login en producción funcionando.
- **Pipeline de prospectos** ✅ — kanban + lista, filtros, drag & drop entre etapas. Crear/editar prospecto **arreglado hoy** (ver §6/§7).
- **Diagnósticos** ✅ — CRUD conectado; columnas (`lead_id, scores, hallazgos, oportunidades, estado`) coinciden con el esquema real. **Cuestionario ampliado a 27 preguntas (9 por área, sub-dimensiones) + escala graduada No/Parcial/Sí — 2026-06-23.** `scores` es jsonb (guarda 0/0.5/1; tolera el Sí/No viejo) → ampliar no migró la base.
- **Agenda / citas** 🟡 — CRUD conectado; **reescrita como calendario el 2026-06-12** (ver arriba).
- **Propuestas con ítems + IVA** 🟡 — tabla dinámica de servicios {descripcion, cantidad, precioUnit}; subtotal + IVA 19% + total; guarda en `servicios` (jsonb) y `valor`. Retrocompatible con formato viejo (string[]).
- **Correlativos en UI** ✅ — `LEAD-/DIA-/PROP-/FAC-000001` ahora se leen de la columna real `codigo` (arreglado hoy; antes leía `row.correlativo` inexistente → nunca aparecían).
- **Informe Ejecutivo 360 (PDF)** ✅ — motor de reporte (8 páginas A4 + gráficos SVG). **Re-skineado a la identidad del sitio web (crema+petróleo, Spectral) — 2026-06-23**, verificado en el preview. La piel vive en `modules/informe-ejecutivo/informe.css` (tokens scope-eados a `.informe-viewer`). **+ v2 análisis profundo (2026-06-23 cont.):** escala graduada, sub-dimensiones, benchmarks por rubro/tamaño, cuantificación del valor en juego ($), narrativa con insight cruzado y radar comparativo (ver §7).
- **Landing/Web → Supabase** 🔴→✅ (corregido 2026-06-23 vía el sitio `grupotriada.cl`) — **HALLAZGO:** el insert anónimo `origen='landing'` **NUNCA funcionó** (el 1er lead real de la tabla fue `LEAD-000001`, de una prueba de hoy). La policy `leads_public_ins` **faltaba en la base** pese a estar en `schema.sql` (drift esquema↔base); se creó (`supabase/leads_public_ins.sql`) pero **`anon` SIGUE sin poder insertar** aunque `pg_policies` la muestra correcta (INSERT/{anon}/`origen='landing'`) y no hay policies restrictivas. `set role anon; insert…landing` **también falla** (42501) en el SQL Editor; `set role service_role` **SÍ** inserta → el problema es **la RLS de `anon`, no triggers/constraints** (misterio sin resolver). **SOLUCIÓN en producción:** el sitio web (`triada-home`/`grupotriada.cl`) inserta vía **llave secreta `service_role` server-side** (no anon), tras su escudo anti-abuso → además **más seguro** (solo el backend con escudo crea leads). El form en vivo ya crea leads, verificado E2E. **Pendientes CRM:** (1) decidir si vale resolver el misterio de la RLS anon o quedarse con service_role; (2) borrar leads de prueba `LEAD-000001`/`LEAD-000002`. *(El viejo `diagnostico-publico.html` usa la tabla `autodiagnosticos`, cuyo insert anónimo SÍ funciona — policy distinta.)*
- **Facturación** 🟡 — **arreglado hoy** (decisión del usuario: facturas → `cliente_id`). Módulo reescrito a cliente-céntrico: `facturaToSupa/FromSupa` mapean columnas reales (`cliente_id, monto, pagado, estado, emision, vencimiento`); estados al enum real (`pendiente/parcial/pagado/vencido`, antes mandaba `Pendiente/Enviada` → 22P02); `toFactEstado()` blinda el valor; modal/tabla seleccionan y muestran **cliente**; guardado en try/catch. **Depende de que existan clientes** (ver 🔴 abajo) para ser usable.

### ✅ Resueltos en la sesión de auditoría (2026-06-11 tarde) — TODOS los 🔴 de la auditoría
- **Propuestas** ✅ — `PROP_ESTADOS` (slug enum + label) en `utils.js`; modal guarda slug; `vigencia || null`; try/catch; filtros/colores alineados en `propuestas.js`, `home.js`, `informes.js`, `modals.js` (botón "Crear factura" con `'aceptada'`).
- **Citas** ✅ — `fecha/hora || null` + fecha obligatoria + try/catch en `agenda.js`.
- **Clientes-write** ✅ — `clienteToSupa` escribe `razon_social ← empresa||nombre, rut, giro, direccion, lead_id` + responsable auto; `convertirACliente` corregido con try/catch. **Facturación queda usable end-to-end.**
- **deleteProspecto / limpiarDatos** ✅ — borrado en orden FK-seguro (facturas→propuestas→diagnosticos→citas→clientes→autodiags→lead) + try/catch; export incluye clientes y facturas.
- **Área activa** ✅ — mapa `AREA_TO_DB/FROM_DB` (label UI ↔ slug enum `area_t`) en `app.js`; persiste y se restaura al recargar.
- **Notas del diagnóstico** ✅ — campo eliminado del modal y del engine del informe (decisión del usuario: sin función real aún).
- **Formulario público 360** ✅ (rediseñado por decisión del usuario) — el formulario que llena el cliente es **autoevaluación de referencia**, NO el diagnóstico oficial. Nueva tabla `autodiagnosticos` (lead_id, scores) con RLS anon-insert-only; `diagnostico-publico.html` inserta ahí; el CRM la muestra como chip "📋 Autodiag." en la tarjeta del pipeline y como panel de referencia en la ficha del prospecto. El Diagnóstico 360 del CRM sigue siendo el oficial (genera el Informe Ejecutivo). Lecturas fail-soft si la tabla no existe.

### ✅ Setup completo
- `supabase/autodiagnosticos.sql` ejecutado por el usuario (2026-06-11). Verificado contra la base: tabla existe, anon no lee (200 []), anon-insert pasa RLS y solo topa FK con lead inexistente (23503). **Formulario público 360 operativo end-to-end.**

---

## 2. Esquema real de Supabase (verificado en vivo 2026-06-11)

> `supabase/schema.sql` coincide con la base real. Las divergencias están **en el código** `js/db.js`, no en el esquema.

- **Enums:**
  - `lead_origen`: `manual, landing, meta_ads, google_ads, whatsapp, referido` — **solo estos 6**.
  - `lead_estado`: `Nuevo, Contactado, Diagnóstico Agendado, Diagnóstico Realizado, Propuesta Enviada, Negociando, Cliente, Descartado`.
  - `lead_score`: `caliente, tibio, frio` · `diag_estado`: `borrador, en_revision, aprobado, rechazado` · `prop_estado`: `borrador, enviada, negociando, aceptada, rechazada` · `fact_estado`: `pendiente, parcial, pagado, vencido` · `area_t`: `comercial, finanzas, desarrollo, rrhh, operaciones, tecnologia, ventas`.
- **`leads`:** id, **codigo**, nombre, empresa, rut, email, telefono, **giro** (=rubro en UI), tamano, region, facturacion_est, dolor_principal, origen, estado, scoring, responsable, notas, created_at, updated_at. *(No existe `historial`.)*
- **`clientes`:** id, **codigo**, lead_id, **razon_social**, rut, **giro**, **direccion**, responsable, created_at.
- **`facturas`:** id, **codigo**, **cliente_id**, monto, pagado, estado, **emision**, **vencimiento**, created_at.
- **`diagnosticos`:** id, codigo, lead_id, scores(jsonb), hallazgos(jsonb), oportunidades(jsonb), estado, responsable, created_at.
- **`propuestas`:** id, codigo, lead_id, cliente_id, servicios(jsonb), valor, estado, vigencia, notas, created_at.
- **`citas`:** id, lead_id, titulo, tipo, estado, fecha, hora, lugar, notas, responsable, created_at.
- **`profiles`:** id(=auth.users), nombre, email, role, area, activo, created_at. · **`servicios`**, **`correlativos`**, **`actividad`** también existen.
- **`documentos`** (Biblioteca): id, org_id, nombre, descripcion, categoria, storage_path, mime_type, size_bytes, subido_por, created_at, updated_at. Bucket privado `biblioteca`.
- **`analisis_financieros`** (Financiero trIA): id, org_id, **codigo** (`FIN-`), tipo(`fin_tipo`), periodo, titulo, cliente_id, modo_entrada(`fin_modo`), contexto, cifras(jsonb), documentos(jsonb), prompt, respuesta_raw, respuesta_json(jsonb), estado(`fin_estado`), created_by, created_at, updated_at. Bucket privado `financiero`. Enums: `fin_tipo`(cierre/iva/remuneraciones), `fin_estado`(borrador/generado/analizado), `fin_modo`(documentos/cifras).
- **Triggers:** `set_codigo('PREFIJO')` autollenan `codigo`; `set_updated_at`; `handle_new_user` crea `profiles` al registrar usuario.
- **RLS:** autenticados leen/escriben todo; **anon solo puede INSERT en `leads` con `origen='landing'`**. Por eso todo INSERT manual exige sesión autenticada.

---

## 3. Arquitectura

```
index.html
└── app.js (orquestador, expone window._app.*)
    ├── js/auth.js       → login gate (Supabase Auth)
    ├── js/supabase.js   → cliente Supabase (key publishable embebida, es pública)
    ├── js/db.js         → capa de datos: prospectos·diagnosticos·citas·propuestas·clientes·facturas
    │                       (mapea camelCase JS ↔ snake_case DB; clean() quita undefined)
    ├── js/state.js      → estado UI (S.*)
    ├── js/utils.js      → constantes (PIPELINE_STAGES, RUBROS, ORIGENES…) + helpers
    ├── js/format.js     → RUT/teléfono/email
    ├── js/pdf.js        → documento corporativo imprimible (cotización/presupuesto)
    └── modules/ home · leads · pipeline · agenda · prospectos · diagnosticos ·
                 propuestas · presupuestos · clientes · facturacion · informes ·
                 configuracion · mascota · modals · informe-ejecutivo · ai-commander
```
**NAV (2026-06-12):** Principal (Inicio, Leads, Pipeline, Agenda) · Gestión (Prospectos, Diagnóstico, Propuesta, Presupuesto, Clientes, Facturación) · Desarrollo (Director de Orquesta) · Análisis (Informes). Configuración accesible por el footer.

---

## 4. Próximos pasos (por prioridad)

### 4.1 · Módulo Financiero trIA (Ola 1) — pendientes
> El módulo está **EN VIVO en PC** (automático con Gemini + manual de respaldo; informe con la piel del Informe 360). Lo que falta:
- [x] ~~**Paridad móvil**~~ ✅ **(2026-06-30)** — `movil/js/screens/financiero.js` (lista + flujo automático/manual + informe), registrada en `movil/js/app.js` (import + SCREENS + row "Análisis Financiero" en "Más") + `financiero.css` en `movil/index.html` y `movil/preview.html`. Reusa `db.analisisFinancieros` + dominio + `openFinReport` vía `core.js`. Gancho móvil: adjuntar F29/foto con la cámara. Verificado: `node --check` + import+render de la screen en el preview móvil real. **⬜ Falta la prueba logueada en teléfono (protocolo móvil).**
- [ ] **Prueba con documento real** (F29 / liquidación) en modo *adjuntar documentos* — validar el multimodal de Gemini con un PDF real (hasta ahora probado con cifras tipeadas).
- [~] **Demos Ola 1 sobre M2** — ✅ **D13 Detección de Fugas** (genérica, `demos/fugas/index.html`, standalone sin backend; en la vitrina móvil "Más → Demos", primera). ⬜ Faltan **D12 Gemelo** (proyecciones "¿y si…?") y **D11 Auditor** de imagen corporativa.
- [ ] (Opcional) Para datos de **clientes**, pasar Google AI a **tier de pago** (no entrena con los datos); evaluar velocidad (~13 s hoy con 2.5-flash).

### 4.0 · PLAN DE AUDITORÍA 360 (2026-06-17) — checklist vivo entre sesiones

> **Fuente:** `docs/AUDITORIA_360_2026-06-17.md` (el *porqué* de cada ítem está ahí).
> **Cómo se usa:** cada vez que termines un ítem, **marca su checkbox `[x]` y tacha el texto con
> `~~...~~`**, agrega `✅ (fecha)` y, si lo verificaste en vivo, una línea de prueba. Así cualquier
> sesión futura retoma sin estar en este hilo. NO borres ítems hechos: tacharlos es la memoria.
> Orden recomendado: Bloque A (seguridad) → B (arquitectura/calidad) → C (UX) → D (escala/backlog).

#### Bloque A — Seguridad y verificación (máxima prioridad)
- [~] **A1 · CR-1 — Verificar la RLS multitenant CON login (no asumir).** EN CURSO (2026-06-17).
      ✅ Verificado por admin (SQL Editor): `actividad` solo SELECT (audit inmutable OK); tablas de
      negocio con su policy `*_org`; `facturas` partida (del solo admin).
      🔴 **2 HUECOS HALLADOS** (las policies viejas no se borraron en la migración) → ver A1.5.
      ✅ **`sin_org` = 0** en leads/clientes/diagnosticos/propuestas/citas/facturas (2026-06-17) → backfill
      `org_id` completo, sin huérfanos.
      ⬜ **Solo falta:** la prueba de privesc desde una sesión **consultor real**
      (`update profiles set role='admin' where id=auth.uid()` debe FALLAR). Hoy solo existe el usuario
      admin → crear un consultor de prueba (Auth → Add user) y probar desde la consola logueado como él.
- [x] ~~**A1.5 · FIX RLS — correr `supabase/fix_rls_autodiag_2026-06-17.sql`**~~ ✅ **(2026-06-17)**.
      H1 `autodiag_auth_all` ELIMINADA (fin fuga cross-tenant); H2 `diagnosticos_public_ins` ELIMINADA
      (anon ya no inserta diagnósticos oficiales). **Verificado en vivo:** `autodiagnosticos` queda con
      `autodiag_del_org`+`autodiag_public_ins`+`autodiagnosticos_read_org`; `diagnosticos` solo
      `diagnosticos_org` (ningún `{anon}`).
- [ ] **A2 · SEG-2 — Rate-limit + validación del formulario público** (`diagnostico-publico.html` →
      `autodiagnosticos`). Mínimo: validar que `lead_id` exista antes de aceptar; añadir throttle por
      IP (Edge Function o trigger `pg` con ventana) para frenar spam/DoS.
- [ ] **A3 · SEG-2/backlog — CAPTCHA** en el formulario público (hCaptcha/Turnstile) antes del POST.
- [ ] **A4 · SEG-3 — Endurecer password policy** en Supabase (Auth → Policies): longitud + chequeo de
      contraseñas filtradas (HaveIBeenPwned), si el plan lo permite.

#### Bloque B — Arquitectura y calidad (habilita el hardening)
- [ ] **B1 · AR-1 — Migrar de `onclick=` inline a event delegation** (`data-action`/`data-id` + un
      listener raíz). Es el prerrequisito que **desbloquea la CSP**. Hacer por módulo, incremental.
- [ ] **B2 · SEG-1 — Activar CSP + cabeceras** (`<meta http-equiv="Content-Security-Policy">`,
      `Referrer-Policy`, `X-Content-Type-Options`) **una vez hecho B1**. Probar que nada inline rompa.
- [x] ~~**B3 · CA-1 — Subir cobertura de tests.**~~ ✅ **(2026-06-17)**. Suite **35/35 verde** + syntax-check
      del CI OK. (1) `tests/utils.helpers.test.js` (formatCLP, formatDate, propEstadoLabel, toMeetingTipo,
      meetingType, memberColor, areaIcon). (2) **Extracción `js/mappers.js`**: las funciones puras
      (mapeadores + guards `toOrigenSlug`/`toFactEstado` + `clean`/`isMissingTable`/`isMissingCol`)
      salieron de `db.js` a un módulo sin dependencias de red; `db.js` las importa y **reexporta
      `isMissingTable`** (superficie pública intacta). (3) `tests/db.mappers.test.js` cubre los enums que
      causaban los `22P02`/`42703` históricos, el scores anidado de diagnósticos, el fallback base/extendido
      de citas y la cadena de razón social de clientes. Refactor mecánico, lógica sin cambios.
- [x] ~~**B4 · BK-1 — Eliminar `catch (_) {}` silenciosos.**~~ ✅ **(2026-06-17)**. Se hicieron visibles
      con log los que escondían fallas reales: carga de perfil (`app.js`), badge de leads, import del
      landing (`db.js`), email de cuenta (`configuracion`), equipo (`agenda`), auditoría semántica
      (`supabase.audit.js` — relevante de seguridad), autodiagnósticos opcionales (`modals`). Se dejaron
      a propósito los benignos con fallback real (clipboard+`window.open`, refresh opcional de
      recordatorios, `setSelectionRange`, `new Set()` de pipeline). Syntax-check OK, suite 35/35.
- [ ] **B5 · AR-2 — Partir `app.js`** (god-file 444 líneas): extraer `nav.js`, `share.js`,
      `data-export.js`; dejar `app.js` solo como orquestador.
- [ ] **B6 · CA-2 — Mover estilos inline de `renderNav` a clases en `styles.css`.**
- [ ] **B7 · BK-3 — Unificar el nombre de usuario** hacia `profiles.nombre` (quitar `config.userName`).

#### Bloque C — UX / UI / Accesibilidad
- [x] ~~**C1 · UX-1 — Focus-trap + cierre con `Esc` + retorno de foco en el modal global.**~~ ✅ **(2026-06-17)**.
      `js/modal-a11y.js` (`initModalA11y`, llamado en `app.js`): se engancha vía MutationObserver sobre la
      clase `open` del overlay → cubre TODOS los openers sin tocarlos. **Verificado en vivo** (preview.html
      con mocks): al abrir, el foco salta al 1er campo (`pNombre`); Tab/Shift+Tab quedan atrapados (14
      focusables, ciclan first↔last); `Esc` cierra y devuelve el foco al disparador; 0 errores de consola.
- [x] ~~**C2 · UX-3 — Escala de UI compatible con Firefox.**~~ ✅ **(2026-06-17)**. `_applyFontScale` en
      `app.js` ahora **detecta soporte de `zoom`** (`CSS.supports('zoom','1')`: Chrome/Edge/Safari y
      Firefox ≥126) y, si falta, cae a `transform: scale()` estándar con compensación de ancho/alto
      (`width: 100/s %`, origen top-left). **Verificado en vivo:** camino `zoom` aplica/limpia y persiste;
      el fallback produce `scale(1.25)` + ancho 80% y resetea limpio. 0 errores de consola.
- [x] ~~**C3 · UX-2 — Accesibilidad del formulario público.**~~ ✅ **(2026-06-17)**, `diagnostico-publico.html`.
      Cada sección es un `<fieldset>` con `<legend class="sr-only">` (área+subtítulo; `sec-head` queda
      `aria-hidden` para no duplicar). Cada toggle Sí/No es un `role="radiogroup"` con `aria-labelledby`
      a la pregunta y botones `role="radio"` + `aria-checked` (actualizado en `setA`) + `type="button"` +
      `:focus-visible`. **Verificado en vivo:** 3 fieldsets/legends, 15 radiogroups/30 radios, aria-checked
      alterna correcto, layout intacto, 0 errores de consola.
- [ ] **C4 · CA-4 — Nav: usar `<button>` en vez de `<a href="#" onclick>`** (se hace junto con B1).

#### Bloque D — Escalabilidad y observabilidad (backlog medido)
- [ ] **D1 · ES-1 — Paginación** (`repo.page(offset, limit)`) en las vistas con tablas grandes.
- [ ] **D2 · BK-2 — Observabilidad:** captura de errores en producción (Sentry u similar).
- [ ] **D3 · AR-3 — Evaluar bundler ligero** (esbuild/vite) para minificar y dejar de mantener los
      `<link>` CSS a mano en `index.html`.
- [ ] **D4 · DB-1 — Batch insert en `importLandingLeads`** (hoy N+1 secuencial).

---

### ✅ P0 SEGURIDAD — 3 críticos de la Auditoría Profunda CERRADOS (2026-06-14 cont. 4)
1. **C-1 ✅ Signup público CERRADO y VERIFICADO EN VIVO (2026-06-14)** — `POST /auth/v1/signup` con la key publishable → `HTTP 422 {"error_code":"signup_disabled","msg":"Signups not allowed for this instance"}`. Cómo se hizo: Supabase →
   Authentication → Sign In / Providers → Email → **"Allow new users to sign up" = OFF**.
   Mientras esté ON, cualquiera entra a la org compartida y lee TODO. Crear usuarios a mano
   (Auth → Add user) + `update profiles set role/area where id='UUID'`.
   **Prueba de cierre:** en consola, `await supabase.auth.signUp({email:'x@x.com',password:'12345678'})`
   debe devolver error. Hasta entonces, el CRM está abierto a internet.
2. **C-2 — Correr `supabase/correlativos_rls.sql`** (idempotente). Cierra la escritura anónima a
   `correlativos`. Incluye su propia verificación al pie (GET debe dar 401; alta landing debe seguir 201).
3. **C-3 — XSS** ✅ ya aplicado en código (`escHtml` escapa `'` + `modals.js` usa `data-share`). Pushear.

### ✅ P0 SEGURIDAD — `supabase/multitenancy.sql` CORRIDO y verificado en vivo (2026-06-14)
Cierra C-1 (fuga entre empresas), C-2 (privesc), C-3 (RBAC), C-5 (audit). Verificado por REST anon
(org_id en 8 tablas, anon sin lectura ni escritura). **Pendiente verificar con login admin:** privesc
falla para consultor, `actividad` registra+inmutable, backfill `org_id` no-null. Probe sugerido:
`select count(*) filter (where org_id is null) from leads;` → 0 (correr en SQL Editor, autenticado).
**Backlog ALTO:** índices core ✅ **`supabase/indices.sql` corrido por el usuario (2026-06-14)**
(no verificable por REST anon — pg_indexes no se expone; confirmar con `select indexname from
pg_indexes where schemaname='public'` logueado). Luego: paginación (`makeRepo.page`, toca el front),
rate-limit anónimo, capa API.

### 🟢 Rectificaciones del usuario — 8/8 hechas y pusheadas (2026-06-12)
Las 8 rectificaciones (batches 1-4) están implementadas, pusheadas y en vivo.
- ✅ **`supabase/presupuestos.sql` ejecutado y verificado en vivo** (probe REST: tabla + 16
  columnas OK, RLS activa). Módulo Presupuesto operativo en prod.
- ⬜ Repaso recomendado en producción **con login** (todo lo demás se verificó en preview/mocks):
  Clientes/Leads/Prospectos, contacto WhatsApp/Zoom, Informes, temas/fuente/mascota, export
  CSV/PDF, y un alta real de Presupuesto + su PDF.
- **Mascota:** base + avanzada hechas (pasea, se cuelga de cards, juega con el cursor, pounce,
  reacciona). Pendiente futuro opcional: **fondos de pantalla interactivos**.

### ✅ P0 — `supabase/calendar.sql` ejecutado (2026-06-12)
Columnas del calendario agregadas a `citas` y verificadas en vivo. Persistencia completa.

### ✅ P0 auditoría — todo resuelto 2026-06-11 (ver §1). `supabase/autodiagnosticos.sql` ya ejecutado.

### 🧹 P1.5 — gaps menores restantes
- Campos del esquema sin UI: `leads.region`, `leads.facturacion_est`, `leads.scoring` (decisión de producto si se capturan en el modal).
- Doble fuente del nombre: `config userName` (localStorage, lo edita Configuración) vs `profiles.nombre` (Supabase, lo usa el nav). Unificar hacia `profiles`.
- `renderNav` hace `prospectos.getAll()` en cada navegación solo para el badge → 2-3 getAll por vista (perf menor).
- ~~exportarDatos sin clientes/facturas~~ ✅ · ~~cita c.empresa~~ ✅ · ~~código muerto db.js~~ ✅ (eliminados byEstado×3 y byRubro) · ~~try/catch modales~~ ✅

### 🟠 P1
- Crear 2 usuarios consultores en Supabase (Auth → Add user ×2), copiar UUID y:
  ```sql
  update profiles set role='consultor', nombre='NOMBRE', area='ÁREA' where id='UUID';
  ```
  Áreas válidas (enum `area_t`): `comercial, finanzas, desarrollo, rrhh, operaciones, tecnologia, ventas`.

### 🟡 P2 — UX
- **P2a** Panel de herramientas por área activa en Home (`modules/home/home.js`).
- **P2b** Al cerrar diagnóstico, modal con botones "Enviar sección Tec/Ventas/Finanzas" (resumen para WhatsApp).
- **P2c** Badge "360 pendiente" en tarjeta kanban (ya parcialmente presente en `pipeline.js`; verificar lógica `_prosConDiag`).

### 🔵 P3 — backlog
- Módulo/tab Clientes (listar tabla `clientes`, ficha individual).
- URL routing (`?view=pipeline`). · Service worker PWA. · Módulo de proyectos post-venta (ver `modules/ai-commander`, ya iniciado).

---

## 5. Convenciones y aprendizajes (para no repetir errores)

- **Mapeo db.js ↔ esquema:** cada campo de un `*ToSupa()` debe existir como columna real. Enviar una columna inexistente rompe TODO el INSERT (42703) y, sin try/catch, falla en silencio. Verificar contra §2.
- **Origen de leads:** solo los 6 valores del enum `lead_origen`. `db.js` tiene `toOrigenSlug()` que mapea la etiqueta UI y cae a `'manual'` si no es válida (blindaje). El dropdown UI (`ORIGENES` en `utils.js`) está alineado: Manual, Landing Web, Meta Ads, Google Ads, WhatsApp, Referido.
- **Correlativos = columna `codigo`** (no `correlativo`). El trigger la autollena; el código JS la expone como `correlativo`.
- **Guardado defensivo:** los handlers de guardar deben ir en try/catch con toast de error (hecho en `modals.js` para prospecto; replicar en otros modales).
- **Probar el esquema real sin login:** `GET /rest/v1/<tabla>?select=<col>&limit=1` con la key publishable → si la columna no existe devuelve `42703` nombrándola. Útil para auditar drift código↔DB.
- **No existe columna `historial`** en `leads` (se removió del INSERT).
- **Estados de factura:** enum `fact_estado` = `pendiente/parcial/pagado/vencido` (minúscula). `toFactEstado()` en `db.js` blinda el valor; la UI guarda el slug y muestra la etiqueta capitalizada. Facturas cuelgan de `cliente_id` (decisión del usuario).
- **Continuidad entre sesiones:** un hook `SessionStart` en `…/PROYECTO CONSULTORIA/.claude/settings.local.json` inyecta este HANDOFF automáticamente al arrancar. Si mueves el doc o cambias la ruta, actualiza el hook (revisar/editar con `/hooks`). Solo dispara si la sesión arranca en esa carpeta.

---

## 6. Correcciones de esta sesión (2026-06-11) — los ✅ falsos del handoff viejo

1. **Prospecto no guardaba** 🔴→✅ — el `<select>` Origen ofrecía valores fuera del enum (`Contacto directo/Red social/Evento/Otro`) → INSERT 22P02 → fallo silencioso. Fix: `ORIGENES` alineado al enum + `toOrigenSlug()` + try/catch en `modals.js`.
2. **Correlativos "visibles"** (era falso) 🔴→✅ — `leadFromSupa/diagFromSupa/propFromSupa/facturaFromSupa` leían `row.correlativo` (no existe); corregido a `row.codigo`.
3. **Columna fantasma `historial`** — removida de `leadToSupa` (rompía el import del landing).
4. **`byRubro`** — ya no mapea el rubro por el diccionario de orígenes.
5. **Facturación** 🔴→🟡 — reescrita a cliente-céntrico (decisión del usuario: `cliente_id`); estados al enum real (`toFactEstado`); `clienteFromSupa` (lectura) corregido; verificado contra la base (42501 = columnas/enum OK).
6. **Pendiente diferido por el usuario:** `clientes-write` (crear cliente) sigue 🔴 (ver §4 P0).

---

## 7. Bitácora de sesiones (más reciente arriba)

### 2026-07-01 — Paridad móvil del Financiero + 1ª demo Ola 1 (D13 Detección de Fugas)
- **Paridad móvil** (commit `fc2fc1f`): `movil/js/screens/financiero.js` (lista + flujo automático/manual + informe), reusa el motor vía `movil/js/core.js`, registrada en "Más → Análisis Financiero". Gancho: adjuntar el F29 con la cámara. Verificado `node --check` + import/render en el harness móvil.
- **Demo D13 "Detección de Fugas"** (commit `dc1985a`), cosecha del Motor 2, **genérica** (decisión del usuario): `demos/fugas/index.html` standalone (HTML+CSS+JS inline, marca Tríada, sin backend/auth). Flujo: empresa de ejemplo → "Detectar fugas con trIA" → animación → informe con total anual **$31.560.000** (6 fugas: sobrecostos/mermas/horas/precios/postventa/gastos hormiga, con monto·severidad·"qué hacer") + barras por impacto + CTA a grupotriada.cl. Registrada en `movil/js/screens/demos.js` (array `DEMOS`, primera) + `demos/README.md`. Verificado en preview: carga + `reveal()` (total, 6 fugas, 6 barras, CTA); animación por timers no corre en el preview headless (gotcha conocido) pero sí en navegador real. **Refinada (2026-07-01, commit `<push>`):** los 4 montos (ventas/compras/gastos/remuneraciones) son **inputs editables** con formato de miles, y las fugas se **recalculan** como % de cada base (compras/ventas/gastos/remun) al pulsar Detectar; **fix del bug de barras invisibles** (`.bfill`/`.btrack` eran `span` inline → `display:block`) + relleno animado por reflow (no setTimeout); **nombres completos** en las barras (antes se cortaban a 2 palabras). ⬜ Faltan D12/D11.

### 2026-06-30 (cont. 4) — Automático EN VIVO + unificación del informe con la piel del 360
- **Unificación del informe:** el usuario pidió que el informe se vea como cualquier otro informe Tríada. `informe-fin.view.js` reescrito para reusar la piel del Informe 360 (`.informe-viewer`/`.report-page`/`.cover-page` + tokens `--rep-*` + `ringGauge`); `financiero.css` bajó a solo `.fin-kpi`. Verificado en preview (viewerClass=informe-viewer, portada petróleo, gauge, `--rep-teal` heredado). Commit `8aeaf56`.
- **Puesta en marcha del automático (Gemini real):** el usuario configuró `GEMINI_API_KEY` y probó. Iteración de 3 fixes guiada por los logs de la EF (MCP `get_logs`):
  1. **429** en `gemini-2.0-flash` → añadido **fallback de modelos** + logging del detalle (EF v2/v3).
  2. Cayó en `gemini-2.5-flash` que respondió en **24s con JSON vacío** ("no se encontró JSON") → causa: el **thinking** de 2.5 se comía los `maxOutputTokens`.
  3. **Fix (EF v4):** `gemini-2.5-flash` **primero** (es el que tiene cuota) con **`thinkingBudget:0`** + `maxOutputTokens:8192`. Resultado: **200 OK en ~13s, informe completo** → usuario: "está perfecto".
- **Aprendizaje:** en el free tier del proyecto del usuario, **2.0-flash/-lite = 429**; el modelo con cuota es **2.5-flash**, que exige apagar el thinking para devolver JSON en un solo tiro. La lista `GEMINI_MODEL` y el `thinkingBudget` quedan configurables por secret.
- Verificado por logs reales (finish=STOP, len>0) + confirmación del usuario logueado. `node --check` + 77/77 tests se mantienen.

### 2026-06-30 (cont. 3) — Módulo Financiero: modo AUTOMÁTICO (Gemini, el "botón mágico")
- **Pedido del usuario:** saltarse el copiar/pegar; que apriete un botón y el informe salga solo.
- **Decisión (AskUserQuestion):** conectar **Gemini API** (automático). Revierte el "sin API" **solo para este módulo** — el Plan Maestro §7-D1 ya lo contemplaba ("abrir API recién para CRM-2"). Costo Flash ≈ centavos/informe, tier gratis probable.
- **Hecho:** Edge Function `analizar-financiero` (Deno, `verify_jwt`, lee `GEMINI_API_KEY` del env, multimodal inline, `responseMimeType:json`; 503 `no_key` si falta la llave) desplegada por MCP. Front: `js/db.js` `analisisFinancieros.analizar()` (`functions.invoke`) + `docBase64()` (baja adjuntos del bucket a base64); `financiero.view.js` botón "Generar informe" (spinner → EF → parsea → abre informe + auto-guarda) con **fallback** al copy-paste si falla/sin llave. Reusa todo lo demás (prompt/parser/visor/tabla).
- **Verificado:** EF viva (401 sin auth) · `node --check` · 77/77 tests · **E2E en preview** (mock de la EF): botón "Generar informe" → informe A4 directo, **el copy-paste nunca aparece**; guarda y aparece en la lista; selección de tipo respetada (prueba controlada). Screenshot omitido (gotcha headless de timers) → verificado por DOM.
- **Seguridad:** llave solo en secrets de la EF (`SECURITY.md §7` actualizado); los datos van a Google por API igual que en el copy-paste; para datos de clientes, tier de pago o sin-entrenamiento.
- ⬜ **Pendiente del usuario:** poner `GEMINI_API_KEY` en Supabase → Edge Functions → Manage secrets (guía entregada). Mientras no esté, el módulo funciona en **modo manual** (fallback automático).

### 2026-06-30 (cont.) — Ola 1: Módulo Financiero trIA (M2 "Lector IA") construido
- **Contexto:** siguiente del Plan Maestro tras cerrar Ola 0 + Director de Orquesta. Objetivo: módulo financiero del CRM (cierres/IVA/liquidaciones → informe Tríada) con el **mismo enfoque "dirigir en vez de llamar" (sin API)** de la Mesa de Orquesta.
- **Decisiones del usuario (AskUserQuestion):** (1) los **3 tipos** desde el inicio (cierre/IVA-F29/remuneraciones); (2) **ambos modos** de entrada (adjuntar documentos **y** tipear cifras); (3) informe **A4 con marca Tríada** (la IA devuelve JSON, el CRM lo renderiza); (4) **tabla dedicada** `analisis_financieros`.
- **Verificación previa (no confiar en el handoff a ciegas):** contrastado el handoff ↔ DB real por MCP — todo cuadró (`documentos`=19 filas, tablas AI Commander `proyectos/tareas/ai_prompts/ai_responses`, `profiles`=4, `orgs`=1). Nota: las tablas del Director son `proyectos/tareas/ai_prompts/ai_responses`, **no** `aic_*`.
- **Hecho (1 sesión):**
  - **Backend** por MCP (migración `modulo_financiero`, espejo `supabase/financiero.sql`): tabla `analisis_financieros` + 3 enums + correlativo `FIN` + bucket privado `financiero`, RLS multitenant (borrar = admin o creador). Verificado en vivo (18 cols, 4+4 policies, advisors sin hueco nuevo).
  - **Dominio puro** `domain/analisis.js`: 3 tipos con contenido chileno (F29/PPM/Previred), `buildFinancePrompt` (método Tríada + contrato JSON), `parseFinanceReport` tolerante (fences/`{…}`/comas colgantes/comillas tipográficas → fallback).
  - **Capa de datos** `db.js` repo `analisisFinancieros` + mapper `finFromSupa/finToSupa` (guards de enum, patrón `documentos`).
  - **Presentación:** flujo 3 fases `financiero.view.js` (delegación, sin onclick inline) + visor A4 `informe-fin.view.js` (`buildFinReportDoc` puro, marca Tríada, `@media print` con la lección del fix de PDF: `@media screen and`, `min-height`, `box-sizing`; clase de body propia `has-fin-report` para no chocar con el Informe 360) + root `financiero.js` (lista+KPIs). CSS `financiero.css`.
  - **Integración:** `app.js` (import + nav "Análisis → Análisis Financiero" + ruta + ícono), `index.html` (link CSS).
- **Verificado:** `node --check` (7 archivos) · **77/77 tests** (`tests/financiero.test.js`, 22 nuevos) · **E2E en preview por DOM** (crear→tipo→cifras→prompt 2617 chars→pegar JSON→informe A4 4 págs→guardar→lista). Screenshot se colgó (gotcha headless de timers ya conocido) → verificado por DOM.
- **Gotcha resuelto:** el `_preview/mock-db.js` no exportaba `documentos` (deuda desde la Biblioteca) → `app.js` no booteaba en el preview; se agregó `documentos`+`analisisFinancieros` al mock y 2 CSS a `preview.html`.
- **Pendiente:** mirada del usuario logueado + probar con un F29/liquidación real; **paridad móvil** (como Biblioteca) queda para una próxima iteración; demos Ola 1 (D13/D12/D11) sobre este motor.

### 2026-06-30 (cont.) — Plan Maestro: Biblioteca + Director de Orquesta (Mesa de Orquesta)
- **Contexto:** el usuario armó una visión grande (16 demos + ERP + Director de Orquesta + biblioteca + módulo financiero + WhatsApp + SaaS + contenido). Se ordenó en el **Plan Maestro** (`PLAN-MAESTRO-TRIADA.md`, raíz de PROYECTO CONSULTORIA): 5 motores / 5 pistas / 4 olas. Ola 0 elegida.
- **Biblioteca de documentos** (`e11d826`, PC + móvil): tabla `documentos` + bucket privado `biblioteca` + RLS multitenant (borrar=admin, primer uso de Storage) + módulo PC (sección Recursos) + pantalla móvil (Más → Biblioteca); subida multi-archivo, descarga por URL firmada. **19 PDF cargados** (05-VENTAS + 06-MARCA) por Claude vía Edge Function temporal `biblioteca-seed` (service_role server-side, ya neutralizada a stub 410).
- **Director de Orquesta:** su DB (`ai_commander.sql`) **ya estaba aplicada** (la memoria decía "falta correr" — era falso). Decisión del usuario: **conectar las IAs SIN API** (evitar el gasto) → **Mesa de Orquesta** (`c696518`): pestaña estrella/por defecto; describes objetivo+tipo → genera 1 prompt por IA (ChatGPT/Claude/Gemini) → pegas respuestas → meta-prompt de síntesis para Claude. Cero API. + **Guardar sesión** y **Descargar carpeta .zip** por proyecto (`dbb2aca`, docs `988e571`).
- **Verificado:** `node --check` + **55/55 tests** (11 nuevos). 🟡 falta la mirada del usuario logueado en la app. Vía Edge Function `ai-complete`/API **descartada** por presupuesto (`AI_CONFIG.edgeFunctionUrl=null` sigue a propósito).
- **Siguiente:** Ola 1 = **Motor 2 (Lector IA) → módulo financiero** (aplicable el mismo enfoque "dirigir en vez de llamar", sin API).

### 2026-06-30 (cont.) — Equipo (cargo/áreas/editor) + Notificaciones de reunión
- **Pedido:** (1) áreas Desarrollo/Comercial/Finanzas (+ Diseño para Jeinny) y que el cargo de cada
  persona sea el de su perfil (CEO/CTO/Gerenta de Finanzas/Diseñadora); (2) al sumar a alguien a una
  reunión, que le llegue una notificación a su app móvil (burbuja) — el usuario pidió además push del
  sistema con la app cerrada.
- **Hecho (3 fases, 3 commits, todo en vivo):**
  - **F1** `b2d2295`: `profiles.cargo` (≠ `role`), `area_t += diseno`, equipo fijado por MCP;
    `AREA_LABELS`/`areaLabel`/`TEAM_AREAS` en utils; agenda y perfil móvil muestran cargo+área;
    **editor de Equipo** en Configuración (admin) con `profiles.listAll`/`update`.
  - **F2** `3609f12`: burbuja in-app móvil vía `realtime.js` `onEvent`; `_onRealtimeEvent` filtra
    INSERT de citas donde soy participante y no creador; `showMeetingBubble` (reflow, sin rAF);
    campana con sección "Nuevas reuniones contigo".
  - **F3** `1c43d31`: Web Push real. Tablas `push_subscriptions`+`app_config` (RLS), VAPID en BD,
    Edge Function `notify-meeting` (deploy por MCP), `movil/js/push.js`, `sw.js` push/click (cache
    v4), botón Activar en perfil, `citas.add` dispara la función. Fuente y SQL en `supabase/`.
- **Infra por MCP de Supabase** (proyecto pqrjndirqtucoumijben): `apply_migration`, `execute_sql`,
  `deploy_edge_function`. Sin SQL manual del usuario.
- **Verificación:** preview por DOM (editor guarda; cargos en PC+móvil; burbuja aparece solo para
  participantes ≠ creador; sección de notificaciones renderiza). Edge Function: 401 sin sesión
  (carga OK con `jsr:@supabase/supabase-js` + `npm:web-push`); **auto-test transitorio** confirmó que
  `web-push.generateRequestDetails` cifra+firma en Deno (luego se redesplegó la versión real
  verify_jwt=true, hash idéntico a v1). Tests 44/44. `node --check` OK.
- **Pendiente (test del usuario, no codificable aquí):** en el teléfono, actualizar la PWA → Mi
  perfil → Activar notificaciones (permiso) → crear cita con participante → ver el push. Cada miembro
  activa 1 vez. Gotcha screenshots del preview: se cuelgan toda la sesión (timers del CRM) → se
  verificó por DOM.
- **Decisiones (usuario):** áreas Martín=Desarrollo, Vicente=Comercial, Ignacia=Finanzas,
  Jeinny=Diseño; gestión vía editor en la app; notificación = burbuja **+** push del sistema.

### 2026-06-30 — Atribución de citas en la Agenda ("¿de quién es esta cita?")
- **Pedido:** agenda compartida; al crear una cita ver quién la crea; con 2 citas a la misma hora,
  distinguir de quién es cada una.
- **Diagnóstico:** la atribución ya existía en datos (`citas.responsable` poblado al crear, leído en
  `citaFromSupa`, preservado al editar) y la agenda ya era compartida (sin filtro por usuario).
  El hueco era **100% de presentación**. Sin migración de BD.
- **Qué se hizo (`modules/agenda/agenda.js` + `agenda.css`):** avatar del creador en Mes/Semana,
  popover "+N más" y línea "Creada por X" en Lista; línea destacada en el Detalle; banner
  "Organiza esta reunión" + chip "Agenda compartida del equipo" en el modal crear/editar. Helpers
  `ownerOf`/`ownerMini`. En **Semana**, fix de solapes: citas a la misma hora se reparten lado a lado
  (nueva fn pura `packOverlaps` en `js/utils.js`).
- **Tests:** `tests/utils.overlaps.test.js` (7 casos de `packOverlaps`). Suite **44/44** verde,
  `node --check` OK (agenda.js, utils.js, db.js).
- **Verificación (preview/mocks):** Mes con avatares + colisión 09:00 apilada; Semana con colisiones
  09:00 y 15:00 lado a lado por creador; Detalle "Creada por Martín Jacques · Consultor"; modal crear
  con banner + chip compartida; Lista "Empresa · Creada por X". `_preview/mock-db.js` (gitignored) se
  ajustó con creadores distintos + 2 colisiones de hora para poder verlo. Screenshot del preview se
  cuelga con modal/timers (gotcha headless) → verificado por DOM.
- **Decisiones (autónomas):** "de quién es" = **creador (`responsable`)**, no participantes (que ya
  se muestran como stack aparte); avatar coloreado por miembro como desambiguador + nombre completo
  donde hay espacio (Lista/Detalle/modal). Sin tocar el modelo de datos.
- **Pusheado y EN VIVO** (commit `224d453`), con **paridad móvil** incluida en el mismo commit
  (`movil/js/screens/agenda.js` + `cita.js`). Único pendiente menor: citas viejas sin `responsable`
  no muestran avatar (degradación esperada).

### 2026-06-26 — Rediseño completo del Diagnóstico 360 (8 pilares + madurez 1-5) en PC y móvil
- **Pedido:** rediseñar por completo el cuestionario para que el dueño "descubra dónde pierde
  dinero, tiempo y oportunidades"; provocar reflexión, no auditar; estilo gran consultora.
- **Qué se hizo:**
  - **8 pilares** (Dirección · Operación · Tecnología · Ventas · Marketing · Finanzas · Seguridad ·
    Oportunidades Perdidas), **45 preguntas** como afirmaciones conversacionales en `js/utils.js`
    (`DIAG_AREAS`/`DIAG_PREGUNTAS`/`DIAG_GRUPOS`).
  - **Escala de madurez 1-5** (`MADUREZ` + `ratingToFrac`/`fracToRating`) reemplaza No/Parcial/Sí.
    Se guarda como **fracción 0..1** → `scorePct`/`answerValue` intactos y **retrocompatibles**.
  - **Motor del Informe** reescrito a 8 pilares: clasificación por umbral (≥0.75 fortaleza, ≤0.25
    hallazgo, 3=neutral), `evaluada` por pilar (omite vacíos en informes viejos), narrativa
    generalizada, **recomendaciones inteligentes** (servicios Tríada por pilar <60) y **tiers de
    prioridad** (Alta/Media/Baja). Catálogos STRENGTHS/FINDINGS/OPPS curados para los 45 ítems.
  - **Vista** (9 págs): portada con 8 chips, **semáforo** por pilar, **radar octagonal** (etiquetas
    con ancla dinámica para no recortarse), nueva **página Recomendaciones Tríada**, badges de
    prioridad. `benchmarks.js`: BASE/TILT/VALOR_FACTOR para 8 pilares + `SERVICIOS`.
  - **UIs duplicadas** actualizadas: modal PC (`modules/diagnosticos/*`, 5 botones de escala +
    leyenda + grilla de 8) y pantalla móvil (`movil/js/screens/diagnostico.js`, idem). Guardan
    `scores: {pilar:[…]}`. Tarjetas/consumidores (modals, ficha móvil, app share, dashboard
    `informes.js`) leen `d.scores[id]` y muestran índice general sobre evaluados.
  - **Datos:** `js/mappers.js` expone `scores` unificado (8 keys) **+ alias legacy**
    `scoresTec/Ventas/Finanzas`; `diagToSupa` acepta el shape nuevo con fallback al viejo.
    **Sin migración** (jsonb).
- **Verificación:** 37/37 tests (`node --test`), `node --check` de los 13 módulos, render E2E en
  node (8 pilares + retrocompat 3 áreas = 9 págs) y **preview con mocks** (modal PC: 8 áreas, 225
  botones, scoring en vivo; informe: 9 págs, radar 8, recomendaciones; móvil: 8 pilares, fill de
  color por rating). Sin errores de consola.
- **Decisiones técnicas (autónomas):** guardar fracción 0..1 (no el 1-5 crudo) por
  retrocompatibilidad sin ambigüedad; añadir página de recomendaciones (informe 8→9 págs);
  preservar alias legacy para no tocar tarjetas una a una. La página pública
  `diagnostico-publico.html` (autocontenida, 3 áreas) quedó **fuera de alcance**, intacta.

### 2026-06-23 (cont. 2) — Fix del PDF del Informe 360 (se desordenaba al imprimir)
- El usuario reportó que el PDF "se desordena por completo y pierde calidad". **Causa raíz:** el
  breakpoint responsive del visor `@media (max-width:880px)` se activaba **al imprimir** — una hoja
  A4 mide ~794px (210mm @96dpi), por debajo de 880px. Eso colapsaba las grillas (medidor+texto,
  barras+radar, lista+matriz, plan 3 col, meta de portada) a **1 columna**, el contenido desbordaba
  la página de **alto fijo** (`height:297mm`) y **8 págs se partían en 16**, con piezas en hojas en
  blanco (p. ej. el código de informe). Commit `642faee` (pusheado, en vivo).
- **Fix** en `modules/informe-ejecutivo/informe.css` (3 cambios, solo CSS, sin tocar el visor en
  pantalla): (1) acotar el breakpoint a `@media screen and (...)` → nunca aplica en impresión;
  (2) `.report-page` **sin `height` fijo** (queda `min-height:297mm` + `break-inside:avoid` en
  tarjetas) → las páginas densas **fluyen** a otra hoja en vez de **recortar**, y las tarjetas no se
  parten a la mitad; (3) `box-sizing:border-box` explícito → cada hoja es 210×297mm exactos (no
  depende del reset global de `styles.css`).
- **Verificación E2E (no ✅ a ciegas):** se renderizó el **motor real** (`informe.engine.js` +
  `informe.view.js`) con un diagnóstico denso (peor caso) vía **Chrome headless `--print-to-pdf`**
  (mismas condiciones que "Guardar como PDF" del navegador), cargando `styles.css` + `informe.css`
  como el CRM real. Antes: **16 págs reventadas**. Después: **informe limpio**, 8 secciones con su
  layout correcto, footers 2/8…8/8, **nada recortado** (la ficha de Finanzas que se perdía ahora
  aparece entera). Las hojas del PDF roto del usuario (16 págs, código en hoja en blanco)
  confirmaron el síntoma de entrada.
- ⚠️ **Gotcha de fidelidad de la verificación:** sin cargar `styles.css` (reset
  `*{box-sizing:border-box}`), `.report-page` cae en content-box y desborda 38mm/hoja → falso
  positivo de "16 págs". Hay que reproducir el entorno real (reset global) para que la prueba valga.
- **Trade-off aceptado por el usuario (decidió "dejar fluir"):** en diagnósticos densos (empresas de
  baja madurez = muchas debilidades), Resultados y Oportunidades fluyen a una 2ª hoja (contenido
  completo, algo de blanco) → 9-10 págs. ⬜ Pendiente opcional: split **diseñado** de esas 2 páginas
  para eliminar el espacio en blanco (cambio de layout en `view.js`).

### 2026-06-23 (cont.) — Informe v2: análisis profundo (graduado · sub-dim · benchmark · $ · narrativa · radar)
- El usuario pidió llevar el informe "al nivel máximo de calidad, estética y análisis de información".
  Se evaluó 0-10 (estética ~7.2 / análisis ~4.7 / global ~6) y se ejecutó el plan. Commits
  `bd9cb67` · `7833fe4` · `ce98f7a` (pusheados, en vivo).
- **Escala graduada No/Parcial/Sí** (`answerValue`+`scorePct` en utils.js; modal 3 estados; motor:
  Sí=fortaleza, No=hallazgo, Parcial=solo puntaje). Retrocompatible con Sí/No viejo.
- **Sub-dimensiones en el informe**: el motor calcula el puntaje de cada sub-bloque (DIAG_GRUPOS) y
  el informe muestra las 3 sub-barras por área.
- **Benchmarks** (`modules/informe-ejecutivo/informe.benchmarks.js`, referencia Tríada curada por
  rubro×tamaño): "+X vs ref." por área + polígono punteado en el radar (Tu empresa vs Referencia
  rubro). Solo si el prospecto tiene rubro o tamaño.
- **Cuantificación $** ("valor en juego"): desde `facturacion_est` + brecha × factor por área, rango
  con caveat explícito. Solo si hay facturación numérica (sin falsa precisión).
- **Narrativa con insight cruzado** (reglas, sin IA — decisión del usuario): `_insightPatron` detecta
  el patrón (ventas↑/finanzas↓ → "capturar, no vender más", etc.) e integra benchmark + $.
- **Portada con titular** (índice + valor en juego). Sin logo del cliente (decisión del usuario).
- Verificado: 35/35 tests · node --check · smoke graduado/legacy/benchmark/narrativa · render de las 8
  páginas en preview · 0 errores. Scores estimados tras el trabajo: análisis ~4.7→~7, global ~6→~8.
- ⬜ **Pendiente del plan (polish/producción):** A5 ROI/payback por oportunidad · B3 página de
  metodología + densidad · B4 tipografía fina (cifras tabulares, itálica de énfasis) · B5 self-host de
  Spectral/Libre Franklin + prueba del PDF real.

### 2026-06-23 — Diagnóstico 360: cuestionario ampliado + Informe con identidad del sitio
- El usuario quería más preguntas (cubrir todo el espectro de la empresa) y que el informe final
  tuviera la identidad del sitio web. Se trabajó en 2 fases y se pusheó junto (`e54be3e`).
- **Decisiones (taxonomía, vía AskUserQuestion):** profundizar las 3 áreas (no agregar áreas) ·
  9 preguntas por área (27 total) · el formulario público se queda corto (15).
- **Fase 1 — cuestionario:** `DIAG_PREGUNTAS` (9×3) + `DIAG_GRUPOS` (sub-dimensiones) en utils.js;
  catálogos del motor a 9×3 alineados 1:1 por índice; `scorePct()` dinámico reemplaza el `/5` en 4
  archivos; modal agrupado + barra de progreso; estilos en diagnosticos.css.
- **Fase 2 — informe:** `informe.css` reescrito con tokens de marca del sitio scope-eados a
  `.informe-viewer`; colores por área + niveles a la marca en el engine; portada petróleo, Spectral,
  puntos de color en vez de emoji y gráficos re-skineados en view.js/charts.js.
- **Verificado:** 35/35 tests · node --check 8/8 · render de las 8 páginas + modal en preview
  (claro/oscuro) · 0 errores de consola. Diagnósticos viejos de 5 respuestas no rompen (scorePct
  dinámico); deuda menor: sus etiquetas de informe pueden correrse (eran datos de prueba).
- ⬜ Opcional futuro: self-hostear Spectral/Libre Franklin para fidelidad tipográfica exacta (hoy via
  Google Fonts); sincronizar el form público si se decide ampliarlo.

### 2026-06-17 — Auditoría 360 multi-disciplina + plan-checklist vivo
- Revisión profunda con el panel enterprise (Principal/Architect/DevSecOps/Backend/DBA/FAANG/CTO/
  Product) sobre el código real (no se asumió nada): leídos `app.js`, `js/db.js`, `js/auth.js`,
  `js/utils.js`, `js/supabase.js`, `index.html`, `diagnostico-publico.html`, `supabase/multitenancy.sql`,
  `tests/`, CI (`.github/workflows/ci.yml`), `package.json`.
- **Hallazgos clave:** (1) CR-1 — la RLS multitenant/privesc/audit está **escrita pero no verificada
  con login** (solo por REST anon) → crítico de verificación; (2) AR-1 — god-object `window._app` +
  `onclick` inline en todo el front → **bloquea la CSP** y el testing; (3) SEG-2 — formulario público
  de autodiagnóstico **sin rate-limit/CAPTCHA**; (4) CA-1 — tests casi inexistentes (solo `utils`).
  Fortalezas confirmadas: RLS por tenant bien diseñada, audit inmutable, `supabase-js` pineado,
  XSS almacenado cerrado, signup deshabilitado.
- **Entregables:** `docs/AUDITORIA_360_2026-06-17.md` (informe) + **§4.0 plan-checklist** con 4 bloques
  (A seguridad · B arquitectura/calidad · C UX · D escala). Convención: marcar `[x]` + `~~tachar~~` +
  `✅ (fecha)` al completar, para continuidad entre sesiones.
- ⬜ **Nada ejecutado aún:** el plan está listo para empezar por el Bloque A (A1 = verificar RLS con login).
- Cambios solo en docs (working tree). ⬜ Pendiente decidir el push.

> **Cont. (2026-06-17) — A1 en curso: la verificación con login YA encontró 2 huecos reales.**
> Al listar `pg_policies` (admin) aparecieron 2 policies viejas que la migración no borró:
> **H1** `autodiagnosticos.autodiag_auth_all` (`ALL` / `using(true)` para `authenticated`) → anula por
> OR el filtro por org = **fuga cross-tenant** (latente hoy, single-org; real con 2+ orgs).
> **H2** `diagnosticos.diagnosticos_public_ins` (`INSERT` para `anon`, `with_check lead_id is not null`)
> → cualquier anónimo inserta **diagnósticos oficiales falsos**; el form público solo usa
> `autodiagnosticos`, así que la policy sobra. **Fix:** `supabase/fix_rls_autodiag_2026-06-17.sql`
> (A1.5). Esto valida el valor de la auditoría: "no asumir, verificar con login" destapó lo que el
> chequeo anon no veía.

### 2026-06-14 (cont. 5) — Alta de socios por invitación (self-service de contraseña + Mi cuenta)
- El usuario pidió sumar a sus 3 socios sin pedirles correo/contraseña: invitarlos por email, que se
  registren solos y luego puedan cambiar su propio correo/contraseña.
- Solución: **invitaciones de Supabase Auth** (sin tocar el candado del signup público C-1; las
  invitaciones de admin lo saltan). Decisión del usuario: los 3 socios = **administrador**.
- **Código (pusheado):**
  - `index.html`: script en `<head>` captura `window.__authFlow` del hash de la URL antes de que el
    cliente Supabase lo limpie.
  - `js/auth.js`: `requireAuth()` intercepta `invite`/`recovery` → `_showSetPasswordScreen()`
    (`updateUser({password})`); enlace "¿Olvidaste tu contraseña?" en el login
    (`resetPasswordForEmail`); helper `_logoSvg()` compartido. Login normal sin cambios.
  - `modules/configuracion/configuracion.js`: tarjeta "Mi cuenta" (cambiar email/contraseña).
- Verificado `node --check` (auth.js, configuracion.js). No verificable en preview (mocks; el flujo
  real necesita tokens de email + sesión Supabase).
- ⬜ **Pendiente del usuario (Supabase):** URL Configuration (Site URL + Redirect URLs a la app),
  invitar los 3 emails (Authentication → Users), y `update profiles set role='admin', nombre=...`
  por cada socio. Guía paso a paso entregada en el chat.

### 2026-06-14 (cont. 4) — Auditoría Profunda enterprise + fixes P0 de código
- El usuario pidió "MODO AUDITORÍA PROFUNDA" (arquitecto principal/staff/SRE/security/DBA/perf/SaaS):
  recorrer todo el proyecto, cuestionar todo, dos pasadas, scores y hoja de ruta a Enterprise SaaS.
- Auditado el codebase canónico completo en dos pasadas (capa de datos, SQL+RLS, todos los `js/*`,
  módulos de render representativos, form público, AI-Commander). Veredicto: cimientos sólidos pero
  **3 críticos abiertos** que dependen de bordes (auth config, RLS faltante, escaping de contexto).
- **3 CRÍTICOS nuevos** (no estaban en las auditorías previas):
  - **C-1 Signup público abre la org compartida** — el modelo es single-org real → el límite de acceso
    es la config de Auth, no la RLS. ⬜ Solo el usuario lo cierra (toggle en Supabase). Lo #1.
  - **C-2 `correlativos` sin RLS** → write anónimo vía PostgREST → DoS de altas por colisión de `codigo`.
  - **C-3 XSS almacenado** por `'` sin escapar en `onclick` de `modals.js:155` (empresa controlable
    desde el insert anónimo del landing).
- **Aplicado en código (deploy-safe, `node --check` OK):**
  - `js/utils.js` — `escHtml()` ahora escapa `'`→`&#39;` (cierra C-3 sistémicamente para todo el código).
  - `modules/modals/modals.js:155` — el dato sale del handler inline a `data-share` (event delegation
    parcial; `compartirDiag` lee `this.dataset.share`).
- **Entregado (correr en Supabase, idempotente):** `supabase/correlativos_rls.sql` (C-2).
- ⚠️ No verificado en navegador real (los fixes tocan render con datos Supabase + auth; el preview usa
  mocks). Verificado por `node --check` y revisión del flujo del `data-attr`. **Pendiente del usuario:**
  (a) cerrar el signup público y probar que `signUp` falla; (b) correr `correlativos_rls.sql`; (c) push.
- **Backlog priorizado (P1→P3) e informe de scores** quedan en §1 (bloque "Auditoría Profunda").
- **Seguimiento:** usuario corrió `correlativos_rls.sql` (C-2 ✅). Luego **P1/S-5 aplicado y pusheado**
  (`a3ae2f5`): `js/supabase.js` pinea Supabase JS a `2.108.1` exacta (no `@2` flotante; byte-idéntico
  a lo que servía → 0 cambio). **Pendiente del usuario:** C-1 (cerrar signup público — lo más urgente).
  **P1 restante (otra sesión):** CSP meta (riesgo de romper la app por handlers/estilos inline → requiere
  verificar con login, no autónomo) + CAPTCHA en form público (necesita las keys de Turnstile del usuario).

### 2026-06-14 (cont. 3) — Limpieza P0/P1: código muerto/duplicado/innecesario
- El usuario pidió implementar **solo P0/P1**, sin features nuevas, **mismo comportamiento**, y
  eliminar código muerto/duplicado/innecesario. Tras mapear el estado real (casi todo el P0/P1 de
  rendimiento seguro ya estaba commiteado en `d513f7c`; el resto choca con "mismo comportamiento"),
  el usuario eligió el alcance **"Solo lo seguro"**.
- **Aplicado (−979 líneas netas, 0 cambio de comportamiento):**
  - Eliminada la carpeta `tools/` completa (`informe.standalone.html` 856 líneas + generador + JSON):
    artefacto/dev-tool sin referencias en la app; la capacidad de informe PDF ya vive in-app.
  - `js/format.js`: eliminada `formatCLP()` **duplicada** (los 7 módulos importan la de `js/utils.js`)
    + `formatPercent()` muerta. Se conserva `parseCLP()`.
  - `js/utils.js`: eliminadas `avatarHtml()` + `initials()` (sin consumidores).
  - `js/db.js`: eliminado export `clearReadCache()` (sin usos; logout ya hace reload) + campo muerto
    `historial` en `leadFromSupa`/`importLandingLeads` (la columna no existe en `leads`).
  - 10 imports sin usar en 7 módulos (clientes, home, informes, modals, pipeline, presupuestos, prospectos).
- **Verificado:** `node --check` (todos los .js), resolución de imports cross-module (script ad-hoc, 0
  rotos), `grep` de referencias residuales (0), re-chequeo de imports sin usar (0). No verificado en
  navegador (es eliminación de código sin consumidores; el preview usa mocks).
- **Informe:** `docs/LIMPIEZA_P0_P1.md` (detalle + P0/P1 excluido con razón: paginación/bundling/
  correlativos/RPC/rate-limit/observabilidad chocan con "mismo comportamiento / sin build / sin SQL").
- ⬜ **Pendiente del usuario:** decidir el push (cambios en working tree, sin commitear).

### 2026-06-14 (cont. 2) — Rediseño de la pantalla de login + aclaración preview.html
- El usuario pensaba que `preview.html` era "la pantalla antes de entrar al CRM". Aclarado:
  `preview.html` + `_preview/` = **harness de desarrollo** (datos mock, sin login, no user-facing);
  la pantalla real previa al CRM es el **login** en `js/auth.js`.
- **`js/auth.js` rediseñado** (pusheado, commit `3e99832`): logo de marca grande y centrado en
  mosaico redondeado (gradiente teal-l→surface, igual que el nav), wordmark "Tríada·" en serif
  (Newsreader) + bajada "Consultoría 360 · Diagnóstico CRM", tarjeta más aireada, divisor, botón
  Entrar en teal, línea de confianza, entrada animada. **Theme-aware** (usa variables CSS del tema
  → respeta Claro/Oscuro/Matrix) y responsive (`@media max-width:420px`). El handler de submit no
  cambió (mismos ids authForm/authEmail/authPw/authBtn/authErr). `node --check` OK.
- ⚠️ No verificado en navegador (el login muestra siempre el tema claro porque `init()` aplica el
  tema *después* de `requireAuth()`; si se quiere login con el tema guardado, mover el seteo de
  `data-theme` antes de `requireAuth` en `app.js` — mejora opcional, no hecha).

### 2026-06-14 (cont.) — Auditoría de RENDIMIENTO/escalabilidad + fixes seguros
- El usuario pidió auditoría exhaustiva de rendimiento (frontend, backend, DB, arquitectura,
  caching, seguridad∩perf, escalabilidad 100/1k/10k) y aplicar las mejoras seguras.
- Informe completo: **`docs/AUDITORIA_RENDIMIENTO.md`** (10 secciones, tabla P0-P3, scores).
- **Aplicado en código (seguro, sin cambio funcional, `node --check` OK):**
  - `js/db.js` — `prospectos.countByEstado()` (count head, 0 filas).
  - `app.js:117` — `renderNav` usa el count en vez de `getAll().filter` (antes traía TODA
    la tabla leads en CADA navegación solo para el badge "Nuevo").
  - `modules/informes/informes.js` — `Map cliById` (O(n²)→O(1)) en tabla de vencidas + PDF.
  - `index.html` — `preconnect`/`dns-prefetch` (Supabase + jsDelivr) → cold-load más corto.
  - `modules/pipeline/pipeline.js` — debounce 140 ms del buscador.
- **Aplicado tras aprobación del usuario (caché + pipeline; el usuario eligió este alcance):**
  - `js/db.js` — **caché de lecturas en memoria**: `_cachedAll(table, fetcher)` envuelve los 9
    `getAll` (TTL 15 s + dedupe de requests concurrentes → mata el "boot storm" donde leads/citas
    se traían 3-4 veces). Cada add/update/delete llama `_invalidate(table)` (21 mutaciones) →
    próxima lectura fresca. Export `clearReadCache()`. **Caveat documentado:** arrays cacheados se
    comparten por referencia; verificado que NINGÚN módulo los muta en sitio (sorts son sobre
    `.filter()`/`[...spread]`/`expand()`, siempre arrays nuevos).
  - `modules/pipeline/pipeline.js` — separado `render()` (trae datos) de `_paint()` (repinta de
    `_all` SIN red). Filtro por etapa y toggle kanban/lista ahora repintan de memoria; el drop de
    DnD sigue en `render()` (mutación → refresca, la caché ya se invalidó en el update).
- **Entregado (correr en Supabase, idempotente):** `supabase/rls_perf.sql` — envuelve
  `auth_org_id()/is_admin()/auth.uid()` en `(select …)` → RLS se evalúa 1×/consulta (InitPlan),
  no por fila. Funcionalmente idéntico a multitenancy.sql.
- **Backlog NO hecho (el usuario lo dejó fuera de este alcance):** paginación (repository factory
  `makeRepo.page`), RPC de agregados para Informes, bundling (esbuild/Vite), Realtime en vez de
  polling 60 s, rediseño del contador `correlativos` (contención). Código esbozado en el informe.
- ⚠️ No verificado en navegador real (los cambios de capa de datos requieren sesión Supabase
  logueada; el preview usa mocks y no ejercita el `db.js` real). Verificado por `node --check`.
  **Pendiente del usuario:** correr `rls_perf.sql` + decidir el push.

### 2026-06-14 — Auditoría de Ingeniería Empresarial (12 fases) + fixes críticos
- El usuario pidió auditoría integral (arquitectura, calidad, complejidad, seguridad, DB, API,
  rendimiento, escalabilidad, multitenancy, mantenibilidad, estándar empresarial, plan). Decisión
  del usuario: **aplicar fixes CRÍTICOS + guardar informe en /docs**.
- Auditado todo el codebase canónico contra el esquema real. Hallazgo central: **es single-tenant
  con DB global compartida** (`schema.sql` RLS `using(true)` en todo) → fuga total entre empresas.
- **Aplicado en código (deploy-safe):** C-4 XSS — `escHtml()` en `home.js` (69, 86-87) e
  `informes.js:217` + helper `html\`\`/raw()` en `js/utils.js`. `node --check` OK ×3.
- **Entregado (pendiente correr):** `supabase/multitenancy.sql` — C-1 (org_id + RLS por tenant
  + stamping por trigger, front intacto), C-2 (trigger anti-privesc role/org/activo), C-3 (delete
  facturas solo admin), C-5 (audit_row triggers + actividad solo-lectura por org). Idempotente,
  no-destructivo, backfill a org por defecto. Guarda AI Commander/autodiagnosticos/presupuestos si existen.
- **Informe completo:** `docs/AUDITORIA_EMPRESARIAL.md` (12 fases, notas, comparación
  Salesforce/HubSpot/Zoho, backlog CRÍTICO/ALTO/MEDIO/BAJO).
- ⚠️ La migración Supabase **no se pudo verificar en vivo** (requiere correrla en el dashboard).
  Verificación post-run sugerida en §4 P0.

### 2026-06-13 — Mascota: perseguir el cursor ahora es raro (queja "no se suelta")
- El usuario sentía la persecución demasiado pegajosa: el gato entraba en `chase` con
  cualquier mousemove cercano y solo soltaba tras 2.6 s de cursor quieto → glued al cursor.
- Decisión del usuario: **"perseguir es raro"**. Cambios en `modules/mascota/mascota.js`:
  - Mover el mouse ya NO dispara `chase` (se quitó el trigger de `_onMove`); los ojos
    siguen siguiendo el cursor siempre (vía `_draw`).
  - El "cerebro" (`_brain`) elige `chase` solo ~12% de las veces y con gating (cursor
    activo + cooldown cumplido); el resto: pasea / se cuelga de cards / dormita.
  - `chase` se cansa solo a los 3–5.5 s (aunque sigas moviendo) o si el cursor se queda
    quieto 1.6 s, y luego hay cooldown de 12–22 s antes de poder volver a perseguir
    (`_S.chaseUntil` / `_S.noChaseBefore`).
- Verificado: `node --check` OK. Comportamiento (raro/estocástico) no probado en vivo por
  diseño — se siente al usar. 🟡

### 2026-06-12 (cont. 5) — Mejoras UX (dock, WhatsApp, dashboards, contacto en Clientes)
- `supabase/presupuestos.sql` confirmado en vivo (probe REST: tabla + 16 columnas OK, RLS).
- **Dock de recordatorios** movido a abajo-derecha (`agenda.css`) y, con notificaciones, fab en
  color de alerta + halo pulsante + campana que se sacude + contador (clase `.has` en
  `reminders.js`). Push notifications entran desde la derecha.
- **Ícono WhatsApp** real (glyph relleno) reemplaza el teléfono en los botones de contacto de
  Leads/Prospectos/Inicio/Clientes; `js/icons.js` ahora soporta íconos rellenos (set `FILLED`).
- **Informes**: botón "Descargar informe (PDF)" + sección "Tableros" con gráficos SVG/CSS
  (barras leads 14d, dona de cartera de facturas, barras de propuestas por estado).
  `exportInformePDF()` exportada y reutilizada por Configuración (se borró `_printInforme`).
- **Clientes**: botones de contacto por fila (vía `leadId`; deshabilitados si ficha manual).
- **Mascota**: nace abajo-izquierda y evita la esquina del dock al pasear.
- Verificado en preview: 0 errores; dock `right:20px`+`.has`; charts; export PDF; glyph WhatsApp.

### 2026-06-12 (cont. 4) — Mascota avanzada (Batch 4)
- Reescrito `modules/mascota/mascota.js` con motor de comportamiento: sit/walk/chase/hang/sleep.
  Pasea por el CRM, persigue/juega con el cursor (pounce), se cuelga del borde de tarjetas
  visibles, parpadea, duerme y reacciona al clic. rAF + steering + cleanup completo.
- Verificado en preview: 0 errores; walk mueve la posición; chase alcanza el cursor y hace
  pounce; clic → burbuja. El preview headless **pausa rAF** (0 frames/600 ms), así que el
  desplazamiento se validó avanzando los callbacks de rAF a mano. En navegador real corre a 60fps.
- El usuario reportó que estaba corriendo `supabase/presupuestos.sql` (verificar en prod).

### 2026-06-12 (cont. 3) — Rectificaciones Batches 2-3 (Informes, Config/mascota, Propuesta-PDF/Presupuesto)
- **Batch 2:** Informes reescritos (flujo de leads 24h/7d/30d, actividad, cobranza con vencidas
  + días de mora). Configuración: tamaño de fuente (zoom raíz), 3 temas (+Matrix), mascota gato
  (`modules/mascota/mascota.js`, opt-in), export Agenda/Cartera CSV + Informe PDF (reemplaza JSON).
- **Batch 3:** Propuesta sin IVA + Cotización PDF; módulo Presupuesto real (programa + mano de
  obra + IVA + plan de servicio) sobre tabla `presupuestos`; `js/pdf.js` (openCorporateDoc)
  compartido; `js/db.js` capa presupuestos + isMissingTable; `supabase/presupuestos.sql` nuevo.
- Verificado en preview (mocks): 0 errores; Matrix + mascota OK; Informes con métricas; Propuesta
  sin IVA; import propuesta→presupuesto con cálculo correcto; ambos PDF generan. Pusheado a `main`.
- **Pendiente del usuario:** correr `supabase/presupuestos.sql`. Nota: el screenshot del preview
  quedó inestable (un gradiente teselado pesado degradó el renderer; se reinició el server y se
  aligeró el fondo Matrix a un vignette).

### 2026-06-12 (cont. 2) — Rectificaciones Batch 1 (nav + Clientes + Leads + contacto)
- El usuario pidió 8 rectificaciones (botones de contacto en leads; Propuesta→PDF vs
  Presupuesto; módulo Clientes para arreglar factura; Informes con métricas útiles; reorg de
  nav al orden de presentación; rename a Director de Orquesta; personalización/mascota;
  reemplazar export JSON; quitar botón duplicado + marca con personalidad).
- Se ofreció encuesta de 3 decisiones (modelo Presupuesto, Leads vs Prospectos, alcance
  mascota); el usuario no respondió → se siguió con defaults recomendados.
- **Batch 1 hecho y pusheado** (`main`): nav en 5 secciones, rename, dedup logo + marca,
  módulos Clientes/Leads/Prospectos, botones de contacto en Inicio, placeholder Presupuesto.
  Verificado en preview (mocks): 0 errores de consola, alta de cliente E2E, links de contacto.
- **Pendiente:** Batch 2 (Informes + Configuración/mascota/export) y Batch 3 (Propuesta→PDF +
  Presupuesto + `supabase/presupuestos.sql`). Ver §4 "Rectificaciones".

### 2026-06-12 (cont.) — calendar.sql ejecutado y verificado
- El usuario corrió `supabase/calendar.sql`. Probe en vivo (GET con key publishable) confirma que `citas` tiene `duracion_min/participantes/recordatorios/recurrencia` (200 [] en vez de 42703). Calendario con persistencia completa. (RLS impide leer filas anon, así que la migración de `tipo` legacy no se inspeccionó por valor, pero el ALTER quedó confirmado.)

### 2026-06-12 — Calendario de reuniones con recordatorios (handoff Claude Design)
- Implementado el design bundle `on9CJtUqVoBeYzpevwHLNw` ("Calendario con Recordatorios y Reuniones"). La parte de re-skin del bundle ya estaba implementada (2026-06-11).
- **Agenda reescrita** como calendario Mes/Semana/Lista (`modules/agenda/agenda.js` + `agenda.css` nuevo); modal de reunión con 7 tipos, participantes (de `profiles`), recordatorios, recurrencia, duración, estado; detalle con "Alerta activa" por participante; modal "+N más" por día.
- **`modules/agenda/reminders.js` nuevo**: dock flotante global + campana topbar con badge + push in-app con timers.
- **db.js**: citas extendidas (durMin/participantes/recordatorios/recurrencia) con fallback 42703 si falta `supabase/calendar.sql` (⬜ pendiente de correr); export `profiles.getAll()`.
- **utils.js**: `MEETING_TYPES` (slugs + mapeo legacy), `REMINDER_OPTS`, `RECUR_OPTS`, `ESTADOS_CITA`, `meetingType()`. **icons.js**: chevL, video, bellRing, grid, columns, x, repeat.
- **home.js**: "Citas de hoy" con color/ícono por tipo y clic→detalle. **modals.js**: openCitaModal→modal de reunión; closeModal restaura labels del botón guardar.
- **Preview harness arreglado**: a mock-db.js le faltaban los exports `autodiags`/`profiles` (rompía el import de app.js desde la sesión cont. 3); citas demo enriquecidas con el modelo nuevo.
- Verificado en preview (puerto 5174): 3 vistas del calendario, crear/editar/eliminar reunión E2E, dock con cuenta regresiva, filtros, navegación, dark mode, "+ Cita" desde ficha de prospecto, pipeline intacto — 0 errores de consola. ⚠️ No verificado contra Supabase real (requiere login + correr calendar.sql).
- Usuario corrió `supabase/autodiagnosticos.sql`. Verificado en vivo: anon sin lectura, anon-insert pasa RLS (23503 con lead falso = policy OK). Pipeline completo del CRM operativo: prospecto→cita→diagnóstico→propuesta→cliente→factura + autodiagnóstico público de referencia.

### 2026-06-11 (cont. 3) — Fixes de la auditoría aplicados (lote completo)
- Decisiones del usuario: (a) quitar notas del diagnóstico; (b) el formulario público es autoevaluación de REFERENCIA adjunta al lead (pipeline), el Diagnóstico 360 del CRM es el oficial; (c) continuar con todo lo demás.
- Aplicado: propuestas (slugs+vigencia+try/catch+filtros), citas (null+try/catch), clientes-write, deletes FK-seguros, área activa (slug area_t), export completo, cita-empresa en home, código muerto fuera, tabla `autodiagnosticos` (SQL nuevo) + chip pipeline + panel en ficha + form público apuntando ahí (fail-soft hasta correr el SQL).
- Verificado: sintaxis node --check (11 archivos), app bootea sin errores de consola (preview), form público carga y `submitDiag` definido. ⚠️ Falta que el usuario corra `supabase/autodiagnosticos.sql`.

### 2026-06-11 (cont. 2) — Auditoría completa funciones/bugs/redundancias
- Auditados los 11 módulos + app.js + db.js + formulario público contra el esquema real (probes en vivo: 22P02/22007/42501).
- 7 hallazgos rotos (propuestas, citas-hora, form público 360, área activa, clientes-write, FK deletes, notas diag) + gaps menores y código muerto. Todo volcado a §1 y §4.

### 2026-06-11 (cont.) — Facturación arreglada + continuidad entre sesiones
- Decisión del usuario: facturas → `cliente_id`. Módulo facturación reescrito a cliente-céntrico (`db.js` + `facturacion.js` + `modals.js`); estados al enum; verificado contra la base (42501 RLS = columnas/enum válidos). `clienteFromSupa` (lectura) corregido para mostrar/seleccionar cliente.
- Continuidad: hook `SessionStart` que auto-inyecta este HANDOFF + memoria de protocolo (leer al inicio / actualizar al final).
- Diferido por el usuario: `clientes-write` (crear cliente) y "las demás cosas del CRM".

### 2026-06-11 — Fix guardado de prospecto + auditoría esquema↔código
- Reportado: "creé un prospecto y no se guarda". Causa: enum `lead_origen`. Arreglado y pusheado (commit `763716b`).
- Auditoría contra la base en vivo: confirmado que `schema.sql` = base real; `clientes` y `facturas` en `db.js` divergen → marcados 🔴.
- Correlativos corregidos en las 4 entidades. Handoff reescrito como documento vivo y honesto.

### 2026-06-10 — Supabase + correlativos + IVA + facturación + cliente
- Migración a Supabase: schema ejecutado, RLS, triggers, auth/login en producción.
- Propuestas con ítems + IVA; módulos facturación y "crear cliente" agregados a la UI (resultaron 🔴, ver arriba). P0 de UUID (`+id`→`id`) y DnD corregidos.