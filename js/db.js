// js/db.js — Supabase data layer (same interface as IndexedDB version)
import { supabase } from './supabase.js';
import {
  isMissingCol,
  leadFromSupa, leadToSupa,
  diagFromSupa, diagToSupa,
  citaFromSupa, citaToSupaBase, citaToSupa,
  propFromSupa, propToSupa,
  clienteFromSupa, clienteToSupa,
  autodiagFromSupa,
  facturaFromSupa, toFactEstado, facturaToSupa,
  presupFromSupa, presupToSupa,
} from './mappers.js';

// Reexport para no romper a quien importe isMissingTable desde db.js (módulos
// presupuestos/ai-commander). Las transformaciones puras viven en mappers.js.
export { isMissingTable } from './mappers.js';

let _uid = null;
export function setCurrentUser(uid) { _uid = uid; }
export function getCurrentUserId() { return _uid; }

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
    _throw(error); _invalidate('citas'); return row.id;
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

// ─── PROFILES (equipo de consultores) ────────────────────────
export const profiles = {
  getAll: async () => _cachedAll('profiles', async () => {
    const { data, error } = await supabase.from('profiles')
      .select('id, nombre, email, role, area, activo').order('nombre');
    _throw(error);
    return data.filter(p => p.activo !== false).map(p => ({
      id:     p.id,
      nombre: p.nombre || p.email || 'Consultor',
      rol:    p.role || 'Consultor',
      area:   p.area || '',
    }));
  }),
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
