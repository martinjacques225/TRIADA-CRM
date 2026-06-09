# TRIADA CRM MASTER ROADMAP

> **Fuente oficial de desarrollo.** Toda mejora se registra aquí. No se implementa dos veces lo mismo.
> **Código canónico:** `Documents/GitHub/TRIADA-CRM` → `github.com/martinjacques225/TRIADA-CRM` (rama `main`).
> **Sitio en vivo:** https://martinjacques225.github.io/TRIADA-CRM/
> Este documento **reemplaza** al previo `00-PLANEACION/Auditoria_y_Propuestas_CRM.md` (queda como histórico).
>
> **Cómo usarlo:** antes de tocar una fase → leer "Mapa de dependencias" y "analizar impacto". Después de cada tarea → marcar el checkbox y añadir entrada en REGISTRO DE CAMBIOS.

---

## ESTADO GENERAL DEL PROYECTO

| Métrica | Valor |
|---|---|
| **% completado** | ~15 % |
| **Tareas totales** | 148 |
| **Completadas** | 22 |
| **En progreso** | 1 |
| **Pendientes** | 125 |
| **Última actualización** | 2026-06-09 |

**Leyenda:** `[ ]` Pendiente · `[-]` En progreso · `[x]` Completado

| Fase | Título | Estado | Avance |
|---|---|---|---|
| 0 | Auditoría del sistema actual | ✅ Completada | 9/9 |
| 1 | Reestructuración UX/UI | 🔄 En progreso | 6/10 |
| 2 | Estandarización de datos | ✅ Completada | 7/7 |
| 3 | Sistema de identificadores | ⏳ Pendiente | 0/6 |
| 4 | Módulo de Leads | ⏳ Pendiente | 0/19 |
| 5 | Pipeline unificado | ⏳ Pendiente | 0/4 |
| 6 | Agenda profesional | ⏳ Pendiente | 0/15 |
| 7 | Diagnóstico empresarial | ⏳ Pendiente | 0/24 |
| 8 | Presupuesto inteligente | ⏳ Pendiente | 0/23 |
| 9 | Búsqueda por RUT | ⏳ Pendiente | 0/9 |
| 10 | Facturación | ⏳ Pendiente | 0/9 |
| 11 | IA y automatización | ⏳ Pendiente | 0/6 |
| 12 | Seguridad | ⏳ Pendiente | 0/4 |
| 13 | Rendimiento | ⏳ Pendiente | 0/3 |

---

# FASE 0 — AUDITORÍA DEL SISTEMA ACTUAL

[x] Arquitectura
[x] Estructura carpetas
[x] Componentes
[x] Navegación
[x] Estado global
[x] Dependencias
[x] Seguridad
[x] Escalabilidad
[x] Rendimiento

**Datos duros:** 31 archivos · ~2.435 líneas JS · ~735 CSS · **0 dependencias runtime** · sin build · sin tests · sin CI.

### Informe de auditoría

**1. Arquitectura** — *Severidad: media*
SPA en Vanilla JS (ES Modules), sin framework ni build. `app.js` = orquestador (router por mapa de vistas + API global `window._app` + init). `js/db.js` = capa de datos (patrón repositorio sobre IndexedDB `TriadaDiagnosticoDB`). `js/state.js` = estado UI efímero. `js/utils.js` = helpers + constantes de dominio. `modules/<feature>/` con contrato `render()`.
- ✅ Simple, cero deps, **capa de datos aislada** (clave para migrar a Supabase tocando casi solo `db.js`).
- ⚠️ No existe **capa de servicios/dominio**: la lógica de negocio vive mezclada en los módulos de UI. `window._app` es un *god-object* y los `onclick` inline acoplan el HTML a funciones globales (difícil de testear y de gobernar permisos).

**2. Estructura de carpetas** — *Severidad: baja*
`/js` (núcleo), `/modules` (features + CSS co-localizado), `/tools` (build del informe standalone), raíz (app.js, index.html, styles.css, manifest, icon).
- ⚠️ Faltaba `/docs` (creado ahora). No hay `/services`, `/assets`, ni `/lib`. Recomendado al crecer: `/services` (dominio), `/lib` (supabase client, validadores), `/assets`.

**3. Componentes** — *Severidad: media*
No hay componentes reutilizables: cada módulo arma HTML con template literals + `innerHTML`. Único modal global reutilizado. Sin design-tokens más allá de variables CSS.
- ⚠️ Duplicación de markup (botones, cards, badges repetidos en cada módulo). Recomendado: helpers de render compartidos (`Button()`, `Card()`, `Badge()`, `Field()`).

