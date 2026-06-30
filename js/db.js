// js/db.js — Supabase data layer (same interface as IndexedDB version)
import { supabase } from './supabase.js';
import {
  clean,
  isMissingCol,
  leadFromSupa, leadToSupa,
  diagFromSupa, diagToSupa,
  citaFromSupa, citaToSupaBase, citaToSupa,
  propFromSupa, propToSupa,
  clienteFromSupa, clienteToSupa,
  autodiagFromSupa,
  facturaFromSupa, toFactEstado, facturaToSupa,
  presupFromSupa, presupToSupa,
  docFromSupa,
} from './mappers.js';

// Reexport para no romper a quien importe isMissingTable desde db.js (módulos
// presupuestos/ai-commander). Las transformaciones puras viven en mappers.js.
export { isMissingTable } from './mappers.js';

let _uid = null;
let _orgId = null;
export function setCurrentUser(uid) { _uid = uid; _orgId = null; }
export function getCurrentUserId() { return _uid; }

// org_id del usuario actual — necesario para la RUTA del archivo en Storage
// (bucket privado org-scoped: {org_id}/…). La FILA se auto-estampa con el trigger
// set_org_id, pero el path del objeto lo arma el cliente. Cacheado; la RLS de
// profiles permite leer el propio perfil.
async function _getOrgId() {
  if (_orgId) return _orgId;
  if (!_uid) throw new Error('Sin sesión para resolver la organización');
  const { data, error } = await supabase.from('profiles').select('org_id').eq('id', _uid).single();
  _throw(error);
  _orgId = data?.org_id || null;
  if (!_orgId) throw new Error('El perfil no tiene organización asignada');
  return _orgId;
}

export function initDB() { return Promise.resolve(); }

// ─── config (localStorage — user preferences only) ────────────
export const config = {
  get:  (key)        => Promise.resolve(localStorage.getItem(`triada_cfg_${key}`)),
  set:  (key, value) => { localStorage.setItem(`triada_cfg_${key}`, value); return Promise.resolve(); },
};

function _throw(error) { if (error) throw error; }

// ─── Caché de lecturas en memoria ────────────────────────────
// Colapsa el patrón "traer todo en cada navegación": cada getAll() se cachea por
// _READ_TTL y los requests concurrentes a la misma tabla se deduplican (mata el
// "boot storm" donde leads/citas se traían 3-4 veces al arrancar). Cualquier
// add/update/delete de una tabla invalida su caché → la próxima lectura es fresca.
// OJO: los arrays/objetos devueltos se comparten por referencia; no mutarlos en
// sitio (.sort()/.push()). El código actual ya copia antes de mutar ([...x], spread).
const _READ_TTL = 15000;
const _readCache = new Map();    // table -> { t, data }
const _readInflight = new Map(); // table -> Promise
async function _cachedAll(table, fetcher) {
  const hit = _readCache.get(table);
  if (hit && (Date.now() - hit.t) < _READ_TTL) return hit.data;
  const pending = _readInflight.get(table);
  if (pending) return pending;                       // coalesce concurrentes
  const p = (async () => {
    try { const data = await fetcher(); _readCache.set(table, { t: Date.now(), data }); return data; }
    finally { _readInflight.delete(table); }
  })();
  _readInflight.set(table, p);
  return p;
}
function _invalidate(table) { _readCache.delete(table); _readInflight.delete(table); }

// Limpia la caché de lecturas (una tabla concreta, o todo si no se pasa nada).
// Lo usa la sincronización en vivo (js/realtime.js): tras un cambio remoto de
// otra sesión/dispositivo, la próxima lectura sale fresca de Supabase.
export function clearReadCache(table) {
  if (table) { _readCache.delete(table); _readInflight.delete(table); }
  else { _readCache.clear(); _readInflight.clear(); }
}

