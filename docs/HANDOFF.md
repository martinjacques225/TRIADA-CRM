# HANDOFF — TRIADA CRM · Estado y próximos pasos
> Actualizado: 2026-06-10 | Sesión: P0 fix + P1 correlativos + ítems IVA + facturación + cliente

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
- `js/db.js` — capa Supabase con mapeo completo de campos
  - Correlativos: `leadFromSupa`, `propFromSupa`, `diagFromSupa` exponen `correlativo`
  - Nuevas secciones: `clientes` (CRUD + getByLead) y `facturas` (CRUD + byLead)
  - `config` usa localStorage (preferencias de UI)
  - IDs: UUID string
  - `setCurrentUser(uid)` — auto-asigna `responsable`

### Correlativos visibles en UI ✅
- LEAD-000001 visible en tarjeta kanban y header de ficha del prospecto
- DIA-000001 visible en ficha diagnóstico dentro del detalle del prospecto
- PROP-000001 visible en tabla propuestas y en el detalle del prospecto

### Propuesta con ítems + IVA ✅
- Formulario reemplaza checkboxes por tabla dinámica de servicios
- Cada ítem: {descripcion, cantidad, precioUnit}
- Calcula subtotal neto, IVA 19%, total automáticamente
- Guarda ítems en columna `servicios` (JSON) y total en `valor`
- Retrocompatible: formato antiguo (string[]) se muestra correctamente

### Módulo Facturación ✅
- `modules/facturacion/facturacion.js` — vista lista + KPIs + modal create/edit
- Tabla `facturas` en Supabase: correlativo FACT-000001
- Estados: Pendiente / Enviada / Pagada / Vencida
- Botón "+ Factura" en ficha del prospecto, y "🧾 Crear factura" en cada propuesta Aceptada
- Auto-rellena monto desde propuesta seleccionada
- Agregado al nav en sección "Gestión"

### Crear cliente ✅
- Botón "👤 Crear ficha de cliente" en ficha del prospecto cuando estado=Cliente
- Inserta en tabla `clientes` con datos del prospecto (nombre, empresa, rut, email, telefono)
- Muestra "✓ Ficha de cliente creada" si ya existe (no duplica)

### P0 Bugs corregidos ✅
- `propuestas.js`: quitado `+` antes de UUID → ya no convierte UUID a NaN
- `pipeline.js` DnD: mismo fix en el drop handler → drag & drop Kanban funciona

### Landing → Supabase
- `01-WEB/Triada_Landing_Conversion.html` — submit vía fetch directo a Supabase REST
- Formulario público del cliente (`diagnostico-publico.html`) funcionando

---

## ✅ SETUP COMPLETO

- Usuario admin creado en Supabase Auth ✅
- Login en https://martinjacques225.github.io/TRIADA-CRM/ **funcionando** ✅

---

## 🟠 P1 PENDIENTE

### Crear 2 usuarios nuevos en Supabase
1. Dashboard → Authentication → Users → Add user × 2 (email + contraseña)
2. Copiar el UUID del nuevo usuario
3. Ejecutar en SQL Editor:
```sql
update profiles set role = 'consultor', nombre = 'NOMBRE AQUÍ', area = 'ÁREA AQUÍ'
where id = 'UUID-DEL-USUARIO';
```
Áreas válidas: `'Tecnología'` | `'Ventas'` | `'Finanzas'`

---

## 🟡 P2 — MEJORAS UX (pendientes)

### Panel de herramientas por Área activa (P2a)
- Home: al seleccionar área activa (Tec/Ventas/Fin), mostrar panel colapsable
  con recursos relevantes por área. Implementar en `modules/home/home.js`.

### Notificación jefes de área al cerrar diagnóstico (P2b)
- Modal con 3 botones "Enviar sección Tec/Ventas/Finanzas" que copian
  resumen formateado para pegar en WhatsApp.
- Trigger: cuando diagnóstico cambia a estado `completado`.

### Badge "360 pendiente" en pipeline (P2c)
- Chip naranja en tarjeta kanban cuando el prospecto no tiene diagnóstico
  con `estado='cliente'`. Requiere fetch de diagnosticos en pipeline render.

---

## 🔵 P3 — BACKLOG

| Feature | Nota |
|---------|------|
| Tab/módulo Clientes | Listar tabla `clientes`, ficha individual |
| URL routing | `navigate('pipeline')` → `?view=pipeline` en URL |
| Service worker PWA | Pospuesto hasta estabilizar funcionalidades |
| Módulo de proyectos | Para seguimiento post-venta |

---

## Arquitectura actual

```
index.html
└── app.js (orquestador)
    ├── js/auth.js       → login gate (Supabase Auth)
    ├── js/supabase.js   → cliente Supabase (key pública embebida)
    ├── js/db.js         → capa de datos (Supabase)
    │     tables: leads · diagnosticos · citas · propuestas
    │             clientes · facturas · profiles
    ├── js/state.js      → estado UI
    ├── js/utils.js      → constantes + helpers
    ├── js/format.js     → formateo RUT/teléfono/email
    └── modules/
        ├── home/        pipeline/  diagnosticos/  agenda/
        ├── propuestas/  facturacion/  informes/  configuracion/
        ├── modals/      (modal global + detalle de prospecto)
        └── informe-ejecutivo/  (motor PDF estilo McKinsey)
```

**NAV sections:**
- Principal: Home, Pipeline
- Gestión: Diagnósticos, Agenda, Propuestas, **Facturación** ← nuevo
- Análisis: Informes, Configuración

**Repo:** https://github.com/martinjacques225/TRIADA-CRM
**Deploy:** https://martinjacques225.github.io/TRIADA-CRM/
