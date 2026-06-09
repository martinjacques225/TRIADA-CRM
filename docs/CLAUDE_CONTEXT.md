# CLAUDE_CONTEXT.md
> Memoria permanente del proyecto CRM Comercial — **leer este archivo al iniciar cada fase**. Actualizar en cada sesión relevante.

---

## Resumen General

Aplicación web progresiva (PWA) orientada a asesores comerciales y equipos de ventas. Corre completamente en el navegador (sin backend). Hoy los datos se almacenan en **IndexedDB** del dispositivo, pero el acceso ya está **desacoplado tras una capa de servicios** lista para enchufar Supabase u otro backend sin tocar la UI. Instalable como app en escritorio y Android. Funciona offline gracias a un Service Worker.

---

## Estado Actual del Desarrollo

**Versión:** 3.3 (correcciones funcionales — pulido pre-Supabase)
**Fase actual:** 🛠️ *Correcciones funcionales* — bugs y comportamientos comerciales, sin tocar la capa de servicios. Cambios en rama `fase-correcciones-funcionales`, **pendientes de prueba en navegador y commit** (ver `CHANGELOG.md` [3.3]). Helpers nuevos: `utils.buildMessage` (variables de plantillas con alias) e `utils.initAutoUpper` (mayúsculas automáticas configurables). Agenda: `deleteAppointment` / `appointmentToLead`.
**Fase previa:** ✅ *Fase Servicios* COMPLETADA Y CERRADA — arquitectura desacoplada, limpieza de deuda técnica y separación de archivos. Sincronizada al repositorio Git.
**Fases previas:** Auditoría técnica (✅) · Diseño de arquitectura multiusuario/Supabase (✅, ver `ARQUITECTURA_FASE2.md`).
**Pendiente explícito:** NO se ha implementado Supabase ni multiusuario todavía. Sólo se preparó la base.
**Verificación de la fase:** estática OK (sintaxis + 186 imports resueltos + cero acceso directo a IndexedDB desde la UI). Falta prueba funcional en navegador por el usuario.

---

## Ubicación de Trabajo y Flujo Git  ⚠️ LEER PRIMERO

- **Carpeta de trabajo oficial (a partir de v3.2):** el **clon Git** en `C:\Users\velve\Documents\GitHub\CRM-COMERCIAL-V1.6`.
  Remoto: `https://github.com/martinjacques225/CRM-COMERCIAL-V1.6.git` · rama base: `main`.
- La carpeta antigua `RECURSOS UTILES APPS` quedó como copia de respaldo; **no trabajar ahí** para no desincronizar.
- **Flujo acordado con el usuario:**
  1. `main` siempre debe ser la versión que funciona.
  2. Todo lo nuevo o de riesgo (Supabase, sincronización) se hace en una **rama** aparte (ej. `fase-3`), no directo en `main`.
  3. Orden antes de fusionar/publicar: Claude verifica (sintaxis + imports) → **el usuario prueba en el navegador** → se revisa el diff en GitHub Desktop → Commit → Push → merge a `main` solo si funciona.
  4. Retoques menores: commit a `main` pero siempre con revisión previa.
  5. Nada se sube solo: Commit y Push son manuales. Todo cambio es reversible (Revert).
- Claude no tiene credenciales de GitHub: prepara los cambios y el usuario hace Commit/Push desde GitHub Desktop.

---

## Arquitectura Vigente

