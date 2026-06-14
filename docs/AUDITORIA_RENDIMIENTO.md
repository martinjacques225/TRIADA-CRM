# Auditoría de Rendimiento, Optimización y Escalabilidad — TRIADA CRM

> Panel: Staff/Principal SWE · SaaS Architect · Senior Backend · DBA · FAANG Code Reviewer
> Fecha: **2026-06-14** · Rama: `main` · ~8.000 LOC JS · 16 módulos · 7 esquemas SQL
> Alcance: **rendimiento puro** (la auditoría de arquitectura/seguridad está en `AUDITORIA_EMPRESARIAL.md`; aquí no se repite, se complementa).
> Estado de remediación: **4 fixes seguros aplicados en código + `supabase/rls_perf.sql` entregado** (resto = backlog priorizado con código listo).

---

## 0. Resumen ejecutivo

El CRM es un MVP funcional, pero su modelo de datos en el cliente es **"traer todo, calcular todo en el navegador, en cada interacción"**. No hay caché, no hay paginación, y casi toda lectura es `select('*')` de la tabla completa. Hoy, con un equipo y pocos registros, **se siente rápido**; el problema es estructural y aparece cuando una organización acumula datos o cuando crece el número de organizaciones concurrentes.

**Importante (matiz de multitenancy):** desde `multitenancy.sql`, **toda query queda filtrada por `org_id` vía RLS**. Por eso un `getAll()` NO trae datos de todos los tenants — trae los de *una* org. Eso reubica los cuellos de botella:
- **Por-organización:** `getAll()` + agregación en cliente → lento/OOM cuando *una* org tiene miles de registros.
- **Cross-tenant (toda la plataforma):** el contador global `correlativos`, el polling cada 60 s × pestañas abiertas, y la CPU/conexiones de Postgres compartidas.

**Lo aplicado en esta sesión (seguro, sin cambio de funcionalidad):**
1. `renderNav` ya no trae toda la tabla `leads` en cada navegación → `count head` server-side (`db.js` `prospectos.countByEstado`).
2. `informes.js` cruzaba factura→cliente con `.find()` dentro de `.map()` (O(n²)) → `Map` O(1), en la tabla y en el PDF.
3. `index.html` precarga DNS+TLS de Supabase y jsDelivr (`preconnect`/`dns-prefetch`) → cold-load más corto.
4. Buscador del pipeline con debounce (140 ms) → no reconstruye el DOM por cada tecla.
5. **Entregado:** `supabase/rls_perf.sql` — envuelve las funciones de RLS en `(select …)` para que se evalúen **una vez por consulta** (InitPlan) y no por fila.

---

## 1. Frontend Performance

| # | Problema | Evidencia | Sev | Estado |
|---|---|---|---|---|
| F1 | `renderNav()` traía **toda** la tabla `leads` (todas las columnas/filas) en **cada navegación** solo para contar el badge "Nuevo" | `app.js:117` | P1 | ✅ Aplicado (`countByEstado`) |
| F2 | **Sin caché**: cada cambio de vista re-fetchea todas las tablas. En el arranque, `leads` se trae 3–4 veces (import + nav + home + reminders) | `app.js:398-407`, `home.js:9`, `reminders.js:89` | **P0** | ✅ Aplicado (`db.js` caché TTL 15 s + invalidación por mutación) |
| F3 | **Over-fetch** `select('*')`: las listas traen blobs jsonb (`scores/hallazgos/oportunidades/servicios`) que no muestran | `db.js` (todos los `getAll`) | P1 | ⏸ Propuesto |
| F4 | **Re-render total** por interacción: clic en stat / toggle vista / drop DnD ⇒ `render()` que **re-fetchea por red** | `pipeline.js:69,73,112` | P1 | ✅ Aplicado (`render()`/`_paint()`; filtro y toggle repintan de memoria) |
| F5 | **Sin bundling/minificación/code-splitting**: ~40 archivos JS (ESM) + 11 CSS, todos como requests separados y render-blocking | `index.html:14-24`, `app.js:26-54` | P1 | ⏸ Propuesto |
| F6 | Cliente Supabase desde CDN `@2` (sin pin), import render-blocking del grafo de módulos | `supabase.js:1` | P2 | 🟡 Parcial (preconnect) |
| F7 | `setInterval(refresh, 60000)` **nunca se limpia** y cada minuto hace `citas.getAll()` + `prospectos.getAll()` (tablas completas), para siempre | `reminders.js:75,89` | P2 | ⏸ Propuesto |
| F8 | Buscador sin debounce: rebuild de `innerHTML` por cada tecla | `pipeline.js:67` | P3 | ✅ Aplicado |
| F9 | O(n²) factura→cliente con `.find()` dentro de `.map()` | `informes.js:174,217` | P2 | ✅ Aplicado |
| F10 | `document.documentElement.style.zoom` fuerza reflow global al cambiar fuente | `app.js:413` | P3 | ⏸ Menor |

