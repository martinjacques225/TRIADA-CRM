// modules/oportunidades/oportunidades.js — MÓDULO OPORTUNIDADES PÚBLICAS (raíz).
//
// Fase 1 (MVP manual) completa y conectada: bandeja → análisis → puntaje →
// cotización → aprobaciones → oferta → resultado → ejecución → factura → pago →
// certificado, todo sobre Supabase con la RLS multitenant de la casa.
//
// Este archivo es el COMPOSITION ROOT: estado del módulo, carga de datos,
// cableado de eventos y llamadas al dominio. No calcula nada por su cuenta
// (eso vive en domain/, testeado en node) ni arma HTML (eso vive en
// presentation/). Eventos por delegación: cero onclick inline con datos.
//
// Requiere supabase/oportunidades_f1.sql. Si la migración no está aplicada, el
// módulo degrada con gracia y explica qué correr.

import {
  oportunidades as opDB, opActividad, opRequisitos, opRiesgos, opPuntajes, opCostos,
  opCostoItems, opAprobaciones, opPlantillas, opOfertas, opOfertaDocs, opResultados,
  opDocumentos, opProveedorDocs, opConfig, opSyncLogs, profiles, proyectos, isMissingTable,
} from '../../js/db.js';
import { toast, escHtml } from '../../js/utils.js';
import { attachFormatting, parseCLP } from '../../js/format.js';
import { S } from '../../js/state.js';

import { validarTransicion, requiereMotivo, estadoLabel, estaViva } from './domain/estados.js';
import { calcularCotizacion } from './domain/finanzas.js';
import { CRITERIOS, calcularTotal, recomendacion as calcRecomendacion, sugerirPuntajes, preguntasPendientes } from './domain/puntaje.js';
import { detectarCausales, resumenDescarte, validarReapertura, causalLabel } from './domain/descarte.js';
import { aprobacionesRequeridas, estadoAprobacion, puedeAprobar, AREAS } from './domain/aprobaciones.js';
import { generarAlertas, resumenAlertas, diasHastaCierre } from './domain/alertas.js';
import { capacidades } from './domain/permisos.js';
import { calcularEmbudo, calcularMetricas, agrupar, motivosDescarte, motivosPerdida, comparativoPrecios } from './domain/analitica.js';
import { servicioPorSlug, CHECKLIST_OFERTA } from './domain/catalogo.js';
import { codigoDesdeEnlace } from './domain/sincronizacion.js';

import { cargando, bannerSql } from './presentation/ui.js';
import { renderBandeja, formNuevaOportunidad } from './presentation/bandeja.view.js';
import { renderDetalle, formRequisito, formRiesgo, formMotivo, formFirma, formItemCosto, formEditarOportunidad } from './presentation/detalle.view.js';
import { renderResumen, renderPlantillas, formPlantilla, renderProveedor, formProveedorDoc, renderAnalitica, renderConfig } from './presentation/paneles.view.js';

// ── Secciones del módulo (§4 del encargo) ────────────────────────────────────
const SECCIONES = [
  { id: 'resumen',     label: 'Resumen' },
  { id: 'bandeja',     label: 'Bandeja',     estados: ['detectada', 'pendiente_revision', 'descartada', 'descartada_auto'] },
  { id: 'analisis',    label: 'En análisis', estados: ['en_analisis', 'requiere_aclaracion', 'recomendada', 'no_recomendada', 'pendiente_aprobacion'] },
  { id: 'preparacion', label: 'Ofertas en preparación', estados: ['aprobada', 'oferta_preparacion', 'lista_presentar'] },
  { id: 'presentadas', label: 'Presentadas', estados: ['presentada'] },
  { id: 'ejecucion',   label: 'Adjudicaciones y ejecución', estados: ['adjudicada', 'no_adjudicada', 'orden_recibida', 'en_ejecucion', 'recepcion_conforme', 'facturada', 'pagada', 'certificado_solicitado', 'certificado_obtenido', 'cerrada'] },
  { id: 'plantillas',  label: 'Plantillas' },
  { id: 'proveedor',   label: 'Documentos del proveedor' },
  { id: 'analitica',   label: 'Analítica' },
  { id: 'config',      label: 'Configuración' },
];

const SUB = {
  bandeja:     'Todo lo que entró y todavía no se analiza. Descartar rápido es parte del trabajo.',
  analisis:    'Procesos que se están evaluando: requisitos, puntaje y cotización.',
  preparacion: 'Aprobadas y en armado del paquete de antecedentes.',
  presentadas: 'Ofertas ya entregadas en el portal, esperando resultado.',
  ejecucion:   'Después de ganar: orden de compra, ejecución, factura, pago y certificado.',
};

// ── Estado del módulo ────────────────────────────────────────────────────────
const _st = {
  seccion: 'resumen',
  opId: null,
  tab: 'resumen',
  vista: 'tabla',
  page: 0,
  limit: 25,
  filtros: { q: '', estado: '', servicio: '', region: '', unspsc: '', responsable: '', orden: 'cierre' },
  seleccion: new Set(),
  periodo: '',
  cache: { config: null, perfiles: [], plantillas: [] },
  ficha: null,          // datos de la oportunidad abierta
  puntajeEdit: {},      // puntos tipeados y todavía sin guardar
  apCheck: {},          // checklist de aprobación marcado en pantalla
  debounce: null,
};

const $ = (id) => document.getElementById(id);
const _val = (id) => ($(id)?.value ?? '').trim();
const _num = (id) => { const v = _val(id); return v === '' ? null : Number(v); };
const _clp = (id) => { const v = _val(id); return v === '' ? null : parseCLP(v); };
const _caps = () => capacidades(S.profile);
const _hoy = () => Date.now();

// ═════════════════════════════════════════════════════════════════════════════
// RENDER
// ═════════════════════════════════════════════════════════════════════════════
export async function render() {
  const center = document.getElementById('center');
  center.innerHTML = `<div class="view-animate oportunidades-view">${cargando('Cargando oportunidades…')}</div>`;

  try {
    await _cargarComunes();
  } catch (err) {
    if (isMissingTable(err)) {
      center.innerHTML = `<div class="view-animate oportunidades-view">${bannerSql(err?.message || '')}</div>`;
      return;
    }
    console.error('[oportunidades] carga inicial', err);
    center.innerHTML = `<div class="view-animate oportunidades-view">${bannerSql(err?.message || 'Error desconocido')}</div>`;
    return;
  }

  try {
    const cuerpo = _st.opId ? await _cuerpoFicha() : await _cuerpoSeccion();
    center.innerHTML = `<div class="view-animate oportunidades-view">${_st.opId ? '' : _nav()}${cuerpo}</div>`;
    _wire(center.querySelector('.oportunidades-view'));
    attachFormatting(center);
  } catch (err) {
    console.error('[oportunidades] render', err);
    center.innerHTML = `<div class="view-animate oportunidades-view">${_nav()}
      <div class="op-banner op-banner--warn">No se pudo cargar esta sección: ${escHtml(err?.message || 'error desconocido')}</div></div>`;
    _wire(center.querySelector('.oportunidades-view'));
  }
}

function _nav() {
  return `<div class="op-nav">${SECCIONES.map((s) =>
    `<button class="op-nav__item${s.id === _st.seccion ? ' is-active' : ''}" data-op="seccion" data-seccion="${s.id}">${escHtml(s.label)}</button>`).join('')}</div>`;
}

async function _cargarComunes() {
  const [config, perfiles, plantillas] = await Promise.all([
    opConfig.get(),
    profiles.getAll().catch(() => []),
    opPlantillas.getAll().catch(() => []),
  ]);
  _st.cache = { config: config || {}, perfiles, plantillas };
}

