// modules/diagnostico-contable/diagnostico-contable.js
// MÓDULO DIAGNÓSTICO CONTABLE Y TRIBUTARIO (raíz).
//
// Prediagnóstico comercial que el equipo levanta en reunión con gerentes,
// administradores y responsables financieros. Portada con indicadores e
// historial → cuestionario de cinco etapas → resultado con puntaje, alertas y
// recomendación → oportunidad comercial en el CRM.
//
// INDEPENDIENTE del Diagnóstico 360 (modules/diagnosticos/): otra tabla, otro
// cuestionario, otro puntaje, otro historial, otros estados. Este archivo no
// importa nada de aquel módulo y no modifica ninguno de sus datos.
//
// Este archivo es el COMPOSITION ROOT: estado, carga de datos, cableado de
// eventos y llamadas al dominio. No calcula nada por su cuenta (eso vive en
// domain/, testeado en node) ni arma HTML (eso vive en presentation/).
// Eventos por delegación: cero onclick inline con datos.
//
// Requiere supabase/diagnostico_contable_f1.sql. Si la migración no está
// aplicada, el módulo degrada con gracia y explica qué correr.

import {
  dctEvaluaciones as dctDB, dctActividad, prospectos, clientes, citas, profiles,
  config as cfg, isMissingTable,
} from '../../js/db.js';
import { toast, escHtml, todayStr } from '../../js/utils.js';
import { attachFormatting, parseCLP } from '../../js/format.js';
import { S } from '../../js/state.js';

import {
  ETAPAS, CAMPOS_IDENTIFICACION, PREGUNTAS, preguntaPorId,
  faltantesDeEtapa, aplica,
} from './domain/cuestionario.js';
import {
  calcularPuntaje, progreso, textoFortalezas, textoBrechas, antecedentesASolicitar,
  nivelMeta,
} from './domain/puntaje.js';
import { generarAlertas } from './domain/alertas.js';
import { recomendacionComercial, baseDePreparacion } from './domain/recomendacion.js';
import { validarTransicion, requiereMotivo, estadoLabel, estaCompletada } from './domain/estados.js';

import { cargando, bannerSql, esc, i, select, campo } from './presentation/ui.js';
import { renderPortada } from './presentation/portada.view.js';
import { renderCuestionario } from './presentation/cuestionario.view.js';
import { renderResultado } from './presentation/resultado.view.js';
import { abrirInforme, resumenTexto } from './presentation/informe.view.js';

// ── Estado del módulo ────────────────────────────────────────────────────────
const _st = {
  vista: 'portada',          // portada | wizard | resultado
  id: null,                  // evaluación abierta (null = todavía sin guardar)
  etapa: 1,
  page: 0,
  limit: 25,
  filtros: { q: '', estado: '', riesgo: '', rango: '', industria: '', ejecutivo: '', desde: '', hasta: '', orden: 'reciente', archivadas: false },
  datos: null,               // cabecera de la evaluación en edición
  respuestas: {},            // respuestas del cuestionario en edición
  faltantes: [],             // requeridas sin responder de la etapa actual
  guardado: false,           // ¿ya existe en Supabase?
  guardadoAt: null,
  sucio: false,              // hay cambios sin persistir
  debounceQ: null,
  debounceSave: null,
  enVuelo: null,             // guardado en curso (serializa los autoguardados)
  cache: { perfiles: [], industrias: [], empresas: [] },
};

const BORRADOR_LOCAL = 'triada_dct_borrador';

const $ = (id) => document.getElementById(id);
const _val = (id) => ($(id)?.value ?? '').trim();
const _num = (id) => { const v = _val(id); return v === '' ? null : Number(v); };
const _puedeEditar = () => (S.profile?.role || '') !== 'lector';

// ═════════════════════════════════════════════════════════════════════════════
// RENDER
// ═════════════════════════════════════════════════════════════════════════════
export async function render() {
  const center = $('center');
  center.innerHTML = `<div class="view-animate dct-view">${cargando('Cargando diagnósticos…')}</div>`;

  try {
    if (!_st.cache.perfiles.length) await _cargarComunes();
  } catch (err) {
    if (isMissingTable(err)) {
      center.innerHTML = `<div class="view-animate dct-view">${bannerSql(err?.message || '')}</div>`;
      return;
    }
    console.error('[diagnostico-contable] carga inicial', err);
    center.innerHTML = `<div class="view-animate dct-view">${bannerSql(err?.message || 'Error desconocido')}</div>`;
    return;
  }

  try {
    const cuerpo = await _cuerpo();
    center.innerHTML = `<div class="view-animate dct-view">${cuerpo}</div>`;
    _wire(center.querySelector('.dct-view'));
    attachFormatting(center);
  } catch (err) {
    if (isMissingTable(err)) {
      center.innerHTML = `<div class="view-animate dct-view">${bannerSql(err?.message || '')}</div>`;
      return;
    }
    console.error('[diagnostico-contable] render', err);
    center.innerHTML = `<div class="view-animate dct-view">
      <div class="dct-banner dct-banner--warn">No se pudo cargar el módulo: ${escHtml(err?.message || 'error desconocido')}</div></div>`;
  }
}

async function _cargarComunes() {
  const [perfiles, industrias] = await Promise.all([
    profiles.getAll().catch((err) => { console.warn('[diagnostico-contable] perfiles', err); return []; }),
    dctDB.industrias().catch(() => []),
  ]);
  _st.cache.perfiles = perfiles;
  _st.cache.industrias = industrias;
}

