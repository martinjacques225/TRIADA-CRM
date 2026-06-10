// modules/facturacion/facturacion.js
import { facturas, prospectos, propuestas } from '../../js/db.js';
import { escHtml, formatDate, formatCLP, todayStr, toast } from '../../js/utils.js';
import { attachFormatting, parseCLP } from '../../js/format.js';

const ESTADOS_FACT = ['Pendiente', 'Enviada', 'Pagada', 'Vencida'];

const stColors = {
  Pendiente: 'var(--amber)',   Enviada: 'var(--primary)',
  Pagada:    'var(--green)',   Vencida: 'var(--danger)',
};
const stBgs = {
  Pendiente: 'var(--amber-l)',   Enviada: 'var(--primary-l)',
  Pagada:    'var(--green-l)',   Vencida: 'var(--danger-l)',
};

export async function render() {
  const [todas, todosP, todasProp] = await Promise.all([
    facturas.getAll(), prospectos.getAll(), propuestas.getAll(),
  ]);
  const pMap    = Object.fromEntries(todosP.map(p => [p.id, p]));
  const propMap = Object.fromEntries(todasProp.map(p => [p.id, p]));

  const totalMonto  = todas.reduce((s, f) => s + (+f.monto || 0), 0);
  const pendiente   = todas.filter(f => f.estado === 'Pendiente' || f.estado === 'Enviada')
                          .reduce((s, f) => s + (+f.monto || 0), 0);
  const pagado      = todas.filter(f => f.estado === 'Pagada')
                          .reduce((s, f) => s + (+f.monto || 0), 0);

  const center = document.getElementById('center');
  center.innerHTML = `<div class="view-animate">
    <div class="section-head">
      <h2>Facturación</h2>
      <button class="btn btn-primary" onclick="window._app.openFacturaModal()">+ Nueva factura</button>
    </div>

    <div class="kpi-grid" style="margin-bottom:24px">
      <div class="kpi-card">
        <div class="kpi-top"><span class="kpi-label">Total facturado</span><span class="kpi-ic" style="background:var(--primary-l);color:var(--primary)">🧾</span></div>
        <div class="kpi-value">${todas.length}</div>
        <div class="kpi-sub">${formatCLP(totalMonto)} en facturas</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-top"><span class="kpi-label">Por cobrar</span><span class="kpi-ic" style="background:var(--amber-l);color:var(--amber)">⏳</span></div>
        <div class="kpi-value">${formatCLP(pendiente)}</div>
        <div class="kpi-sub">Pendiente + Enviada</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-top"><span class="kpi-label">Cobrado</span><span class="kpi-ic" style="background:var(--green-l);color:var(--green)">✅</span></div>
        <div class="kpi-value">${formatCLP(pagado)}</div>
        <div class="kpi-sub">Facturas pagadas</div>
      </div>
    </div>

    ${todas.length === 0
      ? `<div class="empty-state">
          <div class="empty-icon">🧾</div>
          <h3>Sin facturas aún</h3>
          <p>Las facturas se crean cuando una propuesta es aceptada. Puedes crear una desde aquí o desde la ficha del prospecto.</p>
          <button class="btn btn-primary" onclick="window._app.openFacturaModal()">+ Nueva factura</button>
        </div>`
      : `<div class="card" style="overflow:hidden">
          <table class="data-table">
            <thead>
              <tr><th>Correlativo</th><th>Prospecto</th><th>Propuesta</th><th>Monto</th><th>Estado</th><th>Fecha emisión</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              ${todas.map(f => {
                const pr   = pMap[f.leadId];
                const prop = propMap[f.propuestaId];
                return `<tr>
                  <td style="font-size:12px;font-weight:700;color:var(--text3);white-space:nowrap">${escHtml(f.correlativo || '—')}</td>
                  <td>
                    <strong>${escHtml(pr?.nombre || '—')}</strong>
                    <div style="font-size:12px;color:var(--text3)">${escHtml(pr?.empresa || '')}</div>
                  </td>
                  <td style="font-size:12.5px;color:var(--text3)">${escHtml(prop?.correlativo || prop ? 'Propuesta' : '—')}</td>
                  <td><strong style="font-size:15px;color:var(--navy)">${formatCLP(f.monto)}</strong></td>
                  <td>
                    <span class="badge" style="color:${stColors[f.estado]};background:${stBgs[f.estado]};border-color:${stColors[f.estado]}">
                      ${escHtml(f.estado)}
                    </span>
                  </td>
                  <td style="font-size:12.5px;color:var(--text3)">${formatDate(f.fechaEmision)}</td>
                  <td>
                    <div style="display:flex;gap:4px">
                      <button class="btn btn-ghost btn-sm" onclick="window._app.editFactura('${f.id}')">Editar</button>
                      <button class="btn btn-ghost btn-sm" onclick="window._app.deleteFactura('${f.id}')" style="color:var(--danger)">Eliminar</button>
                    </div>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`}
  </div>`;
}

export function renderFacturaModal(prosp, allProp, onSave, existing = null) {
  const body = document.getElementById('modalBody');
  if (!body) return;
  const f = existing || {};

  const propAceptadas = allProp.filter(p => p.estado === 'Aceptada');
  const getPropsByLead = (leadId) => propAceptadas.filter(p => p.prospectoId === leadId);

  function _buildPropOptions(leadId, selId) {
    const props = getPropsByLead(leadId);
    if (!props.length) return `<option value="">Sin propuestas aceptadas</option>`;
    return props.map(p =>
      `<option value="${p.id}"${selId === p.id ? ' selected' : ''}>${escHtml(p.correlativo || 'Propuesta')} — ${formatCLP(p.valor)}</option>`
    ).join('');
  }

  body.innerHTML = `
    <div class="form-group">
      <label>Prospecto</label>
      <select id="factProspecto">
        <option value="">— Selecciona —</option>
        ${prosp.map(p => `<option value="${p.id}"${f.leadId === p.id ? ' selected' : ''}>${escHtml(p.nombre + (p.empresa ? ' — ' + p.empresa : ''))}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Propuesta (Aceptada)</label>
      <select id="factPropuesta">
        ${f.leadId
          ? _buildPropOptions(f.leadId, f.propuestaId)
          : `<option value="">— Selecciona un prospecto primero —</option>`}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Monto (CLP)</label>
        <input id="factMonto" type="text" inputmode="numeric" data-fmt="clp" placeholder="0"
          value="${f.monto ? Number(f.monto).toLocaleString('es-CL') : ''}">
      </div>
      <div class="form-group">
        <label>Estado</label>
        <select id="factEstado">
          ${ESTADOS_FACT.map(e => `<option${(f.estado || 'Pendiente') === e ? ' selected' : ''}>${e}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>Fecha de emisión</label>
      <input id="factFecha" type="date" value="${f.fechaEmision || todayStr()}">
    </div>
    <div class="form-group">
      <label>Notas</label>
      <textarea id="factNotas">${escHtml(f.notas || '')}</textarea>
    </div>`;

  attachFormatting(body);

  document.getElementById('factProspecto').addEventListener('change', e => {
    const leadId = e.target.value;
    const sel = document.getElementById('factPropuesta');
    sel.innerHTML = leadId ? _buildPropOptions(leadId, '') : `<option value="">— Selecciona un prospecto primero —</option>`;
    // Auto-fill monto from first propuesta
    if (leadId) {
      const props = getPropsByLead(leadId);
      if (props.length) {
        const monto = document.getElementById('factMonto');
        if (monto && !monto.value) monto.value = props[0].valor ? Number(props[0].valor).toLocaleString('es-CL') : '';
      }
    }
  });

  document.getElementById('factPropuesta').addEventListener('change', e => {
    const prop = allProp.find(p => p.id === e.target.value);
    if (prop?.valor) {
      const monto = document.getElementById('factMonto');
      if (monto) monto.value = Number(prop.valor).toLocaleString('es-CL');
    }
  });

  document.getElementById('modalSave').onclick = async () => {
    const leadId    = document.getElementById('factProspecto').value || null;
    const propuestaId = document.getElementById('factPropuesta').value || null;
    const monto     = parseCLP(document.getElementById('factMonto').value);
    if (!leadId) { toast('Selecciona un prospecto', 'error'); return; }
    if (!monto)  { toast('Ingresa el monto de la factura', 'error'); return; }
    const data = {
      leadId,
      propuestaId,
      monto,
      estado:       document.getElementById('factEstado').value,
      fechaEmision: document.getElementById('factFecha').value,
      notas:        document.getElementById('factNotas').value.trim(),
    };
    if (f.id) await facturas.update({ ...f, ...data });
    else      await facturas.add(data);
    if (onSave) onSave();
  };
}