### F2 — Caché en memoria (el cambio de mayor impacto percibido)
**Impacto:** navegar Home→Pipeline→Home hoy son **6+ round-trips de red** repetidos. Con caché, 0 (hasta una mutación).

**Código actual (sin caché, `db.js`):**
```js
getAll: async () => {
  const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
  _throw(error); return data.map(leadFromSupa);
},
```
**Propuesto (caché TTL + dedupe de requests en vuelo + invalidación por mutación):**
```js
const _cache = new Map();            // table -> { t, rows, inflight }
const TTL = 15000;                   // 15 s; ajustable
function _invalidate(table) { _cache.delete(table); }
async function _cachedAll(table, mapFn, order, asc) {
  const hit = _cache.get(table);
  const now = Date.now();
  if (hit && (now - hit.t) < TTL) return hit.rows;
  if (hit?.inflight) return hit.inflight;            // coalesce concurrentes
  const p = supabase.from(table).select('*').order(order, { ascending: asc })
    .then(({ data, error }) => { _throw(error); const rows = data.map(mapFn);
      _cache.set(table, { t: Date.now(), rows }); return rows; });
  _cache.set(table, { ...(hit||{}), inflight: p });
  return p;
}
// en cada add/update/delete de esa tabla: _invalidate('leads');
```
**Ganancia estimada:** −70 a −90 % de requests en navegación normal; arranque de ~9 fetches a ~4. **Decisión pendiente:** TTL y consistencia multi-pestaña (por eso no se aplicó solo).

### F4 — No re-fetchear en cada re-render del pipeline
`pipeline.js` ya guarda `_all` en memoria, pero `render()` (llamado en clic de stat, toggle y tras un drop) vuelve a pegarle a la red. **Fix:** separar `render()` (trae datos) de `repaint()` (usa `_all`); tras un drop, actualizar `_all` localmente y `repaint()` en vez de `render()`.

### F5 — Bundling
Hoy: 1ª carga = ~40 `.js` + 11 `.css` + cliente Supabase de CDN, sin minificar. **Fix:** introducir un build mínimo (esbuild/Vite) que produzca 1–2 bundles hasheados (`app.[hash].js`), con CSS combinado y minificado. GitHub Pages sirve estático; el hash habilita `Cache-Control: immutable` y elimina el "hard-refresh Ctrl+Shift+R" documentado en el HANDOFF. **Ganancia:** −60/−80 % requests de 1ª carga, JS ~−40 % por minificación, y caché agresiva en recargas.

---

## 2. Backend Performance (capa de datos `js/db.js`)

| # | Problema | Evidencia | Sev |
|---|---|---|---|
| B1 | **Sin paginación**: todo `getAll()` trae la tabla entera. No hay `.range()`/`.limit()` en el sistema | `db.js` (×9 entidades) | **P0** |
| B2 | **N+1 en detalles**: abrir ficha de prospecto carga varias tablas completas + `byProspecto` ×3 | `modals.js` (7 `getAll`, 10 `find/map`) | P1 |
| B3 | **Agregación en el cliente**: `informes._compute()` baja **6 tablas completas** y calcula KPIs/sumas en JS | `informes.js:16-19` | P1 |
| B4 | **Bucles fila-a-fila**: `limpiarDatos` borra 1×1; `importLandingLeads` inserta 1×1 | `app.js:381-387`, `db.js:574-585` | P2 |
| B5 | **Errores silenciados**: `catch(_){}` oculta fallos → sin observabilidad ni métricas | `app.js:185`, etc. | P2 |

