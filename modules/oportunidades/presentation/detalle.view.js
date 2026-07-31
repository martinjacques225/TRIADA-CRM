// modules/oportunidades/presentation/detalle.view.js — Ficha de una oportunidad.
//
// Nueve pestañas que siguen el flujo real: entender → puntuar → costear →
// aprobar → armar la oferta → ejecutar y cobrar. Cada una es una función de
// render pura (recibe datos, devuelve HTML); los cálculos ya vienen resueltos
// por el dominio.

import { esc, i, clp, pctTxt, fecha, fechaHora, cuentaRegresiva, badgeEstado, chipRecomendacion, barraPuntaje, select, campo, aviso, vacio } from './ui.js';
import { estadoLabel, siguientesEstados } from '../domain/estados.js';
import { CRITERIOS } from '../domain/puntaje.js';
import { CAUSALES, causalLabel } from '../domain/descarte.js';
import { AREAS } from '../domain/aprobaciones.js';
import { SERVICIOS, TIPOS_PROCEDIMIENTO, REGIONES, ROLES_COSTO, CHECKLIST_OFERTA } from '../domain/catalogo.js';

const TABS = [
  { id: 'resumen',      label: 'Resumen' },
  { id: 'requisitos',   label: 'Requisitos' },
  { id: 'puntaje',      label: 'Puntaje' },
  { id: 'financiero',   label: 'Financiero' },
  { id: 'aprobaciones', label: 'Aprobaciones' },
  { id: 'oferta',       label: 'Oferta' },
  { id: 'ejecucion',    label: 'Ejecución' },
  { id: 'documentos',   label: 'Documentos' },
  { id: 'historial',    label: 'Historial' },
];

export function renderDetalle(ctx) {
  const { op, tab = 'resumen', calculo = {}, causales = [], aprobEstado = {}, caps = {} } = ctx;
  const cr = cuentaRegresiva(op.fechaCierre, ctx.ahora);

  return `<div class="op-detalle">
    <button class="op-volver" data-op="volver">${i('chevL', 15)} Volver a la lista</button>

    <div class="op-detalle__head">
      <div class="op-detalle__titulo">
        <h2>${esc(op.titulo || 'Sin título')}</h2>
        <div class="op-detalle__meta">
          ${op.codigoExterno ? `<span class="op-mono">${esc(op.codigoExterno)}</span>` : '<span class="op-mono op-mono--mute">carga manual</span>'}
          ${badgeEstado(op.estado)}
          ${chipRecomendacion(op.recomendacion)}
          <span style="color:${cr.color}">${i('clock', 13)} ${esc(cr.texto)}</span>
        </div>
      </div>
      <div class="op-detalle__acciones">
        ${op.enlace ? `<a class="btn btn-ghost btn-sm" href="${esc(op.enlace)}" target="_blank" rel="noopener noreferrer">${i('share', 15)} Ver en el portal</a>` : ''}
        ${caps.editar ? _selectorEstado(op) : ''}
      </div>
    </div>

    ${causales.length ? `<div class="op-causales">
      <div class="op-causales__t">${i('alert', 17)} ${causales.length} causal(es) crítica(s) de descarte</div>
      <ul>${causales.map((c) => `<li><strong>${esc(c.label)}</strong> — ${esc(c.motivo)}
        <span class="op-causales__origen">${c.origen === 'sistema' ? 'detectada por el sistema' : 'declarada por el equipo'}</span></li>`).join('')}</ul>
      ${caps.editar ? `<button class="btn btn-sm op-btn-descartar" data-op="descartar">${i('xCirc', 15)} Descartar con este motivo</button>` : ''}
    </div>` : ''}

    <div class="op-tabs">
      ${TABS.map((t) => `<button class="op-tab${t.id === tab ? ' is-active' : ''}" data-op="tab" data-tab="${t.id}">${esc(t.label)}${_tabBadge(t.id, ctx)}</button>`).join('')}
    </div>

    <div class="op-tabpanel">${_panel(tab, ctx)}</div>
  </div>`;
}

function _tabBadge(id, ctx) {
  const n = {
    requisitos: (ctx.requisitos || []).length,
    documentos: (ctx.documentos || []).length,
    aprobaciones: (ctx.aprobaciones || []).length,
  }[id];
  return n ? `<span class="op-tab__n">${n}</span>` : '';
}

function _panel(tab, ctx) {
  switch (tab) {
    case 'requisitos':   return _tabRequisitos(ctx);
    case 'puntaje':      return _tabPuntaje(ctx);
    case 'financiero':   return _tabFinanciero(ctx);
    case 'aprobaciones': return _tabAprobaciones(ctx);
    case 'oferta':       return _tabOferta(ctx);
    case 'ejecucion':    return _tabEjecucion(ctx);
    case 'documentos':   return _tabDocumentos(ctx);
    case 'historial':    return _tabHistorial(ctx);
    default:             return _tabResumen(ctx);
  }
}

function _selectorEstado(op) {
  const siguientes = siguientesEstados(op.estado);
  if (!siguientes.length) return '<span class="op-mute">Proceso cerrado</span>';
  return `<div class="op-estado-mover">
    ${select('opNuevoEstado', siguientes.map((v) => ({ v, label: estadoLabel(v) })), '', { vacio: 'Mover a…' })}
    <button class="btn btn-primary btn-sm" data-op="mover">Mover</button>
  </div>`;
}