async function _cuerpo() {
  if (_st.vista === 'wizard')    return _cuerpoWizard();
  if (_st.vista === 'resultado') return _cuerpoResultado();
  return _cuerpoPortada();
}

// ── Portada ──────────────────────────────────────────────────────────────────
async function _cuerpoPortada() {
  const f = _st.filtros;
  const [min, max] = _rangoAPuntajes(f.rango);
  const [{ rows, total }, todas] = await Promise.all([
    dctDB.page({
      limit: _st.limit, offset: _st.page * _st.limit,
      q: f.q, estado: f.estado, riesgo: f.riesgo, industria: f.industria,
      ejecutivo: f.ejecutivo, desde: f.desde, hasta: f.hasta,
      puntajeMin: min, puntajeMax: max, archivadas: f.archivadas, orden: f.orden,
    }),
    dctDB.getAll(),
  ]);

  return renderPortada({
    rows, total, page: _st.page, limit: _st.limit, filtros: f,
    indicadores: _indicadores(todas),
    perfiles: _st.cache.perfiles, industrias: _st.cache.industrias,
    puedeEditar: _puedeEditar(),
  });
}

function _rangoAPuntajes(rango) {
  if (!rango) return [null, null];
  const [a, b] = String(rango).split('-').map(Number);
  return [Number.isFinite(a) ? a : null, Number.isFinite(b) ? b : null];
}

/** Indicadores de la portada. Se calculan sobre las evaluaciones NO archivadas. */
function _indicadores(todas = []) {
  const vivas = todas.filter((e) => !e.archivada);
  const cerradas = vivas.filter((e) => estaCompletada(e.estado));
  return {
    realizados:    cerradas.length,
    borradores:    vivas.length - cerradas.length,
    favorables:    cerradas.filter((e) => e.nivelRiesgo === 'favorable').length,
    observaciones: cerradas.filter((e) => e.nivelRiesgo === 'observaciones').length,
    derivar:       cerradas.filter((e) => (e.alertas || []).length > 0
                     || (e.puntajeGeneral != null && e.puntajeGeneral < 85)).length,
    oportunidades: vivas.filter((e) => !!e.oportunidadLeadId).length,
  };
}

// ── Wizard ───────────────────────────────────────────────────────────────────
async function _cuerpoWizard() {
  if (!_st.cache.empresas.length) await _cargarEmpresas();
  return renderCuestionario({
    etapa: _st.etapa,
    datos: _st.datos || {},
    respuestas: _st.respuestas,
    perfiles: _st.cache.perfiles,
    empresas: _st.cache.empresas,
    progreso: progreso(_st.respuestas),
    faltantes: _st.faltantes,
    esNueva: !(_st.datos?.leadId || _st.datos?.clienteId),
    guardadoAt: _st.guardadoAt,
  });
}

/** Empresas ya registradas en el CRM (leads + clientes), para asociar sin duplicar. */
async function _cargarEmpresas() {
  try {
    const [leads, clis] = await Promise.all([
      prospectos.getAll().catch(() => []),
      clientes.getAll().catch(() => []),
    ]);
    const vistos = new Set();
    const lista = [];
    clis.forEach((c) => {
      if (!c.razonSocial && !c.nombre) return;
      lista.push({ id: `cli:${c.id}`, label: `${c.razonSocial || c.nombre}${c.rut ? ` · ${c.rut}` : ''} (cliente)`, tipo: 'cliente', raw: c });
      if (c.leadId) vistos.add(c.leadId);
    });
    leads.forEach((l) => {
      if (vistos.has(l.id)) return;
      const nombre = l.empresa || l.nombre;
      if (!nombre) return;
      lista.push({ id: `lead:${l.id}`, label: `${nombre}${l.rut ? ` · ${l.rut}` : ''}`, tipo: 'lead', raw: l });
    });
    _st.cache.empresas = lista.sort((a, b) => a.label.localeCompare(b.label, 'es'));
  } catch (err) {
    console.error('[diagnostico-contable] empresas del CRM', err);
    toast('No se pudieron cargar las empresas del CRM', 'error');
    _st.cache.empresas = [];
  }
}

// ── Resultado ────────────────────────────────────────────────────────────────
async function _cuerpoResultado() {
  const calc = _calcular();
  const historial = _st.id
    ? await dctActividad.byEvaluacion(_st.id).catch((err) => {
        console.warn('[diagnostico-contable] historial', err); return [];
      })
    : [];

  return renderResultado({
    datos: _st.datos || {},
    puntaje: calc.puntaje,
    alertas: calc.alertas,
    recomendacion: calc.recomendacion,
    fortalezas: calc.fortalezas,
    brechas: calc.brechas,
    antecedentes: calc.antecedentes,
    desconocidas: calc.puntaje.desconocidas,
    guardado: _st.guardado,
    puedeEditar: _puedeEditar(),
    empresaVinculada: _st.datos?._empresaLabel || null,
    historial,
  });
}

