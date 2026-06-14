-- ============================================================
-- TRIADA CRM · Cierre del hueco CRÍTICO C-2 (Auditoría Profunda 2026-06-14)
--
-- PROBLEMA: la tabla `correlativos` (schema.sql) NUNCA recibió
-- `enable row level security`. PostgREST expone TODO el schema `public` y los
-- roles anon/authenticated tienen privilegios → cualquiera (sin login) puede:
--   · GET  /rest/v1/correlativos        → leer los contadores (fuga de volumen)
--   · PATCH/POST /rest/v1/correlativos  → sobrescribir `ultimo` y forzar colisión
--     del `codigo` único (23505) → SE ROMPEN las altas de leads/clientes/facturas (DoS).
--
-- FIX (dos cambios que van JUNTOS — uno sin el otro rompe el alta anónima del landing):
--   1) `next_correlativo` pasa a SECURITY DEFINER → el trigger set_codigo() puede
--      seguir actualizando `correlativos` aunque la RLS niegue al rol invocante.
--   2) Habilitar RLS en `correlativos` SIN políticas (deny-all para anon/authenticated)
--      + revoke explícito de privilegios de tabla a esos roles.
--
-- IDEMPOTENTE. Requiere: schema.sql ya corrido.
-- Pegar en: Supabase → SQL Editor → New query → Run.
-- ============================================================

-- ===== 1. El contador corre con privilegios del owner (bypassa RLS desde el trigger)
create or replace function next_correlativo(p_tipo text) returns text
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update correlativos set ultimo = ultimo + 1 where tipo = p_tipo returning ultimo into n;
  return p_tipo || '-' || lpad(n::text, 6, '0');
end; $$;

-- ===== 2. Cerrar la tabla al mundo (sin políticas = deny; el definer de arriba sí escribe)
alter table correlativos enable row level security;
revoke all on table correlativos from anon, authenticated;

-- ============================================================
-- Verificación (con la key publishable / sin login):
--   GET https://<proyecto>.supabase.co/rest/v1/correlativos?select=tipo
--   → debe devolver 401/empty (ya NO 200 con los contadores).
-- Y confirmar que el alta pública del landing SIGUE funcionando:
--   POST /rest/v1/leads  con {origen:'landing', nombre:'Test RLS'}  → 201.
--   (si devuelve 42501 al generar el código, el paso 1 no se aplicó: re-correr.)
-- ============================================================
