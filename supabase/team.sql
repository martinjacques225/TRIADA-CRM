-- supabase/team.sql — gestión del EQUIPO (multiusuario) del CRM.
--
-- El alta de cada socio se hace en Supabase → Authentication → Users (Invite user).
-- El trigger `handle_new_user` (de schema.sql) le crea su fila en `profiles`
-- automáticamente. Aquí defines su NOMBRE, ROL y ÁREA, y puedes ver/desactivar
-- a todo el equipo. Corre en el SQL Editor el bloque que necesites.
--
-- Estos cambios valen para el CRM de PC Y la app móvil (misma cuenta, mismo perfil).

-- 1) VER el equipo actual (quién existe, su rol y área):
select email, nombre, role, area, activo, created_at
from profiles
order by created_at;

-- 2) DEFINIR un socio: nombre + rol + área. Cambia los valores y el email, y corre.
--    role:  'admin' | 'consultor'
--    area:  'comercial' | 'finanzas' | 'desarrollo' | 'rrhh' | 'operaciones' | 'tecnologia' | 'ventas'
update profiles
set nombre = 'Camila Reyes',
    role   = 'consultor',
    area   = 'finanzas'
where email = 'camila@grupotriada.cl';

-- 3) Hacerte ADMIN a ti (o a quien corresponda):
-- update profiles set role = 'admin', nombre = 'Martín Jacques', area = 'comercial'
-- where email = 'martin@grupotriada.cl';

-- 4) Desactivar a alguien (deja de aparecer en el equipo, sin borrar sus datos):
-- update profiles set activo = false where email = 'exsocio@grupotriada.cl';

-- 5) Reactivarlo:
-- update profiles set activo = true where email = 'socio@grupotriada.cl';
