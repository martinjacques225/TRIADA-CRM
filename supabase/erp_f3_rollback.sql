-- ROLLBACK de ERP Tríada · F3 (supabase/erp_f3.sql)
-- 1) Restaurar el gate del audit a la versión F2 (sin proveedores/ordenes_compra).
drop policy if exists actividad_read_org on public.actividad;
create policy actividad_read_org on public.actividad for select to authenticated
  using (
    org_id = (select auth_org_id())
    and (entidad not in ('gastos','movimientos','parametros_tributarios','remuneraciones','empleados')
         or (select can_ver_finanzas()))
  );
-- 2) Soltar objetos F3 (orden seguro por las FK).
drop table if exists public.ordenes_compra cascade;
alter table public.gastos drop column if exists proveedor_id;
drop table if exists public.proveedores cascade;
delete from public.correlativos where tipo in ('PROV','OC');
