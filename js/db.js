// js/db.js — Supabase data layer (same interface as IndexedDB version)
import { supabase } from './supabase.js';

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
  'Landing Web': 'landing', 'Meta Ads': 'meta_ads',
  'Google Ads': 'google_ads', 'WhatsApp': 'whatsapp', 'Referido': 'referido',
};
const ORIGEN_FROM_DB = Object.fromEntries(Object.entries(ORIGEN_TO_DB).map(([k, v]) => [v, k]));

function _throw(error) { if (error) throw error; }

// ─── PROSPECTOS → leads ───────────────────────────────────────
function leadFromSupa(row) {
  if (!row) return null;
  return {
    id:                 row.id,
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
    origen:          ORIGEN_TO_DB[data.origen] || data.origen || 'manual',
    estado:          data.estado || 'Nuevo',
    scoring:         data.scoring,
    responsable:     data.responsable,
    notas:           data.notas,
    historial:       data.historial,
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
    const { data: row, error } = await supabase.from('leads').insert(leadToSupa(data)).select('id').single();
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
    const giro = ORIGEN_TO_DB[rubro] || rubro;
    const { data, error } = await supabase.from('leads').select('*').eq('giro', giro).order('created_at', { ascending: false });
    _throw(error); return data.map(leadFromSupa);
  },
};

// ─── DIAGNÓSTICOS ─────────────────────────────────────────────
function diagFromSupa(row) {
  if (!row) return null;
  const sc = row.scores || {};
  return {
    id:             row.id,
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
    const { data: row, error } = await supabase.from('diagnosticos').insert(diagToSupa(data)).select('id').single();
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
    fechaCreacion: row.created_at,
  };
}

function citaToSupa(data) {
  return clean({
    lead_id: data.prospectoId,
    titulo:  data.titulo,
    tipo:    data.tipo,
    estado:  data.estado,
    fecha:   data.fecha,
    hora:    data.hora,
    lugar:   data.lugar,
    notas:   data.notas,
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
    const { data: row, error } = await supabase.from('citas').insert(citaToSupa(data)).select('id').single();
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
