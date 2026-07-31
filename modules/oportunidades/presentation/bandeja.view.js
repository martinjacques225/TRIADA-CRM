// modules/oportunidades/presentation/bandeja.view.js — Bandeja de oportunidades.
//
// Una sola vista sirve a las secciones 2–6 (bandeja, análisis, preparación,
// presentadas, ejecución): cambia el conjunto de estados que se pide, no el
// código. Tabla por defecto; kanban cuando conviene ver el flujo completo.

import { esc, i, clp, fecha, fechaHora, cuentaRegresiva, badgeEstado, chipRecomendacion, barraPuntaje, vacio, select } from './ui.js';
import { ESTADOS } from '../domain/estados.js';
import { SERVICIOS, REGIONES, TIPOS_PROCEDIMIENTO } from '../domain/catalogo.js';

export function renderBandeja(ctx) {
  const {
    titulo, subtitulo, rows = [], total = 0, page = 0, limit = 25, filtros = {},
    config = {}, perfiles = [], seleccion = new Set(), ahora = Date.now(),
    vista = 'tabla', estadosVisibles = [], puedeEditar = true, alertasPorOp = {},
  } = ctx;

  const desde = total ? page * limit + 1 : 0;
  const hasta = Math.min(total, (page + 1) * limit);

  return `<div class="op-bandeja">
    <div class="section-head">
      <div><h2>${esc(titulo)}</h2><p class="op-sub">${esc(subtitulo)}</p></div>
      <div class="op-head-actions">
        <button class="btn btn-ghost btn-sm" data-op="vista" data-vista="${vista === 'tabla' ? 'kanban' : 'tabla'}">
          ${i(vista === 'tabla' ? 'grid' : 'list', 15)} ${vista === 'tabla' ? 'Ver kanban' : 'Ver tabla'}
        </button>
        ${puedeEditar ? `<button class="btn btn-primary btn-sm" data-op="nueva">${i('plus', 15)} Nueva oportunidad</button>` : ''}
      </div>
    </div>

    ${_filtros(filtros, config, perfiles, estadosVisibles)}

    ${seleccion.size && puedeEditar ? `<div class="op-bulk">
      <span>${seleccion.size} seleccionada(s)</span>
      <button class="btn btn-ghost btn-sm" data-op="bulk-descartar">${i('xCirc', 15)} Descartar con motivo</button>
      <button class="btn btn-ghost btn-sm" data-op="bulk-limpiar">Limpiar selección</button>
    </div>` : ''}

    ${rows.length === 0
      ? vacio('No hay oportunidades con estos filtros',
              'Cambia los filtros o crea una manualmente pegando el enlace del proceso.',
              puedeEditar ? '<button class="btn btn-primary btn-sm" data-op="nueva">Crear oportunidad</button>' : '')
      : vista === 'kanban' ? _kanban(rows, ahora, alertasPorOp) : _tabla(rows, seleccion, ahora, config, alertasPorOp, puedeEditar)}

    ${total > limit ? `<div class="op-pager">
      <button class="btn btn-ghost btn-sm" data-op="pag" data-dir="-1" ${page === 0 ? 'disabled' : ''}>${i('chevL', 14)} Anterior</button>
      <span>${desde}–${hasta} de ${total}</span>
      <button class="btn btn-ghost btn-sm" data-op="pag" data-dir="1" ${hasta >= total ? 'disabled' : ''}>Siguiente ${i('arrowR', 14)}</button>
    </div>` : ''}
  </div>`;
}

function _filtros(f, config, perfiles, estadosVisibles) {
  const servicios = SERVICIOS.map((s) => ({ v: s.slug, label: s.nombre }));
  const estados = (estadosVisibles.length ? ESTADOS.filter((e) => estadosVisibles.includes(e.v)) : ESTADOS)
    .map((e) => ({ v: e.v, label: e.label }));
  const unspsc = (config.unspsc || []).map((c) => ({ v: c, label: c }));
  const equipo = perfiles.map((p) => ({ v: p.id, label: p.nombre }));

  return `<div class="op-filtros">
    <div class="op-filtros__buscar">
      ${i('search', 15)}
      <input id="opQ" type="search" placeholder="Buscar por título, institución o ID del proceso…" value="${esc(f.q || '')}">
    </div>
    ${select('opFEstado', estados, f.estado, { vacio: 'Todos los estados' })}
    ${select('opFServicio', servicios, f.servicio, { vacio: 'Todos los servicios' })}
    ${select('opFRegion', REGIONES.map((r) => ({ v: r, label: r })), f.region, { vacio: 'Todas las regiones' })}
    ${unspsc.length ? select('opFUnspsc', unspsc, f.unspsc, { vacio: 'Todos los UNSPSC' }) : ''}
    ${equipo.length ? select('opFResp', equipo, f.responsable, { vacio: 'Todo el equipo' }) : ''}
    ${select('opFOrden', [
      { v: 'cierre', label: 'Ordenar por cierre' },
      { v: 'puntaje', label: 'Ordenar por puntaje' },
      { v: 'monto', label: 'Ordenar por monto' },
      { v: 'reciente', label: 'Más recientes' },
    ], f.orden || 'cierre', { vacio: '' })}
    <button class="btn btn-ghost btn-sm" data-op="limpiar-filtros">Limpiar</button>
  </div>`;
}