// ─── PROSPECTOS → leads ───────────────────────────────────────
export const prospectos = {
  getAll:   async ()       => _cachedAll('leads', async () => {
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    _throw(error); return data.map(leadFromSupa);
  }),
  // Conteo server-side (head:true ⇒ 0 filas transferidas). Para badges/KPIs que
  // antes traían toda la tabla solo para hacer .filter().length en el cliente.
  countByEstado: async (estado) => {
    const { count, error } = await supabase.from('leads')
      .select('id', { count: 'exact', head: true }).eq('estado', estado);
    _throw(error); return count || 0;
  },
  get:      async (id)     => {
    const { data, error } = await supabase.from('leads').select('*').eq('id', id).single();
    _throw(error); return leadFromSupa(data);
  },
  add:      async (data)   => {
    const payload = leadToSupa(data);
    if (!payload.responsable && _uid) payload.responsable = _uid;
    const { data: row, error } = await supabase.from('leads').insert(payload).select('id').single();
    _throw(error); _invalidate('leads'); return row.id;
  },
  update:   async (data)   => {
    const { id, ...rest } = data;
    const { error } = await supabase.from('leads').update(leadToSupa(rest)).eq('id', id);
    _throw(error); _invalidate('leads');
  },
  delete:   async (id)     => {
    const { error } = await supabase.from('leads').delete().eq('id', id);
    _throw(error); _invalidate('leads');
  },
};

// ─── DIAGNÓSTICOS ─────────────────────────────────────────────
export const diagnosticos = {
  getAll:      async ()    => _cachedAll('diagnosticos', async () => {
    const { data, error } = await supabase.from('diagnosticos').select('*').order('created_at', { ascending: false });
    _throw(error); return data.map(diagFromSupa);
  }),
  get:         async (id)  => {
    const { data, error } = await supabase.from('diagnosticos').select('*').eq('id', id).single();
    _throw(error); return diagFromSupa(data);
  },
  add:         async (data) => {
    const payload = diagToSupa(data);
    if (!payload.responsable && _uid) payload.responsable = _uid;
    const { data: row, error } = await supabase.from('diagnosticos').insert(payload).select('id').single();
    _throw(error); _invalidate('diagnosticos'); return row.id;
  },
  update:      async (data) => {
    const { id, ...rest } = data;
    const { error } = await supabase.from('diagnosticos').update(diagToSupa(rest)).eq('id', id);
    _throw(error); _invalidate('diagnosticos');
  },
  delete:      async (id)  => {
    const { error } = await supabase.from('diagnosticos').delete().eq('id', id);
    _throw(error); _invalidate('diagnosticos');
  },
  byProspecto: async (pid) => {
    const { data, error } = await supabase.from('diagnosticos').select('*').eq('lead_id', pid).order('created_at', { ascending: false });
    _throw(error); return data.map(diagFromSupa);
  },
};

// ─── CITAS (reuniones del calendario) ────────────────────────
// Las columnas extendidas (duracion_min, participantes, recordatorios,
// recurrencia) requieren supabase/calendar.sql. Si aún no se corrió,
// el INSERT/UPDATE cae al payload base (42703) y avisa en consola.
function _warnCalendarSql() {
  console.warn('citas: faltan columnas del calendario — ejecuta supabase/calendar.sql para persistir participantes/recordatorios/recurrencia.');
}

// Dispara el push del sistema a los participantes (Edge Function notify-meeting).
// Fire-and-forget: jamás bloquea ni rompe el guardado de la cita.
async function notifyMeeting(citaId) {
  try {
    if (!citaId || !supabase?.functions?.invoke) return;
    await supabase.functions.invoke('notify-meeting', { body: { citaId } });
  } catch (err) { console.warn('notify-meeting (push) no crítico:', err?.message || err); }
}

export const citas = {
  getAll:      async ()    => _cachedAll('citas', async () => {
    const { data, error } = await supabase.from('citas').select('*').order('fecha', { ascending: true });
    _throw(error); return data.map(citaFromSupa);
  }),
  get:         async (id)  => {
    const { data, error } = await supabase.from('citas').select('*').eq('id', id).single();
    _throw(error); return citaFromSupa(data);
  },
  add:         async (data) => {
    const payload = citaToSupa(data);
    if (!payload.responsable && _uid) payload.responsable = _uid;
    let { data: row, error } = await supabase.from('citas').insert(payload).select('id').single();
    if (error && isMissingCol(error)) {
      _warnCalendarSql();
      ({ data: row, error } = await supabase.from('citas').insert(citaToSupaBase({ ...data, responsable: payload.responsable })).select('id').single());
    }
    _throw(error); _invalidate('citas');
    notifyMeeting(row.id);          // push del sistema a los participantes (no bloquea)
    return row.id;
  },
  update:      async (data) => {
    const { id, ...rest } = data;
    let { error } = await supabase.from('citas').update(citaToSupa(rest)).eq('id', id);
    if (error && isMissingCol(error)) {
      _warnCalendarSql();
      ({ error } = await supabase.from('citas').update(citaToSupaBase(rest)).eq('id', id));
    }
    _throw(error); _invalidate('citas');
  },
  delete:      async (id)  => {
    const { error } = await supabase.from('citas').delete().eq('id', id);
    _throw(error); _invalidate('citas');
  },
  byProspecto: async (pid) => {
    const { data, error } = await supabase.from('citas').select('*').eq('lead_id', pid).order('fecha', { ascending: true });
    _throw(error); return data.map(citaFromSupa);
  },
};

