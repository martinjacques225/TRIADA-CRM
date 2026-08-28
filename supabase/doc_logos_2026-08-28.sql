-- ============================================================
-- TRIADA CRM · Logo del cliente en los documentos (`doc_logos`)
--
-- CONTEXTO: la cotización, el presupuesto y los informes salían con la marca
-- Tríada solamente. Al personalizarlos para un cliente (Olivos de Talca, ago-2026)
-- el logo hubo que incrustarlo a mano fuera del CRM. Esta tabla lo guarda una
-- vez por cliente/prospecto y todos sus documentos lo reutilizan.
--
-- QUÉ HACE: una tabla con UN logo por entidad. La entidad es un lead (prospecto)
-- o un cliente — nunca las dos: el `check` lo impide.
--
-- POR QUÉ UNA TABLA APARTE Y NO UNA COLUMNA EN `leads`/`clientes`:
--   `db.js` lee esas dos tablas con `select('*')`. Una columna con el logo en
--   base64 (~20–80 KB por fila) viajaría en CADA carga de la lista de leads y de
--   la cartera de clientes, sin que nadie la mire. Acá el logo se pide solo
--   cuando se abre el selector o se genera un documento.
--
-- POR QUÉ DATA URI Y NO STORAGE: el documento se imprime en una ventana abierta
-- con window.open()+document.write(), que NO hereda la sesión de Supabase. Una
-- URL firmada de Storage vencería o daría 403 justo al imprimir. El data URI
-- viaja dentro del HTML y siempre pinta. El costo es el 33% de base64, acotado
-- porque el front redimensiona antes de subir (ver js/logo-picker.js).
--
-- SEGURIDAD: org_id NOT NULL + trigger set_org_id() (estampado server-side, el
-- front no manda org_id) + RLS por (select auth_org_id()) — subselect para que
-- el planner la cachee como InitPlan. Reutiliza set_org_id(), set_updated_at()
-- y auth_org_id() YA existentes (multitenancy.sql). No las redefine.
--
-- BORRADO: FK con `on delete cascade` a leads y clientes — si se borra el
-- prospecto o el cliente, su logo se va con él. Sin filas huérfanas.
--
-- IDEMPOTENTE. Pegar en: Supabase → SQL Editor → New query → Run.
-- ============================================================

-- ===== 1. Tabla =====
create table if not exists public.doc_logos (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.orgs(id)     on delete cascade,
  lead_id    uuid          references public.leads(id)    on delete cascade,
  cliente_id uuid          references public.clientes(id) on delete cascade,
  mime       text not null,
  data_uri   text not null,
  nombre     text,
  bytes      integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Exactamente UNA de las dos entidades. Un logo cuelga de un lead O de un
  -- cliente, nunca de ambos ni de ninguno.
  constraint doc_logos_una_entidad check (num_nonnulls(lead_id, cliente_id) = 1),
  -- Solo PNG y JPG: es lo que el generador de documentos sabe incrustar y lo
  -- único que el selector del front ofrece.
  constraint doc_logos_mime      check (mime in ('image/png','image/jpeg')),
  -- Tope duro de ~700 KB de data URI. El front redimensiona a 480 px y suele
  -- dejarlo bajo 80 KB; esto es la red de seguridad contra una subida cruda.
  constraint doc_logos_tamano    check (length(data_uri) <= 700000)
);

comment on table  public.doc_logos          is 'Logo del cliente para la cabecera de cotizaciones, presupuestos e informes. Un logo por lead o por cliente.';
comment on column public.doc_logos.data_uri is 'Imagen completa como data URI base64. Se incrusta en el HTML del documento: la ventana de impresión no tiene sesión y no puede pedir una URL firmada.';
comment on column public.doc_logos.bytes    is 'Peso aproximado de la imagen ya redimensionada, para mostrarlo en el selector.';

-- ===== 2. Un solo logo por entidad =====
-- Índices parciales: `unique(org_id, lead_id)` a secas dejaría pasar N filas con
-- lead_id NULL (en SQL, NULL nunca es igual a NULL).
create unique index if not exists uq_doc_logos_lead
  on public.doc_logos (org_id, lead_id)    where lead_id    is not null;
create unique index if not exists uq_doc_logos_cliente
  on public.doc_logos (org_id, cliente_id) where cliente_id is not null;

-- ===== 3. Triggers (reutiliza los de multitenancy.sql) =====
drop trigger if exists trg_doc_logos_org on public.doc_logos;
create trigger trg_doc_logos_org before insert on public.doc_logos
  for each row execute function public.set_org_id();

drop trigger if exists trg_doc_logos_upd on public.doc_logos;
create trigger trg_doc_logos_upd before update on public.doc_logos
  for each row execute function public.set_updated_at();

-- ===== 4. RLS =====
alter table public.doc_logos enable row level security;

drop policy if exists doc_logos_select on public.doc_logos;
create policy doc_logos_select on public.doc_logos for select to authenticated
  using (org_id = (select public.auth_org_id()));

drop policy if exists doc_logos_insert on public.doc_logos;
create policy doc_logos_insert on public.doc_logos for insert to authenticated
  with check (org_id = (select public.auth_org_id()));

drop policy if exists doc_logos_update on public.doc_logos;
create policy doc_logos_update on public.doc_logos for update to authenticated
  using      (org_id = (select public.auth_org_id()))
  with check (org_id = (select public.auth_org_id()));

drop policy if exists doc_logos_delete on public.doc_logos;
create policy doc_logos_delete on public.doc_logos for delete to authenticated
  using (org_id = (select public.auth_org_id()));

-- ============================================================
-- VERIFICACIÓN
-- (1) La tabla existe con sus tres constraints:
--   select conname from pg_constraint
--   where conrelid = 'public.doc_logos'::regclass and contype = 'c';
--   -- esperado: doc_logos_una_entidad, doc_logos_mime, doc_logos_tamano
--
-- (2) RLS activa y con sus cuatro policies:
--   select relrowsecurity from pg_class where oid='public.doc_logos'::regclass;
--   select policyname from pg_policies
--   where schemaname='public' and tablename='doc_logos';
--
-- (3) El check de entidad única muerde (las DOS deben fallar):
--   insert into doc_logos(mime,data_uri) values ('image/png','x');
--   insert into doc_logos(lead_id,cliente_id,mime,data_uri)
--     values ((select id from leads limit 1),(select id from clientes limit 1),'image/png','x');
--
-- (4) Alta real desde el CRM (con sesión iniciada):
--   Clientes → botón "Logo" en la fila → subir un PNG → debe verse la miniatura.
--   Luego: select nombre, mime, bytes, length(data_uri) from doc_logos;
--
-- (5) El logo llega al documento:
--   Propuestas → PDF. El logo debe salir arriba a la derecha, bajo "Preparada para".
--
-- ROLLBACK (destructivo: BORRA los logos cargados):
--   drop table if exists public.doc_logos;
-- ============================================================
