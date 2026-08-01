// js/mappers.js — Transformaciones PURAS DB↔UI + guards de enum/errores.
// Extraídas de db.js para poder testearlas en node: db.js importa supabase desde
// el CDN (https://cdn.jsdelivr.net/...), que node no resuelve, así que importar
// db.js en un test rompía. Estas funciones no tocan red ni estado → testeables.
// db.js las importa y reexporta `isMissingTable` para no romper imports externos.

import { normalizeText, normalizeEmail, formatRut, formatPhoneCL } from './format.js';

// ─── Helpers ─────────────────────────────────────────────────
export function clean(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

// ─── Normalización de entrada (última línea de defensa) ──────
// La UI ya formatea mientras se escribe, pero TODO lo que se escribe en Supabase
// pasa por acá: escritorio, PWA móvil, carga masiva y cualquier camino futuro.
// Así "sin importar cómo se ingrese" el dato queda canónico (ver js/format.js).
// Respetan undefined (no se manda la columna) y null (borrar el dato): solo
// transforman cuando hay texto.
const _txt  = (v) => (typeof v === 'string' ? normalizeText(v)  : v);
const _rut  = (v) => (typeof v === 'string' ? formatRut(v)      : v);
const _tel  = (v) => (typeof v === 'string' ? formatPhoneCL(v)  : v);
const _mail = (v) => (typeof v === 'string' ? normalizeEmail(v) : v);

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
    // Dirección de terreno (para "Cómo llegar" con Google Maps/Waze). Ver js/geo.js.
    direccion:          row.direccion,
    comuna:             row.comuna,
    facturacionEst:     row.facturacion_est,
    dolorPrincipal:     row.dolor_principal,
    origen:             ORIGEN_FROM_DB[row.origen] || row.origen,
    origenDetalle:      row.origen_detalle,
    estado:             row.estado,
    scoring:            row.scoring,
    responsable:        row.responsable,
    notas:              row.notas,
    fechaCreacion:      row.created_at,
    fechaActualizacion: row.updated_at,
  };
}

// ─── Atribución del Experience Center (leads.origen_detalle) ─
// La landing manda por el RPC crear_lead_landing v2 la página/demo exacta de
// origen: 'home' | 'servicios' | 'experiencias' | 'diagnostico' | 'demo-<slug>'.
// Solo lectura en el CRM (la escribe el RPC; leadToSupa no la manda).
// Nota cruzada anti-deriva: los nombres salen del catálogo del Experience Center
// (triada-home/inc/experiencias-data.php) — si se suma una demo allá, sumarla acá
// (una demo desconocida NO rompe: cae al slug legible).
const DEMO_NOMBRES = {
  recorrido:    'El CRM en acción',
  conserje:     'Conserje IA',
  fugas:        'Detección de Fugas',
  gemelo:       'Gemelo Virtual',
  auditor:      'Auditor de Imagen',
  remodela:     'Simulador de Remodelación',
  documentos:   'Generador de Documentos',
  academia:     'Academia Online',
  tienda:       'Tienda Online',
  inventario:   'Control de Inventario',
  encuestas:    'Encuestas',
  proyectos:    'Gestión de Proyectos',
  analizador:   'Analizador Comercial',
  documental:   'Centro Documental',
  contratacion: 'Contratación Inteligente',
  compras:      'Gestión de Compras',
  pedidos:      'Pedidos Online',
  restaurant:   'CRM de Restaurantes',
  barberia:     'Barbería Triada',
  diagnostico:  'Diagnóstico Digital Rápido',
};

/** 'demo-conserje' → 'Demo · Conserje IA' · 'diagnostico' → 'Diagnóstico web'
    · 'home'/'servicios'/'experiencias' → 'Web · <página>' · vacío → ''. */
export function origenDetalleLabel(v) {
  const s = (v || '').toString().trim();
  if (s === '') return '';
  if (s === 'diagnostico') return 'Diagnóstico web';
  if (s.startsWith('demo-')) {
    const slug = s.slice(5);
    return 'Demo · ' + (DEMO_NOMBRES[slug] || slug);
  }
  return 'Web · ' + s;
}

/** true si el lead vino de una demo del Experience Center. */
export function esLeadDeDemo(v) {
  return ((v || '').toString()).startsWith('demo-');
}

