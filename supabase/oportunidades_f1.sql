-- ============================================================
-- oportunidades_f1.sql — MÓDULO OPORTUNIDADES PÚBLICAS · Fase 1 (MVP manual)
--
-- Detectar, analizar, seleccionar, preparar y seguir oportunidades de Mercado
-- Público y Compra Ágil. Fase 1 = todo manual y funcionando de punta a punta:
-- bandeja → análisis → puntaje → costos → aprobaciones → oferta → resultado →
-- ejecución → factura → pago → certificado.
--
-- Patrón multitenant de la casa (idéntico a contratos.sql / erp_f*.sql):
--   · org_id NOT NULL + trigger set_org_id() (auto-estampado en INSERT).
--   · RLS por (select auth_org_id()) — subselect = cache InitPlan.
--   · updated_at con set_updated_at(); auditoría infalsificable con audit_row().
--   · Storage privado por {org_id}/… en el bucket 'oportunidades'.
--
-- Reutiliza funciones YA existentes: set_org_id(), set_updated_at(), audit_row(),
-- auth_org_id(), is_admin(). NO las redefine.
-- Idempotente. Requiere: multitenancy.sql y erp_f0/erp_f1 (tabla proyectos) corridos.
-- Rollback: supabase/oportunidades_f1_rollback.sql
-- Pegar en: Supabase → SQL Editor → New query → Run.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 0) Helpers de permisos del módulo
--    SECURITY INVOKER a propósito (patrón erp_f4: los DEFINER de lectura de
--    profiles levantaban advisors). Las policies los llaman con la sesión del
--    usuario, que SIEMPRE puede leer su propio perfil.
-- ────────────────────────────────────────────────────────────

-- ¿Este usuario es de solo lectura? Rol aditivo: hoy el enum `user_role` solo
-- tiene 'admin' y 'consultor', así que esto SIEMPRE da false y nada cambia.
-- Existe para poder invitar a un observador el día que se agregue el valor.
-- OJO: la comparación va por ::text a propósito. Con `role = 'lector'` Postgres
-- castea el literal al enum y revienta con 22P02 "invalid input value for enum"
-- (lo cazó la aplicación real de esta migración, 31-jul-2026).
create or replace function public.op_es_lector() returns boolean
language sql stable security invoker set search_path = public as $$
  select coalesce((select p.role::text = 'lector' from public.profiles p where p.id = auth.uid()), false)
$$;

-- ¿Puede FIRMAR la aprobación de esta área? Se deriva del perfil que ya existe
-- (role + area), sin inventar una tabla de permisos nueva. Los valores salen
-- del enum REAL `area_t` (comercial, finanzas, desarrollo, rrhh, operaciones,
-- tecnologia, ventas, diseno), no de una suposición:
--   comercial  → area 'comercial' o 'ventas'
--   tecnica    → area 'tecnologia' o 'desarrollo', o erp_role 'operaciones'
--   financiera → area 'finanzas', o erp_role 'finanzas'
-- `erp_role = 'gerencia'` NO abre las tres firmas a propósito: hoy 4 de los 5
-- perfiles la tienen, y si valiera como comodín una sola persona podría firmar
-- dos de las tres áreas y la regla de "los tres socios" quedaría en nada.
-- Un admin sí puede firmar cualquiera (si falta un socio, destraba) — pero
-- queda registrado quién firmó qué.
create or replace function public.op_puede_aprobar(p_area text) returns boolean
language sql stable security invoker set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (
        p.role::text = 'admin'
        or (p_area = 'comercial'  and p.area::text in ('comercial', 'ventas'))
        or (p_area = 'tecnica'    and (p.area::text in ('tecnologia', 'desarrollo') or p.erp_role::text = 'operaciones'))
        or (p_area = 'financiera' and (p.area::text = 'finanzas' or p.erp_role::text = 'finanzas'))
      )
  )
$$;

