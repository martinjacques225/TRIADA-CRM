// supabase/functions/notify-meeting/index.ts
// Edge Function: envía el PUSH DEL SISTEMA (Web Push) a los participantes de una
// reunión recién creada. La llama el cliente (creador) justo después de crear la
// cita, vía supabase.functions.invoke('notify-meeting', { body: { citaId } }).
//
// Seguridad:
//   - verify_jwt = true  → solo usuarios autenticados pueden invocarla.
//   - Anti-abuso: solo el CREADOR (citas.responsable) puede disparar la de SU cita.
//   - La llave VAPID PRIVADA NO está en el código: se lee de la tabla app_config
//     (RLS sin policies → solo accesible con service_role, que esta función usa).
//
// Desplegada por MCP (no por CLI). Para re-desplegar: Supabase → Edge Functions,
// o el MCP de Supabase. Las llaves VAPID viven en public.app_config.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const SB_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const asUser = createClient(SB_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: uErr } = await asUser.auth.getUser();
    if (uErr || !user) return json({ error: 'no auth' }, 401);

    const { citaId } = await req.json().catch(() => ({}));
    if (!citaId) return json({ error: 'falta citaId' }, 400);

    const admin = createClient(SB_URL, SERVICE);
    const { data: cita, error: cErr } = await admin.from('citas')
      .select('id, titulo, fecha, hora, participantes, responsable').eq('id', citaId).single();
    if (cErr || !cita) return json({ error: 'cita no encontrada' }, 404);
    // anti-abuso: solo el creador dispara la notificación de SU cita
    if (cita.responsable && cita.responsable !== user.id) return json({ error: 'no autorizado' }, 403);

    const targets = (Array.isArray(cita.participantes) ? cita.participantes : []).filter((id: string) => id && id !== user.id);
    if (!targets.length) return json({ sent: 0, reason: 'sin participantes (aparte del creador)' });

    const { data: cfg } = await admin.from('app_config').select('key, value').in('key', ['vapid_public', 'vapid_private', 'vapid_subject']);
    const map: Record<string, string> = Object.fromEntries((cfg || []).map((r: any) => [r.key, r.value]));
    if (!map.vapid_public || !map.vapid_private) return json({ error: 'faltan llaves VAPID' }, 500);
    webpush.setVapidDetails(map.vapid_subject || 'mailto:admin@grupotriada.cl', map.vapid_public, map.vapid_private);

    const { data: subs } = await admin.from('push_subscriptions').select('*').in('user_id', targets);
    const payload = JSON.stringify({
      title: 'Nueva reunion',
      body: 'Se ha generado una reunion con tu participacion',
      titulo: cita.titulo || 'Reunion',
      url: '/movil/',
      tag: 'cita-' + cita.id,
    });

    let sent = 0;
    const dead: string[] = [];
    await Promise.all((subs || []).map(async (s: any) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
        sent++;
      } catch (err: any) {
        const code = err?.statusCode;
        if (code === 404 || code === 410) dead.push(s.endpoint);
      }
    }));
    if (dead.length) await admin.from('push_subscriptions').delete().in('endpoint', dead);

    return json({ sent, targets: targets.length, subscriptions: (subs || []).length, dead: dead.length });
  } catch (err: any) {
    return json({ error: String(err?.message || err) }, 500);
  }
});
