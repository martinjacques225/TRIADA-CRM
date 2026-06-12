-- ============================================================
-- CALENDARIO DE REUNIONES — extensión de la tabla citas
-- Ejecutar en Supabase (SQL Editor) DESPUÉS de schema.sql.
-- Idempotente: se puede correr más de una vez sin romper nada.
--
-- El CRM funciona sin estas columnas (guarda la cita base y avisa
-- en consola), pero participantes / recordatorios / recurrencia /
-- duración solo persisten después de correr este script.
-- ============================================================

alter table citas add column if not exists duracion_min  int   default 60;
alter table citas add column if not exists participantes jsonb default '[]'::jsonb;  -- array de UUIDs de profiles
alter table citas add column if not exists recordatorios jsonb default '[]'::jsonb;  -- array de minutos de anticipación [10,30,1440]
alter table citas add column if not exists recurrencia   text  default 'none';       -- none | daily | weekly | monthly

-- tipo (text) pasa a usar slugs:
--   emergencia | rutina | negocio | diagnostico | seguimiento | propuesta | interna
-- Migrar los valores legacy existentes a los nuevos slugs:
update citas set tipo = 'diagnostico' where tipo = 'Diagnóstico 360';
update citas set tipo = 'propuesta'   where tipo in ('Presentación propuesta', 'Presentación de propuesta');
update citas set tipo = 'seguimiento' where tipo in ('Seguimiento', 'Primer contacto', 'Contacto');
update citas set tipo = 'rutina'      where tipo = 'Otro';

-- ============================================================
-- LISTO. El calendario del CRM (Agenda) queda con persistencia
-- completa: tipos, participantes, recordatorios y recurrencia.
-- ============================================================
