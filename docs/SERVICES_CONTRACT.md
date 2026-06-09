# SERVICES_CONTRACT.md
> Contratos públicos de la capa de servicios y de `window._app`. Referencia obligatoria para cualquier módulo nuevo.

---

## Principio

La UI (vistas, módulos, `ui.js`) **nunca** importa `js/db.js`. Toda lectura/escritura de datos y toda lógica de negocio pasa por `services/`. Para migrar a Supabase en el futuro sólo se reescribe el interior de cada `*.service.js`; los módulos no se modifican.

```
módulos / ui.js / app.js
        │  import { ... } from '../../services/*.service.js'
        ▼
   services/*.service.js   ← contrato estable (este documento)
        │
        ▼
   js/db.js (IndexedDB hoy)  →  Supabase (futuro)
```

Importar preferentemente desde el barrel `services/index.js`, o desde el servicio específico.

---

## Servicios de datos

Cada servicio reexporta hoy el store de IndexedDB con el mismo objeto y comportamiento. El contrato es el conjunto de métodos garantizados.

### `lead.service.js` → `leads` / `LeadService`
| Método | Firma | Devuelve |
|--------|-------|----------|
| add | `add(data)` | `Promise<id>` (estado inicial `Nuevo`, crea `historial[]`) |
| get | `get(id)` | `Promise<lead|undefined>` |
| getAll | `getAll()` | `Promise<lead[]>` |
| update | `update(data)` | `Promise<id>` (actualiza `fechaActualizacion`) |
| delete | `delete(id)` | `Promise<void>` |
| addHistorial | `addHistorial(id, entry)` | agrega `{...entry, timestamp}` al inicio del historial |
| search | `search(query)` | filtra por nombre/apellido/teléfono/email/empresa |

### `appointment.service.js` → `appointments` / `AppointmentService`
| Método | Firma |
|--------|-------|
| add / get / getAll / update / delete | estándar |
| getByDate | `getByDate(fecha)` → citas de esa fecha |
| checkConflict | `checkConflict(fecha, hora, excludeId=null)` → cita en conflicto o `undefined` |
| search | `search(query)` |

### `sales.service.js` → `sales` / `SalesService`
`add, get, getAll, update, delete, getByMonth(year, month)`

### `call.service.js` → `calls` / `CallService`
`add, get, getAll, update, getByLead(leadId), getByAppt(apptId), getByDateRange(start, end)`

### `template.service.js` → `templates` / `TemplateService`
`getAll` (siembra plantillas por defecto si está vacío), `add`, `update`

### `config.service.js` → `config` / `ConfigService`
`get(key)` → valor o `null` · `set(key, value)`
Claves conocidas: `userName, cargo, filial, mascota, theme, userAvatar, bannerUrl, lastVisit, notificaciones, debutActivo`.

### `persistence.service.js` → `initDB`
`initDB()` → inicializa la persistencia. Llamado una vez en `app.js`.

---

## Servicios de negocio (fachada sobre `js/utils.js`)

> La matemática pura vive en `utils.js`; estos servicios son el contrato público y el punto de cambio futuro (reglas versionadas / por filial).

### `commission.service.js` → `CommissionService` + named
- `calcMonthComision(allSales, year, month, debutActivo, PLANES)` → `{comisiones, incentivos, bpi, conectividad, debut, total, thisMo, weekDetails}`
- `calcIncentiveSemanal(weekSales)` → `{bC, bG, bono, contados, total}`
- `calcBPI(totalMatriculas)` → número
- `groupByWeek(salesArr)`, `getWeekStart(dateStr)`, `isContadoPlan(planId)`

### `medal.service.js` → `MedalService` + named
- `calcMedallasSemanales(weekSales)` → `Math.floor(n/4)`
- `calcTotalMedallas(allSales)`
- `calcNivel(totalMedallas)` → `Math.floor(n/5)`

---

## Servicio de preparación futura

### `user.service.js` → `UserService`
Aísla a la UI del cambio "perfil local → multiusuario Supabase".
- `getProfile()` → `{userName, cargo, filial, mascota, userAvatar, bannerUrl}`
- `setProfile(partial)` → persiste sólo claves de perfil válidas
- `get(key)` / `set(key, value)` → passthrough a config

> Hoy se respalda en `config`. Mañana apuntará a la tabla `perfiles` (organizacion_id, filial_id, equipo_id, rol_id).

---

## Contrato de `window._app`

Registrado en `app.js` durante `init()`. Es el canal por el que los módulos invocan navegación, modales y acciones globales (los `data-action` de las tarjetas lo usan vía `attachCardEvents`). **Acoplamiento conocido**: documentado aquí; su reemplazo por imports explícitos es trabajo futuro de bajo riesgo.

| Clave | Tipo | Propósito |
|-------|------|-----------|
| `navigate(view)` | fn | Cambia de vista |
| `refreshView()` | fn | Re-renderiza la vista actual |
| `renderNav()` / `renderBottomNav()` | fn | Re-dibuja navegación |
| `attachCardEvents()` | fn | Cablea los `data-action` de las tarjetas tras cada render |
| `showMascotMessage(mascota, ctx, force?)` | fn | Mensaje de mascota |
| `openFormModal(id?)` | fn | Modal cita nueva/editar |
| `openFormModalFromLead(leadId)` | fn | Agendar cita desde lead |
| `openLeadModal(id?)` | fn | Modal lead nuevo/editar |
| `openReagendarModal(id)` | fn | Reagendar cita |
| `openWAModal(id, type)` | fn | Modal WhatsApp (`type`: `appt`|`lead`) |
| `openSaleModal()` | fn | Registrar venta |
| `closeModal()` | fn | Cierra modal global |
| `deleteSale(id)` | fn | Elimina venta (con confirm) |
| `deleteLead(id)` | fn | Elimina lead (con confirm) |
| `autoLogCall(data)` | fn | Registra llamada en el store `calls` |
| `_getDebutActivo()` | fn | Lee `config.debutActivo` |
| `requestNotifications()` | fn | Pide permiso de notificaciones |

### Acciones de tarjeta (`data-action`) soportadas por `attachCardEvents`
`call`, `wa`, `agendar-lead`, `edit-lead`, `delete-lead`, `delete-sale`, (citas: editar/reagendar/wa según vista).

---

## Reglas para código nuevo
1. Importar datos/negocio **sólo** desde `services/`.
2. No volver a importar `js/db.js` desde la UI.
3. Catálogos: importar de `js/planes.js`, `js/estados.js`, `js/mascotas.js` (no del barrel `constants.js`).
4. Si se agrega un método a un store, actualizar también el contrato aquí.
5. Al introducir Supabase, reescribir el interior del servicio manteniendo esta firma.