// ── Cuerpo de cada sección ───────────────────────────────────────────────────
async function _cuerpoSeccion() {
  const caps = _caps();
  const sec = SECCIONES.find((s) => s.id === _st.seccion) || SECCIONES[0];

  if (sec.id === 'resumen')    return _cuerpoResumen(caps);
  if (sec.id === 'plantillas') return renderPlantillas({ plantillas: _st.cache.plantillas, caps });
  if (sec.id === 'proveedor')  return renderProveedor({ docs: await opProveedorDocs.getAll(), caps, ahora: _hoy() });
  if (sec.id === 'analitica')  return _cuerpoAnalitica();
  if (sec.id === 'config')     return renderConfig({ config: _st.cache.config, caps, syncLogs: await opSyncLogs.ultimos(10).catch(() => []) });

  // Secciones de lista (bandeja, análisis, preparación, presentadas, ejecución)
  const estados = _st.filtros.estado ? [_st.filtros.estado] : sec.estados;
  const { rows, total } = await opDB.page({
    limit: _st.limit, offset: _st.page * _st.limit, estados,
    q: _st.filtros.q, region: _st.filtros.region, servicio: _st.filtros.servicio,
    responsable: _st.filtros.responsable, unspsc: _st.filtros.unspsc, orden: _st.filtros.orden,
  });

  // Alertas solo de lo que está en pantalla (no se trae la tabla entera).
  const alertas = generarAlertas({ oportunidades: rows, ahora: _hoy(), horasMaxCotizacion: _st.cache.config.horasMaxCotizacion });
  const alertasPorOp = {};
  alertas.forEach((a) => { if (a.opId) (alertasPorOp[a.opId] = alertasPorOp[a.opId] || []).push(a); });

  return renderBandeja({
    titulo: sec.label, subtitulo: SUB[sec.id] || '',
    rows, total, page: _st.page, limit: _st.limit, filtros: _st.filtros,
    config: _st.cache.config, perfiles: _st.cache.perfiles, seleccion: _st.seleccion,
    ahora: _hoy(), vista: _st.vista, estadosVisibles: sec.estados || [],
    puedeEditar: caps.editar, alertasPorOp,
  });
}

async function _cuerpoResumen(caps) {
  const [todas, resultados, docsProv] = await Promise.all([
    opDB.getAll(), opResultados.getAll().catch(() => []), opProveedorDocs.getAll().catch(() => []),
  ]);
  const resultadosPorOp = Object.fromEntries(resultados.map((r) => [r.oportunidadId, r]));
  const alertas = generarAlertas({
    oportunidades: todas, resultadosPorOp, docsProveedor: docsProv,
    ahora: _hoy(), horasMaxCotizacion: _st.cache.config.horasMaxCotizacion,
  });
  const proximas = todas
    .filter((o) => estaViva(o.estado) && o.fechaCierre && new Date(o.fechaCierre) >= _hoy())
    .sort((a, b) => new Date(a.fechaCierre) - new Date(b.fechaCierre));

  return renderResumen({
    metricas: calcularMetricas({ oportunidades: todas, resultados, cotizaciones: {} }),
    alertas, resumenAlertas: resumenAlertas(alertas), proximas,
    caps, config: _st.cache.config, ahora: _hoy(),
  });
}

async function _cuerpoAnalitica() {
  const [todas, resultados] = await Promise.all([opDB.getAll(), opResultados.getAll().catch(() => [])]);

  const corte = _st.periodo ? _hoy() - Number(_st.periodo) * 86400000 : null;
  const ops = corte ? todas.filter((o) => new Date(o.createdAt).getTime() >= corte) : todas;
  const ids = ops.map((o) => o.id);
  const res = resultados.filter((r) => ids.includes(r.oportunidadId));

  // Cotizaciones: se calculan con el dominio a partir de los costos guardados.
  const costos = await opCostos.byOportunidades(ids).catch(() => []);
  const items = await opCostoItems.byCostos(costos.map((c) => c.id)).catch(() => []);
  const cotizaciones = {};
  costos.forEach((c) => {
    cotizaciones[c.oportunidadId] = calcularCotizacion({
      items: items.filter((it) => it.costoId === c.id),
      margenObjetivo: c.margenObjetivo, contingenciaPct: c.contingenciaPct,
      costosAdminPct: c.costosAdminPct, ivaTasa: c.ivaTasa, precioOfertado: c.precioOfertado,
      presupuestoComprador: c.presupuestoComprador, diasPagoEstimados: c.diasPagoEstimados,
    });
  });

  const riesgos = ids.length ? await opRiesgos.byOportunidades(ids).catch(() => []) : [];
  const titulos = Object.fromEntries(ops.map((o) => [o.id, o.titulo]));

  return renderAnalitica({
    metricas: calcularMetricas({ oportunidades: ops, resultados: res, cotizaciones }),
    embudo: calcularEmbudo(ops, res),
    porServicio: agrupar(ops, 'servicioSlug', { cotizaciones }),
    porInstitucion: agrupar(ops, 'institucion', { cotizaciones }),
    porUnspsc: agrupar(ops, 'unspsc', { cotizaciones }),
    motivosDesc: motivosDescarte(ops, riesgos),
    motivosPerd: motivosPerdida(res),
    precios: comparativoPrecios(res, cotizaciones).map((p) => ({ ...p, titulo: titulos[p.oportunidadId] })),
    filtros: { periodo: _st.periodo },
  });
}

// ── Ficha ────────────────────────────────────────────────────────────────────
async function _cargarFicha(opId) {
  const op = await opDB.get(opId);
  const [requisitos, riesgos, puntajes, aprobaciones, documentos, actividad, ofertas, resultado] = await Promise.all([
    opRequisitos.byOportunidad(opId), opRiesgos.byOportunidad(opId), opPuntajes.byOportunidad(opId),
    opAprobaciones.byOportunidad(opId), opDocumentos.byOportunidad(opId), opActividad.byOportunidad(opId),
    opOfertas.byOportunidad(opId), opResultados.byOportunidad(opId),
  ]);
  const costo = await opCostos.byOportunidad(opId);
  const items = costo ? await opCostoItems.byCosto(costo.id) : [];
  const oferta = ofertas.find((o) => o.estado !== 'reemplazada') || null;
  const ofertaDocs = oferta ? await opOfertaDocs.byOferta(oferta.id) : [];

  _st.ficha = { op, requisitos, riesgos, puntajes, aprobaciones, documentos, actividad, ofertas, oferta, ofertaDocs, costo, items, resultado };
  return _st.ficha;
}

