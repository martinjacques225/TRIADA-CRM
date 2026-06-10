# HANDOFF — TRIADA CRM · Estado y próximos pasos
> Actualizado: 2026-06-09 | Sesión: funnel landing + perfil Supabase + responsable

---

## ✅ Lo que está hecho

### Infraestructura Supabase
- Proyecto Supabase: `pqrjndirqtucoumijben` (región: São Paulo)
- Schema SQL ejecutado: tablas `leads`, `diagnosticos`, `citas`, `propuestas`, `clientes`, `profiles`, `servicios`, `facturas`, `actividad`, `correlativos`
- RLS activo: autenticados leen/escriben todo; anon solo inserta leads (landing)
- Triggers: auto-correlativo (LEAD-000001, DIA-000001…), auto-`updated_at`, auto-`profiles` al crear usuario

### CRM conectado a Supabase
- `js/supabase.js` — cliente Supabase (CDN ESM, key embebida, es pública)
- `js/auth.js` — pantalla de login + `signOut()`; bloquea el CRM hasta autenticar
- `js/db.js` — **reescrito completo** contra Supabase (misma interfaz que IndexedDB)
  - Mapeo de campos: `rubro↔giro`, `dolorPrincipal↔dolor_principal`, `prospectoId↔lead_id`
  - `config` usa localStorage (preferencias de UI, no datos de negocio)
  - IDs: de numérico autoincrement → UUID string
  - `setCurrentUser(uid)` — exportado; auto-asigna `responsable` en leads.add y diagnosticos.add
- `app.js` — lee `profiles` de Supabase al init; `_profile.nombre/role` en nav e informe
- Todos los módulos — onclick handlers entrecomillados para UUID (`('${id}')`)
- Publicado en GitHub Pages: https://martinjacques225.github.io/TRIADA-CRM/

### Landing → Supabase (funnel arreglado)
- `01-WEB/Triada_Landing_Conversion.html` — submit handler ahora usa `fetch` directo contra
  Supabase REST API (`/rest/v1/leads`). Respaldo localStorage siempre activo como fallback.
  El CRM ya no necesita "Importar leads del landing" para recibir nuevos contactos.

### Perfil desde Supabase
- `app.js` lee `profiles.nombre` y `profiles.role` al inicio y los usa en:
  - El avatar del nav (nombre + rol)
  - El evaluador del Informe 360 PDF

### Responsable automático (multi-usuario light)
- `db.js` guarda `responsable = user.id` en cada nuevo prospecto y diagnóstico
- Sin muros de permisos: todos ven todo; el campo solo registra quién lo creó

---

## ✅ SETUP COMPLETO

- Usuario admin creado en Supabase Auth ✅
- `profiles.role = 'admin'` ejecutado ✅
- `diagnosticos_public_ins` policy creada ✅
- Login en https://martinjacques225.github.io/TRIADA-CRM/ **funcionando** ✅
- Formulario público del cliente (`diagnostico-publico.html`) **funcionando** ✅

---

## 🔴 P0 — BUG CRÍTICO (fix inmediato próxima sesión)

**Propuesta no guarda** — `modules/propuestas/propuestas.js` línea 112:
```js
prospectoId: +document.getElementById('propProspecto').value || null,
//           ↑ convierte UUID a NaN → lead_id llega null → insert falla
```
Fix: quitar el `+` (igual que se hizo en agenda.js línea 123).

---

## 🟠 P1 — CORE DEL FLUJO (próximas sesiones)

### 1. Correlativos visibles en UI
- El trigger de Supabase ya genera LEAD-000001, PROP-000001, DIA-000001, etc.
- Falta mostrarlos: en tarjetas del pipeline, ficha de prospecto, modal de propuesta, etc.
- Campo en DB: `correlativo` (tabla leads), `correlativo` (tabla propuestas), etc.
- En `leadFromSupa` / `propFromSupa` en db.js: agregar `correlativo: row.correlativo`

### 2. Propuesta con presupuesto real + IVA
- Reemplazar campo `valor` (número suelto) por tabla de ítems:
  `[{descripcion, cantidad, precioUnit}]` → subtotal → IVA 19% → total
