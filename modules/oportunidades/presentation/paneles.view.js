// modules/oportunidades/presentation/paneles.view.js — Resumen, plantillas,
// documentos del proveedor, analítica y configuración.
//
// Cinco vistas chicas en un archivo: comparten el mismo vocabulario visual y
// ninguna llega a justificar un módulo propio. Todas son funciones puras de
// render (datos → HTML); los cálculos vienen del dominio.

import { esc, i, clp, pctTxt, fecha, fechaHora, cuentaRegresiva, badgeEstado, kpi, vacio, select, campo, aviso } from './ui.js';
import { causalLabel } from '../domain/descarte.js';
import { CATEGORIAS_DOC, UNSPSC, SERVICIOS, REGIONES } from '../domain/catalogo.js';

// ═══ 1. RESUMEN ══════════════════════════════════════════════════════════════
export function renderResumen(ctx) {
  const { metricas = {}, alertas = [], proximas = [], resumenAlertas = {}, caps = {}, config = {}, ahora = Date.now() } = ctx;

  return `<div class="op-resumen">
    <div class="section-head">
      <div>
        <h2>Oportunidades Públicas</h2>
        <p class="op-sub">Mercado Público y Compra Ágil · analizar muchas, presentar pocas y bien elegidas.</p>
      </div>
      ${caps.editar ? `<button class="btn btn-primary btn-sm" data-op="nueva">${i('plus', 15)} Nueva oportunidad</button>` : ''}
    </div>

    <div class="kpi-grid">
      ${kpi('En bandeja', metricas.detectadas ?? 0, 'Detectadas en total', 'search')}
      ${kpi('Recomendadas', metricas.aptas ?? 0, `Umbral: ${config.puntajeParticipar || 70} puntos`, 'checkCirc', 'var(--green)', 'var(--green-l)')}
      ${kpi('Presentadas', metricas.presentadas ?? 0, `Adjudicadas: ${metricas.adjudicadas ?? 0}`, 'rocket', 'var(--navy)', 'var(--navy-l)')}
      ${kpi('Tasa de éxito', metricas.tasaExito == null ? '—' : `${metricas.tasaExito}%`, 'Sobre lo presentado', 'trending', 'var(--violet)', 'var(--violet-l)')}
    </div>

    <div class="op-grid2" style="margin-top:22px">
      <section class="card card-pad">
        <div class="op-h3-row">
          <h3 class="op-h3">Requiere tu atención</h3>
          ${resumenAlertas.total ? `<span class="op-chip" style="color:var(--danger);background:var(--danger-l)">${resumenAlertas.total}</span>` : ''}
        </div>
        ${alertas.length === 0
          ? '<p class="op-mute">Nada urgente. Buen momento para revisar la bandeja con calma.</p>'
          : `<ul class="op-alertas">${alertas.slice(0, 12).map((a) => `<li class="op-alerta op-alerta--${esc(a.nivel)}">
              <span class="op-alerta__dot"></span>
              <div>
                <strong>${esc(a.titulo)}</strong>
                <div class="op-mute">${esc(a.detalle)}</div>
                ${a.opTitulo ? `<button class="op-link" data-op="abrir" data-id="${esc(a.opId)}">${esc(a.opTitulo)}</button>` : ''}
              </div>
            </li>`).join('')}</ul>`}
      </section>

      <section class="card card-pad">
        <h3 class="op-h3">Cierres más próximos</h3>
        ${proximas.length === 0
          ? '<p class="op-mute">No hay procesos abiertos con fecha de cierre.</p>'
          : `<ul class="op-proximas">${proximas.slice(0, 8).map((o) => {
              const cr = cuentaRegresiva(o.fechaCierre, ahora);
              return `<li>
                <button class="op-link" data-op="abrir" data-id="${esc(o.id)}">${esc(o.titulo)}</button>
                <div class="op-proximas__meta">
                  <span style="color:${cr.color}">${i('clock', 12)} ${esc(cr.texto)}</span>
                  ${badgeEstado(o.estado)}
                  ${o.puntaje != null ? `<span>${o.puntaje} pts</span>` : ''}
                </div>
              </li>`;
            }).join('')}</ul>`}
      </section>
    </div>

    <section class="card card-pad" style="margin-top:20px">
      <h3 class="op-h3">Cómo se decide acá</h3>
      <div class="op-reglas">
        <div><strong>${config.puntajeParticipar || 70} puntos o más</strong><span>Recomendada para participar.</span></div>
        <div><strong>${config.puntajeRevisar || 55} a ${(config.puntajeParticipar || 70) - 1}</strong><span>La revisan los tres socios.</span></div>
        <div><strong>Bajo ${config.puntajeRevisar || 55}</strong><span>No recomendada.</span></div>
        <div><strong>Causal crítica</strong><span>Descarta el proceso aunque el puntaje sea alto.</span></div>
        <div><strong>Margen bajo ${Math.round((config.margenDescarte || 0.25) * 100)}%</strong><span>Causal de descarte.</span></div>
        <div><strong>Presentar</strong><span>Siempre lo hace una persona en el portal. El CRM prepara, no envía.</span></div>
      </div>
    </section>
  </div>`;
}