/** Todo lo derivado de la ficha: cotización, causales, sugerencias, veredicto. */
function _derivar(f) {
  const cfg = _st.cache.config || {};
  const calculo = calcularCotizacion({
    items: f.items,
    margenObjetivo: f.costo?.margenObjetivo ?? cfg.margenObjetivo ?? 0.30,
    contingenciaPct: f.costo?.contingenciaPct ?? cfg.contingenciaPct ?? 0.10,
    costosAdminPct: f.costo?.costosAdminPct ?? 0,
    ivaTasa: f.costo?.ivaTasa ?? cfg.ivaTasa ?? 0.19,
    precioOfertado: f.costo?.precioOfertado ?? null,
    presupuestoComprador: f.costo?.presupuestoComprador ?? f.op.presupuestoMonto,
    presupuestoIncluyeIva: f.op.presupuestoIva,
    diasPagoEstimados: f.costo?.diasPagoEstimados ?? 30,
    topeTresSocios: cfg.topeAprobacionNeto ?? 2500000,
    margenDescarte: cfg.margenDescarte ?? 0.25,
  });

  const dias = diasHastaCierre(f.op.fechaCierre, _hoy());
  const causales = detectarCausales({
    requisitos: f.requisitos,
    margenReal: calculo.margenReal,
    margenDescarte: cfg.margenDescarte ?? 0.25,
    diasHastaCierre: dias,
    riesgosDeclarados: f.riesgos.filter((r) => r.esCausal),
  });

  const servicio = servicioPorSlug(f.op.servicioSlug);
  const sugerencias = sugerirPuntajes({
    servicioSlug: f.op.servicioSlug, servicio,
    unspscOportunidad: f.op.unspsc || [], unspscVigilados: cfg.unspsc || [],
    requisitos: f.requisitos, margenReal: calculo.margenReal,
    diasHastaCierre: dias, horasEstimadas: calculo.totalHoras,
    riesgos: f.riesgos, montoNeto: calculo.precioNeto,
    semanasEjecucion: servicio ? servicio.semanas[1] : null,
  });

  const totalPuntaje = calcularTotal(f.puntajes);
  const recomendacion = calcRecomendacion(totalPuntaje.total, {
    hayCausalCritica: causales.length > 0,
    umbralParticipar: cfg.puntajeParticipar ?? 70,
    umbralRevisar: cfg.puntajeRevisar ?? 55,
  });

  const requeridas = aprobacionesRequeridas({
    margenReal: calculo.margenReal, precioNeto: calculo.precioNeto,
    tieneSubcontrato: calculo.tieneSubcontrato,
    riesgoAlto: f.riesgos.some((r) => r.nivel === 'alto' || r.nivel === 'critico'),
    topeTresSocios: cfg.topeAprobacionNeto ?? 2500000,
    margenObjetivo: cfg.margenObjetivo ?? 0.30,
  });

  return {
    calculo, causales, sugerencias, totalPuntaje, recomendacion, requeridas,
    aprobEstado: estadoAprobacion(f.aprobaciones, requeridas.areas),
    preguntas: preguntasPendientes(sugerencias),
  };
}

async function _cuerpoFicha() {
  const f = await _cargarFicha(_st.opId);
  const d = _derivar(f);

  // El nombre del proyecto vinculado se pide solo si hace falta mostrarlo: un id
  // crudo en pantalla no le dice nada a nadie.
  let proyectoNombre = '';
  if (f.resultado?.proyectoId) {
    try { proyectoNombre = (await proyectos.get(f.resultado.proyectoId))?.nombre || ''; }
    catch (err) { console.warn('[oportunidades] no se pudo leer el proyecto vinculado:', err?.message || err); }
  }

  return renderDetalle({
    ...f, ...d, tab: _st.tab, caps: _caps(), perfiles: _st.cache.perfiles,
    plantillas: _st.cache.plantillas, config: _st.cache.config, ahora: _hoy(),
    docsProveedor: [], proyectoNombre,
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// EVENTOS — un listener por tipo en la raíz del módulo (delegación)
// ═════════════════════════════════════════════════════════════════════════════
function _wire(root) {
  if (!root) return;
  root.addEventListener('click', _onClick);
  root.addEventListener('change', _onChange);
  root.addEventListener('input', _onInput);
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.id === 'opQ') { e.preventDefault(); _recargarLista(); }
  });
}

async function _onClick(e) {
  const btn = e.target.closest('[data-op]');
  if (!btn) return;
  const act = btn.getAttribute('data-op');
  const id = btn.getAttribute('data-id');

  try {
    switch (act) {
      case 'seccion':  _st.seccion = btn.getAttribute('data-seccion'); _st.page = 0; _st.opId = null; _st.seleccion.clear(); return render();
      case 'vista':    _st.vista = btn.getAttribute('data-vista'); return render();
      case 'abrir':    _st.opId = id; _st.tab = 'resumen'; _st.puntajeEdit = {}; _st.apCheck = {}; return render();
      case 'volver':   _st.opId = null; _st.ficha = null; return render();
      case 'tab':      _st.tab = btn.getAttribute('data-tab'); return render();
      case 'pag':      _st.page = Math.max(0, _st.page + Number(btn.getAttribute('data-dir'))); return render();
      case 'limpiar-filtros': _st.filtros = { q: '', estado: '', servicio: '', region: '', unspsc: '', responsable: '', orden: 'cierre' }; _st.page = 0; return render();
      case 'nueva':    return _modalNueva();
      case 'editar':   return _modalEditar();
      case 'tiempo':   return _modalTiempo();
      case 'mover':    return _moverEstado();
      case 'descartar': return _descartarConCausales();
      case 'bulk-descartar': return _descartarSeleccion();
      case 'bulk-limpiar': _st.seleccion.clear(); return render();
      case 'add-req':  return _modalRequisito();
      case 'del-req':  return _borrar('requisito', () => opRequisitos.delete(id));
      case 'req-confirmar': return _confirmarRequisito(id);
      case 'add-riesgo': return _modalRiesgo();
      case 'del-riesgo': return _borrar('riesgo', () => opRiesgos.delete(id));
      case 'aplicar-sugerencias': return _aplicarSugerencias();
      case 'guardar-puntaje': return _guardarPuntaje();
      case 'add-item': return _modalItem();
      case 'del-item': return _borrar('línea', () => opCostoItems.delete(id));
      case 'usar-plantilla': return _modalPlantillaCopiar();
      case 'guardar-costos': return _guardarCostos();
      case 'ap-firmar': return _modalFirma(btn.getAttribute('data-area'), btn.getAttribute('data-decision'));
      case 'ap-rehacer': return _modalFirma(btn.getAttribute('data-area'), 'aprueba');
      case 'crear-oferta': return _crearOferta();
      case 'oferta-lista': return _marcarOfertaLista();
      case 'oferta-presentada': return _marcarPresentada();
      case 'oferta-nueva-version': return _nuevaVersionOferta();
      case 'copiar-texto': return _copiarTextoOferta();
      case 'guardar-resultado': return _guardarResultado();
      case 'crear-proyecto': return _crearProyecto();
      case 'add-enlace': return _modalEnlace();
      case 'ver-doc':  return _abrirArchivo(btn.getAttribute('data-path'), opDocumentos);
      case 'del-doc':  return _borrar('documento', () => opDocumentos.delete(id, btn.getAttribute('data-path') || null));
      case 'plantilla-nueva':  return _modalPlantilla(null);
      case 'plantilla-editar': return _modalPlantilla(_st.cache.plantillas.find((p) => p.id === id));
      case 'doc-nuevo':   return _modalProveedorDoc(null);
      case 'prov-editar': return _modalProveedorDoc(id);
      case 'prov-borrar': return _borrar('documento', () => opProveedorDocs.delete(id, btn.getAttribute('data-path') || null));
      case 'prov-ver':    return _abrirArchivo(btn.getAttribute('data-path'), opProveedorDocs);
      case 'guardar-config': return _guardarConfig();
      default: return undefined;
    }
  } catch (err) {
    console.error(`[oportunidades] acción ${act}`, err);
    toast(err?.message || 'No se pudo completar la acción', 'error');
  }
  return undefined;
}

