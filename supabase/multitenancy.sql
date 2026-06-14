-- ============================================================
-- TRIADA CRM · Migración de SEGURIDAD CRÍTICA — Multitenancy + RBAC + Audit
-- Resuelve C-1..C-5 de docs/AUDITORIA_EMPRESARIAL.md
--
-- Requiere haber corrido antes: supabase/schema.sql
-- (opcional, si existen: ai_commander.sql, autodiagnosticos.sql, presupuestos.sql)
--
-- IDEMPOTENTE y NO-DESTRUCTIVO. Hace backfill de TODO lo existente a una
-- "org por defecto", de modo que el deployment actual (un solo equipo Tríada)
-- siga funcionando exactamente igual y SIN cambios en el front-end:
--   · El front (js/db.js) NO manda org_id → un trigger lo asigna server-side.
--   · Las lecturas quedan filtradas por RLS automáticamente.
--
-- Pegar y ejecutar en: Supabase → SQL Editor → New query → Run.
-- ============================================================

-- ===== 0. Tabla de organizaciones (tenants) =====================
create table if not exists orgs (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ===== 1. Columna org_id en profiles + todas las tablas de negocio =====
alter table profiles     add column if not exists org_id uuid references orgs(id);
alter table leads        add column if not exists org_id uuid references orgs(id);
alter table clientes     add column if not exists org_id uuid references orgs(id);
alter table diagnosticos add column if not exists org_id uuid references orgs(id);
alter table propuestas   add column if not exists org_id uuid references orgs(id);
alter table citas        add column if not exists org_id uuid references orgs(id);
alter table servicios    add column if not exists org_id uuid references orgs(id);
alter table facturas     add column if not exists org_id uuid references orgs(id);
alter table actividad    add column if not exists org_id uuid references orgs(id);

-- ===== 2. Backfill: una org por defecto; todo lo existente adentro =====
do $$
declare v_org uuid;
begin
  select id into v_org from orgs order by created_at limit 1;
  if v_org is null then
    insert into orgs(nombre) values ('Tríada Consultoría') returning id into v_org;
  end if;
  update profiles     set org_id = v_org where org_id is null;
  update leads        set org_id = v_org where org_id is null;
  update clientes     set org_id = v_org where org_id is null;
  update diagnosticos set org_id = v_org where org_id is null;
  update propuestas   set org_id = v_org where org_id is null;
  update citas        set org_id = v_org where org_id is null;
  update servicios    set org_id = v_org where org_id is null;
  update facturas     set org_id = v_org where org_id is null;
  update actividad    set org_id = v_org where org_id is null;
end $$;

-- ===== 3. Helpers de tenant/rol (cacheables, security definer) =====
-- auth_org_id(): la org del usuario autenticado. is_admin(): ¿es admin?
create or replace function auth_org_id() returns uuid
language sql stable security definer set search_path = public as $$
  select org_id from public.profiles where id = auth.uid()
$$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

-- ===== 4. Stamping automático de org_id en cada INSERT (front intacto) =====
-- · Autenticado: si no manda org_id, se asigna su org. (Mandar otra org la bloquea
--   la RLS `with check (org_id = auth_org_id())`.)
-- · Anónimo (vía pública leads_public_ins / landing): se FUERZA la org por defecto,
--   ignorando cualquier org_id del cliente → evita (a) leads huérfanos invisibles y
--   (b) inyección cross-tenant mandando el org_id de otra empresa.
--   MULTI-TENANT REAL (futuro): reemplazar el branch anónimo por la resolución de la
--   org desde el contexto del landing (slug/subdominio), no "org por defecto".
create or replace function set_org_id() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_org uuid;
begin
  if v_uid is null then
    select id into v_org from public.orgs order by created_at limit 1;
    new.org_id := v_org;                       -- anónimo: org forzada
  elsif new.org_id is null then
    new.org_id := auth_org_id();               -- autenticado: su org
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['leads','clientes','diagnosticos','propuestas','citas','servicios','facturas']
  loop
    execute format('drop trigger if exists trg_%1$s_org on %1$s', t);
    execute format('create trigger trg_%1$s_org before insert on %1$s for each row execute function set_org_id()', t);
  end loop;
end $$;

-- ===== 5. handle_new_user: asignar la org por defecto a usuarios nuevos =====
-- HOY (single-tenant): todos entran a la org por defecto → continuidad total.
-- MULTI-TENANT REAL (futuro): reemplazar por (a) signup self-serve que crea una
-- org nueva, o (b) alta por invitación (un admin setea profiles.org_id). El resto
-- de la maquinaria (RLS, stamping, audit) ya queda listo para ese día.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  select id into v_org from public.orgs order by created_at limit 1;
  insert into public.profiles (id, email, nombre, org_id)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nombre', new.email), v_org);
  return new;
end $$;

-- ===== 6. C-1/C-3: RLS por tenant (reemplaza el inseguro using(true)) =====
-- Tablas con acceso completo dentro de la org:
do $$
declare t text;
begin
  foreach t in array array['leads','clientes','diagnosticos','propuestas','citas','servicios']
  loop
    execute format('drop policy if exists %1$s_auth_all on %1$s', t);
    execute format('drop policy if exists %1$s_org on %1$s', t);
    execute format($f$create policy %1$s_org on %1$s for all to authenticated
       using (org_id = auth_org_id()) with check (org_id = auth_org_id())$f$, t);
  end loop;
end $$;

-- Facturas: lectura/alta/edición por org, pero DELETE solo admin (least-privilege
-- sobre dinero). Reversible: si querés que los consultores borren facturas,
-- cambiá facturas_del por la condición sin is_admin().
drop policy if exists facturas_auth_all on facturas;
drop policy if exists facturas_org on facturas;
drop policy if exists facturas_sel on facturas;
drop policy if exists facturas_ins on facturas;
drop policy if exists facturas_upd on facturas;
drop policy if exists facturas_del on facturas;
create policy facturas_sel on facturas for select to authenticated using (org_id = auth_org_id());
create policy facturas_ins on facturas for insert to authenticated with check (org_id = auth_org_id());
create policy facturas_upd on facturas for update to authenticated using (org_id = auth_org_id()) with check (org_id = auth_org_id());
create policy facturas_del on facturas for delete to authenticated using (org_id = auth_org_id() and is_admin());

-- orgs: cada usuario solo ve su propia org
alter table orgs enable row level security;
drop policy if exists orgs_read on orgs;
create policy orgs_read on orgs for select to authenticated using (id = auth_org_id());

-- ===== 7. C-2: profiles — lectura por org + anti-escalada de privilegios =====
drop policy if exists profiles_read on profiles;
drop policy if exists profiles_read_org on profiles;
create policy profiles_read_org on profiles for select to authenticated
  using (org_id = auth_org_id());

-- Un usuario edita su propio perfil; un admin edita los de su org.
drop policy if exists profiles_self on profiles;
drop policy if exists profiles_self_update on profiles;
create policy profiles_self_update on profiles for update to authenticated
  using (id = auth.uid() or is_admin())
  with check ((id = auth.uid() or is_admin()) and org_id = auth_org_id());

-- Trigger: role/org/activo SOLO los cambia un admin. Cierra el privesc de
-- "update profiles set role='admin' where id=auth.uid()".
create or replace function guard_profile_privesc() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.role   is distinct from old.role
   or new.org_id is distinct from old.org_id
   or new.activo is distinct from old.activo) and not is_admin() then
     raise exception 'no autorizado: solo un admin puede cambiar role/org/activo';
  end if;
  return new;
