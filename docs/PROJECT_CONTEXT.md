# PROJECT_CONTEXT.md
> Contexto técnico y de producto del proyecto — referencia para arquitectos y desarrolladores

---

## Identificación del Proyecto

| Atributo | Valor |
|----------|-------|
| Nombre | CRM Comercial |
| Versión actual | 3.2 (capa de servicios) |
| Tipo | Progressive Web App (PWA) — Single Page Application |
| Stack | Vanilla JavaScript (ES Modules), CSS Variables, IndexedDB |
| Dependencias externas | SheetJS (`xlsx-0.20.1` vía CDN para importar/exportar Excel) |
| Sin framework | No usa React, Vue, Angular ni ningún framework JS |
| Sin backend | Todo corre en el navegador del usuario (backend Supabase planificado, no implementado) |
| Persistencia | IndexedDB (`AgendaComercialDB` v2) **detrás de una capa de servicios** (`services/`) |
| Acceso a datos | La UI usa `services/*.service.js`; nunca importa `js/db.js` directamente. Ver `SERVICES_CONTRACT.md` |

---

## Base de Datos (IndexedDB)

**Nombre:** `AgendaComercialDB`  
**Versión:** 2

| Store | Llave | Índices | Descripción |
|-------|-------|---------|-------------|
| `appointments` | `id` (autoincrement) | `fecha`, `estado` | Citas comerciales |
| `leads` | `id` (autoincrement) | `estado`, `fechaCreacion` | Prospectos y leads |
| `calls` | `id` (autoincrement) | `leadId`, `apptId`, `fecha` | Registro de llamadas |
| `sales` | `id` (autoincrement) | `fecha`, `plan` | Ventas cerradas |
| `templates` | `id` (string, ej: `'primer_contacto'`) | — | Plantillas WhatsApp |
| `config` | `key` (string) | — | Configuración del usuario |

**Claves de config conocidas:**
- `userName` — nombre del asesor
- `cargo` — cargo del asesor
- `filial` — filial o empresa
- `mascota` — ID de mascota seleccionada
- `theme` — `'light'` o `'dark'`
- `userAvatar` — base64 de foto de perfil
- `bannerUrl` — base64 de banner
- `lastVisit` — fecha ISO de última visita (para mensaje de regreso)
- `notificaciones` — boolean
- `debutActivo` — boolean (bono de debut en comisiones)

---

## Motor de Comisiones

Lógica de negocio real implementada en `js/utils.js`:

| Función | Propósito |
|---------|-----------|
| `calcMonthComision()` | Calcula total del mes: comisiones + incentivos semanales + BPI + conectividad + debut |
| `calcIncentiveSemanal()` | Bonos semanales por volumen de planes contado y total |
| `calcBPI()` | Bono de productividad individual por total de matrículas del mes |
| `calcTotalMedallas()` | 1 medalla por cada 4 ventas en una semana |
| `calcNivel()` | 1 nivel por cada 5 medallas acumuladas |

**Planes de venta definidos en `js/constants.js`:**
- Contado, Crédito 12c, Crédito 13c
- Convenio Contado, Convenio Crédito
- Módulo, Excepcional (extraoficial)

---

## Flujos de Datos Principales

### Flujo Cita
`openFormModal()` → `appointments.add()` → `refreshView()` → `ModAgenda.render()`

### Flujo Lead
`openLeadModal()` → `leads.add()` → `leads.addHistorial()` → `refreshView()`

### Flujo Lead → Cita
`openFormModalFromLead(leadId)` → `appointments.add({leadId})` + `leads.update({estado:'Cita agendada'})` → `navigate('agenda')`

### Flujo Venta
`openSaleModal()` → `sales.add()` → `navigate('mis_ventas')` → `showMascotMessage('venta')`

### Flujo Importación Excel
`FileReader.readAsArrayBuffer()` → `XLSX.read()` → `sheet_to_json()` → loop `leads.add()` → `navigate('leads')`

### Flujo Backup JSON
Export: `getAll()` × 3 → `JSON.stringify()` → `Blob` → descarga  
Import: `FileReader.readAsText()` → `JSON.parse()` → loop `add()` por cada store

---

## Patrones de UI

- **Renderizado por innerHTML** — cada módulo reescribe `document.getElementById('center').innerHTML`
- **Eventos re-adjuntados** en cada render (no hay reconciliación tipo Virtual DOM)
- **Un solo modal global** reutilizado para todos los formularios (cita, lead, reagendar, WA, venta)
- **Toast** para feedback de acciones
- **Vibración** en acciones móviles importantes (`navigator.vibrate`)
- **Mascota** aleatoria con 55% de probabilidad al navegar entre vistas

---

## PWA / Service Worker

- **Estrategia:** Cache-first para assets locales, Network-first para externos
- **Cache name:** `crm-v7` (incrementar si se cambian assets)
- **Actualizar cache:** Cambiar `CACHE` en `sw.js` y agregar nuevos archivos a `ASSETS`
- **Notificaciones nativas:** Disponibles, activadas si el usuario acepta el permiso

---

## Convenciones de Código

- Módulos usan `export async function render()` como punto de entrada
- Helpers privados se prefijan con `_` (ej: `_buildGrid`, `_buildWAMsg`)
- Íconos SVG: idealmente se importan desde `js/ui.js` (`ico`), aunque varios módulos aún los tienen duplicados
- Formularios se validan inline antes de llamar a la DB
- Todas las fechas se manejan como `string ISO YYYY-MM-DD` excepto timestamps completos

---

## Entorno de Ejecución

| Plataforma | Soporte |
|-----------|---------|
| Chrome/Edge (escritorio) | ✅ Completo |
| Safari (Mac/iOS) | ✅ Mayormente (IndexedDB funciona, PWA limitada en iOS) |
| Firefox | ✅ Funcional |
| Android (PWA instalada) | ✅ Funcional |
| Electron / App nativa | ❌ No implementado |
| Node.js / servidor | ❌ No aplica (browser-only) |
