-- ═══════════════════════════════════════════════════════════════════════════
-- ERP Tríada · F4 · Nómina — esquema confidencial  (aditivo / idempotente)
-- «La joya de la corona»: registra el COSTO-EMPRESA por persona. NO liquida
-- (la liquidación se calcula fuera y se sube como PDF). Alcance cerrado por la
-- crítica adversarial — ver ERP-TRIADA-PLAN-CONSTRUCCION.md §5/§6.
--
-- Modelo de seguridad (el porqué de F4):
--   · Tablas en el schema `erp`, REVOCADO de anon/authenticated y NO expuesto a
--     PostgREST → inalcanzables por REST aunque la RLS falle.
--   · Acceso SOLO por RPC `security definer` (public.*) que validan
--     can_ver_nomina() o fila propia y escriben un read-audit REDACTADO
--     (quién · cuándo · período — NUNCA el monto).
--   · Las tablas NO cuelgan del trigger genérico audit_row() (filtraría montos).
--   · Bucket privado `nomina/{org}/{uid}/` para los PDF de liquidación;
--     cada colaborador ve solo lo suyo (2ª carpeta = auth.uid()).
--
-- ⚠️ OPERACIÓN MANUAL: NO agregar `erp` a "Exposed schemas" en el dashboard de
--    Supabase (API settings). Debe quedar fuera de PostgREST.
--
-- Aplicada por el MCP el 2026-07-08 (migración erp_f4_nomina).
-- Rollback: supabase/erp_f4_rollback.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Schema confidencial, cerrado a la API ───────────────────────────────
create schema if not exists erp;
revoke all on schema erp from anon, authenticated;
revoke all on all tables in schema erp from anon, authenticated;

