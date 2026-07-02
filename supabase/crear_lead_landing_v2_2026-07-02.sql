-- ============================================================
-- TRIADA CRM · RPC crear_lead_landing v2 — atribución del Experience Center
-- (D-05: el lead llega diciendo QUÉ demo/página lo trajo)
--
-- QUÉ HACE:
--   1. Columna nueva `leads.origen_detalle` (text, nullable): la página o demo
--      de origen ya whitelisteada por el sitio ('home' / 'servicios' /
--      'experiencias' / 'demo-<slug>'). El enum `lead_origen` NO se toca
--      (el canal sigue siendo 'landing').
--   2. RPC v2 con el argumento `p_origen_detalle text DEFAULT NULL`.
--
-- RETROCOMPATIBLE: el lead.php desplegado HOY llama con 6 argumentos con
-- nombre; como el nuevo argumento tiene DEFAULT NULL, esa llamada sigue
-- funcionando igual. Por eso este SQL se aplica ANTES de desplegar el
-- inc/crm.php nuevo (que ya manda p_origen_detalle), sin ventana de quiebre.
--
-- OJO — se hace DROP + CREATE (no solo CREATE OR REPLACE): con distinta
-- firma, CREATE OR REPLACE crearía una SEGUNDA función (overload) y
-- PostgREST podría reclamar ambigüedad. El DROP borra también los GRANTs
-- (son por firma), así que se re-otorgan al final.
--
-- IDEMPOTENTE. Pegar en: Supabase → SQL Editor → New query → Run.
-- ============================================================

alter table leads add column if not exists origen_detalle text;

drop function if exists public.crear_lead_landing(text, text, text, text, text, text);

create or replace function public.crear_lead_landing(
  p_nombre         text,
  p_empresa        text default null,
  p_telefono       text default null,
  p_email          text default null,
  p_dolor_principal text default null,
  p_notas          text default null,
  p_origen_detalle text default null
)
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_codigo text;
begin
  if coalesce(trim(p_nombre),'') = '' then raise exception 'nombre requerido'; end if;
  insert into leads (nombre, empresa, telefono, email, dolor_principal, notas, origen, origen_detalle)
  values (trim(p_nombre), nullif(trim(p_empresa),''), nullif(trim(p_telefono),''),
          nullif(trim(p_email),''), nullif(trim(p_dolor_principal),''), nullif(trim(p_notas),''),
          'landing', nullif(trim(p_origen_detalle),''))
  returning codigo into v_codigo;
  return v_codigo;
end $function$;

-- Los GRANTs se pierden con el DROP (van por firma): re-otorgar.
revoke all on function public.crear_lead_landing(text, text, text, text, text, text, text) from public;
grant execute on function public.crear_lead_landing(text, text, text, text, text, text, text)
  to anon, authenticated, service_role;

-- ============================================================
-- VERIFICACIÓN (sin crear datos)
-- (1) En SQL Editor — debe listar UNA sola función, con 7 argumentos:
--   select proname, pg_get_function_identity_arguments(oid)
--   from pg_proc where proname = 'crear_lead_landing';
--
-- (2) Por REST (key publishable, sin login):
--   · POST /rest/v1/rpc/crear_lead_landing {"p_nombre":""}
--       → 400 P0001 'nombre requerido'   (firma vieja de 6 args sigue calzando por defaults)
--   · POST /rest/v1/rpc/crear_lead_landing {"p_nombre":"","p_origen_detalle":"demo-conserje"}
--       → 400 P0001 'nombre requerido'   (la firma nueva acepta el argumento)
--
-- (3) La columna existe:
--   select column_name from information_schema.columns
--   where table_name='leads' and column_name='origen_detalle';
-- ============================================================
