-- ROLLBACK de ERP Tríada · F5 (supabase/erp_f5.sql)
-- 1) Restaurar el gate del audit a la versión F3 (sin activos_licencias).
drop policy if exists actividad_read_org on public.actividad;
create policy actividad_read_org on public.actividad for select to authenticated
  using (
    org_id = (select auth_org_id())
    and (entidad not in ('gastos','movimientos','parametros_tributarios','remuneraciones','empleados','proveedores','ordenes_compra')
         or (select can_ver_finanzas()))
  );
-- 2) Soltar el tracker de activos.
drop table if exists public.activos_licencias cascade;
delete from public.correlativos where tipo = 'ACT';
-- 3) Revertir el invariante org_id NOT NULL.
alter table public.proyectos              alter column org_id drop not null;
alter table public.tareas                 alter column org_id drop not null;
alter table public.horas                  alter column org_id drop not null;
alter table public.gastos                 alter column org_id drop not null;
alter table public.movimientos            alter column org_id drop not null;
alter table public.proveedores            alter column org_id drop not null;
alter table public.ordenes_compra         alter column org_id drop not null;
alter table public.parametros_tributarios alter column org_id drop not null;