-- ────────────────────────────────────────────────────────────
-- 1) Configuración del módulo (1 fila por organización)
--    Umbrales, códigos UNSPSC a vigilar, regiones y palabras clave.
--    NUNCA guarda el ticket de la API: ese vive como variable de entorno del
--    servidor (Edge Function). Acá solo la BANDERA de si está configurado.
-- ────────────────────────────────────────────────────────────
create table if not exists public.op_config (
  org_id              uuid primary key references public.orgs(id) on delete cascade,
  puntaje_participar  int  not null default 70,   -- ≥ este puntaje: recomendada
  puntaje_revisar     int  not null default 55,   -- entre revisar y participar: la deciden los socios
  margen_objetivo     numeric(5,4) not null default 0.30,  -- 30% mínimo
  margen_descarte     numeric(5,4) not null default 0.25,  -- bajo 25%: causal crítica
  tope_aprobacion_neto bigint not null default 2500000,    -- sobre esto: firman los tres socios
  contingencia_pct    numeric(5,4) not null default 0.10,
  iva_tasa            numeric(5,4) not null default 0.19,
  horas_max_cotizacion numeric(5,2) not null default 2,    -- alerta si la cotización pasa de 2 h
  unspsc              jsonb not null default '[]'::jsonb,  -- códigos vigilados
  regiones            jsonb not null default '[]'::jsonb,
  palabras_clave      jsonb not null default '[]'::jsonb,
  servicios           jsonb not null default '[]'::jsonb,  -- servicios habilitados de TRIADA
  api_habilitada      boolean not null default false,      -- Fase 2 (solo bandera)
  updated_at          timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- 2) Oportunidades
-- ────────────────────────────────────────────────────────────
create table if not exists public.op_oportunidades (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references public.orgs(id) on delete cascade,
  fuente             text not null default 'manual'
                     check (fuente in ('manual', 'mercado_publico', 'compra_agil')),
  codigo_externo     text,                          -- ID oficial del proceso (ej. 1234-56-LE26)
  titulo             text not null,
  institucion        text,
  tipo_procedimiento text,                          -- licitacion_publica | compra_agil | trato_directo | convenio_marco
  descripcion        text,
  fecha_publicacion  date,
  fecha_cierre       timestamptz,                   -- fecha Y HORA de cierre (America/Santiago)
  region             text,
  modalidad          text check (modalidad is null or modalidad in ('presencial', 'remota', 'mixta')),
  presupuesto_monto  bigint,                        -- null = no publicado
  presupuesto_iva    text default 'desconocido'
                     check (presupuesto_iva in ('neto', 'con_iva', 'desconocido')),
  unspsc             jsonb not null default '[]'::jsonb,
  enlace             text,
  estado             text not null default 'detectada' check (estado in (
                       'detectada', 'pendiente_revision', 'descartada_auto', 'descartada',
                       'en_analisis', 'requiere_aclaracion', 'recomendada', 'no_recomendada',
                       'pendiente_aprobacion', 'aprobada', 'oferta_preparacion', 'lista_presentar',
                       'presentada', 'no_adjudicada', 'adjudicada', 'orden_recibida',
                       'en_ejecucion', 'recepcion_conforme', 'facturada', 'pagada',
                       'certificado_solicitado', 'certificado_obtenido', 'cerrada')),
  puntaje            int check (puntaje is null or (puntaje >= 0 and puntaje <= 100)),
  recomendacion      text check (recomendacion is null or recomendacion in ('participar', 'revisar', 'no_participar')),
  servicio_slug      text,                          -- servicio de TRIADA con el que calza
  responsable        uuid references public.profiles(id) on delete set null,
  tiempo_invertido_min int not null default 0,      -- minutos gastados analizando/cotizando
  motivo_descarte    text,
  motivo_reapertura  text,                          -- exigido para reabrir una descartada
  notas              text,
  datos_api          jsonb,                         -- registro ORIGINAL recibido de la API (Fase 2)
  sincronizado_at    timestamptz,
  creado_por         uuid references public.profiles(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
alter table public.op_oportunidades alter column creado_por set default auth.uid();

-- Idempotencia de la sincronización (Fase 2): un proceso oficial entra UNA vez
-- por organización. Los manuales (sin código) no chocan entre sí.
create unique index if not exists uq_op_externo
  on public.op_oportunidades (org_id, fuente, codigo_externo)
  where codigo_externo is not null;

create index if not exists idx_op_org_estado  on public.op_oportunidades (org_id, estado);
create index if not exists idx_op_org_cierre  on public.op_oportunidades (org_id, fecha_cierre);
create index if not exists idx_op_org_created on public.op_oportunidades (org_id, created_at desc);
create index if not exists idx_op_org_resp    on public.op_oportunidades (org_id, responsable);

-- ────────────────────────────────────────────────────────────
-- 3) Documentos del proceso (bases, anexos) → bucket 'oportunidades'
-- ────────────────────────────────────────────────────────────
create table if not exists public.op_documentos (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.orgs(id) on delete cascade,
  oportunidad_id uuid not null references public.op_oportunidades(id) on delete cascade,
  nombre         text not null,
  categoria      text default 'bases',
  storage_path   text,
  mime           text,
  bytes          bigint,
  origen         text not null default 'adjunto' check (origen in ('adjunto', 'api', 'enlace')),
  enlace         text,
  analizado_at   timestamptz,                        -- Fase 3 (IA)
  extraccion     jsonb,                              -- salida cruda del análisis IA
  subido_por     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now()
);
alter table public.op_documentos alter column subido_por set default auth.uid();
create index if not exists idx_opdoc_op on public.op_documentos (oportunidad_id);

-- ────────────────────────────────────────────────────────────
-- 4) Requisitos extraídos (Fase 1 manual · Fase 3 los propone la IA)
--    Regla dura del módulo: nada se da por cumplido sin que una PERSONA lo
--    confirme (confirmado_por). La IA solo propone y siempre cita su fuente.
-- ────────────────────────────────────────────────────────────
create table if not exists public.op_requisitos (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.orgs(id) on delete cascade,
  oportunidad_id uuid not null references public.op_oportunidades(id) on delete cascade,
  tipo           text not null default 'otro' check (tipo in (
                   'administrativo', 'tecnico', 'experiencia_institucional', 'experiencia_individual',
                   'titulo_certificado', 'garantia', 'multa', 'pago', 'plazo', 'entregable',
                   'reunion_visita', 'soporte', 'propiedad_intelectual', 'confidencialidad',
                   'dependencia', 'criterio_evaluacion', 'otro')),
  texto          text not null,
  obligatorio    boolean not null default false,
  documento_id   uuid references public.op_documentos(id) on delete set null,
  fuente_seccion text,                               -- "Bases administrativas, punto 4.2"
  confianza      numeric(3,2) check (confianza is null or (confianza >= 0 and confianza <= 1)),
  origen         text not null default 'manual' check (origen in ('manual', 'ia')),
  cumple         text not null default 'no_evaluado'
                 check (cumple in ('si', 'no', 'parcial', 'no_evaluado')),
  evidencia      text,                               -- con qué documento de TRIADA se acredita
  confirmado_por uuid references public.profiles(id) on delete set null,
  confirmado_at  timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists idx_opreq_op on public.op_requisitos (oportunidad_id);

-- ────────────────────────────────────────────────────────────
-- 5) Puntaje por criterio (0-100 repartido en 6 criterios)
-- ────────────────────────────────────────────────────────────
create table if not exists public.op_puntajes (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.orgs(id) on delete cascade,
  oportunidad_id uuid not null references public.op_oportunidades(id) on delete cascade,
  criterio       text not null check (criterio in (
                   'coincidencia', 'acreditacion', 'margen', 'capacidad', 'riesgo', 'estrategico')),
  puntos         numeric(5,2) not null default 0,
  puntos_max     numeric(5,2) not null,
  sugerido       numeric(5,2),                       -- lo que propuso el sistema
  justificacion  text,
  datos          jsonb,                              -- qué se usó para calcularlo
  manual         boolean not null default false,     -- ¿lo cambió una persona?
  motivo_manual  text,                               -- obligatorio si manual = true
  confirmado_por uuid references public.profiles(id) on delete set null,
  confirmado_at  timestamptz,
  updated_at     timestamptz not null default now(),
  unique (oportunidad_id, criterio)
);
-- Si una persona pisa el puntaje sugerido, el motivo es obligatorio (§10 del encargo).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'op_puntajes_motivo_ck') then
    alter table public.op_puntajes
      add constraint op_puntajes_motivo_ck
      check (not manual or coalesce(btrim(motivo_manual), '') <> '');
  end if;
