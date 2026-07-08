-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK de ERP Tríada · F4 · Nómina  (deshace supabase/erp_f4.sql)
-- Nota: F4 no tocó `actividad_read_org` (ya listaba empleados/remuneraciones
-- desde F2), así que no hay policy de audit que restaurar.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) RPCs
drop function if exists public.listar_empleados();
drop function if exists public.guardar_empleado(uuid,text,text,text,text,text,date,numeric,boolean,uuid,text);
drop function if exists public.listar_nomina(text);
drop function if exists public.guardar_remuneracion(uuid,uuid,text,numeric,numeric,numeric,text,text);
drop function if exists public.eliminar_remuneracion(uuid);

-- 2) Storage (vacío en pruebas; en prod real, exportar antes)
drop policy if exists nomina_select on storage.objects;
drop policy if exists nomina_insert on storage.objects;
drop policy if exists nomina_update on storage.objects;
drop policy if exists nomina_delete on storage.objects;
delete from storage.objects where bucket_id = 'nomina';
delete from storage.buckets where id = 'nomina';

-- 3) Tablas + schema
drop table if exists erp.remuneraciones cascade;
drop table if exists erp.empleados cascade;
drop schema if exists erp cascade;

-- 4) Correlativos
delete from public.correlativos where tipo in ('EMP','LIQ');
