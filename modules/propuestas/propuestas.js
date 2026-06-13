// modules/propuestas/propuestas.js
// La Propuesta presenta SOLO el programa a ofrecer (valores netos, sin IVA): es
// la cotización preliminar que se envía al cliente. El IVA, la mano de obra y el
// plan de servicio se formalizan después en el módulo Presupuesto.
import { propuestas, prospectos, config } from '../../js/db.js';
import { escHtml, formatDate, formatCLP, toast, PROP_ESTADOS, propEstadoLabel } from '../../js/utils.js';
import { parseCLP } from '../../js/format.js';
import { openCorporateDoc } from '../../js/pdf.js';

function _normItems(servicios) {
  if (!Array.isArray(servicios) || !servicios.length) return [];
  if (typeof servicios[0] === 'string') return servicios.map(s => ({ descripcion: s, cantidad: 1, precioUnit: 0 }));
  return servicios.map(it => ({ descripcion: it.descripcion || '', cantidad: it.cantidad || 1, precioUnit: it.precioUnit || 0 }));
}

const stColors = { borrador:'var(--text3)', enviada:'var(--primary)', negociando:'var(--amber)', aceptada:'var(--green)', rechazada:'var(--danger)' };
const stBgs    = { borrador:'var(--surface3)', enviada:'var(--primary-l)', negociando:'var(--amber-l)', aceptada:'var(--green-l)', rechazada:'var(--danger-l)' };

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
  // Propuesta = solo el programa: total neto, sin IVA (el IVA va en Presupuesto).
  const sub = _items.reduce((s, it) => s + (it.cantidad * it.precioUnit), 0);
  return { subtotal: sub, total: sub };
}

function _updateTotalsUI() {
  const { total } = _calcTotals();
  const t = document.getElementById('propTotal'); if (t) t.textContent = formatCLP(total);
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

  const totalEnv   = todas.filter(p => p.estado === 'enviada' || p.estado === 'negociando').length;
  const totalAcept = todas.filter(p => p.estado === 'aceptada').length;
  const valorAcept = todas.filter(p => p.estado === 'aceptada').reduce((s, p) => s + (+p.valor || 0), 0);
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
                  <td><span class="badge" style="color:${stColors[p.estado]||'var(--text3)'};background:${stBgs[p.estado]||'var(--surface3)'};border-color:${stColors[p.estado]||'var(--border)'}">${escHtml(propEstadoLabel(p.estado))}</span></td>
                  <td>
                    <div style="display:flex;gap:4px">
                      <button class="btn btn-ghost btn-sm" onclick="window._app.propuestaPDF('${p.id}')" title="Generar cotización PDF">${window.icon?window.icon('fileText','',14):''} PDF</button>
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
      <div style="font-size:12px;color:var(--text3);margin-bottom:8px">La propuesta presenta solo el programa, en valores netos. El IVA, la mano de obra y el plan de servicio se detallan en el Presupuesto.</div>
      <div style="display:flex;justify-content:space-between;border-top:1px solid var(--border);padding-top:8px"><span style="font-weight:700;color:var(--navy)">Total del programa (neto)</span><span id="propTotal" style="font-weight:800;font-size:16px;color:var(--navy)">—</span></div>
    </div>

    <div class="form-row" style="margin-top:14px">
      <div class="form-group">
        <label>Estado</label>
        <select id="propEstado">
          ${PROP_ESTADOS.map(e => `<option value="${e.v}"${(p.estado || 'borrador') === e.v ? ' selected' : ''}>${e.label}</option>`).join('')}
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
      vigencia:  document.getElementById('propVigencia').value || null,
      notas:     document.getElementById('propNotas').value.trim(),
    };
    try {
      if (p.id) await propuestas.update({ ...p, ...data });
      else      await propuestas.add(data);
      if (onSave) onSave();
    } catch (err) {
      console.error('Error al guardar propuesta:', err);
      toast(err?.message || 'No se pudo guardar la propuesta', 'error');
    }
  };
}

// Genera la cotización PDF corporativa (solo el programa, sin IVA)
export async function propuestaPDF(id) {
  const p = await propuestas.get(id);
  if (!p) { toast('Propuesta no encontrada', 'error'); return; }
  const pr = p.prospectoId ? await prospectos.get(p.prospectoId) : null;
  const empresa = await config.get('empresa') || 'Tríada Consultoría';
  const autor   = await config.get('userName') || '';
  const items   = _normItems(p.servicios);
  const neto    = items.reduce((s, it) => s + it.cantidad * it.precioUnit, 0);

  const bodyHtml = `
    <table class="items">
      <thead><tr><th>Programa / Servicio</th><th class="num">Cant.</th><th class="num">Valor unit.</th><th class="num">Subtotal</th></tr></thead>
      <tbody>
        ${items.length ? items.map(it => `<tr>
          <td>${escHtml(it.descripcion)}</td>
          <td class="num">${it.cantidad}</td>
          <td class="num">${formatCLP(it.precioUnit)}</td>
          <td class="num">${formatCLP(it.cantidad * it.precioUnit)}</td>
        </tr>`).join('') : `<tr><td colspan="4" style="color:#94A0B6">Sin ítems</td></tr>`}
      </tbody>
    </table>
    <div class="totals">
      <div class="row grand"><span class="lbl" style="color:inherit">Total del programa (neto)</span><span>${formatCLP(neto)}</span></div>
    </div>
    ${p.notas ? `<div class="notes"><strong>Notas:</strong> ${escHtml(p.notas)}</div>` : ''}
    <div class="notes">Valores netos, sin IVA. Este documento presenta el programa propuesto; el presupuesto detallado —con IVA, mano de obra y plan de servicio— se entrega por separado.</div>`;

  const ok = openCorporateDoc({
    tipo: 'Cotización', titulo: 'Propuesta de programa', empresa, autor,
    clienteNombre: pr?.empresa || pr?.nombre || '', clienteRut: pr?.rut || '',
    correlativo: p.correlativo, fecha: p.fecha, vigencia: p.vigencia, bodyHtml,
  });
  if (!ok) toast('Permite ventanas emergentes para generar el PDF', 'error');
}
