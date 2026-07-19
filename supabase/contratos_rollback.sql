-- ============================================================
-- contratos_rollback.sql — deshace contratos.sql
-- No borra funciones compartidas (set_org_id, set_updated_at, audit_row, auth_org_id,
-- is_admin) porque las usan otros módulos. Sí quita lo propio de Contratos.
-- OJO: elimina la tabla public.contratos y sus datos. El bucket 'contratos' y sus
-- objetos NO se borran aquí (evita pérdida accidental de archivos-master); hazlo manual
-- desde Storage si de verdad quieres eliminarlos.
-- ============================================================

drop trigger if exists trg_contratos_guard   on public.contratos;
drop trigger if exists trg_contratos_audit   on public.contratos;
drop trigger if exists trg_contratos_updated on public.contratos;
drop trigger if exists trg_contratos_org     on public.contratos;

drop function if exists public.guard_contrato_lifecycle();
drop function if exists public.next_contrato_correlativo(text);

drop policy if exists contratos_select on public.contratos;
drop policy if exists contratos_insert on public.contratos;
drop policy if exists contratos_update on public.contratos;
drop policy if exists contratos_delete on public.contratos;

drop policy if exists contratos_stg_select on storage.objects;
drop policy if exists contratos_stg_insert on storage.objects;
drop policy if exists contratos_stg_delete on storage.objects;

drop table if exists public.contratos;
drop table if exists public.correlativos_contratos;

-- El bucket se deja en pie a propósito:
--   delete from storage.buckets where id = 'contratos';   -- (solo si está vacío)
