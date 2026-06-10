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

## 🔴 PENDIENTE INMEDIATO (setup manual, sin esto no funciona el login)

```
1. Ir a: https://supabase.com/dashboard/project/pqrjndirqtucoumijben/auth/users
   → "Add user" → Enter user  (Email: tu email real, Contraseña: segura)

2. SQL Editor → New query:
   update profiles set role = 'admin', nombre = 'Martín'
   where email = 'TU_EMAIL_AQUI';

3. Abrir https://martinjacques225.github.io/TRIADA-CRM/
   → debe aparecer pantalla de login → entrar → verificar que funciona
```

---

## 🟡 SIGUIENTE — Filtro "Mis citas / Todas" en Agenda (multi-usuario light parte 2)

El campo `responsable` ya se guarda en nuevos leads y diagnósticos.
Falta: filtro en la vista de Agenda para que cada consultor vea solo sus citas por defecto.

- Agregar `responsable` a `citaToSupa()` / `citaFromSupa()` en db.js
- Agregar botones "Mis citas / Todas" en modules/agenda/agenda.js
- Filtrar con `.eq('responsable', _uid)` cuando el toggle está en "Mis citas"

---

## 🟡 ÁREA ACTIVA (multi-usuario light parte 3)

- Dropdown en el nav: Tecnología / Ventas / Finanzas
- Se guarda en `profiles.area` (columna ya existe)
- Afecta el foco de la agenda y las herramientas del consultor

---

## 🔵 FUNCIONALIDADES PENDIENTES (roadmap de 14 fases)

| Prioridad | Feature | Nota |
|-----------|---------|------|
| Alta | Informe 360 integrado al funnel | Motor ya existe (`informe.engine.js`); falta que el cliente lo llene desde una URL pública |
| Alta | Formulario de contacto dentro del CRM | El lead del formulario debe crear el prospecto y disparar el diagnóstico |
| Media | Catálogo de servicios | Tabla `servicios` ya existe en Supabase |
| Media | Facturación básica | Tabla `facturas` ya existe en Supabase |
| Media | URL routing | `navigate('pipeline')` → `?view=pipeline` en la URL |
| Baja | Service worker PWA | Pospuesto durante desarrollo activo |
| Baja | Módulo de proyectos | Schema pendiente en Supabase |
| Baja | Exportar a PDF desde el CRM | Informe 360 ya tiene `window.print()` |

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
