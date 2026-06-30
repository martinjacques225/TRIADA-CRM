-- ============================================================
-- biblioteca.sql — BIBLIOTECA DE DOCUMENTOS (M4 "Bóveda" del Plan Maestro)
-- Repositorio documental compartido de la organización.
--   · Metadatos en public.documentos (RLS multitenant, patrón de la casa).
--   · Archivo en el bucket PRIVADO 'biblioteca' bajo {org_id}/{uuid}.{ext}.
--   · Leer + subir = cualquier miembro de la org. Borrar = solo admin.
-- Idempotente: se puede correr varias veces sin romper nada.
-- Aplicada vía Supabase MCP el 2026-06-30 (migración biblioteca_documentos).
-- ============================================================

-- 1) Tabla de metadatos
create table if not exists public.documentos (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.orgs(id) on delete cascade,
  nombre       text not null,
  descripcion  text,
  categoria    text not null default 'General',
  storage_path text not null,
  mime_type    text,
  size_bytes   bigint,
  subido_por   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.documentos
  alter column subido_por set default auth.uid();

-- 2) Auto-stamp de org_id (mismo trigger que el resto del CRM, ver multitenancy.sql)
drop trigger if exists trg_documentos_org on public.documentos;
create trigger trg_documentos_org
  before insert on public.documentos
  for each row execute function public.set_org_id();

-- 3) Índices (patrón indices.sql)
create index if not exists idx_documentos_org_created   on public.documentos (org_id, created_at desc);
create index if not exists idx_documentos_org_categoria on public.documentos (org_id, categoria);

-- 4) RLS multitenant (subselect = cache InitPlan, patrón rls_perf.sql)
alter table public.documentos enable row level security;

drop policy if exists documentos_select on public.documentos;
create policy documentos_select on public.documentos
  for select to authenticated
  using (org_id = (select public.auth_org_id()));

drop policy if exists documentos_insert on public.documentos;
create policy documentos_insert on public.documentos
  for insert to authenticated
  with check (org_id = (select public.auth_org_id()));

drop policy if exists documentos_update on public.documentos;
create policy documentos_update on public.documentos
  for update to authenticated
  using (org_id = (select public.auth_org_id()))
  with check (org_id = (select public.auth_org_id()));

-- Borrar = solo admin (protección anti-pérdida del repositorio compartido)
drop policy if exists documentos_delete on public.documentos;
create policy documentos_delete on public.documentos
  for delete to authenticated
  using (org_id = (select public.auth_org_id()) and (select public.is_admin()));

-- ============================================================
-- 5) Storage privado: bucket 'biblioteca'
--    Ruta: {org_id}/{uuid}.{ext}  → RLS por 1er folder = org del usuario.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('biblioteca', 'biblioteca', false)
on conflict (id) do nothing;

drop policy if exists biblioteca_select on storage.objects;
create policy biblioteca_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'biblioteca'
    and (storage.foldername(name))[1] = (select public.auth_org_id())::text
  );

drop policy if exists biblioteca_insert on storage.objects;
create policy biblioteca_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'biblioteca'
    and (storage.foldername(name))[1] = (select public.auth_org_id())::text
  );

drop policy if exists biblioteca_update on storage.objects;
create policy biblioteca_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'biblioteca'
    and (storage.foldername(name))[1] = (select public.auth_org_id())::text
  );

drop policy if exists biblioteca_delete on storage.objects;
create policy biblioteca_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'biblioteca'
    and (storage.foldername(name))[1] = (select public.auth_org_id())::text
    and (select public.is_admin())
  );
