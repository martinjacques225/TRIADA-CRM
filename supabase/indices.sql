-- ============================================================
-- TRIADA CRM · Índices de rendimiento (backlog ALTO de la auditoría 2026-06-14)
-- Requiere: schema.sql + multitenancy.sql ya corridos.
--
-- Estrategia: la RLS filtra TODA consulta por `org_id = auth_org_id()`, así que
-- cada query lleva un `where org_id = X` implícito. Por eso los índices compuestos
-- que EMPIEZAN por org_id sirven a la vez al predicado de RLS y al filtro/orden
-- típico de cada vista (p.ej. `order by created_at desc`) → index scan sin sort.
-- Además se indexan las FKs (Postgres NO las indexa automáticamente): aceleran
-- joins, lookups por padre, y los chequeos/cascadas de integridad (limpiarDatos).
--
-- IDEMPOTENTE (create index if not exists). Tablas chicas hoy ⇒ creación instantánea.
-- A gran escala, usar `CREATE INDEX CONCURRENTLY` (fuera de transacción) para no
-- bloquear escrituras durante el build.
-- Pegar en: Supabase → SQL Editor → New query → Run.
-- ============================================================

-- ---- LEADS: lista por fecha · conteo por estado (badge "Nuevo") · FK responsable
create index if not exists idx_leads_org_created  on leads(org_id, created_at desc);
create index if not exists idx_leads_org_estado   on leads(org_id, estado);
create index if not exists idx_leads_responsable  on leads(responsable);

-- ---- CLIENTES: cartera por fecha · getByLead · FK responsable
create index if not exists idx_clientes_org_created on clientes(org_id, created_at desc);
create index if not exists idx_clientes_lead        on clientes(lead_id);
create index if not exists idx_clientes_responsable on clientes(responsable);

-- ---- DIAGNOSTICOS: lista por fecha · byProspecto(lead_id)
create index if not exists idx_diag_org_created on diagnosticos(org_id, created_at desc);
create index if not exists idx_diag_lead        on diagnosticos(lead_id);

-- ---- PROPUESTAS: lista por fecha · byProspecto · byCliente
create index if not exists idx_prop_org_created on propuestas(org_id, created_at desc);
create index if not exists idx_prop_lead        on propuestas(lead_id);
create index if not exists idx_prop_cliente     on propuestas(cliente_id);

-- ---- CITAS (calendario: orden por fecha) · byProspecto
create index if not exists idx_citas_org_fecha on citas(org_id, fecha);
create index if not exists idx_citas_lead      on citas(lead_id);

-- ---- FACTURAS: lista por fecha · byCliente · cobranza por estado
create index if not exists idx_facturas_org_created on facturas(org_id, created_at desc);
create index if not exists idx_facturas_cliente     on facturas(cliente_id);
create index if not exists idx_facturas_org_estado  on facturas(org_id, estado);

-- ---- ACTIVIDAD (audit): recientes por org · historial por entidad
create index if not exists idx_actividad_org_ts   on actividad(org_id, ts desc);
create index if not exists idx_actividad_entidad  on actividad(entidad, entidad_id);

-- ---- PROFILES / SERVICIOS (tablas chicas: basta el índice de tenant)
create index if not exists idx_profiles_org  on profiles(org_id);
create index if not exists idx_servicios_org on servicios(org_id);

-- ---- Accesorias / módulos opcionales (solo si las tablas existen)
do $$ begin
  if to_regclass('public.presupuestos') is not null then
    create index if not exists idx_presup_org_created on presupuestos(org_id, created_at desc);
    create index if not exists idx_presup_cliente     on presupuestos(cliente_id);
  end if;
  if to_regclass('public.autodiagnosticos') is not null then
    create index if not exists idx_autodiag_lead on autodiagnosticos(lead_id);
    create index if not exists idx_autodiag_org  on autodiagnosticos(org_id);
  end if;
  -- AI Commander ya trae índices propios (ai_commander.sql); sumamos un compuesto útil
  if to_regclass('public.proyectos') is not null then
    create index if not exists idx_proyectos_org_estado on proyectos(org_id, estado);
  end if;
end $$;

-- ============================================================
-- Verificación (correr logueado en SQL Editor):
--   select tablename, indexname from pg_indexes
--   where schemaname='public' order by tablename, indexname;
-- Para ver que una consulta usa el índice (no Seq Scan):
--   explain analyze select * from leads order by created_at desc limit 50;
-- ============================================================