- Guardar en columna `servicios` (ya existe como JSON) el detalle de ítems
- Mostrar resumen en la tarjeta y en el PDF

### 3. Módulo Facturación completo
- Nuevo módulo `modules/facturacion/` con vista lista + modal
- Tabla `facturas` ya existe en Supabase (campos: lead_id, propuesta_id, monto, estado, fecha_emision, correlativo)
- **Lógica de cadena:** diagnóstico → propuesta → factura (cada una referencia la anterior)
- Flujo: en la ficha del prospecto, botón "Crear factura" activo solo si hay propuesta aceptada
- Correlativo FACT-000001

### 4. Crear cliente (convertir prospecto)
- En ficha de prospecto con estado "Cliente": botón "Crear ficha de cliente"
- Crea registro en tabla `clientes` (ya existe en Supabase) ligada al lead_id
- Visible en un sub-módulo o tab dentro de Pipeline

### 5. Crear 2 usuarios más en Supabase
- Supabase Dashboard → Authentication → Users → Add user × 2
- Luego SQL para cada uno:
  ```sql
  update profiles set role = 'consultor', nombre = 'NOMBRE', area = 'AREA'
  where email = 'EMAIL';
  ```
  Áreas válidas: 'Tecnología' | 'Ventas' | 'Finanzas'

---

## 🟡 P2 — MEJORAS UX

### 6. Panel de herramientas por Área activa
- Hoy los botones Tec/Ventas/Fin del nav solo cambian `profiles.area` pero no muestran nada
- Propuesta: al seleccionar un área, mostrar en el Home un panel de recursos rápidos:
  - **Tecnología:** checklist de integración, plantilla de auditoría tech, links útiles
  - **Ventas:** scripts de llamada, calculadora de conversión, plantilla WhatsApp
  - **Finanzas:** tabla de márgenes, checklist de flujo de caja, calculadora IVA
- Implementar como widget colapsable en `modules/home/home.js` que lee `S.profile.area`

### 7. Notificación a jefes de área al cerrar diagnóstico
- Cuando un diagnóstico cambia a estado `'completado'`: enviar copia a cada consultor según su área
- Cada consultor recibe solo las secciones de su área + notas/consejos de esa área
- Canal: email vía Supabase Edge Functions (o link compartible por WhatsApp en v1)
- V1 simple: al guardar diagnóstico, mostrar modal con 3 botones "Enviar sección Tec/Ventas/Finanzas" que copian un resumen formateado para pegar en WhatsApp

### 8. Badge "360 pendiente" en pipeline
- Chip naranja en tarjeta de prospecto cuando no existe diagnóstico con `estado='cliente'`
- Query: `diagnosticos.byProspecto(id)` → filtrar por `estado === 'cliente'`

---

## 🔵 P3 — BACKLOG

| Feature | Nota |
|---------|------|
| URL routing | `navigate('pipeline')` → `?view=pipeline` en la URL |
| Service worker PWA | Pospuesto hasta estabilizar funcionalidades |
| Módulo de proyectos | Para seguimiento post-venta |

---

## Arquitectura actual resumida

```
index.html
└── app.js (orquestador)
    ├── js/auth.js       → login gate (Supabase Auth)
    ├── js/supabase.js   → cliente Supabase (key pública embebida)
    ├── js/db.js         → capa de datos (Supabase, misma interfaz antes)
    ├── js/state.js      → estado UI
    ├── js/utils.js      → constantes + helpers
    ├── js/format.js     → formateo RUT/teléfono/email
    └── modules/
        ├── home/        pipeline/  diagnosticos/  agenda/
        ├── propuestas/  informes/  configuracion/
        ├── modals/      (modal global + detalle de prospecto)
        └── informe-ejecutivo/  (motor PDF estilo McKinsey)
```

**DB Supabase:** leads · diagnosticos · citas · propuestas · profiles
**Config:** localStorage (tema, userName, cargo) → migrar a profiles (pendiente)
**Repo:** https://github.com/martinjacques225/TRIADA-CRM
**Deploy:** https://martinjacques225.github.io/TRIADA-CRM/