async function _onChange(e) {
  const el = e.target;
  const act = el.getAttribute('data-op');

  // Filtros de la lista
  if (['opFEstado', 'opFServicio', 'opFRegion', 'opFUnspsc', 'opFResp', 'opFOrden'].includes(el.id)) {
    const mapa = { opFEstado: 'estado', opFServicio: 'servicio', opFRegion: 'region', opFUnspsc: 'unspsc', opFResp: 'responsable', opFOrden: 'orden' };
    _st.filtros[mapa[el.id]] = el.value;
    _st.page = 0;
    return render();
  }
  if (el.id === 'opAPeriodo') { _st.periodo = el.value; return render(); }

  try {
    if (act === 'sel') {
      if (el.checked) _st.seleccion.add(el.getAttribute('data-id'));
      else _st.seleccion.delete(el.getAttribute('data-id'));
      return render();
    }
    if (act === 'sel-todos') {
      const cbs = document.querySelectorAll('[data-op="sel"]');
      cbs.forEach((c) => { if (el.checked) _st.seleccion.add(c.getAttribute('data-id')); else _st.seleccion.delete(c.getAttribute('data-id')); });
      return render();
    }
    if (act === 'req-cumple') {
      await opRequisitos.update({ id: el.getAttribute('data-id'), cumple: el.value });
      toast('Requisito actualizado', 'success');
      return render();
    }
    if (act === 'oferta-doc') {
      await opOfertaDocs.update({ id: el.getAttribute('data-id'), estado: el.value });
      return render();
    }
    if (act === 'ap-check') {
      const area = el.getAttribute('data-area');
      const idx = el.getAttribute('data-idx');
      _st.apCheck[area] = { ...(_st.apCheck[area] || {}), [idx]: el.checked };
      return undefined;   // no re-render: se pierde el foco del checklist
    }
    if (act === 'subir-doc') return _subirDocumentos(el);
    if (act === 'prov-subir') return _subirDocProveedor(el);
  } catch (err) {
    console.error('[oportunidades] change', err);
    toast(err?.message || 'No se pudo guardar el cambio', 'error');
  }
  return undefined;
}

function _onInput(e) {
  const el = e.target;
  if (el.id === 'opQ') {
    clearTimeout(_st.debounce);
    _st.debounce = setTimeout(() => { _st.filtros.q = el.value.trim(); _st.page = 0; render(); }, 400);
    return;
  }
  if (el.getAttribute('data-op') === 'punt') {
    _st.puntajeEdit[el.getAttribute('data-criterio')] = el.value;
  }
}

function _recargarLista() {
  clearTimeout(_st.debounce);
  _st.filtros.q = ($('opQ')?.value || '').trim();
  _st.page = 0;
  return render();
}

// ═════════════════════════════════════════════════════════════════════════════
// MODAL — se reusa el modal global del CRM
// ═════════════════════════════════════════════════════════════════════════════
function _abrirModal(titulo, cuerpo, onSave, { textoGuardar = 'Guardar', ancho = '' } = {}) {
  $('modalTitle').textContent = titulo;
  document.querySelector('.modal-box').className = 'modal-box' + (ancho ? ` modal-${ancho}` : '');
  $('modalBody').innerHTML = cuerpo;
  const save = $('modalSave');
  save.style.display = onSave ? '' : 'none';
  save.textContent = textoGuardar;
  save.onclick = onSave ? async () => {
    save.disabled = true;
    try { await onSave(); } catch (err) {
      console.error('[oportunidades] modal', err);
      toast(err?.message || 'No se pudo guardar', 'error');
    } finally { save.disabled = false; }
  } : null;
  $('modalOverlay').classList.add('open');
  attachFormatting($('modalBody'));
}

function _cerrarModal() {
  $('modalOverlay').classList.remove('open');
  $('modalSave').textContent = 'Guardar';
}

// ═════════════════════════════════════════════════════════════════════════════
// ACCIONES
// ═════════════════════════════════════════════════════════════════════════════

async function _registrarActividad(opId, accion, extra = {}) {
  try { await opActividad.add({ oportunidadId: opId, accion, ...extra }); }
  catch (err) { console.warn('[oportunidades] no se pudo registrar la actividad:', err?.message || err); }
}

// ── Alta manual ──────────────────────────────────────────────────────────────
function _modalNueva() {
  _abrirModal('Nueva oportunidad', formNuevaOportunidad(_st.cache.config), async () => {
    const titulo = _val('opNTitulo');
    if (!titulo) { toast('El título es obligatorio', 'error'); return; }

    const enlace = _val('opNEnlace');
    const codigo = _val('opNCodigo') || codigoDesdeEnlace(enlace) || '';
    const cierre = _val('opNCierre');

    const id = await opDB.add({
      fuente: _val('opNFuente') || 'manual',
      codigoExterno: codigo,
      titulo,
      institucion: _val('opNInstitucion'),
      tipoProcedimiento: _val('opNTipo'),
      descripcion: _val('opNDesc'),
      fechaPublicacion: _val('opNPub') || null,
      fechaCierre: cierre ? new Date(cierre).toISOString() : null,
      region: _val('opNRegion'),
      modalidad: _val('opNModalidad'),
      presupuestoMonto: _clp('opNMonto'),
      presupuestoIva: _val('opNIva') || 'desconocido',
      servicioSlug: _val('opNServicio'),
      unspsc: _val('opNUnspsc').split(',').map((s) => s.trim()).filter(Boolean),
      enlace,
      estado: 'pendiente_revision',
    });

    await _registrarActividad(id, 'Oportunidad creada manualmente', { estadoNuevo: 'pendiente_revision' });
    _cerrarModal();
    toast('Oportunidad creada', 'success');
    _st.opId = id; _st.tab = 'resumen';
    await render();
  }, { textoGuardar: 'Crear' });
}

function _modalEditar() {
  const op = _st.ficha?.op;
  if (!op) return;
  _abrirModal('Editar oportunidad', formEditarOportunidad(op, _st.cache.perfiles), async () => {
    const titulo = _val('opETitulo');
    if (!titulo) { toast('El título es obligatorio', 'error'); return; }
    const cierre = _val('opECierre');
    await opDB.update({
      id: op.id, titulo,
      institucion: _val('opEInstitucion'),
      codigoExterno: _val('opECodigo'),
      tipoProcedimiento: _val('opETipo'),
      region: _val('opERegion'),
      fechaCierre: cierre ? new Date(cierre).toISOString() : null,
      modalidad: _val('opEModalidad'),
      presupuestoMonto: _clp('opEMonto'),
      presupuestoIva: _val('opEIva'),
      servicioSlug: _val('opEServicio'),
      responsable: _val('opEResp') || null,
      unspsc: _val('opEUnspsc').split(',').map((s) => s.trim()).filter(Boolean),
      enlace: _val('opEEnlace'),
      descripcion: _val('opEDesc'),
      notas: _val('opENotas'),
    });
    await _registrarActividad(op.id, 'Datos del proceso actualizados');
    _cerrarModal();
    toast('Oportunidad actualizada', 'success');
    await render();
  });
}

function _modalTiempo() {
  const op = _st.ficha?.op;
  if (!op) return;
  _abrirModal('Registrar tiempo invertido', `
    <p class="op-mute" style="margin-bottom:12px">Acumulado: ${Math.round((op.tiempoInvertidoMin || 0) / 6) / 10} h.
    El objetivo es no pasar de 2 horas por cotización.</p>
    <div class="form-group"><label>Minutos a sumar</label>
      <input id="opTMin" type="number" min="1" step="5" value="15"></div>`, async () => {
    const min = Number(_val('opTMin')) || 0;
    if (min <= 0) { toast('Indica los minutos', 'error'); return; }
    await opDB.update({ id: op.id, tiempoInvertidoMin: (op.tiempoInvertidoMin || 0) + min });
    await _registrarActividad(op.id, `Se registraron ${min} minutos de trabajo`);
    _cerrarModal();
    await render();
  });
}