end $$;
create index if not exists idx_oppunt_op on public.op_puntajes (oportunidad_id);

-- ────────────────────────────────────────────────────────────
-- 6) Riesgos y causales de descarte
-- ────────────────────────────────────────────────────────────
create table if not exists public.op_riesgos (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.orgs(id) on delete cascade,
  oportunidad_id uuid not null references public.op_oportunidades(id) on delete cascade,
  causal         text,                               -- slug de la causal crítica (ver domain/descarte.js)
  descripcion    text not null,
  nivel          text not null default 'medio' check (nivel in ('bajo', 'medio', 'alto', 'critico')),
  es_causal      boolean not null default false,     -- true = causal crítica de descarte
  origen         text not null default 'manual' check (origen in ('manual', 'ia', 'sistema')),
  mitigacion     text,
  created_at     timestamptz not null default now()
);
create index if not exists idx_oprie_op on public.op_riesgos (oportunidad_id);

-- ────────────────────────────────────────────────────────────
-- 7) Estimación de costos (cabecera) + ítems
--    Los CÁLCULOS no viven acá: son funciones puras testeadas en
--    modules/oportunidades/domain/finanzas.js. La tabla guarda insumos.
-- ────────────────────────────────────────────────────────────
create table if not exists public.op_costos (
  id                   uuid primary key default gen_random_uuid(),
  org_id               uuid not null references public.orgs(id) on delete cascade,
  oportunidad_id       uuid not null references public.op_oportunidades(id) on delete cascade,
  margen_objetivo      numeric(5,4) not null default 0.30,
  contingencia_pct     numeric(5,4) not null default 0.10,
  costos_admin_pct     numeric(5,4) not null default 0,
  presupuesto_comprador bigint,
  iva_tasa             numeric(5,4) not null default 0.19,
  dias_pago_estimados  int not null default 30,
  precio_ofertado      bigint,                        -- lo que finalmente se ofertó (neto)
  notas                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (oportunidad_id)
);

