// modules/informes/informes.js
// Informes operativos + tableros gráficos:
//  · KPIs: flujo de entrada de leads, actividad, facturación/cobranza.
//  · Gráficos: ingresos de leads (14 días), estado de la cartera (dona),
//    propuestas por estado (barras), embudo de conversión, madurez por área.
//  · Descarga del informe en PDF corporativo.
import { prospectos, diagnosticos, propuestas, citas, clientes, facturas } from '../../js/db.js';
import { PIPELINE_STAGES, DIAG_AREAS, formatCLP, formatDate, toast, stageIcon, areaIcon, propEstadoLabel, PROP_ESTADOS } from '../../js/utils.js';
import { openCorporateDoc } from '../../js/pdf.js';

const _i = (n, s) => (window.icon ? window.icon(n, '', s) : '');
const DAY = 86400000;

// ── cálculo de métricas (compartido por la vista y el PDF) ──
async function _compute() {
  const [todos, todosD, todasP, todasC, todosCli, todasF] = await Promise.all([
    prospectos.getAll(), diagnosticos.getAll(), propuestas.getAll(),
    citas.getAll(), clientes.getAll(), facturas.getAll(),
  ]);
  const nowT = Date.now();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const within = (iso, d) => iso && (nowT - new Date(iso).getTime()) <= d * DAY && new Date(iso).getTime() <= nowT;

  const daysOverdue = (f) => f.vencimiento ? Math.max(0, Math.floor((today - new Date(f.vencimiento + 'T00:00:00')) / DAY)) : 0;
  const esVencida = (f) => f.estado === 'vencido' || (['pendiente', 'parcial'].includes(f.estado) && f.vencimiento && new Date(f.vencimiento + 'T00:00:00') < today);
  const esEnPlazo = (f) => ['pendiente', 'parcial'].includes(f.estado) && !esVencida(f);
  const pagadas  = todasF.filter(f => f.estado === 'pagado');
  const enPlazo  = todasF.filter(esEnPlazo);
  const vencidas = todasF.filter(esVencida).map(f => ({ ...f, mora: daysOverdue(f) })).sort((a, b) => b.mora - a.mora);

  // leads por día (últimos 14 días)
  const leadsByDay = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY);
    const next = d.getTime() + DAY;
    const value = todos.filter(p => { const t = new Date(p.fechaCreacion || 0).getTime(); return t >= d.getTime() && t < next; }).length;
    leadsByDay.push({ value, short: String(d.getDate()), label: d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) });
  }

  return {
    todos, todosD, todasP, todasC, todosCli, todasF,
    within, sum: (arr) => arr.reduce((s, f) => s + (+f.monto || 0), 0),
    leads24: todos.filter(p => within(p.fechaCreacion, 1)).length,
    leads7:  todos.filter(p => within(p.fechaCreacion, 7)).length,
    leads30: todos.filter(p => within(p.fechaCreacion, 30)).length,
    diag30:  todosD.filter(d => within(d.fecha, 30)).length,
    propAbiertas: todasP.filter(p => p.estado === 'enviada' || p.estado === 'negociando').length,
    propAcept:    todasP.filter(p => p.estado === 'aceptada').length,
    cliNuevos30:  todosCli.filter(c => within(c.fechaAlta, 30)).length,
    pagadas, enPlazo, vencidas, leadsByDay,
  };
}

