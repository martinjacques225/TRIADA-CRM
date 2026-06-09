// js/db.js — Capa de acceso a datos (IndexedDB)
// No modificar nombres de tablas ni estructuras — compatibilidad con datos existentes
import { getWeekStart, calcTotalMedallas, calcNivel, nivelInfo } from './utils.js';

const DB_NAME = 'AgendaComercialDB';
const DB_VERSION = 3;
let _db = null;

export function initDB() {
  return new Promise((resolve, reject) => {
    if (_db) return resolve(_db);
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('appointments')) {
        const s = db.createObjectStore('appointments', { keyPath: 'id', autoIncrement: true });
        s.createIndex('fecha', 'fecha', { unique: false });
        s.createIndex('estado', 'estado', { unique: false });
      }
      if (!db.objectStoreNames.contains('templates'))
        db.createObjectStore('templates', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('config'))
        db.createObjectStore('config', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('leads')) {
        const s = db.createObjectStore('leads', { keyPath: 'id', autoIncrement: true });
        s.createIndex('estado', 'estado', { unique: false });
        s.createIndex('fechaCreacion', 'fechaCreacion', { unique: false });
      }
      if (!db.objectStoreNames.contains('calls')) {
        const s = db.createObjectStore('calls', { keyPath: 'id', autoIncrement: true });
        s.createIndex('leadId', 'leadId', { unique: false });
        s.createIndex('apptId', 'apptId', { unique: false });
        s.createIndex('fecha', 'fecha', { unique: false });
      }
      if (!db.objectStoreNames.contains('sales')) {
        const s = db.createObjectStore('sales', { keyPath: 'id', autoIncrement: true });
        s.createIndex('fecha', 'fecha', { unique: false });
        s.createIndex('plan', 'plan', { unique: false });
      }
      // v3: log de actividad reciente (no destructivo)
      if (!db.objectStoreNames.contains('events')) {
        const s = db.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
        s.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
    req.onsuccess = e => { _db = e.target.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

function tx(store, mode = 'readonly') {
  return _db.transaction(store, mode).objectStore(store);
}

function wrap(req) {
  return new Promise((res, rej) => {
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

function cursorAll(store) {
  return new Promise((res, rej) => {
    const items = [];
    const req = tx(store).openCursor();
    req.onsuccess = e => {
      const c = e.target.result;
      if (c) { items.push(c.value); c.continue(); } else res(items);
    };
    req.onerror = () => rej(req.error);
  });
}

// ── Log de eventos (actividad reciente) ──
// Emisión segura: nunca interrumpe la operación principal si falla.
async function _logEvent(tipo, titulo, detalle = '', refId = null) {
  try {
    const now = new Date().toISOString();
    await wrap(tx('events', 'readwrite').add({ tipo, titulo, detalle, refId, timestamp: now }));
  } catch { /* el log no debe romper la app */ }
}

export const events = {
  getAll() { return cursorAll('events'); },
  async getRecent(n = 8) {
    const all = await cursorAll('events');
    return all.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || '')).slice(0, n);
  }
};

export const appointments = {
  add(data) {
    const now = new Date().toISOString();
    return wrap(tx('appointments', 'readwrite').add({ ...data, estado: data.estado || 'Pendiente', fechaCreacion: now, fechaActualizacion: now }));
  },
  get(id)    { return wrap(tx('appointments').get(id)); },
  getAll()   { return cursorAll('appointments'); },
  getByDate(fecha) {
    return new Promise((res, rej) => {
      const items = [];
      const req = tx('appointments').index('fecha').openCursor(IDBKeyRange.only(fecha));
      req.onsuccess = e => { const c = e.target.result; if (c) { items.push(c.value); c.continue(); } else res(items); };
      req.onerror = () => rej(req.error);
    });
  },
  async update(data) {
    let prev = null;
    try { prev = await this.get(data.id); } catch {}
    // Merge: nunca perder campos que el formulario no reenvía (ej. leadId, fechaCreacion)
    const merged = prev ? { ...prev, ...data } : { ...data };
    merged.fechaActualizacion = new Date().toISOString();
    const r = await wrap(tx('appointments', 'readwrite').put(merged));
    if (prev && prev.estado !== merged.estado) {
      if (merged.estado === 'Reagendada') _logEvent('reagenda', 'Cita reagendada', merged.nombre || '', merged.id);
      else if (merged.estado === 'Contrató') _logEvent('venta', 'Cita marcada como contrató', merged.nombre || '', merged.id);
    }
    return r;
  },
  delete(id)   { return wrap(tx('appointments', 'readwrite').delete(id)); },
  async checkConflict(fecha, hora, excludeId = null) {
    const all = await this.getByDate(fecha);
    return all.find(a => a.hora === hora && a.id !== excludeId && a.estado !== 'Reagendada');
  },
  async search(query) {
    const all = await this.getAll();
    if (!query) return all;
    const q = query.toLowerCase();
    return all.filter(a =>
      (a.nombre || '').toLowerCase().includes(q) ||
      (a.telefono || '').toLowerCase().includes(q) ||
      (a.interes || '').toLowerCase().includes(q) ||
      (a.estado || '').toLowerCase().includes(q) ||
      (a.origenLead || '').toLowerCase().includes(q)
    );
  }
};

export const leads = {
  async add(data) {
    const now = new Date().toISOString();
    const id = await wrap(tx('leads', 'readwrite').add({ ...data, estado: data.estado || 'Nuevo', historial: data.historial || [], fechaCreacion: now, fechaActualizacion: now }));
    _logEvent('lead', 'Nuevo lead agregado', `${data.nombre || ''} ${data.apellido || ''}`.trim(), id);
    return id;
  },
  get(id)    { return wrap(tx('leads').get(id)); },
  getAll()   { return cursorAll('leads'); },
  async update(data) {
    let prev = null;
    try { prev = await this.get(data.id); } catch {}
    // Merge: preservar historial/avatar/fechaCreacion que el formulario no reenvía
    const merged = prev ? { ...prev, ...data } : { ...data };
    merged.fechaActualizacion = new Date().toISOString();
    if (!Array.isArray(merged.historial)) merged.historial = [];
    const cambioEstado = prev && data.estado && prev.estado !== data.estado;
    if (cambioEstado) {
      // Registro automático del cambio de estado en el timeline del lead
      merged.historial.unshift({ tipo: 'estado', desc: `Estado: ${prev.estado || '—'} → ${data.estado}`, from: prev.estado || '', to: data.estado, timestamp: new Date().toISOString() });
    }
    const r = await wrap(tx('leads', 'readwrite').put(merged));
    if (cambioEstado) {
      _logEvent('lead_estado', `Lead en ${String(data.estado).toLowerCase()}`, `${merged.nombre || ''} ${merged.apellido || ''}`.trim(), merged.id);
    }
    return r;
  },
  delete(id)   { return wrap(tx('leads', 'readwrite').delete(id)); },
  async addHistorial(id, entry) {
    const lead = await this.get(id);
    if (!lead) return;
    if (!lead.historial) lead.historial = [];
    lead.historial.unshift({ ...entry, timestamp: new Date().toISOString() });
    return this.update(lead);
  },
  async search(query) {
    const all = await this.getAll();
    if (!query) return all;
    const q = query.toLowerCase();
    return all.filter(l =>
      (l.nombre || '').toLowerCase().includes(q) ||
      (l.apellido || '').toLowerCase().includes(q) ||
      (l.telefono || '').toLowerCase().includes(q) ||
      (l.email || '').toLowerCase().includes(q) ||
      (l.empresa || '').toLowerCase().includes(q)
    );
  }
};

export const calls = {
  add(data) {
    const now = new Date().toISOString();
    return wrap(tx('calls', 'readwrite').add({ ...data, fecha: data.fecha || now.slice(0, 10), hora: data.hora || now.slice(11, 16), resultado: data.resultado || 'Iniciada', timestamp: now }));
  },
  get(id)    { return wrap(tx('calls').get(id)); },
  getAll()   { return cursorAll('calls'); },
  update(data) { return wrap(tx('calls', 'readwrite').put(data)); },
  getByLead(leadId) {
    return new Promise((res, rej) => {
      const items = [];
      const req = tx('calls').index('leadId').openCursor(IDBKeyRange.only(leadId));
      req.onsuccess = e => { const c = e.target.result; if (c) { items.push(c.value); c.continue(); } else res(items); };
      req.onerror = () => rej(req.error);
    });
  },
  getByAppt(apptId) {
    return new Promise((res, rej) => {
      const items = [];
      const req = tx('calls').index('apptId').openCursor(IDBKeyRange.only(apptId));
      req.onsuccess = e => { const c = e.target.result; if (c) { items.push(c.value); c.continue(); } else res(items); };
      req.onerror = () => rej(req.error);
    });
  },
  async getByDateRange(start, end) {
    const all = await this.getAll();
    return all.filter(c => c.fecha >= start && c.fecha <= end);
  }
};

export const sales = {
  async add(data) {
    const now = new Date().toISOString();
    const before = await this.getAll();
    const rec = { ...data, fecha: data.fecha || now.slice(0, 10), timestamp: now };
    const id = await wrap(tx('sales', 'readwrite').add(rec));
    _logEvent('venta', 'Venta registrada', data.plan || '', id);
    // ¿Esta venta completó una nueva medalla? (1 medalla / 4 ventas semana)
    try {
      const medAntes = calcTotalMedallas(before);
      const medAhora = calcTotalMedallas([...before, rec]);
      if (medAhora > medAntes) {
        const info = nivelInfo(calcNivel(medAhora));
        _logEvent('medalla', 'Medalla obtenida', info.nombre, id);
      }
    } catch {}
    return id;
  },
  get(id)    { return wrap(tx('sales').get(id)); },
  getAll()   { return cursorAll('sales'); },
  update(data) { return wrap(tx('sales', 'readwrite').put(data)); },
  delete(id)   { return wrap(tx('sales', 'readwrite').delete(id)); },
  async getByMonth(year, month) {
    const all = await this.getAll();
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    return all.filter(s => s.fecha.startsWith(prefix));
  }
};

const DEFAULT_TEMPLATES = [
  // ── Contacto inicial ──
  { id: 'primer_contacto',       nombre: '👋 Primer contacto',           contenido: 'Hola {{nombre}} 👋\n\nTe escribo de parte de *{{ejecutivo}}*, vi que podrías estar interesado/a en *{{producto}}*.\n\n¿Tienes unos minutos para conversar esta semana? 😊' },
  { id: 'llamada_no_contesto',   nombre: '📵 Llamada no contestada',     contenido: 'Hola {{nombre}} 👋\n\nTe llamé hace un momento pero no pudiste contestar.\n\nSoy *{{ejecutivo}}* y quería contarte sobre *{{producto}}*.\n\n¿Cuándo te queda bien hablar? 📞' },
  { id: 'intento_contacto',      nombre: '🔁 Segundo intento',           contenido: 'Hola {{nombre}}! 😊\n\nSoy *{{ejecutivo}}*, te contacté anteriormente sobre *{{producto}}*.\n\nQuería saber si pudiste revisar la información.\n\n¿Tienes 10 minutos esta semana? 🙌' },
  // ── Citas ──
  { id: 'confirmacion',          nombre: '✅ Confirmar cita',            contenido: 'Hola {{nombre}} 👋\n\nTe confirmo tu cita para el *{{fecha}}* a las *{{hora}}*.\n\nTema: *{{producto}}*\nLink: {{zoom}}\n\n¡Te espero puntual! 😊\n\n— {{ejecutivo}}' },
  { id: 'confirmacion_24h',      nombre: '🔔 Recordatorio 24h antes',    contenido: 'Hola {{nombre}}! 🔔\n\nTe recuerdo que *mañana {{fecha}}* a las *{{hora}}* tenemos nuestra reunión.\n\nTema: *{{producto}}*\nZoom: {{zoom}}\n\n¿Confirmas asistencia? ✅' },
  { id: 'recordatorio',          nombre: '⏰ Recordatorio 1h antes',     contenido: 'Hola {{nombre}}! ⏰\n\n*¡En una hora nos vemos!*\n\nRecuerda: hoy a las *{{hora}}*\nZoom: {{zoom}}\n\n¡Te espero! 🙌' },
  { id: 'reagendamiento',        nombre: '📅 Reagendar cita',            contenido: 'Hola {{nombre}} 😊\n\nHemos reagendado tu cita para el *{{fecha}}* a las *{{hora}}*.\n\nTema: *{{producto}}*\nZoom: {{zoom}}\n\n¡Nos vemos!' },
  { id: 'reagendar_proactivo',   nombre: '🗓️ Proponer nueva fecha',      contenido: 'Hola {{nombre}} 👋\n\nQuería coordinar contigo una nueva fecha para conversar sobre *{{producto}}*.\n\n¿Qué día te acomoda esta semana? Tengo disponibilidad en la mañana y tarde 😊\n\n— {{ejecutivo}}' },
  // ── Seguimiento ──
  { id: 'seguimiento',           nombre: '📋 Seguimiento general',       contenido: 'Hola {{nombre}}! 😊\n\nQuería hacer un seguimiento sobre tu interés en *{{producto}}*.\n\n¿Pudiste pensar en nuestra propuesta?\n\nQuedo a tu disposición 🙌\n\n— {{ejecutivo}}' },
  { id: 'propuesta_enviada',     nombre: '📄 Propuesta enviada',         contenido: 'Hola {{nombre}} 👋\n\nTe acabo de enviar la propuesta de *{{producto}}*.\n\n¿Puedes revisarla y me dices qué te parece? 😊\n\nEstoy disponible para resolver cualquier duda 💬\n\n— {{ejecutivo}}' },
  { id: 'objecion_precio',       nombre: '💰 Manejo de precio',          contenido: 'Hola {{nombre}} 😊\n\nEntiendo que el precio es un factor importante.\n\nQuería contarte que tenemos opciones de financiamiento para *{{producto}}* que se adaptan a distintos presupuestos.\n\n¿Conversamos? 🙏\n\n— {{ejecutivo}}' },
  // ── Post reunión ──
  { id: 'post_reunion',          nombre: '🤝 Post reunión',              contenido: 'Hola {{nombre}} 🙏\n\nFue un placer conversar contigo hoy.\n\nQuedo atento/a a cualquier consulta sobre *{{producto}}*.\n\n¡Hasta pronto!\n\n— {{ejecutivo}}' },
  { id: 'no_asistio',           nombre: '😔 No asistió — 1er contacto', contenido: 'Hola {{nombre}} 👋\n\nNotamos que no pudiste asistir a tu cita de hoy.\n\n¿Todo bien? No te preocupes, podemos reagendarla cuando gustes 😊\n\n— {{ejecutivo}}' },
  { id: 'no_asistio_seguimiento',nombre: '🔁 No asistió — 2do intento', contenido: 'Hola {{nombre}}! 😊\n\nSé que a veces el tiempo no alcanza para todo.\n\nSi aún tienes interés en *{{producto}}*, me encantaría poder contarte más.\n\n¿Te parece si buscamos una nueva fecha? 🗓️\n\n— {{ejecutivo}}' },
  // ── Cierre y postventa ──
  { id: 'cierre',                nombre: '🎉 Cierre de venta',          contenido: 'Hola {{nombre}} 🎉\n\n¡Muchas gracias por tu confianza!\n\nQueda confirmada tu inscripción en *{{producto}}*.\n\nCualquier consulta, aquí estoy 💪\n\n— {{ejecutivo}}' },
  { id: 'bienvenida_cliente',    nombre: '🌟 Bienvenida nuevo cliente',  contenido: 'Hola {{nombre}} 🌟\n\n¡Bienvenido/a a la familia!\n\nEs un gusto tenerte con nosotros en *{{producto}}*.\n\nEstaré aquí para acompañarte en todo el proceso. Cualquier duda, escríbeme 😊\n\n— {{ejecutivo}}' },
  { id: 'pedir_referido',        nombre: '🤝 Pedir referido',           contenido: 'Hola {{nombre}} 😊\n\nEspero que estés muy contento/a con *{{producto}}*.\n\nSi tienes algún amigo, familiar o colega que pueda estar interesado, me encantaría poder ayudarlo/a también 🙌\n\n¿Se te viene alguien en mente?\n\n— {{ejecutivo}}' },
  // ── Recuperación ──
  { id: 'recuperacion',          nombre: '🔥 Recuperar lead (reciente)', contenido: 'Hola {{nombre}}! 😊\n\nHace unos días conversamos sobre *{{producto}}*.\n\nQuería retomar el contacto, ¿sigues interesado/a?\n\nTenemos condiciones especiales este mes 🔥\n\n— {{ejecutivo}}' },
  { id: 'lead_frio',             nombre: '❄️ Reactivar lead frío',       contenido: 'Hola {{nombre}} 👋\n\nSoy *{{ejecutivo}}*, hace un tiempo conversamos sobre *{{producto}}*.\n\nSé que el momento no era el ideal entonces. Quería saber si ahora la situación cambió 😊\n\nTenemos novedades que creo te van a interesar 🌟' }
];

export const templates = {
  async getAll() {
    const items = await cursorAll('templates');
    if (items.length === 0) {
      // Primera vez: cargar todas las plantillas por defecto
      const s = tx('templates', 'readwrite');
      await Promise.all(DEFAULT_TEMPLATES.map(t => wrap(s.put(t))));
      return DEFAULT_TEMPLATES;
    }
    // Migración: agregar plantillas nuevas que no existan aún
    const existingIds = new Set(items.map(i => i.id));
    const missing = DEFAULT_TEMPLATES.filter(t => !existingIds.has(t.id));
    if (missing.length > 0) {
      const s = tx('templates', 'readwrite');
      await Promise.all(missing.map(t => wrap(s.put(t))));
      return [...items, ...missing];
    }
    return items;
  },
  update(t) { return wrap(tx('templates', 'readwrite').put(t)); },
  add(t)    { return wrap(tx('templates', 'readwrite').put(t)); }
};

export const config = {
  get(key)         { return wrap(tx('config').get(key)).then(r => r ? r.value : null); },
  set(key, value)  { return wrap(tx('config', 'readwrite').put({ key, value })); }
};