export function leadToSupa(data) {
  return clean({
    nombre:          _txt(data.nombre),
    empresa:         _txt(data.empresa),
    rut:             _rut(data.rut),
    email:           _mail(data.email),
    telefono:        _tel(data.telefono),
    // giro/tamano/dolor_principal/origen/estado son CATÁLOGOS (<select>): van
    // literales. Pasarlos a mayúsculas rompería el pipeline y los filtros.
    giro:            data.rubro,
    tamano:          data.tamano,
    region:          _txt(data.region),
    direccion:       _txt(data.direccion),
    comuna:          _txt(data.comuna),
    facturacion_est: data.facturacionEst,
    dolor_principal: data.dolorPrincipal,
    // origen/estado NO llevan default acá: los pone `prospectos.add` (alta).
    // Ponerlos en el mapper los colaba en TODO update parcial — guardar solo la
    // dirección desde el móvil devolvía el lead a 'Nuevo' y su origen a 'manual',
    // en silencio. La regla del mapper es la misma que el resto de los campos:
    // undefined = no mandar la columna. Ver tests/db.mappers.test.js.
    origen:          data.origen === undefined ? undefined : toOrigenSlug(data.origen),
    estado:          data.estado,
    scoring:         data.scoring,
    responsable:     data.responsable,
    notas:           _txt(data.notas),
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
    razon_social: _txt(data.razonSocial || data.empresa || data.nombre),
    rut:          _rut(data.rut),
    giro:         _txt(data.giro),
    direccion:    _txt(data.direccion),
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

// ─── ERP · PROYECTOS (extiende el espinazo del M5 con campos operativos) ──────
export function proyectoFromSupa(row) {
  if (!row) return null;
  return {
    id:               row.id,
    correlativo:      row.codigo,
    nombre:           row.nombre,
    descripcion:      row.descripcion,
    objetivo:         row.objetivo,
    estado:           row.estado,
    prioridad:        row.prioridad,
    area:             row.area,
    clienteId:        row.cliente_id,
    responsable:      row.responsable,
    tipo:             row.tipo,
    tarifa:           row.tarifa,
    presupuestoHoras: row.presupuesto_horas,
    presupuestoMonto: row.presupuesto_monto,
    facturable:       row.facturable,
    progreso:         row.progreso,
    fechaInicio:      row.fecha_inicio,
    fechaObjetivo:    row.fecha_objetivo,
    fecha:            row.created_at,
  };
}

// Solo columnas del ERP (no toca campos que gestiona el AI Commander salvo los
// operativos). clean() quita undefined → updates parciales seguros. `estado`/`prioridad`
// se omiten si no vienen (la tabla tiene default 'activo'/'media').
export function proyectoToSupa(data) {
  return clean({
    nombre:            data.nombre,
    descripcion:       data.descripcion,
    objetivo:          data.objetivo,
    estado:            data.estado,
    prioridad:         data.prioridad,
    area:              data.area,
    cliente_id:        data.clienteId,
    tipo:              data.tipo,
    tarifa:            data.tarifa,
    presupuesto_horas: data.presupuestoHoras,
    presupuesto_monto: data.presupuestoMonto,
    facturable:        data.facturable,
    fecha_inicio:      data.fechaInicio,
    fecha_objetivo:    data.fechaObjetivo,
  });
}

// ─── ERP · HORAS (timesheet) ──────────────────────────────────
export function horaFromSupa(row) {
  if (!row) return null;
  return {
    id:            row.id,
    correlativo:   row.codigo,
    proyectoId:    row.proyecto_id,
    tareaId:       row.tarea_id,
    profileId:     row.profile_id,
    fecha:         row.fecha,
    horas:         Number(row.horas) || 0,
    facturable:    row.facturable,
    nota:          row.nota,
    fechaCreacion: row.created_at,
  };
}

export function horaToSupa(data) {
  return clean({
    proyecto_id: data.proyectoId,
    tarea_id:    data.tareaId,
    profile_id:  data.profileId,
    fecha:       data.fecha,
    horas:       data.horas,
    facturable:  data.facturable,
    nota:        data.nota,
  });
}

// ─── ERP · GASTOS (cuentas por pagar, confidencial) ───────────
const VALID_GASTO_ESTADO = new Set(['pendiente', 'pagado']);
export const toGastoEstado = (v) => VALID_GASTO_ESTADO.has((v || '').toString()) ? v : 'pendiente';

export function gastoFromSupa(row) {
  if (!row) return null;
  return {
    id:            row.id,
    correlativo:   row.codigo,
    proyectoId:    row.proyecto_id,
    proveedorId:   row.proveedor_id,
    categoria:     row.categoria,
    descripcion:   row.descripcion,
    neto:          Number(row.neto)  || 0,
    iva:           Number(row.iva)   || 0,
    total:         Number(row.total) || 0,
    estado:        row.estado,
    fecha:         row.fecha,
    vencimiento:   row.vencimiento,
    docId:         row.doc_id,
    fechaCreacion: row.created_at,
  };
}

export function gastoToSupa(data) {
  return clean({
    proyecto_id:  data.proyectoId,
    proveedor_id: data.proveedorId,
    categoria:   data.categoria,
    descripcion: data.descripcion,
    neto:        data.neto,
    iva:         data.iva,
    total:       data.total,
    estado:      data.estado !== undefined ? toGastoEstado(data.estado) : undefined,
    fecha:       data.fecha,
    vencimiento: data.vencimiento,
    doc_id:      data.docId,
  });
}

// ─── ERP · MOVIMIENTOS (caja real · confidencial) ─────────────
const VALID_MOV_TIPO = new Set(['ingreso', 'egreso']);
export const toMovTipo = (v) => VALID_MOV_TIPO.has((v || '').toString()) ? v : 'ingreso';

export function movimientoFromSupa(row) {
  if (!row) return null;
  return {
    id:            row.id,
    correlativo:   row.codigo,
    tipo:          row.tipo,
    fechaReal:     row.fecha_real,
    monto:         Number(row.monto) || 0,
    medio:         row.medio,
    descripcion:   row.descripcion,
    proyectoId:    row.proyecto_id,
    facturaId:     row.factura_id,
    gastoId:       row.gasto_id,
    fechaCreacion: row.created_at,
  };
}

export function movimientoToSupa(data) {
  return clean({
    tipo:        data.tipo !== undefined ? toMovTipo(data.tipo) : undefined,
    fecha_real:  data.fechaReal,
    monto:       data.monto,
    medio:       data.medio,
    descripcion: data.descripcion,
    proyecto_id: data.proyectoId,
    factura_id:  data.facturaId,
    gasto_id:    data.gastoId,
  });
}

// ─── ERP · PARÁMETROS TRIBUTARIOS (UF/UTM/topes · finanzas) ───
export function paramTribFromSupa(row) {
  if (!row) return null;
  return {
    id:                 row.id,
    periodo:            row.periodo,
    uf:                 row.uf,
    utm:                row.utm,
    imm:                row.imm,
    topeImponible:      row.tope_imponible,
    topeGratificacion:  row.tope_gratificacion,
    pctPpm:             row.pct_ppm,
    pctRetencion:       row.pct_retencion,
    fecha:              row.created_at,
    fechaActualizacion: row.updated_at,
  };
}

export function paramTribToSupa(data) {
  return clean({
    periodo:            data.periodo,
    uf:                 data.uf,
    utm:                data.utm,
    imm:                data.imm,
    tope_imponible:     data.topeImponible,
    tope_gratificacion: data.topeGratificacion,
    pct_ppm:            data.pctPpm,
    pct_retencion:      data.pctRetencion,
  });
}

// ─── ERP · PROVEEDORES (confidencial · finanzas) ──────────────
export function proveedorFromSupa(row) {
  if (!row) return null;
  return {
    id:          row.id,
    correlativo: row.codigo,
    nombre:      row.nombre,
    rut:         row.rut,
    contacto:    row.contacto,
    email:       row.email,
    telefono:    row.telefono,
    notas:       row.notas,
    activo:      row.activo,
    fecha:       row.created_at,
  };
}

export function proveedorToSupa(data) {
  return clean({
    nombre:   data.nombre,
    rut:      data.rut,
    contacto: data.contacto,
    email:    data.email,
    telefono: data.telefono,
    notas:    data.notas,
    activo:   data.activo,
  });
}

// ─── ERP · ÓRDENES DE COMPRA (confidencial · finanzas) ────────
const VALID_OC_ESTADO = new Set(['borrador', 'emitida', 'recepcionada', 'anulada']);
export const toOcEstado = (v) => VALID_OC_ESTADO.has((v || '').toString()) ? v : 'borrador';

export function ocFromSupa(row) {
  if (!row) return null;
  return {
    id:            row.id,
    correlativo:   row.codigo,
    proveedorId:   row.proveedor_id,
    proyectoId:    row.proyecto_id,
    lineas:        row.lineas || [],
    neto:          Number(row.neto)  || 0,
    iva:           Number(row.iva)   || 0,
    total:         Number(row.total) || 0,
    estado:        row.estado,
    fecha:         row.fecha,
    fechaEntrega:  row.fecha_entrega,
    notas:         row.notas,
    gastoId:       row.gasto_id,
    docId:         row.doc_id,
    fechaCreacion: row.created_at,
  };
}

export function ocToSupa(data) {
  return clean({
    proveedor_id:  data.proveedorId,
    proyecto_id:   data.proyectoId,
    lineas:        data.lineas,
    neto:          data.neto,
    iva:           data.iva,
    total:         data.total,
    estado:        data.estado !== undefined ? toOcEstado(data.estado) : undefined,
    fecha:         data.fecha,
    fecha_entrega: data.fechaEntrega,
    notas:         data.notas,
    gasto_id:      data.gastoId,
    doc_id:        data.docId,
  });
}

// ─── ERP · ACTIVOS / LICENCIAS (confidencial · finanzas) ──────
export function activoFromSupa(row) {
  if (!row) return null;
  return {
    id:              row.id,
    correlativo:     row.codigo,
    nombre:          row.nombre,
    tipo:            row.tipo,
    costoMensual:    Number(row.costo_mensual) || 0,
    fechaRenovacion: row.fecha_renovacion,
    estado:          row.estado,
    notas:           row.notas,
    fecha:           row.created_at,
  };
}

export function activoToSupa(data) {
  return clean({
    nombre:           data.nombre,
    tipo:             data.tipo,
    costo_mensual:    data.costoMensual,
    fecha_renovacion: data.fechaRenovacion,
    estado:           data.estado,
    notas:            data.notas,
  });
}

// ─── ERP · NÓMINA (F4 · confidencial · schema `erp`, solo por RPC) ────────────
// Las lecturas vienen de la forma que devuelven los RPC (listar_empleados /
// listar_nomina), no de la tabla cruda. Las escrituras arman los parámetros
// posicionales `p_*` del RPC — SIN clean(): los RPC no tienen defaults, hay que
// mandar todos los argumentos (con null explícito).
export function empleadoFromSupa(row) {
  if (!row) return null;
  return {
    id:               row.id,
    correlativo:      row.codigo,
    nombre:           row.nombre,
    rut:              row.rut,
    cargo:            row.cargo,
    cuentaBancaria:   row.cuenta_bancaria,
    direccion:        row.direccion,
    fechaIngreso:     row.fecha_ingreso,
    costoEmpresaBase: Number(row.costo_empresa_base) || 0,
    activo:           row.activo,
    profileId:        row.profile_id,
  };
}

export function empleadoToRpc(data) {
  return {
    p_id:                 data.id || null,
    p_nombre:             data.nombre,
    p_rut:                data.rut || null,
    p_cargo:              data.cargo || null,
    p_cuenta_bancaria:    data.cuentaBancaria || null,
    p_direccion:          data.direccion || null,
    p_fecha_ingreso:      data.fechaIngreso || null,
    p_costo_empresa_base: Number(data.costoEmpresaBase) || 0,
    p_activo:             data.activo == null ? true : !!data.activo,
    p_profile_id:         data.profileId || null,
    p_notas:              data.notas || null,
  };
}

export function remuneracionFromSupa(row) {
  if (!row) return null;
  return {
    id:             row.id,
    correlativo:    row.codigo,
    empleadoId:     row.empleado_id,
    empleadoNombre: row.empleado_nombre,
    periodo:        row.periodo,
    imponible:      Number(row.imponible) || 0,
    liquido:        Number(row.liquido) || 0,
    costoEmpresa:   Number(row.costo_empresa) || 0,
    pdfPath:        row.pdf_path,
    notas:          row.notas,
  };
}

export function remuneracionToRpc(data) {
  return {
    p_id:            data.id || null,
    p_empleado_id:   data.empleadoId,
    p_periodo:       data.periodo,
    p_imponible:     Number(data.imponible) || 0,
    p_liquido:       Number(data.liquido) || 0,
    p_costo_empresa: Number(data.costoEmpresa) || 0,
    p_pdf_path:      data.pdfPath || null,
    p_notas:         data.notas || null,
  };
}

// ═════════════════════════════════════════════════════════════
// OPORTUNIDADES PÚBLICAS (Mercado Público / Compra Ágil)
// Requiere supabase/oportunidades_f1.sql. Snake_case en la DB, camelCase en el
// dominio: las funciones puras de modules/oportunidades/domain/* NUNCA ven una
// columna de Postgres, y por eso se pueden testear en node sin Supabase.
// ═════════════════════════════════════════════════════════════

const _arr = (v) => (Array.isArray(v) ? v : []);
const _n   = (v) => (v === null || v === undefined || v === '' ? null : Number(v));

export function opFromSupa(row) {
  if (!row) return null;
  return {
    id:                row.id,
    fuente:            row.fuente || 'manual',
    codigoExterno:     row.codigo_externo || '',
    titulo:            row.titulo || '',
    institucion:       row.institucion || '',
    tipoProcedimiento: row.tipo_procedimiento || '',
    descripcion:       row.descripcion || '',
    fechaPublicacion:  row.fecha_publicacion,
    fechaCierre:       row.fecha_cierre,
    region:            row.region || '',
    modalidad:         row.modalidad || '',
    presupuestoMonto:  _n(row.presupuesto_monto),
    presupuestoIva:    row.presupuesto_iva || 'desconocido',
    unspsc:            _arr(row.unspsc),
    enlace:            row.enlace || '',
    estado:            row.estado || 'detectada',
    puntaje:           _n(row.puntaje),
    recomendacion:     row.recomendacion || null,
    servicioSlug:      row.servicio_slug || '',
    responsable:       row.responsable || null,
    tiempoInvertidoMin: Number(row.tiempo_invertido_min) || 0,
    motivoDescarte:    row.motivo_descarte || '',
    motivoReapertura:  row.motivo_reapertura || '',
    notas:             row.notas || '',
    datosApi:          row.datos_api || null,
    sincronizadoAt:    row.sincronizado_at,
    creadoPor:         row.creado_por,
    createdAt:         row.created_at,
    updatedAt:         row.updated_at,
  };
}

export function opToSupa(d) {
  return clean({
    fuente:             d.fuente,
    codigo_externo:     d.codigoExterno === '' ? null : d.codigoExterno,
    titulo:             typeof d.titulo === 'string' ? d.titulo.trim() : d.titulo,
    institucion:        d.institucion,
    tipo_procedimiento: d.tipoProcedimiento === '' ? null : d.tipoProcedimiento,
    descripcion:        d.descripcion,
    fecha_publicacion:  d.fechaPublicacion === '' ? null : d.fechaPublicacion,
    fecha_cierre:       d.fechaCierre === '' ? null : d.fechaCierre,
    region:             d.region,
    modalidad:          d.modalidad === '' ? null : d.modalidad,
    presupuesto_monto:  d.presupuestoMonto === '' ? null : d.presupuestoMonto,
    presupuesto_iva:    d.presupuestoIva,
    unspsc:             d.unspsc,
    enlace:             d.enlace,
    estado:             d.estado,
    puntaje:            d.puntaje === '' ? null : d.puntaje,
    recomendacion:      d.recomendacion,
    servicio_slug:      d.servicioSlug,
    responsable:        d.responsable === '' ? null : d.responsable,
    tiempo_invertido_min: d.tiempoInvertidoMin,
    motivo_descarte:    d.motivoDescarte,
    motivo_reapertura:  d.motivoReapertura,
    notas:              d.notas,
    datos_api:          d.datosApi,
    sincronizado_at:    d.sincronizadoAt,
  });
}

export function opDocFromSupa(row) {
  if (!row) return null;
  return {
    id: row.id, oportunidadId: row.oportunidad_id, nombre: row.nombre,
    categoria: row.categoria || 'bases', storagePath: row.storage_path,
    mime: row.mime, bytes: Number(row.bytes) || 0, origen: row.origen || 'adjunto',
    enlace: row.enlace || '', analizadoAt: row.analizado_at, extraccion: row.extraccion || null,
    subidoPor: row.subido_por, createdAt: row.created_at,
  };
}
export function opDocToSupa(d) {
  return clean({
    oportunidad_id: d.oportunidadId, nombre: d.nombre, categoria: d.categoria,
    storage_path: d.storagePath, mime: d.mime, bytes: d.bytes, origen: d.origen,
    enlace: d.enlace, analizado_at: d.analizadoAt, extraccion: d.extraccion,
  });
}

export function opReqFromSupa(row) {
  if (!row) return null;
  return {
    id: row.id, oportunidadId: row.oportunidad_id, tipo: row.tipo || 'otro',
    texto: row.texto || '', obligatorio: !!row.obligatorio, documentoId: row.documento_id,
    fuenteSeccion: row.fuente_seccion || '', confianza: _n(row.confianza),
    origen: row.origen || 'manual', cumple: row.cumple || 'no_evaluado',
    evidencia: row.evidencia || '', confirmadoPor: row.confirmado_por,
    confirmadoAt: row.confirmado_at, createdAt: row.created_at,
  };
}
export function opReqToSupa(d) {
  return clean({
    oportunidad_id: d.oportunidadId, tipo: d.tipo, texto: d.texto,
    obligatorio: d.obligatorio, documento_id: d.documentoId === '' ? null : d.documentoId,
    fuente_seccion: d.fuenteSeccion, confianza: d.confianza, origen: d.origen,
    cumple: d.cumple, evidencia: d.evidencia,
    confirmado_por: d.confirmadoPor, confirmado_at: d.confirmadoAt,
  });
}

export function opPuntajeFromSupa(row) {
  if (!row) return null;
  return {
    id: row.id, oportunidadId: row.oportunidad_id, criterio: row.criterio,
    puntos: Number(row.puntos) || 0, puntosMax: Number(row.puntos_max) || 0,
    sugerido: _n(row.sugerido), justificacion: row.justificacion || '',
    datos: row.datos || null, manual: !!row.manual, motivoManual: row.motivo_manual || '',
    confirmadoPor: row.confirmado_por, confirmadoAt: row.confirmado_at,
  };
}
export function opPuntajeToSupa(d) {
  return clean({
    oportunidad_id: d.oportunidadId, criterio: d.criterio, puntos: d.puntos,
    puntos_max: d.puntosMax, sugerido: d.sugerido, justificacion: d.justificacion,
    datos: d.datos, manual: d.manual, motivo_manual: d.motivoManual,
    confirmado_por: d.confirmadoPor, confirmado_at: d.confirmadoAt,
  });
}

export function opRiesgoFromSupa(row) {
  if (!row) return null;
  return {
    id: row.id, oportunidadId: row.oportunidad_id, causal: row.causal || '',
    descripcion: row.descripcion || '', nivel: row.nivel || 'medio',
    esCausal: !!row.es_causal, origen: row.origen || 'manual',
    mitigacion: row.mitigacion || '', createdAt: row.created_at,
  };
}
export function opRiesgoToSupa(d) {
  return clean({
    oportunidad_id: d.oportunidadId, causal: d.causal === '' ? null : d.causal,
    descripcion: d.descripcion, nivel: d.nivel, es_causal: d.esCausal,
    origen: d.origen, mitigacion: d.mitigacion,
  });
}

export function opCostoFromSupa(row) {
  if (!row) return null;
  return {
    id: row.id, oportunidadId: row.oportunidad_id,
    margenObjetivo: Number(row.margen_objetivo) || 0,
    contingenciaPct: Number(row.contingencia_pct) || 0,
    costosAdminPct: Number(row.costos_admin_pct) || 0,
    presupuestoComprador: _n(row.presupuesto_comprador),
    ivaTasa: Number(row.iva_tasa) || 0.19,
    diasPagoEstimados: Number(row.dias_pago_estimados) || 30,
    precioOfertado: _n(row.precio_ofertado),
    notas: row.notas || '', updatedAt: row.updated_at,
  };
}
export function opCostoToSupa(d) {
  return clean({
    oportunidad_id: d.oportunidadId, margen_objetivo: d.margenObjetivo,
    contingencia_pct: d.contingenciaPct, costos_admin_pct: d.costosAdminPct,
    presupuesto_comprador: d.presupuestoComprador === '' ? null : d.presupuestoComprador,
    iva_tasa: d.ivaTasa, dias_pago_estimados: d.diasPagoEstimados,
    precio_ofertado: d.precioOfertado === '' ? null : d.precioOfertado, notas: d.notas,
  });
}

export function opItemFromSupa(row) {
  if (!row) return null;
  return {
    id: row.id, costoId: row.costo_id, tipo: row.tipo || 'hora',
    descripcion: row.descripcion || '', profileId: row.profile_id, rol: row.rol || '',
    horas: _n(row.horas), valorHora: _n(row.valor_hora), monto: _n(row.monto),
    diasAntesPago: Number(row.dias_antes_pago) || 0, orden: Number(row.orden) || 0,
  };
}
export function opItemToSupa(d) {
  return clean({
    costo_id: d.costoId, tipo: d.tipo, descripcion: d.descripcion,
    profile_id: d.profileId === '' ? null : d.profileId, rol: d.rol,
    horas: d.horas === '' ? null : d.horas, valor_hora: d.valorHora === '' ? null : d.valorHora,
    monto: d.monto === '' ? null : d.monto, dias_antes_pago: d.diasAntesPago, orden: d.orden,
  });
}

export function opAprobFromSupa(row) {
  if (!row) return null;
  return {
    id: row.id, oportunidadId: row.oportunidad_id, area: row.area, decision: row.decision,
    comentario: row.comentario || '', condiciones: row.condiciones || '',
    checklist: row.checklist || {}, aprobadoPor: row.aprobado_por, createdAt: row.created_at,
  };
}
export function opAprobToSupa(d) {
  return clean({
    oportunidad_id: d.oportunidadId, area: d.area, decision: d.decision,
    comentario: d.comentario, condiciones: d.condiciones, checklist: d.checklist,
  });
}

export function opPlantillaFromSupa(row) {
  if (!row) return null;
  return {
    id: row.id, slug: row.slug, nombre: row.nombre, descripcion: row.descripcion || '',
    alcance: row.alcance || '', exclusiones: row.exclusiones || '', metodologia: row.metodologia || '',
    entregables: _arr(row.entregables), duracionSemanasMin: _n(row.duracion_semanas_min),
    duracionSemanasMax: _n(row.duracion_semanas_max), hitos: _arr(row.hitos),
    horasPorRol: _arr(row.horas_por_rol), costosHabituales: _arr(row.costos_habituales),
    precioMinimo: _n(row.precio_minimo), margenEsperado: _n(row.margen_esperado),
    riesgos: _arr(row.riesgos), equipo: _arr(row.equipo), documentos: _arr(row.documentos),
    experiencias: _arr(row.experiencias), gantt: _arr(row.gantt), textoOferta: row.texto_oferta || '',
    unspsc: _arr(row.unspsc), activo: row.activo !== false, esDemo: !!row.es_demo,
  };
}
export function opPlantillaToSupa(d) {
  return clean({
    slug: d.slug, nombre: d.nombre, descripcion: d.descripcion, alcance: d.alcance,
    exclusiones: d.exclusiones, metodologia: d.metodologia, entregables: d.entregables,
    duracion_semanas_min: d.duracionSemanasMin, duracion_semanas_max: d.duracionSemanasMax,
    hitos: d.hitos, horas_por_rol: d.horasPorRol, costos_habituales: d.costosHabituales,
    precio_minimo: d.precioMinimo, margen_esperado: d.margenEsperado, riesgos: d.riesgos,
    equipo: d.equipo, documentos: d.documentos, experiencias: d.experiencias, gantt: d.gantt,
    texto_oferta: d.textoOferta, unspsc: d.unspsc, activo: d.activo, es_demo: d.esDemo,
  });
}

export function opOfertaFromSupa(row) {
  if (!row) return null;
  return {
    id: row.id, oportunidadId: row.oportunidad_id, version: Number(row.version) || 1,
    estado: row.estado || 'preparacion', plantillaSlug: row.plantilla_slug || '',
    resumen: row.resumen || '', precioNeto: _n(row.precio_neto), iva: _n(row.iva),
    precioTotal: _n(row.precio_total), notas: row.notas || '', presentadaAt: row.presentada_at,
    creadoPor: row.creado_por, createdAt: row.created_at,
  };
}
export function opOfertaToSupa(d) {
  return clean({
    oportunidad_id: d.oportunidadId, version: d.version, estado: d.estado,
    plantilla_slug: d.plantillaSlug, resumen: d.resumen, precio_neto: d.precioNeto,
    iva: d.iva, precio_total: d.precioTotal, notas: d.notas, presentada_at: d.presentadaAt,
  });
}

export function opOfertaDocFromSupa(row) {
  if (!row) return null;
  return {
    id: row.id, ofertaId: row.oferta_id, tipo: row.tipo, nombre: row.nombre,
    obligatorio: !!row.obligatorio, estado: row.estado || 'pendiente',
    proveedorDocId: row.proveedor_doc_id, storagePath: row.storage_path,
    orden: Number(row.orden) || 0,
  };
}
export function opOfertaDocToSupa(d) {
  return clean({
    oferta_id: d.ofertaId, tipo: d.tipo, nombre: d.nombre, obligatorio: d.obligatorio,
    estado: d.estado, proveedor_doc_id: d.proveedorDocId === '' ? null : d.proveedorDocId,
    storage_path: d.storagePath, orden: d.orden,
  });
}

export function opActFromSupa(row) {
  if (!row) return null;
  return {
    id: row.id, oportunidadId: row.oportunidad_id, accion: row.accion,
    estadoAnterior: row.estado_anterior, estadoNuevo: row.estado_nuevo,
    comentario: row.comentario || '', usuario: row.usuario, createdAt: row.created_at,
  };
}
export function opActToSupa(d) {
  return clean({
    oportunidad_id: d.oportunidadId, accion: d.accion, estado_anterior: d.estadoAnterior,
    estado_nuevo: d.estadoNuevo, comentario: d.comentario,
  });
}

export function opResultadoFromSupa(row) {
  if (!row) return null;
  return {
    id: row.id, oportunidadId: row.oportunidad_id,
    adjudicada: row.adjudicada, fechaResultado: row.fecha_resultado,
    montoAdjudicado: _n(row.monto_adjudicado), proveedorGanador: row.proveedor_ganador || '',
    precioGanador: _n(row.precio_ganador), motivoPerdida: row.motivo_perdida || '',
    ocNumero: row.oc_numero || '', ocFecha: row.oc_fecha, ocMonto: _n(row.oc_monto),
    ocCoincide: row.oc_coincide, ocObservacion: row.oc_observacion || '', ocAceptada: !!row.oc_aceptada,
    proyectoId: row.proyecto_id, actaInicioAt: row.acta_inicio_at,
    recepcionConformeAt: row.recepcion_conforme_at,
    facturaNumero: row.factura_numero || '', facturaMonto: _n(row.factura_monto),
    facturaFecha: row.factura_fecha, pagoEsperado: row.pago_esperado, pagoReal: row.pago_real,
    certificadoEstado: row.certificado_estado || 'no_solicitado',
    certificadoSolicitadoAt: row.certificado_solicitado_at,
    certificadoObtenidoAt: row.certificado_obtenido_at, certificadoPath: row.certificado_path,
    utilidadReal: _n(row.utilidad_real), horasReales: _n(row.horas_reales),
    aprendizaje: row.aprendizaje || '',
  };
}
export function opResultadoToSupa(d) {
  return clean({
    oportunidad_id: d.oportunidadId, adjudicada: d.adjudicada,
    fecha_resultado: d.fechaResultado === '' ? null : d.fechaResultado,
    monto_adjudicado: d.montoAdjudicado === '' ? null : d.montoAdjudicado,
    proveedor_ganador: d.proveedorGanador, precio_ganador: d.precioGanador === '' ? null : d.precioGanador,
    motivo_perdida: d.motivoPerdida, oc_numero: d.ocNumero, oc_fecha: d.ocFecha === '' ? null : d.ocFecha,
    oc_monto: d.ocMonto === '' ? null : d.ocMonto, oc_coincide: d.ocCoincide,
    oc_observacion: d.ocObservacion, oc_aceptada: d.ocAceptada,
    proyecto_id: d.proyectoId === '' ? null : d.proyectoId,
    acta_inicio_at: d.actaInicioAt === '' ? null : d.actaInicioAt,
    recepcion_conforme_at: d.recepcionConformeAt === '' ? null : d.recepcionConformeAt,
    factura_numero: d.facturaNumero, factura_monto: d.facturaMonto === '' ? null : d.facturaMonto,
    factura_fecha: d.facturaFecha === '' ? null : d.facturaFecha,
    pago_esperado: d.pagoEsperado === '' ? null : d.pagoEsperado,
    pago_real: d.pagoReal === '' ? null : d.pagoReal, certificado_estado: d.certificadoEstado,
    certificado_solicitado_at: d.certificadoSolicitadoAt === '' ? null : d.certificadoSolicitadoAt,
    certificado_obtenido_at: d.certificadoObtenidoAt === '' ? null : d.certificadoObtenidoAt,
    certificado_path: d.certificadoPath,
    utilidad_real: d.utilidadReal === '' ? null : d.utilidadReal,
    horas_reales: d.horasReales === '' ? null : d.horasReales, aprendizaje: d.aprendizaje,
  });
}

export function opProvDocFromSupa(row) {
  if (!row) return null;
  return {
    id: row.id, nombre: row.nombre, categoria: row.categoria, descripcion: row.descripcion || '',
    fechaEmision: row.fecha_emision, fechaVencimiento: row.fecha_vencimiento,
    responsable: row.responsable, estado: row.estado || 'vigente', version: row.version || '',
    storagePath: row.storage_path, mime: row.mime, bytes: Number(row.bytes) || 0,
    createdAt: row.created_at,
  };
}
export function opProvDocToSupa(d) {
  return clean({
    nombre: d.nombre, categoria: d.categoria, descripcion: d.descripcion,
    fecha_emision: d.fechaEmision === '' ? null : d.fechaEmision,
    fecha_vencimiento: d.fechaVencimiento === '' ? null : d.fechaVencimiento,
    responsable: d.responsable === '' ? null : d.responsable, estado: d.estado, version: d.version,
    storage_path: d.storagePath, mime: d.mime, bytes: d.bytes,
  });
}

export function opConfigFromSupa(row) {
  if (!row) return null;
  return {
    orgId: row.org_id,
    puntajeParticipar: Number(row.puntaje_participar) || 70,
    puntajeRevisar: Number(row.puntaje_revisar) || 55,
    margenObjetivo: Number(row.margen_objetivo) || 0.30,
    margenDescarte: Number(row.margen_descarte) || 0.25,
    topeAprobacionNeto: Number(row.tope_aprobacion_neto) || 2500000,
    contingenciaPct: Number(row.contingencia_pct) || 0.10,
    ivaTasa: Number(row.iva_tasa) || 0.19,
    horasMaxCotizacion: Number(row.horas_max_cotizacion) || 2,
    unspsc: _arr(row.unspsc), regiones: _arr(row.regiones),
    palabrasClave: _arr(row.palabras_clave), servicios: _arr(row.servicios),
    apiHabilitada: !!row.api_habilitada,
  };
}
export function opConfigToSupa(d) {
  return clean({
    puntaje_participar: d.puntajeParticipar, puntaje_revisar: d.puntajeRevisar,
    margen_objetivo: d.margenObjetivo, margen_descarte: d.margenDescarte,
    tope_aprobacion_neto: d.topeAprobacionNeto, contingencia_pct: d.contingenciaPct,
    iva_tasa: d.ivaTasa, horas_max_cotizacion: d.horasMaxCotizacion,
    unspsc: d.unspsc, regiones: d.regiones, palabras_clave: d.palabrasClave,
    servicios: d.servicios, api_habilitada: d.apiHabilitada,
  });
}

export function opSyncFromSupa(row) {
  if (!row) return null;
  return {
    id: row.id, fuente: row.fuente, inicio: row.inicio, fin: row.fin, ok: row.ok,
    encontradas: Number(row.encontradas) || 0, nuevas: Number(row.nuevas) || 0,
    actualizadas: Number(row.actualizadas) || 0, errores: Number(row.errores) || 0,
    mensaje: row.mensaje || '', parametros: row.parametros || {},
  };
}

// ═════════════════════════════════════════════════════════════
// DIAGNÓSTICO CONTABLE Y TRIBUTARIO (dct_*)
//
// Módulo INDEPENDIENTE del Diagnóstico 360 (diagFromSupa/diagToSupa, arriba):
// otra tabla, otro cuestionario, otro puntaje y otro historial. Estos mappers no
// comparten ni una clave con aquellos, a propósito.
//
// `respuestas` viaja como jsonb tal cual lo arma el cuestionario: el motor de
// puntaje (modules/diagnostico-contable/domain/) es el único que lo interpreta,
// y así se puede cambiar la metodología sin migrar la base.
// ═════════════════════════════════════════════════════════════

export function dctFromSupa(row) {
  if (!row) return null;
  return {
    id:                 row.id,
    codigo:             row.codigo || '',
    leadId:             row.lead_id || null,
    clienteId:          row.cliente_id || null,

    // Identificación
    razonSocial:        row.razon_social || '',
    nombreFantasia:     row.nombre_fantasia || '',
    rut:                row.rut || '',
    actividadEconomica: row.actividad_economica || '',
    industria:          row.industria || '',
    entrevistadoNombre: row.entrevistado_nombre || '',
    entrevistadoCargo:  row.entrevistado_cargo || '',
    entrevistadoEmail:  row.entrevistado_email || '',
    entrevistadoFono:   row.entrevistado_fono || '',
    ejecutivo:          row.ejecutivo || null,
    fecha:              row.fecha,
    trabajadores:       _n(row.trabajadores),
    sociedadesGrupo:    _n(row.sociedades_grupo),
    observacionesIni:   row.observaciones_ini || '',

    // Cuestionario
    respuestas:         row.respuestas || {},
    observacionesEjec:  row.observaciones_ejec || '',
    etapaActual:        Number(row.etapa_actual) || 1,

    // Resultado
    puntajeGeneral:     _n(row.puntaje_general),
    puntajeFinanciero:  _n(row.puntaje_financiero),
    puntajeTributario:  _n(row.puntaje_tributario),
    nivelRiesgo:        row.nivel_riesgo || null,
    basePreparacion:    row.base_preparacion || null,
    enfoque:            _arr(row.enfoque),
    alertas:            _arr(row.alertas),
    desconocidas:       Number(row.desconocidas) || 0,
    precioInicialUf:    _n(row.precio_inicial_uf),
    precioRegla:        row.precio_regla || '',

    // Seguimiento
    estado:             row.estado || 'borrador',
    archivada:          !!row.archivada,
    oportunidadLeadId:  row.oportunidad_lead_id || null,
    citaId:             row.cita_id || null,
    cerradoMotivo:      row.cerrado_motivo || '',

    creadoPor:          row.creado_por || null,
    createdAt:          row.created_at,
    updatedAt:          row.updated_at,
  };
}

export function dctToSupa(d) {
  return clean({
    lead_id:             d.leadId === '' ? null : d.leadId,
    cliente_id:          d.clienteId === '' ? null : d.clienteId,

    razon_social:        _txt(d.razonSocial),
    nombre_fantasia:     _txt(d.nombreFantasia),
    rut:                 _rut(d.rut),
    actividad_economica: d.actividadEconomica,
    industria:           d.industria,
    entrevistado_nombre: _txt(d.entrevistadoNombre),
    entrevistado_cargo:  _txt(d.entrevistadoCargo),
    entrevistado_email:  _mail(d.entrevistadoEmail),
    entrevistado_fono:   _tel(d.entrevistadoFono),
    ejecutivo:           d.ejecutivo === '' ? null : d.ejecutivo,
    fecha:               d.fecha === '' ? null : d.fecha,
    trabajadores:        d.trabajadores === '' ? null : d.trabajadores,
    sociedades_grupo:    d.sociedadesGrupo === '' ? null : d.sociedadesGrupo,
    observaciones_ini:   d.observacionesIni,

    respuestas:          d.respuestas,
    observaciones_ejec:  d.observacionesEjec,
    etapa_actual:        d.etapaActual,

    puntaje_general:     d.puntajeGeneral === '' ? null : d.puntajeGeneral,
    puntaje_financiero:  d.puntajeFinanciero === '' ? null : d.puntajeFinanciero,
    puntaje_tributario:  d.puntajeTributario === '' ? null : d.puntajeTributario,
    nivel_riesgo:        d.nivelRiesgo,
    base_preparacion:    d.basePreparacion,
    enfoque:             d.enfoque,
    alertas:             d.alertas,
    desconocidas:        d.desconocidas,
    precio_inicial_uf:   d.precioInicialUf === '' ? null : d.precioInicialUf,
    precio_regla:        d.precioRegla,

    estado:              d.estado,
    archivada:           d.archivada,
    oportunidad_lead_id: d.oportunidadLeadId === '' ? null : d.oportunidadLeadId,
    cita_id:             d.citaId === '' ? null : d.citaId,
    cerrado_motivo:      d.cerradoMotivo,
  });
}

export function dctActFromSupa(row) {
  if (!row) return null;
  return {
    id: row.id, evaluacionId: row.evaluacion_id, tipo: row.tipo,
    detalle: row.detalle || '', usuario: row.usuario, createdAt: row.created_at,
  };
}
export function dctActToSupa(d) {
  return clean({ evaluacion_id: d.evaluacionId, tipo: d.tipo, detalle: d.detalle });
}
