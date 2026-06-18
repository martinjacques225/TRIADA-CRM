-- ============================================================
-- TRIADA CRM · FIX RLS — cierre de 2 huecos hallados en la Auditoría 360 (2026-06-17)
-- Detectados al verificar CR-1/A1 (no asumir: pg_policies con login).
--
-- H1: autodiagnosticos.autodiag_auth_all = ALL / using(true) → fuga cross-tenant
--     (anula por OR el filtro autodiagnosticos_read_org). Se elimina y se reemplaza
--     por DELETE acotado a la org (el SELECT ya lo da autodiagnosticos_read_org;
--     el INSERT anónimo del formulario público se mantiene).
-- H2: diagnosticos.diagnosticos_public_ins = INSERT para anon → cualquiera inserta
--     diagnósticos OFICIALES falsos. El formulario público SOLO escribe en
--     autodiagnosticos, así que esta policy sobra. Se elimina.
-- Extra: se endurece autodiag_public_ins (anon) para exigir lead_id (antes with_check=true).
--
-- IDEMPOTENTE y NO-DESTRUCTIVO de datos. Pegar y ejecutar en:
--   Supabase → SQL Editor → New query → Run.
-- ============================================================

-- ===== H1 · autodiagnosticos: matar el using(true) cross-tenant =====
drop policy if exists autodiag_auth_all on autodiagnosticos;

-- DELETE acotado a la org (least-privilege). El módulo CRM solo lee y borra
-- autodiagnósticos; no los edita. SELECT lo cubre autodiagnosticos_read_org.
drop policy if exists autodiag_del_org on autodiagnosticos;
create policy autodiag_del_org on autodiagnosticos for delete to authenticated
  using (org_id = auth_org_id());

-- Endurecer el insert anónimo del formulario público: exigir lead_id (antes true).
drop policy if exists autodiag_public_ins on autodiagnosticos;
create policy autodiag_public_ins on autodiagnosticos for insert to anon
  with check (lead_id is not null);

-- ===== H2 · diagnosticos: quitar el insert anónimo a la tabla oficial =====
-- (El público escribe en autodiagnosticos, no aquí. Si algún día se quiere alta
--  pública de diagnóstico oficial, reintroducir con validación fuerte + rate-limit.)
drop policy if exists diagnosticos_public_ins on diagnosticos;

-- ============================================================
-- VERIFICACIÓN (correr después; resultados esperados entre paréntesis):
--   -- (1) autodiag_auth_all NO debe aparecer; sí autodiag_del_org + read_org + public_ins:
--   select policyname, cmd, roles::text, qual, with_check from pg_policies
--     where schemaname='public' and tablename='autodiagnosticos' order by policyname;
--   -- (2) diagnosticos NO debe tener ninguna policy para {anon}:
--   select policyname, cmd, roles::text from pg_policies
--     where schemaname='public' and tablename='diagnosticos' order by policyname;
-- ============================================================
