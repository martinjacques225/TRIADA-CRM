# Plan de Arquitectura — Migración a Supabase (Backbone)

> Documento de diseño. **No se implementa hasta que apruebes este plan.** Complementa a `TRIADA_MASTER_IMPLEMENTATION.md`. Cubre el "backbone" que destraba las Fases 3, 4, 5, 10 y 12 y arregla el funnel.

## 1. Objetivo y alcance

Pasar de IndexedDB (local, por dispositivo) a **Supabase** (Postgres + Auth + RLS) para tener:
- **Login** y datos **compartidos** entre el equipo (hoy cada navegador tiene su propia base).
- **Funnel real:** el formulario de la landing escribe en una tabla `leads` que el CRM lee (hoy no llega).
- **Correlativos únicos** server-side (Fase 3): `CLI-000001`, `LEAD-000001`, etc.
- Base para Leads pro (Fase 4), Pipeline sync (Fase 5), Facturación (Fase 10), Seguridad/roles (Fase 12).

**Fuera de alcance de este plan:** rediseño del diagnóstico (Fase 7) e IA real (Fase 11) — se abordan después; el esquema deja lugar para ambos.

## 2. Decisiones clave

| Tema | Decisión | Porqué |
|---|---|---|
| Modelo de acceso | **Acceso compartido + login** | Lo pediste: "todos acceden a todo, con agendas diferentes y recursos por área, con login para protección de datos". El área/responsable es un concepto de **asignación y UI**, no un muro de permisos. |
| Multi-tenant | `org_id` en todas las tablas (1 sola org hoy) | Deja la puerta abierta a más consultoras sin rehacer RLS. |
| IDs | **UUID** (clave técnica) + **código correlativo** legible | UUID evita colisiones; el correlativo (`LEAD-000001`) es el identificador de negocio. |
| Auth | Supabase Auth (email + contraseña) | Simple, sin backend propio. Magic link opcional luego. |
| Secretos | `anon key` es **pública** (protegida por RLS); `service key` **jamás** en el cliente | Estándar Supabase. `.env`/`config.local.js` ya está en `.gitignore`. |
| Capa de datos | Reescribir **solo `js/db.js`** detrás de la misma interfaz repositorio | La auditoría confirmó que todo pasa por ahí → migración acotada. |

## 3. Arquitectura de integración

```
Front (Vanilla JS, sin build)
  └─ js/supabase.js     → crea el cliente con URL + anon key (config.local.js, gitignored)
  └─ js/auth.js         → sesión, login gate, usuario actual + rol/área
  └─ js/db.js           → MISMA interfaz (leads.getAll/get/add/update/delete...) pero contra Supabase
  └─ modules/*          → casi sin cambios (consumen db.js)

Supabase
  └─ Auth (auth.users)
  └─ Postgres (tablas + RLS + correlativos)
  └─ (futuro) Edge Functions para IA (Fase 11) — la clave del LLM vive en el servidor
```

`supabase-js` se carga por **CDN ESM** (sin build): `import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'`.

## 4. Modelo de datos (resumen)

```
profiles (usuario del equipo)      org
   │ id = auth.users.id             │
   ▼                                ▼
leads ──(conversión)──► clientes ──► facturas
   │                       │  └──► proyectos
   ├──► diagnosticos       │
   ├──► propuestas ◄───────┘
   ├──► citas (agenda)
servicios (catálogo)        actividad (audit log)
correlativos (secuencias)
```

## 5. Esquema SQL (propuesta concreta)

