-- ═══════════════════════════════════════════════════════════════════════════
-- ERP Tríada · F2 · Caja (movimientos) + Parámetros tributarios  (aditivo/idempotente)
-- + FIX de confidencialidad: gatea el log `actividad` para que las entidades
--   confidenciales (gastos/movimientos/nómina) solo las vea finanzas (corrige F1).
-- Aplicada por el MCP el 2026-07-07 (migración erp_f2_caja_parametros).
-- Rollback: supabase/erp_f2_rollback.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) MOVIMIENTOS — libro de caja real (tesorería). CONFIDENCIAL (finanzas).
--    Origen con FK REAL (no polimórfico): factura_id (AR) / gasto_id (AP).
create table if not exists public.movimientos (
  id           uuid primary key default gen_random_uuid(),
  codigo       text unique,
  org_id       uuid,
  tipo         text not null check (tipo in ('ingreso','egreso')),
  fecha_real   date not null default current_date,
  monto        numeric not null default 0,
  medio        text,
  descripcion  text,
  proyecto_id  uuid references public.proyectos(id) on delete set null,
  factura_id   uuid references public.facturas(id)  on delete set null,
  gasto_id     uuid references public.gastos(id)    on delete set null,
  created_by   uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- 2) PARÁMETROS TRIBUTARIOS — UF/UTM/topes/tasas editables por finanzas (sin API SII).
create table if not exists public.parametros_tributarios (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid,
  periodo            text not null,               -- 'YYYY-MM'
  uf                 numeric,
  utm                numeric,
  imm                numeric,                     -- ingreso mínimo mensual
  tope_imponible     numeric,
  tope_gratificacion numeric,
  pct_ppm            numeric,
  pct_retencion      numeric,
  created_by         uuid,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (org_id, periodo)
);

-- 3) Triggers
drop trigger if exists trg_mov_codigo on public.movimientos;
create trigger trg_mov_codigo before insert on public.movimientos for each row execute function set_codigo('MOV');
drop trigger if exists trg_mov_org on public.movimientos;
create trigger trg_mov_org before insert on public.movimientos for each row execute function set_org_id();
drop trigger if exists trg_mov_upd on public.movimientos;
create trigger trg_mov_upd before update on public.movimientos for each row execute function set_updated_at();
drop trigger if exists trg_mov_audit on public.movimientos;
create trigger trg_mov_audit after insert or update or delete on public.movimientos for each row execute function audit_row();

drop trigger if exists trg_ptrib_org on public.parametros_tributarios;
create trigger trg_ptrib_org before insert on public.parametros_tributarios for each row execute function set_org_id();
drop trigger if exists trg_ptrib_upd on public.parametros_tributarios;
create trigger trg_ptrib_upd before update on public.parametros_tributarios for each row execute function set_updated_at();
drop trigger if exists trg_ptrib_audit on public.parametros_tributarios;
create trigger trg_ptrib_audit after insert or update or delete on public.parametros_tributarios for each row execute function audit_row();

-- 4) Índices
create index if not exists idx_mov_org_fecha    on public.movimientos(org_id, fecha_real desc);
create index if not exists idx_mov_proyecto     on public.movimientos(proyecto_id);
create index if not exists idx_ptrib_org_periodo on public.parametros_tributarios(org_id, periodo);

-- 5) RLS — ambas confidenciales (finanzas)
alter table public.movimientos enable row level security;
drop policy if exists movimientos_finanzas on public.movimientos;
create policy movimientos_finanzas on public.movimientos for all to authenticated
  using (org_id = (select auth_org_id()) and (select can_ver_finanzas()))
  with check (org_id = (select auth_org_id()) and (select can_ver_finanzas()));

alter table public.parametros_tributarios enable row level security;
drop policy if exists ptrib_finanzas on public.parametros_tributarios;
create policy ptrib_finanzas on public.parametros_tributarios for all to authenticated
  using (org_id = (select auth_org_id()) and (select can_ver_finanzas()))
  with check (org_id = (select auth_org_id()) and (select can_ver_finanzas()));

-- 6) FIX de confidencialidad del audit (corrige también los gastos de F1):
--    el log `actividad` no debe filtrar montos de entidades confidenciales a no-finanzas.
drop policy if exists actividad_read_org on public.actividad;
create policy actividad_read_org on public.actividad for select to authenticated
  using (
    org_id = (select auth_org_id())
    and (entidad not in ('gastos','movimientos','parametros_tributarios','remuneraciones','empleados')
         or (select can_ver_finanzas()))
  );

-- 7) Semilla correlativo MOV
insert into public.correlativos (tipo, ultimo)
select 'MOV', 0 where not exists (select 1 from public.correlativos c where c.tipo = 'MOV');
