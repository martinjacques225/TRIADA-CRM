# Limpieza P0/P1 — Código muerto, duplicado e innecesario

> Fecha: **2026-06-14** · Rama: `main` · Alcance elegido por el usuario: **"Solo lo seguro"**
> Objetivo del pedido: implementar P0/P1, **sin features nuevas**, **sin cambiar el comportamiento**,
> priorizando rendimiento/simplicidad/mantenibilidad/escalabilidad y **eliminando código muerto/duplicado/innecesario**.
> Complementa [`AUDITORIA_RENDIMIENTO.md`](AUDITORIA_RENDIMIENTO.md) y [`AUDITORIA_EMPRESARIAL.md`](AUDITORIA_EMPRESARIAL.md).

---

## 0. Resumen

Casi todo el P0/P1 de rendimiento **seguro ya estaba aplicado y commiteado** en sesiones previas
(caché de lecturas F2, pipeline sin refetch F4, `renderNav` con count F1, `Map` en informes F9,
debounce, preconnect) y las migraciones SQL (multitenancy, índices) ya se corrieron. El P0/P1 que
**quedaba** choca con las restricciones del pedido (paginación cambia comportamiento, bundling exige
build, etc. — ver §4), por eso esta sesión ejecutó el subconjunto **100% seguro**: eliminar código
muerto/duplicado/innecesario, sin tocar el comportamiento del CRM.

**Resultado:** **−979 líneas netas** (−989 / +10) en 13 archivos. Cero cambios de comportamiento.
Verificado por `node --check`, resolución de imports cross-module y `grep` de referencias residuales.

---

## 1. Cambios aplicados

### 1.1 Código muerto eliminado — carpeta `tools/` (−955 líneas)
Eliminada por completo. Ningún archivo de la app, ni `package.json`, ni HTML la referencia
(verificado por `grep`); las únicas referencias estaban **dentro del propio generador**.