end $$;
drop trigger if exists trg_profiles_guard on profiles;
create trigger trg_profiles_guard before update on profiles
  for each row execute function guard_profile_privesc();

-- ===== 8. C-5: log de auditoría INMUTABLE + poblado por triggers de BD =====
-- audit_row() es security definer (escribe aunque RLS niegue) y estampa la org.
create or replace function audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_row jsonb; v_id uuid; v_org uuid;
begin
  if (tg_op = 'DELETE') then v_row := to_jsonb(old); v_id := old.id;
  else v_row := to_jsonb(new); v_id := new.id; end if;
  begin v_org := (v_row->>'org_id')::uuid; exception when others then v_org := null; end;
  insert into actividad (entidad, entidad_id, accion, usuario, org_id, payload)
  values (tg_table_name, v_id, lower(tg_op), auth.uid(), coalesce(v_org, auth_org_id()), v_row);
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['leads','clientes','diagnosticos','propuestas','citas','facturas']
  loop
    execute format('drop trigger if exists trg_%1$s_audit on %1$s', t);
    execute format('create trigger trg_%1$s_audit after insert or update or delete on %1$s for each row execute function audit_row()', t);
  end loop;
end $$;

-- actividad: solo se LEE (dentro de la org). Insert solo vía trigger definer;
-- sin políticas de insert/update/delete para 'authenticated' ⇒ RLS lo niega
-- (audit trail inmutable e infalsificable desde el cliente).
drop policy if exists actividad_auth_all on actividad;
drop policy if exists actividad_read_org on actividad;
create policy actividad_read_org on actividad for select to authenticated
  using (org_id = auth_org_id());

