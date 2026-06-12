// modules/home/home.js
import { prospectos, citas, propuestas, config } from '../../js/db.js';
import { formatDate, formatCLP, PIPELINE_STAGES, todayStr, stageBadge, stageIcon, escHtml, meetingType } from '../../js/utils.js';

const _i = (n, s) => (window.icon ? window.icon(n, '', s) : '');
import { S } from '../../js/state.js';

export async function render() {
  const [todos, todasCitas, todasPropuestas, userName] = await Promise.all([
    prospectos.getAll(), citas.getAll(), propuestas.getAll(), config.get('userName')
  ]);

  const today = todayStr();
  const pMap = Object.fromEntries(todos.map(p => [p.id, p]));
  const citasHoy = todasCitas.filter(c => c.fecha && c.fecha.slice(0,10) === today && c.estado !== 'Cancelada');
  const nuevos   = todos.filter(p => p.estado === 'Nuevo').length;
  const clientes = todos.filter(p => p.estado === 'Cliente').length;
  const propEnv  = todasPropuestas.filter(p => p.estado === 'enviada' || p.estado === 'negociando').length;
  const valorProyectado = todasPropuestas
    .filter(p => p.estado === 'negociando' || p.estado === 'aceptada')
    .reduce((sum, p) => sum + (Number(p.valor) || 0), 0);

  const recientes = [...todos].sort((a,b) => (b.fechaCreacion||'').localeCompare(a.fechaCreacion||'')).slice(0, 5);
  const area = S.profile?.area || null;

  const center = document.getElementById('center');
  center.innerHTML = `<div class="view-animate">
    <div class="home-header">
      <div>
        <div class="home-greeting">${_saludo()}${userName ? ', ' + escHtml(userName.split(' ')[0]) : ''}</div>
        <h1 class="home-title">Panel de Consultoría</h1>
      </div>
      <button class="btn btn-primary" onclick="window._app.openProspectoModal()">+ Nuevo prospecto</button>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-top"><span class="kpi-label">Prospectos activos</span><span class="kpi-ic" style="background:var(--primary-l);color:var(--primary)">${_i('users')}</span></div>
        <div class="kpi-value">${todos.filter(p=>p.estado!=='Descartado').length}</div>
        <div class="kpi-sub">${nuevos} nuevos sin contactar</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-top"><span class="kpi-label">Propuestas abiertas</span><span class="kpi-ic" style="background:var(--amber-l);color:var(--amber)">${_i('fileText')}</span></div>
        <div class="kpi-value">${propEnv}</div>
        <div class="kpi-sub">En espera o negociación</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-top"><span class="kpi-label">Clientes activos</span><span class="kpi-ic" style="background:var(--green-l);color:var(--green)">${_i('checkCirc')}</span></div>
        <div class="kpi-value">${clientes}</div>
        <div class="kpi-sub">Proyectos en curso</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-top"><span class="kpi-label">Valor proyectado</span><span class="kpi-ic" style="background:var(--violet-l);color:var(--violet)">${_i('coins')}</span></div>
        <div class="kpi-value kpi-value-sm">${formatCLP(valorProyectado)}</div>
        <div class="kpi-sub">Propuestas en negociación</div>
      </div>
    </div>

    <div class="home-grid">
      <div>
        <div class="section-head"><h2>Citas de hoy</h2><span class="text-muted" style="font-size:13px">${today}</span></div>
        ${citasHoy.length === 0
          ? `<div class="card card-pad" style="text-align:center;color:var(--text3);font-size:14px">Sin citas programadas para hoy.</div>`
          : citasHoy.map(c => { const t = meetingType(c.tipo); return `
            <div class="card card-pad" onclick="window._app.openCitaDetail('${c.id}')" style="margin-bottom:10px;display:flex;gap:12px;align-items:center;cursor:pointer">
              <div style="width:40px;height:40px;border-radius:11px;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb, ${t.color} 14%, var(--surface));color:${t.color};flex-shrink:0">${_i(t.icon,20)}</div>
              <div style="flex:1">
                <div style="font-size:14px;font-weight:600;color:var(--navy)">${escHtml(c.titulo || t.label)}</div>
                <div style="font-size:12.5px;color:var(--text3)">${[(c.hora||'').slice(0,5), pMap[c.prospectoId]?.empresa || pMap[c.prospectoId]?.nombre || 'Tríada · Equipo'].filter(Boolean).join(' · ')}</div>
              </div>
              <span class="badge" style="font-size:11px;color:var(--primary);background:var(--primary-l);border-color:var(--primary)">${c.estado || 'Pendiente'}</span>
            </div>`; }).join('')}
      </div>

      <div>
        <div class="section-head"><h2>Prospectos recientes</h2>
          <button class="btn btn-ghost btn-sm" onclick="window._app.navigate('pipeline')">Ver pipeline →</button>
        </div>
        <div class="card" style="overflow:hidden">
          ${recientes.length === 0
            ? `<div class="card-pad" style="color:var(--text3);font-size:14px">Sin prospectos aún.</div>`
            : recientes.map(p => `
              <div class="prospect-row" onclick="window._app.openProspectoDetail('${p.id}')" style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border);cursor:pointer;transition:var(--tr)" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background=''">
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
          return `<div class="funnel-stage" onclick="window._app.navigate('pipeline')" style="border-top:3px solid ${st.color}">
            <div class="funnel-icon" style="color:${st.color}">${stageIcon(st.id,20)}</div>
            <div class="funnel-label">${st.id}</div>
            <div class="funnel-count" style="color:${st.color}">${cnt}</div>
          </div>`;
        }).join('')}
      </div>
    </div>

    ${area ? _buildAreaPanel(area) : `
      <div style="margin-top:20px;background:var(--surface2);border-radius:10px;padding:14px 16px;font-size:13px;color:var(--text3);text-align:center">
        Selecciona un área activa (Tec / Vnts / Fin) en el menú lateral para ver las herramientas de consultoría.
      </div>`}
  </div>`;
}

function _buildAreaPanel(area) {
  const panels = {
    'Tecnología': {
      icon: '🖥️', color: 'var(--primary)',
      cols: [
        {
          icon: '📋', title: 'Checklist de diagnóstico',
          items: ['¿Sistemas internos integrados?', '¿Herramientas digitales en uso diario?', '¿Tareas repetitivas automatizadas?', '¿Datos centralizados y accesibles?', '¿KPIs digitales medidos?'],
        },
        {
          icon: '🔧', title: 'Recursos recomendados',
          items: ['Zapier / Make — automatización de flujos', 'Google Analytics — métricas web', 'Notion / ClickUp — gestión de proyectos', 'HubSpot Free — CRM básico', 'Looker Studio — dashboards gratis'],
        },
        {
          icon: '📊', title: 'KPIs a monitorear',
          items: ['% sistemas integrados (obj. >80%)', '% procesos automatizados', 'Tiempo prom. de resolución de incidencias', 'NPS interno del equipo con herramientas', 'Costo IT por empleado / mes'],
        },
      ],
    },
    'Ventas': {
      icon: '📈', color: 'var(--green)',
      cols: [
        {
          icon: '📞', title: 'Script de seguimiento',
          items: ['1. Mencionar el diagnóstico 360 realizado', '2. Preguntar: "¿Cuál es tu mayor urgencia ahora?"', '3. Presentar propuesta ajustada a ese dolor', '4. Pedir: "¿Podemos agendar 20 min esta semana?"', '5. Confirmar la cita antes de cerrar la llamada'],
        },
        {
          icon: '💬', title: 'Plantilla WhatsApp de seguimiento',
          items: ['Hola [Nombre] 👋, soy [Tu nombre] de TRIADA.', 'En el diagnóstico 360 detectamos [hallazgo].', 'Tenemos una solución concreta para eso.', '¿Te sirve una reunión de 20 min esta semana?'],
        },
        {
          icon: '📊', title: 'KPIs del pipeline',
          items: ['Tasa de conversión total (%)', 'Días promedio de cierre', 'Ticket promedio por cliente', 'Propuestas enviadas vs aceptadas', '% leads contactados en < 24h'],
        },
      ],
    },
    'Finanzas': {
      icon: '💰', color: 'var(--green)',
      cols: [
        {
          icon: '📋', title: 'Checklist mensual',
          items: ['Flujo de caja real vs proyectado', 'Margen bruto por línea de negocio', 'Top 3 gastos variables evitables', 'Cuentas por cobrar > 30 días', 'Comparar ventas vs mismo mes año anterior'],
        },
        {
          icon: '🧮', title: 'Calculadora IVA rápida',
          type: 'calc_iva',
        },
        {
          icon: '📊', title: 'KPIs financieros clave',
          items: ['Margen bruto (>40% en servicios)', 'Días cartera (obj. < 30 días)', 'Ratio corriente (obj. > 1.5)', 'EBITDA / ingresos (%)', 'Punto de equilibrio mensual ($)'],
        },
      ],
    },
  };

  const p = panels[area];
  if (!p) return '';

  return `
    <div style="margin-top:28px">
      <div class="section-head">
        <h2>${p.icon} Herramientas — Área ${escHtml(area)}</h2>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px">
        ${p.cols.map(col => col.type === 'calc_iva' ? _calcIvaCard(col) : _toolCard(col)).join('')}
      </div>
    </div>`;
}

function _toolCard(col) {
  return `<div class="card card-pad" style="font-size:13px">
    <div style="font-weight:700;color:var(--navy);margin-bottom:10px;display:flex;gap:6px;align-items:center">
      <span>${col.icon}</span><span>${escHtml(col.title)}</span>
    </div>
    <ul style="padding-left:16px;margin:0;color:var(--text2);display:flex;flex-direction:column;gap:5px">
      ${col.items.map(i => `<li>${escHtml(i)}</li>`).join('')}
    </ul>
  </div>`;
}

function _calcIvaCard(col) {
  return `<div class="card card-pad" style="font-size:13px">
    <div style="font-weight:700;color:var(--navy);margin-bottom:10px;display:flex;gap:6px;align-items:center">
      <span>${col.icon}</span><span>${escHtml(col.title)}</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <div>
        <label style="font-size:12px;color:var(--text3)">Precio neto (sin IVA)</label>
        <input type="text" id="calcNeto" inputmode="numeric" placeholder="Ej: 1.000.000"
          style="width:100%;margin-top:3px;padding:7px 9px;border:1px solid var(--border);border-radius:6px;font-size:13px;background:var(--surface);color:var(--text);box-sizing:border-box"
          oninput="(function(v){
            var n=Number(v.replace(/\\./g,'').replace(/,/g,''));
            document.getElementById('calcIVAr').textContent=isNaN(n)||!v?'—':'+ IVA 19%: $'+Math.round(n*0.19).toLocaleString('es-CL');
            document.getElementById('calcTotalr').textContent=isNaN(n)||!v?'—':'= Total: $'+Math.round(n*1.19).toLocaleString('es-CL');
            this.value=n?n.toLocaleString('es-CL'):'';
          }).call(this,this.value)">
      </div>
      <div id="calcIVAr" style="color:var(--amber);font-weight:600;font-size:13px">—</div>
      <div id="calcTotalr" style="color:var(--navy);font-weight:800;font-size:14px">—</div>
    </div>
  </div>`;
}

function _saludo() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}