```sql
-- ENUMS
create type user_role    as enum ('admin','consultor');
create type area_t       as enum ('comercial','finanzas','desarrollo','rrhh','operaciones','tecnologia','ventas');
create type lead_origen  as enum ('manual','landing','meta_ads','google_ads','whatsapp','referido');
create type lead_estado  as enum ('Nuevo','Contactado','Diagnóstico Agendado','Diagnóstico Realizado','Propuesta Enviada','Negociando','Cliente','Descartado');
create type lead_score   as enum ('caliente','tibio','frio');
create type diag_estado  as enum ('borrador','en_revision','aprobado','rechazado');
create type prop_estado  as enum ('borrador','enviada','negociando','aceptada','rechazada');
create type fact_estado  as enum ('pendiente','parcial','pagado','vencido');

-- PERFILES (extiende auth.users)
create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  nombre      text,
  email       text,
  role        user_role not null default 'consultor',
  area        area_t,
  activo      boolean default true,
  created_at  timestamptz default now()
);

-- CORRELATIVOS (Fase 3) — unicidad garantizada server-side
create table correlativos ( tipo text primary key, ultimo int not null default 0 );
insert into correlativos(tipo) values ('CLI'),('LEAD'),('DIA'),('PROP'),('FAC'),('PROJ');

create or replace function next_correlativo(p_tipo text) returns text
language plpgsql as $$
declare n int;
begin
  update correlativos set ultimo = ultimo + 1 where tipo = p_tipo returning ultimo into n;
  return p_tipo || '-' || lpad(n::text, 6, '0');
end; $$;

-- LEADS (captación / pipeline)
create table leads (
  id              uuid primary key default gen_random_uuid(),
  codigo          text unique,                 -- LEAD-000001 (trigger)
  nombre          text not null,
  empresa         text,
  rut             text,
  email           text,
  telefono        text,
  giro            text,
  tamano          text,
  region          text,
  facturacion_est numeric,
  dolor_principal text,
  origen          lead_origen default 'manual',
  estado          lead_estado default 'Nuevo',
  scoring         lead_score,
  responsable     uuid references profiles(id),
  notas           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create or replace function set_codigo() returns trigger language plpgsql as $$
begin if new.codigo is null then new.codigo := next_correlativo(tg_argv[0]); end if; return new; end; $$;
create trigger trg_lead_codigo before insert on leads for each row execute function set_codigo('LEAD');

-- CLIENTES (lead ganado)
create table clientes (
  id          uuid primary key default gen_random_uuid(),
  codigo      text unique,                     -- CLI-000001
  lead_id     uuid references leads(id),
  razon_social text, rut text, giro text, direccion text,
  responsable uuid references profiles(id),
  created_at  timestamptz default now()
);
create trigger trg_cli_codigo before insert on clientes for each row execute function set_codigo('CLI');

-- DIAGNÓSTICOS
create table diagnosticos (
  id          uuid primary key default gen_random_uuid(),
  codigo      text unique,                     -- DIA-000001
  lead_id     uuid references leads(id),
  scores      jsonb,                           -- {tec:[],ventas:[],finanzas:[]...}
  hallazgos   jsonb, oportunidades jsonb,
  estado      diag_estado default 'borrador',
  responsable uuid references profiles(id),
  created_at  timestamptz default now()
);
create trigger trg_dia_codigo before insert on diagnosticos for each row execute function set_codigo('DIA');

-- PROPUESTAS
create table propuestas (
  id          uuid primary key default gen_random_uuid(),
  codigo      text unique,                     -- PROP-000001
  lead_id     uuid references leads(id),
  cliente_id  uuid references clientes(id),
  servicios   jsonb, valor numeric,
  estado      prop_estado default 'borrador',
  vigencia    date, notas text,
  created_at  timestamptz default now()
);
create trigger trg_prop_codigo before insert on propuestas for each row execute function set_codigo('PROP');

-- CITAS (agenda)
create table citas (
  id           uuid primary key default gen_random_uuid(),
  lead_id      uuid references leads(id),
  titulo text, tipo text, estado text,
  fecha date, hora time, lugar text, notas text,
  responsable  uuid references profiles(id),
  created_at   timestamptz default now()
);

-- SERVICIOS (catálogo, Fase 8)
create table servicios (
  id uuid primary key default gen_random_uuid(),
  codigo text unique, nombre text, area area_t,
  precio_base numeric, horas int, complejidad text, margen numeric, activo boolean default true
);

-- FACTURAS (Fase 10)
create table facturas (
  id uuid primary key default gen_random_uuid(),
  codigo text unique,                          -- FAC-000001
  cliente_id uuid references clientes(id),
  monto numeric, pagado numeric default 0,
  estado fact_estado default 'pendiente',
  emision date, vencimiento date,
  created_at timestamptz default now()
);
create trigger trg_fac_codigo before insert on facturas for each row execute function set_codigo('FAC');

-- ACTIVIDAD (audit log, Fases 5/12)
create table actividad (
  id bigint generated always as identity primary key,
  entidad text, entidad_id uuid, accion text,
  usuario uuid references profiles(id), payload jsonb,
  ts timestamptz default now()
);
```

## 6. Autenticación y roles

