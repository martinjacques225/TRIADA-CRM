// modules/medallas/medallas.js
import { sales } from '../../services/sales.service.js';
import { calls } from '../../services/call.service.js';
import { PLANES } from '../../js/planes.js';
import { fmtMoney, formatDate, todayStr } from '../../js/utils.js';
import { getWeekStart, isContadoPlan, groupByWeek, calcIncentiveSemanal } from '../../services/commission.service.js';
import { calcMedallasSemanales, calcTotalMedallas, calcNivel } from '../../services/medal.service.js';

export async function render() {
  const allSales      = await sales.getAll();
  const today         = todayStr();
  const weekStart     = getWeekStart(today);
  const weekSales     = allSales.filter(s => getWeekStart(s.fecha) === weekStart);
  const totalMedallas = calcTotalMedallas(allSales);
  const nivel         = calcNivel(totalMedallas);
  const medEnNivel    = totalMedallas % 5;
  const medEstaSemana = calcMedallasSemanales(weekSales);
  const contadosSemana= weekSales.filter(s => isContadoPlan(s.plan)).length;
  const totalSemana   = weekSales.length;
  const inc           = calcIncentiveSemanal(weekSales);

  document.getElementById('center').innerHTML = `<div class="view-animate">
    <div style="background:linear-gradient(135deg,var(--primary),var(--purple));border-radius:var(--radius-xl);padding:24px;color:white;margin-bottom:20px;display:flex;align-items:center;gap:20px">
      <div style="font-size:3rem">🏆</div>
      <div style="flex:1">
        <div style="font-size:.75rem;opacity:.8;font-weight:600;letter-spacing:.08em">NIVEL ACTUAL</div>
        <div style="font-size:2rem;font-weight:800">Nivel ${nivel}</div>
        <div style="font-size:.85rem;opacity:.9">${totalMedallas} medallas acumuladas · ${medEnNivel}/5 para nivel ${nivel + 1}</div>
        <div style="margin-top:8px;background:rgba(255,255,255,.25);border-radius:99px;height:8px">
          <div style="background:white;border-radius:99px;height:8px;width:${Math.round(medEnNivel / 5 * 100)}%;transition:width .5s"></div>
        </div>
      </div>
    </div>
    <div class="section-title">Esta semana (${formatDate(weekStart)})</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
      <div class="dash-card"><div class="dash-card-label">Ventas totales</div><div class="dash-card-val">${totalSemana}</div></div>
      <div class="dash-card"><div class="dash-card-label">Contados ★</div><div class="dash-card-val">${contadosSemana}</div></div>
      <div class="dash-card"><div class="dash-card-label">Medallas semana</div><div class="dash-card-val">${medEstaSemana} 🏅</div><div class="dash-card-sub">${totalSemana % 4}/${4} del siguiente bloque</div></div>
      <div class="dash-card"><div class="dash-card-label">Incentivo</div><div class="dash-card-val" style="font-size:1.1rem;color:var(--success)">${fmtMoney(inc.bono)}</div><div class="dash-card-sub">${inc.bC > inc.bG ? 'Por contados' : 'Por volumen'}</div></div>
    </div>
    <div class="section-title">Próximos objetivos de incentivo</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
      <div style="padding:14px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius)">
        <div style="font-size:.72rem;font-weight:700;color:var(--text2);margin-bottom:8px">★ INCENTIVO CONTADO</div>
        ${[{n:2,v:90000},{n:3,v:145000},{n:5,v:325000}].map(t =>
          `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border-soft)">
            <span style="font-size:.75rem;color:${contadosSemana >= t.n ? 'var(--success)' : 'var(--text2)'}">${contadosSemana >= t.n ? '✓' : contadosSemana + '/' + t.n} contados</span>
            <span style="font-weight:700;color:${contadosSemana >= t.n ? 'var(--success)' : 'var(--text)'}">${fmtMoney(t.v)}</span>
          </div>`).join('')}
      </div>
      <div style="padding:14px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius)">
        <div style="font-size:.72rem;font-weight:700;color:var(--text2);margin-bottom:8px">📊 INCENTIVO GENERAL</div>
        ${[{n:2,v:30000},{n:3,v:60000},{n:5,v:125000}].map(t =>
          `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border-soft)">
            <span style="font-size:.75rem;color:${totalSemana >= t.n ? 'var(--success)' : 'var(--text2)'}">${totalSemana >= t.n ? '✓' : totalSemana + '/' + t.n} ventas</span>
            <span style="font-weight:700;color:${totalSemana >= t.n ? 'var(--success)' : 'var(--text)'}">${fmtMoney(t.v)}</span>
          </div>`).join('')}
        <div style="margin-top:6px;font-size:.68rem;color:var(--text3)">Se paga el MAYOR entre contado y general</div>
      </div>
    </div>
    <div class="section-title">Sistema de medallas</div>
    <div style="padding:14px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:20px">
      <div style="font-size:.78rem;color:var(--text2);margin-bottom:10px">🏅 1 medalla por cada bloque completo de <strong>4 ventas en la misma semana</strong> (Lun–Dom).</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${[4,8,12,16,20].map(n =>
          `<div style="padding:8px 12px;background:${totalSemana >= n ? 'var(--warning-bg)' : 'var(--surface2)'};border:1px solid ${totalSemana >= n ? 'var(--warning)' : 'var(--border)'};border-radius:var(--radius-sm);text-align:center">
            <div style="font-size:1.2rem">${'🏅'.repeat(Math.floor(n / 4))}</div>
            <div style="font-size:.68rem;color:var(--text2)">${n} ventas</div>
          </div>`).join('')}
      </div>
      <div style="margin-top:10px;padding:8px;background:var(--primary-light);border-radius:var(--radius-xs);font-size:.75rem;color:var(--primary)">
        Nivel actual: <strong>${nivel}</strong> · Se necesitan <strong>5 medallas acumuladas</strong> para subir de nivel
      </div>
    </div>
    <div class="section-title">Historial semanal de medallas</div>
    ${_buildHistorial(allSales)}
  </div>`;
}

function _buildHistorial(allSales) {
  const g     = groupByWeek(allSales);
  const weeks = Object.keys(g).sort().reverse().slice(0, 8);
  if (weeks.length === 0) return `<div style="color:var(--text3);font-size:.8rem;padding:12px">Sin historial de ventas aún</div>`;
  return `<div style="display:flex;flex-direction:column;gap:6px">${weeks.map(wk => {
    const ws   = g[wk];
    const meds = calcMedallasSemanales(ws);
    const inc  = calcIncentiveSemanal(ws);
    return `<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm)">
      <span style="font-size:.72rem;color:var(--text3);width:90px">${formatDate(wk)}</span>
      <span style="font-size:.8rem;color:var(--text2);width:50px">${ws.length} ventas</span>
      <span style="flex:1">${meds > 0 ? '🏅'.repeat(meds) : '<span style="color:var(--text3);font-size:.72rem">Sin medalla</span>'}</span>
      <span style="font-size:.8rem;font-weight:700;color:${inc.bono > 0 ? 'var(--success)' : 'var(--text3)'}">${inc.bono > 0 ? fmtMoney(inc.bono) : 'Sin bono'}</span>
    </div>`;
  }).join('')}</div>`;
}
