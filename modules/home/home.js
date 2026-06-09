// modules/home/home.js
import { prospectos, citas, propuestas } from '../../js/db.js';
import { formatDate, formatCLP, PIPELINE_STAGES, todayStr, stageBadge } from '../../js/utils.js';

export async function render() {
  const [todos, todasCitas, todasPropuestas] = await Promise.all([
    prospectos.getAll(), citas.getAll(), propuestas.getAll()
  ]);

  const today = todayStr();
  const citasHoy = todasCitas.filter(c => c.fecha && c.fecha.slice(0,10) === today && c.estado !== 'Cancelada');
  const nuevos   = todos.filter(p => p.estado === 'Nuevo').length;
  const clientes = todos.filter(p => p.estado === 'Cliente').length;
  const propEnv  = todasPropuestas.filter(p => p.estado === 'Enviada' || p.estado === 'Negociando').length;
  const valorProyectado = todasPropuestas
    .filter(p => p.estado === 'Negociando' || p.estado === 'Aceptada')
    .reduce((sum, p) => sum + (Number(p.valor) || 0), 0);

  // Últimos 5 prospectos
  const recientes = [...todos].sort((a,b) => (b.fechaCreacion||'').localeCompare(a.fechaCreacion||'')).slice(0, 5);

  const center = document.getElementById('center');
  center.innerHTML = `<div class="view-animate">
    <div class="home-header">
      <div>
        <div class="home-greeting">${_saludo()} 👋</div>
        <h1 class="home-title">Panel de Consultoría</h1>
      </div>
      <button class="btn btn-primary" onclick="window._app.openProspectoModal()">+ Nuevo prospecto</button>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card kpi-accent">
        <div class="kpi-label">Prospectos activos</div>
        <div class="kpi-value">${todos.filter(p=>p.estado!=='Descartado').length}</div>
        <div class="kpi-sub">${nuevos} nuevos sin contactar</div>
      </div>
      <div class="kpi-card" style="border-left:3px solid var(--amber)">
        <div class="kpi-label">Propuestas abiertas</div>
        <div class="kpi-value">${propEnv}</div>
        <div class="kpi-sub">En espera o negociación</div>
      </div>
      <div class="kpi-card" style="border-left:3px solid var(--green)">
        <div class="kpi-label">Clientes activos</div>
        <div class="kpi-value">${clientes}</div>
        <div class="kpi-sub">Proyectos en curso</div>
      </div>
      <div class="kpi-card" style="border-left:3px solid var(--violet)">
        <div class="kpi-label">Valor proyectado</div>
        <div class="kpi-value kpi-value-sm">${formatCLP(valorProyectado)}</div>
        <div class="kpi-sub">Propuestas en negociación</div>
      </div>
    </div>

    <div class="home-grid">
      <div>
        <div class="section-head"><h2>Citas de hoy</h2><span class="text-muted" style="font-size:13px">${today}</span></div>
        ${citasHoy.length === 0
          ? `<div class="card card-pad" style="text-align:center;color:var(--text3);font-size:14px">Sin citas programadas para hoy.</div>`
          : citasHoy.map(c => `
            <div class="card card-pad" style="margin-bottom:10px;display:flex;gap:12px;align-items:center">
              <div style="font-size:22px">${_tipoIcon(c.tipo)}</div>
              <div style="flex:1">
                <div style="font-size:14px;font-weight:600;color:var(--navy)">${c.titulo || c.tipo || 'Cita'}</div>
                <div style="font-size:12.5px;color:var(--text3)">${c.hora || ''} · ${c.empresa || ''}</div>
              </div>
              <span class="badge" style="font-size:11px;color:var(--primary);background:var(--primary-l);border-color:var(--primary)">${c.estado || 'Pendiente'}</span>
            </div>`).join('')}
      </div>

      <div>
        <div class="section-head"><h2>Prospectos recientes</h2>
          <button class="btn btn-ghost btn-sm" onclick="window._app.navigate('pipeline')">Ver pipeline →</button>
        </div>
        <div class="card" style="overflow:hidden">
          ${recientes.length === 0
            ? `<div class="card-pad" style="color:var(--text3);font-size:14px">Sin prospectos aún.</div>`
            : recientes.map(p => `
              <div class="prospect-row" onclick="window._app.openProspectoDetail(${p.id})" style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border);cursor:pointer;transition:var(--tr)" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background=''">
                <div style="width:36px;height:36px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0">${(p.nombre||'?')[0].toUpperCase()}</div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:13.5px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.nombre || '—'}</div>
                  <div style="font-size:12px;color:var(--text3)">${p.empresa || p.rubro || '—'}</div>
                </div>
                <div>${stageBadge(p.estado)}</div>
              </div>`).join('')}
        </div>
      </div>
    </div>

    <div style="margin-top:28px">
      <div class="section-head"><h2>Pipeline por etapa</h2></div>
      <div class="home-funnel">
        ${PIPELINE_STAGES.filter(s=>s.id!=='Descartado').map(st=>{
          const cnt = todos.filter(p=>p.estado===st.id).length;
          return `<div class="funnel-stage" onclick="window._app.navigate('pipeline')">
            <div class="funnel-icon">${st.icon}</div>
            <div class="funnel-label">${st.id}</div>
            <div class="funnel-count" style="color:${st.color}">${cnt}</div>
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>`;
}

function _tipoIcon(tipo) {
  if (!tipo) return '📅';
  if (tipo.includes('iagnóstico')) return '🔍';
  if (tipo.includes('ropuesta') || tipo.includes('resentación')) return '📋';
  if (tipo.includes('ontacto')) return '📞';
  return '📅';
}

function _saludo() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}