**4. Navegación** — *Severidad: baja-media*
`NAV_ITEMS` + `navigate(view)` → `refreshCenter()` mapea a `render()`. Sidebar fijo con secciones.
- ⚠️ **No hay rutas URL** (no deep-linking, no botón atrás del navegador, no compartir un enlace a una ficha). Recomendado al madurar: hash-router (`#/pipeline`, `#/cliente/123`).

**5. Estado global** — *Severidad: media*
`S` (objeto mutable) para UI; `config` (IndexedDB) para perfil/tema. Re-render manual vía `window._app.refreshView()`.
- ⚠️ Sin store reactivo ni concepto de **usuario/sesión actual**. Riesgo de inconsistencias entre vistas. Es la base que falta para multiusuario y para "área activa".

**6. Dependencias** — *Severidad: baja (oportunidad)*
**Cero dependencias** de runtime. Dev: `npx serve`. Sin `package-lock`, sin bundler, sin linter, sin tests, sin CI.
- ✅ Superficie de ataque mínima, carga rápida.
- ⚠️ Sin red de seguridad de calidad. Recomendado: agregar al menos validadores propios + (a futuro) `@supabase/supabase-js`.

**7. Seguridad** — *Severidad: 🔴 ALTA*
- 🔴 **Sin autenticación.** App pública en GitHub Pages; cualquiera con el link la abre.
- 🟠 Datos en **IndexedDB local**: cada visitante tiene su propia base (hoy no hay fuga porque no hay datos centralizados, pero **tampoco hay protección ni datos compartidos**).
- 🟠 Sin **roles ni permisos**.
- 🟡 **XSS:** existe `escHtml()` pero se aplica de forma **inconsistente** — varios valores se interpolan crudos en atributos `onclick`/`style` y en algunos textos. Hay que auditar y escapar de forma sistemática.
- ✅ Secretos: `.gitignore` ya cubre `.env`. Nota para Supabase: la *anon key* es pública por diseño (se protege con RLS); la *service key* **jamás** va al cliente ni al repo.

**8. Escalabilidad** — *Severidad: 🔴 ALTA*
- 🔴 **IndexedDB no escala** a equipo ni multidispositivo: sin sync, sin backend, sin API. IDs autoincrementales **locales** → colisionan entre dispositivos (bloquea correlativos únicos de Fase 3).
- ✅ La arquitectura de módulos por feature sí escala en cantidad de pantallas.
- **Desbloqueo:** Supabase (Postgres + Auth + RLS) + IDs server-side. Es el cuello de botella estructural del proyecto.

**9. Rendimiento** — *Severidad: baja-media*
- Bueno en datasets pequeños. Patrón `getAll()` + filtrar en memoria + `innerHTML` completo en cada render (ya mitigado parcialmente en Pipeline con render parcial).
- ⚠️ Todos los módulos se importan en `app.js` al inicio (sin lazy-loading). Hoy el bundle es chico; crecerá. Para volumen: consultas server-side paginadas, render incremental, code-splitting.

### Veredicto del CTO
El producto tiene una **base de UI sólida y una capa de datos bien aislada**, pero está **bloqueado estructuralmente por la ausencia de backend/identidad**: sin Supabase no hay multiusuario, ni funnel real (el formulario de la landing no llega al CRM publicado), ni correlativos únicos, ni roles, ni facturación compartida. **Recomendación:** establecer el *backbone* (Auth + datos + IDs en Supabase) temprano para no rehacer las Fases 4, 5, 10 y 12.

### Mapa de dependencias entre fases
- **Independientes (se pueden hacer ya, sin backend):** Fase 1 (UX), Fase 2 (estandarización datos), parte de Fase 6 (botones rápidos llamar/WhatsApp/correo).
- **Dependen de Supabase (backend/auth):** Fase 3 (IDs únicos multidispositivo), Fase 4 (leads multiusuario), Fase 5 (pipeline sync + auditoría), Fase 10 (facturación), Fase 12 (seguridad/roles), y el arreglo del **funnel landing→CRM**.
- **Dependen de decisión de IA/infra:** Fase 7 (rediseño diagnóstico), Fase 11 (IA real con LLM → requiere backend/clave; hoy el "motor IA" es de reglas sin LLM).
- **Investigación:** Fase 9 (SII no ofrece API pública oficial de razón social por RUT; existen proveedores privados → documentar).