### B1/B3 — Paginación + agregación server-side
El **repository factory** ya propuesto en `AUDITORIA_EMPRESARIAL.md` (FASE 2) resuelve B1 de un golpe añadiendo `page({limit,offset,filters})` con `range()` a las 9 entidades.

Para B3, mover los conteos/sumas a una **vista o RPC** en Postgres (se calcula en la DB, indexada, y viaja un solo objeto pequeño):
```sql
create or replace function dashboard_metrics() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'leads_total',  (select count(*) from leads),
    'leads_nuevos', (select count(*) from leads where estado = 'Nuevo'),
    'fact_pagado',  (select coalesce(sum(monto),0) from facturas where estado='pagado'),
    'fact_vencido', (select coalesce(sum(monto),0) from facturas
                       where estado in ('pendiente','parcial') and vencimiento < current_date)
  ); $$;  -- RLS sigue aplicando dentro de la org
```
`informes` pasaría de bajar 6 tablas a **1 llamada** con el agregado. **Ganancia:** de O(filas de la org) transferidas a O(1).

---

## 3. Base de Datos

| # | Hallazgo | Evidencia | Sev |
|---|---|---|---|
| D1 | RLS evalúa `auth_org_id()`/`is_admin()`/`auth.uid()` potencialmente **por fila** | `multitenancy.sql:122,136-139,149-157` | P1 → ✅ `rls_perf.sql` |
| D2 | `correlativos` = **contador global de 1 fila**: cada INSERT (de cualquier tenant) hace `update … returning` → **serializa todas las inserciones de la plataforma** bajo concurrencia | `schema.sql:40-49` | **P0 (concurrencia)** |
| D3 | `indices.sql` es **completo y correcto**, pero el HANDOFF lo marca "corrido" sin verificar | `indices.sql` | Verificar |
| D4 | FKs sin `on delete` explícito → borrado reordenado en cliente (`limpiarDatos`) | `schema.sql:93,119,151` | P2 |
| D5 | `leads.email` sin índice (lo usa el dedupe de `importLandingLeads`) | `db.js:571` | P3 |

### D1 — `rls_perf.sql` (entregado, idempotente)
Mismas reglas de acceso, pero `using (org_id = (select auth_org_id()))`. Postgres lo evalúa como **InitPlan una vez por consulta**. En tablas grandes esto reduce notoriamente el costo de cada SELECT. **Verificar con** `explain analyze` (debe mostrar InitPlan + Index Scan, no Seq Scan ni re-evaluación por fila).

### D2 — Contención del contador de correlativos
Bajo alta concurrencia, `next_correlativo()` toma un lock de fila sobre `correlativos` y **serializa inserts a nivel plataforma**. Opciones:
- **A (mínima):** una fila de contador **por org+tipo** (reduce la contención al ámbito de cada org).
- **B (recomendada a escala):** `sequence` nativa por tipo (sin lock de fila) y formatear el display aparte; o aceptar `gen_random_uuid()` como id visible y reservar el correlativo "bonito" para documentos emitidos (factura/propuesta), generándolo en ese momento puntual.

### D3 — Verificación de índices (correr logueado en SQL Editor)
```sql
select tablename, indexname from pg_indexes
where schemaname='public' order by tablename, indexname;
```
Debe listar `idx_leads_org_created`, `idx_facturas_cliente`, etc. Si faltan, correr `supabase/indices.sql`.

---

## 4. Arquitectura (impacto en rendimiento/mantenibilidad)