create table if not exists public.op_costo_items (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.orgs(id) on delete cascade,
  costo_id     uuid not null references public.op_costos(id) on delete cascade,
  tipo         text not null default 'hora' check (tipo in (
                 'hora', 'directo', 'material', 'licencia', 'traslado', 'subcontrato')),
  descripcion  text,
  profile_id   uuid references public.profiles(id) on delete set null,
  rol          text,
  horas        numeric(8,2),
  valor_hora   bigint,
  monto        bigint,                                -- para los que no son horas
  dias_antes_pago int not null default 0,             -- desembolso previo al pago → capital de trabajo
  orden        int not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists idx_opitem_costo on public.op_costo_items (costo_id);

-- ────────────────────────────────────────────────────────────
-- 8) Aprobaciones internas (comercial · técnica · financiera)
--    El WITH CHECK impide firmar por otro o firmar un área que no te toca.
-- ────────────────────────────────────────────────────────────
create table if not exists public.op_aprobaciones (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.orgs(id) on delete cascade,
  oportunidad_id uuid not null references public.op_oportunidades(id) on delete cascade,
  area           text not null check (area in ('comercial', 'tecnica', 'financiera')),
  decision       text not null check (decision in ('aprueba', 'aprueba_con_reparos', 'rechaza')),
  comentario     text,
  condiciones    text,
  checklist      jsonb not null default '{}'::jsonb,  -- los ítems marcados de esa área
  aprobado_por   uuid not null references public.profiles(id) on delete cascade,
  created_at     timestamptz not null default now(),
  unique (oportunidad_id, area)
);
alter table public.op_aprobaciones alter column aprobado_por set default auth.uid();
create index if not exists idx_opapr_op on public.op_aprobaciones (oportunidad_id);

-- ────────────────────────────────────────────────────────────
-- 9) Plantillas de servicio (biblioteca reutilizable)
-- ────────────────────────────────────────────────────────────
create table if not exists public.op_plantillas (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references public.orgs(id) on delete cascade,
  slug                text not null,
  nombre              text not null,
  descripcion         text,
  alcance             text,
  exclusiones         text,
  metodologia         text,
  entregables         jsonb not null default '[]'::jsonb,
  duracion_semanas_min int,
  duracion_semanas_max int,
  hitos               jsonb not null default '[]'::jsonb,
  horas_por_rol       jsonb not null default '[]'::jsonb,  -- [{rol, horas, valorHora}]
  costos_habituales   jsonb not null default '[]'::jsonb,
  precio_minimo       bigint,
  margen_esperado     numeric(5,4),
  riesgos             jsonb not null default '[]'::jsonb,
  equipo              jsonb not null default '[]'::jsonb,
  documentos          jsonb not null default '[]'::jsonb,  -- CV/certificados asociados
  experiencias        jsonb not null default '[]'::jsonb,
  gantt               jsonb not null default '[]'::jsonb,
  texto_oferta        text,
  unspsc              jsonb not null default '[]'::jsonb,
  activo              boolean not null default true,
  es_demo             boolean not null default false,      -- datos de ejemplo, no reales
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (org_id, slug)
);

-- ────────────────────────────────────────────────────────────
-- 10) Ofertas (versiones) + documentos del paquete
-- ────────────────────────────────────────────────────────────
create table if not exists public.op_ofertas (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.orgs(id) on delete cascade,
  oportunidad_id uuid not null references public.op_oportunidades(id) on delete cascade,
  version        int not null default 1,
  estado         text not null default 'preparacion'
                 check (estado in ('preparacion', 'lista', 'presentada', 'reemplazada')),
  plantilla_slug text,
  resumen        text,
  precio_neto    bigint,
  iva            bigint,
  precio_total   bigint,
  notas          text,
  presentada_at  timestamptz,
  creado_por     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (oportunidad_id, version)
);
alter table public.op_ofertas alter column creado_por set default auth.uid();