// ── gráficos (SVG/CSS, sin librerías, theme-aware) ──
function _bars(buckets, color) {
  const max = Math.max(1, ...buckets.map(b => b.value));
  return `<div style="display:flex;align-items:flex-end;gap:3px;height:130px;padding-top:6px">
    ${buckets.map(b => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:3px;height:100%">
      <div style="font-size:9.5px;font-weight:700;color:var(--text2);height:12px">${b.value || ''}</div>
      <div title="${b.label}: ${b.value}" style="width:100%;max-width:18px;border-radius:4px 4px 0 0;background:${color};height:${Math.round((b.value / max) * 100)}%;min-height:${b.value ? 5 : 2}px;opacity:${b.value ? 1 : .25};transition:height .4s var(--ease)"></div>
      <div style="font-size:9px;color:var(--text3)">${b.short}</div>
    </div>`).join('')}
  </div>`;
}

function _donut(segs) {
  const total = segs.reduce((s, x) => s + x.value, 0);
  const R = 42, C = 2 * Math.PI * R; let off = 0;
  const arcs = total === 0
    ? `<circle cx="60" cy="60" r="${R}" fill="none" stroke="var(--surface3)" stroke-width="15"/>`
    : segs.filter(s => s.value > 0).map(s => {
        const len = (s.value / total) * C;
        const c = `<circle cx="60" cy="60" r="${R}" fill="none" stroke="${s.color}" stroke-width="15" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" transform="rotate(-90 60 60)" stroke-linecap="butt"/>`;
        off += len; return c;
      }).join('');
  return `<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
    <svg viewBox="0 0 120 120" width="120" height="120" style="flex-shrink:0">
      ${arcs}
      <text x="60" y="56" text-anchor="middle" font-size="24" font-weight="800" fill="var(--ink)">${total}</text>
      <text x="60" y="74" text-anchor="middle" font-size="10" fill="var(--text3)">facturas</text>
    </svg>
    <div style="flex:1;min-width:140px;display:flex;flex-direction:column;gap:8px">
      ${segs.map(s => `<div style="display:flex;align-items:center;gap:8px;font-size:12.5px">
        <span style="width:11px;height:11px;border-radius:3px;background:${s.color};flex-shrink:0"></span>
        <span style="color:var(--text2);flex:1">${s.label}</span>
        <strong style="color:var(--ink)">${s.value}</strong>
        <span style="color:var(--text3);min-width:92px;text-align:right">${formatCLP(s.amount)}</span>
      </div>`).join('')}
    </div>
  </div>`;
}

function _hbars(rows) {
  const max = Math.max(1, ...rows.map(r => r.value));
  return `<div style="display:flex;flex-direction:column;gap:11px;margin-top:6px">
    ${rows.map(r => `<div>
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:12.5px"><span style="color:var(--text2)">${r.label}</span><strong style="color:var(--ink)">${r.value}</strong></div>
      <div style="height:9px;background:var(--surface3);border-radius:5px;overflow:hidden"><div style="width:${Math.round((r.value / max) * 100)}%;height:100%;background:${r.color};border-radius:5px;transition:width .4s var(--ease)"></div></div>
    </div>`).join('')}
  </div>`;
}

