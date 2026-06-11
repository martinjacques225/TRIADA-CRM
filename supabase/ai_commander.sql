-- ============================================================
-- TRIADA CRM · Módulo AI Commander — Esquema Supabase (Postgres)
-- Gestión de proyectos internos de desarrollo asistido por IA.
--
-- Migración INCREMENTAL. Requiere haber corrido antes `supabase/schema.sql`
-- (usa sus funciones next_correlativo / set_codigo / set_updated_at y la
--  tabla `actividad`, `profiles`, `clientes`, el enum `area_t`).
-- Pegar y ejecutar en: Supabase → SQL Editor → New query → Run.
--
-- Es idempotente: se puede correr más de una vez sin error.
-- Ver docs/AI_COMMANDER.md para el diseño (Clean Architecture).
-- ============================================================

-- ---------- ENUMS (idempotentes) ----------
do $$ begin
  create type proj_estado as enum ('activo','pausado','completado','archivado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_estado as enum ('backlog','por_hacer','en_progreso','en_revision','hecho');
exception when duplicate_object then null; end $$;

do $$ begin
  create type prioridad_t as enum ('baja','media','alta','urgente');
exception when duplicate_object then null; end $$;

-- Proveedor de IA: solo metadato. Hoy NO se llama a ninguna API.
do $$ begin
  create type ai_provider_t as enum ('anthropic','openai','google','local','otro');
exception when duplicate_object then null; end $$;

-- Estado de una respuesta de IA. 'no_conectado' = arquitectura lista, sin backend IA aún.
do $$ begin
  create type ai_resp_estado as enum ('pendiente','no_conectado','completado','error');
exception when duplicate_object then null; end $$;

-- ---------- CORRELATIVOS ----------
-- 'PROJ' ya se insertó en schema.sql; agregamos 'TASK' y 'PRMT'. Idempotente.
insert into correlativos(tipo) values ('PROJ'),('TASK'),('PRMT')
  on conflict (tipo) do nothing;

-- ============================================================
-- TABLAS
-- Nota multiempresa (futura): cada tabla lleva `org_id` (nullable hoy, 1 sola
-- org). Cuando se active multi-tenant basta poblarlo y endurecer las policies
-- (ver bloque RLS al final). No requiere rehacer el esquema.
-- ============================================================

-- ---------- PROYECTOS ----------
create table if not exists proyectos (
  id            uuid primary key default gen_random_uuid(),
  codigo        text unique,                       -- PROJ-000001 (trigger)
  org_id        uuid,                              -- multiempresa futura
  nombre        text not null,
  descripcion   text,
  objetivo      text,
  estado        proj_estado not null default 'activo',
  prioridad     prioridad_t not null default 'media',
  area          area_t,                            -- reutiliza el enum del CRM
  cliente_id    uuid references clientes(id) on delete set null,  -- null = proyecto interno
  responsable   uuid references profiles(id),
  repo_url      text,
  stack         jsonb default '[]'::jsonb,         -- ["JS","Supabase",...]
  fecha_inicio  date,
  fecha_objetivo date,
  progreso      int not null default 0,            -- 0-100 (cache; se recalcula desde tareas)
  created_by    uuid references profiles(id),
  updated_by    uuid references profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------- TAREAS ----------
create table if not exists tareas (
  id              uuid primary key default gen_random_uuid(),
  codigo          text unique,                     -- TASK-000001 (trigger)
  org_id          uuid,                            -- multiempresa futura
  proyecto_id     uuid not null references proyectos(id) on delete cascade,
  titulo          text not null,
  descripcion     text,
  estado          task_estado not null default 'backlog',   -- columna del kanban
  prioridad       prioridad_t not null default 'media',
  asignado        uuid references profiles(id),
  etiquetas       jsonb default '[]'::jsonb,
  estimacion_horas numeric,
  orden           int not null default 0,          -- orden dentro de la columna
  ai_asistida     boolean not null default false,  -- ¿se usó IA en esta tarea?
  created_by      uuid references profiles(id),
  updated_by      uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------- AI PROMPTS (Prompt Builder) ----------
create table if not exists ai_prompts (
  id            uuid primary key default gen_random_uuid(),
  codigo        text unique,                       -- PRMT-000001 (trigger)
  org_id        uuid,                              -- multiempresa futura
  proyecto_id   uuid references proyectos(id) on delete set null,
  tarea_id      uuid references tareas(id) on delete set null,
  titulo        text,
  rol           text,                              -- plantilla: arquitecto/desarrollador/...
  plantilla     text,                              -- id de la plantilla usada
  contenido     text not null,                     -- el prompt compuesto
  variables     jsonb default '{}'::jsonb,         -- variables rellenadas
  provider      ai_provider_t default 'anthropic', -- proveedor previsto (metadato)
  modelo        text,                              -- modelo previsto (metadato)
  parametros    jsonb default '{}'::jsonb,         -- {effort, max_tokens, ...} (metadato)
  created_by    uuid references profiles(id),
  created_at    timestamptz not null default now()
);

-- ---------- AI RESPONSES (Historial de respuestas IA) ----------
create table if not exists ai_responses (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid,                              -- multiempresa futura
  prompt_id     uuid references ai_prompts(id) on delete cascade,
  proyecto_id   uuid references proyectos(id) on delete set null,
  provider      ai_provider_t,
  modelo        text,
  estado        ai_resp_estado not null default 'pendiente',
  contenido     text,                              -- texto de la respuesta (null hoy)
  tokens_entrada int,
  tokens_salida  int,
  costo         numeric,
  latencia_ms   int,
  error         text,
  metadata      jsonb default '{}'::jsonb,         -- payload crudo del proveedor (futuro)
  created_by    uuid references profiles(id),
  created_at    timestamptz not null default now()
);

-- ---------- TRIGGERS: correlativos + updated_at ----------
drop trigger if exists trg_proj_codigo  on proyectos;
create trigger trg_proj_codigo  before insert on proyectos for each row execute function set_codigo('PROJ');
drop trigger if exists trg_proj_updated on proyectos;
create trigger trg_proj_updated before update on proyectos for each row execute function set_updated_at();

drop trigger if exists trg_task_codigo  on tareas;
create trigger trg_task_codigo  before insert on tareas for each row execute function set_codigo('TASK');
drop trigger if exists trg_task_updated on tareas;
create trigger trg_task_updated before update on tareas for each row execute function set_updated_at();

drop trigger if exists trg_prmt_codigo  on ai_prompts;
create trigger trg_prmt_codigo  before insert on ai_prompts for each row execute function set_codigo('PRMT');

-- ---------- ÍNDICES ----------
create index if not exists idx_proyectos_estado     on proyectos(estado);
create index if not exists idx_proyectos_org        on proyectos(org_id);
create index if not exists idx_proyectos_cliente    on proyectos(cliente_id);
create index if not exists idx_tareas_proyecto      on tareas(proyecto_id);
create index if not exists idx_tareas_estado_orden  on tareas(proyecto_id, estado, orden);
create index if not exists idx_tareas_org           on tareas(org_id);
create index if not exists idx_prompts_proyecto     on ai_prompts(proyecto_id);
create index if not exists idx_responses_prompt     on ai_responses(prompt_id);
create index if not exists idx_responses_created    on ai_responses(created_at desc);

-- ============================================================
-- AUDITORÍA COMPLETA (defense-in-depth)
-- Trigger a nivel de BD: cualquier INSERT/UPDATE/DELETE en las tablas del
-- módulo deja rastro en `actividad`, no se puede saltar desde el cliente.
-- La app además registra eventos semánticos ("tarea movida", "prompt ejecutado")
-- mediante AuditPort → misma tabla, con verbos en notación punto (proyecto.crear).
-- ============================================================
create or replace function aic_audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_row jsonb;
  v_id  uuid;
begin
  if (tg_op = 'DELETE') then
    v_row := to_jsonb(old);
    v_id  := old.id;
  else
    v_row := to_jsonb(new);
    v_id  := new.id;
  end if;
  insert into actividad (entidad, entidad_id, accion, usuario, payload)
  values (tg_table_name, v_id, lower(tg_op), auth.uid(), v_row);
  return coalesce(new, old);
end; $$;

drop trigger if exists trg_proj_audit on proyectos;
create trigger trg_proj_audit after insert or update or delete on proyectos
  for each row execute function aic_audit_row();
drop trigger if exists trg_task_audit on tareas;
create trigger trg_task_audit after insert or update or delete on tareas
  for each row execute function aic_audit_row();
drop trigger if exists trg_prmt_audit on ai_prompts;
create trigger trg_prmt_audit after insert or update or delete on ai_prompts
  for each row execute function aic_audit_row();
drop trigger if exists trg_resp_audit on ai_responses;
create trigger trg_resp_audit after insert or update or delete on ai_responses
  for each row execute function aic_audit_row();

-- ============================================================
-- RLS — mismo modelo que el resto del CRM:
-- "acceso compartido + login" → cualquier usuario autenticado lee/escribe todo.
-- ============================================================
alter table proyectos    enable row level security;
alter table tareas       enable row level security;
alter table ai_prompts   enable row level security;
alter table ai_responses enable row level security;

drop policy if exists proyectos_auth_all    on proyectos;
create policy proyectos_auth_all    on proyectos    for all to authenticated using (true) with check (true);
drop policy if exists tareas_auth_all       on tareas;
create policy tareas_auth_all       on tareas       for all to authenticated using (true) with check (true);
drop policy if exists ai_prompts_auth_all   on ai_prompts;
create policy ai_prompts_auth_all   on ai_prompts   for all to authenticated using (true) with check (true);
drop policy if exists ai_responses_auth_all on ai_responses;
create policy ai_responses_auth_all on ai_responses for all to authenticated using (true) with check (true);

-- --- Multiempresa futura (cuando se active) ---------------------------------
-- Reemplazar las policies de arriba por algo como:
--   create policy proyectos_org on proyectos for all to authenticated
--     using  (org_id = (select org_id from profiles where id = auth.uid()))
--     with check (org_id = (select org_id from profiles where id = auth.uid()));
-- (requiere agregar profiles.org_id). No toca el front: db.js sigue igual.

-- ============================================================
-- LISTO. El módulo AI Commander aparecerá en el menú del CRM.
-- Hasta correr esto, el módulo se degrada con un aviso "ejecuta la migración".
-- ============================================================
