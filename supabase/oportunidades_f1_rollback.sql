-- ============================================================
-- oportunidades_f1_rollback.sql — deshace supabase/oportunidades_f1.sql
--
-- DESTRUCTIVO: borra las tablas del módulo Oportunidades Públicas y TODO su
-- contenido. Correr solo si se decide sacar el módulo. Los archivos del bucket
-- 'oportunidades' NO se borran acá a propósito (revisar y vaciar a mano antes).
--
-- No toca funciones compartidas (set_org_id, audit_row, auth_org_id, is_admin).
-- ============================================================

-- Orden hijo → padre (las FK ya son ON DELETE CASCADE, pero se explicita).
drop table if exists public.op_oferta_docs   cascade;
drop table if exists public.op_ofertas       cascade;
drop table if exists public.op_costo_items   cascade;
drop table if exists public.op_costos        cascade;
drop table if exists public.op_aprobaciones  cascade;
drop table if exists public.op_puntajes      cascade;
drop table if exists public.op_riesgos       cascade;
drop table if exists public.op_requisitos    cascade;
drop table if exists public.op_documentos    cascade;
drop table if exists public.op_actividad     cascade;
drop table if exists public.op_resultados    cascade;
drop table if exists public.op_certificados  cascade;
drop table if exists public.op_oportunidades cascade;
drop table if exists public.op_proveedor_docs cascade;
drop table if exists public.op_plantillas    cascade;
drop table if exists public.op_sync_logs     cascade;
drop table if exists public.op_config        cascade;

-- Funciones propias del módulo
drop function if exists public.op_guard_oc()          cascade;
drop function if exists public.op_puede_aprobar(text) cascade;
drop function if exists public.op_es_lector()         cascade;

-- Policies del bucket (el bucket y sus objetos quedan: revisar antes de borrar)
drop policy if exists op_stg_select on storage.objects;
drop policy if exists op_stg_insert on storage.objects;
drop policy if exists op_stg_delete on storage.objects;

-- Para eliminar también el bucket (SOLO si está vacío):
--   delete from storage.buckets where id = 'oportunidades';
