// js/db.js — Supabase data layer (same interface as IndexedDB version)
import { supabase } from './supabase.js';

let _uid = null;
export function setCurrentUser(uid) { _uid = uid; }
export function getCurrentUserId() { return _uid; }

export function initDB() { return Promise.resolve(); }

// ─── config (localStorage — user preferences only) ────────────
export const config = {
  get:  (key)        => Promise.resolve(localStorage.getItem(`triada_cfg_${key}`)),
  set:  (key, value) => { localStorage.setItem(`triada_cfg_${key}`, value); return Promise.resolve(); },
};

// ─── Helpers ─────────────────────────────────────────────────
function clean(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

const ORIGEN_TO_DB = {
  'Manual': 'manual', 'Landing Web': 'landing', 'Meta Ads': 'meta_ads',
  'Google Ads': 'google_ads', 'WhatsApp': 'whatsapp', 'Referido': 'referido',
};
const ORIGEN_FROM_DB = Object.fromEntries(Object.entries(ORIGEN_TO_DB).map(([k, v]) => [v, k]));
const VALID_ORIGEN = new Set(Object.values(ORIGEN_TO_DB));
// Nunca enviar un valor que el enum `lead_origen` no acepte: rompía el INSERT
// con 22P02 y el guardado fallaba en silencio. Desconocido → 'manual'.
function toOrigenSlug(v) {
  const slug = ORIGEN_TO_DB[v] || v || 'manual';
  return VALID_ORIGEN.has(slug) ? slug : 'manual';
}

function _throw(error) { if (error) throw error; }

// ─── PROSPECTOS → leads ───────────────────────────────────────
function leadFromSupa(row) {
  if (!row) return null;
  return {
    id:                 row.id,
    correlativo:        row.codigo,
    nombre:             row.nombre,
    empresa:            row.empresa,
    rut:                row.rut,
    email:              row.email,
    telefono:           row.telefono,
    rubro:              row.giro,
    tamano:             row.tamano,
    region:             row.region,
    facturacionEst:     row.facturacion_est,
    dolorPrincipal:     row.dolor_principal,
    origen:             ORIGEN_FROM_DB[row.origen] || row.origen,
    estado:             row.estado,
    scoring:            row.scoring,
    responsable:        row.responsable,
    notas:              row.notas,
    historial:          row.historial || [],
    fechaCreacion:      row.created_at,
    fechaActualizacion: row.updated_at,
  };
}

function leadToSupa(data) {
  return clean({
    nombre:          data.nombre,
    empresa:         data.empresa,
    rut:             data.rut,
    email:           data.email,
    telefono:        data.telefono,
    giro:            data.rubro,
    tamano:          data.tamano,
    region:          data.region,
    facturacion_est: data.facturacionEst,
    dolor_principal: data.dolorPrincipal,
    origen:          toOrigenSlug(data.origen),
    estado:          data.estado || 'Nuevo',
    scoring:         data.scoring,
    responsable:     data.responsable,
    notas:           data.notas,
  });
}

export const prospectos = {
  getAll:   async ()       => {
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    _throw(error); return data.map(leadFromSupa);
  },
  get:      async (id)     => {
    const { data, error } = await supabase.from('leads').select('*').eq('id', id).single();
    _throw(error); return leadFromSupa(data);
  },
  add:      async (data)   => {
    const payload = leadToSupa(data);
    if (!payload.responsable && _uid) payload.responsable = _uid;
    const { data: row, error } = await supabase.from('leads').insert(payload).select('id').single();
    _throw(error); return row.id;
  },
  update:   async (data)   => {
    const { id, ...rest } = data;
    const { error } = await supabase.from('leads').update(leadToSupa(rest)).eq('id', id);
    _throw(error);
  },
  delete:   async (id)     => {
    const { error } = await supabase.from('leads').delete().eq('id', id);
    _throw(error);
  },
  byEstado: async (estado) => {
    const { data, error } = await supabase.from('leads').select('*').eq('estado', estado).order('created_at', { ascending: false });
    _throw(error); return data.map(leadFromSupa);
  },
  byRubro:  async (rubro)  => {
    const { data, error } = await supabase.from('leads').select('*').eq('giro', rubro).order('created_at', { ascending: false });
    _throw(error); return data.map(leadFromSupa);
  },
};

// ─── DIAGNÓSTICOS ─────────────────────────────────────────────
function diagFromSupa(row) {
  if (!row) return null;
  const sc = row.scores || {};
  return {
    id:             row.id,
    correlativo:    row.codigo,
    prospectoId:    row.lead_id,
    scoresTec:      sc.tecnologia  || [],
    scoresVentas:   sc.ventas      || [],
    scoresFinanzas: sc.finanzas    || [],
    hallazgos:      row.hallazgos,
    oportunidades:  row.oportunidades,
    estado:         row.estado,
    responsable:    row.responsable,
    fecha:          row.created_at,
  };
}

function diagToSupa(data) {
  return clean({
    lead_id:      data.prospectoId,
    scores: {
      tecnologia: data.scoresTec      || [],
      ventas:     data.scoresVentas   || [],
      finanzas:   data.scoresFinanzas || [],
    },
    hallazgos:    data.hallazgos,
    oportunidades: data.oportunidades,
    estado:       data.estado || 'borrador',
    responsable:  data.responsable,
  });
}

export const diagnosticos = {
  getAll:      async ()    => {
    const { data, error } = await supabase.from('diagnosticos').select('*').order('created_at', { ascending: false });
    _throw(error); return data.map(diagFromSupa);
  },
  get:         async (id)  => {
    const { data, error } = await supabase.from('diagnosticos').select('*').eq('id', id).single();
    _throw(error); return diagFromSupa(data);
  },
  add:         async (data) => {
    const payload = diagToSupa(data);
    if (!payload.responsable && _uid) payload.responsable = _uid;
    const { data: row, error } = await supabase.from('diagnosticos').insert(payload).select('id').single();
    _throw(error); return row.id;
  },
  update:      async (data) => {
    const { id, ...rest } = data;
    const { error } = await supabase.from('diagnosticos').update(diagToSupa(rest)).eq('id', id);
    _throw(error);
  },
  delete:      async (id)  => {
    const { error } = await supabase.from('diagnosticos').delete().eq('id', id);
    _throw(error);
  },
  byProspecto: async (pid) => {
    const { data, error } = await supabase.from('diagnosticos').select('*').eq('lead_id', pid).order('created_at', { ascending: false });
    _throw(error); return data.map(diagFromSupa);
  },
};

// ─── CITAS ───────────────────────────────────────────────────
function citaFromSupa(row) {
  if (!row) return null;
  return {
    id:           row.id,
    prospectoId:  row.lead_id,
    titulo:       row.titulo,
    tipo:         row.tipo,
    estado:       row.estado,
    fecha:        row.fecha,
    hora:         row.hora,
    lugar:        row.lugar,
    notas:        row.notas,
    responsable:  row.responsable,
    fechaCreacion: row.created_at,
  };
}

function citaToSupa(data) {
  return clean({
    lead_id:     data.prospectoId,
    titulo:      data.titulo,
    tipo:        data.tipo,
    estado:      data.estado,
    fecha:       data.fecha,
    hora:        data.hora,
    lugar:       data.lugar,
    notas:       data.notas,
    responsable: data.responsable,
  });
}

export const citas = {
  getAll:      async ()    => {
    const { data, error } = await supabase.from('citas').select('*').order('fecha', { ascending: true });
    _throw(error); return data.map(citaFromSupa);
  },
  get:         async (id)  => {
    const { data, error } = await supabase.from('citas').select('*').eq('id', id).single();
    _throw(error); return citaFromSupa(data);
  },
  add:         async (data) => {
    const payload = citaToSupa(data);
    if (!payload.responsable && _uid) payload.responsable = _uid;
    const { data: row, error } = await supabase.from('citas').insert(payload).select('id').single();
    _throw(error); return row.id;
  },
  update:      async (data) => {
    const { id, ...rest } = data;
    const { error } = await supabase.from('citas').update(citaToSupa(rest)).eq('id', id);
    _throw(error);
  },
  delete:      async (id)  => {
    const { error } = await supabase.from('citas').delete().eq('id', id);
    _throw(error);
  },
  byProspecto: async (pid) => {
    const { data, error } = await supabase.from('citas').select('*').eq('lead_id', pid).order('fecha', { ascending: true });
    _throw(error); return data.map(citaFromSupa);
  },
  byEstado:    async (est) => {
    const { data, error } = await supabase.from('citas').select('*').eq('estado', est).order('fecha', { ascending: true });
    _throw(error); return data.map(citaFromSupa);
  },
};

// ─── PROPUESTAS ──────────────────────────────────────────────
function propFromSupa(row) {
  if (!row) return null;
  return {
    id:          row.id,
    correlativo: row.codigo,
    prospectoId: row.lead_id,
    servicios:   row.servicios,
    valor:       row.valor,
    estado:      row.estado,
    vigencia:    row.vigencia,
    notas:       row.notas,
    fecha:       row.created_at,
  };
}

function propToSupa(data) {
  return clean({
    lead_id:  data.prospectoId,
    servicios: data.servicios,
    valor:     data.valor,
    estado:    data.estado || 'borrador',
    vigencia:  data.vigencia,
    notas:     data.notas,
  });
}

export const propuestas = {
  getAll:      async ()    => {
    const { data, error } = await supabase.from('propuestas').select('*').order('created_at', { ascending: false });
    _throw(error); return data.map(propFromSupa);
  },
  get:         async (id)  => {
    const { data, error } = await supabase.from('propuestas').select('*').eq('id', id).single();
    _throw(error); return propFromSupa(data);
  },
  add:         async (data) => {
    const { data: row, error } = await supabase.from('propuestas').insert(propToSupa(data)).select('id').single();
    _throw(error); return row.id;
  },
  update:      async (data) => {
    const { id, ...rest } = data;
    const { error } = await supabase.from('propuestas').update(propToSupa(rest)).eq('id', id);
    _throw(error);
  },
  delete:      async (id)  => {
    const { error } = await supabase.from('propuestas').delete().eq('id', id);
    _throw(error);
  },
  byProspecto: async (pid) => {
    const { data, error } = await supabase.from('propuestas').select('*').eq('lead_id', pid).order('created_at', { ascending: false });
    _throw(error); return data.map(propFromSupa);
  },
  byEstado:    async (est) => {
    const { data, error } = await supabase.from('propuestas').select('*').eq('estado', est).order('created_at', { ascending: false });
    _throw(error); return data.map(propFromSupa);
  },
};

// ─── CLIENTES ────────────────────────────────────────────────
function clienteFromSupa(row) {
  if (!row) return null;
  return {
    id:          row.id,
    correlativo: row.codigo,
    leadId:      row.lead_id,
    razonSocial: row.razon_social,
    nombre:      row.razon_social,   // alias para UI que lee .nombre
    empresa:     row.razon_social,
    rut:         row.rut,
    giro:        row.giro,
    direccion:   row.direccion,
    fechaAlta:   row.created_at,
  };
}

function clienteToSupa(data) {
  return clean({
    lead_id:  data.leadId,
    nombre:   data.nombre,
    empresa:  data.empresa,
    rut:      data.rut,
    email:    data.email,
    telefono: data.telefono,
  });
}

export const clientes = {
  getAll: async () => {
    const { data, error } = await supabase.from('clientes').select('*').order('created_at', { ascending: false });
    _throw(error); return data.map(clienteFromSupa);
  },
  get: async (id) => {
    const { data, error } = await supabase.from('clientes').select('*').eq('id', id).single();
    _throw(error); return clienteFromSupa(data);
  },
  getByLead: async (leadId) => {
    const { data, error } = await supabase.from('clientes').select('*').eq('lead_id', leadId);
    _throw(error); return data.map(clienteFromSupa);
  },
  add: async (data) => {
    const { data: row, error } = await supabase.from('clientes').insert(clienteToSupa(data)).select('id').single();
    _throw(error); return row.id;
  },
  delete: async (id) => {
    const { error } = await supabase.from('clientes').delete().eq('id', id);
    _throw(error);
  },
};

// ─── FACTURAS ────────────────────────────────────────────────
function facturaFromSupa(row) {
  if (!row) return null;
  return {
    id:            row.id,
    correlativo:   row.codigo,
    clienteId:     row.cliente_id,
    monto:         row.monto,
    pagado:        row.pagado,
    estado:        row.estado,
    emision:       row.emision,
    vencimiento:   row.vencimiento,
    fechaCreacion: row.created_at,
  };
}

// El enum fact_estado solo acepta estos valores (minúscula). Antes se enviaban
// 'Pendiente'/'Enviada'… → 22P02 y la factura no se guardaba.
const VALID_FACT_ESTADO = new Set(['pendiente', 'parcial', 'pagado', 'vencido']);
function toFactEstado(v) {
  const s = (v || 'pendiente').toString().toLowerCase();
  return VALID_FACT_ESTADO.has(s) ? s : 'pendiente';
}

function facturaToSupa(data) {
  return clean({
    cliente_id:  data.clienteId,
    monto:       data.monto,
    pagado:      data.pagado,
    estado:      toFactEstado(data.estado),
    emision:     data.emision,
    vencimiento: data.vencimiento,
  });
}

export const facturas = {
  getAll: async () => {
    const { data, error } = await supabase.from('facturas').select('*').order('created_at', { ascending: false });
    _throw(error); return data.map(facturaFromSupa);
  },
  get: async (id) => {
    const { data, error } = await supabase.from('facturas').select('*').eq('id', id).single();
    _throw(error); return facturaFromSupa(data);
  },
  add: async (data) => {
    const { data: row, error } = await supabase.from('facturas').insert(facturaToSupa(data)).select('id').single();
    _throw(error); return row.id;
  },
  update: async (data) => {
    const { id, ...rest } = data;
    const { error } = await supabase.from('facturas').update(facturaToSupa(rest)).eq('id', id);
    _throw(error);
  },
  delete: async (id) => {
    const { error } = await supabase.from('facturas').delete().eq('id', id);
    _throw(error);
  },
  byCliente: async (clienteId) => {
    const { data, error } = await supabase.from('facturas').select('*').eq('cliente_id', clienteId).order('created_at', { ascending: false });
    _throw(error); return data.map(facturaFromSupa);
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
        estado: 'Nuevo', historial: l.historial || [],
      });
      count++;
    }
    if (count) localStorage.removeItem('triada_leads');
    return count;
  } catch { return 0; }
}