- **God-modules** (`agenda.js` 470 · `modals.js` 404 · `presupuestos.js` 296) mezclan fetch + lógica + render por strings + wiring de eventos → difícil de optimizar puntualmente. Replicar la Clean Architecture de `ai-commander/`.
- **`db.js` boilerplate ×9** → repository factory (colapsa ~400→~80 líneas **y añade paginación**). Ver FASE 2 de `AUDITORIA_EMPRESARIAL.md`.
- **Render por `innerHTML` completo** sin diffing: pierde foco/scroll y es GC-pesado en listas grandes. A escala, virtualizar (renderizar solo lo visible) o paginar.
- **Dead weight:** `tools/informe.standalone.html` (52 KB) no lo carga la app (no afecta runtime), pero infla el repo y duplica el engine del informe.

---

## 5. Caching — qué, dónde, cuánto, beneficio

| Capa | Qué cachear | Dónde | TTL | Beneficio |
|---|---|---|---|---|
| **Lectura en memoria** | `getAll` de cada tabla + dedupe en vuelo | `db.js` (Map) | 10–15 s, invalidar en mutación | −70/−90 % requests de navegación |
| **Datos casi-estáticos** | `profiles` (equipo), catálogos | `db.js` | 5–10 min | Quita fetch de equipo por render |
| **Browser/HTTP** | JS/CSS hasheados | build + GitHub Pages | `immutable` (1 año) | Recargas instantáneas; elimina hard-refresh |
| **Agregados** | KPIs de Informes | RPC `dashboard_metrics()` | server-side | 6 tablas → 1 objeto |
| **Session** | sesión/JWT | ya en localStorage (Supabase) | — | OK |
| **Redis** | **No** a esta escala | — | — | Sobre-ingeniería; reconsiderar solo con Edge Functions de alto tráfico |

---

## 6. Seguridad ∩ Rendimiento

- **Sin rate-limiting en el insert anónimo** (`leads_public_ins` / `diagnostico-publico.html`): vector de abuso/DDoS y de inflado de la tabla. Mitigar con Edge Function + token firmado/expiry + límite por IP (ya en backlog ALTO del audit previo).
- **IDOR en `diagnostico-publico`**: acepta cualquier `lead_id` → inserciones no acotadas en `autodiagnosticos`.
- **Sin CSP**: ortogonal a perf, pero el patrón `onclick` inline + `window._app` lo bloquea; migrar a event delegation lo habilita y reduce el HTML generado.
- **`audit_row()` por trigger**: correcto para integridad, pero **duplica las escrituras** (cada INSERT/UPDATE/DELETE core escribe también en `actividad`). A gran volumen, monitorear y considerar particionar/retención de `actividad`.

---

## 7. Escalabilidad (simulación)

| Escala | Qué se rompe primero | Qué se vuelve lento | Corregir ahora |
|---|---|---|---|
| **100 orgs** | Nada funcional (aislado por RLS) | Imperceptible | F1 (✅), índices (D3), `rls_perf` (✅) |
| **1.000 orgs** | Polling 60 s × pestañas presiona Postgres | Dashboards de orgs grandes (agregación en cliente) | Caché (F2), agregación server-side (B3), paginación (B1) |
| **10.000 orgs** | **`correlativos`** serializa inserts globalmente | `getAll` sin paginación → OOM/jank en orgs grandes; conexiones/CPU de Postgres | D2 (contador), B1 (paginación), bundling (F5), Realtime en vez de polling (F7) |

**Regla:** la RLS te salva del desastre cross-tenant, pero **dentro de una org** el patrón "traer todo" no escala. Lo primero que se siente lento es **Informes** (6 tablas completas) y el **Pipeline** de una org con muchos leads.

---

## 8. Tabla de prioridades

