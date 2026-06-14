# Auditoría de Ingeniería Empresarial — TRIADA Diagnóstico CRM

> Panel: Principal SWE · Software Architect · DevSecOps · Senior Backend · DBA · SaaS Architect · FAANG Code Reviewer
> Fecha: 2026-06-14 · Rama auditada: `main` · ~8.000 LOC JS · 16 módulos · 6 esquemas SQL
> Estado de remediación: **C-4 (XSS) aplicado en código** · **C-1/C-2/C-3/C-5 entregados como `supabase/multitenancy.sql` (pendiente correr en Supabase)**

---

## 0. Veredicto

TRIADA CRM es un **MVP competente** con un módulo (AI Commander) que es Clean Architecture real. Pero **como SaaS multi-empresa no es vendible tal cual**: es técnicamente *single-tenant con base de datos global compartida*. Los bloqueadores son mayormente de capa Supabase (RLS + esquema), no una reescritura. Con `multitenancy.sql` aplicado + el fix de XSS, la nota de **Seguridad sube de 2 → ~7** en días.

| Dimensión | Nota | 
|---|---:|
| Arquitectura | 4/10 |
| Seguridad | 2/10 → ~7/10 (con remediación) |
| Escalabilidad | 3/10 |
| Rendimiento | 4/10 |
| Mantenibilidad | 5/10 |
| Calidad de código | 5/10 |
| **Global** | **≈3.5/10** (prototipo sólido, aún no empresarial) |

---

## FASE 1 — Análisis General

**Stack:** Vanilla JS (ES Modules, sin build/bundler) · Supabase (Postgres + Auth + RLS) por CDN · GitHub Pages.

**Arquitectura actual:**
```
index.html → app.js (orquestador, window._app.*)
  ├ js/auth.js · supabase.js · db.js (capa de datos) · state.js · utils.js · format.js · pdf.js · icons.js
  └ modules/ home·leads·pipeline·agenda·prospectos·diagnosticos·propuestas·presupuestos·
            clientes·facturacion·informes·configuracion·mascota·modals·informe-ejecutivo·ai-commander
```

| Hallazgo | Evidencia | Severidad |
|---|---|---|
| **Código muerto / duplicado** | `tools/informe.standalone.html` (52KB) duplica el engine de `informe-ejecutivo` | BAJO |
| **Módulo accesorio** | `modules/mascota/mascota.js` (14KB) — irrelevante para un estándar empresarial | BAJO |
| **Placeholder** | `contactZoom` (`app.js:268`) abre URL genérica de Zoom (no integra nada) | BAJO |
| **Doble fuente de config** | `js/supabase.js:3-4` hardcodea URL+key mientras existe `js/config.local.js` para lo mismo | MEDIO |
| **Doble fuente del nombre de usuario** | `config.userName` (localStorage) vs `profiles.nombre` (DB) | BAJO |
| **Lógica duplicada de acceso a datos** | `js/db.js` (588 líneas) repite `from/to/getAll/get/add/update/delete/byX` ×8 entidades | MEDIO (DRY) |
| **Estructura bien diseñada** | `modules/ai-commander/` con DDD/Hexagonal — usar como plantilla del resto | ✅ |

**Dependencias:** no hay `package-lock.json`, `node_modules`, ni dependencias npm en runtime (todo por CDN). No hay dependencias sin uso *instaladas*, pero tampoco hay lockfile ni build reproducible.

---

## FASE 2 — Calidad de Código (SOLID / DRY / KISS / Clean)

### 2.1 DRY — Boilerplate de repositorios (`js/db.js`)
**Problema:** 8 entidades repiten el mismo CRUD (~70% del archivo es copia-pega), origen de bugs `22P02`/`42703` históricos.
**Solución (repository factory):**
```js
function makeRepo(table, fromRow, toRow, { order = 'created_at', asc = false } = {}) {
  return {
    async page({ limit = 50, offset = 0, filters = {} } = {}) {
      let q = supabase.from(table).select('*', { count: 'exact' });
      for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
      const { data, error, count } =
        await q.order(order, { ascending: asc }).range(offset, offset + limit - 1);
      _throw(error); return { rows: data.map(fromRow), total: count };
    },
    get:    async (id) => { const { data, error } = await supabase.from(table).select('*').eq('id', id).single(); _throw(error); return fromRow(data); },
    add:    async (d)  => { const { data, error } = await supabase.from(table).insert(toRow(d)).select('id').single(); _throw(error); return data.id; },
    update: async ({ id, ...r }) => { const { error } = await supabase.from(table).update(toRow(r)).eq('id', id); _throw(error); },
    remove: async (id) => { const { error } = await supabase.from(table).delete().eq('id', id); _throw(error); },
  };
}
export const prospectos = makeRepo('leads', leadFromSupa, leadToSupa);
export const facturas   = makeRepo('facturas', facturaFromSupa, facturaToSupa);
```
**Justificación:** colapsa ~400 líneas en ~80 y **añade paginación a todo el sistema** (clave para FASE 8). Reduce la superficie donde se repiten los bugs de mapeo.

