// modules/oportunidades/domain/sincronizacion.js — IDEMPOTENCIA Y DUPLICADOS (lógica pura).
//
// Preparado para la Fase 2 (API oficial de Mercado Público) y usado YA en la
// Fase 1 por el importador manual: pegar dos veces el mismo proceso no debe
// crear dos filas.
//
// La regla de oro de la fusión: los datos OFICIALES (título, fechas, monto,
// institución) se refrescan desde la fuente; los datos INTERNOS (estado,
// puntaje, responsable, notas, tiempo invertido) NO se tocan jamás. Una
// sincronización nunca puede borrar el trabajo de análisis del equipo.

/** Clave única de un proceso: fuente + código oficial. Sin código no hay clave. */
export function claveExterna(op) {
  const cod = String(op?.codigoExterno ?? '').trim().toUpperCase();
  if (!cod) return null;
  return `${op?.fuente || 'manual'}::${cod}`;
}

/** Índice { clave → oportunidad } de lo que ya está en el CRM. */
export function indexar(existentes = []) {
  const idx = new Map();
  existentes.forEach((o) => {
    const k = claveExterna(o);
    if (k && !idx.has(k)) idx.set(k, o);
  });
  return idx;
}

/** Campos que vienen de la fuente oficial y se pueden refrescar sin miedo. */
const CAMPOS_OFICIALES = [
  'titulo', 'institucion', 'tipoProcedimiento', 'descripcion', 'fechaPublicacion',
  'fechaCierre', 'region', 'modalidad', 'presupuestoMonto', 'presupuestoIva',
  'unspsc', 'enlace',
];

/**
 * Fusiona un registro entrante sobre uno existente.
 * Devuelve { cambios, patch }: `patch` solo trae lo que efectivamente cambió
 * (si no cambió nada, no se manda un UPDATE inútil a Supabase).
 */
export function fusionar(existente, entrante) {
  const patch = {};
  CAMPOS_OFICIALES.forEach((k) => {
    const nuevo = entrante?.[k];
    if (nuevo === undefined || nuevo === null || nuevo === '') return;
    const viejo = existente?.[k];
    const distinto = Array.isArray(nuevo) || Array.isArray(viejo)
      ? JSON.stringify(nuevo || []) !== JSON.stringify(viejo || [])
      : String(nuevo) !== String(viejo ?? '');
    if (distinto) patch[k] = nuevo;
  });
  if (entrante?.datosApi !== undefined) patch.datosApi = entrante.datosApi;
  return { cambios: Object.keys(patch).length, patch };
}

/**
 * Clasifica un lote entrante contra lo que ya existe.
 * @returns {{nuevas: Array, actualizadas: Array, sinCambios: Array, ignoradas: Array}}
 *   - ignoradas: entrantes sin código oficial (no se pueden deduplicar).
 */
export function clasificar(entrantes = [], existentes = []) {
  const idx = indexar(existentes);
  const vistos = new Set();
  const res = { nuevas: [], actualizadas: [], sinCambios: [], ignoradas: [] };

  entrantes.forEach((e) => {
    const k = claveExterna(e);
    if (!k) { res.ignoradas.push(e); return; }
    if (vistos.has(k)) { res.sinCambios.push({ entrante: e, motivo: 'duplicado en el mismo lote' }); return; }
    vistos.add(k);

    const prev = idx.get(k);
    if (!prev) { res.nuevas.push(e); return; }

    const { cambios, patch } = fusionar(prev, e);
    if (cambios) res.actualizadas.push({ id: prev.id, patch, entrante: e });
    else res.sinCambios.push({ id: prev.id, entrante: e, motivo: 'sin cambios' });
  });

  return res;
}

/** Resumen para la bitácora de sincronización (op_sync_logs). */
export function resumenSync(clasificacion) {
  const c = clasificacion || {};
  return {
    encontradas: (c.nuevas?.length || 0) + (c.actualizadas?.length || 0) + (c.sinCambios?.length || 0),
    nuevas: c.nuevas?.length || 0,
    actualizadas: c.actualizadas?.length || 0,
    errores: c.ignoradas?.length || 0,
  };
}

/**
 * Extrae el código oficial de un enlace de Mercado Público pegado a mano.
 * Los IDs tienen forma 1234-56-LE26 / 5678-9-COT25. Si no calza, devuelve null
 * (no se inventa un código: se le pide a la persona que lo escriba).
 */
export function codigoDesdeEnlace(url) {
  const m = String(url || '').match(/(\d{3,7}-\d{1,4}-[A-Z]{2}\d{2})/i);
  return m ? m[1].toUpperCase() : null;
}
