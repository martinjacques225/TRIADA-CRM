-- ═══════════════════════════════════════════════════════════════════════════
-- ERP Tríada · F0 · Cimientos  (aditivo e idempotente — no destruye datos)
-- ───────────────────────────────────────────────────────────────────────────
-- Pone dos capas:
--   (A) permisos ERP  → columna erp_role + helpers de capacidad + guard anti-escalada
--   (B) config/template por tenant → tabla org_settings (la "moldeabilidad" del
--       ERP estándar vendible: branding, terminología, campos custom, módulos on/off,
--       y tenant_tipo = 'interno' (Tríada) vs 'cliente').
-- Rollback: supabase/erp_core_rollback.sql
-- Aplicada por el MCP de Supabase el 2026-07-07 (migración erp_f0_core).
-- ═══════════════════════════════════════════════════════════════════════════

-- (A.1) Rol de capacidad ERP — SEPARADO de user_role (admin/consultor), que no se toca.
do $$ begin
  if not exists (select 1 from pg_type where typname = 'erp_role_t') then
    create type public.erp_role_t as enum ('gerencia','finanzas','operaciones','colaborador');
  end if;
end $$;

alter table public.profiles add column if not exists erp_role public.erp_role_t;  -- NULL = acceso mínimo

-- (A.2) Helpers de capacidad. SECURITY INVOKER a propósito: leen el propio perfil del
--       usuario (permitido por profiles_read_org) → cero recursión de RLS y CERO
--       advisor nuevo de "definer ejecutable". coalesce(activo,true): un desactivado
--       con token vivo pierde el acceso.
create or replace function public.is_gerencia() returns boolean
  language sql stable security invoker set search_path = public as $$
  select exists(select 1 from public.profiles p
                where p.id = auth.uid() and coalesce(p.activo,true)
                  and (p.role = 'admin' or p.erp_role = 'gerencia'))
$$;

create or replace function public.is_finanzas() returns boolean
  language sql stable security invoker set search_path = public as $$
  select exists(select 1 from public.profiles p
                where p.id = auth.uid() and coalesce(p.activo,true)
                  and (p.role = 'admin' or p.erp_role = 'finanzas'))
$$;

create or replace function public.can_ver_finanzas() returns boolean
  language sql stable security invoker set search_path = public as $$
  select exists(select 1 from public.profiles p
                where p.id = auth.uid() and coalesce(p.activo,true)
                  and (p.role = 'admin' or p.erp_role in ('gerencia','finanzas')))
$$;

create or replace function public.can_ver_nomina() returns boolean
  language sql stable security invoker set search_path = public as $$
  select exists(select 1 from public.profiles p
                where p.id = auth.uid() and coalesce(p.activo,true)
                  and (p.role = 'admin' or p.erp_role in ('gerencia','finanzas')))
$$;

revoke execute on function
  public.is_gerencia(), public.is_finanzas(),
  public.can_ver_finanzas(), public.can_ver_nomina() from anon;

-- (A.3) Anti-escalada: erp_role SOLO lo cambia un admin (extiende el guard existente).
--       Sin esto, un colaborador haría `update profiles set erp_role='gerencia'` y vería finanzas/nómina.
create or replace function public.guard_profile_privesc() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if (new.role     is distinct from old.role
   or new.org_id   is distinct from old.org_id
   or new.activo   is distinct from old.activo
   or new.erp_role is distinct from old.erp_role) and not is_admin() then
     raise exception 'no autorizado: solo un admin puede cambiar role/org/activo/erp_role';
  end if;
  return new;
end $$;

-- (B) Config / template por tenant — la capa que hace el ERP "estándar pero moldeable".
create table if not exists public.org_settings (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null unique references public.orgs(id) on delete cascade,  -- 1 fila por org; id surrogado para audit_row()
  display_name  text,
  tenant_tipo   text not null default 'cliente',   -- 'interno' (Tríada, uso diario) | 'cliente' (vendido)
  plan          text not null default 'opera',     -- pack comercial (opera / escala / plataforma)
  moneda        text not null default 'CLP',
  locale        text not null default 'es-CL',
  branding      jsonb not null default '{}'::jsonb, -- {logo, colores...} por tenant
  terminologia  jsonb not null default '{}'::jsonb, -- labels moldeables ("cliente"->"paciente", etc.)
  custom_fields jsonb not null default '{}'::jsonb, -- campos propios por entidad
  modulos       jsonb not null default '{}'::jsonb, -- enablement por módulo: {"gastos":{"on":true}}
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.org_settings enable row level security;

drop policy if exists org_settings_read on public.org_settings;
create policy org_settings_read on public.org_settings
  for select to authenticated using (org_id = (select auth_org_id()));

drop policy if exists org_settings_ins on public.org_settings;
create policy org_settings_ins on public.org_settings
  for insert to authenticated with check (org_id = (select auth_org_id()) and (select is_admin()));

drop policy if exists org_settings_upd on public.org_settings;
create policy org_settings_upd on public.org_settings
  for update to authenticated
  using (org_id = (select auth_org_id()) and (select is_admin()))
  with check (org_id = (select auth_org_id()) and (select is_admin()));

drop trigger if exists trg_orgset_org on public.org_settings;
create trigger trg_orgset_org before insert on public.org_settings
  for each row execute function public.set_org_id();

drop trigger if exists trg_orgset_upd on public.org_settings;
create trigger trg_orgset_upd before update on public.org_settings
  for each row execute function public.set_updated_at();

drop trigger if exists trg_orgset_audit on public.org_settings;
create trigger trg_orgset_audit after insert or update or delete on public.org_settings
  for each row execute function public.audit_row();

-- (B.1) Semilla del tenant interno (Tríada = tenant #1). Idempotente.
insert into public.org_settings (org_id, display_name, tenant_tipo, plan)
values ('756221c3-97af-4569-a36e-6a4e0318290f', 'Tríada Consultoría', 'interno', 'plataforma')
on conflict (org_id) do nothing;
