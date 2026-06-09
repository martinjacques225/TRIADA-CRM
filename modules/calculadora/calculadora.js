// modules/calculadora/calculadora.js
import { PLANES } from '../../js/planes.js';
import { S } from '../../js/state.js';
import { fmtMoney, escHtml, todayStr } from '../../js/utils.js';
import { calcIncentiveSemanal, calcProjection } from '../../services/commission.service.js';

const SEMANAS = 5;
const SIM_KEY = 'crm_sim_grid_v1';

// ───────────────────────── Render principal (router de sub-pestañas) ─────────────────────────
export function render() {
  const tabs = `<div class="calc-tabs">
    <button class="calc-tab${S.calcTab === 'rapida' ? ' active' : ''}" data-tab="rapida">Cálculo rápido</button>
    <button class="calc-tab${S.calcTab === 'simulador' ? ' active' : ''}" data-tab="simulador">Simulador mensual</button>
  </div>`;

  const body = S.calcTab === 'simulador' ? viewSimulador() : viewRapida();
  document.getElementById('center').innerHTML = `<div class="view-animate">${tabs}${body}</div>`;

  document.querySelectorAll('.calc-tab[data-tab]').forEach(t =>
    t.addEventListener('click', () => { S.calcTab = t.dataset.tab; render(); }));

  if (S.calcTab === 'simulador') wireSimulador();
  else wireRapida();
}

// ═════════════════════════════════ VISTA 1 · CÁLCULO RÁPIDO ═════════════════════════════════
// Genera sólo el bloque de resultado (depende de cantidad/beca). Se re-renderiza
// de forma aislada para NO recrear el <input> mientras el usuario escribe.
function _renderResult(plan) {
  const total  = plan.comision != null ? plan.comision * S.calcQty : null;
  const simInc = calcIncentiveSemanal(Array(S.calcQty).fill({ plan: plan.id }));
  return `
    <div class="calc-result">
      <div class="calc-result-label">Comisión total</div>
      <div class="calc-result-amount">${total != null ? fmtMoney(total) : '—'}</div>
      <div class="calc-result-per">${plan.comision != null ? fmtMoney(plan.comision) + ' por venta' : plan.nombre}</div>
    </div>
    ${plan.beca ? `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#FEF9C3;border:1px solid #FDE68A;border-radius:var(--radius-sm);margin-bottom:12px">
      <div><div style="font-size:.8rem;font-weight:700;color:#92400E">🎓 Beca Familiar</div><div style="font-size:.7rem;color:#A16207">Gancho de cierre — sin costo</div></div>
      <button class="toggle${S.calcBeca ? ' on' : ''}" id="becaToggle" style="flex-shrink:0"></button>
    </div>` : ''}
    <div class="calc-breakdown">
      <div class="calc-breakdown-row"><span>Plan</span><span>${escHtml(plan.nombre)}</span></div>
      <div class="calc-breakdown-row"><span>Ventas</span><span>${S.calcQty}</span></div>
      ${plan.beca && S.calcBeca ? `<div class="calc-breakdown-row"><span>Beca Familiar</span><span style="color:#16A34A">✓ Incluida</span></div>` : ''}
      <div class="calc-breakdown-row"><span>Comisión c/u</span><span>${plan.comision != null ? fmtMoney(plan.comision) : '—'}</span></div>
      <div class="calc-breakdown-row"><span>TOTAL</span><span>${total != null ? fmtMoney(total) : 'Por confirmar'}</span></div>
    </div>
    <div style="margin-top:12px;padding:10px;background:var(--surface2);border-radius:var(--radius-sm)">
      <div style="font-size:.72rem;font-weight:700;color:var(--text2);margin-bottom:6px">INCENTIVO SEMANAL ESTIMADO</div>
      ${simInc.bono > 0
        ? `<div style="font-size:.85rem;color:var(--primary);font-weight:700">${fmtMoney(simInc.bono)}</div><div style="font-size:.68rem;color:var(--text3)">Si todas son en la misma semana</div>`
        : `<div style="font-size:.75rem;color:var(--text3)">Necesitas ≥2 ventas/semana para incentivo</div>`}
    </div>
    ${_getMensajeMeta(S.calcQty)}`;
}