function _tabla(rows, seleccion, ahora, config, alertasPorOp, puedeEditar) {
  const umbrales = { participar: config.puntajeParticipar || 70, revisar: config.puntajeRevisar || 55 };
  return `<div class="op-tabla-wrap"><table class="data-table op-tabla">
    <thead><tr>
      ${puedeEditar ? '<th class="op-col-check"><input type="checkbox" data-op="sel-todos" aria-label="Seleccionar todo"></th>' : ''}
      <th>Proceso</th><th>Institución</th><th>Cierre</th><th class="op-col-num">Presupuesto</th>
      <th>Puntaje</th><th>Estado</th><th class="op-col-acc"></th>
    </tr></thead>
    <tbody>
      ${rows.map((o) => _fila(o, seleccion, ahora, umbrales, alertasPorOp[o.id], puedeEditar)).join('')}
    </tbody>
  </table></div>`;
}

function _fila(o, seleccion, ahora, umbrales, alertas, puedeEditar) {
  const cr = cuentaRegresiva(o.fechaCierre, ahora);
  const riesgo = (alertas || []).find((a) => a.nivel === 'critico') || (alertas || []).find((a) => a.nivel === 'alto');
  return `<tr class="op-fila" data-id="${esc(o.id)}">
    ${puedeEditar ? `<td class="op-col-check"><input type="checkbox" data-op="sel" data-id="${esc(o.id)}"${seleccion.has(o.id) ? ' checked' : ''} aria-label="Seleccionar"></td>` : ''}
    <td>
      <button class="op-link" data-op="abrir" data-id="${esc(o.id)}">${esc(o.titulo || 'Sin título')}</button>
      <div class="op-fila__meta">
        ${o.codigoExterno ? `<span class="op-mono">${esc(o.codigoExterno)}</span>` : '<span class="op-mono op-mono--mute">manual</span>'}
        ${o.tipoProcedimiento ? `<span>${esc(_tipoLabel(o.tipoProcedimiento))}</span>` : ''}
        ${riesgo ? `<span class="op-riesgo op-riesgo--${esc(riesgo.nivel)}">${i('alert', 12)} ${esc(riesgo.titulo)}</span>` : ''}
      </div>
    </td>
    <td>${esc(o.institucion || '—')}<div class="op-fila__sub">${esc(o.region || '')}</div></td>
    <td><div class="op-cierre" style="color:${cr.color}">${esc(cr.texto)}</div>
        <div class="op-fila__sub">${esc(fechaHora(o.fechaCierre))}</div></td>
    <td class="op-col-num">${o.presupuestoMonto == null ? '<span class="op-mute">No publicado</span>' : clp(o.presupuestoMonto)}</td>
    <td>${barraPuntaje(o.puntaje, umbrales)}<div class="op-fila__sub">${chipRecomendacion(o.recomendacion)}</div></td>
    <td>${badgeEstado(o.estado)}</td>
    <td class="op-col-acc">
      <button class="btn-icon btn-sm" data-op="abrir" data-id="${esc(o.id)}" title="Abrir ficha">${i('arrowR', 15)}</button>
    </td>
  </tr>`;
}

function _tipoLabel(v) {
  return TIPOS_PROCEDIMIENTO.find((t) => t.v === v)?.label || v;
}

// Kanban por estado: solo se muestran las columnas que tienen algo, para no
// dejar 23 columnas vacías en pantalla.
function _kanban(rows, ahora, alertasPorOp) {
  const porEstado = new Map();
  rows.forEach((o) => {
    if (!porEstado.has(o.estado)) porEstado.set(o.estado, []);
    porEstado.get(o.estado).push(o);
  });
  const cols = ESTADOS.filter((e) => porEstado.has(e.v));
  return `<div class="kanban-board op-kanban">
    ${cols.map((e) => `<div class="kanban-col">
      <div class="kanban-col-head" style="border-top-color:${e.color}">
        <span>${esc(e.label)}</span><span class="op-kanban__n">${porEstado.get(e.v).length}</span>
      </div>
      <div class="kanban-col-body">
        ${porEstado.get(e.v).map((o) => _card(o, ahora, alertasPorOp[o.id])).join('')}
      </div>
    </div>`).join('')}
  </div>`;
}

