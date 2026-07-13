-- ═══════════════════════════════════════════════════════════════════════════
-- ACADEMIA TRÍADA · F1 · Riel de ingeniería — modelo base  (aditivo / idempotente)
-- ───────────────────────────────────────────────────────────────────────────
-- Convierte la Academia (hoy PHP + localStorage, sin backend) en un sistema con
-- identidad, progreso en servidor y operación en el CRM. Esta migración crea
-- SOLO los cimientos de datos: tablas, RLS, RPC y semillas. NO envía correos, NO
-- toca ninguna tabla existente y NO cambia nada visible en producción.
--
-- Decisiones que implementa (ver triada-home/docs/academia/DECISIONES-F0.md):
--   · Egreso por cargo         → academia_programas + academia_programa_modulos(required)
--   · RUT restringido          → schema confidencial `academia` fuera de PostgREST +
--                                RPC security-definer con MFA aal2 + auditoría REDACTADA
--                                (mismo patrón que la nómina, erp_f4.sql). NO es una
--                                columna cifrada que igual se puede SELECT.
--   · Ventas uniformada        → su programa exige el tronco común (n1+tc2+tc3+tc4)
--   · Correo SiteGround         → outbox con reintentos/idempotencia, SIN eventos de
--                                proveedor (no hay tabla email_eventos ni webhook)
--   · Servidor = autoridad     → eventos idempotentes + progreso consolidado
--
-- Convenciones REALES del repo que reutiliza (no inventa):
--   orgs · profiles(role/erp_role/org_id) · auth_org_id() · is_admin() · is_gerencia()
--   set_org_id() · set_updated_at() · set_codigo('PREFIJO') · correlativos · audit_row()
--   org interna Tríada = 756221c3-97af-4569-a36e-6a4e0318290f
--
-- ⚠️ OPERACIÓN MANUAL: NO agregar el schema `academia` a "Exposed schemas" en el
--    dashboard de Supabase (API settings). Debe quedar fuera de PostgREST, igual
--    que `erp`.
--
-- Rollback: supabase/academia_f1_rollback.sql
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;   -- gen_random_bytes / digest (tokens de sesión)

-- ── 0. Schema confidencial para el RUT (cerrado a la API) ───────────────────
create schema if not exists academia;
revoke all on schema academia from anon, authenticated;
revoke all on all tables in schema academia from anon, authenticated;

-- ── 1. Catálogo y operación (public.academia_*) ─────────────────────────────

-- 1.1 Reclutadores (configurables; el correo NUNCA se expone al navegador)
create table if not exists public.academia_reclutadores (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references public.orgs(id),
  profile_id          uuid references public.profiles(id),   -- login del reclutador (si tiene)
  slug                text not null,
  display_name        text not null,
  institutional_email text not null,
  active              boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (org_id, slug)
);

-- 1.2 Programas por cargo (versionados; la regla de egreso vive aquí, no en código)
create table if not exists public.academia_programas (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references public.orgs(id),
  code              text not null,
  version           integer not null default 1,
  name              text not null,
  route_code        text,                       -- cargo/ruta principal (ventas/diseno/…)
  status            text not null default 'active' check (status in ('draft','active','retired')),
  completion_policy jsonb not null default '{}'::jsonb,
  active_from       timestamptz,
  active_until      timestamptz,
  created_at        timestamptz not null default now(),
  unique (org_id, code, version)
);

-- 1.3 Catálogo estable de módulos (global; contrato de migración = §26 del plan)
create table if not exists public.academia_modulos (
  id                      uuid primary key default gen_random_uuid(),
  code                    text not null unique,
  title                   text not null,
  route_code              text,
  local_storage_key       text,               -- progressKey vigente (no se renombra)
  slides_total            smallint,
  current_content_version integer not null default 1,
  pass_score              smallint not null default 80 check (pass_score between 0 and 100),
  active                  boolean not null default true,
  created_at              timestamptz not null default now()
);

-- 1.4 Qué módulos exige cada programa (required = cuenta para el título)
create table if not exists public.academia_programa_modulos (
  program_id uuid not null references public.academia_programas(id) on delete cascade,
  module_id  uuid not null references public.academia_modulos(id),
  route_code text,
  sequence   integer not null,
  required   boolean not null default true,
  primary key (program_id, module_id)
);