### Secuencia recomendada (respeta tu numeración, ordena por dependencia)
1. **Fase 1 (UX)** + **Fase 2 (datos)** en paralelo — bajo riesgo, alto impacto visible, sin backend.
2. **Backbone Supabase** (núcleo de Fase 12 + Fase 3 + persistencia) — destraba el funnel y el multiusuario.
3. **Fase 4 → 5 → 6** (leads, pipeline unificado, agenda) sobre el backbone.
4. **Fase 7 → 8 → 11** (diagnóstico, presupuesto, IA).
5. **Fase 10 (facturación)**, **Fase 9 (RUT)**, **Fase 13 (rendimiento)**.

> ⛔ **Regla cumplida:** no se implementa nada hasta cerrar esta auditoría. Fase 0 ✅. Las siguientes fases requieren tu visto bueno + análisis de impacto.

---

# FASE 1 — REESTRUCTURACIÓN UX/UI

**Objetivo:** estándar comparable a HubSpot · Pipedrive · Monday · Salesforce.
**Principios:** menos ruido visual · mayor jerarquía · mejor legibilidad · mejor flujo · menos clics.

[-] Navegación — indicador de activo, badges y footer clickeable (falta routing por URL)
[x] Sidebar — botón global "+ Nuevo", indicador de activo, badge de leads, footer → Configuración
[x] Dashboard — saludo personalizado, KPIs con chips de ícono, embudo con color por etapa
[x] Formularios — secciones, hints, asterisco de requerido, selects con chevron (global)
[x] Propuestas — KPIs con chips de ícono + selección de servicios en tarjetas (estado activo)
[x] Diagnósticos — polish de tarjetas y botones Sí/No (rediseño de flujo en Fase 7)
[ ] Agenda
[x] Leads — Pipeline/Kanban: estadísticas clickeables (filtro), contadores por color, filtro con chevron
[ ] Responsive
[ ] Accesibilidad

---

# FASE 2 — ESTANDARIZACIÓN DE DATOS

[x] Campos de texto en MAYÚSCULAS automáticamente — `data-fmt="upper"` (nombre, empresa)
[x] Validación RUT chileno (módulo 11) — `validateRut`/`formatRut`; campo RUT en prospecto
[x] Formato de teléfonos (+56 9 ...) — `formatPhoneCL`
[x] Validación de correos — `validateEmail`
[x] Formato moneda CLP — `formatCLP`/`parseCLP`; valor de propuesta con miles en vivo
[x] Formato de porcentajes — `formatPercent` (lib)
[x] Formato de fechas — `formatDate` (utils, ya existente)

> Implementado en `js/format.js` (lib reutilizable) + cableado por `data-fmt`. Disponible para reusar en Fase 4 (leads) y Fase 8 (presupuesto).

---

# FASE 3 — SISTEMA DE IDENTIFICADORES

> Correlativos únicos, nunca repetidos. **Requiere generación server-side (Supabase) para garantizar unicidad entre dispositivos.**

[ ] CLIENTE → `CLI-000001`
[ ] LEAD → `LEAD-000001`
[ ] DIAGNÓSTICO → `DIA-000001`
[ ] PROPUESTA → `PROP-000001`
[ ] FACTURA → `FAC-000001`
[ ] PROYECTO → `PROJ-000001`

---

# FASE 4 — MÓDULO DE LEADS

**Objetivo:** sistema profesional de captación. *(Depende de Supabase para multiusuario.)*

**Orígenes:**
[ ] Leads manuales
[ ] Leads landing
[ ] Leads Meta Ads
[ ] Leads Google Ads
[ ] Leads WhatsApp
[ ] Leads referidos

**Campos:**
[ ] Giro
[ ] Tamaño empresa
[ ] Región
[ ] Facturación estimada
[ ] Responsable
[ ] Estado

**Scoring:**
[ ] Caliente
[ ] Tibio
[ ] Frío

**Filtros:**
[ ] Origen
[ ] Industria
[ ] Ejecutivo
[ ] Estado

---

# FASE 5 — PIPELINE UNIFICADO

**Flujo:** Lead → Contacto → Diagnóstico → Propuesta → Negociación → Venta → Proyecto → Facturación.

[ ] Sincronización automática entre módulos
[ ] Cambio de estados
[ ] Historial
[ ] Auditoría

