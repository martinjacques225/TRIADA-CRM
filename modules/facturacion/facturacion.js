// modules/facturacion/facturacion.js
import { facturas, clientes } from '../../js/db.js';
import { escHtml, formatDate, formatCLP, todayStr, toast } from '../../js/utils.js';
import { attachFormatting, parseCLP } from '../../js/format.js';

// Valores reales del enum fact_estado (minúscula) + etiqueta para la UI
const ESTADOS_FACT = [
  { v: 'pendiente', label: 'Pendiente' },
  { v: 'parcial',   label: 'Parcial'   },
  { v: 'pagado',    label: 'Pagado'    },
  { v: 'vencido',   label: 'Vencido'   },
];
const labelEstado = (v) => (ESTADOS_FACT.find(e => e.v === v)?.label) || v || '—';

const stColors = {
  pendiente: 'var(--amber)',  parcial: 'var(--primary)',
  pagado:    'var(--green)',  vencido: 'var(--danger)',
};
const stBgs = {
  pendiente: 'var(--amber-l)',  parcial: 'var(--primary-l)',
  pagado:    'var(--green-l)',  vencido: 'var(--danger-l)',
};

const clienteLabel = (c) => c ? (c.razonSocial || c.nombre || c.correlativo || 'Cliente') : '—';

export async function render() {
  const [todas, todosCli] = await Promise.all([facturas.getAll(), clientes.getAll()]);
  const cliMap = Object.fromEntries(todosCli.map(c => [c.id, c]));

  const totalMonto = todas.reduce((s, f) => s + (+f.monto || 0), 0);
  const porCobrar  = todas.filter(f => f.estado === 'pendiente' || f.estado === 'parcial')
                          .reduce((s, f) => s + (+f.monto || 0), 0);
  const cobrado    = todas.filter(f => f.estado === 'pagado')
                          .reduce((s, f) => s + (+f.monto || 0), 0);

  const center = document.getElementById('center');
  center.innerHTML = `<div class="view-animate">
    <div class="section-head">
      <h2>Facturación</h2>
      <button class="btn btn-primary" onclick="window._app.openFacturaModal()">+ Nueva factura</button>
    </div>

    <div class="kpi-grid" style="margin-bottom:24px">
      <div class="kpi-card">
        <div class="kpi-top"><span class="kpi-label">Total facturado</span><span class="kpi-ic" style="background:var(--primary-l);color:var(--primary)">${window.icon?window.icon('factura'):''}</span></div>
        <div class="kpi-value">${todas.length}</div>
        <div class="kpi-sub">${formatCLP(totalMonto)} en facturas</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-top"><span class="kpi-label">Por cobrar</span><span class="kpi-ic" style="background:var(--amber-l);color:var(--amber)">${window.icon?window.icon('clock'):''}</span></div>
        <div class="kpi-value">${formatCLP(porCobrar)}</div>
        <div class="kpi-sub">Pendiente + Parcial</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-top"><span class="kpi-label">Cobrado</span><span class="kpi-ic" style="background:var(--green-l);color:var(--green)">${window.icon?window.icon('checkCirc'):''}</span></div>
        <div class="kpi-value">${formatCLP(cobrado)}</div>
        <div class="kpi-sub">Facturas pagadas</div>
      </div>
    </div>

    ${todas.length === 0
      ? `<div class="empty-state">
          <div class="empty-icon">${window.icon?window.icon('factura'):''}</div>
          <h3>Sin facturas aún</h3>
          <p>Crea una factura para un cliente desde aquí o desde la ficha del prospecto convertido en cliente.</p>
          <button class="btn btn-primary" onclick="window._app.openFacturaModal()">+ Nueva factura</button>
        </div>`
      : `<div class="card" style="overflow:hidden">
          <table class="data-table">
            <thead>
              <tr><th>Correlativo</th><th>Cliente</th><th>Monto</th><th>Estado</th><th>Emisión</th><th>Vencimiento</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              ${todas.map(f => {
                const cli = cliMap[f.clienteId];
                return `<tr>
                  <td style="font-size:12px;font-weight:700;color:var(--text3);white-space:nowrap">${escHtml(f.correlativo || '—')}</td>
                  <td><strong>${escHtml(clienteLabel(cli))}</strong></td>
                  <td><strong style="font-size:15px;color:var(--navy)">${formatCLP(f.monto)}</strong></td>
                  <td>
                    <span class="badge" style="color:${stColors[f.estado]||'var(--text3)'};background:${stBgs[f.estado]||'var(--surface2)'};border-color:${stColors[f.estado]||'var(--border)'}">
                      ${escHtml(labelEstado(f.estado))}
                    </span>
                  </td>
                  <td style="font-size:12.5px;color:var(--text3)">${formatDate(f.emision)}</td>
                  <td style="font-size:12.5px;color:var(--text3)">${f.vencimiento ? formatDate(f.vencimiento) : '—'}</td>
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

// clientesList: array de clientes; onSave callback; existing: factura a editar;
// preselClienteId: cliente a preseleccionar al crear (p.ej. desde la ficha)
export function renderFacturaModal(clientesList, onSave, existing = null, preselClienteId = null) {
  const body = document.getElementById('modalBody');
  if (!body) return;
  const f = existing || {};
  const selCli = f.clienteId || preselClienteId || '';

  const cliOptions = clientesList.length
    ? clientesList.map(c => `<option value="${c.id}"${selCli === c.id ? ' selected' : ''}>${escHtml(clienteLabel(c))}</option>`).join('')
    : '';

  body.innerHTML = `
    <div class="form-group">
      <label>Cliente <span class="req">*</span></label>
      ${clientesList.length
        ? `<select id="factCliente"><option value="">— Selecciona —</option>${cliOptions}</select>`
        : `<div class="form-hint" style="color:var(--danger)">No hay clientes registrados todavía. Crea una ficha de cliente (desde un prospecto en etapa Cliente) antes de facturar.</div>`}
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Monto (CLP) <span class="req">*</span></label>
        <input id="factMonto" type="text" inputmode="numeric" data-fmt="clp" placeholder="0"
          value="${f.monto ? Number(f.monto).toLocaleString('es-CL') : ''}">
      </div>
      <div class="form-group">
        <label>Estado</label>
        <select id="factEstado">
          ${ESTADOS_FACT.map(e => `<option value="${e.v}"${(f.estado || 'pendiente') === e.v ? ' selected' : ''}>${e.label}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Fecha de emisión</label>
        <input id="factEmision" type="date" value="${f.emision || todayStr()}">
      </div>
      <div class="form-group">
        <label>Vencimiento</label>
        <input id="factVencimiento" type="date" value="${f.vencimiento || ''}">
      </div>
    </div>`;

  attachFormatting(body);

  document.getElementById('modalSave').onclick = async () => {
    const clienteId = document.getElementById('factCliente')?.value || null;
    const monto     = parseCLP(document.getElementById('factMonto').value);
    if (!clienteId) { toast('Selecciona un cliente', 'error'); return; }
    if (!monto)     { toast('Ingresa el monto de la factura', 'error'); return; }
    const data = {
      clienteId,
      monto,
      estado:      document.getElementById('factEstado').value,
      emision:     document.getElementById('factEmision').value,
      vencimiento: document.getElementById('factVencimiento').value || null,
    };
    try {
      if (f.id) await facturas.update({ ...f, ...data });
      else      await facturas.add(data);
      if (onSave) onSave();
    } catch (err) {
      console.error('Error al guardar factura:', err);
      toast(err?.message || 'No se pudo guardar la factura', 'error');
    }
  };
}