export async function render() {
  const M = await _compute();
  const total = M.todos.length || 1;
  const byStage = PIPELINE_STAGES.map(st => ({ ...st, cnt: M.todos.filter(p => p.estado === st.id).length }));
  const tasa = Math.round(M.todos.filter(p => p.estado === 'Cliente').length / total * 100);
  const avgScore = (k) => { if (!M.todosD.length) return 0; const v = M.todosD.map(d => Math.round(((d[`scores${k}`] || []).filter(x => x === true).length / 5) * 100)); return Math.round(v.reduce((s, x) => s + x, 0) / v.length); };
  const madurez = [{ l: 'Tecnología', id: 'tec', v: avgScore('Tec'), c: '#5160C0' }, { l: 'Ventas', id: 'ventas', v: avgScore('Ventas'), c: '#0C7C88' }, { l: 'Finanzas', id: 'finanzas', v: avgScore('Finanzas'), c: '#2E9B73' }];

  const facSegs = [
    { label: 'Pagadas',            value: M.pagadas.length,  amount: M.sum(M.pagadas),  color: '#2E9B73' },
    { label: 'Por cobrar (plazo)', value: M.enPlazo.length,  amount: M.sum(M.enPlazo),  color: '#C2871A' },
    { label: 'Vencidas',           value: M.vencidas.length, amount: M.sum(M.vencidas), color: '#C04F3F' },
  ];
  const propRows = PROP_ESTADOS.map(e => ({ label: e.label, value: M.todasP.filter(p => p.estado === e.v).length,
    color: { borrador: '#94A0B6', enviada: '#0C7C88', negociando: '#C2871A', aceptada: '#2E9B73', rechazada: '#C04F3F' }[e.v] }));

  const kpi = (label, value, sub, icon, color) => `
    <div class="kpi-card"><div class="kpi-top"><span class="kpi-label">${label}</span><span class="kpi-ic" style="background:var(--${color}-l);color:var(--${color})">${_i(icon)}</span></div>
      <div class="kpi-value${String(value).length > 6 ? ' kpi-value-sm' : ''}">${value}</div>${sub ? `<div class="kpi-sub">${sub}</div>` : ''}</div>`;

  const center = document.getElementById('center');
  center.innerHTML = `<div class="view-animate">
    <div class="section-head">
      <h2>Informes y Analítica</h2>
      <button class="btn btn-primary" onclick="window._app.exportInformePDF()">${_i('download', 15)} Descargar informe (PDF)</button>
    </div>

    <h3 class="inf-section-title">Flujo de entrada de leads</h3>
    <div class="kpi-grid" style="margin-bottom:26px">
      ${kpi('Últimas 24 horas', M.leads24, 'Leads ingresados', 'sparkle', 'primary')}
      ${kpi('Últimos 7 días', M.leads7, 'Esta semana', 'trending', 'violet')}
      ${kpi('Últimos 30 días', M.leads30, 'Este mes', 'calClock', 'amber')}
      ${kpi('Total histórico', M.todos.length, `${M.todos.filter(p => p.estado !== 'Descartado').length} activos`, 'users', 'green')}
    </div>

    <h3 class="inf-section-title">Tableros</h3>
    <div class="inf-grid" style="margin-bottom:14px">
      <div class="card card-pad" style="grid-column:1 / -1">
        <h3 class="inf-title">Ingreso de leads — últimos 14 días</h3>
        ${_bars(M.leadsByDay, 'var(--primary)')}
      </div>
      <div class="card card-pad">
        <h3 class="inf-title">Estado de la cartera de facturas</h3>
        <div style="margin-top:14px">${_donut(facSegs)}</div>
      </div>
      <div class="card card-pad">
        <h3 class="inf-title">Propuestas por estado</h3>
        ${_hbars(propRows)}
      </div>
    </div>

    <h3 class="inf-section-title">Actividad</h3>
    <div class="kpi-grid" style="margin-bottom:26px">
      ${kpi('Diagnósticos', M.todosD.length, `${M.diag30} en los últimos 30 días`, 'search', 'primary')}
      ${kpi('Propuestas', M.todasP.length, `${M.propAbiertas} abiertas · ${M.propAcept} aceptadas`, 'fileText', 'violet')}
      ${kpi('Clientes en cartera', M.todosCli.length, `${M.cliNuevos30} nuevos (30 días)`, 'checkCirc', 'green')}
      ${kpi('Citas realizadas', M.todasC.filter(c => c.estado === 'Realizada').length, `${M.todasC.length} agendadas`, 'calClock', 'amber')}
    </div>

    <h3 class="inf-section-title">Facturación y cobranza</h3>
    <div class="kpi-grid" style="margin-bottom:18px">
      ${kpi('Facturas emitidas', M.todasF.length, `${formatCLP(M.sum(M.todasF))} en total`, 'factura', 'primary')}
      ${kpi('Pagadas', M.pagadas.length, `${formatCLP(M.sum(M.pagadas))} cobrado`, 'checkCirc', 'green')}
      ${kpi('Por cobrar (en plazo)', M.enPlazo.length, `${formatCLP(M.sum(M.enPlazo))} dentro de plazo`, 'clock', 'amber')}
      ${kpi('Vencidas', M.vencidas.length, `${formatCLP(M.sum(M.vencidas))} en mora`, 'alert', 'danger')}
    </div>

    ${M.vencidas.length ? `
      <div class="card" style="overflow:hidden;margin-bottom:28px">
        <div style="padding:12px 16px;border-bottom:1px solid var(--border);font-weight:700;color:var(--danger);font-size:13.5px;display:flex;align-items:center;gap:8px">${_i('alert', 16)} Facturas vencidas — gestión de cobranza</div>
        <table class="data-table"><thead><tr><th>Factura</th><th>Cliente</th><th>Monto</th><th>Vencimiento</th><th>Días de mora</th></tr></thead><tbody>
          ${M.vencidas.map(f => { const c = M.todosCli.find(x => x.id === f.clienteId); const sev = f.mora >= 30 ? 'var(--danger)' : f.mora >= 8 ? 'var(--amber)' : 'var(--text2)';
            return `<tr><td style="font-size:12px;font-weight:700;color:var(--text3);white-space:nowrap">${f.correlativo || '—'}</td><td><strong>${(c && (c.razonSocial || c.nombre)) || '—'}</strong></td><td><strong style="color:var(--navy)">${formatCLP(f.monto)}</strong></td><td style="font-size:12.5px;color:var(--text3)">${f.vencimiento ? formatDate(f.vencimiento) : '—'}</td><td><span style="font-weight:800;color:${sev}">${f.mora}</span> <span style="font-size:12px;color:var(--text3)">día${f.mora !== 1 ? 's' : ''}</span></td></tr>`;
          }).join('')}
        </tbody></table>
      </div>` : `<div class="card card-pad" style="margin-bottom:28px;color:var(--green);font-size:13.5px;display:flex;align-items:center;gap:8px">${_i('checkCirc', 16)} Sin facturas vencidas. Cobranza al día.</div>`}

    <h3 class="inf-section-title">Conversión y madurez</h3>
    <div class="inf-grid">
      <div class="card card-pad">
        <h3 class="inf-title">Embudo de conversión <span style="font-size:12px;font-weight:400;color:var(--text3)">(tasa ${tasa}%)</span></h3>
        <div class="inf-funnel">
          ${byStage.filter(s => s.id !== 'Descartado').map(s => { const w = Math.max(30, Math.round(s.cnt / total * 100));
            return `<div class="inf-funnel-stage" style="background:${s.bg};border:1px solid ${s.color}22;width:${w}%"><span style="font-size:12px;color:${s.color};font-weight:600;display:inline-flex;align-items:center;gap:6px">${stageIcon(s.id, 14)} ${s.id}</span><span style="font-size:18px;font-weight:800;color:${s.color}">${s.cnt}</span></div>`;
          }).join('')}
        </div>
      </div>
      <div class="card card-pad">
        <h3 class="inf-title">Madurez promedio por área <span style="font-size:12px;font-weight:400;color:var(--text3)">(${M.todosD.length} diagnósticos)</span></h3>
        ${M.todosD.length === 0 ? `<p style="color:var(--text3);font-size:13.5px;margin-top:12px">Realiza diagnósticos para ver estadísticas.</p>`
          : `<div style="margin-top:16px">${madurez.map(a => `<div style="margin-bottom:16px"><div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="font-size:13.5px;font-weight:600;color:var(--text);display:inline-flex;align-items:center;gap:7px">${areaIcon(a.id, 15)} ${a.l}</span><span style="font-size:15px;font-weight:700;color:${a.c}">${a.v}%</span></div><div class="score-bar"><div class="score-fill" style="width:${a.v}%;background:${a.c}"></div></div><div style="font-size:11.5px;color:var(--text3);margin-top:3px">${a.v >= 80 ? 'Maduro' : a.v >= 50 ? 'En desarrollo' : 'Crítico'}</div></div>`).join('')}</div>`}
      </div>
    </div>
  </div>`;
}

