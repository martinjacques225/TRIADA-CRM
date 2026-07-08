-- ROLLBACK de ERP Tríada · F4 · MFA (deshace supabase/erp_f4_mfa.sql)
-- Restaura can_ver_nomina() SIN la exigencia de aal2 (solo rol). Úsalo si el
-- enrolamiento de MFA no funciona y hay que devolver el acceso a nómina por rol.
create or replace function public.can_ver_nomina() returns boolean
  language sql stable set search_path to 'public' as $$
  select exists(select 1 from public.profiles p
                where p.id = auth.uid() and coalesce(p.activo, true)
                  and (p.role = 'admin' or p.erp_role in ('gerencia','finanzas')))
$$;

revoke execute on function public.can_ver_nomina() from anon;