- **Login gate:** al cargar, `supabase.auth.getSession()`. Si no hay sesión → pantalla de login (email + contraseña). Si hay → arranca el CRM.
- **Usuario actual:** se carga `profiles` (rol + área) → habilita la **vista por área** (agenda filtrada a "mis citas", herramientas del área) **sin bloquear** el resto.
- **Alta de usuarios:** el `admin` invita; un trigger crea el `profiles` al registrarse (`on auth.users insert`).

## 7. Seguridad a nivel de fila (RLS)

Modelo "acceso compartido + login" = **cualquier usuario autenticado de la org lee/escribe todo**; el público (landing) solo puede **insertar leads**.

```sql
alter table leads enable row level security;
create policy leads_auth_all   on leads for all to authenticated using (true) with check (true);
create policy leads_public_ins on leads for insert to anon with check (origen = 'landing');

-- mismo patrón (solo authenticated, all) para clientes, diagnosticos, propuestas, citas, servicios, facturas, actividad
alter table clientes enable row level security;
create policy clientes_auth_all on clientes for all to authenticated using (true) with check (true);
-- ...etc

alter table profiles enable row level security;
create policy profiles_read  on profiles for select to authenticated using (true);
create policy profiles_self  on profiles for update to authenticated using (id = auth.uid());
```

> Cuando quieras endurecer (p.ej. que finanzas no borre leads), se ajustan políticas por rol sin tocar el front.

## 8. Fix del funnel (landing → CRM)

La landing deja de escribir a IndexedDB del CRM viejo y pasa a:
```js
await supabase.from('leads').insert({ nombre, empresa, email, telefono, giro, origen:'landing' });
```
Con la policy `leads_public_ins`, el `anon key` permite **solo** insertar leads desde la landing. El CRM (autenticado) los ve al instante. **Esto resuelve el crítico C1.**

## 9. Estrategia de migración (segura, por pasos)

1. **Crear proyecto Supabase** + correr el SQL (migraciones).
2. **`js/supabase.js`** + `config.local.js` (gitignored) con URL + anon key.
3. **`js/auth.js`** + pantalla de login (gate).
4. **Reescribir `js/db.js`** contra Supabase, **manteniendo la interfaz** (`leads.getAll/get/add/update/delete`, etc.). Async ya es compatible.
5. **Correlativos** (ya en el esquema) — el front muestra `codigo`.
6. **Landing → leads** (fix del funnel).
7. **Migración de datos:** botón "Exportar JSON" (ya existe) → script de import a Supabase para no perder lo cargado en local.
8. **RLS + pruebas** con 2 usuarios.

⚠️ **Refactor obligatorio durante la migración (IDs):** hoy los `onclick` pasan IDs numéricos: `openProspectoDetail(${p.id})`. Con **UUID** (string) hay que **citarlos**: `openProspectoDetail('${p.id}')`, y quitar los `+id` (parseo a número) en los módulos. Es mecánico pero hay que hacerlo en bloque y verificarlo.

## 10. Riesgos y rollback

| Riesgo | Mitigación |
|---|---|
| Romper el CRM al cambiar `db.js` | Migración detrás de la misma interfaz + verificación en preview pantalla por pantalla. Rama/branch para el cambio grande. |
| IDs uuid rompen `onclick` | Refactor dirigido (paso 9) + pruebas. |
| Pérdida de datos locales | Export JSON antes + script de import. IndexedDB no se borra hasta confirmar. |
| Exponer secretos | Solo `anon key` (pública por diseño); `service key` nunca. `.gitignore` ya cubre `.env`/`config.local.js`. |

## 11. Qué necesito de ti para ejecutar

1. Una **cuenta + proyecto Supabase** (gratis): me pasas **Project URL** + **anon public key** (las pongo en `config.local.js`, no al repo).
2. Definir el **primer usuario admin** (tu email).
3. (Opcional) Confirmar las **áreas** definitivas para el enum (`area_t`): hoy propongo comercial, finanzas, desarrollo, rrhh, operaciones, tecnología, ventas.

## 12. Qué fases cierra este backbone

- **Fase 3** (correlativos) ✅ por diseño.
- Habilita **Fase 4** (leads multi-origen + scoring + responsable), **Fase 5** (pipeline sync + audit), **Fase 10** (facturación), **Fase 12** (roles/permisos/auditoría).
- Resuelve los **críticos C1 (funnel) y C2 (login/datos compartidos)** de la auditoría.