// ── 1. Resumen ───────────────────────────────────────────────────────────────
function _tabResumen(ctx) {
  const { op, perfiles = [], caps = {}, calculo = {}, riesgos = [] } = ctx;
  const resp = perfiles.find((p) => p.id === op.responsable);
  const servicio = SERVICIOS.find((s) => s.slug === op.servicioSlug);

  return `<div class="op-grid2">
    <section class="card card-pad">
      <h3 class="op-h3">Datos del proceso</h3>
      <dl class="op-dl">
        ${_dt('ID oficial', op.codigoExterno || 'No asignado')}
        ${_dt('Institución', op.institucion || '—')}
        ${_dt('Procedimiento', TIPOS_PROCEDIMIENTO.find((t) => t.v === op.tipoProcedimiento)?.label || '—')}
        ${_dt('Región', op.region || '—')}
        ${_dt('Modalidad', op.modalidad || 'Por definir')}
        ${_dt('Publicación', fecha(op.fechaPublicacion))}
        ${_dt('Cierre', fechaHora(op.fechaCierre))}
        ${_dt('Presupuesto', op.presupuestoMonto == null ? 'No publicado'
            : `${clp(op.presupuestoMonto)} <span class="op-mute">(${op.presupuestoIva === 'con_iva' ? 'incluye IVA' : op.presupuestoIva === 'neto' ? 'neto' : 'IVA por confirmar'})</span>`)}
        ${_dt('UNSPSC', (op.unspsc || []).length ? op.unspsc.map((c) => `<span class="op-mono">${esc(c)}</span>`).join(' ') : '—')}
        ${_dt('Servicio Tríada', servicio ? esc(servicio.nombre) : 'Sin asignar')}
        ${_dt('Responsable', resp ? esc(resp.nombre) : 'Sin asignar')}
        ${_dt('Tiempo invertido', `${Math.round((op.tiempoInvertidoMin || 0) / 6) / 10} h`)}
      </dl>
      ${op.descripcion ? `<div class="op-desc"><h4>Descripción</h4><p>${esc(op.descripcion)}</p></div>` : ''}
      ${op.motivoDescarte ? aviso('alto', `Motivo del descarte: ${op.motivoDescarte}`) : ''}
      ${op.motivoReapertura ? aviso('medio', `Reabierta: ${op.motivoReapertura}`) : ''}
      ${caps.editar ? `<div class="op-acciones-row">
        <button class="btn btn-ghost btn-sm" data-op="editar">${i('pencil', 15)} Editar datos</button>
        <button class="btn btn-ghost btn-sm" data-op="tiempo">${i('clock', 15)} Registrar tiempo</button>
      </div>` : ''}
    </section>

    <div class="op-col">
      <section class="card card-pad">
        <h3 class="op-h3">Estado del análisis</h3>
        <div class="op-resumen-kpis">
          <div><span>Puntaje</span>${barraPuntaje(op.puntaje, { participar: ctx.config?.puntajeParticipar || 70, revisar: ctx.config?.puntajeRevisar || 55 })}</div>
          <div><span>Margen estimado</span><strong>${calculo.margenReal == null ? '—' : pctTxt(calculo.margenReal)}</strong></div>
          <div><span>Precio neto</span><strong>${calculo.precioNeto ? clp(calculo.precioNeto) : '—'}</strong></div>
          <div><span>Aprobaciones</span><strong>${ctx.aprobEstado?.firmadas || 0} / 3</strong></div>
        </div>
        <p class="op-mute op-nota">${esc(ctx.aprobEstado?.resumen || '')}</p>
      </section>

      <section class="card card-pad">
        <h3 class="op-h3">Riesgos registrados <span class="op-mute">(${riesgos.length})</span></h3>
        ${riesgos.length === 0
          ? '<p class="op-mute">Todavía no se registran riesgos. Revisar multas, garantías y dependencias antes de puntuar.</p>'
          : `<ul class="op-riesgos">${riesgos.map((r) => `<li>
              <span class="op-nivel op-nivel--${esc(r.nivel)}">${esc(r.nivel)}</span>
              <div><strong>${esc(r.causal ? causalLabel(r.causal) : 'Riesgo')}</strong>
              <div>${esc(r.descripcion)}</div>
              ${r.mitigacion ? `<div class="op-mute">Mitigación: ${esc(r.mitigacion)}</div>` : ''}</div>
              ${ctx.caps?.editar ? `<button class="btn-icon btn-sm" data-op="del-riesgo" data-id="${esc(r.id)}" title="Eliminar">${i('trash', 14)}</button>` : ''}
            </li>`).join('')}</ul>`}
        ${caps.editar ? `<button class="btn btn-ghost btn-sm" data-op="add-riesgo">${i('plus', 15)} Registrar riesgo o causal</button>` : ''}
      </section>
    </div>
  </div>`;
}

const _dt = (k, v) => `<dt>${esc(k)}</dt><dd>${v}</dd>`;

// ── 2. Requisitos ────────────────────────────────────────────────────────────
const TIPOS_REQ = [
  { v: 'administrativo', label: 'Administrativo' },
  { v: 'tecnico', label: 'Técnico' },
  { v: 'experiencia_institucional', label: 'Experiencia institucional' },
  { v: 'experiencia_individual', label: 'Experiencia individual' },
  { v: 'titulo_certificado', label: 'Título o certificado' },
  { v: 'garantia', label: 'Garantía' },
  { v: 'multa', label: 'Multa' },
  { v: 'pago', label: 'Condición de pago' },
  { v: 'plazo', label: 'Plazo' },
  { v: 'entregable', label: 'Entregable' },
  { v: 'reunion_visita', label: 'Reunión o visita' },
  { v: 'soporte', label: 'Soporte posterior' },
  { v: 'propiedad_intelectual', label: 'Propiedad intelectual' },
  { v: 'confidencialidad', label: 'Confidencialidad' },
  { v: 'dependencia', label: 'Dependencia de terceros' },
  { v: 'criterio_evaluacion', label: 'Criterio de evaluación' },
  { v: 'otro', label: 'Otro' },
];

function _tabRequisitos(ctx) {
  const { requisitos = [], caps = {}, perfiles = [] } = ctx;
  const oblig = requisitos.filter((r) => r.obligatorio);
  const sinConfirmar = requisitos.filter((r) => r.obligatorio && !r.confirmadoPor).length;

  return `<section class="card card-pad">
    <div class="op-h3-row">
      <h3 class="op-h3">Requisitos del proceso</h3>
      ${caps.editar ? `<button class="btn btn-primary btn-sm" data-op="add-req">${i('plus', 15)} Agregar requisito</button>` : ''}
    </div>
    <p class="op-mute op-nota">
      ${oblig.length} obligatorio(s) de ${requisitos.length}. Un requisito obligatorio solo cuenta como cumplido
      cuando una persona lo confirma con la evidencia a la vista${sinConfirmar ? ` — faltan ${sinConfirmar} por confirmar.` : '.'}
    </p>

    ${requisitos.length === 0
      ? vacio('Sin requisitos cargados', 'Cárgalos a mano leyendo las bases. La lectura automática de documentos llega en la Fase 3.')
      : `<div class="op-tabla-wrap"><table class="data-table op-tabla">
          <thead><tr><th>Requisito</th><th>Tipo</th><th>Fuente</th><th>¿Cumplimos?</th><th>Confirmado</th><th></th></tr></thead>
          <tbody>${requisitos.map((r) => _filaReq(r, caps, perfiles)).join('')}</tbody>
        </table></div>`}
  </section>`;
}