create table if not exists public.op_oferta_docs (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.orgs(id) on delete cascade,
  oferta_id    uuid not null references public.op_ofertas(id) on delete cascade,
  tipo         text not null,                        -- cotizacion | oferta_tecnica | matriz | gantt | cv | ...
  nombre       text not null,
  obligatorio  boolean not null default true,
  estado       text not null default 'pendiente'
               check (estado in ('pendiente', 'listo', 'no_aplica')),
  proveedor_doc_id uuid,                             -- FK lógica a op_proveedor_docs (se crea más abajo)
  storage_path text,
  orden        int not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists idx_opofdoc_of on public.op_oferta_docs (oferta_id);

-- ────────────────────────────────────────────────────────────
-- 11) Historial visible (además del audit_row infalsificable)
--     Este es el que LEE el usuario: acción + comentario en lenguaje humano.
-- ────────────────────────────────────────────────────────────
create table if not exists public.op_actividad (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.orgs(id) on delete cascade,
  oportunidad_id uuid not null references public.op_oportunidades(id) on delete cascade,
  accion         text not null,
  estado_anterior text,
  estado_nuevo   text,
  comentario     text,
  usuario        uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now()
);
alter table public.op_actividad alter column usuario set default auth.uid();
create index if not exists idx_opact_op on public.op_actividad (oportunidad_id, created_at desc);

-- ────────────────────────────────────────────────────────────
-- 12) Resultado y ejecución (una fila por oportunidad)
-- ────────────────────────────────────────────────────────────
create table if not exists public.op_resultados (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references public.orgs(id) on delete cascade,
  oportunidad_id      uuid not null references public.op_oportunidades(id) on delete cascade,
  adjudicada          boolean,
  fecha_resultado     date,
  monto_adjudicado    bigint,
  proveedor_ganador   text,
  precio_ganador      bigint,
  motivo_perdida      text,
  -- Orden de compra
  oc_numero           text,
  oc_fecha            date,
  oc_monto            bigint,
  oc_coincide         boolean,                        -- ¿coincide con la oferta?
  oc_observacion      text,
  oc_aceptada         boolean not null default false,
  -- Ejecución
  proyecto_id         uuid references public.proyectos(id) on delete set null,
  acta_inicio_at      date,
  recepcion_conforme_at date,
  -- Facturación y pago
  factura_numero      text,
  factura_monto       bigint,
  factura_fecha       date,
  pago_esperado       date,
  pago_real           date,
  -- Certificado de experiencia
  certificado_estado  text not null default 'no_solicitado'
                      check (certificado_estado in ('no_solicitado', 'solicitado', 'obtenido', 'rechazado')),
  certificado_solicitado_at date,
  certificado_obtenido_at   date,
  certificado_path    text,
  -- Cierre
  utilidad_real       bigint,
  horas_reales        numeric(8,2),
  aprendizaje         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (oportunidad_id)
);

-- Guard: no se puede aceptar una OC que NO coincide con la oferta sin dejar
-- constancia de por qué. Es la regla §15 del encargo, en la base de datos.
create or replace function public.op_guard_oc() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.oc_aceptada and coalesce(new.oc_coincide, false) = false
     and coalesce(btrim(new.oc_observacion), '') = '' then
    raise exception 'La orden de compra no coincide con la oferta: registra la observación antes de aceptarla';
  end if;
  return new;
end $$;
drop trigger if exists trg_opres_oc on public.op_resultados;
create trigger trg_opres_oc before insert or update on public.op_resultados
  for each row execute function public.op_guard_oc();

-- ────────────────────────────────────────────────────────────
-- 13) Carpeta documental del proveedor (7 categorías del proyecto)
-- ────────────────────────────────────────────────────────────
create table if not exists public.op_proveedor_docs (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.orgs(id) on delete cascade,
  nombre           text not null,
  categoria        text not null default '01_corporativo' check (categoria in (
                     '01_corporativo', '02_tributario_financiero', '03_equipo', '04_experiencia',
                     '05_plantillas_oferta', '06_compliance', '07_procesos')),
  descripcion      text,
  fecha_emision    date,
  fecha_vencimiento date,
  responsable      uuid references public.profiles(id) on delete set null,
  estado           text not null default 'vigente'
                   check (estado in ('vigente', 'por_vencer', 'vencido', 'falta', 'no_aplica')),
  version          text,
  storage_path     text,
  mime             text,
  bytes            bigint,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_opprov_cat on public.op_proveedor_docs (org_id, categoria);

-- FK diferida de op_oferta_docs → op_proveedor_docs (la tabla ya existe acá).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'op_oferta_docs_prov_fk') then
    alter table public.op_oferta_docs
      add constraint op_oferta_docs_prov_fk
      foreign key (proveedor_doc_id) references public.op_proveedor_docs(id) on delete set null;
  end if;
