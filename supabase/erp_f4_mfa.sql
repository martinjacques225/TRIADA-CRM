-- ═══════════════════════════════════════════════════════════════════════════
-- ERP Tríada · F4 · MFA — la nómina exige verificación en dos pasos (aal2)
--
-- `can_ver_nomina()` ahora requiere, además del rol (admin/gerencia/finanzas),
-- que la sesión esté en `aal2` (MFA/TOTP completado). Efecto:
--   · Sin MFA, los RPC de nómina y la política del bucket NO dan la vista completa
--     (guardar/eliminar/ver todo) → 'no autorizado' o, en listar_nomina, la rama
--     de fila propia (v_puede = false).
--   · «Mi liquidación» del colaborador NO cambia: usa la rama `e.profile_id =
--     auth.uid()`, independiente de can_ver_nomina.
-- El enrolamiento y el reto viven en la app (js/mfa.js), disparados on-demand al
-- entrar a Nómina — el login del CRM no se toca.
--
-- Aplicada por el MCP el 2026-07-08 (migración erp_f4_mfa).
-- Rollback: supabase/erp_f4_mfa_rollback.sql
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.can_ver_nomina() returns boolean
  language sql stable set search_path to 'public' as $$
  select exists(select 1 from public.profiles p
                where p.id = auth.uid() and coalesce(p.activo, true)
                  and (p.role = 'admin' or p.erp_role in ('gerencia','finanzas')))
     and coalesce((auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
$$;

revoke execute on function public.can_ver_nomina() from anon;
