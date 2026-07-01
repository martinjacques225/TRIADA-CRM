// js/mappers.js — Transformaciones PURAS DB↔UI + guards de enum/errores.
// Extraídas de db.js para poder testearlas en node: db.js importa supabase desde
// el CDN (https://cdn.jsdelivr.net/...), que node no resuelve, así que importar
// db.js en un test rompía. Estas funciones no tocan red ni estado → testeables.
// db.js las importa y reexporta `isMissingTable` para no romper imports externos.

// ─── Helpers ─────────────────────────────────────────────────
export function clean(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

// Detección de errores de Postgres/PostgREST (puras, reciben el error)
export function isMissingTable(err) {
  return err?.code === '42P01' || err?.code === 'PGRST205'
    || /Could not find the table|relation .* does not exist/i.test(err?.message || '');
}
export const isMissingCol = (err) =>
  err?.code === '42703' || /column .* does not exist/i.test(err?.message || '');

// ─── PROSPECTOS → leads ───────────────────────────────────────
const ORIGEN_TO_DB = {
  'Manual': 'manual', 'Landing Web': 'landing', 'Meta Ads': 'meta_ads',
  'Google Ads': 'google_ads', 'WhatsApp': 'whatsapp', 'Referido': 'referido',
};
const ORIGEN_FROM_DB = Object.fromEntries(Object.entries(ORIGEN_TO_DB).map(([k, v]) => [v, k]));
const VALID_ORIGEN = new Set(Object.values(ORIGEN_TO_DB));
// Nunca enviar un valor que el enum `lead_origen` no acepte: rompía el INSERT
// con 22P02 y el guardado fallaba en silencio. Desconocido → 'manual'.
export function toOrigenSlug(v) {
  const slug = ORIGEN_TO_DB[v] || v || 'manual';
  return VALID_ORIGEN.has(slug) ? slug : 'manual';
}

export function leadFromSupa(row) {
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
    fechaCreacion:      row.created_at,
    fechaActualizacion: row.updated_at,
  };
}

