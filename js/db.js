// js/db.js — IndexedDB layer for Tríada Diagnóstico CRM
const DB_NAME = 'TriadaDiagnosticoDB';
const DB_VER  = 1;

let _db = null;

export function initDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e => _buildSchema(e.target.result);
    req.onsuccess = e => { _db = e.target.result; resolve(); };
    req.onerror   = () => reject(req.error);
  });
}

function _buildSchema(db) {
  if (!db.objectStoreNames.contains('prospectos')) {
    const s = db.createObjectStore('prospectos', { keyPath: 'id', autoIncrement: true });
    s.createIndex('estado',        'estado',        { unique: false });
    s.createIndex('fechaCreacion', 'fechaCreacion', { unique: false });
    s.createIndex('rubro',         'rubro',         { unique: false });
  }
  if (!db.objectStoreNames.contains('diagnosticos')) {
    const d = db.createObjectStore('diagnosticos', { keyPath: 'id', autoIncrement: true });
    d.createIndex('prospectoId', 'prospectoId', { unique: false });
    d.createIndex('fecha',       'fecha',       { unique: false });
  }
  if (!db.objectStoreNames.contains('citas')) {
    const c = db.createObjectStore('citas', { keyPath: 'id', autoIncrement: true });
    c.createIndex('prospectoId',   'prospectoId',   { unique: false });
    c.createIndex('diagnosticoId', 'diagnosticoId', { unique: false });
    c.createIndex('fecha',         'fecha',         { unique: false });
    c.createIndex('estado',        'estado',        { unique: false });
  }
  if (!db.objectStoreNames.contains('propuestas')) {
    const p = db.createObjectStore('propuestas', { keyPath: 'id', autoIncrement: true });
    p.createIndex('prospectoId', 'prospectoId', { unique: false });
    p.createIndex('estado',      'estado',      { unique: false });
    p.createIndex('fecha',       'fecha',       { unique: false });
  }
  if (!db.objectStoreNames.contains('config')) {
    db.createObjectStore('config', { keyPath: 'key' });
  }
}

// ── Generic store helpers ──
function _getStore(name, mode = 'readonly') {
  return _db.transaction([name], mode).objectStore(name);
}

function _all(store) {
  return new Promise((resolve, reject) => {
    const req = _getStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function _get(store, key) {
  return new Promise((resolve, reject) => {
    const req = _getStore(store).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function _add(store, data) {
  return new Promise((resolve, reject) => {
    const req = _getStore(store, 'readwrite').add(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function _put(store, data) {
  return new Promise((resolve, reject) => {
    const req = _getStore(store, 'readwrite').put(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function _del(store, key) {
  return new Promise((resolve, reject) => {
    const req = _getStore(store, 'readwrite').delete(key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

function _byIndex(store, index, value) {
  return new Promise((resolve, reject) => {
    const req = _getStore(store).index(index).getAll(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

// ── Exposed stores ──
export const prospectos = {
  getAll:   ()         => _all('prospectos'),
  get:      (id)       => _get('prospectos', id),
  add:      (data)     => _add('prospectos', { ...data, fechaCreacion: data.fechaCreacion || new Date().toISOString(), fechaActualizacion: new Date().toISOString() }),
  update:   (data)     => _put('prospectos', { ...data, fechaActualizacion: new Date().toISOString() }),
  delete:   (id)       => _del('prospectos', id),
  byEstado: (estado)   => _byIndex('prospectos', 'estado', estado),
  byRubro:  (rubro)    => _byIndex('prospectos', 'rubro', rubro),
};

export const diagnosticos = {
  getAll:       ()           => _all('diagnosticos'),
  get:          (id)         => _get('diagnosticos', id),
  add:          (data)       => _add('diagnosticos', { ...data, fecha: data.fecha || new Date().toISOString() }),
  update:       (data)       => _put('diagnosticos', data),
  delete:       (id)         => _del('diagnosticos', id),
  byProspecto:  (pid)        => _byIndex('diagnosticos', 'prospectoId', pid),
};

export const citas = {
  getAll:       ()     => _all('citas'),
  get:          (id)   => _get('citas', id),
  add:          (data) => _add('citas', { ...data, fechaCreacion: new Date().toISOString() }),
  update:       (data) => _put('citas', data),
  delete:       (id)   => _del('citas', id),
  byProspecto:  (pid)  => _byIndex('citas', 'prospectoId', pid),
  byEstado:     (est)  => _byIndex('citas', 'estado', est),
};

export const propuestas = {
  getAll:      ()     => _all('propuestas'),
  get:         (id)   => _get('propuestas', id),
  add:         (data) => _add('propuestas', { ...data, fecha: data.fecha || new Date().toISOString() }),
  update:      (data) => _put('propuestas', data),
  delete:      (id)   => _del('propuestas', id),
  byProspecto: (pid)  => _byIndex('propuestas', 'prospectoId', pid),
  byEstado:    (est)  => _byIndex('propuestas', 'estado', est),
};

export const config = {
  get: (key)        => _get('config', key).then(r => r?.value),
  set: (key, value) => _put('config', { key, value }),
};

// ── Landing leads import ──
export async function importLandingLeads() {
  try {
    const raw = JSON.parse(localStorage.getItem('triada_leads') || '[]');
    if (!raw.length) return 0;
    const existing = await prospectos.getAll();
    const existingEmails = new Set(existing.map(p => p.email).filter(Boolean));
    let count = 0;
    for (const l of raw) {
      if (l.email && existingEmails.has(l.email)) continue;
      await prospectos.add({
        nombre: l.nombre, empresa: l.empresa, email: l.email,
        telefono: l.telefono, rubro: l.rubro, tamano: l.tamano,
        dolorPrincipal: l.interes, origen: 'Landing Web',
        estado: 'Nuevo', historial: l.historial || [],
        fechaCreacion: l.fechaCreacion,
      });
      count++;
    }
    if (count) localStorage.removeItem('triada_leads');
    return count;
  } catch { return 0; }
}
