-- ============================================================
-- TRIADA CRM · Esquema Supabase (Postgres)
-- Pegar y ejecutar en: Supabase → SQL Editor → New query → Run
-- Es la migración inicial (primera corrida). Ver docs/SUPABASE_PLAN.md
-- ============================================================

-- ---------- ENUMS ----------
create type user_role   as enum ('admin','consultor');
create type area_t      as enum ('comercial','finanzas','desarrollo','rrhh','operaciones','tecnologia','ventas');
create type lead_origen as enum ('manual','landing','meta_ads','google_ads','whatsapp','referido');
create type lead_estado as enum ('Nuevo','Contactado','Diagnóstico Agendado','Diagnóstico Realizado','Propuesta Enviada','Negociando','Cliente','Descartado');
create type lead_score  as enum ('caliente','tibio','frio');
create type diag_estado as enum ('borrador','en_revision','aprobado','rechazado');
create type prop_estado as enum ('borrador','enviada','negociando','aceptada','rechazada');
create type fact_estado as enum ('pendiente','parcial','pagado','vencido');

-- ---------- PERFILES (extiende auth.users) ----------
create table profiles (
  id         uuid primary key references auth.users on delete cascade,
  nombre     text,
  email      text,
  role       user_role not null default 'consultor',
  area       area_t,
  activo     boolean default true,
  created_at timestamptz default now()
);

-- Crea el profile automáticamente al registrarse un usuario
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, nombre)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nombre', new.email));
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- CORRELATIVOS (Fase 3) ----------
create table correlativos ( tipo text primary key, ultimo int not null default 0 );
insert into correlativos(tipo) values ('CLI'),('LEAD'),('DIA'),('PROP'),('FAC'),('PROJ');

create or replace function next_correlativo(p_tipo text) returns text
language plpgsql as $$
declare n int;
begin
  update correlativos set ultimo = ultimo + 1 where tipo = p_tipo returning ultimo into n;
  return p_tipo || '-' || lpad(n::text, 6, '0');
end; $$;

-- Asigna el código en el INSERT: trigger set_codigo('PREFIJO')
create or replace function set_codigo() returns trigger
language plpgsql as $$
begin
  if new.codigo is null then new.codigo := next_correlativo(tg_argv[0]); end if;
  return new;
end; $$;

-- updated_at automático
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ---------- LEADS (captación / pipeline) ----------
create table leads (
  id              uuid primary key default gen_random_uuid(),
  codigo          text unique,
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
create trigger trg_lead_codigo  before insert on leads for each row execute function set_codigo('LEAD');
create trigger trg_lead_updated before update on leads for each row execute function set_updated_at();

-- ---------- CLIENTES (lead ganado) ----------
create table clientes (
  id           uuid primary key default gen_random_uuid(),
  codigo       text unique,
  lead_id      uuid references leads(id),
  razon_social text, rut text, giro text, direccion text,
  responsable  uuid references profiles(id),
  created_at   timestamptz default now()
);
create trigger trg_cli_codigo before insert on clientes for each row execute function set_codigo('CLI');

-- ---------- DIAGNÓSTICOS ----------
create table diagnosticos (
  id           uuid primary key default gen_random_uuid(),
  codigo       text unique,
  lead_id      uuid references leads(id),
  scores       jsonb,
  hallazgos    jsonb,
  oportunidades jsonb,
  estado       diag_estado default 'borrador',
  responsable  uuid references profiles(id),
  created_at   timestamptz default now()
);
create trigger trg_dia_codigo before insert on diagnosticos for each row execute function set_codigo('DIA');

-- ---------- PROPUESTAS ----------
create table propuestas (
  id          uuid primary key default gen_random_uuid(),
  codigo      text unique,
  lead_id     uuid references leads(id),
  cliente_id  uuid references clientes(id),
  servicios   jsonb,
  valor       numeric,
  estado      prop_estado default 'borrador',
  vigencia    date,
  notas       text,
  created_at  timestamptz default now()
);
create trigger trg_prop_codigo before insert on propuestas for each row execute function set_codigo('PROP');

-- ---------- CITAS (agenda) ----------
create table citas (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid references leads(id),
  titulo text, tipo text, estado text,
  fecha date, hora time, lugar text, notas text,
  responsable uuid references profiles(id),
  created_at  timestamptz default now()
);

-- ---------- SERVICIOS (catálogo, Fase 8) ----------
create table servicios (
  id uuid primary key default gen_random_uuid(),
  codigo text unique, nombre text, area area_t,
  precio_base numeric, horas int, complejidad text, margen numeric,
  activo boolean default true
);

-- ---------- FACTURAS (Fase 10) ----------
create table facturas (
  id          uuid primary key default gen_random_uuid(),
  codigo      text unique,
  cliente_id  uuid references clientes(id),
  monto       numeric, pagado numeric default 0,
  estado      fact_estado default 'pendiente',
  emision date, vencimiento date,
  created_at  timestamptz default now()
);
create trigger trg_fac_codigo before insert on facturas for each row execute function set_codigo('FAC');

-- ---------- ACTIVIDAD (audit log, Fases 5/12) ----------
create table actividad (
  id         bigint generated always as identity primary key,
  entidad    text, entidad_id uuid, accion text,
  usuario    uuid references profiles(id), payload jsonb,
  ts         timestamptz default now()
);

-- ============================================================
-- RLS (Row Level Security) — "acceso compartido + login"
-- Cualquier usuario autenticado lee/escribe todo.
-- El público (landing, anon) SOLO puede insertar leads.
-- ============================================================
alter table profiles     enable row level security;
alter table leads        enable row level security;
alter table clientes     enable row level security;
alter table diagnosticos enable row level security;
alter table propuestas   enable row level security;
alter table citas        enable row level security;
alter table servicios    enable row level security;
alter table facturas     enable row level security;
alter table actividad    enable row level security;

create policy profiles_read on profiles for select to authenticated using (true);
create policy profiles_self on profiles for update to authenticated using (id = auth.uid());

create policy leads_auth_all   on leads for all to authenticated using (true) with check (true);
create policy leads_public_ins on leads for insert to anon with check (origen = 'landing');

create policy clientes_auth_all     on clientes     for all to authenticated using (true) with check (true);
create policy diagnosticos_auth_all on diagnosticos for all to authenticated using (true) with check (true);
create policy propuestas_auth_all   on propuestas   for all to authenticated using (true) with check (true);
create policy citas_auth_all        on citas        for all to authenticated using (true) with check (true);
create policy servicios_auth_all    on servicios    for all to authenticated using (true) with check (true);
create policy facturas_auth_all     on facturas     for all to authenticated using (true) with check (true);
create policy actividad_auth_all    on actividad    for all to authenticated using (true) with check (true);

-- ============================================================
-- LISTO. Próximo paso: crear tu usuario admin (Auth → Add user),
-- luego en SQL:  update profiles set role='admin' where email='TU_EMAIL';
-- ============================================================