end $$;

-- ────────────────────────────────────────────────────────────
-- 14) Certificados de experiencia obtenidos
-- ────────────────────────────────────────────────────────────
create table if not exists public.op_certificados (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.orgs(id) on delete cascade,
  oportunidad_id uuid references public.op_oportunidades(id) on delete set null,
  institucion    text not null,
  servicio       text,
  monto          bigint,
  fecha_emision  date,
  storage_path   text,
  notas          text,
  created_at     timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- 15) Bitácora de sincronizaciones con la API (Fase 2 la escribe)
-- ────────────────────────────────────────────────────────────
create table if not exists public.op_sync_logs (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.orgs(id) on delete cascade,
  fuente       text not null check (fuente in ('mercado_publico', 'compra_agil')),
  inicio       timestamptz not null default now(),
  fin          timestamptz,
  ok           boolean,
  encontradas  int not null default 0,
  nuevas       int not null default 0,
  actualizadas int not null default 0,
  errores      int not null default 0,
  mensaje      text,
  parametros   jsonb not null default '{}'::jsonb,   -- SIN el ticket (nunca se persiste)
  created_at   timestamptz not null default now()
);
create index if not exists idx_opsync_org on public.op_sync_logs (org_id, inicio desc);

-- ────────────────────────────────────────────────────────────
-- 16) Triggers de la casa: org_id automático + updated_at + auditoría
-- ────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'op_oportunidades', 'op_documentos', 'op_requisitos', 'op_puntajes', 'op_riesgos',
    'op_costos', 'op_costo_items', 'op_aprobaciones', 'op_plantillas', 'op_ofertas',
    'op_oferta_docs', 'op_actividad', 'op_resultados', 'op_proveedor_docs',
    'op_certificados', 'op_sync_logs']
  loop
    execute format('drop trigger if exists trg_%1$s_org on public.%1$s', t);
    execute format('create trigger trg_%1$s_org before insert on public.%1$s for each row execute function public.set_org_id()', t);
  end loop;

  -- updated_at solo donde existe la columna
  foreach t in array array[
    'op_config', 'op_oportunidades', 'op_puntajes', 'op_costos', 'op_plantillas',
    'op_ofertas', 'op_resultados', 'op_proveedor_docs']
  loop
    execute format('drop trigger if exists trg_%1$s_upd on public.%1$s', t);
    execute format('create trigger trg_%1$s_upd before update on public.%1$s for each row execute function public.set_updated_at()', t);
  end loop;

  -- Auditoría infalsificable en lo que decide plata o compromiso.
  foreach t in array array[
    'op_oportunidades', 'op_costos', 'op_aprobaciones', 'op_ofertas', 'op_resultados']
  loop
    execute format('drop trigger if exists trg_%1$s_audit on public.%1$s', t);
    execute format('create trigger trg_%1$s_audit after insert or update or delete on public.%1$s for each row execute function public.audit_row()', t);
  end loop;
end $$;

-- op_config no pasa por set_org_id (su PK ES el org_id y lo pone el cliente);
-- la RLS igual lo encierra a la org del usuario.

-- ────────────────────────────────────────────────────────────
-- 17) RLS
--     Lectura: cualquier miembro de la org.
--     Escritura: cualquier miembro de la org que NO sea 'lector'.
--     Borrado: admin o quien creó (según tabla).
--     Aprobaciones: además, solo el área que te corresponde y en tu nombre.
-- ────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'op_config', 'op_oportunidades', 'op_documentos', 'op_requisitos', 'op_puntajes',
    'op_riesgos', 'op_costos', 'op_costo_items', 'op_plantillas', 'op_ofertas',
    'op_oferta_docs', 'op_resultados', 'op_proveedor_docs', 'op_certificados', 'op_sync_logs']
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists %1$s_select on public.%1$s', t);
    execute format('create policy %1$s_select on public.%1$s for select to authenticated using (org_id = (select public.auth_org_id()))', t);

    execute format('drop policy if exists %1$s_insert on public.%1$s', t);
    execute format('create policy %1$s_insert on public.%1$s for insert to authenticated with check (org_id = (select public.auth_org_id()) and not (select public.op_es_lector()))', t);

    execute format('drop policy if exists %1$s_update on public.%1$s', t);
    execute format('create policy %1$s_update on public.%1$s for update to authenticated using (org_id = (select public.auth_org_id()) and not (select public.op_es_lector())) with check (org_id = (select public.auth_org_id()))', t);

    execute format('drop policy if exists %1$s_delete on public.%1$s', t);
    execute format('create policy %1$s_delete on public.%1$s for delete to authenticated using (org_id = (select public.auth_org_id()) and not (select public.op_es_lector()))', t);
  end loop;