```
CRM Comercial v3.2
├── index.html              ← Shell HTML, todo se renderiza en JS (carga app.js como módulo)
├── app.js                  ← Orquestador: init, navegación, registro de window._app
├── styles.css              ← Estilos globales con variables CSS (tema claro/oscuro)
├── sw.js                   ← Service Worker (cache-first locales). CACHE actual: crm-v8
├── manifest.json           ← PWA manifest
│
├── js/                     ← Capa base
│   ├── db.js               ← Implementación IndexedDB (6 stores). NO se importa desde la UI: sólo desde services/
│   ├── state.js            ← Estado global singleton (objeto S)
│   ├── planes.js           ← PLANES, CONVENIOS            (separado de constants.js)
│   ├── estados.js          ← LEAD_ESTADOS, CARGOS         (separado de constants.js)
│   ├── mascotas.js         ← MASCOTAS, getMascotMsg       (separado de constants.js)
│   ├── constants.js        ← BARREL de compatibilidad (re-exporta planes/estados/mascotas)
│   ├── ui.js               ← Shell UI: nav, topbar, mascota, PWA, notificaciones
│   └── utils.js            ← Utilidades puras + motor de comisiones (implementación)
│
├── services/               ← ★ CAPA DE SERVICIOS (única vía a datos y lógica de negocio)
│   ├── index.js            ← Barrel: punto de entrada recomendado
│   ├── persistence.service.js  ← initDB() (arranque de persistencia)
│   ├── lead.service.js         ← datos de leads
│   ├── appointment.service.js  ← datos de citas/agenda
│   ├── sales.service.js        ← datos de ventas
│   ├── call.service.js         ← datos de llamadas
│   ├── template.service.js     ← plantillas WhatsApp
│   ├── config.service.js       ← configuración/preferencias (key-value)
│   ├── commission.service.js   ← motor de comisiones (fachada sobre utils)
│   ├── medal.service.js        ← medallas/niveles (fachada sobre utils)
│   └── user.service.js         ← perfil local (preparación multiusuario futuro)
│
└── modules/                ← Módulos de vista (cada uno expone render())
    ├── agenda/  calculadora/  configuracion/  dashboard/  leads/
    ├── medallas/  plantillas-wa/  respaldos/  ventas/
    └── modals/             ← separado por responsabilidad:
        ├── modals.js       ← BARREL (compat con app.js)
        ├── modal-core.js   ← openModal, closeModal, _alert
        ├── modal-cita.js   ← openFormModal, openFormModalFromLead, openReagendarModal
        ├── modal-lead.js   ← openLeadModal, deleteLead
        ├── modal-venta.js  ← openSaleModal, deleteSale
        └── modal-wa.js     ← openWAModal
```

### Regla de arquitectura (obligatoria)
**Las vistas/módulos hablan con `services/`, NUNCA con `js/db.js` directamente.** `js/db.js` es el adapter de persistencia detrás de los servicios. Mañana, para migrar a Supabase, sólo se reescribe el interior de cada `*.service.js`; la UI no se toca.

### Capa de persistencia (IndexedDB — sin cambios)
Base `AgendaComercialDB` v2. Stores: `appointments`, `leads`, `calls`, `sales`, `templates`, `config`.

### Patrón de comunicación entre módulos
1. **`services/`** — toda lectura/escritura de datos y lógica de negocio.
2. **`window._app`** — funciones de navegación, modales y UI registradas en `app.js`. Contrato documentado en `docs/SERVICES_CONTRACT.md`.
3. **`js/state.js` (`S`)** — estado compartido global.

---

## Servicios Existentes y Contratos

| Servicio | Backend hoy | Contrato (métodos) |
|----------|-------------|--------------------|
| `lead.service` | IndexedDB `leads` | add, get, getAll, update, delete, addHistorial, search |
| `appointment.service` | IndexedDB `appointments` | add, get, getAll, getByDate, update, delete, checkConflict, search |
| `sales.service` | IndexedDB `sales` | add, get, getAll, update, delete, getByMonth |
| `call.service` | IndexedDB `calls` | add, get, getAll, update, getByLead, getByAppt, getByDateRange |
| `template.service` | IndexedDB `templates` | getAll, add, update |
| `config.service` | IndexedDB `config` | get(key), set(key,value) |
| `persistence.service` | IndexedDB | initDB() |
| `commission.service` | utils.js (puro) | calcMonthComision, calcIncentiveSemanal, calcBPI, groupByWeek, getWeekStart, isContadoPlan |
| `medal.service` | utils.js (puro) | calcMedallasSemanales, calcTotalMedallas, calcNivel |
| `user.service` | config (preparación) | getProfile, setProfile, get, set |

Detalle completo y contrato de `window._app`: ver **`docs/SERVICES_CONTRACT.md`**.

