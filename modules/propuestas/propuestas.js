// modules/propuestas/propuestas.js
import { propuestas, prospectos } from '../../js/db.js';
import { escHtml, formatDate, formatCLP, toast } from '../../js/utils.js';
import { parseCLP } from '../../js/format.js';

const ESTADOS_PROP = ['Borrador','Enviada','Negociando','Aceptada','Rechazada'];

const stColors = { Borrador:'var(--text3)', Enviada:'var(--primary)', Negociando:'var(--amber)', Aceptada:'var(--green)', Rechazada:'var(--danger)' };
const stBgs    = { Borrador:'var(--surface3)', Enviada:'var(--primary-l)', Negociando:'var(--amber-l)', Aceptada:'var(--green-l)', Rechazada:'var(--danger-l)' };

// ── Items state ───────────────────────────────────────────────
let _items = [];

function _newItem() { return { descripcion: '', cantidad: 1, precioUnit: 0 }; }

function _initItems(p) {
  const s = p?.servicios;
  if (!Array.isArray(s) || !s.length) return [_newItem()];
  if (typeof s[0] === 'string') return s.map(name => ({ descripcion: name, cantidad: 1, precioUnit: 0 }));
  return s.map(item => ({ descripcion: item.descripcion || '', cantidad: item.cantidad || 1, precioUnit: item.precioUnit || 0 }));
}

function _calcTotals() {
  const sub = _items.reduce((s, it) => s + (it.cantidad * it.precioUnit), 0);
  const iva = Math.round(sub * 0.19);
  return { subtotal: sub, iva, total: sub + iva };
}

function _updateTotalsUI() {
  const { subtotal, iva, total } = _calcTotals();
  const s = document.getElementById('propSubtotal'); if (s) s.textContent = formatCLP(subtotal);
  const v = document.getElementById('propIva');      if (v) v.textContent = formatCLP(iva);
  const t = document.getElementById('propTotal');    if (t) t.textContent = formatCLP(total);
  return total;
}

function _renderItemRows() {
  const tbody = document.getElementById('propItemsBody');
  if (!tbody) return;
  tbody.innerHTML = _items.map((item, i) => `
    <tr>
      <td style="padding:4px 8px"><input type="text" class="prop-item-desc" data-i="${i}" value="${escHtml(item.descripcion)}" placeholder="Descripción del servicio" style="width:100%;font-size:13px;padding:5px 7px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--text)"></td>
      <td style="padding:4px 6px"><input type="number" class="prop-item-cant" data-i="${i}" min="1" value="${item.cantidad}" style="width:55px;font-size:13px;padding:5px 4px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--text);text-align:center"></td>
      <td style="padding:4px 6px"><input type="text" class="prop-item-precio" data-i="${i}" inputmode="numeric" value="${item.precioUnit ? Number(item.precioUnit).toLocaleString('es-CL') : ''}" placeholder="0" style="width:120px;font-size:13px;padding:5px 7px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--text);text-align:right"></td>
      <td style="padding:4px 12px;text-align:right;font-size:13px;font-weight:600;color:var(--navy);white-space:nowrap" data-item-sub="${i}">${formatCLP(item.cantidad * item.precioUnit)}</td>
      <td style="padding:4px 4px;text-align:center">${_items.length > 1 ? `<button type="button" class="prop-item-remove" data-i="${i}" style="border:none;background:none;color:var(--danger);cursor:pointer;font-size:18px;line-height:1;padding:2px 6px" title="Eliminar fila">×</button>` : ''}</td>
    </tr>`).join('');

  tbody.querySelectorAll('.prop-item-desc').forEach(inp =>
    inp.addEventListener('input', e => { _items[+e.target.dataset.i].descripcion = e.target.value; })
  );
  tbody.querySelectorAll('.prop-item-cant').forEach(inp =>
    inp.addEventListener('change', e => {
      const i = +e.target.dataset.i;
      _items[i].cantidad = Math.max(1, Math.round(+e.target.value || 1));
      e.target.value = _items[i].cantidad;
      const sub = document.querySelector(`[data-item-sub="${i}"]`);
      if (sub) sub.textContent = formatCLP(_items[i].cantidad * _items[i].precioUnit);
      _updateTotalsUI();
    })
  );
  tbody.querySelectorAll('.prop-item-precio').forEach(inp =>
    inp.addEventListener('change', e => {
      const i = +e.target.dataset.i;
      _items[i].precioUnit = parseCLP(e.target.value);
      e.target.value = _items[i].precioUnit ? Number(_items[i].precioUnit).toLocaleString('es-CL') : '';
      const sub = document.querySelector(`[data-item-sub="${i}"]`);
      if (sub) sub.textContent = formatCLP(_items[i].cantidad * _items[i].precioUnit);
      _updateTotalsUI();
    })
  );
  tbody.querySelectorAll('.prop-item-remove').forEach(btn =>
    btn.addEventListener('click', e => {
      _items.splice(+e.target.dataset.i, 1);
      _renderItemRows();
      _updateTotalsUI();
    })
  );
}

