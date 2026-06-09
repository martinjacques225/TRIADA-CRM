// modules/informes/informes.js
import { prospectos, diagnosticos, propuestas, citas } from '../../js/db.js';
import { PIPELINE_STAGES, RUBROS, DIAG_AREAS, formatCLP } from '../../js/utils.js';

export async function render() {
  const [todos, todosD, todasP, todasC] = await Promise.all([
    prospectos.getAll(), diagnosticos.getAll(), propuestas.getAll(), citas.getAll()
  ]);

  // Conversión por etapa
  const byStage = PIPELINE_STAGES.map(st => ({ ...st, cnt: todos.filter(p=>p.estado===st.id).length }));
  const clientes  = todos.filter(p=>p.estado==='Cliente').length;
  const total     = todos.length || 1;
  const tasa      = Math.round(clientes/total*100);

  // Por rubro
  const rubroMap = {};
  todos.forEach(p=>{ const r=p.rubro||'Otro'; rubroMap[r]=(rubroMap[r]||0)+1; });
  const rubros = Object.entries(rubroMap).sort((a,b)=>b[1]-a[1]);

  // Diagnósticos promedio por área
  function avgScore(diagList, areaKey) {
    if (!diagList.length) return 0;
    const vals = diagList.map(d=>{
      const arr = d[`scores${areaKey.charAt(0).toUpperCase()+areaKey.slice(1)}`] || [];
      return Math.round((arr.filter(x=>x===true).length/5)*100);
    });
    return Math.round(vals.reduce((s,v)=>s+v,0)/vals.length);
  }
  const avgTec     = avgScore(todosD, 'Tec');
  const avgVentas  = avgScore(todosD, 'Ventas');
  const avgFinanzas= avgScore(todosD, 'Finanzas');

  // Valor propuestas
  const valorTotal   = todasP.filter(p=>p.estado==='Aceptada').reduce((s,p)=>s+(+p.valor||0),0);
  const valorAbierto = todasP.filter(p=>p.estado==='Enviada'||p.estado==='Negociando').reduce((s,p)=>s+(+p.valor||0),0);

  // Orígenes
  const origenMap = {};
  todos.forEach(p=>{ const o=p.origen||'Otro'; origenMap[o]=(origenMap[o]||0)+1; });

  const center = document.getElementById('center');
  center.innerHTML = `<div class="view-animate">
    <div class="section-head"><h2>Informes y Analítica</h2></div>

    <div class="kpi-grid" style="margin-bottom:28px">
      <div class="kpi-card"><div class="kpi-top"><span class="kpi-label">Total prospectos</span><span class="kpi-ic" style="background:var(--primary-l);color:var(--primary)">👥</span></div><div class="kpi-value">${todos.length}</div></div>
      <div class="kpi-card"><div class="kpi-top"><span class="kpi-label">Tasa de conversión</span><span class="kpi-ic" style="background:var(--green-l);color:var(--green)">🎯</span></div><div class="kpi-value">${tasa}%</div><div class="kpi-sub">${clientes} clientes / ${todos.length} prospectos</div></div>
      <div class="kpi-card"><div class="kpi-top"><span class="kpi-label">Valor cerrado</span><span class="kpi-ic" style="background:var(--amber-l);color:var(--amber)">💰</span></div><div class="kpi-value kpi-value-sm">${formatCLP(valorTotal)}</div></div>
      <div class="kpi-card"><div class="kpi-top"><span class="kpi-label">Valor en pipeline</span><span class="kpi-ic" style="background:var(--violet-l);color:var(--violet)">📊</span></div><div class="kpi-value kpi-value-sm">${formatCLP(valorAbierto)}</div></div>
      <div class="kpi-card"><div class="kpi-top"><span class="kpi-label">Diagnósticos realizados</span><span class="kpi-ic" style="background:var(--primary-l);color:var(--primary)">🔍</span></div><div class="kpi-value">${todosD.length}</div></div>
      <div class="kpi-card"><div class="kpi-top"><span class="kpi-label">Citas realizadas</span><span class="kpi-ic" style="background:var(--navy-l);color:var(--navy)">📅</span></div><div class="kpi-value">${todasC.filter(c=>c.estado==='Realizada').length}</div></div>
    </div>

    <div class="inf-grid">
      <!-- FUNNEL -->
      <div class="card card-pad">
        <h3 class="inf-title">Embudo de conversión</h3>
        <div class="inf-funnel">
          ${byStage.filter(s=>s.id!=='Descartado').map((s,i,arr)=>{
            const w = total > 0 ? Math.max(30, Math.round(s.cnt/total*100)) : 30;
            return `<div class="inf-funnel-stage" style="background:${s.bg};border:1px solid ${s.color}22;width:${w}%">
              <span style="font-size:12px;color:${s.color};font-weight:600">${s.icon} ${s.id}</span>
              <span style="font-size:18px;font-weight:800;color:${s.color}">${s.cnt}</span>
            </div>`;
          }).join('')}
        </div>
      </div>

      <!-- SCORES DIAGNÓSTICO -->
      <div class="card card-pad">
        <h3 class="inf-title">Madurez promedio por área <span style="font-size:12px;font-weight:400;color:var(--text3)">(${todosD.length} diagnósticos)</span></h3>
        ${todosD.length === 0
          ? `<p style="color:var(--text3);font-size:13.5px;margin-top:12px">Realiza diagnósticos para ver estadísticas.</p>`
          : `<div style="margin-top:16px">
              ${[{l:'🖥️ Tecnología',v:avgTec,c:'#5B6BD6'},{l:'📈 Ventas',v:avgVentas,c:'#028090'},{l:'💰 Finanzas',v:avgFinanzas,c:'#4FB286'}].map(a=>`
                <div style="margin-bottom:16px">
                  <div style="display:flex;justify-content:space-between;margin-bottom:6px">
                    <span style="font-size:13.5px;font-weight:600;color:var(--text)">${a.l}</span>
                    <span style="font-size:15px;font-weight:700;color:${a.c}">${a.v}%</span>
                  </div>
                  <div class="score-bar"><div class="score-fill" style="width:${a.v}%;background:${a.c}"></div></div>
                  <div style="font-size:11.5px;color:var(--text3);margin-top:3px">${a.v>=80?'Maduro ✅':a.v>=50?'En desarrollo ⚠️':'Crítico 🚨'}</div>
                </div>`).join('')}
            </div>`}
      </div>

      <!-- RUBROS -->
      <div class="card card-pad">
        <h3 class="inf-title">Prospectos por rubro</h3>
        <div style="margin-top:14px">
          ${rubros.length === 0
            ? `<p style="color:var(--text3);font-size:13.5px">Sin datos aún.</p>`
            : rubros.map(([r,cnt])=>{
                const pct = Math.round(cnt/todos.length*100);
                return `<div style="margin-bottom:12px">
                  <div style="display:flex;justify-content:space-between;margin-bottom:5px">
                    <span style="font-size:13px;color:var(--text)">${r}</span>
                    <span style="font-size:13px;font-weight:600;color:var(--navy)">${cnt} (${pct}%)</span>
                  </div>
                  <div class="score-bar" style="height:8px"><div class="score-fill" style="width:${pct}%;background:var(--primary)"></div></div>
                </div>`;
              }).join('')}
        </div>
      </div>

      <!-- ORIGENES -->
      <div class="card card-pad">
        <h3 class="inf-title">Fuente de prospectos</h3>
        <div style="margin-top:14px">
          ${Object.entries(origenMap).length === 0
            ? `<p style="color:var(--text3);font-size:13.5px">Sin datos aún.</p>`
            : Object.entries(origenMap).sort((a,b)=>b[1]-a[1]).map(([o,cnt])=>{
                const pct = Math.round(cnt/todos.length*100);
                return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
                  <span style="font-size:13.5px;color:var(--text)">${o}</span>
                  <div style="display:flex;align-items:center;gap:10px">
                    <div style="width:80px;height:6px;background:var(--surface3);border-radius:4px;overflow:hidden"><div style="width:${pct}%;height:100%;background:var(--violet);border-radius:4px"></div></div>
                    <span style="font-size:13px;font-weight:600;color:var(--navy);min-width:30px;text-align:right">${cnt}</span>
                  </div>
                </div>`;
              }).join('')}
        </div>
      </div>
    </div>
  </div>`;
}