-- ── 2. Tablas ──────────────────────────────────────────────────────────────
create table if not exists erp.empleados (
  id                 uuid primary key default gen_random_uuid(),
  codigo             text unique,
  org_id             uuid not null,
  profile_id         uuid,                    -- vínculo opcional con el usuario CRM (auth.uid())
  nombre             text not null,
  rut                text,
  cargo              text,
  cuenta_bancaria    text,
  direccion          text,
  fecha_ingreso      date,
  costo_empresa_base numeric not null default 0,
  activo             boolean not null default true,
  notas              text,
  created_by         uuid,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table if not exists erp.remuneraciones (
  id            uuid primary key default gen_random_uuid(),
  codigo        text unique,
  org_id        uuid not null,
  empleado_id   uuid not null references erp.empleados(id) on delete cascade,
  periodo       text not null,               -- 'YYYY-MM'
  imponible     numeric not null default 0,
  liquido       numeric not null default 0,
  costo_empresa numeric not null default 0,
  pdf_path      text,                        -- nomina/{org}/{uid}/uuid.pdf
  notas         text,
  created_by    uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (org_id, empleado_id, periodo)
);

-- Triggers compartidos: correlativo + org_id + updated_at.  ¡SIN audit_row!
drop trigger if exists trg_emp_codigo on erp.empleados;
create trigger trg_emp_codigo before insert on erp.empleados for each row execute function public.set_codigo('EMP');
drop trigger if exists trg_emp_org on erp.empleados;
create trigger trg_emp_org before insert on erp.empleados for each row execute function public.set_org_id();
drop trigger if exists trg_emp_upd on erp.empleados;
create trigger trg_emp_upd before update on erp.empleados for each row execute function public.set_updated_at();

drop trigger if exists trg_rem_codigo on erp.remuneraciones;
create trigger trg_rem_codigo before insert on erp.remuneraciones for each row execute function public.set_codigo('LIQ');
drop trigger if exists trg_rem_org on erp.remuneraciones;
create trigger trg_rem_org before insert on erp.remuneraciones for each row execute function public.set_org_id();
drop trigger if exists trg_rem_upd on erp.remuneraciones;
create trigger trg_rem_upd before update on erp.remuneraciones for each row execute function public.set_updated_at();

create index if not exists idx_emp_org        on erp.empleados(org_id);
create index if not exists idx_emp_profile    on erp.empleados(profile_id);
create index if not exists idx_rem_org_periodo on erp.remuneraciones(org_id, periodo desc);
create index if not exists idx_rem_empleado   on erp.remuneraciones(empleado_id);

-- RLS deny-all EXPLÍCITO (defensa en profundidad). El acceso real es por RPC
-- `security definer`, que corre como owner y omite RLS; el `using(false)` cierra
-- el acceso directo de anon/authenticated y satisface al linter (RLS con policy).
alter table erp.empleados      enable row level security;
alter table erp.remuneraciones enable row level security;
drop policy if exists empleados_deny_all on erp.empleados;
create policy empleados_deny_all on erp.empleados for all to anon, authenticated using (false) with check (false);
drop policy if exists remuneraciones_deny_all on erp.remuneraciones;
create policy remuneraciones_deny_all on erp.remuneraciones for all to anon, authenticated using (false) with check (false);

-- Seeds de correlativos (columnas reales: tipo, ultimo).
insert into public.correlativos (tipo, ultimo) select 'EMP', 0 where not exists (select 1 from public.correlativos where tipo='EMP');
insert into public.correlativos (tipo, ultimo) select 'LIQ', 0 where not exists (select 1 from public.correlativos where tipo='LIQ');

-- ── 3. RPCs (public, security definer) — único acceso a la nómina ──────────

-- 3.1 Empleados: listar (solo nómina) ---------------------------------------
create or replace function public.listar_empleados()
returns table(id uuid, codigo text, nombre text, rut text, cargo text, cuenta_bancaria text,
              direccion text, fecha_ingreso date, costo_empresa_base numeric, activo boolean, profile_id uuid)
language plpgsql security definer set search_path = public as $$
begin
  if not can_ver_nomina() then raise exception 'no autorizado' using errcode = '42501'; end if;
  insert into public.actividad (entidad, accion, usuario, org_id, payload)
  values ('empleados', 'read', auth.uid(), auth_org_id(), jsonb_build_object('scope','lista'));
  return query
    select e.id, e.codigo, e.nombre, e.rut, e.cargo, e.cuenta_bancaria, e.direccion,
           e.fecha_ingreso, e.costo_empresa_base, e.activo, e.profile_id
    from erp.empleados e
    where e.org_id = auth_org_id()
    order by e.activo desc, e.nombre;
end $$;

-- 3.2 Empleados: alta / edición (solo nómina) -------------------------------
create or replace function public.guardar_empleado(
  p_id uuid, p_nombre text, p_rut text, p_cargo text, p_cuenta_bancaria text,
  p_direccion text, p_fecha_ingreso date, p_costo_empresa_base numeric,
  p_activo boolean, p_profile_id uuid, p_notas text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not can_ver_nomina() then raise exception 'no autorizado' using errcode = '42501'; end if;
  if p_id is null then
    insert into erp.empleados (nombre, rut, cargo, cuenta_bancaria, direccion, fecha_ingreso,
                               costo_empresa_base, activo, profile_id, notas, created_by)
    values (p_nombre, p_rut, p_cargo, p_cuenta_bancaria, p_direccion, p_fecha_ingreso,
            coalesce(p_costo_empresa_base,0), coalesce(p_activo,true), p_profile_id, p_notas, auth.uid())
    returning id into v_id;
  else
    update erp.empleados set
      nombre=p_nombre, rut=p_rut, cargo=p_cargo, cuenta_bancaria=p_cuenta_bancaria,
      direccion=p_direccion, fecha_ingreso=coalesce(p_fecha_ingreso, fecha_ingreso),
      costo_empresa_base=coalesce(p_costo_empresa_base,0), activo=coalesce(p_activo,true),
      profile_id=p_profile_id, notas=coalesce(p_notas, notas)   -- no pisar campos que el form no expone
    where id=p_id and org_id=auth_org_id()
    returning id into v_id;
    if v_id is null then raise exception 'empleado no encontrado'; end if;
  end if;
  insert into public.actividad (entidad, entidad_id, accion, usuario, org_id, payload)
  values ('empleados', v_id, case when p_id is null then 'create' else 'update' end,
          auth.uid(), auth_org_id(), jsonb_build_object('cargo', p_cargo));   -- sin RUT/cuenta/costo
  return v_id;
end $$;

-- 3.3 Remuneraciones: listar (nómina = todas · colaborador = solo la suya) ---
create or replace function public.listar_nomina(p_periodo text default null)
returns table(id uuid, codigo text, empleado_id uuid, empleado_nombre text, periodo text,
              imponible numeric, liquido numeric, costo_empresa numeric, pdf_path text, notas text)
language plpgsql security definer set search_path = public as $$
declare v_puede boolean := can_ver_nomina();
begin
  insert into public.actividad (entidad, accion, usuario, org_id, payload)
  values ('remuneraciones', 'read', auth.uid(), auth_org_id(),
          jsonb_build_object('periodo', p_periodo, 'scope', case when v_puede then 'nomina' else 'propia' end));
  return query
    select r.id, r.codigo, r.empleado_id, e.nombre, r.periodo,
           r.imponible, r.liquido,
           case when v_puede then r.costo_empresa else null::numeric end,   -- costo-empresa: solo nómina
           r.pdf_path,
           case when v_puede then r.notas else null::text end               -- notas internas: solo nómina
    from erp.remuneraciones r
    join erp.empleados e on e.id = r.empleado_id
    where r.org_id = auth_org_id()
      and (p_periodo is null or r.periodo = p_periodo)
      and (v_puede or e.profile_id = auth.uid())
    order by r.periodo desc, e.nombre;
end $$;

-- 3.4 Remuneraciones: alta / edición (solo nómina) --------------------------
create or replace function public.guardar_remuneracion(
  p_id uuid, p_empleado_id uuid, p_periodo text, p_imponible numeric,
  p_liquido numeric, p_costo_empresa numeric, p_pdf_path text, p_notas text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not can_ver_nomina() then raise exception 'no autorizado' using errcode = '42501'; end if;
  if not exists (select 1 from erp.empleados e where e.id=p_empleado_id and e.org_id=auth_org_id()) then
    raise exception 'empleado no encontrado';
  end if;
  if p_id is null then
    begin
      insert into erp.remuneraciones (empleado_id, periodo, imponible, liquido, costo_empresa, pdf_path, notas, created_by)
      values (p_empleado_id, p_periodo, coalesce(p_imponible,0), coalesce(p_liquido,0),
              coalesce(p_costo_empresa,0), p_pdf_path, p_notas, auth.uid())
      returning id into v_id;
    exception when unique_violation then
      raise exception 'Ya existe una remuneración para ese empleado y período.';
    end;
  else
    update erp.remuneraciones set
      periodo=p_periodo, imponible=coalesce(p_imponible,0), liquido=coalesce(p_liquido,0),
      costo_empresa=coalesce(p_costo_empresa,0), pdf_path=coalesce(p_pdf_path, pdf_path), notas=p_notas
    where id=p_id and org_id=auth_org_id()
    returning id into v_id;
    if v_id is null then raise exception 'remuneración no encontrada'; end if;
  end if;
  insert into public.actividad (entidad, entidad_id, accion, usuario, org_id, payload)
  values ('remuneraciones', v_id, case when p_id is null then 'create' else 'update' end,
          auth.uid(), auth_org_id(), jsonb_build_object('periodo', p_periodo, 'empleado_id', p_empleado_id)); -- SIN montos
  return v_id;
end $$;

-- 3.5 Remuneraciones: eliminar (corrección; solo nómina) --------------------
create or replace function public.eliminar_remuneracion(p_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_emp uuid; v_per text;
begin
  if not can_ver_nomina() then raise exception 'no autorizado' using errcode = '42501'; end if;
  delete from erp.remuneraciones where id=p_id and org_id=auth_org_id()
    returning empleado_id, periodo into v_emp, v_per;
  if v_emp is null then raise exception 'remuneración no encontrada'; end if;
  insert into public.actividad (entidad, entidad_id, accion, usuario, org_id, payload)
  values ('remuneraciones', p_id, 'delete', auth.uid(), auth_org_id(),
          jsonb_build_object('periodo', v_per, 'empleado_id', v_emp));   -- SIN montos
end $$;

-- Ejecución: solo usuarios autenticados (la anon key es pública).
revoke execute on function
  public.listar_empleados(),
  public.guardar_empleado(uuid,text,text,text,text,text,date,numeric,boolean,uuid,text),
  public.listar_nomina(text),
  public.guardar_remuneracion(uuid,uuid,text,numeric,numeric,numeric,text,text),
  public.eliminar_remuneracion(uuid)
  from public, anon;
grant execute on function
  public.listar_empleados(),
  public.guardar_empleado(uuid,text,text,text,text,text,date,numeric,boolean,uuid,text),
  public.listar_nomina(text),
  public.guardar_remuneracion(uuid,uuid,text,numeric,numeric,numeric,text,text),
  public.eliminar_remuneracion(uuid)
  to authenticated;

-- ── 4. Bucket privado de liquidaciones ─────────────────────────────────────
insert into storage.buckets (id, name, public) values ('nomina', 'nomina', false)
  on conflict (id) do nothing;

-- select: la propia (2ª carpeta = auth.uid) o quien puede ver nómina
drop policy if exists nomina_select on storage.objects;
create policy nomina_select on storage.objects for select to authenticated
  using ( bucket_id = 'nomina'
    and (storage.foldername(name))[1] = (select public.auth_org_id())::text
    and ( (storage.foldername(name))[2] = auth.uid()::text or (select public.can_ver_nomina()) ) );

-- insert / update / delete: solo nómina (las liquidaciones las sube finanzas)
drop policy if exists nomina_insert on storage.objects;
create policy nomina_insert on storage.objects for insert to authenticated
  with check ( bucket_id = 'nomina'
    and (storage.foldername(name))[1] = (select public.auth_org_id())::text
    and (select public.can_ver_nomina()) );

drop policy if exists nomina_update on storage.objects;
create policy nomina_update on storage.objects for update to authenticated
  using ( bucket_id = 'nomina'
    and (storage.foldername(name))[1] = (select public.auth_org_id())::text
    and (select public.can_ver_nomina()) );

drop policy if exists nomina_delete on storage.objects;
create policy nomina_delete on storage.objects for delete to authenticated
  using ( bucket_id = 'nomina'
    and (storage.foldername(name))[1] = (select public.auth_org_id())::text
    and (select public.can_ver_nomina()) );
