-- ============================================================
-- contratos.sql — MÓDULO CONTRATOS · Fase 2 (persistencia)
-- Guarda los contratos generados por el módulo, con el patrón multitenant de la casa:
--   · Metadatos + copia INMUTABLE de los datos en public.contratos (RLS por org).
--   · Correlativo POR (org_id, tipo) — tabla propia + RPC SECURITY DEFINER. Corrige
--     la fuga cross-tenant de `correlativos` global (tipo PK, contador compartido entre
--     orgs; ver correlativos_rls.sql). Aquí cada org tiene su propia serie por tipo.
--   · Inmutabilidad legal: un contrato 'emitido'/'firmado' no se puede alterar (guard).
--   · Auditoría: audit_row() → actividad (trail infalsificable, patrón multitenancy.sql).
--   · Archivo del HTML-master autocontenido en el bucket PRIVADO 'contratos'
--     bajo {org_id}/{uuid}.html (SIN policy de UPDATE → los master no se sobrescriben).
--
-- Reutiliza funciones YA existentes: set_org_id(), set_updated_at(), audit_row(),
-- auth_org_id(), is_admin(). NO las redefine.
-- Idempotente. Requiere: multitenancy.sql y biblioteca.sql ya corridos.
-- Pegar en: Supabase → SQL Editor → New query → Run.
-- ============================================================

-- 1) Tabla de contratos generados
create table if not exists public.contratos (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.orgs(id) on delete cascade,
  tipo           text not null,                          -- 'asesoria', 'sitio-web', 'impulsa', ...
  numero         int,                                    -- correlativo por (org,tipo); null en borrador
  correlativo    text,                                   -- 'TRD-ASE-0007'; null en borrador
  titulo         text not null,
  estado         text not null default 'borrador'
                 check (estado in ('borrador','emitido','firmado','anulado')),
  cliente_nombre text,
  cliente_rut    text,
  datos          jsonb not null default '{}'::jsonb,     -- copia inmutable de los campos del formulario
  storage_path   text,                                   -- HTML-master en bucket 'contratos'; null en borrador
  master_sha256  text,                                   -- hash del HTML-master archivado (integridad)
  retener_hasta  date,                                   -- retención legal; se fija al emitir
  creado_por     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table public.contratos alter column creado_por set default auth.uid();

-- 2) Auto-stamp de org_id (trigger de la casa)
drop trigger if exists trg_contratos_org on public.contratos;
create trigger trg_contratos_org before insert on public.contratos
  for each row execute function public.set_org_id();

-- 3) updated_at automático (función existente)
drop trigger if exists trg_contratos_updated on public.contratos;
create trigger trg_contratos_updated before update on public.contratos
  for each row execute function public.set_updated_at();

-- 4) Guard de ciclo de vida: 'emitido'/'firmado' son INMUTABLES (registro legal).
--    Los borradores se editan/borran libres. Solo se permite avanzar de estado.
create or replace function public.guard_contrato_lifecycle() returns trigger
language plpgsql set search_path = public as $$
begin
  if old.estado in ('emitido','firmado') then
    if new.datos        is distinct from old.datos
       or new.correlativo   is distinct from old.correlativo
       or new.numero        is distinct from old.numero
       or new.storage_path  is distinct from old.storage_path
       or new.master_sha256 is distinct from old.master_sha256
       or new.tipo          is distinct from old.tipo
       or new.org_id        is distinct from old.org_id then
      raise exception 'Un contrato % es inmutable; usa un anexo o una nueva versión', old.estado;
    end if;
    if new.estado not in (old.estado, 'firmado', 'anulado') then
      raise exception 'Transición de estado no permitida: % -> %', old.estado, new.estado;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_contratos_guard on public.contratos;
create trigger trg_contratos_guard before update on public.contratos
  for each row execute function public.guard_contrato_lifecycle();

-- 5) Auditoría (audit_row → actividad)
drop trigger if exists trg_contratos_audit on public.contratos;
create trigger trg_contratos_audit after insert or update or delete on public.contratos
  for each row execute function public.audit_row();

-- 6) Índices (patrón indices.sql)
create index if not exists idx_contratos_org_created on public.contratos (org_id, created_at desc);
create index if not exists idx_contratos_org_tipo    on public.contratos (org_id, tipo);
create index if not exists idx_contratos_org_estado  on public.contratos (org_id, estado);

-- 7) RLS multitenant (subselect = cache InitPlan, patrón rls_perf.sql/biblioteca.sql)
alter table public.contratos enable row level security;

drop policy if exists contratos_select on public.contratos;
create policy contratos_select on public.contratos for select to authenticated
  using (org_id = (select public.auth_org_id()));

