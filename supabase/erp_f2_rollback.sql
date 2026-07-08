-- ROLLBACK de ERP Tríada · F2 (supabase/erp_f2.sql)
-- 1) Restaurar la policy de actividad SIN el gating confidencial (como estaba en F1).
drop policy if exists actividad_read_org on public.actividad;
create policy actividad_read_org on public.actividad for select to authenticated
  using (org_id = (select auth_org_id()));
-- 2) Soltar tablas F2.
drop table if exists public.movimientos cascade;
drop table if exists public.parametros_tributarios cascade;
delete from public.correlativos where tipo = 'MOV';