// ─── PROFILES (equipo) ────────────────────────────────────────
// `rol` = rol técnico de permisos (admin/consultor, RBAC). `cargo` = puesto que se
// muestra (CEO, CTO, Gerenta de Finanzas, Diseñadora…). Son cosas distintas.
function _profileFromRow(p) {
  return {
    id:     p.id,
    nombre: p.nombre || p.email || 'Consultor',
    rol:    p.role || 'Consultor',
    cargo:  p.cargo || '',
    area:   p.area || '',
    email:  p.email || '',
  };
}
export const profiles = {
  // Equipo ACTIVO (pickers de participantes, avatares). Cacheado.
  getAll: async () => _cachedAll('profiles', async () => {
    const { data, error } = await supabase.from('profiles')
      .select('id, nombre, email, role, area, activo, cargo').order('nombre');
    _throw(error);
    return data.filter(p => p.activo !== false).map(_profileFromRow);
  }),
  // Todo el equipo (incluye inactivos) para el editor de Configuración (admin).
  listAll: async () => {
    const { data, error } = await supabase.from('profiles')
      .select('id, nombre, email, role, area, activo, cargo').order('nombre');
    _throw(error);
    return data.map(p => ({ ..._profileFromRow(p), activo: p.activo !== false }));
  },
  // Editar nombre/cargo/area/activo. RLS: solo admin puede tocar a otros; el
  // trigger guard_profile_privesc bloquea cambios de role/org/activo a no-admin.
  update: async ({ id, nombre, cargo, area, activo }) => {
    const patch = clean({ nombre, cargo, area, activo });
    const { error } = await supabase.from('profiles').update(patch).eq('id', id);
    _throw(error); _invalidate('profiles');
  },
};

// ─── PUSH (suscripciones Web Push del usuario) ───────────────
// Cada dispositivo/navegador guarda su endpoint. La Edge Function notify-meeting
// (service_role) las lee para enviar el push del sistema a los participantes.
export const pushSubs = {
  upsert: async ({ endpoint, p256dh, auth, userAgent }) => {
    if (!_uid) throw new Error('Sin sesión para guardar la suscripción push');
    const { error } = await supabase.from('push_subscriptions')
      .upsert({ user_id: _uid, endpoint, p256dh, auth, user_agent: userAgent }, { onConflict: 'endpoint' });
    _throw(error);
  },
  remove: async (endpoint) => {
    const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
    _throw(error);
  },
};

// ─── PROPUESTAS ──────────────────────────────────────────────
export const propuestas = {
  getAll:      async ()    => _cachedAll('propuestas', async () => {
    const { data, error } = await supabase.from('propuestas').select('*').order('created_at', { ascending: false });
    _throw(error); return data.map(propFromSupa);
  }),
  get:         async (id)  => {
    const { data, error } = await supabase.from('propuestas').select('*').eq('id', id).single();
    _throw(error); return propFromSupa(data);
  },
  add:         async (data) => {
    const { data: row, error } = await supabase.from('propuestas').insert(propToSupa(data)).select('id').single();
    _throw(error); _invalidate('propuestas'); return row.id;
  },
  update:      async (data) => {
    const { id, ...rest } = data;
    const { error } = await supabase.from('propuestas').update(propToSupa(rest)).eq('id', id);
    _throw(error); _invalidate('propuestas');
  },
  delete:      async (id)  => {
    const { error } = await supabase.from('propuestas').delete().eq('id', id);
    _throw(error); _invalidate('propuestas');
  },
  byProspecto: async (pid) => {
    const { data, error } = await supabase.from('propuestas').select('*').eq('lead_id', pid).order('created_at', { ascending: false });
    _throw(error); return data.map(propFromSupa);
  },
};