---

# FASE 6 — AGENDA PROFESIONAL

**Tipos de cita:**
[ ] Reunión inicial
[ ] Levantamiento
[ ] Diagnóstico
[ ] Presentación
[ ] Negociación
[ ] Seguimiento
[ ] Cierre

**Botones rápidos:**
[ ] Llamar
[ ] WhatsApp
[ ] Correo

**Deben aparecer en:**
[ ] Leads
[ ] Clientes
[ ] Diagnósticos
[ ] Agenda
[ ] Propuestas

---

# FASE 7 — DIAGNÓSTICO EMPRESARIAL (rediseño completo)

**Etapa 1 — Recopilación general**
[ ] Recopilación general
[ ] Opción: Sí
[ ] Opción: No
[ ] Opción: Parcialmente
[ ] Opción: No se sabe
IA genera:
[ ] Hallazgos
[ ] Riesgos
[ ] Oportunidades

**Etapa 2 — Diagnóstico especializado** (cada área recibe hallazgos previos + preguntas sugeridas + riesgos)
[ ] Comercial
[ ] Finanzas
[ ] Desarrollo
[ ] RRHH
[ ] Operaciones
[ ] Hallazgos previos por área
[ ] Preguntas sugeridas por área
[ ] Riesgos detectados por área

**Etapa 3 — Consolidación**
[ ] Consolidación automática
[ ] Generar Diagnóstico 360

**Etapa 4 — Revisión interna**
[ ] Flujo de revisión
[ ] Estado: Borrador
[ ] Estado: En revisión
[ ] Estado: Aprobado
[ ] Estado: Rechazado

**Etapa 5 — Entrega**
[ ] Entrega al cliente

---

# FASE 8 — PRESUPUESTO INTELIGENTE

**Objetivo:** propuestas basadas en el diagnóstico. Catálogo de servicios.

**Desarrollo:**
[ ] CRM
[ ] Landing
[ ] Automatizaciones
[ ] IA
[ ] Integraciones

**Finanzas:**
[ ] Balance
[ ] Flujo de caja
[ ] Costeo
[ ] KPI

**Comercial:**
[ ] Scripts
[ ] Capacitación
[ ] Procesos

**RRHH:**
[ ] Evaluaciones
[ ] Reclutamiento
[ ] Clima

**Cada servicio:** (código · precio base · horas · complejidad · margen)
[ ] Código
[ ] Precio base
[ ] Horas
[ ] Complejidad
[ ] Margen

**IA clasifica:**
[ ] Urgente
[ ] Importante
[ ] Postergable

---

# FASE 9 — BÚSQUEDA POR RUT

**Investigar factibilidad:**
[ ] Integración SII
[ ] APIs públicas
[ ] APIs privadas
[ ] Proveedores externos

**Si es posible, autocompletar:**
[ ] Razón social
[ ] Giro
[ ] Dirección
[ ] Actividad económica

[ ] Si no es posible → alternativa manual + documentar limitaciones técnicas

---

# FASE 10 — FACTURACIÓN

[ ] Clientes
[ ] Facturas
[ ] Pagos
[ ] Cobranza
[ ] Vencimientos

**Estados:**
[ ] Pendiente
[ ] Parcial
[ ] Pagado
[ ] Vencido

---

# FASE 11 — IA Y AUTOMATIZACIÓN

> Nota: hoy el "motor IA" del informe es de **reglas** (sin LLM). IA real requiere backend/clave (no exponer en cliente).

[ ] Resumen ejecutivo automático
[ ] Diagnóstico automático
[ ] Hallazgos automáticos
[ ] Riesgos automáticos
[ ] Recomendaciones automáticas
[ ] Propuesta automática

---

# FASE 12 — SEGURIDAD

[ ] Roles
[ ] Permisos
[ ] Auditoría
[ ] Historial de cambios

---

# FASE 13 — RENDIMIENTO

[ ] Optimización de carga
[ ] Optimización de consultas
[ ] Optimización de componentes

---

# REGISTRO DE CAMBIOS

### 2026-06-09 · Fase 1 — UX Pipeline (Kanban) + Diagnósticos (commit `2ca49e3`)
- **Módulos:** pipeline, diagnósticos (vía styles.css), design system
- **Archivos:** `modules/pipeline/pipeline.js`, `modules/pipeline/pipeline.css`, `styles.css`
- **Motivo:** elevar el tablero de pipeline y la pantalla de diagnósticos (Fase 1).
- **Resultado:** estadísticas del pipeline clickeables para filtrar (toggle + estado activo), contador por color de etapa, filtro con chevron; botones Sí/No del diagnóstico con mejor toque (48×32). El flujo del diagnóstico se rediseña en Fase 7. Verificado en preview, sin errores.