// ═══ 2. PLANTILLAS DE SERVICIO ═══════════════════════════════════════════════
export function renderPlantillas(ctx) {
  const { plantillas = [], caps = {} } = ctx;
  return `<div class="op-plantillas">
    <div class="section-head">
      <div><h2>Plantillas de servicios</h2>
        <p class="op-sub">La estructura reutilizable de cada servicio: horas, entregables, riesgos y texto base.</p></div>
      ${caps.editar ? `<button class="btn btn-primary btn-sm" data-op="plantilla-nueva">${i('plus', 15)} Nueva plantilla</button>` : ''}
    </div>

    ${plantillas.some((p) => p.esDemo) ? aviso('medio',
      'Las plantillas marcadas como "estimación interna" traen horas y precios de referencia que los socios todavía no validaron. Revísalos antes de usarlos en una oferta real.') : ''}

    ${plantillas.length === 0
      ? vacio('Sin plantillas', 'Corre la migración para cargar las ocho plantillas base, o crea la primera a mano.')
      : `<div class="op-tpl-grid">${plantillas.map((p) => `<article class="op-tpl">
          <div class="op-tpl__head">
            <div>
              <strong>${esc(p.nombre)}</strong>
              ${p.esDemo ? '<span class="op-chip op-chip--warn">estimación interna</span>' : ''}
              ${p.activo ? '' : '<span class="op-chip op-chip--mute">inactiva</span>'}
            </div>
            ${caps.editar ? `<button class="btn-icon btn-sm" data-op="plantilla-editar" data-id="${esc(p.id)}" title="Editar">${i('pencil', 15)}</button>` : ''}
          </div>
          <p class="op-mute">${esc(p.descripcion || '')}</p>
          <div class="op-tpl__datos">
            <div><span>Duración</span><strong>${p.duracionSemanasMin || '?'}–${p.duracionSemanasMax || '?'} sem</strong></div>
            <div><span>Horas base</span><strong>${(p.horasPorRol || []).reduce((s, h) => s + (Number(h.horas) || 0), 0)} h</strong></div>
            <div><span>Precio mínimo</span><strong>${clp(p.precioMinimo)}</strong></div>
            <div><span>Margen esperado</span><strong>${pctTxt(p.margenEsperado)}</strong></div>
          </div>
          ${(p.entregables || []).length ? `<div class="op-tpl__lista"><span>Entregables:</span> ${esc((p.entregables || []).join(' · '))}</div>` : ''}
          ${(p.horasPorRol || []).length ? `<div class="op-tpl__roles">${p.horasPorRol.map((h) =>
            `<span>${esc(h.rol)}: ${esc(h.horas)} h × ${clp(h.valorHora)}</span>`).join('')}</div>` : ''}
        </article>`).join('')}</div>`}
  </div>`;
}