drop policy if exists contratos_insert on public.contratos;
create policy contratos_insert on public.contratos for insert to authenticated
  with check (org_id = (select public.auth_org_id()));

drop policy if exists contratos_update on public.contratos;
create policy contratos_update on public.contratos for update to authenticated
  using (org_id = (select public.auth_org_id()))
  with check (org_id = (select public.auth_org_id()));

-- Borrar: solo borradores, por su autor o un admin. Los emitidos NUNCA se borran (retención).
drop policy if exists contratos_delete on public.contratos;
create policy contratos_delete on public.contratos for delete to authenticated
  using (
    org_id = (select public.auth_org_id())
    and estado = 'borrador'
    and (creado_por = auth.uid() or (select public.is_admin()))
  );

-- 8) Correlativo POR (org, tipo): tabla propia + RPC definer (deny-all a la tabla,
--    patrón correlativos_rls.sql). Cada org tiene su serie independiente por tipo.
create table if not exists public.correlativos_contratos (
  org_id uuid not null references public.orgs(id) on delete cascade,
  tipo   text not null,
  ultimo int  not null default 0,
  primary key (org_id, tipo)
);
alter table public.correlativos_contratos enable row level security;
revoke all on table public.correlativos_contratos from anon, authenticated;

create or replace function public.next_contrato_correlativo(p_tipo text) returns int
language plpgsql security definer set search_path = public as $$
declare v_org uuid := auth_org_id(); n int;
begin
  if v_org is null then raise exception 'Sin organización para asignar correlativo'; end if;
  insert into public.correlativos_contratos (org_id, tipo, ultimo)
    values (v_org, p_tipo, 1)
    on conflict (org_id, tipo) do update set ultimo = public.correlativos_contratos.ultimo + 1
    returning ultimo into n;
  return n;
end $$;
-- Cerrar a anon: Supabase concede EXECUTE a anon vía default privileges, así que hay que
-- revocar de anon (y de public). Luego se concede solo a authenticated.
revoke all on function public.next_contrato_correlativo(text) from anon, public;
grant execute on function public.next_contrato_correlativo(text) to authenticated;

-- 9) Storage privado: bucket 'contratos' → {org_id}/{uuid}.html
--    RLS por 1er folder = org. SIN policy de UPDATE (master inmutable). Borrar = admin.
insert into storage.buckets (id, name, public)
values ('contratos', 'contratos', false)
on conflict (id) do nothing;

drop policy if exists contratos_stg_select on storage.objects;
create policy contratos_stg_select on storage.objects for select to authenticated
  using (bucket_id = 'contratos' and (storage.foldername(name))[1] = (select public.auth_org_id())::text);

drop policy if exists contratos_stg_insert on storage.objects;
create policy contratos_stg_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'contratos' and (storage.foldername(name))[1] = (select public.auth_org_id())::text);

drop policy if exists contratos_stg_delete on storage.objects;
create policy contratos_stg_delete on storage.objects for delete to authenticated
  using (bucket_id = 'contratos' and (storage.foldername(name))[1] = (select public.auth_org_id())::text and (select public.is_admin()));

-- 10) Auditoría de accesos a la PII (Fase 5). El módulo llama a este RPC antes de
--     abrir/descargar un contrato → registro en actividad (base del Protocolo de Brechas).
--     SECURITY DEFINER para escribir en actividad (deny-all al cliente); verifica la org.
create or replace function public.log_contrato_acceso(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_org uuid := auth_org_id(); v_correlativo text;
begin
  if v_org is null then raise exception 'Sin sesión'; end if;
  select correlativo into v_correlativo from public.contratos where id = p_id and org_id = v_org;
  if not found then raise exception 'Contrato no encontrado en tu organización'; end if;
  insert into public.actividad (entidad, entidad_id, accion, usuario, org_id, payload)
  values ('contratos', p_id, 'descarga', auth.uid(), v_org, jsonb_build_object('correlativo', v_correlativo));
end $$;
revoke all on function public.log_contrato_acceso(uuid) from anon, public;
grant execute on function public.log_contrato_acceso(uuid) to authenticated;

-- ============================================================
-- Verificación rápida (con la sesión de un usuario de la org):
--   1) select public.next_contrato_correlativo('asesoria');  → 1, luego 2, 3…
--   2) insert into contratos(tipo,titulo,estado) values('asesoria','Test',​'borrador'); → org_id auto
--   3) desde OTRA org: select * from contratos;  → NO debe ver los de la primera (aislamiento)
--   4) update un contrato 'emitido' cambiando datos → debe FALLAR (guard de inmutabilidad)
-- ============================================================