function viewRapida() {
  const plan = PLANES.find(p => p.id === S.calcPlan) || PLANES[0];
  return `<div class="calc-grid">
    <div>
      <div class="section-title">Selecciona el plan</div>
      <div class="plan-cards">${PLANES.map(p => `
        <div class="plan-card${S.calcPlan === p.id ? ' selected' : ''}${p.extraoficial ? ' extraoficial' : ''}" data-plan="${p.id}">
          <div class="plan-card-info">
            <div class="plan-card-name">${p.nombre}</div>
            <div class="plan-card-desc">${p.desc}</div>
            <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:4px">
              ${p.badge     ? `<span class="plan-card-badge${p.badgeType === 'gold' ? ' gold' : p.extraoficial ? ' extra' : ''}">${p.badge}</span>` : ''}
              ${p.beca      ? `<span class="plan-card-badge" style="background:#FEF3C7;color:#92400E">🎓 Beca Familiar</span>`  : ''}
              ${p.esContado ? `<span class="plan-card-badge" style="background:#DCFCE7;color:#166534">★ Contado</span>`         : ''}
            </div>
          </div>
          <div class="plan-comision${p.comision == null ? ' unknown' : ''}">${p.comision != null ? fmtMoney(p.comision) : 'Por confirmar'}</div>
        </div>`).join('')}
      </div>
    </div>
    <div class="calc-sidebar">
      <div class="calc-sidebar-title">Tu resultado</div>
      <div class="calc-input-row">
        <label class="calc-input-label">¿Cuántas ventas de este plan?</label>
        <input class="calc-number-input" id="calcQty" type="number" inputmode="numeric" min="1" max="999" value="${S.calcQty}">
      </div>
      <div id="calcResult">${_renderResult(plan)}</div>
    </div>
  </div>`;
}

function wireRapida() {
  const plan = PLANES.find(p => p.id === S.calcPlan) || PLANES[0];

  document.querySelectorAll('.plan-card[data-plan]').forEach(card => {
    card.addEventListener('click', () => { S.calcPlan = card.dataset.plan; S.calcBeca = false; render(); });
  });

  const qtyInput = document.getElementById('calcQty');
  // Re-render SÓLO el bloque de resultado, sin tocar el input (evita el reinicio al escribir).
  const refreshResult = () => {
    document.getElementById('calcResult').innerHTML = _renderResult(plan);
    _bindBeca(plan);
  };
  qtyInput.addEventListener('input', () => {
    const raw = qtyInput.value.trim();
    S.calcQty = raw === '' ? 1 : Math.min(999, Math.max(1, parseInt(raw, 10) || 1));
    refreshResult();
  });
  qtyInput.addEventListener('blur', () => { qtyInput.value = S.calcQty; });

  _bindBeca(plan);
}

function _bindBeca(plan) {
  document.getElementById('becaToggle')?.addEventListener('click', () => {
    S.calcBeca = !S.calcBeca;
    document.getElementById('calcResult').innerHTML = _renderResult(plan);
    _bindBeca(plan);
  });
}