| Prioridad | Problema | Impacto | Dificultad | Ganancia |
|---|---|---|---|---|
| **P0** | Sin caché de lecturas (F2) | Latencia percibida en toda navegación | Media | ⭐⭐⭐⭐⭐ |
| **P0** | Sin paginación (B1) | OOM/jank en orgs grandes | Media | ⭐⭐⭐⭐⭐ |
| **P0** | Contención `correlativos` (D2) | Serializa inserts a escala | Media | ⭐⭐⭐⭐ |
| **P1** | `renderNav` full-fetch (F1) | Fetch extra por navegación | Baja | ✅ Hecho |
| **P1** | RLS sin subselect (D1) | Costo por fila en cada SELECT | Baja | ✅ `rls_perf.sql` |
| **P1** | Over-fetch `select('*')` (F3) | Ancho de banda + parsing | Baja | ⭐⭐⭐ |
| **P1** | Agregación en cliente (B3) | Informes lentos a escala | Media | ⭐⭐⭐⭐ |
| **P1** | Sin bundling (F5) | Cold-load lento, hard-refresh | Media | ⭐⭐⭐⭐ |
| **P1** | Re-render+refetch pipeline (F4) | Red extra por interacción | Baja | ⭐⭐⭐ |
| **P2** | Polling 60 s sin límite (F7) | Carga DB recurrente | Media | ⭐⭐⭐ |
| **P2** | N+1 en modales (B2) | Latencia al abrir fichas | Media | ⭐⭐⭐ |
| **P2** | O(n²) informes (F9) | CPU en cartera grande | Baja | ✅ Hecho |
| **P2** | Errores silenciados (B5) | Sin observabilidad | Baja | ⭐⭐ |
| **P3** | Buscador sin debounce (F8) | Jank al teclear | Baja | ✅ Hecho |
| **P3** | preconnect/CDN (F6) | Handshake en cold-load | Baja | ✅ Hecho (parcial) |

---

## 9. Implementación

**Aplicado (seguro, sin cambio funcional, `node --check` OK):**
- `js/db.js` — `prospectos.countByEstado()` (count head).
- `app.js` — `renderNav` usa el count en vez de `getAll().filter`.
- `modules/informes/informes.js` — `Map` `cliById` (O(n²)→O(1)) en tabla y PDF.
- `index.html` — `preconnect`/`dns-prefetch` (Supabase + jsDelivr).
- `modules/pipeline/pipeline.js` — debounce 140 ms del buscador.
- `supabase/rls_perf.sql` — **NUEVO**, idempotente. Correr en Supabase → SQL Editor.

**Aplicado tras aprobación (alcance elegido por el usuario):**
- `js/db.js` — **caché de lecturas** `_cachedAll` (TTL 15 s + dedupe) en los 9 `getAll` + `_invalidate(table)` en las 21 mutaciones (F2). Caveat de referencia compartida verificado (ningún módulo muta arrays cacheados en sitio).
- `modules/pipeline/pipeline.js` — `render()` (trae datos) vs `_paint()` (repinta de `_all` sin red); filtro por etapa y toggle kanban/lista repintan de memoria; el drop de DnD sigue refrescando (F4).

**Requiere aprobación (no hecho — fuera del alcance elegido):** paginación vía repository factory (B1), RPC de agregados (B3), bundling con esbuild/Vite (F5), Realtime en vez de polling (F7), rediseño del contador (D2).

---

## 10. Puntuación

| Dimensión | Actual | Tras fixes seguros | Tras backlog P0/P1 completo |
|---|---:|---:|---:|
| Rendimiento | 4/10 | **5/10** | 8/10 |
| Escalabilidad | 3/10 | **4/10** | 7/10 |
| Calidad arquitectónica | 4/10 | 4/10 | 7/10 |
| Mantenibilidad | 5/10 | 5/10 | 7/10 |

**Qué falta para nivel Salesforce/HubSpot/Zoho:**
1. **Paginación + agregación server-side** por diseño (ellos nunca traen tablas completas al cliente).
2. **Caché en capas** (cliente + CDN + materialized views) e invalidación por evento.
3. **Build/CD**: bundling hasheado, code-splitting por ruta, `immutable` caching, lazy-load de módulos pesados.
4. **Realtime** (suscripciones) en vez de polling para alertas.
5. **Observabilidad**: APM (Sentry/p95 de queries), no `catch(_){}`.
6. **Concurrencia**: identificadores sin contención global (secuencias/uuid).
7. **Tests de carga + CI** que fallen ante regresiones de p95.

**No complaciente:** hoy se siente rápido por **volumen bajo**, no por diseño. Los P0 (caché, paginación, contador) son los que separan "demo que anda" de "producto que aguanta cientos de clientes". Ninguno es una reescritura; son cambios acotados con código ya esbozado arriba.