export function leadToSupa(data) {
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

// ─── DIAGNÓSTICOS ─────────────────────────────────────────────
// Pilares del Diagnóstico 360 (8). El jsonb `scores` se indexa por estos ids.
const DIAG_KEYS = ['direccion','operacion','tecnologia','ventas','marketing','finanzas','seguridad','oportunidades'];
function _scoresFrom(sc) {
  const out = {};
  DIAG_KEYS.forEach(k => { out[k] = sc[k] || []; });
  return out;
}

export function diagFromSupa(row) {
  if (!row) return null;
  const sc = row.scores || {};
  return {
    id:             row.id,
    correlativo:    row.codigo,
    prospectoId:    row.lead_id,
    scores:         _scoresFrom(sc),
    // Alias retrocompatibles para tarjetas/consumidores antiguos (3 áreas):
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

export function diagToSupa(data) {
  // Shape nuevo: data.scores (objeto por pilar). Fallback al viejo (scoresTec/Ventas/Finanzas).
  const scores = data.scores || {
    tecnologia: data.scoresTec      || [],
    ventas:     data.scoresVentas   || [],
    finanzas:   data.scoresFinanzas || [],
  };
  return clean({
    lead_id:      data.prospectoId,
    scores,
    hallazgos:    data.hallazgos,
    oportunidades: data.oportunidades,
    estado:       data.estado || 'borrador',
    responsable:  data.responsable,
  });
}

// ─── CITAS (reuniones del calendario) ────────────────────────
export function citaFromSupa(row) {
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
    durMin:        row.duracion_min || 60,
    participantes: row.participantes || [],
    recordatorios: row.recordatorios || [],
    recurrencia:   row.recurrencia || 'none',
    fechaCreacion: row.created_at,
  };
}

export function citaToSupaBase(data) {
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

export function citaToSupa(data) {
  return clean({
    ...citaToSupaBase(data),
    duracion_min:  data.durMin,
    participantes: data.participantes,
    recordatorios: data.recordatorios,
    recurrencia:   data.recurrencia,
  });
}

// ─── PROPUESTAS ──────────────────────────────────────────────
export function propFromSupa(row) {
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

export function propToSupa(data) {
  return clean({
    lead_id:  data.prospectoId,
    servicios: data.servicios,
    valor:     data.valor,
    estado:    data.estado || 'borrador',
    vigencia:  data.vigencia,
    notas:     data.notas,
  });
}

// ─── CLIENTES ────────────────────────────────────────────────
export function clienteFromSupa(row) {
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

// La tabla clientes NO tiene nombre/empresa/email/telefono: la razón social
// es el identificador (mandar columnas inexistentes rompía el INSERT con 42703).
export function clienteToSupa(data) {
  return clean({
    lead_id:      data.leadId,
    razon_social: data.razonSocial || data.empresa || data.nombre,
    rut:          data.rut,
    giro:         data.giro,
    direccion:    data.direccion,
    responsable:  data.responsable,
  });
}

// ─── AUTODIAGNÓSTICOS ─────────────────────────────────────────
export function autodiagFromSupa(row) {
  if (!row) return null;
  const sc = row.scores || {};
  return {
    id:           row.id,
    prospectoId:  row.lead_id,
    scores:       _scoresFrom(sc),
    scoresTec:    sc.tecnologia || [],
    scoresVentas: sc.ventas     || [],
    scoresFinanzas: sc.finanzas || [],
    fecha:        row.created_at,
  };
}

// ─── FACTURAS ────────────────────────────────────────────────
export function facturaFromSupa(row) {
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
export function toFactEstado(v) {
  const s = (v || 'pendiente').toString().toLowerCase();
  return VALID_FACT_ESTADO.has(s) ? s : 'pendiente';
}

export function facturaToSupa(data) {
  return clean({
    cliente_id:  data.clienteId,
    monto:       data.monto,
    pagado:      data.pagado,
    estado:      toFactEstado(data.estado),
    emision:     data.emision,
    vencimiento: data.vencimiento,
  });
}

// ─── PRESUPUESTOS ─────────────────────────────────────────────
export function presupFromSupa(row) {
  if (!row) return null;
  return {
    id:           row.id,
    correlativo:  row.codigo,
    clienteId:    row.cliente_id,
    leadId:       row.lead_id,
    propuestaId:  row.propuesta_id,
    servicios:    row.servicios || [],
    manoObra:     row.mano_obra || 0,
    planServicio: row.plan_servicio || '',
    planMensual:  row.plan_mensual || 0,
    neto:         row.neto || 0,
    iva:          row.iva || 0,
    total:        row.total || 0,
    estado:       row.estado || 'borrador',
    vigencia:     row.vigencia,
    notas:        row.notas,
    fecha:        row.created_at,
  };
}

export function presupToSupa(data) {
  return clean({
    cliente_id:    data.clienteId,
    lead_id:       data.leadId,
    propuesta_id:  data.propuestaId,
    servicios:     data.servicios,
    mano_obra:     data.manoObra,
    plan_servicio: data.planServicio,
    plan_mensual:  data.planMensual,
    neto:          data.neto,
    iva:           data.iva,
    total:         data.total,
    estado:        data.estado || 'borrador',
    vigencia:      data.vigencia,
    notas:         data.notas,
  });
}

// ─── BIBLIOTECA DE DOCUMENTOS ─────────────────────────────────
export function docFromSupa(row) {
  if (!row) return null;
  return {
    id:          row.id,
    nombre:      row.nombre,
    descripcion: row.descripcion || '',
    categoria:   row.categoria || 'General',
    storagePath: row.storage_path,
    mimeType:    row.mime_type || '',
    sizeBytes:   row.size_bytes || 0,
    subidoPor:   row.subido_por || null,
    fecha:       row.created_at,
  };
}

// ─── ANÁLISIS FINANCIEROS (Módulo Financiero trIA · M2) ───────
// Guards de enum: mandar un valor fuera del enum rompe el INSERT con 22P02.
const VALID_FIN_TIPO   = new Set(['cierre', 'iva', 'remuneraciones']);
const VALID_FIN_MODO   = new Set(['documentos', 'cifras']);
const VALID_FIN_ESTADO = new Set(['borrador', 'generado', 'analizado']);
export const toFinTipo   = (v) => VALID_FIN_TIPO.has(v)   ? v : 'cierre';
export const toFinModo   = (v) => VALID_FIN_MODO.has(v)   ? v : 'documentos';
export const toFinEstado = (v) => VALID_FIN_ESTADO.has(v) ? v : 'borrador';

export function finFromSupa(row) {
  if (!row) return null;
  return {
    id:                 row.id,
    correlativo:        row.codigo,
    tipo:               row.tipo || 'cierre',
    periodo:            row.periodo || '',
    titulo:             row.titulo || '',
    clienteId:          row.cliente_id || null,
    modoEntrada:        row.modo_entrada || 'documentos',
    contexto:           row.contexto || '',
    cifras:             row.cifras || {},
    documentos:         row.documentos || [],   // [{path,nombre,size,mime}]
    prompt:             row.prompt || '',
    respuestaRaw:       row.respuesta_raw || '',
    reporte:            row.respuesta_json || null, // informe ya parseado (contrato de salida)
    estado:             row.estado || 'borrador',
    creadoPor:          row.created_by || null,
    fecha:              row.created_at,
    fechaActualizacion: row.updated_at,
  };
}

// Solo columnas reales; clean() quita undefined (permite updates parciales). Los
// enums se blindan solo si vienen definidos (si no, se dejan al default de la tabla).
export function finToSupa(data) {
  return clean({
    tipo:           data.tipo        !== undefined ? toFinTipo(data.tipo)        : undefined,
    periodo:        data.periodo,
    titulo:         data.titulo,
    cliente_id:     data.clienteId,
    modo_entrada:   data.modoEntrada !== undefined ? toFinModo(data.modoEntrada) : undefined,
    contexto:       data.contexto,
    cifras:         data.cifras,
    documentos:     data.documentos,
    prompt:         data.prompt,
    respuesta_raw:  data.respuestaRaw,
    respuesta_json: data.reporte,
    estado:         data.estado      !== undefined ? toFinEstado(data.estado)    : undefined,
  });
}