// ── Cambio de estado ─────────────────────────────────────────────────────────
async function _moverEstado() {
  const op = _st.ficha?.op;
  const destino = _val('opNuevoEstado');
  if (!op || !destino) { toast('Elige el estado de destino', 'info'); return; }

  // Guardas del dominio ANTES de tocar la base.
  if (destino === 'aprobada') {
    const v = puedeAprobar(_st.ficha.aprobaciones);
    if (!v.ok) { toast(v.error, 'error'); return; }
  }
  if (destino === 'lista_presentar') {
    const faltan = (_st.ficha.ofertaDocs || []).filter((d) => d.obligatorio && d.estado === 'pendiente');
    if (!_st.ficha.oferta) { toast('Primero crea el paquete de oferta', 'error'); return; }
    if (faltan.length) { toast(`Faltan ${faltan.length} documento(s) obligatorio(s)`, 'error'); return; }
  }

  const pideMotivo = requiereMotivo(op.estado, destino);
  const aplicar = async (motivo) => {
    const v = validarTransicion(op.estado, destino, { motivo });
    if (!v.ok) { toast(v.error, 'error'); return; }

    // Reabrir una descartada exige justificación de verdad, no un "ok".
    if ((op.estado === 'descartada' || op.estado === 'descartada_auto')) {
      const r = validarReapertura(motivo);
      if (!r.ok) { toast(r.error, 'error'); return; }
    }

    const patch = { id: op.id, estado: destino };
    if (destino === 'descartada' || destino === 'descartada_auto') patch.motivoDescarte = motivo;
    if (op.estado === 'descartada' || op.estado === 'descartada_auto') patch.motivoReapertura = motivo;
    await opDB.update(patch);
    await _registrarActividad(op.id, 'Cambio de estado', { estadoAnterior: op.estado, estadoNuevo: destino, comentario: motivo || '' });
    _cerrarModal();
    toast(`Estado: ${estadoLabel(destino)}`, 'success');
    await render();
  };

  if (pideMotivo) {
    _abrirModal(`Mover a "${estadoLabel(destino)}"`,
      formMotivo('Motivo', 'Queda en el historial y alimenta la analítica de descartes.'),
      () => aplicar(_val('opMotivo')), { textoGuardar: 'Confirmar' });
  } else {
    await aplicar('');
  }
}

function _descartarConCausales() {
  const f = _st.ficha;
  if (!f) return;
  const d = _derivar(f);
  const resumen = resumenDescarte(d.causales);
  _abrirModal('Descartar oportunidad', `
    <p class="op-mute" style="margin-bottom:10px">Se registrará este motivo. Después se puede reabrir, pero exige una justificación escrita.</p>
    <div class="form-group"><label>Motivo</label><textarea id="opMotivo" rows="4">${escHtml(resumen)}</textarea></div>`,
  async () => {
    const motivo = _val('opMotivo');
    if (!motivo) { toast('Escribe el motivo', 'error'); return; }
    const destino = d.causales.some((c) => c.origen === 'sistema') ? 'descartada_auto' : 'descartada';
    const v = validarTransicion(f.op.estado, destino, { motivo });
    if (!v.ok) { toast(v.error, 'error'); return; }
    await opDB.update({ id: f.op.id, estado: destino, motivoDescarte: motivo, recomendacion: 'no_participar' });
    await _registrarActividad(f.op.id, 'Descartada', { estadoAnterior: f.op.estado, estadoNuevo: destino, comentario: motivo });
    _cerrarModal();
    toast('Oportunidad descartada', 'info');
    _st.opId = null;
    await render();
  }, { textoGuardar: 'Descartar' });
}

function _descartarSeleccion() {
  const ids = [..._st.seleccion];
  if (!ids.length) return;
  _abrirModal(`Descartar ${ids.length} oportunidad(es)`,
    formMotivo('Motivo del descarte', 'El mismo motivo se registra en todas las seleccionadas.'),
    async () => {
      const motivo = _val('opMotivo');
      if (!motivo) { toast('Escribe el motivo', 'error'); return; }
      let ok = 0; const errores = [];
      for (const id of ids) {
        try {
          await opDB.update({ id, estado: 'descartada', motivoDescarte: motivo, recomendacion: 'no_participar' });
          await _registrarActividad(id, 'Descartada en lote', { estadoNuevo: 'descartada', comentario: motivo });
          ok++;
        } catch (err) { errores.push(err?.message || 'error'); }
      }
      _st.seleccion.clear();
      _cerrarModal();
      if (errores.length) toast(`${ok} descartadas, ${errores.length} con error`, 'error');
      else toast(`${ok} oportunidad(es) descartada(s)`, 'success');
      await render();
    }, { textoGuardar: 'Descartar' });
}

// ── Requisitos y riesgos ─────────────────────────────────────────────────────
function _modalRequisito() {
  _abrirModal('Agregar requisito', formRequisito(), async () => {
    const texto = _val('opRTexto');
    if (!texto) { toast('Escribe el requisito', 'error'); return; }
    await opRequisitos.add({
      oportunidadId: _st.opId, texto, tipo: _val('opRTipo'),
      obligatorio: _val('opROblig') === 'si', fuenteSeccion: _val('opRFuente'),
      evidencia: _val('opREvidencia'), origen: 'manual',
    });
    await _registrarActividad(_st.opId, 'Requisito agregado', { comentario: texto.slice(0, 120) });
    _cerrarModal();
    toast('Requisito agregado', 'success');
    await render();
  });
}

async function _confirmarRequisito(id) {
  const req = _st.ficha?.requisitos.find((r) => r.id === id);
  if (!req) return;
  if (req.cumple === 'no_evaluado') { toast('Primero indica si cumplimos el requisito', 'error'); return; }
  await opRequisitos.update({ id, confirmadoPor: S.profile?.id || null, confirmadoAt: new Date().toISOString() });
  await _registrarActividad(_st.opId, 'Requisito confirmado', { comentario: req.texto.slice(0, 120) });
  toast('Requisito confirmado', 'success');
  await render();
}

function _modalRiesgo() {
  _abrirModal('Registrar riesgo o causal', formRiesgo(), async () => {
    const desc = _val('opRgDesc');
    if (!desc) { toast('Describe el riesgo', 'error'); return; }
    const causal = _val('opRgCausal');
    await opRiesgos.add({
      oportunidadId: _st.opId, causal, descripcion: desc,
      nivel: causal ? 'critico' : _val('opRgNivel'), esCausal: !!causal,
      mitigacion: _val('opRgMit'), origen: 'manual',
    });
    await _registrarActividad(_st.opId, causal ? `Causal crítica: ${causalLabel(causal)}` : 'Riesgo registrado', { comentario: desc.slice(0, 120) });
    _cerrarModal();
    toast('Riesgo registrado', 'success');
    await render();
  });
}

// ── Puntaje ──────────────────────────────────────────────────────────────────
async function _aplicarSugerencias() {
  const f = _st.ficha;
  const d = _derivar(f);
  const conDato = d.sugerencias.filter((s) => s.sugerido != null);
  if (!conDato.length) { toast('Todavía no hay datos suficientes para sugerir ningún criterio', 'info'); return; }

  for (const s of conDato) {
    await opPuntajes.guardar({
      oportunidadId: f.op.id, criterio: s.criterio, puntos: s.sugerido,
      puntosMax: s.max, sugerido: s.sugerido, justificacion: s.justificacion,
      datos: s.datos || null, manual: false, motivoManual: null,
    });
  }
  await _recalcularPuntajeOportunidad();
  toast(`${conDato.length} criterio(s) aplicados`, 'success');
  await render();
}

