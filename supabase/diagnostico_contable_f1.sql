-- ============================================================
-- diagnostico_contable_f1.sql — MÓDULO DIAGNÓSTICO CONTABLE Y TRIBUTARIO · Fase 1
--
-- Prediagnóstico COMERCIAL que levanta el ejecutivo en reunión con gerentes,
-- administradores y responsables financieros de empresas de mayor complejidad.
-- NO es auditoría, certificación ni dictamen: son las respuestas DECLARADAS por
-- el cliente, puntuadas con una metodología fija para decidir si corresponde
-- derivar a la asesoría especializada.
--
-- INDEPENDIENTE del Diagnóstico 360 (`public.diagnosticos`): tablas propias con
-- prefijo dct_, cuestionario propio, puntaje propio, estados propios e historial
-- propio. Este archivo NO toca ninguna tabla existente salvo para insertar la
-- fila del correlativo 'DCT' (dato nuevo, no modifica los que ya están).
--
-- Patrón multitenant de la casa (idéntico a oportunidades_f1.sql / contratos.sql):
--   · org_id NOT NULL + trigger set_org_id() (auto-estampado en INSERT).
--   · RLS por (select auth_org_id()) — subselect = cache InitPlan.
--   · updated_at con set_updated_at(); auditoría infalsificable con audit_row().
--   · código correlativo con set_codigo('DCT') (mismo mecanismo que DIA y LEAD).
--
-- Reutiliza funciones YA existentes: set_org_id(), set_updated_at(), audit_row(),
-- auth_org_id(), set_codigo(). NO las redefine.
-- Idempotente. Requiere: multitenancy.sql corrido (orgs, profiles, auth_org_id).
-- Rollback: supabase/diagnostico_contable_f1_rollback.sql
-- Pegar en: Supabase → SQL Editor → New query → Run.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 0) Correlativo del módulo (DCT-000001, DCT-000002, …)
--    Sin esta fila, next_correlativo('DCT') devuelve null y el código queda
--    vacío: la evaluación igual se guarda, pero pierde su folio.
-- ────────────────────────────────────────────────────────────
insert into public.correlativos (tipo, ultimo)
values ('DCT', 0)
on conflict (tipo) do nothing;

-- ────────────────────────────────────────────────────────────
-- 1) Evaluaciones
--
--    `respuestas` es jsonb a propósito: el cuestionario vive en
--    modules/diagnostico-contable/domain/cuestionario.js y va a cambiar cuando
--    Sebastián afine la metodología. Normalizar 30 preguntas en columnas obliga
--    a una migración por cada ajuste; el jsonb las absorbe y el motor de puntaje
--    (testeado en node) sabe leerlas. Lo que SÍ se materializa en columnas es el
--    RESULTADO — puntajes, riesgo, estado, precio — porque de eso se filtra,
--    se ordena y se sacan los indicadores de la portada, y eso tiene que
--    resolverse en Postgres y no trayendo la tabla entera al navegador.
-- ────────────────────────────────────────────────────────────
create table if not exists public.dct_evaluaciones (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references public.orgs(id) on delete cascade,
  codigo              text,                       -- DCT-000001 (trigger set_codigo)

  -- Vínculo con el CRM. Ambos opcionales y ON DELETE SET NULL: la evaluación
  -- sobrevive aunque después se borre el lead. Si viene lead_id/cliente_id, los
  -- datos de contacto NO se duplican: se leen de su ficha.
  lead_id             uuid references public.leads(id)    on delete set null,
  cliente_id          uuid references public.clientes(id) on delete set null,

  -- ── Etapa 1 · Identificación (no puntúa) ──
  razon_social        text not null,
  nombre_fantasia     text,
  rut                 text,
  actividad_economica text,
  industria           text,
  entrevistado_nombre text,
  entrevistado_cargo  text,
  entrevistado_email  text,
  entrevistado_fono   text,
  ejecutivo           uuid references public.profiles(id) on delete set null,
  fecha               date not null default (now() at time zone 'America/Santiago')::date,
  trabajadores        int  check (trabajadores is null or trabajadores >= 0),
  sociedades_grupo    int  check (sociedades_grupo is null or sociedades_grupo >= 0),
  observaciones_ini   text,

  -- ── Cuestionario (etapas 2 a 4) ──
  respuestas          jsonb not null default '{}'::jsonb,
  observaciones_ejec  text,                       -- notas del ejecutivo TRIADA
  etapa_actual        int not null default 1 check (etapa_actual between 1 and 5),

  -- ── Resultado calculado (se persiste para poder filtrar/ordenar en SQL) ──
  puntaje_general     int check (puntaje_general    is null or puntaje_general    between 0 and 100),
  puntaje_financiero  int check (puntaje_financiero is null or puntaje_financiero between 0 and 100),
  puntaje_tributario  int check (puntaje_tributario is null or puntaje_tributario between 0 and 100),
  nivel_riesgo        text check (nivel_riesgo is null or nivel_riesgo in
                        ('favorable', 'observaciones', 'relevante', 'alto')),
  base_preparacion    text check (base_preparacion is null or base_preparacion in
                        ('ifrs', 'tributario', 'ambos', 'desconocida')),
  enfoque             jsonb not null default '[]'::jsonb,   -- necesidades principales (etapa 2)
  alertas             jsonb not null default '[]'::jsonb,   -- alertas prioritarias calculadas
  desconocidas        int  not null default 0,              -- cuántas respuestas "No lo sé"
  precio_inicial_uf   numeric(8,2),                         -- 10 / 20 / null (sujeto a revisión)
  precio_regla        text,                                 -- por qué salió ese valor

  -- ── Seguimiento comercial ──
  estado              text not null default 'borrador' check (estado in
                        ('borrador', 'completado', 'presentado', 'reunion_solicitada',
                         'propuesta_enviada', 'cerrado')),
  archivada           boolean not null default false,
  oportunidad_lead_id uuid references public.leads(id) on delete set null,  -- lead creado desde el resultado
  cita_id             uuid references public.citas(id) on delete set null,  -- seguimiento agendado
  cerrado_motivo      text,

  creado_por          uuid references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table public.dct_evaluaciones alter column creado_por set default auth.uid();

create index if not exists idx_dct_org_created  on public.dct_evaluaciones (org_id, created_at desc);
create index if not exists idx_dct_org_estado   on public.dct_evaluaciones (org_id, estado);
create index if not exists idx_dct_org_fecha    on public.dct_evaluaciones (org_id, fecha desc);
create index if not exists idx_dct_org_riesgo   on public.dct_evaluaciones (org_id, nivel_riesgo);
create index if not exists idx_dct_org_lead     on public.dct_evaluaciones (org_id, lead_id);
create index if not exists idx_dct_org_ejec     on public.dct_evaluaciones (org_id, ejecutivo);

-- ────────────────────────────────────────────────────────────
-- 2) Historial de la evaluación
--    Append-only: quién hizo qué y cuándo. Sin update ni delete (tampoco en RLS).
-- ────────────────────────────────────────────────────────────
create table if not exists public.dct_actividad (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.orgs(id) on delete cascade,
  evaluacion_id  uuid not null references public.dct_evaluaciones(id) on delete cascade,
  tipo           text not null check (tipo in
                   ('creada', 'guardada', 'completada', 'estado', 'informe',
                    'oportunidad', 'seguimiento', 'duplicada', 'archivada', 'nota')),
  detalle        text,
  usuario        uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now()
);
alter table public.dct_actividad alter column usuario set default auth.uid();

