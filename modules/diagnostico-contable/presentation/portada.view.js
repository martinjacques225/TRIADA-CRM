// modules/diagnostico-contable/presentation/portada.view.js
// PORTADA del módulo: indicadores + historial de evaluaciones con filtros.
// Solo render; los datos ya vienen resueltos desde el composition root.

import { esc, i, kpi, badgeEstado, chipRiesgo, barraPuntaje, fecha, uf, vacio, select } from './ui.js';
import { ESTADOS, accionesDisponibles } from '../domain/estados.js';
import { NIVELES } from '../domain/puntaje.js';
import { INDUSTRIAS } from '../domain/cuestionario.js';

const RANGOS_PUNTAJE = [
  { v: '85-100', label: 'Puntaje 85 a 100' },
  { v: '70-84',  label: 'Puntaje 70 a 84' },
  { v: '50-69',  label: 'Puntaje 50 a 69' },
  { v: '0-49',   label: 'Puntaje 0 a 49' },
];

export function renderPortada(ctx) {
  const {
    rows = [], total = 0, page = 0, limit = 25, filtros = {}, indicadores = {},
    perfiles = [], industrias = [], puedeEditar = true,
  } = ctx;

  const desde = total ? page * limit + 1 : 0;
  const hasta = Math.min(total, (page + 1) * limit);
  const nombrePerfil = Object.fromEntries(perfiles.map((p) => [p.id, p.nombre]));
  const hayFiltros = !!(filtros.q || filtros.estado || filtros.riesgo || filtros.industria
    || filtros.ejecutivo || filtros.desde || filtros.hasta || filtros.rango || filtros.archivadas);

  return `<div class="dct-portada">
    ${_hero(puedeEditar)}
    ${_indicadores(indicadores)}

    <div class="section-head dct-hist-head">
      <div>
        <h2>Historial de evaluaciones</h2>
        <p class="dct-sub">Cada diagnóstico levantado, con su puntaje, su nivel de riesgo y en qué quedó.</p>
      </div>
      <div class="dct-head-actions">
        <button class="btn btn-ghost btn-sm" data-dct="toggle-archivadas">
          ${i(filtros.archivadas ? 'list' : 'layers', 15)} ${filtros.archivadas ? 'Ver activas' : 'Ver archivadas'}
        </button>
      </div>
    </div>

    ${_filtros(filtros, perfiles, industrias)}

    ${rows.length === 0
      ? vacio(
          hayFiltros ? 'No hay evaluaciones con estos filtros' : 'Todavía no hay diagnósticos contables',
          hayFiltros
            ? 'Cambia o limpia los filtros para ver el resto del historial.'
            : 'Levanta el primero en la próxima reunión con un gerente o responsable financiero.',
          puedeEditar ? `<button class="btn btn-primary btn-sm" data-dct="nuevo">${i('plus', 15)} Nuevo diagnóstico</button>` : '')
      : _tabla(rows, nombrePerfil, puedeEditar)}

    ${total > limit ? `<div class="dct-pager">
      <button class="btn btn-ghost btn-sm" data-dct="pag" data-dir="-1" ${page === 0 ? 'disabled' : ''}>${i('chevL', 14)} Anterior</button>
      <span>${desde}–${hasta} de ${total}</span>
      <button class="btn btn-ghost btn-sm" data-dct="pag" data-dir="1" ${hasta >= total ? 'disabled' : ''}>Siguiente ${i('arrowR', 14)}</button>
    </div>` : ''}
  </div>`;
}

function _hero(puedeEditar) {
  return `<header class="dct-hero">
    <div class="dct-hero__texto">
      <span class="dct-hero__kicker">Tríada · Evaluación preliminar</span>
      <h1 class="dct-hero__titulo">Diagnóstico Contable y Tributario</h1>
      <p class="dct-hero__bajada">Evaluación preliminar para empresas e industrias de mayor complejidad</p>
      <p class="dct-hero__nota">
        Prediagnóstico comercial construido sobre las respuestas declaradas por el cliente.
        No constituye auditoría, certificación, informe legal ni dictamen profesional.
      </p>
    </div>
    ${puedeEditar ? `<div class="dct-hero__cta">
      <button class="btn btn-primary dct-btn-hero" data-dct="nuevo">${i('plus', 16)} Nuevo diagnóstico</button>
    </div>` : ''}
  </header>`;
}