### 2.2 SRP / Clean Architecture — God-modules
**Problema:** `agenda.js` (28KB), `modals.js` (23KB), `presupuestos.js` (20KB) mezclan en una misma función: fetch de datos + lógica de negocio + render HTML por strings + wiring de eventos.
**Solución:** replicar el patrón de `ai-commander` (`domain/` entidades+reglas, `application/` casos de uso, `infrastructure/` Supabase, `presentation/` vistas). Empezar por extraer el render a funciones puras `(estado) → htmlString` testeables.

### 2.3 Clean Code — Escaping inconsistente (DRY de seguridad)
**Problema:** `escHtml` existe pero se aplica ad hoc; faltaba en 3 sinks → XSS (ver FASE 4).
**Solución aplicada:** helper `html\`\`` que escapa por defecto (`js/utils.js`), + escape de los sinks. Para HTML confiable, `raw()`.

---

## FASE 3 — Complejidad

| Métrica | Observación |
|---|---|
| **Complejidad ciclomática** | Alta en `agenda.js` (ramas por vista Mes/Semana/Lista) y `modals.js` (un dispatcher por tipo de modal). Funciones >150 líneas. |
| **Acoplamiento** | Alto y **global**: `window._app` (~40 métodos, `app.js:202-395`) y `window._aic` son service locators invocados desde `onclick=""` en strings → acoplamiento temporal + incompatibilidad con CSP. |
| **Cohesión** | Baja en god-modules; alta y correcta en `ai-commander`. |
| **Dependencias circulares** | No detectadas (grafo de imports es árbol; `app.js` es la raíz). ✅ |
| **Flujo de ejecución** | `init()` (`app.js:177`) es lineal y razonable; el espagueti está en el render por strings, no en el control de flujo. |

**Refactor recomendado:** eliminar `onclick=""` inline → event delegation desde un solo listener raíz (habilita CSP `script-src 'self'`, elimina el namespace global).

---

## FASE 4 — Seguridad (OWASP + remediación)

| OWASP 2021 | Estado | Evidencia | Fix |
|---|---|---|---|
| A01 Broken Access Control | 🔴→✅ | C-1/C-2/C-3 | `multitenancy.sql` |
| A03 Injection (XSS) | 🔴→✅ | C-4 | aplicado en código |
| A04 Insecure Design | 🔴→✅ | "acceso compartido" | RLS por tenant |
| A09 Logging Failures | 🔴→✅ | C-5 audit alterable | audit inmutable |
| A02 Cripto | 🟡 | JWT en localStorage | mitigado al cerrar XSS |
| A05 Misconfig | 🟠 | sin CSP, sin rate-limit | backlog ALTO |
| A07 Auth | 🟠 | sin MFA/lockout | config Supabase |
| IDOR | 🟠 | `diagnostico-publico` acepta cualquier `lead_id` | backlog ALTO |

**SQLi:** bajo (PostgREST parametriza). **CSRF:** mitigado (bearer en header, no cookies). **SSRF:** no aplica (IA inerte y diseñada server-side, `ai-providers.js:7-15`).

### C-1 · Sin aislamiento multi-tenant (CRÍTICO) — *resuelto en `multitenancy.sql`*
`schema.sql:167-194`: ninguna columna de tenant; todas las políticas `using(true)`. Cualquier usuario veía datos de todas las empresas (incl. `profiles_read` → emails de todos). **Fix:** `org_id` en todas las tablas + `auth_org_id()` + políticas `org_id = auth_org_id()` + stamping por trigger (front intacto) + backfill no-destructivo.

### C-2 · Escalada de privilegios (CRÍTICO) — *resuelto*
`schema.sql:183`: `profiles_self ... using(id=auth.uid())` sin `with check` → `update profiles set role='admin'`. **Fix:** trigger `guard_profile_privesc()` que bloquea cambios de `role/org/activo` salvo admin.

### C-3 · RBAC cosmético (CRÍTICO) — *parcialmente resuelto*
Roles nunca verificados. **Fix:** `is_admin()` + `DELETE` de facturas solo admin. (Pendiente: matriz de permisos completa por rol — backlog ALTO.)

