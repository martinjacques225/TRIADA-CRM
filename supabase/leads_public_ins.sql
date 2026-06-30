-- ============================================================
-- TRIADA CRM · Restaurar la ENTRADA de leads desde la web (anon insert landing)
--
-- HALLAZGO (2026-06-22): el formulario público (grupotriada.cl) inserta leads en
-- el CRM vía REST con la key publishable (rol `anon`). El `schema.sql` declara la
-- policy `leads_public_ins` (anon INSERT con origen='landing'), PERO en la base
-- real NO existe → todo insert anónimo a `leads` devuelve 42501
-- ("new row violates row-level security policy"). Es un drift esquema↔base: por
-- eso el "landing→Supabase" estuvo siempre 🟡 (nunca verificado con un 201 real).
--
-- Verificado en vivo (REST, key publishable):
--   · GET  /rest/v1/leads            → 200 []   (key=anon, RLS niega lectura: OK)
--   · POST /rest/v1/leads {landing}  → 42501     (NO hay policy de insert: el bug)
--   · POST /rest/v1/autodiagnosticos → 23503 FK  (anon-insert SÍ funciona si hay policy)
--
-- FIX: crear la policy. Con multitenancy.sql ya corrido, el trigger set_org_id()
-- estampa la org por defecto en el insert anónimo, y next_correlativo() (SECURITY
-- DEFINER, de correlativos_rls.sql) genera el `codigo`. No se necesita nada más.
--
-- IDEMPOTENTE y seguro. Pegar en: Supabase → SQL Editor → New query → Run.
-- ============================================================

drop policy if exists leads_public_ins on leads;
create policy leads_public_ins on leads
  for insert to anon
  with check (origen = 'landing');

-- ============================================================
-- VERIFICACIÓN
-- (1) En SQL Editor: debe listar 1 fila (cmd=INSERT, roles={anon}, with_check origen='landing'):
--   select policyname, cmd, roles::text, with_check
--   from pg_policies
--   where schemaname='public' and tablename='leads' and policyname='leads_public_ins';
--
-- (2) Por REST (sin login, con la key publishable) debe pasar a 201:
--   POST /rest/v1/leads  {"nombre":"Test RLS","origen":"landing"}  → 201 Created
--   (un lead manual u otro origen DEBE seguir dando 42501: la policy solo abre 'landing').
-- ============================================================