function _indicadores(ind) {
  return `<div class="kpi-grid dct-kpis">
    ${kpi('Diagnósticos realizados', ind.realizados ?? 0,
      ind.borradores ? `${ind.borradores} en borrador` : 'Cuestionarios cerrados', 'clipCheck',
      'var(--dct-teal)', 'var(--dct-teal-l)')}
    ${kpi('Empresas con salud favorable', ind.favorables ?? 0,
      '85 a 100 puntos', 'checkCirc', 'var(--green)', 'var(--green-l)')}
    ${kpi('Empresas con observaciones', ind.observaciones ?? 0,
      '70 a 84 puntos', 'eye', 'var(--amber)', 'var(--amber-l)')}
    ${kpi('Requieren revisión especializada', ind.derivar ?? 0,
      'Con alertas prioritarias o bajo 85', 'alert', 'var(--danger)', 'var(--danger-l)')}
    ${kpi('Oportunidades comerciales', ind.oportunidades ?? 0,
      'Generadas desde este módulo', 'trending', 'var(--dct-azul)', 'var(--violet-l)')}
  </div>`;
}

function _filtros(f, perfiles, industrias) {
  const listaIndustrias = (industrias.length ? industrias : INDUSTRIAS).map((x) => ({ v: x, label: x }));
  const equipo = perfiles.map((p) => ({ v: p.id, label: p.nombre }));
  // Los filtros no llevan <label> visible (el placeholder de cada uno ya dice qué
  // filtra), así que el nombre accesible va en aria-label: sin él, un lector de
  // pantalla los anuncia como seis "cuadros combinados" sin decir de qué.
  const etiqueta = (txt) => `aria-label="${esc(txt)}"`;
  return `<div class="dct-filtros">
    <div class="dct-filtros__buscar">
      ${i('search', 15)}
      <input id="dctQ" type="search" placeholder="Buscar por empresa, RUT o folio…" value="${esc(f.q || '')}" aria-label="Buscar evaluaciones por empresa, RUT o folio">
    </div>
    ${select('dctFEstado', ESTADOS.map((e) => ({ v: e.v, label: e.label })), f.estado, { vacio: 'Todos los estados', attrs: etiqueta('Filtrar por estado comercial') })}
    ${select('dctFRiesgo', NIVELES.map((n) => ({ v: n.id, label: n.label })), f.riesgo, { vacio: 'Todos los niveles', attrs: etiqueta('Filtrar por nivel de riesgo') })}
    ${select('dctFRango', RANGOS_PUNTAJE, f.rango, { vacio: 'Todos los puntajes', attrs: etiqueta('Filtrar por rango de puntaje') })}
    ${select('dctFIndustria', listaIndustrias, f.industria, { vacio: 'Todas las industrias', attrs: etiqueta('Filtrar por industria') })}
    ${equipo.length ? select('dctFEjec', equipo, f.ejecutivo, { vacio: 'Todo el equipo', attrs: etiqueta('Filtrar por ejecutivo TRIADA') }) : ''}
    <div class="dct-filtros__fechas">
      <label for="dctFDesde">Desde</label>
      <input id="dctFDesde" type="date" value="${esc(f.desde || '')}">
      <label for="dctFHasta">Hasta</label>
      <input id="dctFHasta" type="date" value="${esc(f.hasta || '')}">
    </div>
    ${select('dctFOrden', [
      { v: 'reciente', label: 'Más recientes' },
      { v: 'fecha',    label: 'Por fecha de evaluación' },
      { v: 'puntaje',  label: 'Por puntaje' },
      { v: 'empresa',  label: 'Por empresa (A-Z)' },
    ], f.orden || 'reciente', { vacio: '', attrs: etiqueta('Ordenar el historial') })}
    <button class="btn btn-ghost btn-sm" data-dct="limpiar-filtros">Limpiar</button>
  </div>`;
}

function _tabla(rows, nombrePerfil, puedeEditar) {
  return `<div class="dct-tabla-wrap"><table class="data-table dct-tabla">
    <thead><tr>
      <th>Empresa</th><th>Industria</th><th>Fecha</th><th>Ejecutivo</th>
      <th>Enfoque evaluado</th><th>Puntaje</th><th>Nivel de riesgo</th>
      <th class="dct-col-num">Precio inicial</th><th>Estado</th><th class="dct-col-acc">Acciones</th>
    </tr></thead>
    <tbody>${rows.map((e) => _fila(e, nombrePerfil, puedeEditar)).join('')}</tbody>
  </table></div>`;
}

