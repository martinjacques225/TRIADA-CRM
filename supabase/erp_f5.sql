-- ═══════════════════════════════════════════════════════════════════════════
-- ERP Tríada · F5 · Hardening + activos/licencias  (aditivo/idempotente)
-- ───────────────────────────────────────────────────────────────────────────
-- 1) org_id NOT NULL en todas las tablas del ERP + proyectos/tareas del M5.
--    Verificado ANTES: 0 filas con org_id nulo en las 8 tablas (el trigger
--    set_org_id lo estampa en cada insert). Cierra el residuo que quedó de F0a.
-- 2) activos_licencias: tracker de SaaS/licencias de la org (confidencial).
-- Aplicada por el MCP el 2026-07-07 (migración erp_f5_hardening_activos).
-- Rollback: supabase/erp_f5_rollback.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Invariante multi-tenant: ninguna fila sin organización.
alter table public.proyectos              alter column org_id set not null;
alter table public.tareas                 alter column org_id set not null;
alter table public.horas                  alter column org_id set not null;
alter table public.gastos                 alter column org_id set not null;
alter table public.movimientos            alter column org_id set not null;
alter table public.proveedores            alter column org_id set not null;
alter table public.ordenes_compra         alter column org_id set not null;
alter table public.parametros_tributarios alter column org_id set not null;

-- 2) ACTIVOS / LICENCIAS — SaaS y licencias de la org. CONFIDENCIAL (finanzas).
create table if not exists public.activos_licencias (
  id               uuid primary key default gen_random_uuid(),
  codigo           text unique,
  org_id           uuid not null,
  nombre           text not null,
  tipo             text,                       -- saas / hardware / licencia
  costo_mensual    numeric not null default 0,
  fecha_renovacion date,
  estado           text not null default 'activo' check (estado in ('activo','cancelado')),
  notas            text,
  created_by       uuid,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

drop trigger if exists trg_act_codigo on public.activos_licencias;
create trigger trg_act_codigo before insert on public.activos_licencias for each row execute function set_codigo('ACT');
drop trigger if exists trg_act_org on public.activos_licencias;
create trigger trg_act_org before insert on public.activos_licencias for each row execute function set_org_id();
drop trigger if exists trg_act_upd on public.activos_licencias;
create trigger trg_act_upd before update on public.activos_licencias for each row execute function set_updated_at();
drop trigger if exists trg_act_audit on public.activos_licencias;
create trigger trg_act_audit after insert or update or delete on public.activos_licencias for each row execute function audit_row();

create index if not exists idx_act_org on public.activos_licencias(org_id);

alter table public.activos_licencias enable row level security;
drop policy if exists activos_finanzas on public.activos_licencias;
create policy activos_finanzas on public.activos_licencias for all to authenticated
  using (org_id = (select auth_org_id()) and (select can_ver_finanzas()))
  with check (org_id = (select auth_org_id()) and (select can_ver_finanzas()));

-- 3) Gate del audit: sumar activos_licencias a las entidades confidenciales.
drop policy if exists actividad_read_org on public.actividad;
create policy actividad_read_org on public.actividad for select to authenticated
  using (
    org_id = (select auth_org_id())
    and (entidad not in ('gastos','movimientos','parametros_tributarios','remuneraciones','empleados','proveedores','ordenes_compra','activos_licencias')
         or (select can_ver_finanzas()))
  );

-- 4) Semilla correlativo ACT
insert into public.correlativos (tipo, ultimo)
select 'ACT', 0 where not exists (select 1 from public.correlativos c where c.tipo = 'ACT');