/** Único punto donde se calcula el resultado. Todo sale del dominio. */
function _calcular() {
  const r = _st.respuestas;
  const puntaje = calcularPuntaje(r);
  const alertas = generarAlertas(r);
  return {
    puntaje,
    alertas,
    recomendacion: recomendacionComercial({ respuestas: r, puntaje: puntaje.general, alertas }),
    fortalezas: textoFortalezas(r),
    brechas: textoBrechas(r),
    antecedentes: antecedentesASolicitar(r),
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// EVENTOS (delegación)
// ═════════════════════════════════════════════════════════════════════════════
function _wire(root) {
  if (!root) return;

  root.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('[data-dct]');
    if (!btn || btn.disabled) return;
    const accion = btn.dataset.dct;
    try { await _accion(accion, btn); }
    catch (err) {
      console.error(`[diagnostico-contable] acción "${accion}"`, err);
      toast(err?.message || 'No se pudo completar la acción', 'error');
    }
  });

  // Buscador con debounce (no dispara una consulta por tecla).
  const q = $('dctQ');
  if (q) q.addEventListener('input', () => {
    clearTimeout(_st.debounceQ);
    _st.debounceQ = setTimeout(() => { _st.filtros.q = q.value.trim(); _st.page = 0; render(); }, 350);
  });

  // Filtros de la portada.
  [['dctFEstado', 'estado'], ['dctFRiesgo', 'riesgo'], ['dctFRango', 'rango'],
   ['dctFIndustria', 'industria'], ['dctFEjec', 'ejecutivo'], ['dctFOrden', 'orden'],
   ['dctFDesde', 'desde'], ['dctFHasta', 'hasta']].forEach(([id, clave]) => {
    const el = $(id);
    if (el) el.addEventListener('change', () => { _st.filtros[clave] = el.value; _st.page = 0; render(); });
  });

  // Campos del wizard: identificación, respuestas abiertas, inventario y activos.
  root.addEventListener('input', _onCampo);
  root.addEventListener('change', _onCampo);
}