const ENFOQUE_LABEL = {
  financiera: 'Financiera', tributaria: 'Tributaria', auditoria: 'Auditoría',
  integral: 'Integral', preventiva: 'Preventiva', otro: 'Otro',
};

function _fila(e, nombrePerfil, puedeEditar) {
  const acc = accionesDisponibles(e);
  const enfoque = (e.enfoque || []).map((x) => ENFOQUE_LABEL[x] || x);
  const nAlertas = (e.alertas || []).length;
  const criticas = (e.alertas || []).filter((a) => a.nivel === 'critico').length;

  return `<tr class="dct-fila" data-id="${esc(e.id)}">
    <td>
      <button class="dct-link" data-dct="abrir" data-id="${esc(e.id)}">${esc(e.razonSocial || 'Sin razón social')}</button>
      <div class="dct-fila__meta">
        ${e.codigo ? `<span class="dct-mono">${esc(e.codigo)}</span>` : ''}
        ${e.nombreFantasia ? `<span>${esc(e.nombreFantasia)}</span>` : ''}
        ${e.leadId || e.clienteId ? `<span class="dct-fila__link">${i('building', 12)} En el CRM</span>` : ''}
        ${nAlertas ? `<span class="dct-riesgo dct-riesgo--${criticas ? 'critico' : 'alto'}">${i('alert', 12)} ${nAlertas} alerta${nAlertas > 1 ? 's' : ''}</span>` : ''}
      </div>
    </td>
    <td>${esc(e.industria || '—')}</td>
    <td>${esc(fecha(e.fecha))}</td>
    <td>${esc(nombrePerfil[e.ejecutivo] || '—')}</td>
    <td>${enfoque.length
      ? `<div class="dct-enfoques">${enfoque.map((x) => `<span class="dct-chip dct-chip--mute">${esc(x)}</span>`).join('')}</div>`
      : '<span class="dct-mute">—</span>'}</td>
    <td>${barraPuntaje(e.puntajeGeneral, { compacta: true })}
      <div class="dct-fila__sub">F ${e.puntajeFinanciero ?? '—'} · T ${e.puntajeTributario ?? '—'}</div></td>
    <td>${chipRiesgo(e.nivelRiesgo)}</td>
    <td class="dct-col-num">${e.precioInicialUf != null
      ? `desde ${esc(uf(e.precioInicialUf))}`
      : '<span class="dct-mute">Sujeto a revisión</span>'}</td>
    <td>${badgeEstado(e.estado)}</td>
    <td class="dct-col-acc">
      <div class="dct-acciones">
        ${acc.continuar
          ? `<button class="btn-icon btn-sm" data-dct="continuar" data-id="${esc(e.id)}" title="Continuar" aria-label="Continuar el diagnóstico">${i('pencil', 15)}</button>`
          : `<button class="btn-icon btn-sm" data-dct="abrir" data-id="${esc(e.id)}" title="Abrir" aria-label="Abrir el resultado">${i('eye', 15)}</button>`}
        ${puedeEditar && !acc.continuar
          ? `<button class="btn-icon btn-sm" data-dct="editar" data-id="${esc(e.id)}" title="Editar respuestas" aria-label="Editar respuestas">${i('pencil', 15)}</button>` : ''}
        ${puedeEditar
          ? `<button class="btn-icon btn-sm" data-dct="duplicar" data-id="${esc(e.id)}" title="Duplicar" aria-label="Duplicar la evaluación">${i('repeat', 15)}</button>` : ''}
        ${acc.informe
          ? `<button class="btn-icon btn-sm" data-dct="informe" data-id="${esc(e.id)}" title="Generar informe" aria-label="Generar informe preliminar">${i('fileText', 15)}</button>` : ''}
        ${puedeEditar ? (acc.archivar
          ? `<button class="btn-icon btn-sm" data-dct="archivar" data-id="${esc(e.id)}" title="Archivar" aria-label="Archivar la evaluación">${i('layers', 15)}</button>`
          : `<button class="btn-icon btn-sm" data-dct="restaurar" data-id="${esc(e.id)}" title="Restaurar" aria-label="Restaurar la evaluación">${i('refresh', 15)}</button>`) : ''}
      </div>
    </td>
  </tr>`;
}
