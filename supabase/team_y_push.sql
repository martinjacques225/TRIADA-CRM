-- ============================================================
-- EQUIPO (cargo + área Diseño) + WEB PUSH (notificaciones del sistema)
-- Ya aplicado en producción vía MCP (2026-06-30). Se deja aquí por trazabilidad
-- y para poder recrear el esquema. Idempotente (se puede correr más de una vez).
-- ============================================================

-- 1) CARGO en profiles (puesto visible: CEO/CTO/Gerenta de Finanzas/Diseñadora).
--    Es distinto de `role` (permisos: admin/consultor).
alter table public.profiles add column if not exists cargo text;

-- 2) Nueva área de trabajo "Diseño" (el enum es append-only; usar slug sin acento).
alter type area_t add value if not exists 'diseno';

-- 3) Equipo actual (cargo + área). Ajusta los emails/valores si cambia el equipo
--    (o usa el editor: CRM → Configuración → Equipo, solo admin).
update profiles set cargo='CEO',                 area='desarrollo' where email='saintjacques225@gmail.com';
update profiles set cargo='CTO',                 area='comercial'  where email='vicente@grupotriada.cl';
update profiles set cargo='Gerenta de Finanzas', area='finanzas'   where email='ignacia@grupotriada.cl';
update profiles set cargo='Diseñadora',          area='diseno'     where email='velvetenigma14@gmail.com';

-- 4) Suscripciones Web Push (una por dispositivo/navegador del usuario).
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz default now()
);
alter table public.push_subscriptions enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='push_subscriptions' and policyname='push_subs_select') then
    create policy push_subs_select on public.push_subscriptions for select to authenticated using (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename='push_subscriptions' and policyname='push_subs_insert') then
    create policy push_subs_insert on public.push_subscriptions for insert to authenticated with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename='push_subscriptions' and policyname='push_subs_update') then
    create policy push_subs_update on public.push_subscriptions for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename='push_subscriptions' and policyname='push_subs_delete') then
    create policy push_subs_delete on public.push_subscriptions for delete to authenticated using (user_id = auth.uid());
  end if;
end $$;

-- 5) Config server-side (llaves VAPID). RLS SIN policies = nadie por PostgREST;
--    solo el service_role (Edge Function) la lee. Las llaves se insertan aparte
--    (NO van en este archivo: la privada es secreta). Generadas con:
--      node -e "const c=require('crypto');const e=c.createECDH('prime256v1');e.generateKeys();const u=b=>b.toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');console.log(u(e.getPublicKey()),u(e.getPrivateKey()))"
--    y guardadas en app_config (keys: vapid_public, vapid_private, vapid_subject).
create table if not exists public.app_config (
  key        text primary key,
  value      text not null,
  updated_at timestamptz default now()
);
alter table public.app_config enable row level security;

-- 6) Realtime de citas ya estaba habilitado (supabase/realtime.sql) — la burbuja
--    in-app y el disparo del push se apoyan en él.
