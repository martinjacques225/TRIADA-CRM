-- ═══════════════════════════════════════════════════════════════════════════
-- ERP Tríada · F3 · Compras: proveedores + órdenes de compra (aditivo/idempotente)
-- ───────────────────────────────────────────────────────────────────────────
-- Cierra la cadena OC → gasto → movimiento. Todo CONFIDENCIAL (RLS can_ver_finanzas).
-- Amplía el gate del audit (`actividad`) para incluir proveedores/ordenes_compra.
-- Aplicada por el MCP el 2026-07-07 (migración erp_f3_compras).
-- Rollback: supabase/erp_f3_rollback.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) PROVEEDORES
create table if not exists public.proveedores (
  id         uuid primary key default gen_random_uuid(),
  codigo     text unique,
  org_id     uuid,
  nombre     text not null,
  rut        text,
  contacto   text,
  email      text,
  telefono   text,
  notas      text,
  activo     boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) ÓRDENES DE COMPRA — líneas en jsonb; al recepcionar genera un gasto (gasto_id).
create table if not exists public.ordenes_compra (
  id            uuid primary key default gen_random_uuid(),
  codigo        text unique,
  org_id        uuid,
  proveedor_id  uuid references public.proveedores(id) on delete set null,
  proyecto_id   uuid references public.proyectos(id)   on delete set null,
  lineas        jsonb not null default '[]'::jsonb,   -- [{descripcion,cantidad,precioUnit}]
  neto          numeric not null default 0,
  iva           numeric not null default 0,
  total         numeric not null default 0,
  estado        text not null default 'borrador' check (estado in ('borrador','emitida','recepcionada','anulada')),
  fecha         date not null default current_date,
  fecha_entrega date,
  notas         text,
  gasto_id      uuid references public.gastos(id)     on delete set null,
  doc_id        uuid references public.documentos(id) on delete set null,
  created_by    uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 3) Imputar el gasto a un proveedor (cadena OC → gasto)
alter table public.gastos add column if not exists proveedor_id uuid references public.proveedores(id) on delete set null;

-- 4) Triggers
drop trigger if exists trg_prov_codigo on public.proveedores;
create trigger trg_prov_codigo before insert on public.proveedores for each row execute function set_codigo('PROV');
drop trigger if exists trg_prov_org on public.proveedores;
create trigger trg_prov_org before insert on public.proveedores for each row execute function set_org_id();
drop trigger if exists trg_prov_upd on public.proveedores;
create trigger trg_prov_upd before update on public.proveedores for each row execute function set_updated_at();
drop trigger if exists trg_prov_audit on public.proveedores;
create trigger trg_prov_audit after insert or update or delete on public.proveedores for each row execute function audit_row();

drop trigger if exists trg_oc_codigo on public.ordenes_compra;
create trigger trg_oc_codigo before insert on public.ordenes_compra for each row execute function set_codigo('OC');
drop trigger if exists trg_oc_org on public.ordenes_compra;
create trigger trg_oc_org before insert on public.ordenes_compra for each row execute function set_org_id();
drop trigger if exists trg_oc_upd on public.ordenes_compra;
create trigger trg_oc_upd before update on public.ordenes_compra for each row execute function set_updated_at();
drop trigger if exists trg_oc_audit on public.ordenes_compra;
create trigger trg_oc_audit after insert or update or delete on public.ordenes_compra for each row execute function audit_row();

-- 5) Índices
create index if not exists idx_prov_org         on public.proveedores(org_id);
create index if not exists idx_oc_org_fecha     on public.ordenes_compra(org_id, fecha desc);
create index if not exists idx_oc_proveedor     on public.ordenes_compra(proveedor_id);
create index if not exists idx_oc_proyecto      on public.ordenes_compra(proyecto_id);
create index if not exists idx_gastos_proveedor on public.gastos(proveedor_id);

-- 6) RLS — confidencial (finanzas)
alter table public.proveedores enable row level security;
drop policy if exists proveedores_finanzas on public.proveedores;
create policy proveedores_finanzas on public.proveedores for all to authenticated
  using (org_id = (select auth_org_id()) and (select can_ver_finanzas()))
  with check (org_id = (select auth_org_id()) and (select can_ver_finanzas()));

alter table public.ordenes_compra enable row level security;
drop policy if exists oc_finanzas on public.ordenes_compra;
create policy oc_finanzas on public.ordenes_compra for all to authenticated
  using (org_id = (select auth_org_id()) and (select can_ver_finanzas()))
  with check (org_id = (select auth_org_id()) and (select can_ver_finanzas()));

-- 7) Ampliar el gate del audit a las entidades nuevas
drop policy if exists actividad_read_org on public.actividad;
create policy actividad_read_org on public.actividad for select to authenticated
  using (
    org_id = (select auth_org_id())
    and (entidad not in ('gastos','movimientos','parametros_tributarios','remuneraciones','empleados','proveedores','ordenes_compra')
         or (select can_ver_finanzas()))
  );

-- 8) Semilla de correlativos PROV/OC
insert into public.correlativos (tipo, ultimo)
select v.t, 0 from (values ('PROV'),('OC')) v(t)
where not exists (select 1 from public.correlativos c where c.tipo = v.t);
