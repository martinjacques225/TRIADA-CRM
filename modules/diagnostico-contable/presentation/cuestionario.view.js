// modules/diagnostico-contable/presentation/cuestionario.view.js
// EL LEVANTAMIENTO — cinco etapas, una pantalla por etapa.
//
// Regla de la metodología que manda sobre el diseño: NO se muestra el puntaje
// mientras se responde. Si el entrevistado ve el número subir y bajar, deja de
// contestar lo que pasa y empieza a contestar lo que conviene. Acá solo se ve el
// avance (cuántas preguntas van), nunca el resultado.

import { esc, i, select, campo, barraProgreso } from './ui.js';
import { ETAPAS, CAMPOS_IDENTIFICACION, INDUSTRIAS, bloquesDeEtapa, respondida } from '../domain/cuestionario.js';
import { CONTROL } from '../domain/puntaje.js';

export function renderCuestionario(ctx) {
  const {
    etapa = 1, datos = {}, respuestas = {}, perfiles = [], empresas = [],
    progreso = { hechas: 0, total: 0, pct: 0 }, guardando = '', faltantes = [],
    esNueva = true, guardadoAt = null,
  } = ctx;

  const meta = ETAPAS.find((e) => e.n === etapa) || ETAPAS[0];

  return `<div class="dct-wizard">
    <div class="dct-wizard__top">
      <button class="btn btn-ghost btn-sm" data-dct="volver-portada">${i('chevL', 14)} Historial</button>
      <div class="dct-wizard__ident">
        <span class="dct-wizard__empresa">${esc(datos.razonSocial || 'Nuevo diagnóstico')}</span>
        ${datos.codigo ? `<span class="dct-mono">${esc(datos.codigo)}</span>` : ''}
      </div>
      <div class="dct-wizard__acciones">
        <span class="dct-autosave" id="dctAutosave" aria-live="polite">${esc(guardando || _textoGuardado(guardadoAt))}</span>
        <button class="btn btn-ghost btn-sm" data-dct="guardar-borrador">${i('download', 14)} Guardar borrador</button>
      </div>
    </div>

    ${_stepper(etapa, respuestas)}
    ${barraProgreso(progreso.pct, `${progreso.hechas} de ${progreso.total} preguntas respondidas`)}

    <section class="dct-etapa" aria-labelledby="dctEtapaTitulo">
      <header class="dct-etapa__head">
        <span class="dct-etapa__n">Etapa ${meta.n} de 5</span>
        <h2 id="dctEtapaTitulo">${esc(meta.label)}</h2>
        <p>${esc(meta.sub)}</p>
      </header>

      ${etapa === 1 ? _etapaIdentificacion(datos, perfiles, empresas, esNueva, faltantes) : ''}
      ${etapa >= 2 && etapa <= 4 ? _etapaPreguntas(meta.id, respuestas, faltantes) : ''}
      ${etapa === 4 ? _observacionesEjecutivo(datos) : ''}
    </section>

    ${_pie(etapa, faltantes)}
  </div>`;
}

function _textoGuardado(at) {
  if (!at) return '';
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return '';
  return `Guardado ${d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`;
}

function _stepper(actual, respuestas) {
  return `<ol class="dct-stepper">
    ${ETAPAS.map((e) => {
      const estado = e.n < actual ? 'hecha' : e.n === actual ? 'activa' : 'pendiente';
      // Solo se puede saltar hacia atrás: adelantarse se hace con "Siguiente",
      // que es donde se validan las respuestas requeridas.
      const clicable = e.n < actual;
      return `<li class="dct-step dct-step--${estado}">
        ${clicable
          ? `<button class="dct-step__btn" data-dct="ir-etapa" data-etapa="${e.n}">
              <span class="dct-step__n">${e.n < actual ? i('checkCirc', 13) : e.n}</span>
              <span class="dct-step__l">${esc(e.label)}</span></button>`
          : `<span class="dct-step__btn" aria-current="${e.n === actual ? 'step' : 'false'}">
              <span class="dct-step__n">${e.n}</span>
              <span class="dct-step__l">${esc(e.label)}</span></span>`}
      </li>`;
    }).join('')}
  </ol>`;
}

