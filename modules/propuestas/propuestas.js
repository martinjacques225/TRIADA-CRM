// modules/propuestas/propuestas.js
import { propuestas, prospectos } from '../../js/db.js';
import { escHtml, formatDate, formatCLP, todayStr } from '../../js/utils.js';
import { attachFormatting, parseCLP } from '../../js/format.js';

const ESTADOS_PROP = ['Borrador','Enviada','Negociando','Aceptada','Rechazada'];
const SERVICIOS = ['Diagnóstico 360','Implementación CRM','Automatización de procesos','Asesoría financiera','Consultoría de ventas','Transformación digital integral'];

const stColors = { Borrador:'var(--text3)', Enviada:'var(--primary)', Negociando:'var(--amber)', Aceptada:'var(--green)', Rechazada:'var(--danger)' };
const stBgs    = { Borrador:'var(--surface3)', Enviada:'var(--primary-l)', Negociando:'var(--amber-l)', Aceptada:'var(--green-l)', Rechazada:'var(--danger-l)' };

export async function render() {
  const [todas, todosP] = await Promise.all([propuestas.getAll(), prospectos.getAll()]);
  const pMap = Object.fromEntries(todosP.map(p=>[p.id, p]));
  const sorted = [...todas].sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));

  const totalEnv   = todas.filter(p=>p.estado==='Enviada'||p.estado==='Negociando').length;
  const totalAcept = todas.filter(p=>p.estado==='Aceptada').length;
  const valorAcept = todas.filter(p=>p.estado==='Aceptada').reduce((s,p)=>s+(+p.valor||0),0);
  const tasa       = todas.length ? Math.round(totalAcept/todas.length*100) : 0;

  const center = document.getElementById('center');
  center.innerHTML = `<div class="view-animate">
    <div class="section-head">
      <h2>Propuestas</h2>
      <button class="btn btn-primary" onclick="window._app.openPropuestaModal()">+ Nueva propuesta</button>
    </div>

    <div class="kpi-grid" style="margin-bottom:24px">
      <div class="kpi-card"><div class="kpi-top"><span class="kpi-label">Abiertas</span><span class="kpi-ic" style="background:var(--primary-l);color:var(--primary)">📂</span></div><div class="kpi-value">${totalEnv}</div><div class="kpi-sub">En espera / negociación</div></div>
      <div class="kpi-card"><div class="kpi-top"><span class="kpi-label">Aceptadas</span><span class="kpi-ic" style="background:var(--green-l);color:var(--green)">✅</span></div><div class="kpi-value">${totalAcept}</div><div class="kpi-sub">${formatCLP(valorAcept)} en valor</div></div>
      <div class="kpi-card"><div class="kpi-top"><span class="kpi-label">Tasa de cierre</span><span class="kpi-ic" style="background:var(--violet-l);color:var(--violet)">🎯</span></div><div class="kpi-value">${tasa}%</div><div class="kpi-sub">Sobre ${todas.length} propuestas</div></div>
    </div>

    ${sorted.length === 0
      ? `<div class="empty-state"><div class="empty-icon">📋</div><h3>Sin propuestas aún</h3><p>Crea tu primera propuesta cuando tengas un prospecto listo para recibir una oferta.</p><button class="btn btn-primary" onclick="window._app.openPropuestaModal()">+ Nueva propuesta</button></div>`
      : `<div class="card" style="overflow:hidden">
          <table class="data-table">
            <thead><tr><th>Prospecto</th><th>Servicios</th><th>Valor</th><th>Fecha</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              ${sorted.map(p => {
                const pr = pMap[p.prospectoId];
                return `<tr>
                  <td><strong>${escHtml(pr?.nombre||'—')}</strong><div style="font-size:12px;color:var(--text3)">${escHtml(pr?.empresa||'')}</div></td>
                  <td style="font-size:12.5px">${(p.servicios||[]).map(s=>`<span style="background:var(--surface2);padding:2px 7px;border-radius:5px;margin:2px;display:inline-block">${escHtml(s)}</span>`).join('')||'—'}</td>
                  <td><strong style="font-size:15px;color:var(--navy)">${formatCLP(p.valor)}</strong></td>
                  <td style="font-size:12.5px;color:var(--text3)">${formatDate(p.fecha)}</td>
                  <td><span class="badge" style="color:${stColors[p.estado]};background:${stBgs[p.estado]};border-color:${stColors[p.estado]}">${escHtml(p.estado)}</span></td>
                  <td>
                    <div style="display:flex;gap:4px">
                      <button class="btn btn-ghost btn-sm" onclick="window._app.editPropuesta('${p.id}')">Editar</button>
                      <button class="btn btn-ghost btn-sm" onclick="window._app.deletePropuesta('${p.id}')" style="color:var(--danger)">Eliminar</button>
                    </div>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`}
  </div>`;
}

export function renderPropuestaModal(prospectosAll, onSave, existing = null) {
  const body = document.getElementById('modalBody');
  if (!body) return;
  const p = existing || {};
  const selServ = p.servicios || [];

  body.innerHTML = `
    <div class="form-group">
      <label>Prospecto</label>
      <select id="propProspecto">
        <option value="">— Selecciona —</option>
        ${prospectosAll.map(pr=>`<option value="${pr.id}"${p.prospectoId===pr.id?' selected':''}>${escHtml(pr.nombre+(pr.empresa?' — '+pr.empresa:''))}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Servicios incluidos</label>
      <div class="serv-grid" id="propServicios">
        ${SERVICIOS.map(s=>`<label class="serv-check">
          <input type="checkbox" value="${escHtml(s)}"${selServ.includes(s)?' checked':''}>
          <span>${escHtml(s)}</span>
        </label>`).join('')}
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Valor estimado (CLP)</label>
        <input id="propValor" type="text" inputmode="numeric" data-fmt="clp" placeholder="Ej: 1.500.000" value="${p.valor ? Number(p.valor).toLocaleString('es-CL') : ''}">
      </div>
      <div class="form-group">
        <label>Estado</label>
        <select id="propEstado">
          ${ESTADOS_PROP.map(e=>`<option${p.estado===e?' selected':''}>${e}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>Vigencia hasta</label>
      <input id="propVigencia" type="date" value="${p.vigencia||''}">
    </div>
    <div class="form-group">
      <label>Notas internas</label>
      <textarea id="propNotas">${escHtml(p.notas||'')}</textarea>
    </div>`;

  attachFormatting(body);

  document.getElementById('modalSave').onclick = async () => {
    const servicios = [...document.querySelectorAll('#propServicios input:checked')].map(i=>i.value);
    const data = {
      prospectoId: +document.getElementById('propProspecto').value || null,
      servicios,
      valor:    parseCLP(document.getElementById('propValor').value),
      estado:    document.getElementById('propEstado').value,
      vigencia:  document.getElementById('propVigencia').value,
      notas:     document.getElementById('propNotas').value.trim(),
      fecha:     p.fecha || new Date().toISOString(),
    };
    if (p.id) await propuestas.update({ ...p, ...data });
    else      await propuestas.add(data);
    if (onSave) onSave();
  };
}