function _renderServiciosCell(servicios) {
  if (!Array.isArray(servicios) || !servicios.length) return '—';
  const items = typeof servicios[0] === 'string'
    ? servicios.map(s => s)
    : servicios.map(it => it.descripcion || '—');
  return items.slice(0, 2).map(s =>
    `<span style="background:var(--surface2);padding:2px 7px;border-radius:5px;margin:1px;display:inline-block;font-size:12px">${escHtml(s)}</span>`
  ).join('') + (items.length > 2 ? `<span style="font-size:11.5px;color:var(--text3);margin-left:3px">+${items.length - 2}</span>` : '');
}

export async function render() {
  const [todas, todosP] = await Promise.all([propuestas.getAll(), prospectos.getAll()]);
  const pMap = Object.fromEntries(todosP.map(p => [p.id, p]));
  const sorted = [...todas].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

  const totalEnv   = todas.filter(p => p.estado === 'Enviada' || p.estado === 'Negociando').length;
  const totalAcept = todas.filter(p => p.estado === 'Aceptada').length;
  const valorAcept = todas.filter(p => p.estado === 'Aceptada').reduce((s, p) => s + (+p.valor || 0), 0);
  const tasa       = todas.length ? Math.round(totalAcept / todas.length * 100) : 0;

  const center = document.getElementById('center');
  center.innerHTML = `<div class="view-animate">
    <div class="section-head">
      <h2>Propuestas</h2>
      <button class="btn btn-primary" onclick="window._app.openPropuestaModal()">+ Nueva propuesta</button>
    </div>

    <div class="kpi-grid" style="margin-bottom:24px">
      <div class="kpi-card"><div class="kpi-top"><span class="kpi-label">Abiertas</span><span class="kpi-ic" style="background:var(--primary-l);color:var(--primary)">${window.icon?window.icon('fileText'):''}</span></div><div class="kpi-value">${totalEnv}</div><div class="kpi-sub">En espera / negociación</div></div>
      <div class="kpi-card"><div class="kpi-top"><span class="kpi-label">Aceptadas</span><span class="kpi-ic" style="background:var(--green-l);color:var(--green)">${window.icon?window.icon('checkCirc'):''}</span></div><div class="kpi-value">${totalAcept}</div><div class="kpi-sub">${formatCLP(valorAcept)} en valor</div></div>
      <div class="kpi-card"><div class="kpi-top"><span class="kpi-label">Tasa de cierre</span><span class="kpi-ic" style="background:var(--violet-l);color:var(--violet)">${window.icon?window.icon('target'):''}</span></div><div class="kpi-value">${tasa}%</div><div class="kpi-sub">Sobre ${todas.length} propuestas</div></div>
    </div>

    ${sorted.length === 0
      ? `<div class="empty-state"><div class="empty-icon">${window.icon?window.icon('propuesta'):''}</div><h3>Sin propuestas aún</h3><p>Crea tu primera propuesta cuando tengas un prospecto listo para recibir una oferta.</p><button class="btn btn-primary" onclick="window._app.openPropuestaModal()">+ Nueva propuesta</button></div>`
      : `<div class="card" style="overflow:hidden">
          <table class="data-table">
            <thead><tr><th>Correlativo</th><th>Prospecto</th><th>Servicios</th><th>Total</th><th>Fecha</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              ${sorted.map(p => {
                const pr = pMap[p.prospectoId];
                return `<tr>
                  <td style="font-size:12px;color:var(--text3);white-space:nowrap;font-weight:600">${escHtml(p.correlativo || '—')}</td>
                  <td><strong>${escHtml(pr?.nombre || '—')}</strong><div style="font-size:12px;color:var(--text3)">${escHtml(pr?.empresa || '')}</div></td>
                  <td style="font-size:12.5px">${_renderServiciosCell(p.servicios)}</td>
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
  _items = _initItems(p);

  body.innerHTML = `
    <div class="form-group">
      <label>Prospecto</label>
      <select id="propProspecto">
        <option value="">— Selecciona —</option>
        ${prospectosAll.map(pr => `<option value="${pr.id}"${p.prospectoId === pr.id ? ' selected' : ''}>${escHtml(pr.nombre + (pr.empresa ? ' — ' + pr.empresa : ''))}</option>`).join('')}
      </select>
    </div>

    <div class="form-group">
      <label>Servicios / Ítems</label>
      <div style="border:1px solid var(--border);border-radius:8px;overflow:hidden">
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:var(--surface2);font-size:12px;color:var(--text3);text-align:left">
              <th style="padding:7px 10px;font-weight:600">Descripción</th>
              <th style="padding:7px 6px;font-weight:600;width:65px">Cant.</th>
              <th style="padding:7px 8px;font-weight:600;width:145px">Precio unit. (CLP)</th>
              <th style="padding:7px 12px;font-weight:600;width:120px;text-align:right">Subtotal</th>
              <th style="width:36px"></th>
            </tr>
          </thead>
          <tbody id="propItemsBody"></tbody>
        </table>
        <div style="padding:6px 8px;border-top:1px solid var(--border);background:var(--surface)">
          <button type="button" id="propAddItem" class="btn btn-ghost btn-sm" style="font-size:12.5px">+ Agregar ítem</button>
        </div>
      </div>
    </div>

    <div style="background:var(--surface2);border-radius:8px;padding:12px 16px;margin-top:4px;font-size:13.5px">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="color:var(--text3)">Subtotal neto</span><span id="propSubtotal" style="font-weight:600">—</span></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="color:var(--text3)">IVA 19%</span><span id="propIva" style="font-weight:600">—</span></div>
      <div style="display:flex;justify-content:space-between;border-top:1px solid var(--border);padding-top:8px"><span style="font-weight:700;color:var(--navy)">Total</span><span id="propTotal" style="font-weight:800;font-size:16px;color:var(--navy)">—</span></div>
    </div>

    <div class="form-row" style="margin-top:14px">
      <div class="form-group">
        <label>Estado</label>
        <select id="propEstado">
          ${ESTADOS_PROP.map(e => `<option${(p.estado || 'Borrador') === e ? ' selected' : ''}>${e}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Vigencia hasta</label>
        <input id="propVigencia" type="date" value="${p.vigencia || ''}">
      </div>
    </div>
    <div class="form-group">
      <label>Notas internas</label>
      <textarea id="propNotas">${escHtml(p.notas || '')}</textarea>
    </div>`;

  _renderItemRows();
  _updateTotalsUI();

  document.getElementById('propAddItem').addEventListener('click', () => {
    _items.push(_newItem());
    _renderItemRows();
  });

  document.getElementById('modalSave').onclick = async () => {
    const prospectoId = document.getElementById('propProspecto').value || null;
    const validItems  = _items.filter(it => it.descripcion.trim());
    if (!prospectoId)       { toast('Selecciona un prospecto', 'error'); return; }
    if (!validItems.length) { toast('Agrega al menos un ítem con descripción', 'error'); return; }
    const { total } = _calcTotals();
    const data = {
      prospectoId,
      servicios: validItems,
      valor:     total,
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
