// js/realtime.js — Sincronización EN VIVO entre dispositivos (móvil ↔ PC).
// Suscribe a los cambios de las tablas del CRM vía Supabase Realtime y dispara
// onChange() (con debounce) cuando OTRA sesión/dispositivo modifica datos, para
// que la vista actual se refresque sola. Compartido por el CRM de escritorio y la
// PWA móvil. No-op si Realtime no está disponible (p.ej. el mock del preview).
//
// Requiere habilitar Realtime en las tablas: ejecutar supabase/realtime.sql una vez.
import { supabase } from './supabase.js';

const TABLES = ['leads', 'citas', 'propuestas', 'diagnosticos', 'clientes'];
let _channel = null;
let _timer = null;

export async function startRealtime(onChange) {
  // Sin cliente real de Realtime (mock del preview) → no hace nada.
  if (!supabase || typeof supabase.channel !== 'function') return false;
  stopRealtime();

  // Pasa el token de sesión al socket para que Realtime respete RLS (defensivo:
  // el cliente v2 suele hacerlo solo tras signIn, pero lo reforzamos).
  try {
    const { data } = await supabase.auth.getSession();
    const tok = data && data.session && data.session.access_token;
    if (tok && supabase.realtime && typeof supabase.realtime.setAuth === 'function') supabase.realtime.setAuth(tok);
  } catch (_) {}

  const ch = supabase.channel('triada-crm-sync');
  for (const table of TABLES) {
    ch.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
      // Debounce: coalesce ráfagas (varias filas) en un solo refresco.
      clearTimeout(_timer);
      _timer = setTimeout(() => { try { onChange(payload && payload.table); } catch (e) { console.error('realtime onChange', e); } }, 400);
    });
  }
  ch.subscribe();
  _channel = ch;
  return true;
}

export function stopRealtime() {
  clearTimeout(_timer); _timer = null;
  if (_channel) { try { supabase.removeChannel(_channel); } catch (_) {} _channel = null; }
}
