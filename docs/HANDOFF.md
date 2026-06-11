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

### 🔴 Roto / bloqueado (NO usar hasta arreglar)
- **Crear cliente** 🔴 — `clienteToSupa`/`clienteFromSupa` usan `nombre, empresa, email, telefono`, pero la tabla real `clientes` tiene `razon_social, giro, direccion, rut, codigo` (no existen nombre/empresa/email/telefono). El INSERT falla con 42703. **Requiere decisión de modelo de datos** (ver §4).
- **Facturación** 🔴 — `facturaToSupa`/`facturaFromSupa` usan `lead_id, propuesta_id, fecha_emision, notas`, pero la tabla real `facturas` tiene `cliente_id, monto, pagado, emision, vencimiento, estado, codigo`. INSERT falla con 42703. **Requiere decisión de modelo de datos** (ver §4). (El correlativo es `FAC-`, no `FACT-` como decía el handoff viejo.)

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

### 🔴 P0 — arreglar lo roto (necesita decisión de modelo de datos)
- **Crear cliente:** decidir → (A) `ALTER TABLE clientes` para añadir nombre/empresa/email/telefono, o (B) remapear `db.js` a las columnas reales (`razon_social` ← nombre/empresa, y aceptar que email/telefono no se guardan, o añadir solo esos). Luego corregir `clienteToSupa`/`clienteFromSupa`.
- **Facturación:** decidir si las facturas cuelgan de `cliente_id` (modelo actual de la tabla) o de `lead_id`/`propuesta_id` (lo que asume el código). Luego corregir `facturaToSupa`/`facturaFromSupa` y el correlativo (`FAC-`).

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

---

## 6. Correcciones de esta sesión (2026-06-11) — los ✅ falsos del handoff viejo

1. **Prospecto no guardaba** 🔴→✅ — el `<select>` Origen ofrecía valores fuera del enum (`Contacto directo/Red social/Evento/Otro`) → INSERT 22P02 → fallo silencioso. Fix: `ORIGENES` alineado al enum + `toOrigenSlug()` + try/catch en `modals.js`.
2. **Correlativos "visibles"** (era falso) 🔴→✅ — `leadFromSupa/diagFromSupa/propFromSupa/facturaFromSupa` leían `row.correlativo` (no existe); corregido a `row.codigo`.
3. **Columna fantasma `historial`** — removida de `leadToSupa` (rompía el import del landing).
4. **`byRubro`** — ya no mapea el rubro por el diccionario de orígenes.
5. **Descubierto (no arreglado, requiere decisión):** `clientes` y `facturas` rotos por mismatch de columnas (ver §1/§4).

---

## 7. Bitácora de sesiones (más reciente arriba)

### 2026-06-11 — Fix guardado de prospecto + auditoría esquema↔código
- Reportado: "creé un prospecto y no se guarda". Causa: enum `lead_origen`. Arreglado y pusheado (commit `763716b`).
- Auditoría contra la base en vivo: confirmado que `schema.sql` = base real; `clientes` y `facturas` en `db.js` divergen → marcados 🔴.
- Correlativos corregidos en las 4 entidades. Handoff reescrito como documento vivo y honesto.

### 2026-06-10 — Supabase + correlativos + IVA + facturación + cliente
- Migración a Supabase: schema ejecutado, RLS, triggers, auth/login en producción.
- Propuestas con ítems + IVA; módulos facturación y "crear cliente" agregados a la UI (resultaron 🔴, ver arriba). P0 de UUID (`+id`→`id`) y DnD corregidos.
```