// ─── CLIENTES ────────────────────────────────────────────────
export const clientes = {
  getAll: async () => _cachedAll('clientes', async () => {
    const { data, error } = await supabase.from('clientes').select('*').order('created_at', { ascending: false });
    _throw(error); return data.map(clienteFromSupa);
  }),
  get: async (id) => {
    const { data, error } = await supabase.from('clientes').select('*').eq('id', id).single();
    _throw(error); return clienteFromSupa(data);
  },
  getByLead: async (leadId) => {
    const { data, error } = await supabase.from('clientes').select('*').eq('lead_id', leadId);
    _throw(error); return data.map(clienteFromSupa);
  },
  add: async (data) => {
    const payload = clienteToSupa(data);
    if (!payload.responsable && _uid) payload.responsable = _uid;
    const { data: row, error } = await supabase.from('clientes').insert(payload).select('id').single();
    _throw(error); _invalidate('clientes'); return row.id;
  },
  delete: async (id) => {
    const { error } = await supabase.from('clientes').delete().eq('id', id);
    _throw(error); _invalidate('clientes');
  },
};

// ─── AUTODIAGNÓSTICOS (referencia del cliente, formulario público) ─────────
// El cliente llena el 360 público como autoevaluación: NO es el diagnóstico
// oficial (tabla diagnosticos); es referencia adjunta al lead en el pipeline.
// Requiere supabase/autodiagnosticos.sql. Las lecturas del CRM deben fallar
// suave si la tabla aún no existe (llamar dentro de try/catch).
export const autodiags = {
  getAll: async () => _cachedAll('autodiagnosticos', async () => {
    const { data, error } = await supabase.from('autodiagnosticos').select('*').order('created_at', { ascending: false });
    _throw(error); return data.map(autodiagFromSupa);
  }),
  byProspecto: async (pid) => {
    const { data, error } = await supabase.from('autodiagnosticos').select('*').eq('lead_id', pid).order('created_at', { ascending: false });
    _throw(error); return data.map(autodiagFromSupa);
  },
  delete: async (id) => {
    const { error } = await supabase.from('autodiagnosticos').delete().eq('id', id);
    _throw(error); _invalidate('autodiagnosticos');
  },
};

// ─── FACTURAS ────────────────────────────────────────────────
export const facturas = {
  getAll: async () => _cachedAll('facturas', async () => {
    const { data, error } = await supabase.from('facturas').select('*').order('created_at', { ascending: false });
    _throw(error); return data.map(facturaFromSupa);
  }),
  get: async (id) => {
    const { data, error } = await supabase.from('facturas').select('*').eq('id', id).single();
    _throw(error); return facturaFromSupa(data);
  },
  add: async (data) => {
    const { data: row, error } = await supabase.from('facturas').insert(facturaToSupa(data)).select('id').single();
    _throw(error); _invalidate('facturas'); return row.id;
  },
  update: async (data) => {
    const { id, ...rest } = data;
    const { error } = await supabase.from('facturas').update(facturaToSupa(rest)).eq('id', id);
    _throw(error); _invalidate('facturas');
  },
  delete: async (id) => {
    const { error } = await supabase.from('facturas').delete().eq('id', id);
    _throw(error); _invalidate('facturas');
  },
  byCliente: async (clienteId) => {
    const { data, error } = await supabase.from('facturas').select('*').eq('cliente_id', clienteId).order('created_at', { ascending: false });
    _throw(error); return data.map(facturaFromSupa);
  },
};

// ─── PRESUPUESTOS ─────────────────────────────────────────────
// Documento de cierre (programa + mano de obra + IVA + plan de servicio).
// Requiere supabase/presupuestos.sql. Si la tabla no existe, las lecturas
// lanzan un error que el módulo detecta con isMissingTable() para mostrar el
// aviso de "corre el SQL" (patrón de ai-commander/autodiagnosticos).
export const presupuestos = {
  getAll: async () => _cachedAll('presupuestos', async () => {
    const { data, error } = await supabase.from('presupuestos').select('*').order('created_at', { ascending: false });
    _throw(error); return data.map(presupFromSupa);
  }),
  get: async (id) => {
    const { data, error } = await supabase.from('presupuestos').select('*').eq('id', id).single();
    _throw(error); return presupFromSupa(data);
  },
  add: async (data) => {
    const payload = presupToSupa(data);
    if (!payload.responsable && _uid) payload.responsable = _uid;
    const { data: row, error } = await supabase.from('presupuestos').insert(payload).select('id').single();
    _throw(error); _invalidate('presupuestos'); return row.id;
  },
  update: async (data) => {
    const { id, ...rest } = data;
    const { error } = await supabase.from('presupuestos').update(presupToSupa(rest)).eq('id', id);
    _throw(error); _invalidate('presupuestos');
  },
  delete: async (id) => {
    const { error } = await supabase.from('presupuestos').delete().eq('id', id);
    _throw(error); _invalidate('presupuestos');
  },
  byCliente: async (clienteId) => {
    const { data, error } = await supabase.from('presupuestos').select('*').eq('cliente_id', clienteId).order('created_at', { ascending: false });
    _throw(error); return data.map(presupFromSupa);
  },
};

