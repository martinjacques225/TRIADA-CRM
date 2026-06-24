-- supabase/realtime.sql — habilita Supabase Realtime para la SINCRONIZACIÓN EN VIVO
-- entre el CRM de escritorio y la app móvil (movil/).
--
-- CÓMO USARLO: Supabase → Dashboard → SQL Editor → New query → pega TODO esto → Run.
-- Es idempotente: puedes correrlo varias veces sin problema.
--
-- QUÉ HACE: agrega las tablas del CRM a la publicación `supabase_realtime`, para que
-- los clientes reciban INSERT/UPDATE/DELETE en vivo (vía js/realtime.js). La seguridad
-- NO cambia: las RLS siguen mandando — cada usuario solo recibe cambios de las filas
-- que ya tiene permiso de ver.

do $$
declare t text;
begin
  foreach t in array array['leads', 'citas', 'propuestas', 'diagnosticos', 'clientes'] loop
    if to_regclass('public.' || t) is not null
       and not exists (
         select 1 from pg_publication_tables
         where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
       )
    then
      execute format('alter publication supabase_realtime add table public.%I', t);
      raise notice 'Realtime habilitado para: %', t;
    end if;
  end loop;
end $$;

-- Verificación: tablas con Realtime activo (deberían salir las 5 de arriba que existan).
select tablename
from pg_publication_tables
where pubname = 'supabase_realtime' and schemaname = 'public'
order by tablename;
