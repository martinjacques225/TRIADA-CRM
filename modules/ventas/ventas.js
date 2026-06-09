// modules/ventas/ventas.js
import { sales } from '../../services/sales.service.js';
import { PLANES } from '../../js/planes.js';
import { S } from '../../js/state.js';
import { fmtMoney, escHtml, formatDate, todayStr, toast } from '../../js/utils.js';
import { getWeekStart, isContadoPlan, calcIncentiveSemanal,
         calcMonthComision, groupByWeek } from '../../services/commission.service.js';
import { calcMedallasSemanales, calcTotalMedallas, calcNivel } from '../../services/medal.service.js';

const _ico = {
  money: `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clip-rule="evenodd"/></svg>`,
  trash: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>`
};

export async function render() {
  const center      = document.getElementById('center');
  const allSales    = await sales.getAll();
  const now         = new Date();
  const year        = now.getFullYear(), month = now.getMonth() + 1;
  const debutActivo = window._app?._getDebutActivo ? await window._app._getDebutActivo() : false;
  const calc        = calcMonthComision(allSales, year, month, debutActivo, PLANES);
  const { comisiones, incentivos, bpi, conectividad, debut, total, thisMo, weekDetails } = calc;
  const diasMes       = new Date(year, month, 0).getDate();
  const diasRestantes = diasMes - now.getDate();
  const ritmo         = now.getDate() > 0 ? total / now.getDate() : 0;
  const totalMedallas = calcTotalMedallas(allSales);
  const nivel         = calcNivel(totalMedallas);
  const medEnNivel    = totalMedallas % 5;

  center.innerHTML = `<div class="view-animate">
    <div class="ventas-header">
      <div class="venta-stat-card primary-card"><div class="venta-stat-label">Ventas este mes</div><div class="venta-stat-val">${thisMo.length}</div><div class="venta-stat-sub">${now.toLocaleString('es',{month:'long'})}</div></div>
      <div class="venta-stat-card highlight"><div class="venta-stat-label">💰 Total sueldo mes</div><div class="venta-stat-val" style="font-size:1.3rem">${fmtMoney(total)}</div><div class="venta-stat-sub">acumulado</div></div>
      <div class="venta-stat-card"><div class="venta-stat-label">📈 Proyección mes</div><div class="venta-stat-val" style="font-size:1.2rem">${fmtMoney(ritmo * diasMes)}</div><div class="venta-stat-sub">al ritmo actual</div></div>
      <div class="venta-stat-card"><div class="venta-stat-label">🏅 Nivel ${nivel}</div><div class="venta-stat-val">${totalMedallas} 🏅</div><div class="venta-stat-sub">${medEnNivel}/5 para nivel ${nivel+1}</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">
      <div>
        <div class="section-title">Desglose del sueldo</div>
        <div class="comision-breakdown-card">
          <div class="cb-row"><span>Comisiones por venta</span><span>${fmtMoney(comisiones)}</span></div>
          <div class="cb-row"><span>Incentivos semanales</span><span style="color:var(--success)">${fmtMoney(incentivos)}</span></div>
          <div class="cb-row"><span>BPI por volumen</span><span style="color:var(--purple)">${fmtMoney(bpi)}</span></div>
          <div class="cb-row"><span>Bono conectividad</span><span>${fmtMoney(conectividad)}</span></div>
          ${debut > 0 ? `<div class="cb-row"><span>Bono debut</span><span>${fmtMoney(debut)}</span></div>` : ''}
          <div class="cb-row cb-total"><span>TOTAL</span><span>${fmtMoney(total)}</span></div>
        </div>
      </div>
      <div>
        <div class="section-title">Proyecciones</div>
        <div class="comision-breakdown-card">
          <div class="cb-row"><span>Ritmo diario</span><span>${fmtMoney(ritmo)}</span></div>
          <div class="cb-row"><span>Proyección semanal</span><span>${fmtMoney(ritmo*7)}</span></div>
          <div class="cb-row"><span>Proyección mensual</span><span style="color:var(--primary)">${fmtMoney(ritmo*diasMes)}</span></div>
          <div class="cb-row"><span>Días restantes</span><span>${diasRestantes}</span></div>
          <div style="margin-top:10px;padding:8px;background:var(--primary-light);border-radius:var(--radius-xs)">
            <div style="font-size:.72rem;font-weight:700;color:var(--primary)">BPI mensual (${thisMo.length} ventas)</div>
            <div style="font-size:.8rem;color:var(--text2)">${thisMo.length<6?`Necesitas ${6-thisMo.length} más para BPI`:thisMo.length<10?`Tier 1: ${thisMo.length}×$20.000 — Faltan ${10-thisMo.length} para tier 2`:thisMo.length<13?`Tier 2: ${thisMo.length}×$21.000 — Faltan ${13-thisMo.length} para tier 3`:`Tier 3: ${thisMo.length}×$23.000`}</div>
          </div>
        </div>
      </div>
    </div>
    <div class="section-title">Incentivos por semana (Lun–Dom)</div>
    <div class="week-incentive-table">
      <div class="wi-header"><span>Semana</span><span>Ventas</span><span>Contados</span><span>Inc. Contado</span><span>Inc. General</span><span>Bono pagado</span><span>🏅 Medallas</span></div>
      ${weekDetails.length===0
        ? `<div class="wi-empty">Sin ventas registradas este mes</div>`
        : weekDetails.map(w=>{const meds=calcMedallasSemanales(w.sales);return`
          <div class="wi-row${w.bono>0?' wi-active':''}">
            <span class="wi-week">${formatDate(w.wk)}</span>
            <span>${w.total}</span><span>${w.contados}</span>
            <span>${w.bC>0?fmtMoney(w.bC):'—'}</span>
            <span>${w.bG>0?fmtMoney(w.bG):'—'}</span>
            <span style="font-weight:700;color:${w.bono>0?'var(--success)':'var(--text3)'}">${w.bono>0?fmtMoney(w.bono):'Sin bono'}</span>
            <span>${'🏅'.repeat(meds)||'—'}</span>
          </div>`;}).join('')}
    </div>
    <div class="section-title" style="margin-top:20px">Simulador: "¿Cuánto ganaré si vendo X más?"</div>
    <div class="simulador-card">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <span style="font-size:.85rem;color:var(--text2)">Si vendo</span>
        <input class="calc-number-input" id="simQty" type="number" min="1" max="50" value="2" style="width:70px">
        <select class="filter-select" id="simPlan">${PLANES.filter(p=>p.comision).map(p=>`<option value="${p.id}">${p.nombre}</option>`).join('')}</select>
        <span style="font-size:.85rem;color:var(--text2)">adicionales esta semana</span>
      </div>
      <div id="simResult" style="margin-top:12px"></div>
    </div>
    <div class="section-title" style="margin-top:20px">Ventas registradas</div>
    <div class="ventas-list">
      ${allSales.length===0
        ? `<div class="empty-day">${_ico.money}<h3>Sin ventas aún</h3><p>Registra tu primera venta con el botón de arriba.</p></div>`
        : allSales.sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(s=>{
            const p=PLANES.find(x=>x.id===s.plan);
            return `<div class="venta-row">
              <div class="venta-plan-dot" style="background:${p?.color||'#94A3B8'}"></div>
              <div class="venta-row-info">
                <div class="venta-row-name">${escHtml(s.nombre||'—')}</div>
                <div class="venta-row-plan">${p?.nombre||s.plan}${s.plan==='excepcional'?' ⚠️':''}${s.becaFamiliar?' 🎓':''}${isContadoPlan(s.plan)?' ★':''}</div>
              </div>
              <div class="venta-row-fecha">${formatDate(s.fecha)}</div>
              <div class="venta-row-comision${p?.comision==null?' unknown':''}">${p?.comision!=null?fmtMoney(p.comision):'Por confirmar'}</div>
              <div class="venta-row-actions"><button class="btn-action danger" data-action="delete-sale" data-id="${s.id}">${_ico.trash}</button></div>
            </div>`;}).join('')}
    </div>
  </div>`;

  window._app?.attachCardEvents?.();
  _initSimulador(weekDetails, thisMo.length, bpi);
}

function _initSimulador(weekDetails, thisMoLen, bpiActual) {
  function updateSim() {
    const qty    = parseInt(document.getElementById('simQty').value) || 1;
    const planId = document.getElementById('simPlan').value;
    const p      = PLANES.find(x => x.id === planId);
    if (!p || !p.comision) { document.getElementById('simResult').innerHTML = ''; return; }
    const addComision    = p.comision * qty;
    const simSales       = [...Array(qty)].map(() => ({ plan: planId, fecha: todayStr() }));
    const wkCurrent      = weekDetails.find(w => w.wk === getWeekStart(todayStr()));
    const currentWkSales = wkCurrent ? wkCurrent.sales : [];
    const bonoActual     = calcIncentiveSemanal(currentWkSales).bono;
    const bonoNuevo      = calcIncentiveSemanal([...currentWkSales, ...simSales]).bono;
    const gananciaExtra  = addComision + (bonoNuevo - bonoActual);
    document.getElementById('simResult').innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
        <div style="padding:10px;background:var(--primary-light);border-radius:var(--radius-xs);text-align:center"><div style="font-size:.68rem;color:var(--text2)">+ Comisiones</div><div style="font-size:1rem;font-weight:700;color:var(--primary)">${fmtMoney(addComision)}</div></div>
        <div style="padding:10px;background:var(--success-bg);border-radius:var(--radius-xs);text-align:center"><div style="font-size:.68rem;color:var(--text2)">+ Incentivo sem.</div><div style="font-size:1rem;font-weight:700;color:var(--success)">${fmtMoney(bonoNuevo-bonoActual)}</div></div>
        <div style="padding:10px;background:var(--purple-bg);border-radius:var(--radius-xs);text-align:center"><div style="font-size:.68rem;color:var(--text2)">GANANCIA EXTRA</div><div style="font-size:1rem;font-weight:700;color:var(--purple)">${fmtMoney(gananciaExtra)}</div></div>
      </div>`;
  }
  document.getElementById('simQty').addEventListener('input',   updateSim);
  document.getElementById('simPlan').addEventListener('change', updateSim);
  updateSim();
}

// NOTA: deleteSale vive ahora sólo en modules/modals/modal-venta.js (vía window._app.deleteSale).