function _filaReq(r, caps, perfiles) {
  const quien = perfiles.find((p) => p.id === r.confirmadoPor);
  const origen = r.origen === 'ia'
    ? `<span class="op-chip op-chip--ia">IA${r.confianza != null ? ` · ${Math.round(r.confianza * 100)}%` : ''}</span>`
    : '<span class="op-chip op-chip--mute">manual</span>';
  return `<tr>
    <td><div class="${r.obligatorio ? 'op-req--oblig' : ''}">${esc(r.texto)}</div>
      ${r.evidencia ? `<div class="op-fila__sub">Evidencia: ${esc(r.evidencia)}</div>` : ''}</td>
    <td>${esc(TIPOS_REQ.find((t) => t.v === r.tipo)?.label || r.tipo)}${r.obligatorio ? '<div class="op-fila__sub op-req-tag">Obligatorio</div>' : ''}</td>
    <td>${origen}${r.fuenteSeccion ? `<div class="op-fila__sub">${esc(r.fuenteSeccion)}</div>` : ''}</td>
    <td>${caps.editar
      ? select(`opReqC_${r.id}`, [
          { v: 'no_evaluado', label: 'Sin evaluar' }, { v: 'si', label: 'Sí' },
          { v: 'parcial', label: 'Parcial' }, { v: 'no', label: 'No' },
        ], r.cumple, { vacio: '', attrs: `data-op="req-cumple" data-id="${esc(r.id)}"` })
      : esc(r.cumple)}</td>
    <td>${quien ? `${esc(quien.nombre)}<div class="op-fila__sub">${esc(fecha(r.confirmadoAt))}</div>`
      : caps.editar ? `<button class="btn btn-ghost btn-sm" data-op="req-confirmar" data-id="${esc(r.id)}">Confirmar</button>` : '<span class="op-mute">Pendiente</span>'}</td>
    <td>${caps.editar ? `<button class="btn-icon btn-sm" data-op="del-req" data-id="${esc(r.id)}" title="Eliminar">${i('trash', 14)}</button>` : ''}</td>
  </tr>`;
}

export function formRequisito() {
  return `
    <div class="form-group"><label>Requisito <span class="req">*</span></label>
      <textarea id="opRTexto" rows="3" placeholder="Copia la exigencia tal como aparece en las bases"></textarea></div>
    <div class="form-row">
      <div class="form-group"><label>Tipo</label>${select('opRTipo', TIPOS_REQ, 'administrativo', { vacio: '' })}</div>
      <div class="form-group"><label>¿Es obligatorio?</label>
        ${select('opROblig', [{ v: 'si', label: 'Sí, es excluyente' }, { v: 'no', label: 'No, suma puntaje' }], 'si', { vacio: '' })}</div>
    </div>
    <div class="form-group"><label>Documento y sección de origen</label>
      <input id="opRFuente" placeholder="Bases administrativas, punto 4.2"></div>
    <div class="form-group"><label>¿Con qué se acredita?</label>
      <input id="opREvidencia" placeholder="Certificado de vigencia · CV del socio TI · …"></div>`;
}