// ── ETAPA 1 · Identificación ────────────────────────────────────────────────
function _etapaIdentificacion(d, perfiles, empresas, esNueva, faltantes) {
  const falta = (id) => faltantes.includes(id);

  return `<div class="dct-form">
    <div class="dct-vinculo">
      <div class="dct-vinculo__head">
        <span class="dct-vinculo__t">${i('building', 15)} Empresa</span>
        <div class="dct-vinculo__switch" role="radiogroup" aria-label="Origen de la empresa">
          <button type="button" role="radio" aria-checked="${!esNueva}" class="dct-switch__b${!esNueva ? ' is-on' : ''}" data-dct="origen" data-origen="crm">Ya está en el CRM</button>
          <button type="button" role="radio" aria-checked="${esNueva}" class="dct-switch__b${esNueva ? ' is-on' : ''}" data-dct="origen" data-origen="nueva">Empresa nueva</button>
        </div>
      </div>
      ${!esNueva ? `
        <div class="dct-vinculo__body">
          ${campo('Selecciona la empresa registrada',
            select('dctLead', empresas.map((e) => ({ v: e.id, label: e.label })), d.leadId || d.clienteId || '',
              { vacio: '— Busca la empresa —' }),
            'Al seleccionarla, sus datos se toman de su ficha y no se duplican en el CRM.')}
        </div>` : `
        <div class="dct-vinculo__body dct-vinculo__body--nota">
          Se levantará como empresa nueva. Al guardar el resultado podrás crear la oportunidad comercial en el CRM.
        </div>`}
    </div>

    <div class="dct-grid">
      ${CAMPOS_IDENTIFICACION.map((c) => _campoIdentificacion(c, d, perfiles, falta(c.id))).join('')}
    </div>
    <p class="dct-nota-etapa">${i('bulb', 14)} Estos campos no afectan el puntaje: describen a la empresa y a quién responde.</p>
  </div>`;
}

function _campoIdentificacion(c, d, perfiles, falta) {
  const v = d[c.id] ?? '';
  const inval = falta ? ' aria-invalid="true" class="dct-invalido"' : '';
  const fmt = c.fmt ? ` data-fmt="${esc(c.fmt)}"` : '';
  let control;

  if (c.tipo === 'select') {
    control = select(`dctId_${c.id}`, (c.opciones || INDUSTRIAS).map((x) => ({ v: x, label: x })), v, { vacio: '— Selecciona —' });
  } else if (c.tipo === 'equipo') {
    control = select(`dctId_${c.id}`, perfiles.map((p) => ({ v: p.id, label: p.nombre })), v, { vacio: '— Selecciona —' });
  } else if (c.tipo === 'textarea') {
    control = `<textarea id="dctId_${esc(c.id)}" rows="3"${fmt}>${esc(v)}</textarea>`;
  } else if (c.tipo === 'numero') {
    control = `<input id="dctId_${esc(c.id)}" type="number" inputmode="numeric" min="${c.min ?? 0}" value="${esc(v)}"${inval}>`;
  } else if (c.tipo === 'fecha') {
    control = `<input id="dctId_${esc(c.id)}" type="date" value="${esc(v)}"${inval}>`;
  } else {
    control = `<input id="dctId_${esc(c.id)}" type="text" value="${esc(v)}"${fmt}${inval}>`;
  }

  return campo(c.label, control, falta ? 'Este dato es necesario para continuar.' : (c.hint || ''),
    { requerido: !!c.requerido, col: c.col || 1 });
}