function _onCampo(ev) {
  const el = ev.target;
  if (!el || !el.id && !el.dataset) return;

  // Identificación (etapa 1)
  if (el.id && el.id.startsWith('dctId_')) {
    const clave = el.id.slice('dctId_'.length);
    _st.datos = _st.datos || {};
    _st.datos[clave] = el.type === 'number' ? (el.value === '' ? null : Number(el.value)) : el.value;
    return _marcarSucio();
  }
  // Empresa del CRM
  if (el.id === 'dctLead') return _vincularEmpresa(el.value);
  // Observaciones del ejecutivo
  if (el.id === 'dctObsEjec') {
    _st.datos = _st.datos || {};
    _st.datos.observacionesEjec = el.value;
    return _marcarSucio();
  }
  // Respuestas abiertas (texto, número, moneda)
  if (el.dataset.r) {
    const p = preguntaPorId(el.dataset.r);
    const v = el.value;
    _st.respuestas[el.dataset.r] = (p?.tipo === 'moneda') ? (v === '' ? null : parseCLP(v))
      : (p?.tipo === 'numero') ? (v === '' ? null : Number(v)) : v;
    return _marcarSucio();
  }
  // Subcampos del inventario (T3)
  if (el.dataset.inv) {
    const { inv, sel, sub } = el.dataset;
    const p = preguntaPorId(inv);
    const campoDef = (p?.subcampos || []).find((s) => s.id === sub);
    const cur = _st.respuestas[inv] || { seleccion: [], detalle: {} };
    cur.detalle = cur.detalle || {};
    cur.detalle[sel] = cur.detalle[sel] || {};
    cur.detalle[sel][sub] = campoDef?.tipo === 'moneda'
      ? (el.value === '' ? null : parseCLP(el.value))
      : el.value;
    _st.respuestas[inv] = cur;
    return _marcarSucio();
  }
  // Celdas de activos fijos (T4)
  if (el.dataset.act) {
    const { act, idx, col } = el.dataset;
    const p = preguntaPorId(act);
    const colDef = (p?.columnas || []).find((c) => c.id === col);
    const filas = Array.isArray(_st.respuestas[act]) ? [..._st.respuestas[act]] : [];
    if (!filas[idx]) return;
    filas[idx] = { ...filas[idx] };
    filas[idx][col] = colDef?.tipo === 'moneda' ? (el.value === '' ? null : parseCLP(el.value))
      : colDef?.tipo === 'numero' ? (el.value === '' ? null : Number(el.value)) : el.value;
    _st.respuestas[act] = filas;
    return _marcarSucio();
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// ACCIONES
// ═════════════════════════════════════════════════════════════════════════════
async function _accion(accion, btn) {
  switch (accion) {
    // ── Portada ──
    case 'nuevo':              return _nuevo();
    case 'abrir':              return _abrir(btn.dataset.id, 'resultado');
    case 'continuar':          return _abrir(btn.dataset.id, 'wizard');
    case 'editar':             return _abrir(btn.dataset.id, 'wizard');
    case 'duplicar':           return _duplicar(btn.dataset.id);
    case 'informe':            return _informeDe(btn.dataset.id);
    case 'archivar':           return _archivar(btn.dataset.id, true);
    case 'restaurar':          return _archivar(btn.dataset.id, false);
    case 'pag':                _st.page = Math.max(0, _st.page + Number(btn.dataset.dir)); return render();
    case 'toggle-archivadas':  _st.filtros.archivadas = !_st.filtros.archivadas; _st.page = 0; return render();
    case 'limpiar-filtros':
      _st.filtros = { q: '', estado: '', riesgo: '', rango: '', industria: '', ejecutivo: '', desde: '', hasta: '', orden: 'reciente', archivadas: _st.filtros.archivadas };
      _st.page = 0; return render();

    // ── Wizard ──
    case 'volver-portada':     return _volverPortada();
    case 'ir-etapa':           return _irEtapa(Number(btn.dataset.etapa));
    case 'anterior':           return _irEtapa(_st.etapa - 1);
    case 'siguiente':          return _siguiente();
    case 'guardar-borrador':   return _guardar({ avisar: true });
    case 'origen':             return _cambiarOrigen(btn.dataset.origen);
    case 'op':                 return _responder(btn.dataset.q, btn.dataset.v, btn.dataset.modo);
    case 'inv-sel':            return _inventarioSel(btn.dataset.q, btn.dataset.v, btn.dataset.excl === '1');
    case 'act-add':            return _activoAgregar(btn.dataset.q);
    case 'act-del':            return _activoQuitar(btn.dataset.q, Number(btn.dataset.idx));

    // ── Resultado ──
    case 'guardar-crm':          return _guardar({ avisar: true, recargar: true });
    case 'asociar-empresa':      return _modalAsociar();
    case 'crear-oportunidad':    return _crearOportunidad();
    case 'programar-seguimiento': return _modalSeguimiento();
    case 'editar-respuestas':    _st.etapa = 3; _st.vista = 'wizard'; return render();
    case 'solicitar-sebastian':  return _solicitarSebastian();
    case 'informe-actual':       return _informe();
    case 'imprimir':             return _informe();
    case 'exportar':             return _exportar();
    case 'estado':               return _cambiarEstado(btn.dataset.estado);
    default: return undefined;
  }
}

// ── Alta y apertura ──────────────────────────────────────────────────────────
function _nuevo() {
  const hoy = todayStr();
  _st.id = null;
  _st.datos = {
    razonSocial: '', nombreFantasia: '', rut: '', actividadEconomica: '', industria: '',
    entrevistadoNombre: '', entrevistadoCargo: '', entrevistadoEmail: '', entrevistadoFono: '',
    ejecutivo: S.profile?.id || '', fecha: hoy, trabajadores: null, sociedadesGrupo: null,
    observacionesIni: '', observacionesEjec: '', estado: 'borrador',
    leadId: null, clienteId: null,
  };
  _st.respuestas = {};
  _st.etapa = 1;
  _st.faltantes = [];
  _st.guardado = false;
  _st.guardadoAt = null;
  _st.sucio = false;
  _st.vista = 'wizard';
  _limpiarBorradorLocal();
  return render();
}

async function _abrir(id, vista) {
  if (!id) return;
  const e = await dctDB.get(id);
  if (!e) { toast('Evaluación no encontrada', 'error'); return; }
  _st.id = e.id;
  _st.datos = { ...e };
  _st.respuestas = e.respuestas || {};
  _st.guardado = true;
  _st.guardadoAt = e.updatedAt || e.createdAt;
  _st.sucio = false;
  _st.faltantes = [];
  _st.etapa = vista === 'wizard' ? Math.min(4, Math.max(1, e.etapaActual || 1)) : 5;
  _st.vista = vista;
  await _resolverEmpresaLabel();
  return render();
}

async function _duplicar(id) {
  const e = await dctDB.get(id);
  if (!e) { toast('Evaluación no encontrada', 'error'); return; }
  _st.id = null;
  _st.datos = {
    ...e,
    id: undefined, codigo: '', fecha: todayStr(), estado: 'borrador',
    oportunidadLeadId: null, citaId: null, cerradoMotivo: '', archivada: false,
    razonSocial: e.razonSocial, observacionesEjec: '',
  };
  _st.respuestas = JSON.parse(JSON.stringify(e.respuestas || {}));
  _st.etapa = 1;
  _st.guardado = false;
  _st.guardadoAt = null;
  _st.sucio = true;
  _st.vista = 'wizard';
  toast('Copia creada. Ajusta lo que cambió y guárdala.', 'info');
  return render();
}

async function _volverPortada() {
  if (_st.sucio && _st.datos?.razonSocial) {
    if (!confirm('Hay cambios sin guardar. ¿Salir de todas formas?')) return;
  }
  _st.vista = 'portada';
  _st.id = null;
  _st.datos = null;
  _st.respuestas = {};
  _st.sucio = false;
  return render();
}

// ── Navegación del cuestionario ──────────────────────────────────────────────
function _irEtapa(n) {
  if (n < 1) return;
  _st.etapa = Math.min(5, Math.max(1, n));
  _st.faltantes = [];
  if (_st.etapa === 5) _st.vista = 'resultado';
  return render();
}

async function _siguiente() {
  const faltan = _validarEtapa(_st.etapa);
  if (faltan.length) {
    _st.faltantes = faltan;
    toast('Faltan respuestas obligatorias en esta etapa', 'error');
    await render();
    const primero = document.querySelector('.dct-q--falta, .dct-invalido');
    if (primero) primero.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  _st.faltantes = [];

  if (_st.etapa === 4) {
    // Cierre del cuestionario: se calcula, se persiste y recién ahí se muestra.
    await _guardar({ completar: true });
    _st.vista = 'resultado';
    _st.etapa = 5;
    return render();
  }

  _st.etapa += 1;
  await _guardar({ silencioso: true });
  return render();
}

/** Requeridas de la etapa. La 1 valida sus propios campos obligatorios. */
function _validarEtapa(etapa) {
  if (etapa === 1) {
    const d = _st.datos || {};
    return CAMPOS_IDENTIFICACION.filter((c) => c.requerido && !String(d[c.id] ?? '').trim()).map((c) => c.id);
  }
  const meta = ETAPAS.find((e) => e.n === etapa);
  return meta ? faltantesDeEtapa(meta.id, _st.respuestas) : [];
}

// ── Captura de respuestas ────────────────────────────────────────────────────
function _responder(qId, valor, modo) {
  if (modo === 'checkbox') {
    const actual = Array.isArray(_st.respuestas[qId]) ? [..._st.respuestas[qId]] : [];
    const idx = actual.indexOf(valor);
    if (idx >= 0) actual.splice(idx, 1); else actual.push(valor);
    _st.respuestas[qId] = actual;
  } else {
    // Volver a tocar la opción marcada la desmarca (permite corregir un clic).
    _st.respuestas[qId] = _st.respuestas[qId] === valor ? null : valor;
  }
  _limpiarDependientes(qId);
  _marcarSucio();
  return render();
}

function _inventarioSel(qId, valor, exclusiva) {
  const cur = _st.respuestas[qId] || { seleccion: [], detalle: {} };
  let seleccion = Array.isArray(cur.seleccion) ? [...cur.seleccion] : [];

  if (exclusiva) {
    // "Sin inversiones" y "No lo sé" se excluyen de todo lo demás.
    seleccion = seleccion.includes(valor) ? [] : [valor];
  } else {
    seleccion = seleccion.filter((s) => s !== 'ninguna' && s !== 'no_se');
    const idx = seleccion.indexOf(valor);
    if (idx >= 0) seleccion.splice(idx, 1); else seleccion.push(valor);
  }

  // El detalle de lo que se desmarca se descarta: si vuelve a marcarse, se pregunta de nuevo.
  const detalle = {};
  seleccion.forEach((s) => { if (cur.detalle?.[s]) detalle[s] = cur.detalle[s]; });

  _st.respuestas[qId] = { seleccion, detalle };
  _marcarSucio();
  return render();
}

function _activoAgregar(qId) {
  const filas = Array.isArray(_st.respuestas[qId]) ? [..._st.respuestas[qId]] : [];
  filas.push({});
  _st.respuestas[qId] = filas;
  _marcarSucio();
  return render();
}

function _activoQuitar(qId, idx) {
  const filas = Array.isArray(_st.respuestas[qId]) ? [..._st.respuestas[qId]] : [];
  filas.splice(idx, 1);
  _st.respuestas[qId] = filas;
  _marcarSucio();
  return render();
}

/**
 * Al cambiar una respuesta que abre una rama, se borra lo que quedó fuera del
 * recorrido. Sin esto, una empresa que pasa de IFRS a balance tributario
 * arrastraría respuestas de auditoría que ya no corresponden y que, aunque no
 * se muestren, seguirían guardadas en la base.
 */
function _limpiarDependientes(qId) {
  PREGUNTAS.forEach((p) => {
    if (p.id === qId) return;
    if (typeof p.cuando !== 'function') return;
    if (!aplica(p, _st.respuestas) && _st.respuestas[p.id] !== undefined) {
      delete _st.respuestas[p.id];
    }
  });
}

// ── Vínculo con el CRM ───────────────────────────────────────────────────────
function _cambiarOrigen(origen) {
  _st.datos = _st.datos || {};
  if (origen === 'nueva') {
    _st.datos.leadId = null;
    _st.datos.clienteId = null;
    _st.datos._empresaLabel = null;
  }
  _st.datos._origen = origen;
  _marcarSucio();
  return render();
}

/**
 * Toma los datos de la ficha del CRM en vez de duplicarlos.
 * Los campos que el ejecutivo ya escribió NO se pisan.
 */
function _vincularEmpresa(valor) {
  _st.datos = _st.datos || {};
  if (!valor) {
    _st.datos.leadId = null; _st.datos.clienteId = null; _st.datos._empresaLabel = null;
    return _marcarSucio();
  }
  const item = _st.cache.empresas.find((e) => e.id === valor);
  if (!item) return undefined;
  const raw = item.raw || {};

  if (item.tipo === 'cliente') { _st.datos.clienteId = raw.id; _st.datos.leadId = raw.leadId || null; }
  else { _st.datos.leadId = raw.id; _st.datos.clienteId = null; }
  _st.datos._empresaLabel = item.label;

  const tomar = (clave, valorCrm) => {
    if (valorCrm && !String(_st.datos[clave] ?? '').trim()) _st.datos[clave] = valorCrm;
  };
  tomar('razonSocial',        raw.razonSocial || raw.empresa || raw.nombre);
  tomar('rut',                raw.rut);
  tomar('actividadEconomica', raw.giro);
  tomar('entrevistadoNombre', raw.nombre);
  tomar('entrevistadoEmail',  raw.email);
  tomar('entrevistadoFono',   raw.telefono);

  _marcarSucio();
  return render();
}

async function _resolverEmpresaLabel() {
  const d = _st.datos;
  if (!d || (!d.leadId && !d.clienteId)) return;
  try {
    if (d.clienteId) {
      const c = await clientes.get(d.clienteId);
      d._empresaLabel = c?.razonSocial || c?.nombre || null;
    } else if (d.leadId) {
      const l = await prospectos.get(d.leadId);
      d._empresaLabel = l?.empresa || l?.nombre || null;
    }
  } catch (err) {
    console.warn('[diagnostico-contable] no se pudo resolver la empresa vinculada', err);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// PERSISTENCIA
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Marca que hay cambios y programa el autoguardado.
 * El respaldo en localStorage NO reemplaza a Supabase: es la red debajo del
 * trapecio para el caso en que se caiga el wifi en medio de una reunión.
 */
function _marcarSucio() {
  _st.sucio = true;
  _respaldoLocal();
  clearTimeout(_st.debounceSave);
  _st.debounceSave = setTimeout(() => {
    _guardar({ silencioso: true }).catch((err) =>
      console.error('[diagnostico-contable] autoguardado', err));
  }, 2500);
}

function _respaldoLocal() {
  try {
    localStorage.setItem(BORRADOR_LOCAL, JSON.stringify({
      id: _st.id, datos: _st.datos, respuestas: _st.respuestas, etapa: _st.etapa, at: Date.now(),
    }));
  } catch (err) {
    console.warn('[diagnostico-contable] no se pudo guardar el respaldo local', err);
  }
}

function _limpiarBorradorLocal() {
  try { localStorage.removeItem(BORRADOR_LOCAL); }
  catch (err) { console.warn('[diagnostico-contable] no se pudo limpiar el respaldo local', err); }
}

/** Arma la fila para Supabase con el resultado ya calculado. */
function _payload({ completar = false } = {}) {
  const d = _st.datos || {};
  const calc = _calcular();
  const cerrada = completar || estaCompletada(d.estado);

  return {
    leadId: d.leadId || null,
    clienteId: d.clienteId || null,
    razonSocial: d.razonSocial || '',
    nombreFantasia: d.nombreFantasia || '',
    rut: d.rut || '',
    actividadEconomica: d.actividadEconomica || '',
    industria: d.industria || '',
    entrevistadoNombre: d.entrevistadoNombre || '',
    entrevistadoCargo: d.entrevistadoCargo || '',
    entrevistadoEmail: d.entrevistadoEmail || '',
    entrevistadoFono: d.entrevistadoFono || '',
    ejecutivo: d.ejecutivo || null,
    fecha: d.fecha || todayStr(),
    trabajadores: d.trabajadores ?? null,
    sociedadesGrupo: d.sociedadesGrupo ?? null,
    observacionesIni: d.observacionesIni || '',
    respuestas: _st.respuestas,
    observacionesEjec: d.observacionesEjec || '',
    etapaActual: Math.min(5, Math.max(1, _st.etapa)),

    // El resultado se persiste SOLO cuando el cuestionario está cerrado: un
    // borrador a medias con un puntaje en la tabla contamina los indicadores.
    puntajeGeneral:    cerrada ? calc.puntaje.general    : null,
    puntajeFinanciero: cerrada ? calc.puntaje.financiero : null,
    puntajeTributario: cerrada ? calc.puntaje.tributario : null,
    nivelRiesgo:       cerrada ? calc.puntaje.nivel      : null,
    basePreparacion:   baseDePreparacion(_st.respuestas),
    enfoque:           Array.isArray(_st.respuestas.N1) ? _st.respuestas.N1 : [],
    alertas:           cerrada ? calc.alertas : [],
    desconocidas:      calc.puntaje.desconocidas.length,
    precioInicialUf:   cerrada ? calc.recomendacion.precio.uf : null,
    precioRegla:       calc.recomendacion.precio.reglaId || '',

    estado: completar && d.estado === 'borrador' ? 'completado' : (d.estado || 'borrador'),
    archivada: !!d.archivada,
    oportunidadLeadId: d.oportunidadLeadId || null,
    citaId: d.citaId || null,
    cerradoMotivo: d.cerradoMotivo || '',
  };
}

async function _guardar({ avisar = false, silencioso = false, completar = false, recargar = false } = {}) {
  const d = _st.datos;
  if (!d) return;
  if (!String(d.razonSocial || '').trim()) {
    if (avisar) toast('La razón social es obligatoria para guardar', 'error');
    return;
  }
  if (!_puedeEditar()) { toast('Tu perfil es de solo lectura', 'error'); return; }

  // Serializa los guardados. Sin esto, dos autoguardados que se solapan antes de
  // que el INSERT devuelva el id crean DOS evaluaciones para la misma reunión:
  // el segundo entra por la rama del `add` porque `_st.id` sigue en null.
  if (_st.enVuelo) { await _st.enVuelo.catch(() => {}); }
  const trabajo = _guardarAhora({ avisar, silencioso, completar, recargar });
  _st.enVuelo = trabajo;
  try { return await trabajo; }
  finally { if (_st.enVuelo === trabajo) _st.enVuelo = null; }
}

async function _guardarAhora({ avisar, silencioso, completar, recargar }) {
  const payload = _payload({ completar });
  const nota = $('dctAutosave');
  if (nota && !silencioso) nota.textContent = 'Guardando…';

  try {
    if (_st.id) {
      await dctDB.update({ id: _st.id, ...payload });
      await _bitacora(completar ? 'completada' : 'guardada', completar ? 'Cuestionario cerrado y puntaje calculado' : '');
    } else {
      _st.id = await dctDB.add(payload);
      await _bitacora('creada', `Diagnóstico de ${payload.razonSocial}`);
      // El código correlativo lo pone un trigger: hay que releerlo.
      const fresca = await dctDB.get(_st.id).catch(() => null);
      if (fresca) _st.datos = { ..._st.datos, codigo: fresca.codigo, createdAt: fresca.createdAt };
    }
    _st.datos.estado = payload.estado;
    _st.guardado = true;
    _st.sucio = false;
    _st.guardadoAt = new Date().toISOString();
    _limpiarBorradorLocal();
    if (nota) nota.textContent = 'Guardado';
    if (avisar) toast('Diagnóstico guardado ✓', 'success');
    if (recargar) await render();
  } catch (err) {
    console.error('[diagnostico-contable] guardar', err);
    if (nota) nota.textContent = 'Sin guardar';
    if (isMissingTable(err)) toast('Falta aplicar supabase/diagnostico_contable_f1.sql', 'error');
    else toast(err?.message || 'No se pudo guardar el diagnóstico', 'error');
    if (avisar) throw err;
  }
}

async function _bitacora(tipo, detalle = '') {
  if (!_st.id) return;
  try { await dctActividad.add({ evaluacionId: _st.id, tipo, detalle }); }
  catch (err) { console.warn('[diagnostico-contable] no se pudo registrar en el historial', err); }
}

// ── Acciones sobre una evaluación guardada ───────────────────────────────────
async function _archivar(id, archivar) {
  if (!_puedeEditar()) { toast('Tu perfil es de solo lectura', 'error'); return; }
  await dctDB.update({ id, archivada: archivar });
  try { await dctActividad.add({ evaluacionId: id, tipo: 'archivada', detalle: archivar ? 'Archivada' : 'Restaurada' }); }
  catch (err) { console.warn('[diagnostico-contable] historial de archivo', err); }
  toast(archivar ? 'Evaluación archivada' : 'Evaluación restaurada', 'info');
  return render();
}

async function _cambiarEstado(nuevo) {
  const actual = _st.datos?.estado || 'borrador';
  const v = validarTransicion(actual, nuevo);
  if (!v.ok) { toast(v.motivo, 'error'); return; }

  let motivo = '';
  if (requiereMotivo(nuevo)) {
    motivo = (prompt('¿Por qué se cierra este caso?') || '').trim();
    if (!motivo) { toast('Cerrar un caso exige un motivo', 'error'); return; }
  }

  if (!_st.id) { await _guardar({ silencioso: true }); if (!_st.id) return; }
  await dctDB.update({ id: _st.id, estado: nuevo, cerradoMotivo: motivo || _st.datos.cerradoMotivo || '' });
  _st.datos.estado = nuevo;
  if (motivo) _st.datos.cerradoMotivo = motivo;
  await _bitacora('estado', `${estadoLabel(actual)} → ${estadoLabel(nuevo)}${motivo ? `: ${motivo}` : ''}`);
  toast(`Estado: ${estadoLabel(nuevo)}`, 'success');
  return render();
}

async function _solicitarSebastian() {
  if (!_st.id) await _guardar({ silencioso: true });
  if (!_st.id) { toast('Guarda el diagnóstico antes de solicitar la evaluación', 'error'); return; }
  const actual = _st.datos.estado || 'completado';
  if (actual === 'reunion_solicitada') { toast('La reunión ya está solicitada', 'info'); return; }
  const v = validarTransicion(actual, 'reunion_solicitada');
  if (!v.ok) { toast(v.motivo, 'error'); return; }
  await dctDB.update({ id: _st.id, estado: 'reunion_solicitada' });
  _st.datos.estado = 'reunion_solicitada';
  await _bitacora('estado', 'Se solicitó la evaluación especializada con Sebastián');
  toast('Evaluación con Sebastián solicitada ✓', 'success');
  return render();
}

// ── Oportunidad comercial en el CRM ──────────────────────────────────────────
/**
 * Deja el resultado como oportunidad en el pipeline: si la empresa ya está en el
 * CRM, mueve su lead a "Diagnóstico Realizado"; si es nueva, crea el lead. No
 * duplica fichas: por eso primero se pregunta por el vínculo en la etapa 1.
 */
async function _crearOportunidad() {
  if (!_puedeEditar()) { toast('Tu perfil es de solo lectura', 'error'); return; }
  if (!_st.id) await _guardar({ silencioso: true });
  if (!_st.id) { toast('Guarda el diagnóstico antes de crear la oportunidad', 'error'); return; }
  if (_st.datos.oportunidadLeadId) { toast('Esta evaluación ya generó una oportunidad', 'info'); return; }

  const d = _st.datos;
  const calc = _calcular();
  const notas = [
    `Diagnóstico Contable y Tributario ${d.codigo || ''}`.trim(),
    `Puntaje ${calc.puntaje.general ?? '—'}/100 · ${nivelMeta(calc.puntaje.nivel)?.label || 'sin evaluar'}`,
    calc.alertas.length ? `${calc.alertas.length} alerta(s) prioritaria(s)` : 'Sin alertas prioritarias',
    `Servicio: ${calc.recomendacion.servicio}`,
    `Precio inicial: ${calc.recomendacion.precio.uf != null ? `desde ${calc.recomendacion.precio.uf} UF` : calc.recomendacion.precio.etiqueta}`,
  ].join('\n');

  try {
    let leadId = d.leadId;
    if (leadId) {
      await prospectos.update({ id: leadId, estado: 'Diagnóstico Realizado', notas });
    } else {
      leadId = await prospectos.add({
        nombre: d.entrevistadoNombre || d.razonSocial,
        empresa: d.razonSocial,
        rut: d.rut || '',
        email: d.entrevistadoEmail || '',
        telefono: d.entrevistadoFono || '',
        rubro: d.industria || '',
        estado: 'Diagnóstico Realizado',
        origen: 'Manual',
        notas,
      });
    }
    await dctDB.update({ id: _st.id, oportunidadLeadId: leadId, leadId });
    _st.datos.oportunidadLeadId = leadId;
    _st.datos.leadId = leadId;
    await _bitacora('oportunidad', `Oportunidad comercial creada en el pipeline (${d.razonSocial})`);
    toast('Oportunidad creada en el pipeline ✓', 'success');
    return render();
  } catch (err) {
    console.error('[diagnostico-contable] crear oportunidad', err);
    toast(err?.message || 'No se pudo crear la oportunidad', 'error');
  }
}

// ── Modales ──────────────────────────────────────────────────────────────────
function _abrirModal(titulo, cuerpo, onSave, { textoGuardar = 'Guardar' } = {}) {
  $('modalTitle').textContent = titulo;
  document.querySelector('.modal-box').className = 'modal-box';
  $('modalBody').innerHTML = cuerpo;
  const save = $('modalSave');
  save.style.display = onSave ? '' : 'none';
  save.textContent = textoGuardar;
  save.onclick = onSave ? async () => {
    save.disabled = true;
    try { await onSave(); } catch (err) {
      console.error('[diagnostico-contable] modal', err);
      toast(err?.message || 'No se pudo guardar', 'error');
    } finally { save.disabled = false; }
  } : null;
  $('modalOverlay').classList.add('open');
  attachFormatting($('modalBody'));
}

const _cerrarModal = () => {
  $('modalOverlay').classList.remove('open');
  $('modalSave').textContent = 'Guardar';
};

async function _modalAsociar() {
  if (!_st.cache.empresas.length) await _cargarEmpresas();
  const actual = _st.datos?.clienteId ? `cli:${_st.datos.clienteId}`
    : _st.datos?.leadId ? `lead:${_st.datos.leadId}` : '';

  _abrirModal('Asociar a una empresa del CRM', `
    <p class="dct-modal-nota">Al asociarla, el diagnóstico queda colgado de su ficha y los datos no se duplican.</p>
    ${campo('Empresa', select('dctAsoc', _st.cache.empresas.map((e) => ({ v: e.id, label: e.label })), actual,
      { vacio: '— Sin asociar —' }))}
  `, async () => {
    const v = _val('dctAsoc');
    _vincularEmpresa(v);
    if (_st.id) {
      await dctDB.update({ id: _st.id, leadId: _st.datos.leadId, clienteId: _st.datos.clienteId });
      await _bitacora('nota', v ? `Asociada a ${_st.datos._empresaLabel}` : 'Se quitó la asociación con el CRM');
    }
    _cerrarModal();
    toast(v ? 'Empresa asociada ✓' : 'Asociación quitada', 'success');
    await render();
  }, { textoGuardar: 'Asociar' });
}

async function _modalSeguimiento() {
  if (!_st.id) await _guardar({ silencioso: true });
  if (!_st.id) { toast('Guarda el diagnóstico antes de programar el seguimiento', 'error'); return; }

  const en7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16);
  _abrirModal('Programar seguimiento', `
    <p class="dct-modal-nota">Se agenda en el calendario del CRM, con el diagnóstico como contexto.</p>
    ${campo('Fecha y hora', `<input id="dctSegFecha" type="datetime-local" value="${esc(en7)}">`, '', { requerido: true })}
    ${campo('Asunto', `<input id="dctSegTitulo" type="text" value="Seguimiento diagnóstico contable — ${esc(_st.datos.razonSocial || '')}">`)}
    ${campo('Notas', `<textarea id="dctSegNotas" rows="3" placeholder="Qué hay que revisar en esa reunión."></textarea>`)}
  `, async () => {
    const fechaHora = _val('dctSegFecha');
    if (!fechaHora) { toast('Indica la fecha y la hora', 'error'); return; }
    // `citas` guarda fecha (date) y hora (time) en columnas SEPARADAS: mandar un
    // timestamp ISO completo en `fecha` perdía la hora de la reunión.
    const [fechaSola, horaSola] = fechaHora.split('T');
    const citaId = await citas.add({
      prospectoId: _st.datos.leadId || null,
      titulo: _val('dctSegTitulo') || 'Seguimiento diagnóstico contable',
      fecha: fechaSola,
      hora: (horaSola || '').slice(0, 5),
      // `tipo` va en minúscula y `estado` capitalizado: así están las 14 filas
      // que ya existen en `citas` (y así las crea modules/modals/modals.js).
      tipo: 'seguimiento',
      estado: 'Confirmada',
      notas: `${_val('dctSegNotas')}\n\nDiagnóstico Contable y Tributario ${_st.datos.codigo || ''}`.trim(),
    });
    await dctDB.update({ id: _st.id, citaId });
    _st.datos.citaId = citaId;
    await _bitacora('seguimiento', `Seguimiento agendado para el ${fechaSola} a las ${(horaSola || '').slice(0, 5)}`);
    _cerrarModal();
    toast('Seguimiento agendado ✓', 'success');
    await render();
  }, { textoGuardar: 'Agendar' });
}

// ── Informe y exportación ────────────────────────────────────────────────────
async function _informe() {
  const calc = _calcular();
  const ejecutivo = _st.cache.perfiles.find((p) => p.id === _st.datos?.ejecutivo);
  const ok = abrirInforme({
    datos: _st.datos || {},
    puntaje: calc.puntaje,
    alertas: calc.alertas,
    recomendacion: calc.recomendacion,
    fortalezas: calc.fortalezas,
    brechas: calc.brechas,
    antecedentes: calc.antecedentes,
    desconocidas: calc.puntaje.desconocidas,
    ejecutivoNombre: ejecutivo?.nombre || S.profile?.nombre || '',
    empresaTriada: (await cfg.get('empresa')) || 'Tríada Consultoría',
  });
  if (!ok) { toast('El navegador bloqueó la ventana del informe. Habilita las ventanas emergentes.', 'error'); return; }
  await _bitacora('informe', 'Informe preliminar generado');
}

async function _informeDe(id) {
  await _abrir(id, 'resultado');
  return _informe();
}

function _exportar() {
  const calc = _calcular();
  const texto = resumenTexto({
    datos: _st.datos || {},
    puntaje: calc.puntaje,
    alertas: calc.alertas,
    recomendacion: calc.recomendacion,
    antecedentes: calc.antecedentes,
  });
  const nombre = `diagnostico-contable-${(_st.datos?.codigo || _st.datos?.razonSocial || 'evaluacion')
    .toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.txt`;
  const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Resumen exportado ✓', 'success');
}
