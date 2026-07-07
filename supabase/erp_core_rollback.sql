-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK de ERP Tríada · F0 · Cimientos (supabase/erp_core.sql)
-- Orden seguro: restaurar guard SIN erp_role → soltar columna → soltar objetos.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Restaurar guard_profile_privesc a la versión previa (sin erp_role) ANTES de soltar la columna.
create or replace function public.guard_profile_privesc() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if (new.role   is distinct from old.role
   or new.org_id is distinct from old.org_id
   or new.activo is distinct from old.activo) and not is_admin() then
     raise exception 'no autorizado: solo un admin puede cambiar role/org/activo';
  end if;
  return new;
end $$;

-- 2) Config por tenant.
drop table if exists public.org_settings cascade;

-- 3) Helpers de capacidad.
drop function if exists public.is_gerencia();
drop function if exists public.is_finanzas();
drop function if exists public.can_ver_finanzas();
drop function if exists public.can_ver_nomina();

-- 4) Columna + enum (la columna primero, luego el tipo).
alter table public.profiles drop column if exists erp_role;
drop type if exists public.erp_role_t;
