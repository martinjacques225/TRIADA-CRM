-- ═══════════════════════════════════════════════════════════════════════════
-- ERP Tríada · F1 · Proyectos operativos + Horas + Gastos  (aditivo/idempotente)
-- ───────────────────────────────────────────────────────────────────────────
-- Base de "el ERP del lunes": convertir cliente→proyecto, registrar horas y gastos,
-- y medir rentabilidad. `gastos` es dato CONFIDENCIAL → RLS gateada a can_ver_finanzas().
-- Aplicada por el MCP el 2026-07-07 (migración erp_f1_horas_gastos).
-- Rollback: supabase/erp_f1_rollback.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Campos operativos/financieros en proyectos (base de la rentabilidad)
alter table public.proyectos add column if not exists tipo text;
alter table public.proyectos add column if not exists tarifa numeric;                -- CLP por hora
alter table public.proyectos add column if not exists presupuesto_horas numeric;
alter table public.proyectos add column if not exists presupuesto_monto numeric;     -- ingreso comprometido (CLP)
alter table public.proyectos add column if not exists facturable boolean not null default true;

-- 2) HORAS (timesheet) — materia prima de rentabilidad y carga
create table if not exists public.horas (
  id           uuid primary key default gen_random_uuid(),
  codigo       text unique,
  org_id       uuid,
  proyecto_id  uuid not null references public.proyectos(id) on delete cascade,
  tarea_id     uuid references public.tareas(id) on delete set null,
  profile_id   uuid references public.profiles(id) on delete set null,
  fecha        date not null default current_date,
  horas        numeric not null check (horas > 0 and horas <= 24),
  facturable   boolean not null default true,
  nota         text,
  created_by   uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- 3) GASTOS (cuentas por pagar / egresos) — CONFIDENCIAL (finanzas)
create table if not exists public.gastos (
  id           uuid primary key default gen_random_uuid(),
  codigo       text unique,
  org_id       uuid,
  proyecto_id  uuid references public.proyectos(id) on delete set null,   -- null = gasto general
  categoria    text,
  descripcion  text,
  neto         numeric not null default 0,
  iva          numeric not null default 0,
  total        numeric not null default 0,
  estado       text not null default 'pendiente' check (estado in ('pendiente','pagado')),
  fecha        date not null default current_date,
  vencimiento  date,
  doc_id       uuid references public.documentos(id) on delete set null,  -- adjunto en la Bóveda (M4)
  created_by   uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- 4) Triggers: correlativo (HOR-/GAS-) + org + updated_at + audit
drop trigger if exists trg_horas_codigo on public.horas;
create trigger trg_horas_codigo before insert on public.horas for each row execute function set_codigo('HOR');
drop trigger if exists trg_horas_org on public.horas;
create trigger trg_horas_org before insert on public.horas for each row execute function set_org_id();
drop trigger if exists trg_horas_upd on public.horas;
create trigger trg_horas_upd before update on public.horas for each row execute function set_updated_at();
drop trigger if exists trg_horas_audit on public.horas;
create trigger trg_horas_audit after insert or update or delete on public.horas for each row execute function audit_row();

drop trigger if exists trg_gastos_codigo on public.gastos;
create trigger trg_gastos_codigo before insert on public.gastos for each row execute function set_codigo('GAS');
drop trigger if exists trg_gastos_org on public.gastos;
create trigger trg_gastos_org before insert on public.gastos for each row execute function set_org_id();
drop trigger if exists trg_gastos_upd on public.gastos;
create trigger trg_gastos_upd before update on public.gastos for each row execute function set_updated_at();
drop trigger if exists trg_gastos_audit on public.gastos;
create trigger trg_gastos_audit after insert or update or delete on public.gastos for each row execute function audit_row();

-- 5) Índices (paginación keyset + org)
create index if not exists idx_horas_org_fecha  on public.horas(org_id, fecha desc);
create index if not exists idx_horas_proyecto   on public.horas(proyecto_id);
create index if not exists idx_gastos_org_fecha on public.gastos(org_id, fecha desc);
create index if not exists idx_gastos_proyecto  on public.gastos(proyecto_id);

-- 6) RLS — horas por org; gastos org + confidencial (admin/gerencia/finanzas)
alter table public.horas enable row level security;
drop policy if exists horas_org on public.horas;
create policy horas_org on public.horas for all to authenticated
  using (org_id = (select auth_org_id())) with check (org_id = (select auth_org_id()));

alter table public.gastos enable row level security;
drop policy if exists gastos_finanzas on public.gastos;
create policy gastos_finanzas on public.gastos for all to authenticated
  using (org_id = (select auth_org_id()) and (select can_ver_finanzas()))
  with check (org_id = (select auth_org_id()) and (select can_ver_finanzas()));

-- 7) Semilla de correlativos HOR/GAS (idempotente)
insert into public.correlativos (tipo, ultimo)
select v.t, 0 from (values ('HOR'),('GAS')) v(t)
where not exists (select 1 from public.correlativos c where c.tipo = v.t);