// ── ETAPAS 2 a 4 · Preguntas ────────────────────────────────────────────────
function _etapaPreguntas(etapaId, r, faltantes) {
  const bloques = bloquesDeEtapa(etapaId, r);
  if (!bloques.length) {
    return '<p class="dct-nota-etapa">No hay preguntas para esta etapa según el recorrido de la empresa.</p>';
  }
  return `<div class="dct-preguntas">
    ${bloques.map((b) => `
      <div class="dct-bloque">
        ${b.label ? `<h3 class="dct-bloque__t">${esc(b.label)}</h3>` : ''}
        ${b.preguntas.map((p) => _pregunta(p, r, faltantes)).join('')}
      </div>`).join('')}
  </div>`;
}

function _pregunta(p, r, faltantes) {
  const falta = faltantes.includes(p.id);
  const hecha = respondida(p, r);
  return `<div class="dct-q${falta ? ' dct-q--falta' : ''}${hecha ? ' dct-q--ok' : ''}" data-q="${esc(p.id)}">
    <div class="dct-q__head">
      <span class="dct-q__id">${esc(p.id.replace('_', ' '))}</span>
      <p class="dct-q__texto" id="dctQ_${esc(p.id)}">${esc(p.texto)}${p.requerido ? ' <span class="dct-req" aria-hidden="true">*</span>' : ''}</p>
    </div>
    ${p.ayuda ? `<p class="dct-q__ayuda">${i('bulb', 13)} ${esc(p.ayuda)}</p>` : ''}
    ${_control(p, r)}
    ${falta ? '<p class="dct-q__error" role="alert">Responde esta pregunta para continuar.</p>' : ''}
    ${_subpreguntas(p, r)}
  </div>`;
}

function _control(p, r) {
  const v = r[p.id];
  switch (p.tipo) {
    case 'unica':      return _opciones(p, v, 'radio');
    case 'multiple':   return _opciones(p, Array.isArray(v) ? v : [], 'checkbox');
    case 'inventario': return _inventario(p, v || {});
    case 'activos':    return _activos(p, Array.isArray(v) ? v : []);
    case 'moneda':     return `<input class="dct-input" id="dctR_${esc(p.id)}" data-r="${esc(p.id)}" data-fmt="clp" type="text" inputmode="numeric" value="${esc(_fmtNum(v))}" placeholder="0" aria-labelledby="dctQ_${esc(p.id)}">`;
    case 'numero':     return `<input class="dct-input" id="dctR_${esc(p.id)}" data-r="${esc(p.id)}" type="number" inputmode="numeric" value="${esc(v ?? '')}" aria-labelledby="dctQ_${esc(p.id)}">`;
    case 'textarea':   return `<textarea class="dct-input" id="dctR_${esc(p.id)}" data-r="${esc(p.id)}" rows="3" aria-labelledby="dctQ_${esc(p.id)}">${esc(v ?? '')}</textarea>`;
    default:           return `<input class="dct-input" id="dctR_${esc(p.id)}" data-r="${esc(p.id)}" type="text" value="${esc(v ?? '')}" aria-labelledby="dctQ_${esc(p.id)}">`;
  }
}

const _fmtNum = (v) => (v == null || v === '' ? '' : Number(v).toLocaleString('es-CL'));

function _opciones(p, valor, modo) {
  const marcada = (o) => (modo === 'radio' ? valor === o.v : (valor || []).includes(o.v));
  return `<div class="dct-ops" role="${modo === 'radio' ? 'radiogroup' : 'group'}" aria-labelledby="dctQ_${esc(p.id)}">
    ${(p.opciones || []).map((o) => `
      <button type="button" role="${modo === 'radio' ? 'radio' : 'checkbox'}" aria-checked="${marcada(o)}"
        class="dct-op${marcada(o) ? ' is-on' : ''}${o.desconocido ? ' dct-op--nose' : ''}"
        data-dct="op" data-q="${esc(p.id)}" data-v="${esc(o.v)}" data-modo="${modo}">
        <span class="dct-op__mark" aria-hidden="true"></span>
        <span class="dct-op__body">
          <span class="dct-op__l">${esc(o.label)}</span>
          ${o.ayuda ? `<span class="dct-op__h">${esc(o.ayuda)}</span>` : ''}
        </span>
      </button>`).join('')}
  </div>`;
}

