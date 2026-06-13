// modules/informes/informes.js
// Informes operativos: foco en lo accionable —
//  · Flujo de entrada de leads (24 h / 7 días / 30 días)
//  · Actividad (diagnósticos, propuestas, clientes nuevos)
//  · Facturación y cobranza (pagadas, por cobrar en plazo, vencidas + días de mora)
// + embudo de conversión y madurez por área como análisis de fondo.
import { prospectos, diagnosticos, propuestas, citas, clientes, facturas } from '../../js/db.js';
import { PIPELINE_STAGES, DIAG_AREAS, formatCLP, formatDate, stageIcon, areaIcon } from '../../js/utils.js';

const _i = (n, s) => (window.icon ? window.icon(n, '', s) : '');
const DAY = 86400000;

export async function render() {
  const [todos, todosD, todasP, todasC, todosCli, todasF] = await Promise.all([
    prospectos.getAll(), diagnosticos.getAll(), propuestas.getAll(),
    citas.getAll(), clientes.getAll(), facturas.getAll(),
  ]);

  const now = Date.now();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const within = (iso, days) => iso && (now - new Date(iso).getTime()) <= days * DAY && new Date(iso).getTime() <= now;

  // ── Flujo de entrada de leads ──
  const leads24 = todos.filter(p => within(p.fechaCreacion, 1)).length;
  const leads7  = todos.filter(p => within(p.fechaCreacion, 7)).length;
  const leads30 = todos.filter(p => within(p.fechaCreacion, 30)).length;

  // ── Actividad ──
  const diag30  = todosD.filter(d => within(d.fecha, 30)).length;
  const propAbiertas = todasP.filter(p => p.estado === 'enviada' || p.estado === 'negociando').length;
  const propAcept    = todasP.filter(p => p.estado === 'aceptada').length;
  const cliNuevos30  = todosCli.filter(c => within(c.fechaAlta, 30)).length;

  // ── Facturación y cobranza ──
  const daysOverdue = (f) => {
    if (!f.vencimiento) return 0;
    const v = new Date(f.vencimiento + 'T00:00:00');
    return Math.max(0, Math.floor((today - v) / DAY));
  };
  const esVencida = (f) => f.estado === 'vencido'
    || (['pendiente', 'parcial'].includes(f.estado) && f.vencimiento && new Date(f.vencimiento + 'T00:00:00') < today);
  const esEnPlazo = (f) => ['pendiente', 'parcial'].includes(f.estado) && !esVencida(f);

  const pagadas  = todasF.filter(f => f.estado === 'pagado');
  const enPlazo  = todasF.filter(esEnPlazo);
  const vencidas = todasF.filter(esVencida).map(f => ({ ...f, mora: daysOverdue(f) })).sort((a, b) => b.mora - a.mora);
  const sum = (arr) => arr.reduce((s, f) => s + (+f.monto || 0), 0);
  const totalFacturado = sum(todasF);

  // ── Conversión + madurez (análisis de fondo) ──
  const total = todos.length || 1;
  const byStage = PIPELINE_STAGES.map(st => ({ ...st, cnt: todos.filter(p => p.estado === st.id).length }));
  const clientesTot = todos.filter(p => p.estado === 'Cliente').length;
  const tasa = Math.round(clientesTot / total * 100);
  const avgScore = (areaKey) => {
    if (!todosD.length) return 0;
    const vals = todosD.map(d => {
      const arr = d[`scores${areaKey}`] || [];
      return Math.round((arr.filter(x => x === true).length / 5) * 100);
    });
    return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
  };
  const madurez = [
    { l: 'Tecnología', id: 'tec', v: avgScore('Tec'),      c: '#5160C0' },
    { l: 'Ventas',     id: 'ventas', v: avgScore('Ventas'), c: '#0C7C88' },
    { l: 'Finanzas',   id: 'finanzas', v: avgScore('Finanzas'), c: '#2E9B73' },
  ];

  const kpi = (label, value, sub, icon, color) => `
    <div class="kpi-card">
      <div class="kpi-top"><span class="kpi-label">${label}</span><span class="kpi-ic" style="background:var(--${color}-l);color:var(--${color})">${_i(icon)}</span></div>
      <div class="kpi-value${String(value).length > 6 ? ' kpi-value-sm' : ''}">${value}</div>
      ${sub ? `<div class="kpi-sub">${sub}</div>` : ''}
    </div>`;

  const center = document.getElementById('center');
  center.innerHTML = `<div class="view-animate">
    <div class="section-head"><h2>Informes y Analítica</h2></div>

    <!-- ── FLUJO DE ENTRADA ── -->
    <h3 class="inf-section-title">Flujo de entrada de leads</h3>
    <div class="kpi-grid" style="margin-bottom:26px">
      ${kpi('Últimas 24 horas', leads24, 'Leads ingresados', 'sparkle', 'primary')}
      ${kpi('Últimos 7 días', leads7, 'Esta semana', 'trending', 'violet')}
      ${kpi('Últimos 30 días', leads30, 'Este mes', 'calClock', 'amber')}
      ${kpi('Total histórico', todos.length, `${todos.filter(p => p.estado !== 'Descartado').length} activos`, 'users', 'green')}
    </div>

    <!-- ── ACTIVIDAD ── -->
    <h3 class="inf-section-title">Actividad</h3>
    <div class="kpi-grid" style="margin-bottom:26px">
      ${kpi('Diagnósticos', todosD.length, `${diag30} en los últimos 30 días`, 'search', 'primary')}
      ${kpi('Propuestas', todasP.length, `${propAbiertas} abiertas · ${propAcept} aceptadas`, 'fileText', 'violet')}
      ${kpi('Clientes en cartera', todosCli.length, `${cliNuevos30} nuevos (30 días)`, 'checkCirc', 'green')}
      ${kpi('Citas realizadas', todasC.filter(c => c.estado === 'Realizada').length, `${todasC.length} agendadas en total`, 'calClock', 'amber')}
    </div>

    <!-- ── FACTURACIÓN Y COBRANZA ── -->
    <h3 class="inf-section-title">Facturación y cobranza</h3>
    <div class="kpi-grid" style="margin-bottom:18px">
      ${kpi('Facturas emitidas', todasF.length, `${formatCLP(totalFacturado)} en total`, 'factura', 'primary')}
      ${kpi('Pagadas', pagadas.length, `${formatCLP(sum(pagadas))} cobrado`, 'checkCirc', 'green')}
      ${kpi('Por cobrar (en plazo)', enPlazo.length, `${formatCLP(sum(enPlazo))} dentro de plazo`, 'clock', 'amber')}
      ${kpi('Vencidas', vencidas.length, `${formatCLP(sum(vencidas))} en mora`, 'alert', 'danger')}
    </div>

    ${vencidas.length ? `
      <div class="card" style="overflow:hidden;margin-bottom:28px">
        <div style="padding:12px 16px;border-bottom:1px solid var(--border);font-weight:700;color:var(--danger);font-size:13.5px;display:flex;align-items:center;gap:8px">
          ${_i('alert', 16)} Facturas vencidas — requieren gestión de cobranza
        </div>
        <table class="data-table">
          <thead><tr><th>Factura</th><th>Cliente</th><th>Monto</th><th>Vencimiento</th><th>Días de mora</th></tr></thead>
          <tbody>
            ${vencidas.map(f => {
              const cli = todosCli.find(c => c.id === f.clienteId);
              const sev = f.mora >= 30 ? 'var(--danger)' : f.mora >= 8 ? 'var(--amber)' : 'var(--text2)';
              return `<tr>
                <td style="font-size:12px;font-weight:700;color:var(--text3);white-space:nowrap">${f.correlativo || '—'}</td>
                <td><strong>${(cli && (cli.razonSocial || cli.nombre)) || '—'}</strong></td>
                <td><strong style="color:var(--navy)">${formatCLP(f.monto)}</strong></td>
                <td style="font-size:12.5px;color:var(--text3)">${f.vencimiento ? formatDate(f.vencimiento) : '—'}</td>
                <td><span style="font-weight:800;color:${sev}">${f.mora}</span> <span style="font-size:12px;color:var(--text3)">día${f.mora !== 1 ? 's' : ''}</span></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>` : `<div class="card card-pad" style="margin-bottom:28px;color:var(--green);font-size:13.5px;display:flex;align-items:center;gap:8px">${_i('checkCirc', 16)} Sin facturas vencidas. Cobranza al día.</div>`}

    <!-- ── ANÁLISIS DE FONDO ── -->
    <h3 class="inf-section-title">Conversión y madurez</h3>
    <div class="inf-grid">
      <div class="card card-pad">
        <h3 class="inf-title">Embudo de conversión <span style="font-size:12px;font-weight:400;color:var(--text3)">(tasa ${tasa}%)</span></h3>
        <div class="inf-funnel">
          ${byStage.filter(s => s.id !== 'Descartado').map(s => {
            const w = Math.max(30, Math.round(s.cnt / total * 100));
            return `<div class="inf-funnel-stage" style="background:${s.bg};border:1px solid ${s.color}22;width:${w}%">
              <span style="font-size:12px;color:${s.color};font-weight:600;display:inline-flex;align-items:center;gap:6px">${stageIcon(s.id, 14)} ${s.id}</span>
              <span style="font-size:18px;font-weight:800;color:${s.color}">${s.cnt}</span>
            </div>`;
          }).join('')}
        </div>
      </div>

      <div class="card card-pad">
        <h3 class="inf-title">Madurez promedio por área <span style="font-size:12px;font-weight:400;color:var(--text3)">(${todosD.length} diagnósticos)</span></h3>
        ${todosD.length === 0
          ? `<p style="color:var(--text3);font-size:13.5px;margin-top:12px">Realiza diagnósticos para ver estadísticas.</p>`
          : `<div style="margin-top:16px">
              ${madurez.map(a => `
                <div style="margin-bottom:16px">
                  <div style="display:flex;justify-content:space-between;margin-bottom:6px">
                    <span style="font-size:13.5px;font-weight:600;color:var(--text);display:inline-flex;align-items:center;gap:7px">${areaIcon(a.id, 15)} ${a.l}</span>
                    <span style="font-size:15px;font-weight:700;color:${a.c}">${a.v}%</span>
                  </div>
                  <div class="score-bar"><div class="score-fill" style="width:${a.v}%;background:${a.c}"></div></div>
                  <div style="font-size:11.5px;color:var(--text3);margin-top:3px">${a.v >= 80 ? 'Maduro' : a.v >= 50 ? 'En desarrollo' : 'Crítico'}</div>
                </div>`).join('')}
            </div>`}
      </div>
    </div>
  </div>`;
}
