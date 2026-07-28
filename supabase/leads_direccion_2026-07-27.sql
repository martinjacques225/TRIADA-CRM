-- ============================================================
-- TRIADA CRM · Dirección de terreno en `leads`
--
-- CONTEXTO: la ficha del lead no guardaba DÓNDE está la empresa. En terreno
-- (visitas a comunas fuera de Talca) eso obliga a buscar la dirección por
-- WhatsApp o de memoria, y sin referencia no hay cómo llegar ni cómo volver.
--
-- QUÉ HACE: agrega dos columnas de texto libre a `leads`:
--   · direccion — calle y número ("Av. San Miguel 1234, oficina 3")
--   · comuna    — la comuna ("Molina", "San Javier", "Curicó"…)
-- La región ya existía (`region`), así que con las tres se arma la consulta
-- que abre Google Maps / Waze desde el CRM y desde la app móvil.
--
-- POR QUÉ TEXTO LIBRE Y NO LAT/LNG: no hay API de geocodificación contratada
-- (principio "demo simulada, API diferida"). Los mapas geocodifican el texto
-- al abrirse — gratis y sin backend. Si algún día se guardan coordenadas,
-- se agregan como columnas nuevas sin tocar estas.
--
-- SEGURIDAD: columnas nullable, sin default → no rompe ningún INSERT vigente
-- (ni el RPC crear_lead_landing v2, que nombra sus columnas explícitamente).
-- Las policies de `leads` son por fila (org), no por columna: nada que ajustar.
--
-- IDEMPOTENTE. Pegar en: Supabase → SQL Editor → New query → Run.
-- ============================================================

alter table leads add column if not exists direccion text;
alter table leads add column if not exists comuna    text;

comment on column leads.direccion is 'Calle y número de la empresa (texto libre). Se usa para navegar con Google Maps/Waze desde el CRM.';
comment on column leads.comuna    is 'Comuna de la empresa (texto libre). Se concatena con direccion + region para la consulta al mapa.';

-- ============================================================
-- VERIFICACIÓN
-- (1) En SQL Editor — deben aparecer las DOS filas:
--   select column_name, data_type, is_nullable
--   from information_schema.columns
--   where table_schema='public' and table_name='leads'
--     and column_name in ('direccion','comuna');
--
-- (2) Escritura y lectura desde el CRM (con sesión iniciada):
--   update leads set direccion='Av. San Miguel 1234', comuna='Molina'
--   where codigo='LEAD-0001';
--   select codigo, direccion, comuna, region from leads where codigo='LEAD-0001';
--
-- (3) En la app: Leads → abrir la ficha → botón "Cómo llegar" (solo aparece
--   cuando hay dirección o comuna).
--
-- ROLLBACK (destructivo: BORRA las direcciones cargadas):
--   alter table leads drop column if exists direccion;
--   alter table leads drop column if exists comuna;
-- ============================================================
