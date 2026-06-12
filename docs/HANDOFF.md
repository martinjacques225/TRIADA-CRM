# HANDOFF — TRIADA CRM
> **Documento vivo. Fuente de verdad del estado del proyecto.**
> Última actualización: **2026-06-11**

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

## 1. Estado actual (al 2026-06-11)

### Funcionando
- **Auth / login** ✅ — `js/auth.js` bloquea el CRM hasta autenticar (Supabase Auth). Usuario admin creado y login en producción funcionando.
- **Pipeline de prospectos** ✅ — kanban + lista, filtros, drag & drop entre etapas. Crear/editar prospecto **arreglado hoy** (ver §6/§7).
- **Diagnósticos** 🟡 — CRUD conectado; columnas (`lead_id, scores, hallazgos, oportunidades, estado`) coinciden con el esquema real.
- **Agenda / citas** 🟡 — CRUD conectado; columnas coinciden con el esquema real.
- **Propuestas con ítems + IVA** 🟡 — tabla dinámica de servicios {descripcion, cantidad, precioUnit}; subtotal + IVA 19% + total; guarda en `servicios` (jsonb) y `valor`. Retrocompatible con formato viejo (string[]).
- **Correlativos en UI** ✅ — `LEAD-/DIA-/PROP-/FAC-000001` ahora se leen de la columna real `codigo` (arreglado hoy; antes leía `row.correlativo` inexistente → nunca aparecían).
- **Informes / informe ejecutivo (PDF)** 🟡 — motor de reporte; no re-verificado esta sesión.
- **Landing → Supabase** 🟡 — `01-WEB/Triada_Landing_Conversion.html` + `diagnostico-publico.html` insertan leads vía REST con `origen='landing'` (permitido a anon por RLS).
- **Facturación** 🟡 — **arreglado hoy** (decisión del usuario: facturas → `cliente_id`). Módulo reescrito a cliente-céntrico: `facturaToSupa/FromSupa` mapean columnas reales (`cliente_id, monto, pagado, estado, emision, vencimiento`); estados al enum real (`pendiente/parcial/pagado/vencido`, antes mandaba `Pendiente/Enviada` → 22P02); `toFactEstado()` blinda el valor; modal/tabla seleccionan y muestran **cliente**; guardado en try/catch. **Depende de que existan clientes** (ver 🔴 abajo) para ser usable.

### 🔴 Roto / bloqueado (auditoría completa 2026-06-11, verificado contra base en vivo)
- **Propuestas NO se guardan** 🔴 — `ESTADOS_PROP` capitalizado (`'Borrador'`) vs enum `prop_estado` minúscula → 22P02 (verificado). Segundo bloqueo: `vigencia: ''` → 22007 date (verificado). Sin try/catch → fallo silencioso. Afecta `propuestas.js` (modal, KPIs, colores) y los filtros capitalizados en `home.js`, `informes.js`, `modals.js:200` (botón "Crear factura" con `=== 'Aceptada'`).
- **Citas sin hora NO se guardan** 🔴 — `hora: ''` → 22007 time (verificado). Sin try/catch → silencioso. Fix: `|| null` en hora (y fecha) en `agenda.js`.
- **Formulario público 360 roto (doble)** 🔴 — `diagnostico-publico.html` inserta como **anon** en `diagnosticos` pero RLS solo permite anon→leads (42501 siempre), y además manda `estado:'cliente'` que no existe en `diag_estado` (22P02). El botón "🔗 Compartir 360" manda al cliente a un formulario que SIEMPRE falla al enviar. Fix: policy RLS para anon-insert en diagnosticos (con condición) o edge function; y estado `'borrador'`.
- **Área activa nunca persiste** 🔴 — `_setArea` (app.js) escribe `'Tecnología'` en `profiles.area`, enum `area_t` espera `'tecnologia'` (verificado 22P02); el error se traga con `.then(()=>{})`. Funciona en memoria, se pierde al recargar. Fix: mapa label→slug y al leer, slug→label.
- **Crear cliente (clientes-write)** 🔴 — `clienteToSupa` escribe `nombre, empresa, email, telefono` (no existen; tabla real: `razon_social, rut, giro, direccion, lead_id`) → 42703. `convertirACliente` roto. Lectura ya corregida. Fix: mapear `razon_social ← empresa||nombre`. **Bloquea facturación usable.**
- **deleteProspecto / limpiarDatos revientan con FK** 🔴 — `leads` es referenciado por diagnosticos/citas/propuestas/clientes **sin ON DELETE CASCADE**; eliminar un prospecto con hijos → 23503 silencioso (el usuario cree que eliminó). `limpiarDatos` borra prospectos ANTES que los hijos y no borra clientes/facturas. Fix: borrar hijos primero (o ALTER con cascade) + try/catch.
- **Notas del diagnóstico se pierden** 🟠 — la UI las captura (`diagnosticos.js`), el informe ejecutivo las lee (`informe.engine.js:233`), pero NO hay columna en la tabla y `diagToSupa` no las manda. Decisión: agregar columna `notas` o quitar el campo.

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
    └── modules/ home · pipeline · diagnosticos · agenda · propuestas ·
                 facturacion · informes · configuracion · modals · informe-ejecutivo · ai-commander
```
**NAV:** Principal (Home, Pipeline) · Gestión (Diagnósticos, Agenda, Propuestas, Facturación) · Análisis (Informes, Configuración)

---

## 4. Próximos pasos (por prioridad)

### 🔴 P0 — lo roto, en orden de impacto (auditoría 2026-06-11; ver §1)
1. Propuestas (estados minúscula + vigencia null + try/catch + filtros en home/informes/modals).
2. Citas (hora/fecha `|| null` + try/catch).
3. Clientes-write (`razon_social ← empresa||nombre`) → desbloquea facturación.
4. deleteProspecto/limpiarDatos (orden de borrado FK + try/catch).
5. Área activa (mapa label↔slug `area_t`).
6. Formulario público 360 (RLS para anon o estado validado; decisión de seguridad).
7. Notas de diagnóstico (decisión: columna nueva vs quitar campo).

### 🧹 P1.5 — gaps menores y redundancias (auditoría)
- `exportarDatos` no incluye clientes ni facturas.
- `home.js` cita de hoy muestra `c.empresa` (no existe en citas) → resolver prospecto.
- Campos del esquema sin UI: `leads.region`, `leads.facturacion_est`, `leads.scoring`.
- Doble fuente del nombre: `config userName` (localStorage, lo edita Configuración) vs `profiles.nombre` (Supabase, lo usa el nav). Unificar hacia `profiles`.
- Código muerto en `db.js`: `prospectos.byEstado/byRubro`, `citas.byEstado`, `propuestas.byEstado`, `clientes.get` (sin usos). `facturas.byCliente` aún sin consumidor (lo usará la ficha de cliente).
- `renderNav` hace `prospectos.getAll()` en cada navegación solo para el badge → 2-3 getAll por vista.
- try/catch faltante en modales de cita/propuesta/diagnóstico (prospecto y factura ya lo tienen).

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

### 2026-06-11 (cont. 2) — Auditoría completa funciones/bugs/redundancias
- Auditados los 11 módulos + app.js + db.js + formulario público contra el esquema real (probes en vivo: 22P02/22007/42501).
- 7 hallazgos rotos (propuestas, citas-hora, form público 360, área activa, clientes-write, FK deletes, notas diag) + gaps menores y código muerto. Todo volcado a §1 y §4. Sin fixes aplicados aún (pendiente decisión del usuario sobre orden/alcance).

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