---

## Decisiones Tomadas (esta fase)

1. **Servicios como re-export fino sobre `db.js`** (mismo objeto/comportamiento) → cero riesgo de regresión, seam claro para Supabase.
2. **`constants.js` y `modals.js` se conservan como barrels** tras separarlos → nada externo se rompe; el código nuevo importa de los archivos específicos.
3. **`commission`/`medal`/`user` services**: la matemática pura sigue en `utils.js`; los servicios son la fachada pública. Ventas, Medallas, Dashboard y Calculadora ya consumen los servicios.
4. **Comisión por venta debe congelarse al vender** (decisión de diseño de `ARQUITECTURA_FASE2.md`) — pendiente de aplicar cuando exista persistencia de comisiones.
5. **`window._app` se documenta como contrato** (no se elimina aún para no romper la UI; su reemplazo por imports directos es trabajo futuro de bajo riesgo).

---

## Riesgos

### Resueltos esta fase
- ✅ `db.js` raíz y `app.backup.js` eliminados (verificado: sin referencias activas).
- ✅ `deleteLead`/`deleteSale` duplicados unificados (única implementación en `modal-lead.js` / `modal-venta.js`).
- ✅ `constants.js` (201 líneas) separado en planes/estados/mascotas.
- ✅ `modals.js` (345 líneas) separado en 5 archivos por responsabilidad.
- ✅ Acceso directo a IndexedDB desde la UI eliminado (todo pasa por `services/`).

### Pendientes (no bloquean esta fase)
- ⚠️ **`window._app`**: documentado, pero sigue siendo acoplamiento global. Migrar a imports explícitos a futuro.
- ⚠️ **`getAll()` sin paginación**: los módulos cargan el 100% de registros. Revisar al crecer el volumen.
- ⚠️ **Íconos SVG duplicados** inline en varios módulos (cosmético/deuda menor).
- ⚠️ **Sin pruebas de runtime automatizadas**: la verificación de esta fase fue estática (sintaxis + resolución de imports). Falta prueba funcional en navegador.

---

## Próximos Pasos

> Punto de arranque para el siguiente hilo. Trabajar en el clon Git, en una rama nueva. Esta fase (v3.2 Servicios) está **cerrada**.

0. **Pendiente del usuario (esta fase):** probar en navegador Leads, Agenda, Ventas y Configuración, y hacer Commit + Push del cambio v3.2 ya preparado en el clon.
1. **Recomendado antes de Supabase (limpieza de bajo riesgo, rama propia):** adoptar **UUID + `organizacion_id`** en el modelo local, y externalizar `lead.historial[]` a un concepto de `actividad`. Hace la migración futura casi trivial.
2. **Fase 7 — Supabase (entorno de pruebas):** crear tablas + Auth + RLS + catálogos según `ARQUITECTURA_FASE2.md`. Implementar el interior de los `*.service.js` con un adapter remoto (la UI no se toca).
3. **Fase 8 — Motor de sincronización** offline-first (outbox + Realtime) — el componente más complejo.
4. **Fase 9 — Migración asistida** IndexedDB → Supabase (no destructiva, con dry-run) y piloto 1 filial.

### Otros frentes posibles para el siguiente hilo (no dependen de Supabase)
- Módulos nuevos del backlog (ROADMAP Fase 5): Tareas, Prospección, Actividad/timeline, Embudo Kanban ampliado, Reportes PDF/Excel, Recordatorios in-app.
- Deuda menor: paginación en lecturas (`getAll`), unificar íconos SVG, migrar `window._app` a imports.

---

## Documentos de Referencia
- `ARQUITECTURA_FASE2.md` — diseño multiusuario/Supabase (modelo de datos, roles, migración).
- `SERVICES_CONTRACT.md` — contratos de servicios y de `window._app`.
- `BUSINESS_RULES.md` — reglas de negocio (citas, leads, ventas, comisiones, BPI, medallas).
- `PROJECT_CONTEXT.md` — contexto técnico/producto.
- `ROADMAP.md` — plan por fases.
- `CHANGELOG.md` — historial de cambios.
