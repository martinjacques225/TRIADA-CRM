// modules/clientes/clientes.js
// Cartera de clientes: lista todos los clientes creados y permite añadir uno
// tomando CUALQUIER prospecto (sin importar su etapa en el pipeline) o creando
// una ficha manual. Es la fuente que Facturación lee para asociar facturas a un
// cliente (clientes.getAll()), de modo que aquí se resuelve el "Factura no
// detecta cliente": basta crear la ficha desde este módulo.
import { clientes, facturas, prospectos } from '../../js/db.js';
import { escHtml, formatDate, formatCLP, toast } from '../../js/utils.js';
import { attachFormatting, validateRut } from '../../js/format.js';

const _i = (n, s) => (window.icon ? window.icon(n, '', s) : '');

const clienteLabel = (c) => c ? (c.razonSocial || c.nombre || c.empresa || c.correlativo || 'Cliente') : '—';

export async function render() {
  const [todos, todasFact] = await Promise.all([clientes.getAll(), facturas.getAll()]);

  // Resumen de facturación por cliente
  const factPorCli = {};
  todasFact.forEach(f => {
    const k = f.clienteId;
    if (!k) return;
    (factPorCli[k] = factPorCli[k] || { n: 0, total: 0, cobrado: 0 }).n++;
    factPorCli[k].total += (+f.monto || 0);
    if (f.estado === 'pagado') factPorCli[k].cobrado += (+f.monto || 0);
  });

  const totalFacturado = Object.values(factPorCli).reduce((s, x) => s + x.total, 0);

  const center = document.getElementById('center');
  center.innerHTML = `<div class="view-animate">
    <div class="section-head">
      <h2>Clientes</h2>
      <button class="btn btn-primary" onclick="window._app.openAddClienteModal()">+ Añadir cliente</button>
    </div>

    <div class="kpi-grid" style="margin-bottom:24px">
      <div class="kpi-card">
        <div class="kpi-top"><span class="kpi-label">Clientes en cartera</span><span class="kpi-ic" style="background:var(--green-l);color:var(--green)">${_i('checkCirc')}</span></div>
        <div class="kpi-value">${todos.length}</div>
        <div class="kpi-sub">Fichas activas</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-top"><span class="kpi-label">Facturas emitidas</span><span class="kpi-ic" style="background:var(--primary-l);color:var(--primary)">${_i('factura')}</span></div>
        <div class="kpi-value">${todasFact.length}</div>
        <div class="kpi-sub">A toda la cartera</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-top"><span class="kpi-label">Total facturado</span><span class="kpi-ic" style="background:var(--violet-l);color:var(--violet)">${_i('coins')}</span></div>
        <div class="kpi-value kpi-value-sm">${formatCLP(totalFacturado)}</div>
        <div class="kpi-sub">Histórico de la cartera</div>
      </div>
    </div>

    ${todos.length === 0
      ? `<div class="empty-state">
          <div class="empty-icon">${_i('users')}</div>
          <h3>Sin clientes aún</h3>
          <p>Crea una ficha de cliente tomando cualquier prospecto del pipeline, sin importar su etapa. Una vez creada, podrás facturarle.</p>
          <button class="btn btn-primary" onclick="window._app.openAddClienteModal()">+ Añadir cliente</button>
        </div>`
      : `<div class="card" style="overflow:hidden">
          <table class="data-table">
            <thead>
              <tr><th>Código</th><th>Razón social</th><th>RUT</th><th>Giro</th><th>Facturación</th><th>Alta</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              ${todos.map(c => {
                const fx = factPorCli[c.id] || { n: 0, total: 0, cobrado: 0 };
                return `<tr>
                  <td style="font-size:12px;font-weight:700;color:var(--text3);white-space:nowrap">${escHtml(c.correlativo || '—')}</td>
                  <td><strong>${escHtml(clienteLabel(c))}</strong>${c.direccion ? `<div style="font-size:12px;color:var(--text3)">${escHtml(c.direccion)}</div>` : ''}</td>
                  <td style="font-size:13px">${escHtml(c.rut || '—')}</td>
                  <td style="font-size:13px;color:var(--text2)">${escHtml(c.giro || '—')}</td>
                  <td>
                    ${fx.n
                      ? `<strong style="color:var(--navy)">${formatCLP(fx.total)}</strong><div style="font-size:12px;color:var(--text3)">${fx.n} factura${fx.n !== 1 ? 's' : ''} · ${formatCLP(fx.cobrado)} cobrado</div>`
                      : `<span style="font-size:12.5px;color:var(--text3)">Sin facturas</span>`}
                  </td>
                  <td style="font-size:12.5px;color:var(--text3)">${formatDate(c.fechaAlta)}</td>
                  <td>
                    <div style="display:flex;gap:4px">
                      <button class="btn btn-ghost btn-sm" onclick="window._app.openFacturaModalForCliente('${c.id}')" title="Crear factura para este cliente">${_i('factura', 14)} Facturar</button>
                      <button class="btn btn-ghost btn-sm" onclick="window._app.deleteCliente('${c.id}')" style="color:var(--danger)">Eliminar</button>
                    </div>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`}
  </div>`;
}

// ── Modal "Añadir cliente" ────────────────────────────────────────────────────
// Toma cualquier prospecto (cualquier etapa) y prellena razón social/RUT/giro,
// o permite una ficha manual sin prospecto vinculado.
export function renderAddClienteModal(prospectosAll, onSave, preselLeadId = null) {
  const body = document.getElementById('modalBody');
  if (!body) return;

  const opts = [...prospectosAll]
    .sort((a, b) => (a.empresa || a.nombre || '').localeCompare(b.empresa || b.nombre || ''))
    .map(p => `<option value="${p.id}"${preselLeadId === p.id ? ' selected' : ''}>${escHtml((p.empresa || p.nombre || 'Prospecto') + (p.empresa && p.nombre ? ' — ' + p.nombre : '') + (p.estado ? '  ·  ' + p.estado : ''))}</option>`)
    .join('');

  body.innerHTML = `
    <p style="font-size:13px;color:var(--text3);margin-bottom:14px">
      Puedes tomar cualquier prospecto del pipeline (sin importar su etapa) para crear su ficha de cliente, o dejar el selector en blanco y registrar uno manual.
    </p>
    <div class="form-group">
      <label>Prospecto de origen <span style="font-weight:400;color:var(--text3)">(opcional)</span></label>
      <select id="cliProspecto">
        <option value="">— Cliente manual (sin prospecto) —</option>
        ${opts}
      </select>
    </div>
    <div class="form-group">
      <label>Razón social <span class="req">*</span></label>
      <input id="cliRazon" data-fmt="upper" placeholder="EMPRESA / NOMBRE DEL CLIENTE">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>RUT</label>
        <input id="cliRut" data-fmt="rut" placeholder="76.123.456-7">
      </div>
      <div class="form-group">
        <label>Giro</label>
        <input id="cliGiro" placeholder="Ej: Comercio / retail">
      </div>
    </div>
    <div class="form-group">
      <label>Dirección</label>
      <input id="cliDireccion" placeholder="Calle 123, Comuna, Ciudad">
    </div>`;

  attachFormatting(body);

  const prospMap = Object.fromEntries(prospectosAll.map(p => [p.id, p]));
  const sel = document.getElementById('cliProspecto');
  const fill = () => {
    const p = prospMap[sel.value];
    const razon = document.getElementById('cliRazon');
    const rut   = document.getElementById('cliRut');
    const giro  = document.getElementById('cliGiro');
    if (p) {
      razon.value = (p.empresa || p.nombre || '').toUpperCase();
      rut.value   = p.rut || '';
      giro.value  = p.rubro || '';
    }
  };
  sel.addEventListener('change', fill);
  if (preselLeadId) fill();

  document.getElementById('modalSave').onclick = async () => {
    const leadId      = document.getElementById('cliProspecto').value || null;
    const razonSocial = document.getElementById('cliRazon').value.trim();
    const rut         = document.getElementById('cliRut').value.trim();
    if (!razonSocial) { toast('La razón social es obligatoria', 'error'); return; }
    if (rut && !validateRut(rut)) { toast('El RUT no es válido', 'error'); return; }
    const data = {
      leadId,
      razonSocial,
      rut,
      giro:      document.getElementById('cliGiro').value.trim(),
      direccion: document.getElementById('cliDireccion').value.trim(),
    };
    try {
      await clientes.add(data);
      if (onSave) onSave();
    } catch (err) {
      console.error('Error al crear cliente:', err);
      toast(err?.message || 'No se pudo crear el cliente', 'error');
    }
  };
}
