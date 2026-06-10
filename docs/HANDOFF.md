# HANDOFF — TRIADA CRM · Estado y próximos pasos
> Actualizado: 2026-06-09 | Sesión: conexión Supabase completa

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
- `app.js` — `requireAuth()` en init; botón "Cerrar sesión" en nav; fix `+pid` → string
- Todos los módulos — onclick handlers entrecomillados para UUID (`('${id}')`)
- Publicado en GitHub Pages: https://martinjacques225.github.io/TRIADA-CRM/

---

## 🔴 PENDIENTE INMEDIATO (setup de hoy, sin esto no funciona el login)

```
1. Supabase → Authentication → Users → Add user
   Email: tu email real   Contraseña: segura

2. SQL Editor → New query:
   update profiles set role = 'admin', nombre = 'Martín'
   where email = 'TU_EMAIL_AQUI';

3. Abrir https://martinjacques225.github.io/TRIADA-CRM/
   → debe aparecer pantalla de login → entrar → verificar que funciona
```

---

## 🟡 SIGUIENTE PRIORIDAD — El funnel roto (caso #1 de Supabase)

El formulario de la landing escribe en `localStorage['triada_leads']`, pero ahora
el CRM vive en Supabase. El lead nunca llega automáticamente.

**Fix:** actualizar la landing (`01-WEB/Triada_Landing_Conversion.html`) para que
al enviar el formulario llame directamente a Supabase con la anon key:

```js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const sb = createClient('https://pqrjndirqtucoumijben.supabase.co',
                        'sb_publishable_CEm784MwkIW1BqoDjEvlWQ_uDVSzm80');
await sb.from('leads').insert({ nombre, empresa, email, telefono,
  giro: rubro, dolor_principal: interes, origen: 'landing', estado: 'Nuevo' });
```

La política RLS `leads_public_ins` ya permite esto (anon + `origen = 'landing'`).

---

## 🟡 PERFIL DE USUARIO desde Supabase

Hoy `config.get('userName')` / `config.get('cargo')` leen de localStorage.
Mejora: leerlos de `profiles` (ya existe la tabla) para que cada consultor
tenga su propio nombre/cargo sin configurar manualmente.

```js
// En app.js init(), después de requireAuth():
const { data: profile } = await supabase
  .from('profiles').select('nombre, role, area').eq('id', user.id).single();
// Usar profile.nombre en el nav en vez de config.get('userName')
```

---

## 🟡 MULTI-USUARIO LIGHT (las 3 costuras del plan)

El plan acordado: acceso compartido a todo, SIN muros de permisos, pero con:

1. **Responsable en registros** — al crear prospecto/cita, guardar `responsable: user.id`
   (el campo ya existe en el schema de Supabase)
2. **Agenda personalizada** — filtro "Mis citas / Todas" en Agenda
3. **Área activa** — dropdown en el nav para que cada consultor declare su área
   (Tecnología / Ventas / Finanzas); afecta el foco de la agenda y herramientas

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
