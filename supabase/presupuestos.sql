-- ============================================================
-- TRIADA CRM · Migración: tabla PRESUPUESTOS
-- Pegar y ejecutar en: Supabase → SQL Editor → New query → Run
-- Idempotente: se puede correr más de una vez sin error.
--
-- Propuesta  = programa a ofrecer (cotización, sin IVA) — tabla `propuestas`.
-- Presupuesto = documento de cierre: programa + mano de obra + IVA + plan de
--               servicio. Cuelga del cliente; puede referenciar una propuesta.
-- ============================================================

-- Correlativo PRES-000001 (reusa el mecanismo de correlativos del esquema)
insert into correlativos(tipo) values ('PRES') on conflict (tipo) do nothing;

create table if not exists presupuestos (
  id            uuid primary key default gen_random_uuid(),
  codigo        text unique,
  cliente_id    uuid references clientes(id),
  lead_id       uuid references leads(id),
  propuesta_id  uuid references propuestas(id),
  servicios     jsonb,            -- ítems del programa [{descripcion,cantidad,precioUnit}]
  mano_obra     numeric default 0,
  plan_servicio text,             -- descripción del plan de servicio (si se contrata)
  plan_mensual  numeric default 0,-- valor recurrente del plan (informativo, no suma al total)
  neto          numeric default 0,-- programa + mano de obra (sin IVA)
  iva           numeric default 0,
  total         numeric default 0,-- neto + IVA (pago único)
  estado        text default 'borrador',  -- borrador | enviado | aceptado | rechazado
  vigencia      date,
  notas         text,
  responsable   uuid references profiles(id),
  created_at    timestamptz default now()
);

-- Autollena `codigo` con PRES-000001 en cada INSERT (mismo trigger que el resto)
drop trigger if exists trg_presup_codigo on presupuestos;
create trigger trg_presup_codigo before insert on presupuestos
  for each row execute function set_codigo('PRES');

-- RLS: cualquier usuario autenticado lee/escribe (mismo modelo que el esquema)
alter table presupuestos enable row level security;
drop policy if exists presupuestos_auth_all on presupuestos;
create policy presupuestos_auth_all on presupuestos
  for all to authenticated using (true) with check (true);

-- ============================================================
-- LISTO. El módulo Presupuesto del CRM detecta la tabla automáticamente.
-- ============================================================
