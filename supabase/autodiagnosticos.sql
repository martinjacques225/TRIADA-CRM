-- ============================================================
-- TRIADA CRM · Autodiagnósticos (formulario público 360)
-- Pegar y ejecutar en: Supabase → SQL Editor → New query → Run
--
-- Qué es: la autoevaluación que llena EL CLIENTE desde el enlace
-- público ("Compartir 360"). Es una REFERENCIA adjunta al lead,
-- visible en el pipeline/ficha. NO es el diagnóstico oficial
-- (tabla diagnosticos), que se hace desde el CRM y genera el
-- Informe Ejecutivo 360.
-- ============================================================

create table autodiagnosticos (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references leads(id),
  scores     jsonb not null,
  created_at timestamptz default now()
);

alter table autodiagnosticos enable row level security;

-- El público (anon) SOLO puede insertar: necesita el enlace con el
-- UUID del lead (no adivinable) y no puede leer ni modificar nada.
create policy autodiag_public_ins on autodiagnosticos
  for insert to anon with check (true);

-- Los usuarios autenticados del CRM leen/escriben todo.
create policy autodiag_auth_all on autodiagnosticos
  for all to authenticated using (true) with check (true);