-- 1.5 Aspirantes — datos de CONTACTO (el RUT va en el schema confidencial, ver 2)
create table if not exists public.academia_aspirantes (
  id             uuid primary key default gen_random_uuid(),
  codigo         text unique,
  org_id         uuid not null references public.orgs(id),
  auth_user_id   uuid,                          -- futuro: Supabase Auth con enlace mágico
  full_name      text not null,
  personal_email text not null,
  phone_e164     text not null,
  commune        text not null,
  status         text not null default 'active' check (status in ('active','withdrawn','anonymized')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create unique index if not exists academia_aspirantes_email_org_uq
  on public.academia_aspirantes (org_id, lower(personal_email))
  where status <> 'anonymized';

-- 1.6 Sesiones individuales opacas (solo se guarda el SHA-256 del token)
create table if not exists public.academia_sesiones (
  id           uuid primary key default gen_random_uuid(),
  aspirant_id  uuid not null references public.academia_aspirantes(id) on delete cascade,
  token_hash   text not null unique,
  expires_at   timestamptz not null,
  last_seen_at timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now()
);

-- 1.7 Inscripción = aspirante · programa · reclutador · estado
--     program_id/route NULLABLE: el reclutador asigna el cargo tras el registro (F5).
create table if not exists public.academia_inscripciones (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.orgs(id),
  aspirant_id  uuid not null references public.academia_aspirantes(id) on delete cascade,
  program_id   uuid references public.academia_programas(id),
  recruiter_id uuid not null references public.academia_reclutadores(id),
  route_code   text,
  status       text not null default 'registered' check (status in (
                 'registered','in_training','theory_complete','validation_pending',
                 'corrections_required','approved','not_approved','letter_sent','withdrawn')),
  enrolled_at  timestamptz not null default now(),
  completed_at timestamptz,
  unique (aspirant_id)      -- una inscripción activa por aspirante en el MVP
);

-- 1.8 Consentimiento — evidencia versionada (Ley 21.719)
create table if not exists public.academia_consentimientos (
  id            uuid primary key default gen_random_uuid(),
  aspirant_id   uuid not null references public.academia_aspirantes(id) on delete cascade,
  enrollment_id uuid not null references public.academia_inscripciones(id) on delete cascade,
  purpose_code  text not null,
  notice_version text not null,
  notice_sha256 text not null,
  accepted      boolean not null,
  accepted_at   timestamptz not null,
  withdrawn_at  timestamptz,
  evidence      jsonb not null default '{}'::jsonb
);

-- 1.9 Progreso consolidado por módulo (servidor = autoridad)
create table if not exists public.academia_progreso_modulos (
  enrollment_id   uuid not null references public.academia_inscripciones(id) on delete cascade,
  module_id       uuid not null references public.academia_modulos(id),
  content_version integer not null default 1,
  max_slide       integer not null default 0,
  slides_total    integer,
  best_quiz_score smallint check (best_quiz_score between 0 and 100),
  theory_passed_at timestamptz,
  source          text not null default 'web' check (source in ('web','legacy_local_import_v1','admin')),
  verified        boolean not null default false,
  updated_at      timestamptz not null default now(),
  primary key (enrollment_id, module_id)
);

-- 1.10 Historial append-only e idempotente (event_id único)
create table if not exists public.academia_eventos (
  id                 uuid primary key default gen_random_uuid(),
  event_id           uuid not null unique,
  enrollment_id      uuid not null references public.academia_inscripciones(id) on delete cascade,
  module_id          uuid references public.academia_modulos(id),
  event_type         text not null,
  payload            jsonb not null default '{}'::jsonb,
  client_occurred_at timestamptz,
  received_at        timestamptz not null default now()
);

-- 1.11 Cola de correo (SiteGround SMTP: sin eventos de proveedor; sí idempotencia)
create table if not exists public.academia_email_outbox (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.orgs(id),
  enrollment_id   uuid not null references public.academia_inscripciones(id) on delete cascade,
  recruiter_id    uuid references public.academia_reclutadores(id),
  template_key    text not null,
  recipient_type  text not null check (recipient_type in ('recruiter','aspirant')),
  dedupe_key      text not null unique,
  payload         jsonb not null default '{}'::jsonb,     -- NUNCA RUT ni PII innecesaria
  status          text not null default 'queued' check (status in ('queued','processing','sent','failed','dead')),
  attempts        integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error_code text,
  created_at      timestamptz not null default now(),
  sent_at         timestamptz
);

-- 1.12 Evaluación práctica humana
create table if not exists public.academia_evaluaciones (
  id                   uuid primary key default gen_random_uuid(),
  enrollment_id        uuid not null references public.academia_inscripciones(id) on delete cascade,
  evaluator_profile_id uuid not null references public.profiles(id),
  decision             text not null check (decision in ('approved','rejected','corrections_required')),
  rubric_version       text not null,
  notes                text,
  decided_at           timestamptz not null default now()
);

-- ── 2. Tabla CONFIDENCIAL del RUT (schema academia, fuera de PostgREST) ──────
create table if not exists academia.aspirante_rut (
  aspirant_id uuid primary key references public.academia_aspirantes(id) on delete cascade,
  rut         text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
-- RLS deny-all explícito (defensa en profundidad; el acceso real es por RPC definer)
alter table academia.aspirante_rut enable row level security;
drop policy if exists aspirante_rut_deny_all on academia.aspirante_rut;
create policy aspirante_rut_deny_all on academia.aspirante_rut
  for all to anon, authenticated using (false) with check (false);

-- ── 3. Correlativo del aspirante ────────────────────────────────────────────
insert into public.correlativos (tipo, ultimo)
  select 'ASP', 0 where not exists (select 1 from public.correlativos where tipo='ASP');

-- ── 4. Triggers (correlativo + org + updated_at) ────────────────────────────
drop trigger if exists trg_asp_codigo on public.academia_aspirantes;
create trigger trg_asp_codigo before insert on public.academia_aspirantes for each row execute function public.set_codigo('ASP');
drop trigger if exists trg_asp_org on public.academia_aspirantes;
create trigger trg_asp_org before insert on public.academia_aspirantes for each row execute function public.set_org_id();
drop trigger if exists trg_asp_upd on public.academia_aspirantes;
create trigger trg_asp_upd before update on public.academia_aspirantes for each row execute function public.set_updated_at();

drop trigger if exists trg_arec_org on public.academia_reclutadores;
create trigger trg_arec_org before insert on public.academia_reclutadores for each row execute function public.set_org_id();
drop trigger if exists trg_arec_upd on public.academia_reclutadores;
create trigger trg_arec_upd before update on public.academia_reclutadores for each row execute function public.set_updated_at();

drop trigger if exists trg_aprog_org on public.academia_programas;
create trigger trg_aprog_org before insert on public.academia_programas for each row execute function public.set_org_id();

drop trigger if exists trg_ains_org on public.academia_inscripciones;
create trigger trg_ains_org before insert on public.academia_inscripciones for each row execute function public.set_org_id();

drop trigger if exists trg_aout_org on public.academia_email_outbox;
create trigger trg_aout_org before insert on public.academia_email_outbox for each row execute function public.set_org_id();

drop trigger if exists trg_arut_upd on academia.aspirante_rut;
create trigger trg_arut_upd before update on academia.aspirante_rut for each row execute function public.set_updated_at();

-- Auditoría de transiciones de inscripción (no lleva PII directa: solo uuids + estado)
drop trigger if exists trg_ains_audit on public.academia_inscripciones;
create trigger trg_ains_audit after insert or update or delete on public.academia_inscripciones
  for each row execute function public.audit_row();

-- ── 5. Índices ──────────────────────────────────────────────────────────────
create index if not exists idx_arec_org       on public.academia_reclutadores(org_id);
create index if not exists idx_aprog_org      on public.academia_programas(org_id);
create index if not exists idx_apm_module     on public.academia_programa_modulos(module_id);
create index if not exists idx_asp_org        on public.academia_aspirantes(org_id);
create index if not exists idx_ases_aspirant  on public.academia_sesiones(aspirant_id);
create index if not exists idx_ains_org       on public.academia_inscripciones(org_id);
create index if not exists idx_ains_recruiter on public.academia_inscripciones(recruiter_id);
create index if not exists idx_ains_aspirant  on public.academia_inscripciones(aspirant_id);
create index if not exists idx_aprg_enroll    on public.academia_progreso_modulos(enrollment_id);
create index if not exists idx_aev_enroll     on public.academia_eventos(enrollment_id);
create index if not exists idx_aout_status    on public.academia_email_outbox(status, next_attempt_at);

-- ── 6. Helper de visibilidad: ¿qué reclutador soy? ──────────────────────────
create or replace function public.academia_mi_reclutador_id() returns uuid
  language sql stable security invoker set search_path = public as $$
  select r.id from public.academia_reclutadores r
   where r.profile_id = auth.uid() and r.active limit 1
$$;
revoke execute on function public.academia_mi_reclutador_id() from anon;

-- ── 7. RLS ──────────────────────────────────────────────────────────────────
-- Regla común de visibilidad de aspirantes: admin/gerencia ven todo en su org;
-- un reclutador ve SOLO sus asignados. anon NUNCA lee tablas (usa RPC).
alter table public.academia_reclutadores      enable row level security;
alter table public.academia_programas         enable row level security;
alter table public.academia_modulos           enable row level security;
alter table public.academia_programa_modulos  enable row level security;
alter table public.academia_aspirantes        enable row level security;
alter table public.academia_sesiones          enable row level security;
alter table public.academia_inscripciones     enable row level security;
alter table public.academia_consentimientos   enable row level security;
alter table public.academia_progreso_modulos  enable row level security;
alter table public.academia_eventos           enable row level security;
alter table public.academia_email_outbox      enable row level security;
alter table public.academia_evaluaciones      enable row level security;

-- Catálogo global de módulos: lectura para cualquier autenticado.
drop policy if exists academia_modulos_read on public.academia_modulos;
create policy academia_modulos_read on public.academia_modulos
  for select to authenticated using (true);

-- Programas y su malla: lectura por org.
drop policy if exists academia_programas_read on public.academia_programas;
create policy academia_programas_read on public.academia_programas
  for select to authenticated using (org_id = (select auth_org_id()));

drop policy if exists academia_programa_modulos_read on public.academia_programa_modulos;
create policy academia_programa_modulos_read on public.academia_programa_modulos
  for select to authenticated using (exists (
    select 1 from public.academia_programas p
    where p.id = program_id and p.org_id = (select auth_org_id())));

-- Reclutadores: lectura por org (incluye el correo, pero solo para el CRM autenticado).
drop policy if exists academia_reclutadores_read on public.academia_reclutadores;
create policy academia_reclutadores_read on public.academia_reclutadores
  for select to authenticated using (org_id = (select auth_org_id()));

-- Aspirantes (contacto): admin/gerencia o reclutador asignado.
drop policy if exists academia_aspirantes_read on public.academia_aspirantes;
create policy academia_aspirantes_read on public.academia_aspirantes
  for select to authenticated using (
    org_id = (select auth_org_id()) and (
      (select is_admin()) or (select is_gerencia()) or exists (
        select 1 from public.academia_inscripciones i
        where i.aspirant_id = academia_aspirantes.id
          and i.recruiter_id = (select academia_mi_reclutador_id()))));

-- Sesiones: nadie las lee por API (solo RPC definer).
drop policy if exists academia_sesiones_deny on public.academia_sesiones;
create policy academia_sesiones_deny on public.academia_sesiones
  for all to anon, authenticated using (false) with check (false);

-- Inscripciones: admin/gerencia o reclutador asignado.
drop policy if exists academia_inscripciones_read on public.academia_inscripciones;
create policy academia_inscripciones_read on public.academia_inscripciones
  for select to authenticated using (
    org_id = (select auth_org_id()) and (
      (select is_admin()) or (select is_gerencia())
      or recruiter_id = (select academia_mi_reclutador_id())));

-- Consentimientos / progreso / eventos / outbox / evaluaciones: vía inscripción visible.
drop policy if exists academia_consent_read on public.academia_consentimientos;
create policy academia_consent_read on public.academia_consentimientos
  for select to authenticated using (exists (
    select 1 from public.academia_inscripciones i
    where i.id = enrollment_id and i.org_id = (select auth_org_id())
      and ((select is_admin()) or (select is_gerencia())
           or i.recruiter_id = (select academia_mi_reclutador_id()))));

drop policy if exists academia_progreso_read on public.academia_progreso_modulos;
create policy academia_progreso_read on public.academia_progreso_modulos
  for select to authenticated using (exists (
    select 1 from public.academia_inscripciones i
    where i.id = enrollment_id and i.org_id = (select auth_org_id())
      and ((select is_admin()) or (select is_gerencia())
           or i.recruiter_id = (select academia_mi_reclutador_id()))));

drop policy if exists academia_eventos_read on public.academia_eventos;
create policy academia_eventos_read on public.academia_eventos
  for select to authenticated using (exists (
    select 1 from public.academia_inscripciones i
    where i.id = enrollment_id and i.org_id = (select auth_org_id())
      and ((select is_admin()) or (select is_gerencia())
           or i.recruiter_id = (select academia_mi_reclutador_id()))));

drop policy if exists academia_outbox_read on public.academia_email_outbox;
create policy academia_outbox_read on public.academia_email_outbox
  for select to authenticated using (
    org_id = (select auth_org_id()) and (
      (select is_admin()) or (select is_gerencia())
      or recruiter_id = (select academia_mi_reclutador_id())));

drop policy if exists academia_eval_read on public.academia_evaluaciones;
create policy academia_eval_read on public.academia_evaluaciones
  for select to authenticated using (exists (
    select 1 from public.academia_inscripciones i
    where i.id = enrollment_id and i.org_id = (select auth_org_id())
      and ((select is_admin()) or (select is_gerencia())
           or i.recruiter_id = (select academia_mi_reclutador_id()))));

-- (Sin políticas de INSERT/UPDATE/DELETE para authenticated: toda escritura pasa por
--  RPC security-definer o por el CRM en fases posteriores. anon jamás escribe directo.)

-- ── 8. RPC ──────────────────────────────────────────────────────────────────

-- 8.1 bootstrap: estado mínimo para el registro. NUNCA devuelve correos.
create or replace function public.academia_bootstrap()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'recruiters', coalesce((
        select jsonb_agg(jsonb_build_object('id', r.id, 'name', r.display_name) order by r.display_name)
        from public.academia_reclutadores r
        where r.active and r.org_id = (select id from public.orgs order by created_at limit 1)
      ), '[]'::jsonb),
    'notice', jsonb_build_object('version','2026-07-v1','url','/academia/privacidad/')
  );
$$;

-- 8.2 registrar_aspirante: alta tras el gate. Escribe el RUT en el schema confidencial.
--     Devuelve un token opaco de sesión (el sitio lo pone en cookie HttpOnly).
--     Reingreso NEUTRAL: si el correo ya existe, devuelve {status:'exists'} sin token.
create or replace function public.academia_registrar_aspirante(
  p_full_name text, p_personal_email text, p_phone text, p_commune text,
  p_rut text, p_recruiter_id uuid, p_consent_accepted boolean,
  p_notice_version text, p_notice_sha256 text default '')
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_org uuid; v_asp uuid; v_ins uuid; v_token text; v_rec uuid;
begin
  if coalesce(trim(p_full_name),'')='' or coalesce(trim(p_personal_email),'')=''
     or coalesce(trim(p_phone),'')='' or coalesce(trim(p_commune),'')=''
     or coalesce(trim(p_rut),'')='' then
    raise exception 'VALIDATION_ERROR' using errcode='22023';
  end if;
  if p_consent_accepted is not true then
    raise exception 'CONSENT_REQUIRED' using errcode='22023';
  end if;

  select id into v_org from public.orgs order by created_at limit 1;

  -- Reclutador válido y activo en la org
  select id into v_rec from public.academia_reclutadores
   where id = p_recruiter_id and active and org_id = v_org;
  if v_rec is null then raise exception 'RECRUITER_UNAVAILABLE' using errcode='22023'; end if;

  -- Reingreso neutral (no revela existencia)
  if exists (select 1 from public.academia_aspirantes
             where org_id = v_org and lower(personal_email)=lower(trim(p_personal_email))
               and status <> 'anonymized') then
    return jsonb_build_object('status','exists');
  end if;

  insert into public.academia_aspirantes (full_name, personal_email, phone_e164, commune)
  values (trim(p_full_name), lower(trim(p_personal_email)), trim(p_phone), trim(p_commune))
  returning id into v_asp;

  insert into academia.aspirante_rut (aspirant_id, rut) values (v_asp, trim(p_rut));

  insert into public.academia_inscripciones (aspirant_id, recruiter_id, status)
  values (v_asp, v_rec, 'registered') returning id into v_ins;

  insert into public.academia_consentimientos
    (aspirant_id, enrollment_id, purpose_code, notice_version, notice_sha256, accepted, accepted_at, evidence)
  values (v_asp, v_ins, 'academia_formacion', p_notice_version, coalesce(nullif(p_notice_sha256,''),'n/a'),
          true, now(), jsonb_build_object('via','web'));

  v_token := encode(gen_random_bytes(32),'hex');
  insert into public.academia_sesiones (aspirant_id, token_hash, expires_at)
  values (v_asp, encode(digest(v_token,'sha256'),'hex'), now() + interval '30 days');

  insert into public.academia_eventos (event_id, enrollment_id, event_type, payload)
  values (gen_random_uuid(), v_ins, 'registration_completed', jsonb_build_object('recruiter', v_rec));

  return jsonb_build_object('status','registered','token', v_token,
                            'aspirantId', v_asp, 'enrollmentId', v_ins);
end $$;

-- 8.3 me: proyección individual del aspirante a partir del token de sesión.
create or replace function public.academia_me(p_token text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_asp uuid; v_ins uuid; v_res jsonb;
begin
  select s.aspirant_id into v_asp from public.academia_sesiones s
   where s.token_hash = encode(digest(coalesce(p_token,''),'sha256'),'hex')
     and s.revoked_at is null and s.expires_at > now();
  if v_asp is null then raise exception 'SESSION_INVALID' using errcode='42501'; end if;

  update public.academia_sesiones set last_seen_at = now()
   where token_hash = encode(digest(p_token,'sha256'),'hex');

  select i.id into v_ins from public.academia_inscripciones i where i.aspirant_id = v_asp;

  select jsonb_build_object(
    'fullName', a.full_name,
    'status',   i.status,
    'routeCode', i.route_code,
    'progress', coalesce((
      select jsonb_agg(jsonb_build_object(
               'moduleCode', m.code, 'maxSlide', pm.max_slide,
               'slidesTotal', pm.slides_total, 'bestQuizScore', pm.best_quiz_score,
               'theoryPassed', pm.theory_passed_at is not null) order by m.code)
      from public.academia_progreso_modulos pm
      join public.academia_modulos m on m.id = pm.module_id
      where pm.enrollment_id = i.id), '[]'::jsonb)
  ) into v_res
  from public.academia_aspirantes a
  join public.academia_inscripciones i on i.aspirant_id = a.id
  where a.id = v_asp;

  return v_res;
end $$;

-- 8.4 ingesta_eventos: lote idempotente. El primer 80% crea UN aprobado + UNA outbox.
create or replace function public.academia_ingesta_eventos(p_token text, p_eventos jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_asp uuid; v_ins uuid; v_rec uuid; e jsonb; v_mod uuid; v_pass smallint;
  v_accepted int := 0; v_dup int := 0; v_new boolean;
begin
  select s.aspirant_id into v_asp from public.academia_sesiones s
   where s.token_hash = encode(digest(coalesce(p_token,''),'sha256'),'hex')
     and s.revoked_at is null and s.expires_at > now();
  if v_asp is null then raise exception 'SESSION_INVALID' using errcode='42501'; end if;

  select i.id, i.recruiter_id into v_ins, v_rec
    from public.academia_inscripciones i where i.aspirant_id = v_asp;
  if jsonb_typeof(p_eventos) <> 'array' or jsonb_array_length(p_eventos) > 50 then
    raise exception 'VALIDATION_ERROR' using errcode='22023';
  end if;

  for e in select * from jsonb_array_elements(p_eventos) loop
    select id, pass_score into v_mod, v_pass from public.academia_modulos where code = e->>'moduleCode';
    if v_mod is null then continue; end if;

    insert into public.academia_eventos (event_id, enrollment_id, module_id, event_type, payload, client_occurred_at)
    values ((e->>'eventId')::uuid, v_ins, v_mod, e->>'type', coalesce(e->'payload','{}'::jsonb),
            (e->>'occurredAt')::timestamptz)
    on conflict (event_id) do nothing;
    if not found then v_dup := v_dup + 1; continue; end if;
    v_accepted := v_accepted + 1;

    if e->>'type' = 'module_progressed' then
      insert into public.academia_progreso_modulos (enrollment_id, module_id, max_slide, slides_total)
      values (v_ins, v_mod, coalesce((e->'payload'->>'maxSlide')::int,0), (e->'payload'->>'slidesTotal')::int)
      on conflict (enrollment_id, module_id) do update
        set max_slide = greatest(academia_progreso_modulos.max_slide, excluded.max_slide),
            slides_total = coalesce(excluded.slides_total, academia_progreso_modulos.slides_total),
            updated_at = now();

    elsif e->>'type' = 'quiz_submitted' then
      insert into public.academia_progreso_modulos (enrollment_id, module_id, best_quiz_score)
      values (v_ins, v_mod, (e->'payload'->>'score')::smallint)
      on conflict (enrollment_id, module_id) do update
        set best_quiz_score = greatest(coalesce(academia_progreso_modulos.best_quiz_score,0),
                                       coalesce(excluded.best_quiz_score,0)),
            updated_at = now();

      -- ¿primer aprobado teórico? → marca + UNA outbox (idempotente por dedupe_key)
      if coalesce((e->'payload'->>'score')::smallint,0) >= v_pass then
        update public.academia_progreso_modulos
          set theory_passed_at = now()
          where enrollment_id = v_ins and module_id = v_mod and theory_passed_at is null
          returning true into v_new;
        if v_new then
          insert into public.academia_email_outbox
            (enrollment_id, recruiter_id, template_key, recipient_type, dedupe_key, payload)
          values (v_ins, v_rec, 'MODULE_PASSED_RECRUITER_V1', 'recruiter',
                  'module-passed:'||v_ins||':'||v_mod,
                  jsonb_build_object('moduleCode', e->>'moduleCode', 'score', (e->'payload'->>'score')::int))
          on conflict (dedupe_key) do nothing;
          insert into public.academia_eventos (event_id, enrollment_id, module_id, event_type, payload)
          values (gen_random_uuid(), v_ins, v_mod, 'module_theory_passed',
                  jsonb_build_object('score', (e->'payload'->>'score')::int))
          on conflict (event_id) do nothing;
        end if;
      end if;
    end if;
  end loop;

  return jsonb_build_object('accepted', v_accepted, 'duplicate', v_dup);
end $$;

-- 8.5 revelar_rut: SOLO admin/gerencia + MFA aal2; auditoría REDACTADA (jamás el RUT).
create or replace function public.academia_revelar_rut(p_aspirant_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_rut text; v_org uuid;
begin
  if not ((select is_admin()) or (select is_gerencia())) then
    raise exception 'no autorizado' using errcode='42501';
  end if;
  if coalesce((auth.jwt() ->> 'aal'),'aal1') <> 'aal2' then
    raise exception 'MFA requerida (aal2)' using errcode='42501';
  end if;
  select org_id into v_org from public.academia_aspirantes where id = p_aspirant_id;
  if v_org is null or v_org <> (select auth_org_id()) then
    raise exception 'no encontrado' using errcode='42501';
  end if;
  insert into public.actividad (entidad, entidad_id, accion, usuario, org_id, payload)
  values ('academia_aspirante_rut', p_aspirant_id, 'read', auth.uid(), (select auth_org_id()),
          jsonb_build_object('scope','revelar_rut'));   -- NUNCA el valor del RUT
  select rut into v_rut from academia.aspirante_rut where aspirant_id = p_aspirant_id;
  return v_rut;
end $$;

-- ── 9. Grants (superficie mínima) ───────────────────────────────────────────
-- RPC públicos del sitio (usan token opaco como credencial): anon + authenticated.
revoke execute on function public.academia_bootstrap()                                   from public;
revoke execute on function public.academia_registrar_aspirante(text,text,text,text,text,uuid,boolean,text,text) from public;
revoke execute on function public.academia_me(text)                                      from public;
revoke execute on function public.academia_ingesta_eventos(text,jsonb)                   from public;
grant  execute on function public.academia_bootstrap()                                   to anon, authenticated;
grant  execute on function public.academia_registrar_aspirante(text,text,text,text,text,uuid,boolean,text,text) to anon, authenticated;
grant  execute on function public.academia_me(text)                                      to anon, authenticated;
grant  execute on function public.academia_ingesta_eventos(text,jsonb)                   to anon, authenticated;
-- RUT: jamás anónimo.
revoke execute on function public.academia_revelar_rut(uuid) from public, anon;
grant  execute on function public.academia_revelar_rut(uuid) to authenticated;

-- ── 10. Semillas (datos NO ficticios: catálogo real; contrato §26 del plan) ──

-- 10.1 Los 12 módulos (code · title · route · progressKey · slides). Idempotente.
insert into public.academia_modulos (code, title, route_code, local_storage_key, slides_total) values
  ('n1',            'Nivel 1 · Cómo vender Tríada',          'tronco',      'triadaAcademia_v1_progress',      62),
  ('tc-digital',    'Tronco común · Fundamentos digitales',  'tronco',      'triadaAcademia_v1_tc2_progress',  49),
  ('tc-comunica',   'Tronco común · Comunicación + IA',      'tronco',      'triadaAcademia_v1_tc3_progress',  47),
  ('tc-triada',     'Tronco común · Cómo funciona la Tríada','tronco',      'triadaAcademia_v1_tc4_progress',  45),
  ('n2',            'Ventas · Después del sí',               'ventas',      'triadaAcademia_v1_n2_progress',   52),
  ('n3',            'Ventas · Del cliente al socio',         'ventas',      'triadaAcademia_v1_n3_progress',   51),
  ('n5',            'Ventas · Con propiedad',                'ventas',      'triadaAcademia_v1_n5_progress',   51),
  ('dis-operativo', 'Ruta Diseño · Operativo',              'diseno',      'triadaAcademia_v1_rdis_progress', 56),
  ('dev-operativo', 'Ruta Desarrollo · Operativo',          'desarrollo',  'triadaAcademia_v1_rdev_progress', 54),
  ('fin-operativo', 'Ruta Finanzas · Operativo',            'finanzas',    'triadaAcademia_v1_rfin_progress', 52),
  ('ops-operativo', 'Ruta Operaciones · Operativo',         'operaciones', 'triadaAcademia_v1_rops_progress', 52),
  ('n6-dominio',    'Nivel 6 · Dominio y proyecto final',   'dominio',     'triadaAcademia_v1_n6_progress',   52)
on conflict (code) do update
  set title=excluded.title, route_code=excluded.route_code,
      local_storage_key=excluded.local_storage_key, slides_total=excluded.slides_total;

-- 10.2 Un programa por cargo (org interna Tríada). Egreso = tronco + ruta + dominio.
insert into public.academia_programas (org_id, code, version, name, route_code, completion_policy) values
  ('756221c3-97af-4569-a36e-6a4e0318290f','VENTAS',     1,'Ejecutivo Comercial (Ventas)','ventas',     '{"rule":"tronco+ruta+dominio"}'),
  ('756221c3-97af-4569-a36e-6a4e0318290f','DISENO',     1,'Ejecutivo de Diseño','diseno',              '{"rule":"tronco+ruta+dominio"}'),
  ('756221c3-97af-4569-a36e-6a4e0318290f','DESARROLLO', 1,'Ejecutivo de Desarrollo','desarrollo',      '{"rule":"tronco+ruta+dominio"}'),
  ('756221c3-97af-4569-a36e-6a4e0318290f','FINANZAS',   1,'Ejecutivo de Finanzas','finanzas',          '{"rule":"tronco+ruta+dominio"}'),
  ('756221c3-97af-4569-a36e-6a4e0318290f','OPERACIONES',1,'Ejecutivo de Operaciones','operaciones',    '{"rule":"tronco+ruta+dominio"}')
on conflict (org_id, code, version) do nothing;

-- 10.3 Malla de cada programa: tronco (4, obligatorio) + ruta (obligatorio) + n6 (obligatorio).
do $$
declare
  v_prog record; v_seq int; v_mod record;
  tronco text[] := array['n1','tc-digital','tc-comunica','tc-triada'];
begin
  for v_prog in select id, route_code from public.academia_programas
                where org_id='756221c3-97af-4569-a36e-6a4e0318290f' and version=1 loop
    v_seq := 0;
    -- tronco común
    for v_mod in select code from public.academia_modulos
                 where code = any(tronco) order by array_position(tronco, code) loop
      v_seq := v_seq + 1;
      insert into public.academia_programa_modulos (program_id, module_id, route_code, sequence, required)
      select v_prog.id, m.id, 'tronco', v_seq, true from public.academia_modulos m where m.code = v_mod.code
      on conflict (program_id, module_id) do nothing;
    end loop;
    -- módulos de la ruta del cargo
    for v_mod in select code from public.academia_modulos
                 where route_code = v_prog.route_code and route_code not in ('tronco','dominio') order by code loop
      v_seq := v_seq + 1;
      insert into public.academia_programa_modulos (program_id, module_id, route_code, sequence, required)
      select v_prog.id, m.id, v_prog.route_code, v_seq, true from public.academia_modulos m where m.code = v_mod.code
      on conflict (program_id, module_id) do nothing;
    end loop;
    -- Dominio (n6) obligatorio al final
    v_seq := v_seq + 1;
    insert into public.academia_programa_modulos (program_id, module_id, route_code, sequence, required)
    select v_prog.id, m.id, 'dominio', v_seq, true from public.academia_modulos m where m.code = 'n6-dominio'
    on conflict (program_id, module_id) do nothing;
  end loop;
end $$;

-- 10.4 Reclutadores (correo institucional; profile_id se vincula por email si existe).
--      Jeinny aún sin correo corporativo → temporal a martin@ (se cambia 1 fila luego).
insert into public.academia_reclutadores (org_id, profile_id, slug, display_name, institutional_email) values
  ('756221c3-97af-4569-a36e-6a4e0318290f',
   (select id from public.profiles where email='martin@grupotriada.cl' limit 1),
   'martin','Martín Jacques','martin@grupotriada.cl'),
  ('756221c3-97af-4569-a36e-6a4e0318290f',
   null,
   'jeinny','Jeinny García','martin@grupotriada.cl'),
  ('756221c3-97af-4569-a36e-6a4e0318290f',
   (select id from public.profiles where email='vicente@grupotriada.cl' limit 1),
   'vicente','Vicente Rojas','vicente@grupotriada.cl')
on conflict (org_id, slug) do nothing;

-- 10.5 Blindaje de institutional_email: NO SELECT-able por PostgREST. Se quita el
--      SELECT de tabla a authenticated y se re-otorga por columna, SIN el correo.
--      El RPC academia_bootstrap (definer) lo sigue leyendo server-side. (Aplicado
--      también como migración academia_f1_reclutador_email_colpriv.)
revoke select on public.academia_reclutadores from authenticated;
grant select (id, org_id, profile_id, slug, display_name, active, created_at, updated_at)
  on public.academia_reclutadores to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN SUGERIDA (SQL Editor):
--   select code, title, slides_total from public.academia_modulos order by code;   -- 12
--   select p.code, count(*) filter (where pm.required) req
--     from academia_programas p join academia_programa_modulos pm on pm.program_id=p.id
--     group by p.code;                                                              -- 6 c/u
--   select slug, display_name, institutional_email from academia_reclutadores;      -- 3
--   -- El schema `academia` NO debe estar en API settings → Exposed schemas.
-- ═══════════════════════════════════════════════════════════════════════════