export function formPlantilla(p = {}) {
  return `
    <div class="form-row">
      <div class="form-group"><label>Nombre <span class="req">*</span></label><input id="opPlNombre" value="${esc(p.nombre || '')}"></div>
      <div class="form-group"><label>Identificador</label><input id="opPlSlug" value="${esc(p.slug || '')}" placeholder="sitio-web"></div>
    </div>
    <div class="form-group"><label>Descripción comercial</label><textarea id="opPlDesc" rows="2">${esc(p.descripcion || '')}</textarea></div>
    <div class="form-group"><label>Alcance</label><textarea id="opPlAlcance" rows="2">${esc(p.alcance || '')}</textarea></div>
    <div class="form-group"><label>Exclusiones</label><textarea id="opPlExcl" rows="2">${esc(p.exclusiones || '')}</textarea></div>
    <div class="form-group"><label>Metodología</label><textarea id="opPlMetod" rows="2">${esc(p.metodologia || '')}</textarea></div>
    <div class="form-group"><label>Entregables (uno por línea)</label><textarea id="opPlEntreg" rows="3">${esc((p.entregables || []).join('\n'))}</textarea></div>
    <div class="form-row">
      <div class="form-group"><label>Semanas mínimo</label><input id="opPlSemMin" type="number" min="0" value="${esc(p.duracionSemanasMin ?? '')}"></div>
      <div class="form-group"><label>Semanas máximo</label><input id="opPlSemMax" type="number" min="0" value="${esc(p.duracionSemanasMax ?? '')}"></div>
    </div>
    <div class="form-group"><label>Horas por rol</label>
      <textarea id="opPlHoras" rows="3" placeholder="Consultor|30|16000">${esc((p.horasPorRol || []).map((h) => `${h.rol}|${h.horas}|${h.valorHora}`).join('\n'))}</textarea>
      <div class="form-hint">Una línea por rol: Rol|horas|valor hora.</div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Precio mínimo</label><input id="opPlPrecio" data-fmt="clp" inputmode="numeric" value="${p.precioMinimo ? Number(p.precioMinimo).toLocaleString('es-CL') : ''}"></div>
      <div class="form-group"><label>Margen esperado (%)</label><input id="opPlMargen" type="number" min="0" max="90" value="${p.margenEsperado ? Math.round(p.margenEsperado * 100) : 35}"></div>
    </div>
    <div class="form-group"><label>Riesgos (uno por línea)</label><textarea id="opPlRiesgos" rows="2">${esc((p.riesgos || []).join('\n'))}</textarea></div>
    <div class="form-group"><label>Texto base de la oferta técnica</label><textarea id="opPlTexto" rows="5">${esc(p.textoOferta || '')}</textarea></div>
    <div class="form-group"><label>
      <input type="checkbox" id="opPlDemo"${p.esDemo ? ' checked' : ''}> Marcar como estimación interna sin validar
    </label></div>`;
}

// ═══ 3. DOCUMENTOS DEL PROVEEDOR ═════════════════════════════════════════════
export function renderProveedor(ctx) {
  const { docs = [], caps = {}, ahora = Date.now() } = ctx;
  const porCat = new Map(CATEGORIAS_DOC.map((c) => [c.v, []]));
  docs.forEach((d) => { if (porCat.has(d.categoria)) porCat.get(d.categoria).push(d); });

  const vencidos = docs.filter((d) => d.fechaVencimiento && new Date(d.fechaVencimiento) < ahora).length;
  const porVencer = docs.filter((d) => {
    if (!d.fechaVencimiento) return false;
    const dias = (new Date(d.fechaVencimiento) - ahora) / 86400000;
    return dias >= 0 && dias <= 30;
  }).length;

  return `<div class="op-proveedor">
    <div class="section-head">
      <div><h2>Documentos del proveedor</h2>
        <p class="op-sub">"Cuando aparece una oportunidad hay horas, no días. Si hay que buscar un certificado, la oportunidad ya se perdió."</p></div>
      ${caps.editar ? `<button class="btn btn-primary btn-sm" data-op="doc-nuevo">${i('plus', 15)} Agregar documento</button>` : ''}
    </div>

    <div class="kpi-grid">
      ${kpi('Documentos', docs.length, 'En la carpeta maestra', 'fileText')}
      ${kpi('Por vencer', porVencer, 'En los próximos 30 días', 'clock', 'var(--amber)', 'var(--amber-l)')}
      ${kpi('Vencidos', vencidos, 'Renovar antes de ofertar', 'alert', 'var(--danger)', 'var(--danger-l)')}
    </div>

    ${aviso('medio', 'Nunca se guardan acá la Clave Única, la Clave Tributaria ni contraseñas personales.')}

    ${CATEGORIAS_DOC.map((cat) => {
      const lista = porCat.get(cat.v) || [];
      return `<section class="card card-pad op-cat">
        <div class="op-h3-row">
          <h3 class="op-h3">${esc(cat.label)} <span class="op-mute">(${lista.length})</span></h3>
        </div>
        ${lista.length === 0
          ? `<p class="op-mute">Sugeridos: ${esc(cat.items.join(' · '))}</p>`
          : `<ul class="op-docs">${lista.map((d) => _filaProvDoc(d, caps, ahora)).join('')}</ul>`}
      </section>`;
    }).join('')}
  </div>`;
}

