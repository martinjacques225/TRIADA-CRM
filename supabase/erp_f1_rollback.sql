-- ROLLBACK de ERP Tríada · F1 (supabase/erp_f1.sql)
drop table if exists public.horas  cascade;
drop table if exists public.gastos cascade;
alter table public.proyectos drop column if exists tipo;
alter table public.proyectos drop column if exists tarifa;
alter table public.proyectos drop column if exists presupuesto_horas;
alter table public.proyectos drop column if exists presupuesto_monto;
alter table public.proyectos drop column if exists facturable;
delete from public.correlativos where tipo in ('HOR','GAS');