### 2026-06-09 · Fase 1 — UX Formularios + Propuestas (commit `ac371ae`)
- **Módulos:** design system (styles.css), modals (prospecto), propuestas
- **Archivos:** `styles.css`, `modules/modals/modals.js`, `modules/propuestas/propuestas.js`
- **Motivo:** elevar formularios y la pantalla de propuestas (Fase 1).
- **Resultado:** formularios con secciones/hints/asterisco y selects con chevron (global → beneficia todos los modales); prospecto agrupado en 2 secciones (11 campos intactos); propuestas con KPIs de ícono y selección de servicios en tarjetas (estado activo vía `:has()`). Verificado en preview, sin errores.

### 2026-06-09 · Fase 1 — Rediseño UX Sidebar + Dashboard (commit `d729838`)
- **Módulos:** app (sidebar/nav), home (dashboard), design system
- **Archivos:** `app.js`, `styles.css`, `modules/home/home.js`
- **Motivo:** elevar la UX al estándar HubSpot/Pipedrive (Fase 1, primera pasada opinada).
- **Resultado:** Sidebar y Dashboard ✅. Botón global de creación, indicador de activo, badge de leads, footer→config; saludo personalizado, KPIs con chips de ícono, embudo con color por etapa. Verificado en preview 1280px sin errores. Navegación en progreso (falta routing por URL).

### 2026-06-09 · Fase 2 — Estandarización de datos (commit `4409199`)
- **Módulos:** núcleo (nuevo `js/format.js`), modals (prospecto), propuestas
- **Archivos:** `js/format.js` (nuevo), `modules/modals/modals.js`, `modules/propuestas/propuestas.js`
- **Motivo:** estandarizar y validar datos de entrada (Fase 2).
- **Resultado:** ✅ 7/7. RUT (módulo 11) con formato + validación, teléfono CL, email, CLP con miles en vivo, mayúsculas automáticas, % y fechas. Verificado en preview. Se agregó el campo `rut` al prospecto (aditivo, sin migración). Lib reutilizable.

### 2026-06-09 · Creación del documento maestro + Fase 0
- **Módulo:** documentación / auditoría
- **Archivos:** `docs/TRIADA_MASTER_IMPLEMENTATION.md` (nuevo)
- **Motivo:** establecer fuente oficial de desarrollo y ejecutar la auditoría obligatoria.
- **Resultado:** Fase 0 completada (9/9). Roadmap de 148 tareas en 14 fases definido.

### 2026-06-09 · Fixes de auditoría preliminar (commit `f227426`)
- **Módulos:** pipeline, diagnósticos, home, PWA
- **Archivos:** `modules/pipeline/pipeline.js`, `modules/diagnosticos/diagnosticos.js`, `modules/home/home.js`, `index.html`, `manifest.json`, `icon.svg`
- **Motivo:** corregir bugs y quick wins detectados.
- **Resultado:** ✅ buscador del pipeline ya no pierde el foco; drag&drop en Kanban; aviso al guardar diagnóstico vacío; listeners eficientes en diagnóstico; saludo por hora; PWA con ícono SVG. Verificado en preview sin errores.

### 2026-06-09 · Infraestructura y consolidación
- **Motivo:** un solo CRM y un solo origen de verdad.
- **Resultado:** se eligió el CRM de Diagnóstico 360 como producto único; publicado en `github.com/martinjacques225/TRIADA-CRM` con GitHub Pages activo; eliminada la copia duplicada del Desktop. CRM comercial preservado en `CRM-COMERCIAL-V1.6` + historial git.

---

# REGLAS DE TRABAJO OBLIGATORIAS

1. Actualizar este documento después de cada tarea.
2. Marcar las tareas completadas (`[x]`).
3. Registrar avances.
4. Registrar bloqueos.
5. No eliminar funcionalidades existentes sin documentarlo.
6. No realizar cambios masivos sin explicación.
7. Antes de implementar una fase, analizar impacto.
8. Mantener compatibilidad con las funcionalidades actuales.
9. Priorizar escalabilidad.
10. Priorizar mantenibilidad.