### C-4 · XSS almacenado → robo de sesión (CRÍTICO) — *APLICADO EN CÓDIGO*
`home.js:86-87`, `home.js:69`, `informes.js:217` interpolaban datos de lead sin escapar. Como leads pueden venir de la vía pública anónima (`leads_public_ins`), un `<img onerror>` en "empresa" ejecutaba JS en la sesión del consultor → token (localStorage) robado. **Fix aplicado:** `escHtml()` en los 3 sinks + helper `html\`\`` auto-escape en `utils.js`.

### C-5 · Audit log alterable (CRÍTICO) — *resuelto*
`schema.sql:194`: `actividad for all using(true)` → editable/borrable. **Fix:** triggers `audit_row()` (security definer) en tablas core + RLS solo-lectura por org (sin insert/update/delete para `authenticated`).

---

## FASE 5 — Base de Datos

- **Índices:** ausentes en el core (solo PK + `unique(codigo)`). `multitenancy.sql` crea los de tenant; faltan los de filtro/FK → **migración complementaria** (ver backlog ALTO):
  ```sql
  create index idx_leads_org_estado on leads(org_id, estado);
  create index idx_leads_responsable on leads(responsable);
  create index idx_diag_lead on diagnosticos(lead_id);
  create index idx_prop_lead on propuestas(lead_id);
  create index idx_prop_cliente on propuestas(cliente_id);
  create index idx_facturas_cliente on facturas(cliente_id);
  create index idx_citas_org_fecha on citas(org_id, fecha);
  create index idx_actividad_org_ts on actividad(org_id, ts desc);
  ```
- **Integridad referencial:** varias FKs sin `on delete` → `limpiarDatos` reordena borrados en el cliente (`app.js:381-387`). Recomendado `on delete cascade`/`set null` explícito.
- **Sin `created_by`/soft-delete** en tablas core (AI Commander sí los tiene) → falta accountability.
- **Contención:** `correlativos` es un contador global de una fila (`schema.sql:40-49`) — correcto para integridad, punto caliente de escritura a gran escala.
- **Diseño:** sano y normalizado para el dominio; `scores/hallazgos/oportunidades` como jsonb es adecuado.

---

## FASE 6 — API

- **No hay capa de API ni versionado:** el cliente llama PostgREST directo. No hay DTO ni envelope de respuesta; los errores se propagan crudos o se tragan (`catch(_){}`).
- **Lógica repetida:** el mapeo camelCase↔snake_case se repite por entidad (resuelto por el repo factory, FASE 2).
- **Recomendación:** para integraciones externas (WhatsApp/ERP, FASE 10) introducir **Supabase Edge Functions** como capa API versionada (`/v1/...`) con validación (zod) y envelope `{ data, error }` consistente. El patrón ya existe en `ai-providers.js` (seam server-side).

---

## FASE 7 — Rendimiento

| Problema | Evidencia | Fix |
|---|---|---|
| **Full-table fetch** | `getAll()` en todas las vistas (`db.js`) | `makeRepo.page()` con `range()` |
| **N+1 / O(n²)** | `informes.js:217` `.find()` dentro de `.map()`; `renderNav` hace `prospectos.getAll()` en cada navegación (`app.js:117`) | Indexar por id en un `Map`; contar con `head:true count` |
| **Bucles de a una fila** | `limpiarDatos`, `importLandingLeads` (`db.js:574-585`) | operaciones batch / RPC |
| **Sin caché** | cada render re-fetchea | caché en memoria + invalidación por mutación |

Ejemplo (contar "Nuevo" sin traer la tabla):
```js
const { count } = await supabase.from('leads')
  .select('id', { count: 'exact', head: true }).eq('estado', 'Nuevo');
```

---

## FASE 8 — Escalabilidad

| Escala | Comportamiento | Cuello de botella |
|---|---|---|
| 100 empresas | OK funcional (con C-1 resuelto, ya aislado) | — |
| 1.000 | Dashboards lentos | full fetch + O(n²) + falta de índices |
| 10.000 | **Browser OOM**, queries en segundos | sin paginación, agregación en cliente, contención en `correlativos` |

**Riesgos:** memoria (traer tablas enteras al navegador), concurrencia (contador global). **Soluciones:** paginación obligatoria, índices, mover agregaciones a vistas/RPC server-side, considerar `gen_random_uuid()` o secuencias por-tenant si `correlativos` se vuelve caliente.

---

## FASE 9 — Multitenancy — *resuelto en `multitenancy.sql`*

