-- ============================================================
-- TRIADA CRM · Optimización de RENDIMIENTO de RLS (auditoría perf 2026-06-14)
-- Requiere: schema.sql + multitenancy.sql ya corridos.
--
-- PROBLEMA: en una policy `using (org_id = auth_org_id())`, Postgres puede
-- re-evaluar la función `auth_org_id()` (y `is_admin()`, `auth.uid()`) UNA VEZ
-- POR FILA escaneada. En tablas grandes eso multiplica el costo de cada SELECT.
--
-- FIX (recomendado por Supabase): envolver la función en un subselect
-- `(select auth_org_id())`. El planner lo evalúa como InitPlan UNA sola vez por
-- consulta y cachea el resultado → mismo filtrado, sin el costo por fila.
--
-- Es FUNCIONALMENTE IDÉNTICO a multitenancy.sql (mismas reglas de acceso);
-- sólo cambia la forma en que se evalúan las funciones. IDEMPOTENTE.
-- Pegar en: Supabase → SQL Editor → New query → Run.
-- ============================================================

-- ===== Tablas con acceso total dentro de la org =====
do $$
declare t text;
begin
  foreach t in array array['leads','clientes','diagnosticos','propuestas','citas','servicios']
  loop
    execute format('drop policy if exists %1$s_org on %1$s', t);
    execute format($f$create policy %1$s_org on %1$s for all to authenticated
       using (org_id = (select auth_org_id()))
       with check (org_id = (select auth_org_id()))$f$, t);
  end loop;
end $$;

-- ===== Facturas (DELETE solo admin) =====
drop policy if exists facturas_sel on facturas;
drop policy if exists facturas_ins on facturas;
drop policy if exists facturas_upd on facturas;
drop policy if exists facturas_del on facturas;
create policy facturas_sel on facturas for select to authenticated using (org_id = (select auth_org_id()));
create policy facturas_ins on facturas for insert to authenticated with check (org_id = (select auth_org_id()));
create policy facturas_upd on facturas for update to authenticated using (org_id = (select auth_org_id())) with check (org_id = (select auth_org_id()));
create policy facturas_del on facturas for delete to authenticated using (org_id = (select auth_org_id()) and (select is_admin()));

-- ===== orgs =====
drop policy if exists orgs_read on orgs;
create policy orgs_read on orgs for select to authenticated using (id = (select auth_org_id()));

-- ===== profiles (lectura por org + self/admin update) =====
drop policy if exists profiles_read_org on profiles;
create policy profiles_read_org on profiles for select to authenticated
  using (org_id = (select auth_org_id()));

drop policy if exists profiles_self_update on profiles;
create policy profiles_self_update on profiles for update to authenticated
  using (id = (select auth.uid()) or (select is_admin()))
  with check ((id = (select auth.uid()) or (select is_admin())) and org_id = (select auth_org_id()));

-- ===== actividad (solo lectura por org) =====
drop policy if exists actividad_read_org on actividad;
create policy actividad_read_org on actividad for select to authenticated
  using (org_id = (select auth_org_id()));

-- ===== Accesorias (solo si existen) =====
do $$
declare o_t text;
begin
  if to_regclass('public.presupuestos') is not null then
    drop policy if exists presupuestos_org on presupuestos;
    create policy presupuestos_org on presupuestos for all to authenticated
      using (org_id = (select auth_org_id())) with check (org_id = (select auth_org_id()));
  end if;
  if to_regclass('public.autodiagnosticos') is not null then
    drop policy if exists autodiagnosticos_read_org on autodiagnosticos;
    create policy autodiagnosticos_read_org on autodiagnosticos for select to authenticated
      using (org_id = (select auth_org_id()));
  end if;
  -- AI Commander
  if to_regclass('public.proyectos') is not null then
    foreach o_t in array array['proyectos','tareas','ai_prompts','ai_responses'] loop
      execute format('drop policy if exists %1$s_org on %1$s', o_t);
      execute format($f$create policy %1$s_org on %1$s for all to authenticated
         using (org_id = (select auth_org_id())) with check (org_id = (select auth_org_id()))$f$, o_t);
    end loop;
  end if;
end $$;

-- ============================================================
-- Verificación: confirmá el plan con InitPlan (no re-evaluación por fila):
--   explain analyze select * from leads order by created_at desc limit 50;
-- Deberías ver "InitPlan" con el subselect y un Index Scan usando idx_leads_org_created.
-- ============================================================