function _filaProvDoc(d, caps, ahora) {
  let estado = d.estado || 'vigente';
  let color = 'var(--green)';
  if (d.fechaVencimiento) {
    const dias = (new Date(d.fechaVencimiento) - ahora) / 86400000;
    if (dias < 0) { estado = 'vencido'; color = 'var(--danger)'; }
    else if (dias <= 30) { estado = 'por vencer'; color = 'var(--amber)'; }
  }
  if (d.estado === 'falta') { estado = 'falta'; color = 'var(--danger)'; }
  return `<li>
    <span class="op-docs__ic">${i('fileText', 18)}</span>
    <div class="op-docs__main">
      <strong>${esc(d.nombre)}</strong>
      <div class="op-mute">
        <span style="color:${color}">${esc(estado)}</span>
        ${d.fechaVencimiento ? ` · vence ${esc(fecha(d.fechaVencimiento))}` : ''}
        ${d.version ? ` · v${esc(d.version)}` : ''}
      </div>
    </div>
    ${d.storagePath
      ? `<button class="btn btn-ghost btn-sm" data-op="prov-ver" data-path="${esc(d.storagePath)}">Abrir</button>`
      : caps.editar ? `<label class="btn btn-ghost btn-sm op-file">Subir<input type="file" data-op="prov-subir" data-id="${esc(d.id)}" hidden></label>` : ''}
    ${caps.editar ? `<button class="btn-icon btn-sm" data-op="prov-editar" data-id="${esc(d.id)}" title="Editar">${i('pencil', 15)}</button>` : ''}
    ${caps.editar ? `<button class="btn-icon btn-sm" data-op="prov-borrar" data-id="${esc(d.id)}" data-path="${esc(d.storagePath || '')}" title="Eliminar">${i('trash', 15)}</button>` : ''}
  </li>`;
}

export function formProveedorDoc(d = {}) {
  return `
    <div class="form-group"><label>Nombre <span class="req">*</span></label><input id="opPdNombre" value="${esc(d.nombre || '')}"></div>
    <div class="form-row">
      <div class="form-group"><label>Categoría</label>${select('opPdCat', CATEGORIAS_DOC.map((c) => ({ v: c.v, label: c.label })), d.categoria || '01_corporativo', { vacio: '' })}</div>
      <div class="form-group"><label>Versión</label><input id="opPdVersion" value="${esc(d.version || '')}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Fecha de emisión</label><input id="opPdEmision" type="date" value="${esc(d.fechaEmision || '')}"></div>
      <div class="form-group"><label>Fecha de vencimiento</label><input id="opPdVence" type="date" value="${esc(d.fechaVencimiento || '')}"></div>
    </div>
    <div class="form-group"><label>Estado</label>${select('opPdEstado', [
      { v: 'vigente', label: 'Vigente' }, { v: 'por_vencer', label: 'Por vencer' },
      { v: 'vencido', label: 'Vencido' }, { v: 'falta', label: 'Falta conseguirlo' },
      { v: 'no_aplica', label: 'No aplica' }], d.estado || 'vigente', { vacio: '' })}</div>
    <div class="form-group"><label>Notas</label><textarea id="opPdDesc" rows="2">${esc(d.descripcion || '')}</textarea></div>`;
}

