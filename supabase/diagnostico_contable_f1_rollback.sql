-- ============================================================
-- diagnostico_contable_f1_rollback.sql — DESHACE diagnostico_contable_f1.sql
--
-- BORRA LAS EVALUACIONES DEL DIAGNÓSTICO CONTABLE Y TRIBUTARIO. No hay vuelta
-- atrás: exporta antes si hay diagnósticos reales cargados.
--   select * from public.dct_evaluaciones;
--
-- NO toca el Diagnóstico 360 (public.diagnosticos) ni ninguna otra tabla.
-- La fila 'DCT' de correlativos se deja a propósito: si el módulo se vuelve a
-- instalar, los folios siguen donde quedaron en vez de repetirse.
-- ============================================================

drop trigger if exists trg_dctact_org on public.dct_actividad;
drop trigger if exists trg_dct_audit  on public.dct_evaluaciones;
drop trigger if exists trg_dct_upd    on public.dct_evaluaciones;
drop trigger if exists trg_dct_codigo on public.dct_evaluaciones;
drop trigger if exists trg_dct_org    on public.dct_evaluaciones;

drop table if exists public.dct_actividad    cascade;
drop table if exists public.dct_evaluaciones cascade;

-- Para borrar también el correlativo (descomentar solo si se quiere reiniciar la
-- numeración desde DCT-000001):
-- delete from public.correlativos where tipo = 'DCT';