// ═════════════════════════════════ VISTA 2 · SIMULADOR MENSUAL ═════════════════════════════════
function loadSim() {
  try {
    const raw = localStorage.getItem(SIM_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (typeof d.debut === 'boolean') S.simDebut = d.debut;
    return Array.isArray(d.grid) && d.grid.length === SEMANAS ? d.grid : null;
  } catch { return null; }
}
function saveSim() {
  try { localStorage.setItem(SIM_KEY, JSON.stringify({ grid: S.simGrid, debut: S.simDebut })); } catch {}
}
function ensureGrid() {
  if (!Array.isArray(S.simGrid) || S.simGrid.length !== SEMANAS) {
    S.simGrid = loadSim() || Array.from({ length: SEMANAS }, () => ({}));
  }
}

function viewSimulador() {
  ensureGrid();
  const planes = PLANES.filter(p => p.comision != null);
  const r = calcProjection(S.simGrid, PLANES, S.simDebut);
  const maxW = Math.max(1, ...r.weeks.map(w => w.comSemana + w.bono));
  const totalPlan = pid => S.simGrid.reduce((a, wk) => a + (parseInt(wk[pid]) || 0), 0);

  const tabla = `<div class="sim-table-wrap">
    <table class="sim-table">
      <thead><tr>
        <th class="sim-th-plan">Plan / comisión</th>
        ${Array.from({ length: SEMANAS }, (_, w) => `<th>S${w + 1}</th>`).join('')}
        <th class="sim-th-total">Σ</th>
      </tr></thead>
      <tbody>
        ${planes.map(p => `<tr>
          <td class="sim-td-plan">
            <span class="sim-plan-dot" style="background:${p.color}"></span>
            <span class="sim-plan-name">${escHtml(p.nombre)}${p.esContado ? ' <span class="sim-tag">contado</span>' : ''}</span>
            <span class="sim-plan-com">${fmtMoney(p.comision)}</span>
          </td>
          ${Array.from({ length: SEMANAS }, (_, w) => `<td>
            <input class="sim-input" type="number" min="0" inputmode="numeric"
              data-w="${w}" data-p="${p.id}" value="${S.simGrid[w][p.id] || ''}" placeholder="0">
          </td>`).join('')}
          <td class="sim-td-rowtotal">${totalPlan(p.id) || '—'}</td>
        </tr>`).join('')}
      </tbody>
      <tfoot><tr>
        <td class="sim-td-plan" style="font-weight:700">Ventas / semana</td>
        ${r.weeks.map(w => `<td class="sim-foot-n">${w.ventas || 0}</td>`).join('')}
        <td class="sim-td-rowtotal">${r.totalVentas}</td>
      </tr></tfoot>
    </table>
  </div>`;

  const chart = `<div class="sim-chart">
    ${r.weeks.map((w, i) => {
      const hC = Math.round((w.comSemana / maxW) * 100);
      const hB = Math.round((w.bono / maxW) * 100);
      return `<div class="sim-bar-col" title="Semana ${i + 1}: ${fmtMoney(w.comSemana)} comisión + ${fmtMoney(w.bono)} bono">
        <div class="sim-bar-stack">
          <div class="sim-bar sim-bar-bono" style="height:${hB}%"></div>
          <div class="sim-bar sim-bar-com" style="height:${hC}%"></div>
        </div>
        <div class="sim-bar-label">S${i + 1}</div>
      </div>`;
    }).join('')}
  </div>
  <div class="sim-legend">
    <span><span class="sim-dot" style="background:var(--primary)"></span>Comisiones</span>
    <span><span class="sim-dot" style="background:var(--success)"></span>Bonos semanales</span>
  </div>`;

  const kpis = `<div class="sim-kpis">
    <div class="sim-kpi"><div class="sim-kpi-label">Total del mes</div><div class="sim-kpi-val green">${fmtMoney(r.total)}</div></div>
    <div class="sim-kpi"><div class="sim-kpi-label">Comisiones</div><div class="sim-kpi-val">${fmtMoney(r.comisiones)}</div></div>
    <div class="sim-kpi"><div class="sim-kpi-label">Bonos semanales</div><div class="sim-kpi-val">${fmtMoney(r.incentivos)}</div></div>
    <div class="sim-kpi"><div class="sim-kpi-label">BPI mensual</div><div class="sim-kpi-val amber">${fmtMoney(r.bpi)}</div></div>
  </div>`;

  const desglose = `<div class="calc-breakdown" style="margin-top:14px">
    <div class="calc-breakdown-row"><span>Comisiones por planes</span><span>${fmtMoney(r.comisiones)}</span></div>
    <div class="calc-breakdown-row"><span>Bonos semanales</span><span>${fmtMoney(r.incentivos)}</span></div>
    <div class="calc-breakdown-row"><span>BPI — ${r.totalVentas} ventas${r.bpiRate ? ` × ${fmtMoney(r.bpiRate)}` : ' (mín. 6)'}</span><span>${fmtMoney(r.bpi)}</span></div>
    <div class="calc-breakdown-row"><span>Bono conectividad</span><span>${fmtMoney(r.conectividad)}</span></div>
    <div class="calc-breakdown-row">
      <span style="display:flex;align-items:center;gap:8px">Bono debut
        <button class="toggle${S.simDebut ? ' on' : ''}" id="simDebutToggle" style="flex-shrink:0"></button>
      </span><span>${fmtMoney(r.debut)}</span>
    </div>
    <div class="calc-breakdown-row"><span>TOTAL SUELDO DEL MES</span><span>${fmtMoney(r.total)}</span></div>
  </div>`;

  return `<div class="sim-head">
      <div>
        <div class="section-title" style="margin-bottom:2px">Simulador de sueldo mensual</div>
        <div class="sim-sub">Ingresa cuántas ventas de cada plan proyectas por semana. Incluye comisión por plan, bonos semanales, BPI (6+ ventas) y fijos.</div>
      </div>
      <button class="sim-reset" id="simReset">Limpiar</button>
    </div>
    <div class="sim-grid2">
      <div>${tabla}${chart}</div>
      <div class="calc-sidebar">
        <div class="calc-sidebar-title">Proyección del mes</div>
        ${kpis}
        ${desglose}
        <div class="sim-note">${_simMensaje(r)}</div>
      </div>
    </div>`;
}

function wireSimulador() {
  document.querySelectorAll('.sim-input').forEach(inp => {
    inp.addEventListener('input', e => {
      const w = +e.target.dataset.w, p = e.target.dataset.p;
      const v = Math.max(0, parseInt(e.target.value) || 0);
      if (v) S.simGrid[w][p] = v; else delete S.simGrid[w][p];
      saveSim();
      updateSimResults();           // refresco parcial: no re-render para no perder foco
    });
  });
  document.getElementById('simDebutToggle')?.addEventListener('click', () => {
    S.simDebut = !S.simDebut; saveSim(); render();
  });
  document.getElementById('simReset')?.addEventListener('click', () => {
    S.simGrid = Array.from({ length: SEMANAS }, () => ({})); S.simDebut = false; saveSim(); render();
  });
}

// Refresco parcial de KPIs/desglose/gráfico mientras se escribe (mantiene el foco en el input).
function updateSimResults() {
  const center = document.getElementById('center');
  if (!center || S.calcTab !== 'simulador') return;
  const r = calcProjection(S.simGrid, PLANES, S.simDebut);
  const maxW = Math.max(1, ...r.weeks.map(w => w.comSemana + w.bono));

  const planes = PLANES.filter(p => p.comision != null);
  center.querySelectorAll('.sim-td-rowtotal').forEach((td, i) => {
    if (i < planes.length) {
      const pid = planes[i].id;
      const t = S.simGrid.reduce((a, wk) => a + (parseInt(wk[pid]) || 0), 0);
      td.textContent = t || '—';
    } else { td.textContent = r.totalVentas; }
  });
  center.querySelectorAll('.sim-foot-n').forEach((td, i) => td.textContent = r.weeks[i]?.ventas || 0);

  center.querySelectorAll('.sim-bar-col').forEach((col, i) => {
    const w = r.weeks[i]; if (!w) return;
    col.querySelector('.sim-bar-com').style.height  = Math.round((w.comSemana / maxW) * 100) + '%';
    col.querySelector('.sim-bar-bono').style.height = Math.round((w.bono / maxW) * 100) + '%';
    col.title = `Semana ${i + 1}: ${fmtMoney(w.comSemana)} comisión + ${fmtMoney(w.bono)} bono`;
  });

  const kv = center.querySelectorAll('.sim-kpi-val');
  if (kv.length === 4) {
    kv[0].textContent = fmtMoney(r.total);
    kv[1].textContent = fmtMoney(r.comisiones);
    kv[2].textContent = fmtMoney(r.incentivos);
    kv[3].textContent = fmtMoney(r.bpi);
  }

  const rows = center.querySelectorAll('.calc-breakdown-row span:last-child');
  if (rows.length >= 6) {
    rows[0].textContent = fmtMoney(r.comisiones);
    rows[1].textContent = fmtMoney(r.incentivos);
    rows[2].textContent = fmtMoney(r.bpi);
    rows[4].textContent = fmtMoney(r.debut);
    rows[5].textContent = fmtMoney(r.total);
  }
  const bpiLbl = center.querySelectorAll('.calc-breakdown-row span:first-child')[2];
  if (bpiLbl) bpiLbl.textContent = `BPI — ${r.totalVentas} ventas${r.bpiRate ? ` × ${fmtMoney(r.bpiRate)}` : ' (mín. 6)'}`;

  const note = center.querySelector('.sim-note');
  if (note) note.innerHTML = _simMensaje(r);
}

// ───────────────────────── Mensajes motivacionales ─────────────────────────
function _simMensaje(r) {
  if (r.totalVentas === 0) return '👋 Ingresa tus ventas proyectadas por semana para ver tu sueldo estimado.';
  if (r.totalVentas >= 13) return `🏆 ${r.totalVentas} ventas: BPI al máximo ($23.000 c/u). ¡Mes histórico!`;
  if (r.totalVentas >= 10) return `📈 ${r.totalVentas} ventas. Con ${13 - r.totalVentas} más tu BPI sube a $23.000 por unidad.`;
  if (r.totalVentas >= 6)  return `📈 ${r.totalVentas} ventas. Con ${10 - r.totalVentas} más tu BPI sube a $21.000 por unidad.`;
  return `📌 Te faltan ${6 - r.totalVentas} venta${6 - r.totalVentas !== 1 ? 's' : ''} para empezar a cobrar BPI ($20.000 c/u).`;
}

function _getMensajeMeta(qty) {
  if (qty >= 20) return `<div class="meta-motivacional">🏆 ¡IMPARABLE! Con ${qty} ventas ya eres leyenda este mes.</div>`;
  if (qty >= 10) return `<div class="meta-motivacional">🔥 ¡Cazador! ${qty} ventas. Te faltan ${20 - qty} para ser Imparable 🚀</div>`;
  if (qty >= 5)  return `<div class="meta-motivacional">⚡ ¡Racha activa! Te faltan ${10 - qty} para el siguiente nivel 🔥</div>`;
  if (qty >= 1)  return `<div class="meta-motivacional">💪 ¡Vas bien! Te faltan ${5 - qty} ventas para tu primera racha ⚡</div>`;
  return '';
}
