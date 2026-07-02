-- ============================================================
-- TRIADA CRM · RPC crear_lead_landing (recuperado de PRODUCCIÓN)
--
-- ORIGEN: este SQL fue extraído de la base viva (proyecto Supabase
-- pqrjndirqtucoumijben) el 2026-07-01 con:
--   select pg_get_functiondef(oid) from pg_proc where proname='crear_lead_landing';
-- No existía en ningún repo: este archivo cierra ese drift esquema↔base.
--
-- QUÉ ES: el endpoint público de captura de leads de grupotriada.cl.
-- SECURITY DEFINER (owner postgres) → bypassa RLS al insertar.
-- GRANTS reales en producción: EXECUTE a postgres, anon, authenticated,
-- service_role (es decir, cualquier visitante con la key publishable
-- puede llamarlo vía POST /rest/v1/rpc/crear_lead_landing).
--
-- CADENA DE INSERCIÓN (verificada en la base viva):
--   · org_id  ← trigger trg_leads_org  BEFORE INSERT → set_org_id()
--   · codigo  ← trigger trg_lead_codigo BEFORE INSERT → set_codigo('LEAD')
--   · retorna el `codigo` generado (text).
--
-- OJO — SUPERFICIE ANÓNIMA DUPLICADA: además de este RPC sigue ACTIVA
-- en producción la policy `leads_public_ins` (anon INSERT directo a
-- `leads` con check origen='landing'; ver leads_public_ins.sql) y
-- `autodiag_public_ins` (anon INSERT a `autodiagnosticos` con check
-- lead_id is not null). Son DOS caminos de escritura anónima paralelos.
-- Cualquier ampliación del lead (Experience Center) debe decidir
-- primero cuál de los dos caminos queda y cerrar el otro.
--
-- IDEMPOTENTE. Pegar en: Supabase → SQL Editor → New query → Run.
-- ============================================================

CREATE OR REPLACE FUNCTION public.crear_lead_landing(p_nombre text, p_empresa text DEFAULT NULL::text, p_telefono text DEFAULT NULL::text, p_email text DEFAULT NULL::text, p_dolor_principal text DEFAULT NULL::text, p_notas text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_codigo text;
begin
  if coalesce(trim(p_nombre),'') = '' then raise exception 'nombre requerido'; end if;
  insert into leads (nombre, empresa, telefono, email, dolor_principal, notas, origen)
  values (trim(p_nombre), nullif(trim(p_empresa),''), nullif(trim(p_telefono),''),
          nullif(trim(p_email),''), nullif(trim(p_dolor_principal),''), nullif(trim(p_notas),''), 'landing')
  returning codigo into v_codigo;
  return v_codigo;
end $function$;

-- ============================================================
-- ESTADO REAL DE POLICIES (pg_policies, 2026-07-01, producción):
--
--   leads:
--     · leads_org        {authenticated} ALL    qual/check: org_id = auth_org_id()
--     · leads_public_ins {anon}          INSERT with_check: origen = 'landing'::lead_origen   ← ACTIVA
--   autodiagnosticos:
--     · autodiagnosticos_read_org {authenticated} SELECT  org_id = auth_org_id()
--     · autodiag_del_org          {authenticated} DELETE  org_id = auth_org_id()
--     · autodiag_public_ins       {anon}          INSERT  with_check: lead_id IS NOT NULL     ← ACTIVA
--
-- VERIFICACIÓN del RPC (sin login, key publishable):
--   POST /rest/v1/rpc/crear_lead_landing {"p_nombre":"Test"} → 200 "LEAD-xxxx"
-- ============================================================