- **Aislamiento de datos:** `org_id` + RLS `org_id = auth_org_id()` en todas las tablas.
- **Seguridad entre tenants:** `profiles_read` restringido a la org; `auth_org_id()`/`is_admin()` como frontera.
- **Permisos por empresa:** stamping automático en INSERT; lectura/escritura acotada a la org.
- **Fuga de información:** cerrada (antes catastrófica). Migración **no-destructiva**: backfill a una org por defecto, el deployment actual sigue igual.
- **Pendiente (decisión de producto):** flujo de provisión de organizaciones (signup self-serve vs invitación). Hoy todo usuario nuevo entra a la org por defecto (single-tenant de continuidad); la maquinaria queda lista para activar multi-org sin tocar el front.

---

## FASE 10 — Mantenibilidad e Integraciones

| Objetivo | Estado | Estructura recomendada |
|---|---|---|
| Agregar features | 🟡 | Replicar Clean Arch de `ai-commander` en módulos nuevos |
| **Incorporar IA** | ✅ listo | Seam server-side ya diseñado (`ai-providers.js`); falta desplegar Edge Function `ai-complete` |
| **Integrar WhatsApp** | 🟠 | Hoy solo `wa.me` links (`app.js:258`). Para WhatsApp Business API → Edge Function + webhook + cola |
| Integrar CRM externo | 🟠 | Falta capa API/DTO; añadir Edge Functions `/v1` |
| Integrar ERP | 🟠 | Igual; eventos de `actividad` pueden alimentar un bus de integración |

**Mejora estructural transversal:** capa API (Edge Functions) + validación de esquema + observabilidad. Habilita todas las integraciones de forma segura y versionada.

---

## FASE 11 — Estándar Empresarial

| Dimensión | Nota | vs Salesforce/HubSpot/Zoho |
|---|---:|---|
| Arquitectura | 4/10 | Ellos: modular + multi-tenant nativo |
| Seguridad | 2/10 (→7 con remediación) | Ellos: OrgId + permission sets + field-level security + audit |
| Escalabilidad | 3/10 | Ellos: paginación/bulk/límites por diseño |
| Rendimiento | 4/10 | Ellos: agregación server-side, caché |
| Mantenibilidad | 5/10 | Ellos: tests/CI/migraciones/observabilidad |
| Calidad de código | 5/10 | Ellos: estándares + revisión + cobertura |

**Qué falta para acercarse:** (1) tenant + RBAC efectivo *(en curso)*, (2) audit inmutable *(en curso)*, (3) paginación + índices, (4) capa API + validación + manejo de errores no-silencioso + observabilidad (Sentry), (5) tests + CI + migraciones versionadas (Supabase CLI), (6) replicar Clean Arch de AI Commander.
**Ventaja propia:** nicho claro (Diagnóstico 360), UX cuidada, un módulo de referencia ya bien hecho.

---

## FASE 12 — Plan de Mejora (backlog por impacto)

### 🔴 CRÍTICO (bloquea la venta)
1. **C-1 Multitenancy** — correr `supabase/multitenancy.sql` *(entregado)*.
2. **C-2 Anti-privesc** — incluido en la migración *(entregado)*.
3. **C-4 XSS** — *aplicado en código*.
4. **C-5 Audit inmutable** — incluido en la migración *(entregado)*.
5. **C-3 RBAC mínimo** — delete de facturas solo admin *(entregado)*; matriz completa de permisos por rol *(pendiente)*.

### 🟠 ALTO (semanas 3–4)
6. Índices core + paginación (`makeRepo.page`).
7. Rate-limiting en insert anónimo + token firmado/expiry en `diagnostico-publico`.
8. Capa de validación server-side + manejo de errores no-silencioso + Sentry.
9. Supabase CLI + migraciones versionadas + CI (lint/`node --check`/tests en push).

### 🟡 MEDIO
10. Repository factory (DRY de `db.js`).
11. Descomponer god-modules (agenda/modals) con el patrón AI Commander.
12. Unificar config (quitar keys hardcodeadas de `supabase.js`).
13. Eliminar `onclick` inline → event delegation (habilita CSP).

### 🟢 BAJO
14. Eliminar dead code (`tools/informe.standalone.html`).
15. Generar enums/labels desde una sola fuente (JS↔SQL).
16. Evaluar `mascota` para el build empresarial.

---

## Anexo — Cambios aplicados en esta auditoría
- `js/utils.js` — helper `html\`\`` + `raw()` (anti-XSS sistémico).
- `modules/home/home.js` — `escHtml()` en sinks de nombre/empresa (líneas 69, 86-87).
- `modules/informes/informes.js` — import de `escHtml` + escape en bloque de facturas vencidas.
- `supabase/multitenancy.sql` — **NUEVO**. Migración crítica C-1/C-2/C-3/C-5. **Correr en Supabase → SQL Editor.**