async function _guardarPuntaje() {
  const f = _st.ficha;
  const d = _derivar(f);
  const pendientes = Object.entries(_st.puntajeEdit).filter(([, v]) => v !== '' && v != null);
  if (!pendientes.length) { toast('No hay cambios que guardar', 'info'); return; }

  // Si el valor difiere de la sugerencia, el motivo es obligatorio (y la base
  // también lo exige: op_puntajes_motivo_ck).
  const manuales = pendientes.filter(([crit, val]) => {
    const s = d.sugerencias.find((x) => x.criterio === crit);
    return s?.sugerido == null || Number(val) !== Number(s.sugerido);
  });

  const grabar = async (motivo) => {
    for (const [criterio, valor] of pendientes) {
      const meta = CRITERIOS.find((c) => c.id === criterio);
      const sug = d.sugerencias.find((x) => x.criterio === criterio);
      const esManual = sug?.sugerido == null || Number(valor) !== Number(sug.sugerido);
      await opPuntajes.guardar({
        oportunidadId: f.op.id, criterio, puntos: Math.max(0, Math.min(meta.max, Number(valor) || 0)),
        puntosMax: meta.max, sugerido: sug?.sugerido ?? null,
        justificacion: sug?.justificacion || '', datos: sug?.datos || null,
        manual: esManual, motivoManual: esManual ? motivo : null,
      });
    }
    _st.puntajeEdit = {};
    await _recalcularPuntajeOportunidad();
    _cerrarModal();
    toast('Marcador guardado', 'success');
    await render();
  };

  if (manuales.length) {
    _abrirModal('Motivo del ajuste manual',
      formMotivo('¿Por qué cambias el puntaje sugerido?', `Afecta a ${manuales.length} criterio(s). Queda registrado con tu nombre.`),
      () => {
        const m = _val('opMotivo');
        if (!m) { toast('El motivo es obligatorio', 'error'); return Promise.resolve(); }
        return grabar(m);
      }, { textoGuardar: 'Guardar marcador' });
  } else {
    await grabar(null);
  }
}

/** Recalcula el total y el veredicto y los deja en la oportunidad (para la lista). */
async function _recalcularPuntajeOportunidad() {
  const cfg = _st.cache.config || {};
  const puntajes = await opPuntajes.byOportunidad(_st.opId);
  const f = _st.ficha;
  const total = calcularTotal(puntajes);
  const causales = _derivar({ ...f, puntajes }).causales;
  const rec = calcRecomendacion(total.total, {
    hayCausalCritica: causales.length > 0,
    umbralParticipar: cfg.puntajeParticipar ?? 70,
    umbralRevisar: cfg.puntajeRevisar ?? 55,
  });
  await opDB.update({ id: _st.opId, puntaje: total.total, recomendacion: rec.valor });
}

// ── Financiero ───────────────────────────────────────────────────────────────
async function _asegurarCosto() {
  const cfg = _st.cache.config || {};
  if (_st.ficha.costo) return _st.ficha.costo;
  const costo = await opCostos.crearSiFalta(_st.opId, {
    margenObjetivo: cfg.margenObjetivo ?? 0.30,
    contingenciaPct: cfg.contingenciaPct ?? 0.10,
    ivaTasa: cfg.ivaTasa ?? 0.19,
    presupuestoComprador: _st.ficha.op.presupuestoMonto ?? null,
  });
  _st.ficha.costo = costo;
  return costo;
}

function _modalItem() {
  _abrirModal('Agregar línea de costo', formItemCosto(_st.cache.perfiles), async () => {
    const costo = await _asegurarCosto();
    const tipo = _val('opIT');
    const horas = _num('opIHoras');
    const valorHora = _clp('opIValor');
    const monto = _clp('opIMonto');
    if (tipo === 'hora' && (!horas || !valorHora)) { toast('Para una línea de horas hacen falta las horas y el valor por hora', 'error'); return; }
    if (tipo !== 'hora' && !monto) { toast('Indica el monto de la línea', 'error'); return; }

    await opCostoItems.add({
      costoId: costo.id, tipo, descripcion: _val('opIDesc'),
      rol: _val('opIRol'), profileId: _val('opIPersona') || null,
      horas, valorHora, monto, diasAntesPago: Number(_val('opIDias')) || 0,
    });
    _cerrarModal();
    toast('Línea agregada', 'success');
    await render();
  });
}

function _modalPlantillaCopiar() {
  const tpls = _st.cache.plantillas.filter((p) => p.activo);
  if (!tpls.length) { toast('No hay plantillas activas', 'info'); return; }
  _abrirModal('Copiar horas desde una plantilla', `
    <p class="op-mute" style="margin-bottom:12px">Se copian las horas por rol de la plantilla como líneas nuevas.
    La plantilla original no se modifica.</p>
    <div class="form-group"><label>Plantilla</label>
      <select id="opTplPick">${tpls.map((t) => `<option value="${escHtml(t.id)}">${escHtml(t.nombre)}</option>`).join('')}</select></div>`,
  async () => {
    const tpl = tpls.find((t) => t.id === _val('opTplPick'));
    if (!tpl) return;
    const costo = await _asegurarCosto();
    const roles = tpl.horasPorRol || [];
    if (!roles.length) { toast('Esa plantilla no tiene horas cargadas', 'info'); return; }
    for (const [idx, h] of roles.entries()) {
      await opCostoItems.add({
        costoId: costo.id, tipo: 'hora', descripcion: `${tpl.nombre} — ${h.rol}`,
        rol: h.rol, horas: Number(h.horas) || 0, valorHora: Number(h.valorHora) || 0, orden: idx,
      });
    }
    if (tpl.margenEsperado) await opCostos.update({ id: costo.id, margenObjetivo: tpl.margenEsperado });
    await _registrarActividad(_st.opId, `Cotización basada en la plantilla "${tpl.nombre}"`);
    _cerrarModal();
    toast(`${roles.length} línea(s) copiadas`, 'success');
    await render();
  }, { textoGuardar: 'Copiar' });
}

async function _guardarCostos() {
  const costo = await _asegurarCosto();
  const pct = (id, def) => { const v = _num(id); return v == null ? def : Math.max(0, Math.min(95, v)) / 100; };
  await opCostos.update({
    id: costo.id,
    margenObjetivo: pct('opFMargen', 0.30),
    contingenciaPct: pct('opFCont', 0.10),
    costosAdminPct: pct('opFAdmin', 0),
    ivaTasa: pct('opFIva', 0.19),
    presupuestoComprador: _clp('opFPresu'),
    diasPagoEstimados: Number(_val('opFDias')) || 30,
    precioOfertado: _clp('opFPrecio'),
  });
  await _registrarActividad(_st.opId, 'Cotización actualizada');
  toast('Cotización guardada', 'success');
  await render();
}

// ── Aprobaciones ─────────────────────────────────────────────────────────────
function _modalFirma(area, decision) {
  const caps = _caps();
  if (!caps.aprobar[area]) { toast('Tu perfil no puede firmar esta área', 'error'); return; }
  const etiqueta = { aprueba: 'Aprobar', aprueba_con_reparos: 'Aprobar con reparos', rechaza: 'Rechazar' }[decision] || 'Firmar';

  _abrirModal(`${etiqueta} — ${AREAS.find((a) => a.id === area)?.label || area}`, formFirma(area), async () => {
    const comentario = _val('opApComentario');
    if (decision === 'rechaza' && !comentario) { toast('Un rechazo necesita explicación', 'error'); return; }
    await opAprobaciones.firmar({
      oportunidadId: _st.opId, area, decision, comentario,
      condiciones: _val('opApCondiciones'), checklist: _st.apCheck[area] || {},
    });
    await _registrarActividad(_st.opId, `Aprobación ${area}: ${decision}`, { comentario });
    _st.apCheck[area] = {};
    _cerrarModal();
    toast('Firma registrada', 'success');
    await render();
  }, { textoGuardar: etiqueta });
}