// ═══ 4. ANALÍTICA ════════════════════════════════════════════════════════════
export function renderAnalitica(ctx) {
  const { metricas = {}, embudo = [], porServicio = [], porInstitucion = [], porUnspsc = [],
          motivosDesc = [], motivosPerd = [], precios = [], filtros = {} } = ctx;

  return `<div class="op-analitica">
    <div class="section-head">
      <div><h2>Analítica y resultados</h2>
        <p class="op-sub">Para saber al día 90 si el canal sirve y si el filtro está bien calibrado.</p></div>
      <div class="op-head-actions">
        ${select('opAPeriodo', [
          { v: '', label: 'Todo el período' }, { v: '30', label: 'Últimos 30 días' },
          { v: '90', label: 'Últimos 90 días' }, { v: '180', label: 'Últimos 180 días' },
        ], filtros.periodo || '', { vacio: '' })}
      </div>
    </div>

    <div class="kpi-grid">
      ${kpi('Ticket promedio', metricas.ticketPromedio == null ? '—' : clp(metricas.ticketPromedio), 'De lo adjudicado', 'coins', 'var(--green)', 'var(--green-l)')}
      ${kpi('Margen promedio', metricas.margenPromedio == null ? '—' : `${metricas.margenPromedio}%`, 'Sobre lo cotizado', 'trending')}
      ${kpi('Facturado neto', clp(metricas.facturadoNeto), `Por cobrar: ${clp(metricas.porCobrar)}`, 'fileText', 'var(--navy)', 'var(--navy-l)')}
      ${kpi('Días de pago', metricas.diasPagoPromedio == null ? '—' : `${metricas.diasPagoPromedio} d`, 'Real, factura a pago', 'clock', 'var(--amber)', 'var(--amber-l)')}
    </div>

    <section class="card card-pad" style="margin-top:20px">
      <h3 class="op-h3">Embudo</h3>
      <div class="op-embudo">
        ${embudo.map((e) => `<div class="op-embudo__paso">
          <div class="op-embudo__barra"><span style="width:${e.pct}%"></span></div>
          <div class="op-embudo__label"><strong>${e.valor}</strong> ${esc(e.label)} <span class="op-mute">${e.pct}%</span></div>
        </div>`).join('')}
      </div>
    </section>

    <div class="op-grid2" style="margin-top:20px">
      <section class="card card-pad">
        <h3 class="op-h3">Utilidad estimada vs real</h3>
        <div class="op-comparativo">
          <div><span>Estimada</span><strong>${clp(metricas.utilidadEstimada)}</strong></div>
          <div><span>Real</span><strong>${clp(metricas.utilidadReal)}</strong></div>
          <div><span>Horas por cotización</span><strong>${metricas.horasPorCotizacion == null ? '—' : `${metricas.horasPorCotizacion} h`}</strong></div>
          <div><span>Capital comprometido</span><strong>${clp(metricas.capitalComprometido)}</strong></div>
          <div><span>Facturas pendientes</span><strong>${metricas.facturasPendientes ?? 0}</strong></div>
          <div><span>Certificados obtenidos</span><strong>${metricas.certificados ?? 0}</strong></div>
        </div>
      </section>

      <section class="card card-pad">
        <h3 class="op-h3">Por qué se descartan</h3>
        ${motivosDesc.length === 0
          ? '<p class="op-mute">Todavía no hay descartes registrados con causal.</p>'
          : `<ul class="op-ranking">${motivosDesc.map((m) => `<li><span>${esc(m.causal === 'sin_causal_registrada' ? 'Sin causal registrada' : causalLabel(m.causal))}</span><strong>${m.n}</strong></li>`).join('')}</ul>`}
        <h3 class="op-h3" style="margin-top:16px">Por qué se pierden</h3>
        ${motivosPerd.length === 0
          ? '<p class="op-mute">Sin motivos de pérdida registrados.</p>'
          : `<ul class="op-ranking">${motivosPerd.map((m) => `<li><span>${esc(m.motivo)}</span><strong>${m.n}</strong></li>`).join('')}</ul>`}
      </section>
    </div>

    <div class="op-grid3" style="margin-top:20px">
      ${_ranking('Por servicio', porServicio, (k) => SERVICIOS.find((s) => s.slug === k)?.nombre || k)}
      ${_ranking('Por institución', porInstitucion)}
      ${_ranking('Por código UNSPSC', porUnspsc, (k) => `${k} — ${(UNSPSC.find((u) => u.codigo === k)?.descripcion || '').slice(0, 28)}`)}
    </div>

    ${precios.length ? `<section class="card card-pad" style="margin-top:20px">
      <h3 class="op-h3">Nuestro precio vs el del ganador</h3>
      <div class="op-tabla-wrap"><table class="data-table op-tabla">
        <thead><tr><th>Proceso</th><th class="op-col-num">Ofertamos</th><th class="op-col-num">Ganador</th><th class="op-col-num">Brecha</th></tr></thead>
        <tbody>${precios.map((p) => `<tr>
          <td><button class="op-link" data-op="abrir" data-id="${esc(p.oportunidadId)}">${esc(p.titulo || p.oportunidadId)}</button></td>
          <td class="op-col-num">${clp(p.nuestro)}</td>
          <td class="op-col-num">${clp(p.ganador)}</td>
          <td class="op-col-num" style="color:${p.brecha > 0 ? 'var(--danger)' : 'var(--green)'}">${p.brechaPct > 0 ? '+' : ''}${p.brechaPct}%</td>
        </tr>`).join('')}</tbody>
      </table></div>
    </section>` : ''}
  </div>`;
}