end $$;

-- Aprobaciones: firma tuya, área tuya. Nadie firma por otro.
alter table public.op_aprobaciones enable row level security;

drop policy if exists op_aprobaciones_select on public.op_aprobaciones;
create policy op_aprobaciones_select on public.op_aprobaciones for select to authenticated
  using (org_id = (select public.auth_org_id()));

drop policy if exists op_aprobaciones_insert on public.op_aprobaciones;
create policy op_aprobaciones_insert on public.op_aprobaciones for insert to authenticated
  with check (
    org_id = (select public.auth_org_id())
    and aprobado_por = auth.uid()
    and public.op_puede_aprobar(area)
  );

-- Cambiar de opinión: solo sobre TU firma y en TU área.
drop policy if exists op_aprobaciones_update on public.op_aprobaciones;
create policy op_aprobaciones_update on public.op_aprobaciones for update to authenticated
  using (org_id = (select public.auth_org_id()) and aprobado_por = auth.uid())
  with check (org_id = (select public.auth_org_id()) and aprobado_por = auth.uid() and public.op_puede_aprobar(area));

drop policy if exists op_aprobaciones_delete on public.op_aprobaciones;
create policy op_aprobaciones_delete on public.op_aprobaciones for delete to authenticated
  using (org_id = (select public.auth_org_id()) and (aprobado_por = auth.uid() or (select public.is_admin())));

-- Historial: se escribe, no se reescribe. Sin UPDATE ni DELETE para nadie
-- (el registro de quién movió qué estado es el respaldo de las decisiones).
alter table public.op_actividad enable row level security;

drop policy if exists op_actividad_select on public.op_actividad;
create policy op_actividad_select on public.op_actividad for select to authenticated
  using (org_id = (select public.auth_org_id()));

drop policy if exists op_actividad_insert on public.op_actividad;
create policy op_actividad_insert on public.op_actividad for insert to authenticated
  with check (org_id = (select public.auth_org_id()) and usuario = auth.uid());

-- ────────────────────────────────────────────────────────────
-- 18) Storage privado: bucket 'oportunidades' → {org_id}/…
-- ────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('oportunidades', 'oportunidades', false)
on conflict (id) do nothing;

drop policy if exists op_stg_select on storage.objects;
create policy op_stg_select on storage.objects for select to authenticated
  using (bucket_id = 'oportunidades' and (storage.foldername(name))[1] = (select public.auth_org_id())::text);

drop policy if exists op_stg_insert on storage.objects;
create policy op_stg_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'oportunidades' and (storage.foldername(name))[1] = (select public.auth_org_id())::text
              and not (select public.op_es_lector()));

drop policy if exists op_stg_delete on storage.objects;
create policy op_stg_delete on storage.objects for delete to authenticated
  using (bucket_id = 'oportunidades' and (storage.foldername(name))[1] = (select public.auth_org_id())::text
         and not (select public.op_es_lector()));

