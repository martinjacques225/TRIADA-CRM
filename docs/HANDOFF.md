# HANDOFF — TRIADA CRM
> **Documento vivo. Fuente de verdad del estado del proyecto.**
> Última actualización: **2026-06-14**

---

## 📖 Cómo usar este documento (protocolo para Claude)

1. **Al INICIO de cada sesión:** lee este archivo completo *antes* de actuar. Es tu contexto base.
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

## 1. Estado actual (al 2026-06-14)

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
- **Diagnósticos** 🟡 — CRUD conectado; columnas (`lead_id, scores, hallazgos, oportunidades, estado`) coinciden con el esquema real.
- **Agenda / citas** 🟡 — CRUD conectado; **reescrita como calendario el 2026-06-12** (ver arriba).
- **Propuestas con ítems + IVA** 🟡 — tabla dinámica de servicios {descripcion, cantidad, precioUnit}; subtotal + IVA 19% + total; guarda en `servicios` (jsonb) y `valor`. Retrocompatible con formato viejo (string[]).
- **Correlativos en UI** ✅ — `LEAD-/DIA-/PROP-/FAC-000001` ahora se leen de la columna real `codigo` (arreglado hoy; antes leía `row.correlativo` inexistente → nunca aparecían).
- **Informes / informe ejecutivo (PDF)** 🟡 — motor de reporte; no re-verificado esta sesión.
- **Landing → Supabase** 🟡 — `01-WEB/Triada_Landing_Conversion.html` + `diagnostico-publico.html` insertan leads vía REST con `origen='landing'` (permitido a anon por RLS).
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

### ✅ P0 SEGURIDAD — `supabase/multitenancy.sql` CORRIDO y verificado en vivo (2026-06-14)
Cierra C-1 (fuga entre empresas), C-2 (privesc), C-3 (RBAC), C-5 (audit). Verificado por REST anon
(org_id en 8 tablas, anon sin lectura ni escritura). **Pendiente verificar con login admin:** privesc
falla para consultor, `actividad` registra+inmutable, backfill `org_id` no-null. Probe sugerido:
`select count(*) filter (where org_id is null) from leads;` → 0 (correr en SQL Editor, autenticado).
**Siguiente (backlog ALTO):** índices core + paginación (`makeRepo.page`), rate-limit anónimo, capa API.

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