function _card(o, ahora, alertas) {
  const cr = cuentaRegresiva(o.fechaCierre, ahora);
  const crit = (alertas || []).some((a) => a.nivel === 'critico');
  return `<article class="op-card${crit ? ' op-card--alerta' : ''}" data-op="abrir" data-id="${esc(o.id)}" role="button" tabindex="0">
    <div class="op-card__t">${esc(o.titulo || 'Sin título')}</div>
    <div class="op-card__inst">${esc(o.institucion || 'Sin institución')}</div>
    <div class="op-card__foot">
      <span style="color:${cr.color}">${i('clock', 12)} ${esc(cr.texto)}</span>
      <span>${o.puntaje == null ? '—' : `${o.puntaje} pts`}</span>
    </div>
    ${o.presupuestoMonto != null ? `<div class="op-card__monto">${clp(o.presupuestoMonto)}</div>` : ''}
  </article>`;
}

/** Formulario de alta manual (va dentro del modal global del CRM). */
export function formNuevaOportunidad(config = {}) {
  return `
    <div class="form-hint" style="margin-bottom:12px">
      Pega el enlace del proceso y completa lo que sepas. Lo único obligatorio es el título:
      el resto se puede ir llenando durante el análisis.
    </div>
    <div class="form-group"><label>Enlace del proceso (Mercado Público)</label>
      <input id="opNEnlace" type="url" placeholder="https://www.mercadopublico.cl/…">
      <div class="form-hint">Si el enlace trae el ID (1234-56-LE26), se completa solo.</div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>ID oficial del proceso</label><input id="opNCodigo" placeholder="1234-56-LE26"></div>
      <div class="form-group"><label>Fuente</label>
        ${select('opNFuente', [
          { v: 'manual', label: 'Carga manual' },
          { v: 'compra_agil', label: 'Compra Ágil' },
          { v: 'mercado_publico', label: 'Mercado Público' },
        ], 'manual', { vacio: '' })}
      </div>
    </div>
    <div class="form-group"><label>Título <span class="req">*</span></label>
      <input id="opNTitulo" placeholder="Ej: Levantamiento de procesos para la Municipalidad de…"></div>
    <div class="form-row">
      <div class="form-group"><label>Institución compradora</label><input id="opNInstitucion" placeholder="Municipalidad de Talca"></div>
      <div class="form-group"><label>Tipo de procedimiento</label>
        ${select('opNTipo', TIPOS_PROCEDIMIENTO, 'compra_agil', { vacio: '— Selecciona —' })}</div>
    </div>
    <div class="form-group"><label>Descripción resumida</label>
      <textarea id="opNDesc" rows="3" placeholder="Qué pide el comprador, en dos líneas"></textarea></div>
    <div class="form-row">
      <div class="form-group"><label>Publicación</label><input id="opNPub" type="date"></div>
      <div class="form-group"><label>Cierre (fecha y hora) <span class="req">*</span></label><input id="opNCierre" type="datetime-local"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Región</label>
        ${select('opNRegion', REGIONES.map((r) => ({ v: r, label: r })), 'Maule', { vacio: '— Selecciona —' })}</div>
      <div class="form-group"><label>Modalidad</label>
        ${select('opNModalidad', [
          { v: 'remota', label: 'Remota' }, { v: 'presencial', label: 'Presencial' }, { v: 'mixta', label: 'Mixta' },
        ], '', { vacio: 'Por definir' })}</div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Presupuesto publicado</label><input id="opNMonto" data-fmt="clp" inputmode="numeric" placeholder="1.400.000"></div>
      <div class="form-group"><label>¿Ese monto incluye IVA?</label>
        ${select('opNIva', [
          { v: 'desconocido', label: 'No lo dice / por confirmar' },
          { v: 'neto', label: 'Es neto (sin IVA)' },
          { v: 'con_iva', label: 'Incluye IVA' },
        ], 'desconocido', { vacio: '' })}</div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Servicio de Tríada</label>
        ${select('opNServicio', SERVICIOS.map((s) => ({ v: s.slug, label: s.nombre })), '', { vacio: 'Por definir' })}</div>
      <div class="form-group"><label>Códigos UNSPSC</label>
        <input id="opNUnspsc" placeholder="80101504, 81112103" value="">
        <div class="form-hint">Separados por coma. Vigilados: ${esc((config.unspsc || []).slice(0, 4).join(', '))}…</div>
      </div>
    </div>`;
}
