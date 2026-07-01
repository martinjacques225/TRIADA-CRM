-- ============================================================
-- financiero.sql — MÓDULO FINANCIERO trIA (M2 "Lector IA" del Plan Maestro)
-- Análisis financiero "dirigiendo en vez de llamar" (SIN API):
--   El CRM genera un prompt-director a medida → el usuario lo lleva a su chat
--   (Gemini/Claude) con sus documentos → pega el JSON de vuelta → el CRM
--   renderiza el Informe Financiero con la marca Tríada.
--
--   · Metadatos + prompt + respuesta en public.analisis_financieros (RLS multitenant).
--   · Archivos adjuntos en el bucket PRIVADO 'financiero' bajo {org_id}/{uuid}.{ext}.
--   · Leer/crear/editar = miembro de la org. Borrar fila = admin o el creador.
-- Idempotente: se puede correr varias veces sin romper nada.
-- Aplicada vía Supabase MCP (migración modulo_financiero).
-- ============================================================

-- 1) Enums (idempotentes con guard — create type no soporta "if not exists")
do $$ begin
  if not exists (select 1 from pg_type where typname = 'fin_tipo') then
    create type public.fin_tipo as enum ('cierre', 'iva', 'remuneraciones');
  end if;
  if not exists (select 1 from pg_type where typname = 'fin_estado') then
    create type public.fin_estado as enum ('borrador', 'generado', 'analizado');
  end if;
  if not exists (select 1 from pg_type where typname = 'fin_modo') then
    create type public.fin_modo as enum ('documentos', 'cifras');
  end if;
end $$;

-- 2) Tabla de análisis financieros
create table if not exists public.analisis_financieros (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.orgs(id) on delete cascade,
  codigo         text unique,                       -- FIN-000001 (trigger set_codigo)
  tipo           public.fin_tipo   not null default 'cierre',
  periodo        text not null,                     -- 'YYYY-MM' o texto del periodo
  titulo         text,
  cliente_id     uuid references public.clientes(id) on delete set null,
  modo_entrada   public.fin_modo   not null default 'documentos',
  contexto       text,                              -- rubro / tamaño / notas del negocio
  cifras         jsonb,                             -- cifras tipeadas (modo 'cifras')
  documentos     jsonb not null default '[]'::jsonb,-- [{path,nombre,size,mime}] adjuntos
  prompt         text,                              -- prompt-director generado
  respuesta_raw  text,                              -- lo que pegó el usuario, crudo
  respuesta_json jsonb,                             -- informe parseado (contrato de salida)
  estado         public.fin_estado not null default 'borrador',
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.analisis_financieros
  alter column created_by set default auth.uid();

-- 3) Triggers (mismos helpers que el resto del CRM)
drop trigger if exists trg_finanalisis_org on public.analisis_financieros;
create trigger trg_finanalisis_org
  before insert on public.analisis_financieros
  for each row execute function public.set_org_id();

drop trigger if exists trg_finanalisis_codigo on public.analisis_financieros;
create trigger trg_finanalisis_codigo
  before insert on public.analisis_financieros
  for each row execute function public.set_codigo('FIN');

drop trigger if exists trg_finanalisis_updated on public.analisis_financieros;
create trigger trg_finanalisis_updated
  before update on public.analisis_financieros
  for each row execute function public.set_updated_at();

-- Correlativo FIN (next_correlativo es SECURITY DEFINER → pasa la RLS de correlativos)
insert into public.correlativos(tipo) values ('FIN') on conflict (tipo) do nothing;

-- 4) Índices (patrón indices.sql)
create index if not exists idx_finanalisis_org_created  on public.analisis_financieros (org_id, created_at desc);
create index if not exists idx_finanalisis_org_tipo     on public.analisis_financieros (org_id, tipo);
create index if not exists idx_finanalisis_org_periodo  on public.analisis_financieros (org_id, periodo);
create index if not exists idx_finanalisis_org_cliente  on public.analisis_financieros (org_id, cliente_id);

-- 5) RLS multitenant (subselect = cache InitPlan, patrón rls_perf.sql)
alter table public.analisis_financieros enable row level security;

drop policy if exists finanalisis_select on public.analisis_financieros;
create policy finanalisis_select on public.analisis_financieros
  for select to authenticated
  using (org_id = (select public.auth_org_id()));

drop policy if exists finanalisis_insert on public.analisis_financieros;
create policy finanalisis_insert on public.analisis_financieros
  for insert to authenticated
  with check (org_id = (select public.auth_org_id()));

drop policy if exists finanalisis_update on public.analisis_financieros;
create policy finanalisis_update on public.analisis_financieros
  for update to authenticated
  using (org_id = (select public.auth_org_id()))
  with check (org_id = (select public.auth_org_id()));

-- Borrar: admin o el creador (artefacto de trabajo, no repositorio compartido)
drop policy if exists finanalisis_delete on public.analisis_financieros;
create policy finanalisis_delete on public.analisis_financieros
  for delete to authenticated
  using (
    org_id = (select public.auth_org_id())
    and ((select public.is_admin()) or created_by = (select auth.uid()))
  );

-- ============================================================
-- 6) Storage privado: bucket 'financiero'
--    Ruta: {org_id}/{uuid}.{ext}  → RLS por 1er folder = org del usuario.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('financiero', 'financiero', false)
on conflict (id) do nothing;

drop policy if exists financiero_select on storage.objects;
create policy financiero_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'financiero'
    and (storage.foldername(name))[1] = (select public.auth_org_id())::text
  );

drop policy if exists financiero_insert on storage.objects;
create policy financiero_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'financiero'
    and (storage.foldername(name))[1] = (select public.auth_org_id())::text
  );

drop policy if exists financiero_update on storage.objects;
create policy financiero_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'financiero'
    and (storage.foldername(name))[1] = (select public.auth_org_id())::text
  );

drop policy if exists financiero_delete on storage.objects;
create policy financiero_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'financiero'
    and (storage.foldername(name))[1] = (select public.auth_org_id())::text
    and (select public.is_admin())
  );