// ── 3. Puntaje ───────────────────────────────────────────────────────────────
function _tabPuntaje(ctx) {
  const { puntajes = [], sugerencias = [], totalPuntaje = {}, recomendacion = {}, caps = {}, perfiles = [], preguntas = [] } = ctx;

  return `<section class="card card-pad">
    <div class="op-h3-row">
      <h3 class="op-h3">Marcador de 100 puntos</h3>
      <div class="op-punt-total">
        <span class="op-punt-total__n" style="color:${recomendacion.color || 'var(--text3)'}">${totalPuntaje.total ?? 0}</span>
        <span class="op-punt-total__l">${esc(recomendacion.label || 'Sin evaluar')}</span>
      </div>
    </div>
    <p class="op-mute op-nota">${esc(recomendacion.motivo || '')} ${totalPuntaje.completo ? '' : `Faltan ${(totalPuntaje.faltantes || []).length} criterio(s) por evaluar.`}</p>

    ${preguntas.length ? `<div class="op-preguntas">
      <strong>${i('bulb', 15)} Preguntas pendientes antes de decidir</strong>
      <ul>${preguntas.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
    </div>` : ''}

    <div class="op-criterios">
      ${CRITERIOS.map((c) => _criterio(c, puntajes, sugerencias, caps, perfiles)).join('')}
    </div>

    ${caps.editar ? `<div class="op-acciones-row">
      <button class="btn btn-ghost btn-sm" data-op="aplicar-sugerencias">${i('sparkle', 15)} Aplicar todas las sugerencias</button>
      <button class="btn btn-primary btn-sm" data-op="guardar-puntaje">${i('checkCirc', 15)} Guardar marcador</button>
    </div>` : ''}
  </section>`;
}

function _criterio(c, puntajes, sugerencias, caps, perfiles) {
  const fila = puntajes.find((p) => p.criterio === c.id);
  const sug  = sugerencias.find((s) => s.criterio === c.id) || {};
  const quien = perfiles.find((p) => p.id === fila?.confirmadoPor);
  const valor = fila ? fila.puntos : '';

  return `<div class="op-criterio" data-criterio="${c.id}">
    <div class="op-criterio__head">
      <div>
        <strong>${esc(c.label)}</strong>
        <div class="op-mute">${esc(c.pregunta)}</div>
      </div>
      <div class="op-criterio__input">
        ${caps.editar
          ? `<input type="number" min="0" max="${c.max}" step="1" value="${valor}" data-op="punt" data-criterio="${c.id}" aria-label="${esc(c.label)}">`
          : `<strong>${valor === '' ? '—' : valor}</strong>`}
        <span class="op-mute">/ ${c.max}</span>
      </div>
    </div>
    <div class="op-criterio__body">
      <div class="op-criterio__sug">
        ${sug.sugerido == null
          ? `<span class="op-chip op-chip--warn">Sin datos para sugerir</span> ${esc(sug.justificacion || '')}`
          : `<span class="op-chip op-chip--ok">Sugerido: ${sug.sugerido}</span> ${esc(sug.justificacion || '')}`}
      </div>
      ${fila?.manual ? `<div class="op-criterio__manual">${i('pencil', 13)} Ajustado a mano: ${esc(fila.motivoManual || 'sin motivo')}</div>` : ''}
      ${quien ? `<div class="op-mute">Confirmado por ${esc(quien.nombre)} · ${esc(fecha(fila.confirmadoAt))}</div>` : ''}
    </div>
  </div>`;
}

// ── 4. Financiero ────────────────────────────────────────────────────────────
function _tabFinanciero(ctx) {
  const { costo = {}, items = [], calculo = {}, caps = {}, op = {}, perfiles = [], plantillas = [] } = ctx;
  if (!caps.verFinanzas) return vacio('Sin acceso a la información financiera', 'Tu perfil es de solo lectura.');

  return `<div class="op-fin">
    <section class="card card-pad">
      <div class="op-h3-row">
        <h3 class="op-h3">Horas y costos</h3>
        ${caps.editar ? `<div class="op-head-actions">
          ${plantillas.length ? `<button class="btn btn-ghost btn-sm" data-op="usar-plantilla">${i('layers', 15)} Copiar de una plantilla</button>` : ''}
          <button class="btn btn-primary btn-sm" data-op="add-item">${i('plus', 15)} Agregar línea</button>
        </div>` : ''}
      </div>

      ${items.length === 0
        ? vacio('Todavía no hay horas cargadas', 'El precio se arma desde abajo: primero las horas de cada socio, después los costos.')
        : `<div class="op-tabla-wrap"><table class="data-table op-tabla">
            <thead><tr><th>Concepto</th><th>Rol</th><th class="op-col-num">Horas</th><th class="op-col-num">Valor hora</th><th class="op-col-num">Monto</th><th></th></tr></thead>
            <tbody>${items.map((it) => _filaItem(it, caps, perfiles)).join('')}</tbody>
            <tfoot>
              <tr><td colspan="4">Costo de horas (${calculo.totalHoras || 0} h)</td><td class="op-col-num">${clp(calculo.costoHoras)}</td><td></td></tr>
              <tr><td colspan="4">Costos directos</td><td class="op-col-num">${clp(calculo.costosDirectos)}</td><td></td></tr>
              <tr><td colspan="4">Contingencia</td><td class="op-col-num">${clp(calculo.contingencia)}</td><td></td></tr>
              ${calculo.costosAdmin ? `<tr><td colspan="4">Costos administrativos</td><td class="op-col-num">${clp(calculo.costosAdmin)}</td><td></td></tr>` : ''}
              <tr class="op-tfoot-total"><td colspan="4">Costo base</td><td class="op-col-num">${clp(calculo.costoBase)}</td><td></td></tr>
            </tfoot>
          </table></div>`}
    </section>

    <div class="op-grid2">
      <section class="card card-pad">
        <h3 class="op-h3">Parámetros</h3>
        <div class="form-row">
          ${campo('Margen objetivo', `<input id="opFMargen" type="number" min="0" max="90" step="1" value="${Math.round((costo.margenObjetivo ?? 0.30) * 100)}"${caps.editar ? '' : ' disabled'}> %`, 'Mínimo 30%. Bajo 25% es causal de descarte.')}
          ${campo('Contingencia', `<input id="opFCont" type="number" min="0" max="50" step="1" value="${Math.round((costo.contingenciaPct ?? 0.10) * 100)}"${caps.editar ? '' : ' disabled'}> %`, 'Colchón para retrabajo y reuniones extra.')}
        </div>
        <div class="form-row">
          ${campo('Costos administrativos', `<input id="opFAdmin" type="number" min="0" max="50" step="1" value="${Math.round((costo.costosAdminPct ?? 0) * 100)}"${caps.editar ? '' : ' disabled'}> %`)}
          ${campo('IVA', `<input id="opFIva" type="number" min="0" max="30" step="1" value="${Math.round((costo.ivaTasa ?? 0.19) * 100)}"${caps.editar ? '' : ' disabled'}> %`, 'Chile: 19%.')}
        </div>
        <div class="form-row">
          ${campo('Presupuesto del comprador', `<input id="opFPresu" data-fmt="clp" inputmode="numeric" value="${costo.presupuestoComprador ? Number(costo.presupuestoComprador).toLocaleString('es-CL') : ''}"${caps.editar ? '' : ' disabled'}>`, op.presupuestoIva === 'con_iva' ? 'El publicado incluye IVA: se descuenta para comparar.' : '')}
          ${campo('Días hasta el pago', `<input id="opFDias" type="number" min="0" max="365" step="1" value="${costo.diasPagoEstimados ?? 30}"${caps.editar ? '' : ' disabled'}>`, 'Para dimensionar el capital de trabajo.')}
        </div>
        ${campo('Precio a ofertar (neto)', `<input id="opFPrecio" data-fmt="clp" inputmode="numeric" value="${costo.precioOfertado ? Number(costo.precioOfertado).toLocaleString('es-CL') : ''}" placeholder="${calculo.precioSugerido ? Number(calculo.precioSugerido).toLocaleString('es-CL') : ''}"${caps.editar ? '' : ' disabled'}>`, 'Vacío = se usa el precio sugerido por el margen objetivo.')}
        ${caps.editar ? `<button class="btn btn-primary btn-sm" data-op="guardar-costos">${i('checkCirc', 15)} Guardar y recalcular</button>` : ''}
      </section>

      <section class="card card-pad op-cotiz">
        <h3 class="op-h3">La cuenta, peso a peso</h3>
        <div class="op-cotiz__row"><span>Total que deposita el Estado</span><strong>${clp(calculo.precioTotal)}</strong></div>
        <div class="op-cotiz__row op-cotiz__row--iva"><span>IVA (${Math.round((costo.ivaTasa ?? 0.19) * 100)}%) — nunca fue de Tríada</span><span>−${clp(calculo.iva)}</span></div>
        <div class="op-cotiz__row op-cotiz__row--neto"><span>Ingreso neto</span><strong>${clp(calculo.precioNeto)}</strong></div>
        <hr>
        <div class="op-cotiz__row"><span>Trabajo de los socios (${calculo.totalHoras || 0} h)</span><span>−${clp(calculo.costoHoras)}</span></div>
        <div class="op-cotiz__row"><span>Costos directos</span><span>−${clp(calculo.costosDirectos)}</span></div>
        <div class="op-cotiz__row"><span>Contingencia</span><span>−${clp(calculo.contingencia)}</span></div>
        ${calculo.costosAdmin ? `<div class="op-cotiz__row"><span>Costos administrativos</span><span>−${clp(calculo.costosAdmin)}</span></div>` : ''}
        <div class="op-cotiz__row op-cotiz__row--util">
          <span>Utilidad de Tríada</span>
          <strong style="color:${(calculo.margenReal ?? 0) >= 0.30 ? 'var(--green)' : (calculo.margenReal ?? 0) >= 0.25 ? 'var(--amber)' : 'var(--danger)'}">${clp(calculo.utilidad)} · ${pctTxt(calculo.margenReal)}</strong>
        </div>
        <div class="op-cotiz__barra">${_barraDesglose(calculo)}</div>
        <div class="op-cotiz__extra">
          <div><span>Precio sugerido por el margen objetivo</span><strong>${clp(calculo.precioSugerido)}</strong></div>
          <div><span>Capital de trabajo comprometido</span><strong>${clp(calculo.capitalTrabajo)}</strong> <span class="op-mute">a ${calculo.diasPagoEstimados || 0} días</span></div>
          ${calculo.presupuestoNeto != null ? `<div><span>Presupuesto del comprador (neto)</span><strong>${clp(calculo.presupuestoNeto)}</strong></div>` : ''}
        </div>
        ${(calculo.alertas || []).map((a) => aviso(a.nivel, a.texto)).join('')}
      </section>
    </div>
  </div>`;
}

function _barraDesglose(c) {
  const total = Math.max(1, Number(c.precioTotal) || 0);
  const partes = [
    { l: 'IVA', v: c.iva, color: 'var(--text3)' },
    { l: 'Socios', v: c.costoHoras, color: 'var(--navy)' },
    { l: 'Costos', v: c.costosDirectos, color: 'var(--violet)' },
    { l: 'Cont.', v: c.contingencia, color: 'var(--amber)' },
    { l: 'Utilidad', v: Math.max(0, c.utilidad), color: 'var(--green)' },
  ].filter((p) => Number(p.v) > 0);
  if (!partes.length) return '';
  return partes.map((p) => `<span class="op-barra__seg" style="width:${(p.v / total) * 100}%;background:${p.color}" title="${esc(p.l)}: ${clp(p.v)}"><em>${esc(p.l)}</em></span>`).join('');
}

function _filaItem(it, caps, perfiles) {
  const persona = perfiles.find((p) => p.id === it.profileId);
  const monto = it.tipo === 'hora' ? (Number(it.horas) || 0) * (Number(it.valorHora) || 0) : (Number(it.monto) || 0);
  return `<tr>
    <td>${esc(it.descripcion || (it.tipo === 'hora' ? 'Horas' : it.tipo))}
      <div class="op-fila__sub">${esc(it.tipo)}${it.diasAntesPago ? ` · desembolso ${it.diasAntesPago} d antes del pago` : ''}</div></td>
    <td>${esc(persona?.nombre || it.rol || '—')}</td>
    <td class="op-col-num">${it.tipo === 'hora' ? (it.horas ?? 0) : '—'}</td>
    <td class="op-col-num">${it.tipo === 'hora' ? clp(it.valorHora) : '—'}</td>
    <td class="op-col-num">${clp(monto)}</td>
    <td>${caps.editar ? `<button class="btn-icon btn-sm" data-op="del-item" data-id="${esc(it.id)}" title="Eliminar">${i('trash', 14)}</button>` : ''}</td>
  </tr>`;
}

export function formItemCosto(perfiles = []) {
  return `
    <div class="form-row">
      <div class="form-group"><label>Tipo de línea</label>
        ${select('opIT', [
          { v: 'hora', label: 'Horas de trabajo' }, { v: 'directo', label: 'Costo directo' },
          { v: 'material', label: 'Compra de materiales' }, { v: 'licencia', label: 'Licencia o software' },
          { v: 'traslado', label: 'Traslado' }, { v: 'subcontrato', label: 'Subcontratación' },
        ], 'hora', { vacio: '' })}</div>
      <div class="form-group"><label>Descripción</label><input id="opIDesc" placeholder="Levantamiento en terreno"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Persona o rol</label>
        ${select('opIRol', ROLES_COSTO.map((r) => ({ v: r, label: r })), '', { vacio: '— Selecciona —' })}</div>
      <div class="form-group"><label>Miembro del equipo</label>
        ${select('opIPersona', perfiles.map((p) => ({ v: p.id, label: p.nombre })), '', { vacio: 'Sin asignar' })}</div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Horas</label><input id="opIHoras" type="number" min="0" step="0.5" placeholder="20"></div>
      <div class="form-group"><label>Valor por hora</label><input id="opIValor" data-fmt="clp" inputmode="numeric" placeholder="16.000"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Monto (si no son horas)</label><input id="opIMonto" data-fmt="clp" inputmode="numeric" placeholder="120.000"></div>
      <div class="form-group"><label>Días antes del pago</label><input id="opIDias" type="number" min="0" step="1" value="0">
        <div class="form-hint">Cuántos días antes de cobrar sale esta plata de caja.</div></div>
    </div>`;
}

// ── 5. Aprobaciones ──────────────────────────────────────────────────────────
function _tabAprobaciones(ctx) {
  const { aprobaciones = [], aprobEstado = {}, requeridas = {}, caps = {}, perfiles = [] } = ctx;

  return `<section class="card card-pad">
    <h3 class="op-h3">Aprobación de los tres socios</h3>
    <p class="op-mute op-nota">${esc(aprobEstado.resumen || '')}</p>

    ${(requeridas.motivos || []).length ? `<div class="op-preguntas">
      <strong>${i('alert', 15)} Esta oportunidad no admite atajos</strong>
      <ul>${requeridas.motivos.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>
    </div>` : ''}

    <div class="op-aprob-grid">
      ${AREAS.map((a) => _areaAprob(a, aprobaciones, caps, perfiles)).join('')}
    </div>
  </section>`;
}

function _areaAprob(area, aprobaciones, caps, perfiles) {
  const firma = aprobaciones.find((x) => x.area === area.id);
  const quien = firma ? perfiles.find((p) => p.id === firma.aprobadoPor) : null;
  const puede = caps.aprobar?.[area.id];
  const dec = { aprueba: ['Aprobada', 'var(--green)'], aprueba_con_reparos: ['Aprobada con reparos', 'var(--amber)'], rechaza: ['Rechazada', 'var(--danger)'] };

  return `<div class="op-aprob${firma ? ' op-aprob--firmada' : ''}">
    <div class="op-aprob__head">
      <div><strong>${esc(area.label)}</strong><div class="op-mute">${esc(area.responsable)}</div></div>
      ${firma
        ? `<span class="op-chip" style="color:${dec[firma.decision]?.[1]};background:color-mix(in srgb,${dec[firma.decision]?.[1]} 12%,transparent)">${esc(dec[firma.decision]?.[0] || firma.decision)}</span>`
        : '<span class="op-chip op-chip--mute">Pendiente</span>'}
    </div>
    <ul class="op-aprob__check">
      ${area.checklist.map((txt, idx) => {
        const marcado = firma ? !!(firma.checklist || {})[idx] : false;
        return `<li><label><input type="checkbox" data-op="ap-check" data-area="${area.id}" data-idx="${idx}"
          ${marcado ? 'checked' : ''} ${puede && !firma ? '' : 'disabled'}> ${esc(txt)}</label></li>`;
      }).join('')}
    </ul>
    ${firma
      ? `<div class="op-aprob__firma">
          ${firma.comentario ? `<p>${esc(firma.comentario)}</p>` : ''}
          ${firma.condiciones ? `<p class="op-mute">Condiciones: ${esc(firma.condiciones)}</p>` : ''}
          <div class="op-mute">${esc(quien?.nombre || 'Usuario')} · ${esc(fechaHora(firma.createdAt))}</div>
          ${puede ? `<button class="btn btn-ghost btn-sm" data-op="ap-rehacer" data-area="${area.id}">Cambiar mi decisión</button>` : ''}
        </div>`
      : puede
        ? `<div class="op-aprob__acciones">
            <button class="btn btn-primary btn-sm" data-op="ap-firmar" data-area="${area.id}" data-decision="aprueba">Aprobar</button>
            <button class="btn btn-ghost btn-sm" data-op="ap-firmar" data-area="${area.id}" data-decision="aprueba_con_reparos">Con reparos</button>
            <button class="btn btn-ghost btn-sm op-btn-rechazo" data-op="ap-firmar" data-area="${area.id}" data-decision="rechaza">Rechazar</button>
          </div>`
        : '<p class="op-mute">Esta firma le corresponde a otra área.</p>'}
  </div>`;
}

// ── 6. Oferta ────────────────────────────────────────────────────────────────
function _tabOferta(ctx) {
  const { oferta = null, ofertaDocs = [], caps = {}, op = {}, calculo = {}, plantillas = [], docsProveedor = [] } = ctx;

  if (!oferta) {
    return `<section class="card card-pad">
      <h3 class="op-h3">Paquete de postulación</h3>
      <p class="op-mute op-nota">Al crear el paquete se genera el checklist de antecedentes que exige el proceso.
      La presentación oficial en el portal la hace siempre una persona: el CRM prepara, no envía.</p>
      ${caps.editar
        ? `<button class="btn btn-primary" data-op="crear-oferta">${i('plus', 16)} Crear paquete de oferta</button>`
        : vacio('Sin paquete de oferta todavía')}
    </section>`;
  }

  const oblig = ofertaDocs.filter((d) => d.obligatorio);
  const listos = oblig.filter((d) => d.estado === 'listo').length;
  const faltan = oblig.length - listos;

  return `<div class="op-oferta">
    <section class="card card-pad">
      <div class="op-h3-row">
        <h3 class="op-h3">Oferta v${oferta.version} <span class="op-chip op-chip--mute">${esc(oferta.estado)}</span></h3>
        <div class="op-head-actions">
          ${caps.editar && oferta.estado === 'preparacion' ? `<button class="btn btn-primary btn-sm" data-op="oferta-lista" ${faltan ? 'disabled title="Faltan documentos obligatorios"' : ''}>${i('checkCirc', 15)} Marcar lista para presentar</button>` : ''}
          ${caps.editar && oferta.estado === 'lista' ? `<button class="btn btn-primary btn-sm" data-op="oferta-presentada">${i('rocket', 15)} Registrar como presentada</button>` : ''}
          ${caps.editar ? `<button class="btn btn-ghost btn-sm" data-op="oferta-nueva-version">${i('layers', 15)} Nueva versión</button>` : ''}
        </div>
      </div>

      <div class="op-oferta__precios">
        <div><span>Precio neto</span><strong>${clp(oferta.precioNeto ?? calculo.precioNeto)}</strong></div>
        <div><span>IVA</span><strong>${clp(oferta.iva ?? calculo.iva)}</strong></div>
        <div><span>Total a ofertar</span><strong>${clp(oferta.precioTotal ?? calculo.precioTotal)}</strong></div>
      </div>

      ${faltan ? aviso('alto', `Faltan ${faltan} documento(s) obligatorio(s) por marcar como listos.`) : aviso('info', 'Todos los documentos obligatorios están listos.')}

      <div class="op-tabla-wrap"><table class="data-table op-tabla">
        <thead><tr><th>Documento</th><th>Obligatorio</th><th>Estado</th><th>Origen</th></tr></thead>
        <tbody>${ofertaDocs.map((d) => `<tr>
          <td>${esc(d.nombre)}</td>
          <td>${d.obligatorio ? 'Sí' : 'Según bases'}</td>
          <td>${caps.editar
            ? select(`opOD_${d.id}`, [
                { v: 'pendiente', label: 'Pendiente' }, { v: 'listo', label: 'Listo' }, { v: 'no_aplica', label: 'No aplica' },
              ], d.estado, { vacio: '', attrs: `data-op="oferta-doc" data-id="${esc(d.id)}"` })
            : esc(d.estado)}</td>
          <td>${d.proveedorDocId
            ? esc(docsProveedor.find((p) => p.id === d.proveedorDocId)?.nombre || 'Carpeta del proveedor')
            : '<span class="op-mute">—</span>'}</td>
        </tr>`).join('')}</tbody>
      </table></div>

      ${oferta.presentadaAt ? `<p class="op-mute op-nota">Presentada el ${esc(fechaHora(oferta.presentadaAt))}.</p>` : ''}
    </section>

    <section class="card card-pad">
      <h3 class="op-h3">Texto base de la oferta técnica</h3>
      ${plantillas.length && op.servicioSlug
        ? `<p class="op-mute op-nota">Desde la plantilla "${esc(plantillas.find((p) => p.slug === op.servicioSlug)?.nombre || op.servicioSlug)}".</p>
           <pre class="op-pre">${esc(plantillas.find((p) => p.slug === op.servicioSlug)?.textoOferta || 'La plantilla todavía no tiene texto de oferta técnica cargado.')}</pre>`
        : '<p class="op-mute">Asigna un servicio a la oportunidad para traer el texto base de su plantilla.</p>'}
      ${caps.editar ? `<button class="btn btn-ghost btn-sm" data-op="copiar-texto">${i('layers', 15)} Copiar al portapapeles</button>` : ''}
    </section>
  </div>`;
}

// ── 7. Ejecución ─────────────────────────────────────────────────────────────
function _tabEjecucion(ctx) {
  const { resultado = {}, caps = {}, op = {}, calculo = {}, proyectoNombre = '' } = ctx;
  const r = resultado || {};
  const dis = caps.editar ? '' : ' disabled';

  return `<div class="op-ejec">
    <section class="card card-pad">
      <h3 class="op-h3">Resultado del proceso</h3>
      <div class="form-row">
        ${campo('¿Se adjudicó?', select('opRAdj', [
          { v: '', label: 'Sin resultado' }, { v: 'si', label: 'Sí, adjudicada' }, { v: 'no', label: 'No adjudicada' },
        ], r.adjudicada == null ? '' : (r.adjudicada ? 'si' : 'no'), { vacio: '', attrs: dis }))}
        ${campo('Fecha del resultado', `<input id="opRFecha" type="date" value="${esc(r.fechaResultado || '')}"${dis}>`)}
      </div>
      <div class="form-row">
        ${campo('Monto adjudicado (neto)', `<input id="opRMonto" data-fmt="clp" inputmode="numeric" value="${r.montoAdjudicado ? Number(r.montoAdjudicado).toLocaleString('es-CL') : ''}"${dis}>`)}
        ${campo('Precio del ganador', `<input id="opRGanador" data-fmt="clp" inputmode="numeric" value="${r.precioGanador ? Number(r.precioGanador).toLocaleString('es-CL') : ''}"${dis}>`, 'Cuando el portal lo publique: sirve para calibrar el precio.')}
      </div>
      <div class="form-row">
        ${campo('Proveedor ganador', `<input id="opRProv" value="${esc(r.proveedorGanador || '')}"${dis}>`)}
        ${campo('Motivo de la pérdida', `<input id="opRMotivo" value="${esc(r.motivoPerdida || '')}" placeholder="Precio · experiencia · puntaje técnico"${dis}>`)}
      </div>
    </section>

    <section class="card card-pad">
      <h3 class="op-h3">Orden de compra</h3>
      ${r.ocCoincide === false && !r.ocAceptada ? aviso('critico', 'La orden de compra NO coincide con la oferta. No se puede aceptar sin registrar la observación.') : ''}
      <div class="form-row">
        ${campo('N° de la orden', `<input id="opROcNum" value="${esc(r.ocNumero || '')}"${dis}>`)}
        ${campo('Fecha', `<input id="opROcFecha" type="date" value="${esc(r.ocFecha || '')}"${dis}>`)}
      </div>
      <div class="form-row">
        ${campo('Monto de la orden', `<input id="opROcMonto" data-fmt="clp" inputmode="numeric" value="${r.ocMonto ? Number(r.ocMonto).toLocaleString('es-CL') : ''}"${dis}>`, calculo.precioTotal ? `La oferta fue por ${clp(calculo.precioTotal)} con IVA.` : '')}
        ${campo('¿Coincide con la oferta?', select('opROcCoincide', [
          { v: '', label: 'Sin revisar' }, { v: 'si', label: 'Sí, coincide' }, { v: 'no', label: 'No coincide' },
        ], r.ocCoincide == null ? '' : (r.ocCoincide ? 'si' : 'no'), { vacio: '', attrs: dis }))}
      </div>
      ${campo('Observación de la revisión', `<input id="opROcObs" value="${esc(r.ocObservacion || '')}" placeholder="Qué difiere y qué se acordó"${dis}>`)}
      ${campo('Aceptación', `<label class="op-check"><input type="checkbox" id="opROcAcept"${r.ocAceptada ? ' checked' : ''}${dis}> La orden fue revisada y aceptada</label>`)}
    </section>

    <section class="card card-pad">
      <h3 class="op-h3">Ejecución, factura y pago</h3>
      <div class="form-row">
        ${campo('Acta de inicio', `<input id="opRActa" type="date" value="${esc(r.actaInicioAt || '')}"${dis}>`)}
        ${campo('Recepción conforme', `<input id="opRRecep" type="date" value="${esc(r.recepcionConformeAt || '')}"${dis}>`)}
      </div>
      <div class="form-row">
        ${campo('N° de factura', `<input id="opRFactNum" value="${esc(r.facturaNumero || '')}"${dis}>`)}
        ${campo('Monto facturado (bruto)', `<input id="opRFactMonto" data-fmt="clp" inputmode="numeric" value="${r.facturaMonto ? Number(r.facturaMonto).toLocaleString('es-CL') : ''}"${dis}>`)}
      </div>
      <div class="form-row">
        ${campo('Fecha de factura', `<input id="opRFactFecha" type="date" value="${esc(r.facturaFecha || '')}"${dis}>`)}
        ${campo('Pago esperado', `<input id="opRPagoEsp" type="date" value="${esc(r.pagoEsperado || '')}"${dis}>`)}
      </div>
      <div class="form-row">
        ${campo('Pago recibido', `<input id="opRPagoReal" type="date" value="${esc(r.pagoReal || '')}"${dis}>`)}
        ${campo('Utilidad real', `<input id="opRUtil" data-fmt="clp" inputmode="numeric" value="${r.utilidadReal ? Number(r.utilidadReal).toLocaleString('es-CL') : ''}"${dis}>`, calculo.utilidad ? `Estimada: ${clp(calculo.utilidad)}.` : '')}
      </div>
    </section>

    <section class="card card-pad">
      <h3 class="op-h3">Certificado de experiencia</h3>
      <p class="op-mute op-nota">Es lo que después habilita para licitaciones mayores: pedirlo apenas entra el pago.</p>
      <div class="form-row">
        ${campo('Estado', select('opRCert', [
          { v: 'no_solicitado', label: 'No solicitado' }, { v: 'solicitado', label: 'Solicitado' },
          { v: 'obtenido', label: 'Obtenido' }, { v: 'rechazado', label: 'Rechazado' },
        ], r.certificadoEstado || 'no_solicitado', { vacio: '', attrs: dis }))}
        ${campo('Fecha de obtención', `<input id="opRCertFecha" type="date" value="${esc(r.certificadoObtenidoAt || '')}"${dis}>`)}
      </div>
      ${campo('Aprendizaje del proceso', `<textarea id="opRAprend" rows="2"${dis}>${esc(r.aprendizaje || '')}</textarea>`, 'Qué haríamos distinto la próxima vez.')}
    </section>

    ${caps.editar ? `<div class="op-acciones-row">
      <button class="btn btn-primary" data-op="guardar-resultado">${i('checkCirc', 16)} Guardar ejecución</button>
      ${r.proyectoId
        ? `<span class="op-mute">Vinculada al proyecto ${esc(proyectoNombre || r.proyectoId)}</span>`
        : `<button class="btn btn-ghost" data-op="crear-proyecto">${i('grid', 16)} Convertir en proyecto del ERP</button>`}
    </div>` : ''}
  </div>`;
}

// ── 8. Documentos del proceso ────────────────────────────────────────────────
function _tabDocumentos(ctx) {
  const { documentos = [], caps = {} } = ctx;
  return `<section class="card card-pad">
    <div class="op-h3-row">
      <h3 class="op-h3">Bases y anexos del proceso</h3>
      ${caps.editar ? `<div class="op-head-actions">
        <button class="btn btn-ghost btn-sm" data-op="add-enlace">${i('share', 15)} Agregar enlace</button>
        <label class="btn btn-primary btn-sm op-file">${i('upload', 15)} Subir archivo
          <input type="file" data-op="subir-doc" multiple hidden>
        </label>
      </div>` : ''}
    </div>
    <p class="op-mute op-nota">Los archivos van a un bucket privado, separados por organización. La lectura
    automática de estos documentos (extracción de requisitos, plazos y multas) llega en la Fase 3.</p>

    ${documentos.length === 0
      ? vacio('Sin documentos', 'Sube las bases administrativas y técnicas para tenerlas a mano al cotizar.')
      : `<ul class="op-docs">${documentos.map((d) => `<li>
          <span class="op-docs__ic">${i(d.origen === 'enlace' ? 'external' : 'fileText', 18)}</span>
          <div class="op-docs__main">
            <strong>${esc(d.nombre)}</strong>
            <div class="op-mute">${esc(d.categoria || 'bases')} · ${esc(fecha(d.createdAt))}${d.bytes ? ` · ${Math.round(d.bytes / 1024)} KB` : ''}</div>
          </div>
          ${d.storagePath ? `<button class="btn btn-ghost btn-sm" data-op="ver-doc" data-path="${esc(d.storagePath)}">Abrir</button>` : ''}
          ${d.enlace ? `<a class="btn btn-ghost btn-sm" href="${esc(d.enlace)}" target="_blank" rel="noopener noreferrer">Abrir</a>` : ''}
          ${caps.editar ? `<button class="btn-icon btn-sm" data-op="del-doc" data-id="${esc(d.id)}" data-path="${esc(d.storagePath || '')}" title="Eliminar">${i('trash', 15)}</button>` : ''}
        </li>`).join('')}</ul>`}
  </section>`;
}

// ── 9. Historial ─────────────────────────────────────────────────────────────
function _tabHistorial(ctx) {
  const { actividad = [], perfiles = [] } = ctx;
  return `<section class="card card-pad">
    <h3 class="op-h3">Historial</h3>
    ${actividad.length === 0
      ? '<p class="op-mute">Sin movimientos registrados todavía.</p>'
      : `<ul class="activity-list op-hist">${actividad.map((a) => {
          const quien = perfiles.find((p) => p.id === a.usuario);
          return `<li class="activity-item">
            <span class="activity-dot"></span>
            <div class="activity-text">
              <strong>${esc(a.accion)}</strong>
              ${a.estadoNuevo ? ` — ${esc(estadoLabel(a.estadoAnterior))} → ${esc(estadoLabel(a.estadoNuevo))}` : ''}
              ${a.comentario ? `<div>${esc(a.comentario)}</div>` : ''}
              <div class="activity-time">${esc(quien?.nombre || 'Sistema')} · ${esc(fechaHora(a.createdAt))}</div>
            </div>
          </li>`;
        }).join('')}</ul>`}
  </section>`;
}

// ── Formularios auxiliares (van en el modal global) ──────────────────────────
export function formRiesgo() {
  return `
    <div class="form-group"><label>¿Es una causal crítica de descarte?</label>
      ${select('opRgCausal', [{ v: '', label: 'No, es solo un riesgo a vigilar' },
        ...CAUSALES.map((c) => ({ v: c.slug, label: c.label }))], '', { vacio: '' })}
      <div class="form-hint">Si eliges una causal, la oportunidad queda marcada para descarte con un clic.</div>
    </div>
    <div class="form-group"><label>Descripción <span class="req">*</span></label>
      <textarea id="opRgDesc" rows="3" placeholder="Multa de 10 UF por día de atraso, sin tope"></textarea></div>
    <div class="form-row">
      <div class="form-group"><label>Nivel</label>
        ${select('opRgNivel', [{ v: 'bajo', label: 'Bajo' }, { v: 'medio', label: 'Medio' }, { v: 'alto', label: 'Alto' }, { v: 'critico', label: 'Crítico' }], 'medio', { vacio: '' })}</div>
      <div class="form-group"><label>Mitigación</label><input id="opRgMit" placeholder="Qué haríamos para acotarlo"></div>
    </div>`;
}

export function formMotivo(titulo, hint = '') {
  return `<div class="form-group"><label>${esc(titulo)} <span class="req">*</span></label>
    <textarea id="opMotivo" rows="3" placeholder="Escribe el motivo: queda en el historial"></textarea>
    ${hint ? `<div class="form-hint">${esc(hint)}</div>` : ''}</div>`;
}

export function formFirma(area) {
  const a = AREAS.find((x) => x.id === area);
  return `<p class="op-mute" style="margin-bottom:12px">Firmas la aprobación <strong>${esc(a?.label || area)}</strong> a tu nombre.</p>
    <div class="form-group"><label>Comentario</label><textarea id="opApComentario" rows="3"></textarea></div>
    <div class="form-group"><label>Condiciones o reparos</label><input id="opApCondiciones" placeholder="Solo si la aprobación queda condicionada"></div>`;
}

export function formEditarOportunidad(op, perfiles = []) {
  const cierreLocal = op.fechaCierre ? new Date(op.fechaCierre).toISOString().slice(0, 16) : '';
  return `
    <div class="form-group"><label>Título <span class="req">*</span></label><input id="opETitulo" value="${esc(op.titulo || '')}"></div>
    <div class="form-row">
      <div class="form-group"><label>Institución</label><input id="opEInstitucion" value="${esc(op.institucion || '')}"></div>
      <div class="form-group"><label>ID oficial</label><input id="opECodigo" value="${esc(op.codigoExterno || '')}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Tipo</label>${select('opETipo', TIPOS_PROCEDIMIENTO, op.tipoProcedimiento, { vacio: '— Selecciona —' })}</div>
      <div class="form-group"><label>Región</label>${select('opERegion', REGIONES.map((r) => ({ v: r, label: r })), op.region, { vacio: '— Selecciona —' })}</div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Cierre</label><input id="opECierre" type="datetime-local" value="${esc(cierreLocal)}"></div>
      <div class="form-group"><label>Modalidad</label>${select('opEModalidad', [
        { v: 'remota', label: 'Remota' }, { v: 'presencial', label: 'Presencial' }, { v: 'mixta', label: 'Mixta' }], op.modalidad, { vacio: 'Por definir' })}</div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Presupuesto</label><input id="opEMonto" data-fmt="clp" inputmode="numeric" value="${op.presupuestoMonto ? Number(op.presupuestoMonto).toLocaleString('es-CL') : ''}"></div>
      <div class="form-group"><label>¿Incluye IVA?</label>${select('opEIva', [
        { v: 'desconocido', label: 'Por confirmar' }, { v: 'neto', label: 'Neto' }, { v: 'con_iva', label: 'Incluye IVA' }], op.presupuestoIva, { vacio: '' })}</div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Servicio de Tríada</label>${select('opEServicio', SERVICIOS.map((s) => ({ v: s.slug, label: s.nombre })), op.servicioSlug, { vacio: 'Por definir' })}</div>
      <div class="form-group"><label>Responsable</label>${select('opEResp', perfiles.map((p) => ({ v: p.id, label: p.nombre })), op.responsable, { vacio: 'Sin asignar' })}</div>
    </div>
    <div class="form-group"><label>Códigos UNSPSC</label><input id="opEUnspsc" value="${esc((op.unspsc || []).join(', '))}" placeholder="80101504, 81112103"></div>
    <div class="form-group"><label>Enlace oficial</label><input id="opEEnlace" type="url" value="${esc(op.enlace || '')}"></div>
    <div class="form-group"><label>Descripción</label><textarea id="opEDesc" rows="3">${esc(op.descripcion || '')}</textarea></div>
    <div class="form-group"><label>Notas internas</label><textarea id="opENotas" rows="2">${esc(op.notas || '')}</textarea></div>`;
}

export { CHECKLIST_OFERTA };