// ─── BIBLIOTECA DE DOCUMENTOS (M4 "Bóveda" del Plan Maestro) ──
// Repositorio documental de la organización. Los metadatos viven en la tabla
// `documentos`; el archivo en el bucket PRIVADO 'biblioteca' bajo {org_id}/{uuid}.{ext}.
// Leer + subir = cualquier miembro de la org. Borrar = solo admin (lo impone la RLS).
// Descarga vía URL firmada temporal (el bucket no es público).
export const documentos = {
  getAll: async () => _cachedAll('documentos', async () => {
    const { data, error } = await supabase.from('documentos').select('*').order('created_at', { ascending: false });
    _throw(error); return data.map(docFromSupa);
  }),
  // Sube el archivo y crea la fila. Si la fila falla, revierte el archivo para no
  // dejar huérfanos en el bucket.
  add: async ({ file, nombre, descripcion, categoria }) => {
    if (!file) throw new Error('No hay archivo para subir');
    const orgId = await _getOrgId();
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 8) || 'bin';
    const path = `${orgId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('biblioteca')
      .upload(path, file, { contentType: file.type || undefined, upsert: false });
    _throw(upErr);
    const payload = {
      nombre:       (nombre || file.name || 'Documento').slice(0, 200),
      descripcion:  descripcion || null,
      categoria:    categoria || 'General',
      storage_path: path,
      mime_type:    file.type || null,
      size_bytes:   Number.isFinite(file.size) ? file.size : null,
    };
    const { data: row, error } = await supabase.from('documentos').insert(payload).select('id').single();
    if (error) {
      try { await supabase.storage.from('biblioteca').remove([path]); } catch (_) {}
      _throw(error);
    }
    _invalidate('documentos'); return row.id;
  },
  update: async ({ id, nombre, descripcion, categoria }) => {
    const patch = clean({ nombre, descripcion, categoria, updated_at: new Date().toISOString() });
    const { error } = await supabase.from('documentos').update(patch).eq('id', id);
    _throw(error); _invalidate('documentos');
  },
  // Borra la fila (RLS: solo admin) y luego limpia el archivo del bucket.
  remove: async (id, storagePath) => {
    const { error } = await supabase.from('documentos').delete().eq('id', id);
    _throw(error);
    if (storagePath) {
      try { await supabase.storage.from('biblioteca').remove([storagePath]); }
      catch (err) { console.warn('Documento borrado, pero no se pudo limpiar el archivo de Storage:', err?.message || err); }
    }
    _invalidate('documentos');
  },
  // URL firmada temporal para ver/descargar (bucket privado). Default 1 hora.
  signedUrl: async (storagePath, expiresIn = 3600) => {
    const { data, error } = await supabase.storage.from('biblioteca').createSignedUrl(storagePath, expiresIn);
    _throw(error); return data.signedUrl;
  },
};

// ─── Landing leads import ─────────────────────────────────────
export async function importLandingLeads() {
  try {
    const raw = JSON.parse(localStorage.getItem('triada_leads') || '[]');
    if (!raw.length) return 0;
    const { data: existing } = await supabase.from('leads').select('email');
    const existingEmails = new Set((existing || []).map(r => r.email).filter(Boolean));
    let count = 0;
    for (const l of raw) {
      if (l.email && existingEmails.has(l.email)) continue;
      await prospectos.add({
        nombre: l.nombre, empresa: l.empresa, email: l.email,
        telefono: l.telefono, rubro: l.rubro, tamano: l.tamano,
        dolorPrincipal: l.interes, origen: 'landing',
        estado: 'Nuevo',
      });
      count++;
    }
    if (count) localStorage.removeItem('triada_leads');
    return count;
  } catch (err) { console.error('importLandingLeads falló (leads del landing no importados):', err); return 0; }
}