// ── Oferta ───────────────────────────────────────────────────────────────────
async function _crearOferta() {
  const f = _st.ficha;
  const d = _derivar(f);
  const version = (f.ofertas.reduce((m, o) => Math.max(m, o.version), 0) || 0) + 1;
  const ofertaId = await opOfertas.add({
    oportunidadId: f.op.id, version, estado: 'preparacion',
    plantillaSlug: f.op.servicioSlug || '',
    precioNeto: d.calculo.precioNeto || null, iva: d.calculo.iva || null, precioTotal: d.calculo.precioTotal || null,
  });
  await opOfertaDocs.addMany(CHECKLIST_OFERTA.map((c, idx) => ({
    ofertaId, tipo: c.tipo, nombre: c.nombre, obligatorio: c.obligatorio, estado: 'pendiente', orden: idx,
  })));
  await _registrarActividad(f.op.id, `Paquete de oferta v${version} creado`);
  if (f.op.estado === 'aprobada') {
    await opDB.update({ id: f.op.id, estado: 'oferta_preparacion' });
    await _registrarActividad(f.op.id, 'Cambio de estado', { estadoAnterior: 'aprobada', estadoNuevo: 'oferta_preparacion' });
  }
  toast('Paquete de oferta creado', 'success');
  _st.tab = 'oferta';
  await render();
}

async function _marcarOfertaLista() {
  const f = _st.ficha;
  const faltan = (f.ofertaDocs || []).filter((d) => d.obligatorio && d.estado === 'pendiente');
  if (faltan.length) { toast(`Faltan ${faltan.length} documento(s) obligatorio(s)`, 'error'); return; }

  _abrirModal('Marcar la oferta como lista', `
    <p>Confirmas que el paquete está completo y revisado.</p>
    <p class="op-mute">La presentación en el portal la hace una persona: el CRM no envía nada por su cuenta.</p>`,
  async () => {
    const d = _derivar(f);
    await opOfertas.update({
      id: f.oferta.id, estado: 'lista',
      precioNeto: d.calculo.precioNeto || null, iva: d.calculo.iva || null, precioTotal: d.calculo.precioTotal || null,
    });
    if (f.op.estado === 'oferta_preparacion') {
      await opDB.update({ id: f.op.id, estado: 'lista_presentar' });
      await _registrarActividad(f.op.id, 'Cambio de estado', { estadoAnterior: 'oferta_preparacion', estadoNuevo: 'lista_presentar' });
    }
    _cerrarModal();
    toast('Oferta lista para presentar', 'success');
    await render();
  }, { textoGuardar: 'Confirmar' });
}

async function _marcarPresentada() {
  const f = _st.ficha;
  _abrirModal('Registrar la oferta como presentada', `
    <p>Marca que la oferta <strong>ya fue subida al portal por una persona</strong>.</p>
    <div class="form-group"><label>Comentario (opcional)</label><textarea id="opMotivo" rows="2"></textarea></div>`,
  async () => {
    await opOfertas.update({ id: f.oferta.id, estado: 'presentada', presentadaAt: new Date().toISOString() });
    const v = validarTransicion(f.op.estado, 'presentada', {});
    if (v.ok) await opDB.update({ id: f.op.id, estado: 'presentada' });
    await _registrarActividad(f.op.id, 'Oferta presentada en el portal', {
      estadoAnterior: f.op.estado, estadoNuevo: v.ok ? 'presentada' : f.op.estado, comentario: _val('opMotivo'),
    });
    _cerrarModal();
    toast('Registrada como presentada', 'success');
    await render();
  }, { textoGuardar: 'Registrar' });
}

async function _nuevaVersionOferta() {
  const f = _st.ficha;
  const d = _derivar(f);
  await opOfertas.update({ id: f.oferta.id, estado: 'reemplazada' });
  const version = f.ofertas.reduce((m, o) => Math.max(m, o.version), 0) + 1;
  const ofertaId = await opOfertas.add({
    oportunidadId: f.op.id, version, estado: 'preparacion', plantillaSlug: f.op.servicioSlug || '',
    precioNeto: d.calculo.precioNeto || null, iva: d.calculo.iva || null, precioTotal: d.calculo.precioTotal || null,
  });
  await opOfertaDocs.addMany((f.ofertaDocs.length ? f.ofertaDocs : CHECKLIST_OFERTA.map((c, idx) => ({ ...c, orden: idx })))
    .map((c, idx) => ({ ofertaId, tipo: c.tipo, nombre: c.nombre, obligatorio: c.obligatorio, estado: 'pendiente', orden: idx })));
  await _registrarActividad(f.op.id, `Oferta v${version} creada (la anterior queda como reemplazada)`);
  toast(`Versión ${version} creada`, 'success');
  await render();
}

async function _copiarTextoOferta() {
  const f = _st.ficha;
  const tpl = _st.cache.plantillas.find((p) => p.slug === f.op.servicioSlug);
  const texto = tpl?.textoOferta || '';
  if (!texto) { toast('La plantilla no tiene texto de oferta cargado', 'info'); return; }
  try { await navigator.clipboard.writeText(texto); toast('Texto copiado', 'success'); }
  catch (err) { console.warn('[oportunidades] clipboard', err); toast('No se pudo copiar: selecciona el texto a mano', 'error'); }
}

// ── Resultado y ejecución ────────────────────────────────────────────────────
async function _guardarResultado() {
  const f = _st.ficha;
  const triestado = (id) => { const v = _val(id); return v === '' ? null : v === 'si'; };
  const ocCoincide = triestado('opROcCoincide');
  const ocAceptada = !!$('opROcAcept')?.checked;

  if (ocAceptada && ocCoincide === false && !_val('opROcObs')) {
    toast('La orden no coincide con la oferta: registra la observación antes de aceptarla', 'error');
    return;
  }

  await opResultados.guardar({
    oportunidadId: f.op.id,
    adjudicada: triestado('opRAdj'),
    fechaResultado: _val('opRFecha') || null,
    montoAdjudicado: _clp('opRMonto'),
    precioGanador: _clp('opRGanador'),
    proveedorGanador: _val('opRProv'),
    motivoPerdida: _val('opRMotivo'),
    ocNumero: _val('opROcNum'), ocFecha: _val('opROcFecha') || null, ocMonto: _clp('opROcMonto'),
    ocCoincide, ocObservacion: _val('opROcObs'), ocAceptada,
    actaInicioAt: _val('opRActa') || null,
    recepcionConformeAt: _val('opRRecep') || null,
    facturaNumero: _val('opRFactNum'), facturaMonto: _clp('opRFactMonto'),
    facturaFecha: _val('opRFactFecha') || null,
    pagoEsperado: _val('opRPagoEsp') || null, pagoReal: _val('opRPagoReal') || null,
    utilidadReal: _clp('opRUtil'),
    certificadoEstado: _val('opRCert') || 'no_solicitado',
    certificadoObtenidoAt: _val('opRCertFecha') || null,
    aprendizaje: _val('opRAprend'),
  });
  await _registrarActividad(f.op.id, 'Ejecución actualizada');
  toast('Ejecución guardada', 'success');
  await render();
}