/** Campos que una opción "abre" (Otro → ¿cuál?) se dibujan pegados a la pregunta. */
function _subpreguntas(p, r) {
  const abre = (p.opciones || []).filter((o) => o.abre);
  if (!abre.length) return '';
  const v = r[p.id];
  return abre.map((o) => {
    const activa = Array.isArray(v) ? v.includes(o.v) : v === o.v;
    if (!activa) return '';
    return `<div class="dct-q__extra">
      ${campo('¿Cuál?', `<input class="dct-input" id="dctR_${esc(o.abre)}" data-r="${esc(o.abre)}" type="text" value="${esc(r[o.abre] ?? '')}">`)}
    </div>`;
  }).join('');
}

// ── T3 · Inventario de otros ingresos e inversiones ─────────────────────────
function _inventario(p, v) {
  const seleccion = Array.isArray(v.seleccion) ? v.seleccion : [];
  const detalle = v.detalle || {};
  const conDetalle = seleccion.filter((s) => s !== 'ninguna' && s !== 'no_se');

  return `<div class="dct-inv">
    <div class="dct-ops dct-ops--grid" role="group" aria-labelledby="dctQ_${esc(p.id)}">
      ${(p.opciones || []).map((o) => `
        <button type="button" role="checkbox" aria-checked="${seleccion.includes(o.v)}"
          class="dct-op${seleccion.includes(o.v) ? ' is-on' : ''}${o.desconocido ? ' dct-op--nose' : ''}${o.exclusiva ? ' dct-op--excl' : ''}"
          data-dct="inv-sel" data-q="${esc(p.id)}" data-v="${esc(o.v)}"${o.exclusiva ? ' data-excl="1"' : ''}>
          <span class="dct-op__mark" aria-hidden="true"></span>
          <span class="dct-op__body"><span class="dct-op__l">${esc(o.label)}</span></span>
        </button>`).join('')}
    </div>

    ${conDetalle.length ? `<div class="dct-inv__detalles">
      <p class="dct-inv__nota">${i('bulb', 13)} Tener inversiones no es negativo. Lo que se evalúa es si están contabilizadas, declaradas y respaldadas.</p>
      ${conDetalle.map((sel) => _inventarioItem(p, sel, detalle[sel] || {})).join('')}
    </div>` : ''}
  </div>`;
}

function _inventarioItem(p, sel, d) {
  const op = (p.opciones || []).find((o) => o.v === sel);
  return `<fieldset class="dct-inv__item">
    <legend>${esc(op?.label || sel)}</legend>
    <div class="dct-grid dct-grid--3">
      ${(p.subcampos || []).map((s) => _subcampo(p.id, sel, s, d[s.id])).join('')}
    </div>
  </fieldset>`;
}

