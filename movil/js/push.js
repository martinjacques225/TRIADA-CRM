// ============================================================================
// push.js — Web Push del lado cliente (notificación del sistema con la app cerrada).
// Pide permiso, se suscribe con la llave VAPID pública y guarda la suscripción en
// Supabase (tabla push_subscriptions). La Edge Function notify-meeting envía el push.
//
// Requisitos reales: app instalada (PWA) y HTTPS. En iOS el permiso EXIGE un gesto
// del usuario (por eso se activa desde un botón en Mi perfil). En localhost el SW
// no se registra (ver app.js), así que esto solo opera en producción.
// ============================================================================
import { db } from './core.js';

// Llave VAPID PÚBLICA (es pública por diseño; la privada vive solo en la BD/Edge Function).
export const VAPID_PUBLIC = 'BBUxURawA5EeHJ_iwz7bi5-O9oYLZwh5fLjdwNsGpi-xhd2uS_Bu7SLUovAib1Dnime4CwD2EOSg74_OH4K-3Dg';

function urlB64ToUint8(base64) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function pushSupported() {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator
    && 'PushManager' in window && 'Notification' in window;
}

// Estado para la UI: 'unsupported' | 'denied' | 'on' (permiso + suscrito) | 'off'.
export async function pushState() {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission !== 'granted') return 'off';
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg && await reg.pushManager.getSubscription();
    return sub ? 'on' : 'off';
  } catch (_) { return 'off'; }
}

// Pide permiso (gesto del usuario), se suscribe y guarda en Supabase.
export async function enablePush() {
  if (!pushSupported()) throw new Error('Este dispositivo no soporta notificaciones push.');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('No diste permiso de notificaciones.');
  // Sin service worker registrado (p.ej. app no instalada / localhost) `ready` nunca
  // resuelve → guarda explícita con mensaje útil en vez de colgarse.
  const existing = await navigator.serviceWorker.getRegistration();
  if (!existing) throw new Error('Instala la app (Más → Instalar app) para activar las notificaciones.');
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8(VAPID_PUBLIC),
    });
  }
  const j = sub.toJSON();
  await db.pushSubs.upsert({
    endpoint: sub.endpoint,
    p256dh: j.keys.p256dh,
    auth: j.keys.auth,
    userAgent: navigator.userAgent,
  });
  return true;
}

// Apaga las notificaciones en este dispositivo (desuscribe + borra la fila).
export async function disablePush() {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg && await reg.pushManager.getSubscription();
    if (sub) { await db.pushSubs.remove(sub.endpoint).catch(() => {}); await sub.unsubscribe().catch(() => {}); }
  } catch (_) {}
}

// Re-suscribe en silencio si el usuario YA había dado permiso antes (mantiene la
// fila fresca tras un cambio de endpoint del navegador). No pide permiso.
export async function syncPushIfGranted() {
  try {
    if (pushSupported() && Notification.permission === 'granted') await enablePush();
  } catch (err) { console.warn('syncPush no crítico:', err?.message || err); }
}