function _ranking(titulo, filas, label = (k) => k) {
  return `<section class="card card-pad">
    <h3 class="op-h3">${esc(titulo)}</h3>
    ${filas.length === 0
      ? '<p class="op-mute">Sin datos todavía.</p>'
      : `<ul class="op-ranking">${filas.slice(0, 8).map((f) => `<li>
          <span>${esc(label(f.clave))}</span>
          <strong>${f.adjudicadas}/${f.presentadas}${f.tasa == null ? '' : ` · ${f.tasa}%`}</strong>
        </li>`).join('')}</ul>`}
  </section>`;
}

// ═══ 5. CONFIGURACIÓN ════════════════════════════════════════════════════════
export function renderConfig(ctx) {
  const { config = {}, caps = {}, syncLogs = [] } = ctx;
  const dis = caps.configurar ? '' : ' disabled';
  const vigilados = new Set(config.unspsc || []);
  const servicios = new Set(config.servicios || []);

  return `<div class="op-config">
    <div class="section-head">
      <div><h2>Configuración del módulo</h2>
        <p class="op-sub">Umbrales de decisión, códigos que se vigilan y estado de la integración oficial.</p></div>
    </div>

    ${caps.configurar ? '' : aviso('medio', 'Solo un administrador puede cambiar esta configuración.')}

    <section class="card card-pad">
      <h3 class="op-h3">Umbrales de decisión</h3>
      <div class="form-row">
        ${campo('Puntaje para participar', `<input id="opCPart" type="number" min="0" max="100" value="${config.puntajeParticipar ?? 70}"${dis}>`)}
        ${campo('Puntaje para revisar', `<input id="opCRev" type="number" min="0" max="100" value="${config.puntajeRevisar ?? 55}"${dis}>`)}
      </div>
      <div class="form-row">
        ${campo('Margen objetivo (%)', `<input id="opCMargen" type="number" min="0" max="90" value="${Math.round((config.margenObjetivo ?? 0.30) * 100)}"${dis}>`)}
        ${campo('Margen de descarte (%)', `<input id="opCMargenD" type="number" min="0" max="90" value="${Math.round((config.margenDescarte ?? 0.25) * 100)}"${dis}>`)}
      </div>
      <div class="form-row">
        ${campo('Tope sin las tres firmas', `<input id="opCTope" data-fmt="clp" inputmode="numeric" value="${Number(config.topeAprobacionNeto ?? 2500000).toLocaleString('es-CL')}"${dis}>`, 'Sobre este monto neto, siempre firman los tres socios.')}
        ${campo('Horas máximas por cotización', `<input id="opCHoras" type="number" min="0" max="20" step="0.5" value="${config.horasMaxCotizacion ?? 2}"${dis}>`, 'Si se pasa, salta una alerta.')}
      </div>
      <div class="form-row">
        ${campo('Contingencia por defecto (%)', `<input id="opCCont" type="number" min="0" max="50" value="${Math.round((config.contingenciaPct ?? 0.10) * 100)}"${dis}>`)}
        ${campo('IVA (%)', `<input id="opCIva" type="number" min="0" max="30" value="${Math.round((config.ivaTasa ?? 0.19) * 100)}"${dis}>`)}
      </div>
    </section>

    <section class="card card-pad">
      <h3 class="op-h3">Códigos UNSPSC vigilados</h3>
      <p class="op-mute op-nota">Marcar de más satura; marcar de menos deja pasar oportunidades. Se revisan a los 90 días.</p>
      <div class="op-unspsc">
        ${UNSPSC.map((u) => `<label class="op-unspsc__item${u.principal ? '' : ' op-unspsc__item--sec'}">
          <input type="checkbox" data-op="unspsc" value="${esc(u.codigo)}"${vigilados.has(u.codigo) ? ' checked' : ''}${dis}>
          <span><strong>${esc(u.codigo)}</strong> ${esc(u.descripcion)}
          ${u.condicion ? `<em>${esc(u.condicion)}</em>` : ''}</span>
        </label>`).join('')}
      </div>
    </section>

    <section class="card card-pad">
      <h3 class="op-h3">Servicios habilitados</h3>
      <div class="op-servicios">
        ${SERVICIOS.map((s) => `<label class="op-servicio${s.puedeHoy ? '' : ' op-servicio--riesgo'}">
          <input type="checkbox" data-op="servicio" value="${esc(s.slug)}"${servicios.has(s.slug) ? ' checked' : ''}${dis}>
          <span>${esc(s.nombre)}
          <em>riesgo ${esc(s.riesgo)}${s.puedeHoy ? '' : ` · requiere ${esc(s.requiereAliado || 'aliado')}`}</em></span>
        </label>`).join('')}
      </div>
    </section>

    <section class="card card-pad">
      <h3 class="op-h3">Regiones vigiladas</h3>
      <div class="op-regiones">
        ${REGIONES.map((r) => `<label class="op-chip-check">
          <input type="checkbox" data-op="region" value="${esc(r)}"${(config.regiones || []).includes(r) ? ' checked' : ''}${dis}> ${esc(r)}
        </label>`).join('')}
      </div>
    </section>

    <section class="card card-pad">
      <h3 class="op-h3">Integración con la API oficial (Fase 2)</h3>
      <p class="op-mute op-nota">
        La sincronización automática con Mercado Público y Compra Ágil todavía <strong>no está activa</strong>.
        Cuando se active, el ticket de la API vive como variable de entorno del servidor
        (<code>MERCADO_PUBLICO_TICKET</code>, en los secrets de la Edge Function) y nunca llega al navegador.
        Hasta entonces, las oportunidades se cargan a mano y el módulo funciona igual.
      </p>
      <div class="op-sync">
        <span class="op-chip ${config.apiHabilitada ? 'op-chip--ok' : 'op-chip--mute'}">
          ${config.apiHabilitada ? 'Configurada' : 'No configurada'}
        </span>
      </div>
      ${syncLogs.length ? `<div class="op-tabla-wrap" style="margin-top:12px"><table class="data-table op-tabla">
        <thead><tr><th>Fecha</th><th>Fuente</th><th>Encontradas</th><th>Nuevas</th><th>Errores</th></tr></thead>
        <tbody>${syncLogs.map((l) => `<tr>
          <td>${esc(fechaHora(l.inicio))}</td><td>${esc(l.fuente)}</td>
          <td>${l.encontradas}</td><td>${l.nuevas}</td><td>${l.errores}</td>
        </tr>`).join('')}</tbody>
      </table></div>` : '<p class="op-mute">Sin sincronizaciones registradas.</p>'}
    </section>

    ${caps.configurar ? `<div class="op-acciones-row">
      <button class="btn btn-primary" data-op="guardar-config">${i('checkCirc', 16)} Guardar configuración</button>
    </div>` : ''}
  </div>`;
}