async function _crearProyecto() {
  const f = _st.ficha;
  const d = _derivar(f);
  const proyectoId = await proyectos.add({
    nombre: `${f.op.titulo}`.slice(0, 120),
    descripcion: `Origen: Mercado Público${f.op.codigoExterno ? ` · ${f.op.codigoExterno}` : ''}. Institución: ${f.op.institucion || 'sin registrar'}.`,
    estado: 'activo', tipo: 'cliente', facturable: true,
    presupuestoMonto: d.calculo.precioNeto || null,
    presupuestoHoras: d.calculo.totalHoras || null,
  });
  await opResultados.guardar({ oportunidadId: f.op.id, proyectoId });
  await _registrarActividad(f.op.id, 'Convertida en proyecto del ERP');
  toast('Proyecto creado en el Centro de Mando', 'success');
  await render();
}

// ── Documentos ───────────────────────────────────────────────────────────────
function _modalEnlace() {
  _abrirModal('Agregar enlace a un documento', `
    <div class="form-group"><label>Nombre</label><input id="opDNombre" placeholder="Bases administrativas"></div>
    <div class="form-group"><label>Enlace</label><input id="opDEnlace" type="url" placeholder="https://…"></div>`,
  async () => {
    const nombre = _val('opDNombre'); const enlace = _val('opDEnlace');
    if (!nombre || !enlace) { toast('Nombre y enlace son obligatorios', 'error'); return; }
    await opDocumentos.addEnlace(_st.opId, { nombre, enlace });
    _cerrarModal();
    toast('Enlace agregado', 'success');
    await render();
  });
}

const MAX_BYTES = 20 * 1024 * 1024;   // 20 MB por archivo
const MIMES_OK = /^(application\/pdf|application\/msword|application\/vnd|image\/(png|jpeg|webp)|text\/plain)/;

async function _subirDocumentos(input) {
  const files = [...(input.files || [])];
  input.value = '';
  if (!files.length) return;
  let ok = 0;
  for (const file of files) {
    if (file.size > MAX_BYTES) { toast(`"${file.name}" pasa de 20 MB`, 'error'); continue; }
    if (file.type && !MIMES_OK.test(file.type)) { toast(`"${file.name}": tipo de archivo no permitido`, 'error'); continue; }
    try { await opDocumentos.upload(_st.opId, file); ok++; }
    catch (err) { console.error('[oportunidades] subida', err); toast(`No se pudo subir "${file.name}": ${err?.message || ''}`, 'error'); }
  }
  if (ok) { await _registrarActividad(_st.opId, `${ok} documento(s) adjuntados`); toast(`${ok} documento(s) subidos`, 'success'); await render(); }
}

async function _abrirArchivo(path, repo) {
  if (!path) return;
  try {
    const url = await repo.signedUrl(path);
    window.open(url, '_blank', 'noopener');
  } catch (err) {
    console.error('[oportunidades] URL firmada', err);
    toast('No se pudo abrir el archivo', 'error');
  }
}

// ── Documentos del proveedor ─────────────────────────────────────────────────
async function _modalProveedorDoc(id) {
  const docs = await opProveedorDocs.getAll();
  const doc = id ? docs.find((d) => d.id === id) : null;
  _abrirModal(doc ? 'Editar documento' : 'Agregar documento del proveedor', formProveedorDoc(doc || {}), async () => {
    const nombre = _val('opPdNombre');
    if (!nombre) { toast('El nombre es obligatorio', 'error'); return; }
    const datos = {
      nombre, categoria: _val('opPdCat'), version: _val('opPdVersion'),
      fechaEmision: _val('opPdEmision') || null, fechaVencimiento: _val('opPdVence') || null,
      estado: _val('opPdEstado'), descripcion: _val('opPdDesc'),
    };
    if (doc) await opProveedorDocs.update({ id: doc.id, ...datos });
    else await opProveedorDocs.add(datos);
    _cerrarModal();
    toast('Documento guardado', 'success');
    await render();
  });
}

async function _subirDocProveedor(input) {
  const file = (input.files || [])[0];
  const id = input.getAttribute('data-id');
  input.value = '';
  if (!file || !id) return;
  if (file.size > MAX_BYTES) { toast('El archivo pasa de 20 MB', 'error'); return; }
  if (file.type && !MIMES_OK.test(file.type)) { toast('Tipo de archivo no permitido', 'error'); return; }
  try {
    await opProveedorDocs.upload(id, file);
    toast('Archivo subido', 'success');
    await render();
  } catch (err) {
    console.error('[oportunidades] subida proveedor', err);
    toast(err?.message || 'No se pudo subir el archivo', 'error');
  }
}

// ── Plantillas ───────────────────────────────────────────────────────────────
function _modalPlantilla(p) {
  _abrirModal(p ? 'Editar plantilla' : 'Nueva plantilla de servicio', formPlantilla(p || {}), async () => {
    const nombre = _val('opPlNombre');
    if (!nombre) { toast('El nombre es obligatorio', 'error'); return; }
    const slug = _val('opPlSlug') || nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const horas = _val('opPlHoras').split('\n').map((l) => l.split('|')).filter((x) => x.length >= 2)
      .map(([rol, h, v]) => ({ rol: (rol || '').trim(), horas: Number(h) || 0, valorHora: Number(v) || 0 }));

    const datos = {
      slug, nombre, descripcion: _val('opPlDesc'), alcance: _val('opPlAlcance'),
      exclusiones: _val('opPlExcl'), metodologia: _val('opPlMetod'),
      entregables: _val('opPlEntreg').split('\n').map((s) => s.trim()).filter(Boolean),
      duracionSemanasMin: _num('opPlSemMin'), duracionSemanasMax: _num('opPlSemMax'),
      horasPorRol: horas, precioMinimo: _clp('opPlPrecio'),
      margenEsperado: (Number(_val('opPlMargen')) || 0) / 100,
      riesgos: _val('opPlRiesgos').split('\n').map((s) => s.trim()).filter(Boolean),
      textoOferta: _val('opPlTexto'), esDemo: !!$('opPlDemo')?.checked, activo: true,
    };
    if (p) await opPlantillas.update({ id: p.id, ...datos });
    else await opPlantillas.add(datos);
    _cerrarModal();
    toast('Plantilla guardada', 'success');
    await _cargarComunes();
    await render();
  });
}

// ── Configuración ────────────────────────────────────────────────────────────
async function _guardarConfig() {
  if (!_caps().configurar) { toast('Solo un administrador puede cambiar la configuración', 'error'); return; }
  const marcados = (attr) => [...document.querySelectorAll(`[data-op="${attr}"]:checked`)].map((el) => el.value);
  const pct = (id, def) => { const v = _num(id); return v == null ? def : Math.max(0, Math.min(95, v)) / 100; };

  await opConfig.save({
    puntajeParticipar: Number(_val('opCPart')) || 70,
    puntajeRevisar: Number(_val('opCRev')) || 55,
    margenObjetivo: pct('opCMargen', 0.30),
    margenDescarte: pct('opCMargenD', 0.25),
    topeAprobacionNeto: _clp('opCTope') ?? 2500000,
    horasMaxCotizacion: Number(_val('opCHoras')) || 2,
    contingenciaPct: pct('opCCont', 0.10),
    ivaTasa: pct('opCIva', 0.19),
    unspsc: marcados('unspsc'), servicios: marcados('servicio'), regiones: marcados('region'),
  });
  await _cargarComunes();
  toast('Configuración guardada', 'success');
  await render();
}

// ── Borrado genérico con confirmación ────────────────────────────────────────
async function _borrar(que, fn) {
  if (!confirm(`¿Eliminar este ${que}?`)) return;
  await fn();
  toast(`${que.charAt(0).toUpperCase()}${que.slice(1)} eliminado`, 'info');
  await render();
}