-- ===== 9. (Opcional/guardado) AI Commander: tenant-izar si el módulo existe =====
do $$
declare v_org uuid; t text;
begin
  if to_regclass('public.proyectos') is null then return; end if;
  select id into v_org from orgs order by created_at limit 1;
  update proyectos    set org_id = v_org where org_id is null;
  update tareas       set org_id = v_org where org_id is null;
  update ai_prompts   set org_id = v_org where org_id is null;
  update ai_responses set org_id = v_org where org_id is null;
  foreach t in array array['proyectos','tareas','ai_prompts','ai_responses']
  loop
    execute format('drop trigger if exists trg_%1$s_org on %1$s', t);
    execute format('create trigger trg_%1$s_org before insert on %1$s for each row execute function set_org_id()', t);
    execute format('drop policy if exists %1$s_auth_all on %1$s', t);
    execute format('drop policy if exists %1$s_org on %1$s', t);
    execute format($f$create policy %1$s_org on %1$s for all to authenticated
       using (org_id = auth_org_id()) with check (org_id = auth_org_id())$f$, t);
  end loop;
end $$;

-- ===== 10. (Opcional/guardado) Tablas accesorias si existen =====
do $$
declare v_org uuid;
begin
  select id into v_org from orgs order by created_at limit 1;
  -- presupuestos
  if to_regclass('public.presupuestos') is not null then
    alter table presupuestos add column if not exists org_id uuid references orgs(id);
    update presupuestos set org_id = v_org where org_id is null;
    drop trigger if exists trg_presupuestos_org on presupuestos;
    create trigger trg_presupuestos_org before insert on presupuestos for each row execute function set_org_id();
    drop policy if exists presupuestos_auth_all on presupuestos;
    drop policy if exists presupuestos_org on presupuestos;
    create policy presupuestos_org on presupuestos for all to authenticated
      using (org_id = auth_org_id()) with check (org_id = auth_org_id());
  end if;
  -- autodiagnosticos: org derivada del lead (insert anónimo se mantiene).
  if to_regclass('public.autodiagnosticos') is not null then
    alter table autodiagnosticos add column if not exists org_id uuid references orgs(id);
    update autodiagnosticos a set org_id = l.org_id from leads l where a.lead_id = l.id and a.org_id is null;
  end if;
end $$;

-- autodiagnosticos: trigger que deriva org_id del lead (cubre el insert anónimo).
create or replace function set_org_from_lead() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.org_id is null and new.lead_id is not null then
    select org_id into new.org_id from public.leads where id = new.lead_id;
  end if;
  return new;
end $$;
do $$
begin
  if to_regclass('public.autodiagnosticos') is not null then
    drop trigger if exists trg_autodiag_org on autodiagnosticos;
    create trigger trg_autodiag_org before insert on autodiagnosticos
      for each row execute function set_org_from_lead();
    -- lectura por org para autenticados; el insert anónimo (origen público) se
    -- mantiene como esté definido en autodiagnosticos.sql.
    drop policy if exists autodiagnosticos_read_org on autodiagnosticos;
    create policy autodiagnosticos_read_org on autodiagnosticos for select to authenticated
      using (org_id = auth_org_id());
  end if;
end $$;

-- ============================================================
-- LISTO. Verificación rápida sugerida (en SQL Editor):
--   select count(*) filter (where org_id is null) as sin_org from leads;   -- → 0
--   select tablename, policyname from pg_policies where schemaname='public'
--     order by tablename;  -- confirmá que ya NO hay políticas using(true)
-- Próximo paso de producto: flujo de provisión de organizaciones (ver §5).
-- ============================================================