create index if not exists idx_dctact_eval on public.dct_actividad (evaluacion_id, created_at desc);

-- ────────────────────────────────────────────────────────────
-- 3) Triggers (org_id, updated_at, código y auditoría)
-- ────────────────────────────────────────────────────────────
drop trigger if exists trg_dct_org on public.dct_evaluaciones;
create trigger trg_dct_org before insert on public.dct_evaluaciones
  for each row execute function public.set_org_id();

drop trigger if exists trg_dct_codigo on public.dct_evaluaciones;
create trigger trg_dct_codigo before insert on public.dct_evaluaciones
  for each row execute function public.set_codigo('DCT');

drop trigger if exists trg_dct_upd on public.dct_evaluaciones;
create trigger trg_dct_upd before update on public.dct_evaluaciones
  for each row execute function public.set_updated_at();

drop trigger if exists trg_dct_audit on public.dct_evaluaciones;
create trigger trg_dct_audit after insert or update or delete on public.dct_evaluaciones
  for each row execute function public.audit_row();

drop trigger if exists trg_dctact_org on public.dct_actividad;
create trigger trg_dctact_org before insert on public.dct_actividad
  for each row execute function public.set_org_id();

-- ────────────────────────────────────────────────────────────
-- 4) RLS — misma organización, y nada más
--    Se apoya en op_es_lector() si existe (rol aditivo de solo lectura del
--    módulo de oportunidades). Si esa función no está, el bloque cae a la
--    versión sin lector: el módulo no depende de que oportunidades_f1.sql
--    esté corrido.
-- ────────────────────────────────────────────────────────────
alter table public.dct_evaluaciones enable row level security;
alter table public.dct_actividad    enable row level security;

do $$
declare
  v_lector text := case
    when exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public' and p.proname = 'op_es_lector')
    then ' and not (select public.op_es_lector())'
    else '' end;
begin
  -- dct_evaluaciones
  execute 'drop policy if exists dct_evaluaciones_select on public.dct_evaluaciones';
  execute 'create policy dct_evaluaciones_select on public.dct_evaluaciones for select to authenticated
             using (org_id = (select public.auth_org_id()))';

  execute 'drop policy if exists dct_evaluaciones_insert on public.dct_evaluaciones';
  execute 'create policy dct_evaluaciones_insert on public.dct_evaluaciones for insert to authenticated
             with check (org_id = (select public.auth_org_id())' || v_lector || ')';

  execute 'drop policy if exists dct_evaluaciones_update on public.dct_evaluaciones';
  execute 'create policy dct_evaluaciones_update on public.dct_evaluaciones for update to authenticated
             using (org_id = (select public.auth_org_id())' || v_lector || ')
             with check (org_id = (select public.auth_org_id()))';

  execute 'drop policy if exists dct_evaluaciones_delete on public.dct_evaluaciones';
  execute 'create policy dct_evaluaciones_delete on public.dct_evaluaciones for delete to authenticated
             using (org_id = (select public.auth_org_id())' || v_lector || ')';

  -- dct_actividad: se lee lo de la propia org; se inserta solo a nombre propio.
  execute 'drop policy if exists dct_actividad_select on public.dct_actividad';
  execute 'create policy dct_actividad_select on public.dct_actividad for select to authenticated
             using (org_id = (select public.auth_org_id()))';

  execute 'drop policy if exists dct_actividad_insert on public.dct_actividad';
  execute 'create policy dct_actividad_insert on public.dct_actividad for insert to authenticated
             with check (org_id = (select public.auth_org_id()) and usuario = (select auth.uid())' || v_lector || ')';
end $$;

-- ────────────────────────────────────────────────────────────
-- 5) Verificación rápida (debe devolver 2 tablas con rowsecurity = true)
-- ────────────────────────────────────────────────────────────
-- select tablename, rowsecurity from pg_tables
-- where schemaname = 'public' and tablename like 'dct_%';