| Archivo | Líneas | Qué era |
|---|---:|---|
| `tools/informe.standalone.html` | 856 | **Artefacto generado** (snapshot horneado del Informe Ejecutivo a partir de datos de muestra). No lo carga la app. Marcado como dead weight en `AUDITORIA_EMPRESARIAL.md` (FASE 1 / backlog BAJO #14). |
| `tools/build-informe-html.mjs` | 69 | Generador CLI (`node tools/build-informe-html.mjs`) del HTML anterior. Importa el engine real, pero su default rompe sin el JSON de muestra. Redundante con la descarga de informe PDF que ya existe in-app. |
| `tools/informe-data.json` | 30 | Datos de muestra, solo útiles para el generador. |

> **Reversible:** todo queda en el historial de git si alguna vez se quiere regenerar un informe standalone.
> La capacidad equivalente (informe imprimible/PDF) ya vive en la app: `modules/informe-ejecutivo/` + "Descargar informe (PDF)".

### 1.2 Código duplicado eliminado
| Ubicación | Cambio | Por qué es seguro |
|---|---|---|
| `js/format.js` | Eliminada `formatCLP()` | **Definición duplicada.** Los **7 módulos** que usan `formatCLP` lo importan desde `js/utils.js` (verificado uno por uno); la copia de `format.js` no la importaba nadie y no se usaba internamente. Se conserva `parseCLP()` (sí usado). |

### 1.3 Funciones muertas eliminadas (sin ningún consumidor)
| Ubicación | Símbolo | Verificación |
|---|---|---|
| `js/utils.js` | `avatarHtml()` | Cero importadores en todo el repo. |
| `js/utils.js` | `initials()` | Su único consumidor era `avatarHtml()`; muere con él. |
| `js/format.js` | `formatPercent()` | Cero usos internos y externos. |
| `js/db.js` | `clearReadCache()` | Export sin consumidores. `signOut()` hace `window.location.reload()`, que ya limpia la caché en memoria → no se necesita. |

### 1.4 Campo muerto `historial` en `leads` (`js/db.js`)
La columna `historial` **no existe** en la tabla `leads` (confirmado en `HANDOFF.md` §5). Se eliminaron
sus dos extremos muertos:
- `leadFromSupa()`: `historial: row.historial || []` → producía siempre `[]` y **ningún código lee `.historial`** de un prospecto (verificado por `grep`).
- `importLandingLeads()`: pasaba `historial: l.historial || []` a `prospectos.add`, pero `leadToSupa()` lo descarta → era un no-op.

### 1.5 Imports innecesarios eliminados (10, en 7 módulos)
Cada símbolo aparecía **solo** en su línea de import, sin uso en el cuerpo del archivo (verificado uno por uno).
Quitar un import no puede afectar a otros archivos.

| Archivo | Import(s) eliminado(s) |
|---|---|
| `modules/clientes/clientes.js` | `prospectos`, `formatDate` |
| `modules/home/home.js` | `formatDate` |
| `modules/informes/informes.js` | `DIAG_AREAS`, `propEstadoLabel` |
| `modules/modals/modals.js` | `todayStr` |
| `modules/pipeline/pipeline.js` | `RUBROS` |
| `modules/presupuestos/presupuestos.js` | `propuestas`, `prospectos` |
| `modules/prospectos/prospectos.js` | `toast` |

---

## 2. Verificación (sin cambio de comportamiento)

- **`node --check`** en **todos** los `.js` → OK.
- **Resolución de imports cross-module** (script ad-hoc): cada `import { X }` nombrado resuelve a un
  `export` real en su módulo destino, en todo el codebase → OK. (Esto detecta justo el riesgo de haber
  roto una importación, que `node --check` no ve.)
- **`grep` de referencias residuales** a los símbolos eliminados → 0.
- **Re-chequeo de imports sin usar** → 0 restantes.

> No se ejecutó verificación en navegador: estos cambios son eliminación de código sin consumidores; el
> preview usa mocks y no ejercita el `db.js` real. La seguridad está garantizada estáticamente
> (sin importadores / sin lectores).

---

## 3. P0/P1 de rendimiento — estado (contexto)

| Ítem | Prioridad | Estado |
|---|---|---|
| Caché de lecturas en memoria (F2) | P0 | ✅ Aplicado (commit `d513f7c`) |
| `renderNav` con count server-side (F1) | P1 | ✅ Aplicado |
| Pipeline `render()` vs `_paint()` sin refetch (F4) | P1 | ✅ Aplicado |
| `Map` O(n²)→O(1) en informes (F9) | P2 | ✅ Aplicado |
| Debounce buscador (F8) · preconnect (F6) | P3 | ✅ Aplicado |
| RLS InitPlan `rls_perf.sql` (D1) | P1 | 📦 Entregado (correr en Supabase) |
| Índices core (`indices.sql`) | ALTO | ✅ Corrido |

---

## 4. P0/P1 excluido deliberadamente (choca con "mismo comportamiento / sin features / sin build")

Estos ítems del backlog **no** se implementaron porque violarían alguna restricción explícita del pedido.
Quedan documentados con lo que requerirían:

| Ítem | Prioridad | Por qué se excluyó | Qué requeriría |
|---|---|---|---|
| **Paginación** (`makeRepo.page`, B1) | P0 | **Cambia el comportamiento visible** (las listas dejan de mostrar todo). | Repository factory + cambios de front + verificar con login. |
| **Repository factory** (DRY de `db.js`) | MEDIO | Reescribe el archivo más propenso a bugs (historial de 22P02/42703) y **no es verificable sin sesión Supabase en vivo**. Es MEDIO, no P0/P1. | Hacerlo con preview + login real, no a ciegas. |
| **Rediseño contador `correlativos`** (D2) | P0 (concurrencia) | Cambio de esquema SQL con riesgo de integridad; solo pesa a ~10k orgs. | Secuencias por tipo / contador por org + correr SQL. |
| **RPC `dashboard_metrics()`** (B3) | P1 | Requiere correr SQL en Supabase (fuera del alcance "sin SQL" elegido). | Crear la función + cablear `informes` con fallback. |
| **Bundling / minificación** (F5) | P1 | Introduce paso de build; la propia auditoría lo desaconseja para este caso. | esbuild/Vite + cambio de deploy. |
| **Over-fetch `select('*')`** (F3) | P1 | Riesgo de regresión silenciosa (detalles reusan filas cacheadas) **sin poder probar en vivo**; ganancia nula a volumen actual. Sesión previa con login lo difirió. | Verificar consumidor por consumidor con login. |
| **Rate-limit insert anónimo / Edge Functions** | ALTO | Es infraestructura nueva (≈ feature nueva). | Edge Function + token firmado/expiry. |
| **Observabilidad (Sentry) / no-silenciar errores** | ALTO | Dependencia/feature nueva. | Integrar APM + revisar `catch(_){}`. |

---

## 5. Duplicaciones/code-smell NO tocados por riesgo (recomendación, no aplicado)

- **Doble fuente de config** (`js/supabase.js` hardcodea URL+key mientras existe `js/config.local.js`).
  La key es *publishable* (pública, embebida a propósito para GitHub Pages); tocarlo arriesga romper el
  deploy. **Dejar como está** salvo decisión explícita.
- **Doble fuente del nombre de usuario** (`config.userName` en localStorage vs `profiles.nombre`).
  Unificar hacia `profiles` **cambia qué nombre se muestra** → es cambio de comportamiento. Documentado en HANDOFF §4 (P1.5).
- **Polling 60 s sin `clearInterval`** (`reminders.js`, F7): es P2 (fuera del alcance P0/P1) y un fix
  tocaría el ciclo de vida del dock. Documentado como pendiente.

---

## 6. Archivos tocados

```
 js/db.js                             |  4 +-   (clearReadCache, historial ×2)
 js/format.js                         | 12 +-   (formatCLP dup, formatPercent)
 js/utils.js                          | 12 -    (avatarHtml, initials)
 modules/clientes/clientes.js         |  4 +-   (imports)
 modules/home/home.js                 |  2 +-   (import)
 modules/informes/informes.js         |  2 +-   (imports)
 modules/modals/modals.js             |  2 +-   (import)
 modules/pipeline/pipeline.js         |  2 +-   (import)
 modules/presupuestos/presupuestos.js |  2 +-   (imports)
 modules/prospectos/prospectos.js     |  2 +-   (import)
 tools/build-informe-html.mjs         | 69 ---  (carpeta eliminada)
 tools/informe-data.json              | 30 ---
 tools/informe.standalone.html        | 856 --- 
 13 files changed, 10 insertions(+), 989 deletions(-)
```