-- ────────────────────────────────────────────────────────────
-- 19) Semilla: configuración por defecto + las 8 plantillas de servicio.
--     Los códigos UNSPSC y los servicios salen del documento de decisión
--     "Proyecto Mercado Público" (30-jul-2026), no son inventados acá.
--     Las plantillas entran marcadas es_demo = true: las HORAS y los PRECIOS
--     son estimaciones internas que los socios deben validar antes de ofertar.
-- ────────────────────────────────────────────────────────────
do $$
declare v_org uuid;
begin
  select id into v_org from public.orgs order by created_at limit 1;
  if v_org is null then
    raise notice 'Sin organizaciones: se omite la semilla de oportunidades.';
    return;
  end if;

  insert into public.op_config (org_id, unspsc, servicios, regiones)
  values (
    v_org,
    '["80101504","80101505","80101507","80101508","80101603","80101604","81112103","81111504","81111508","81111509","84111505","84111502","84111503","84111504"]'::jsonb,
    '["diagnostico-360","levantamiento-procesos","sitio-web","dashboard","software-mvp","diagnostico-financiero","formulacion-proyectos","capacitacion-digital"]'::jsonb,
    '["Maule","Metropolitana","Ñuble","Biobío","O''Higgins"]'::jsonb
  )
  on conflict (org_id) do nothing;

  insert into public.op_plantillas
    (org_id, slug, nombre, descripcion, duracion_semanas_min, duracion_semanas_max,
     horas_por_rol, precio_minimo, margen_esperado, entregables, es_demo, unspsc)
  values
    (v_org, 'diagnostico-360', 'Diagnóstico Empresarial 360',
     'Evaluación de 8 áreas con informe ejecutivo y plan de mejora priorizado.', 2, 4,
     '[{"rol":"Comercial","horas":10,"valorHora":18000},{"rol":"Consultor","horas":30,"valorHora":16000}]'::jsonb,
     900000, 0.35, '["Informe ejecutivo","Matriz de hallazgos","Plan de mejora 90 días"]'::jsonb, true,
     '["80101504","80101505"]'::jsonb),
    (v_org, 'levantamiento-procesos', 'Levantamiento y optimización de procesos',
     'Mapa de procesos actual, cuellos de botella y propuesta de proceso objetivo.', 3, 6,
     '[{"rol":"Consultor","horas":50,"valorHora":16000},{"rol":"Analista","horas":20,"valorHora":12000}]'::jsonb,
     1200000, 0.35, '["Mapa AS-IS","Mapa TO-BE","Manual de procedimientos"]'::jsonb, true,
     '["80101504","80101604"]'::jsonb),
    (v_org, 'sitio-web', 'Sitio web institucional',
     'Sitio institucional accesible, administrable y con estándares del Estado.', 4, 8,
     '[{"rol":"TI","horas":60,"valorHora":20000},{"rol":"Diseño","horas":20,"valorHora":15000}]'::jsonb,
     1400000, 0.35, '["Sitio publicado","Manual de administración","Capacitación"]'::jsonb, true,
     '["81112103"]'::jsonb),
    (v_org, 'dashboard', 'Dashboard de gestión',
     'Tablero de indicadores con carga de datos y visualizaciones para decisión.', 4, 8,
     '[{"rol":"TI","horas":70,"valorHora":20000},{"rol":"Analista","horas":25,"valorHora":12000}]'::jsonb,
     1800000, 0.35, '["Dashboard operativo","Diccionario de indicadores","Capacitación"]'::jsonb, true,
     '["81111509","80101508"]'::jsonb),
    (v_org, 'software-mvp', 'Software web pequeño (MVP)',
     'Aplicación web acotada. RIESGO ALTO si el alcance no queda cerrado por escrito.', 8, 16,
     '[{"rol":"TI","horas":180,"valorHora":20000},{"rol":"Comercial","horas":20,"valorHora":18000}]'::jsonb,
     4500000, 0.35, '["Aplicación desplegada","Documentación técnica","Capacitación"]'::jsonb, true,
     '["81111504","81111508","81111509"]'::jsonb),
    (v_org, 'diagnostico-financiero', 'Diagnóstico contable y financiero',
     'Revisión de estados financieros, márgenes, flujo de caja y cumplimiento tributario.', 2, 4,
     '[{"rol":"Contable","horas":35,"valorHora":16000}]'::jsonb,
     800000, 0.35, '["Informe financiero","Indicadores","Recomendaciones"]'::jsonb, true,
     '["84111505","80101603"]'::jsonb),
    (v_org, 'formulacion-proyectos', 'Apoyo en formulación de proyectos',
     'Estructuración de proyectos postulables a fondos públicos.', 3, 6,
     '[{"rol":"Consultor","horas":40,"valorHora":16000}]'::jsonb,
     1000000, 0.35, '["Formulario completo","Presupuesto","Carta Gantt"]'::jsonb, true,
     '["80101604","80101603"]'::jsonb),
    (v_org, 'capacitacion-digital', 'Capacitación en transformación digital',
     'Programa de capacitación aplicada, con material y evaluación.', 1, 3,
     '[{"rol":"Consultor","horas":20,"valorHora":16000}]'::jsonb,
     500000, 0.40, '["Material del curso","Sesiones","Certificados de asistencia"]'::jsonb, true,
     '["80101505"]'::jsonb)
  on conflict (org_id, slug) do nothing;
end $$;

-- ============================================================
-- Verificación rápida (con la sesión de un usuario de la org):
--   1) select count(*) from op_plantillas;                  → 8
--   2) select * from op_config;                             → 1 fila con 14 UNSPSC
--   3) insert into op_oportunidades(titulo) values('Prueba'); → org_id auto-estampado
--   4) desde OTRA org: select * from op_oportunidades;      → 0 filas (aislamiento)
--   5) insert en op_aprobaciones con area que no te toca    → debe FALLAR (RLS)
--   6) update op_resultados set oc_aceptada=true, oc_coincide=false, oc_observacion=''
--      → debe FALLAR (guard de orden de compra)
-- ============================================================