// ── Descarga del informe en PDF corporativo (reusada por Configuración) ──
export async function exportInformePDF() {
  const M = await _compute();
  const row = (l, v) => `<tr><td>${l}</td><td class="num" style="font-weight:700">${v}</td></tr>`;
  const propStr = PROP_ESTADOS.map(e => `${e.label}: ${M.todasP.filter(p => p.estado === e.v).length}`).join(' · ');
  const bodyHtml = `
    <table class="items"><thead><tr><th>Flujo de entrada de leads</th><th class="num">Valor</th></tr></thead><tbody>
      ${row('Últimas 24 horas', M.leads24)}${row('Últimos 7 días', M.leads7)}${row('Últimos 30 días', M.leads30)}${row('Total histórico', M.todos.length)}
    </tbody></table>
    <table class="items"><thead><tr><th>Actividad</th><th class="num">Valor</th></tr></thead><tbody>
      ${row('Diagnósticos realizados', M.todosD.length)}${row('Propuestas', `${M.todasP.length} (${M.propAcept} aceptadas)`)}${row('Clientes en cartera', M.todosCli.length)}${row('Estados de propuesta', propStr)}
    </tbody></table>
    <table class="items"><thead><tr><th>Facturación y cobranza</th><th class="num">Valor</th></tr></thead><tbody>
      ${row('Facturas emitidas', `${M.todasF.length} · ${formatCLP(M.sum(M.todasF))}`)}
      ${row('Pagadas', `${M.pagadas.length} · ${formatCLP(M.sum(M.pagadas))}`)}
      ${row('Por cobrar (en plazo)', `${M.enPlazo.length} · ${formatCLP(M.sum(M.enPlazo))}`)}
      ${row('Vencidas', `${M.vencidas.length} · ${formatCLP(M.sum(M.vencidas))}`)}
    </tbody></table>
    ${M.vencidas.length ? `<div class="block"><h4>Facturas vencidas</h4><p>${M.vencidas.map(f => { const c = M.todosCli.find(x => x.id === f.clienteId); return `${f.correlativo || '—'} · ${(c && (c.razonSocial || c.nombre)) || 'Cliente'} — ${formatCLP(f.monto)} (${f.mora} días)`; }).join('\n')}</p></div>` : ''}`;

  const ok = openCorporateDoc({ tipo: 'Informe', titulo: 'Informe ejecutivo de gestión', empresa: 'Tríada Consultoría', bodyHtml });
  if (!ok) toast('Permite ventanas emergentes para descargar el informe', 'error');
}