function _subcampo(qId, sel, s, valor) {
  const id = `dctInv_${qId}_${sel}_${s.id}`;
  if (s.tipo === 'moneda') {
    return campo(s.label, `<input class="dct-input" id="${esc(id)}" data-inv="${esc(qId)}" data-sel="${esc(sel)}" data-sub="${esc(s.id)}" data-fmt="clp" type="text" inputmode="numeric" value="${esc(_fmtNum(valor))}" placeholder="0">`);
  }
  const opciones = s.tipo === 'control' ? CONTROL : (s.opciones || []);
  return campo(s.label, `<select id="${esc(id)}" data-inv="${esc(qId)}" data-sel="${esc(sel)}" data-sub="${esc(s.id)}">
    <option value="">— Selecciona —</option>
    ${opciones.map((o) => `<option value="${esc(o.v)}"${valor === o.v ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}
  </select>`);
}

// ── T4 · Tabla de activos fijos ─────────────────────────────────────────────
function _activos(p, filas) {
  return `<div class="dct-activos">
    ${filas.length ? `<div class="dct-tabla-wrap"><table class="data-table dct-activos__tabla">
      <thead><tr>${(p.columnas || []).map((c) => `<th>${esc(c.label)}</th>`).join('')}<th class="dct-col-acc"></th></tr></thead>
      <tbody>
        ${filas.map((f, idx) => `<tr>
          ${(p.columnas || []).map((c) => `<td>${_celdaActivo(p.id, idx, c, f[c.id])}</td>`).join('')}
          <td class="dct-col-acc">
            <button type="button" class="btn-icon btn-sm" data-dct="act-del" data-q="${esc(p.id)}" data-idx="${idx}" title="Quitar" aria-label="Quitar activo">${i('trash', 14)}</button>
          </td>
        </tr>`).join('')}
      </tbody>
    </table></div>` : '<p class="dct-mute dct-activos__vacio">Todavía no se agregaron activos.</p>'}
    <button type="button" class="btn btn-ghost btn-sm" data-dct="act-add" data-q="${esc(p.id)}">${i('plus', 14)} Agregar activo</button>
  </div>`;
}

function _celdaActivo(qId, idx, c, valor) {
  const attrs = `data-act="${esc(qId)}" data-idx="${idx}" data-col="${esc(c.id)}"`;
  if (c.tipo === 'select') {
    return `<select ${attrs} aria-label="${esc(c.label)}"><option value="">—</option>
      ${(c.opciones || []).map((o) => `<option value="${esc(o.v)}"${valor === o.v ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`;
  }
  if (c.tipo === 'moneda') {
    return `<input ${attrs} data-fmt="clp" type="text" inputmode="numeric" value="${esc(_fmtNum(valor))}" aria-label="${esc(c.label)}">`;
  }
  if (c.tipo === 'numero') {
    return `<input ${attrs} type="number" inputmode="numeric" ${c.min != null ? `min="${c.min}"` : ''} ${c.max != null ? `max="${c.max}"` : ''} value="${esc(valor ?? '')}" aria-label="${esc(c.label)}">`;
  }
  return `<input ${attrs} type="text" value="${esc(valor ?? '')}" aria-label="${esc(c.label)}">`;
}

// ── Observaciones del ejecutivo (cierre del levantamiento) ──────────────────
function _observacionesEjecutivo(d) {
  return `<div class="dct-obs">
    ${campo('Observaciones del ejecutivo',
      `<textarea id="dctObsEjec" rows="4" placeholder="Lo que viste en la reunión y no cabe en una alternativa: clima, urgencia, quién decide, qué prometieron enviar…">${esc(d.observacionesEjec || '')}</textarea>`,
      'Solo para uso interno de Tríada. No aparece en el informe del cliente.', { col: 2 })}
  </div>`;
}

// ── Pie de navegación ───────────────────────────────────────────────────────
function _pie(etapa, faltantes) {
  const esUltima = etapa === 4;
  return `<div class="dct-wizard__pie">
    <button class="btn btn-ghost" data-dct="anterior" ${etapa === 1 ? 'disabled' : ''}>${i('chevL', 15)} Anterior</button>
    <div class="dct-wizard__pie-msg">
      ${faltantes.length ? `<span class="dct-pie-alerta" role="alert">${i('alert', 14)} ${faltantes.length === 1
        ? 'Falta 1 respuesta obligatoria.'
        : `Faltan ${faltantes.length} respuestas obligatorias.`}</span>` : ''}
    </div>
    <button class="btn btn-primary" data-dct="siguiente">
      ${esUltima ? `${i('checkCirc', 15)} Calcular resultado` : `Siguiente ${i('chevR', 15)}`}
    </button>
  </div>`;
}
