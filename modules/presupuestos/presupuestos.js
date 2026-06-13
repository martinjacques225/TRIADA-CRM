// modules/presupuestos/presupuestos.js
// Presupuesto = documento de cierre que sigue a la Propuesta: toma el programa y
// le agrega mano de obra, IVA (19%) y el plan de servicio (si se contrata).
// Cuelga del cliente y puede referenciar la propuesta de origen.
// Requiere supabase/presupuestos.sql; si falta la tabla, muestra el aviso.
import { presupuestos, clientes, propuestas, prospectos, config, isMissingTable } from '../../js/db.js';
import { escHtml, formatDate, formatCLP, toast } from '../../js/utils.js';
import { parseCLP } from '../../js/format.js';
import { openCorporateDoc } from '../../js/pdf.js';

const _i = (n, s) => (window.icon ? window.icon(n, '', s) : '');
const IVA_RATE = 0.19;

const ESTADOS = [
  { v: 'borrador',  label: 'Borrador'  },
  { v: 'enviado',   label: 'Enviado'   },
  { v: 'aceptado',  label: 'Aceptado'  },
  { v: 'rechazado', label: 'Rechazado' },
];
const estadoLabel = (v) => (ESTADOS.find(e => e.v === v)?.label) || v || '—';
const stColors = { borrador: 'var(--text3)', enviado: 'var(--primary)', aceptado: 'var(--green)', rechazado: 'var(--danger)' };
const stBgs    = { borrador: 'var(--surface3)', enviado: 'var(--primary-l)', aceptado: 'var(--green-l)', rechazado: 'var(--danger-l)' };

const clienteLabel = (c) => c ? (c.razonSocial || c.nombre || c.correlativo || 'Cliente') : '—';

let _pitems = [];
const _newItem = () => ({ descripcion: '', cantidad: 1, precioUnit: 0 });
function _initItems(p) {
  const s = p?.servicios;
  if (!Array.isArray(s) || !s.length) return [_newItem()];
  if (typeof s[0] === 'string') return s.map(n => ({ descripcion: n, cantidad: 1, precioUnit: 0 }));
  return s.map(it => ({ descripcion: it.descripcion || '', cantidad: it.cantidad || 1, precioUnit: it.precioUnit || 0 }));
}
function _manoObraVal() { return parseCLP(document.getElementById('presManoObra')?.value || '0'); }
function _calc() {
  const prog = _pitems.reduce((s, it) => s + it.cantidad * it.precioUnit, 0);
  const neto = prog + _manoObraVal();
  const iva  = Math.round(neto * IVA_RATE);
  return { prog, neto, iva, total: neto + iva };
}

export async function render() {
  const center = document.getElementById('center');
  let todos;
  try {
    todos = await presupuestos.getAll();
  } catch (err) {
    if (isMissingTable(err)) { center.innerHTML = _setupNotice(); return; }
    console.error('[Presupuestos]', err);
    center.innerHTML = `<div class="view-animate"><div class="empty-state"><div class="empty-icon">⚠️</div><h3>No se pudieron cargar los presupuestos</h3><p>${escHtml(err?.message || String(err))}</p></div></div>`;
    return;
  }

  const todosCli = await clientes.getAll();
  const cliMap = Object.fromEntries(todosCli.map(c => [c.id, c]));

  const totalCerrado = todos.filter(p => p.estado === 'aceptado').reduce((s, p) => s + (+p.total || 0), 0);
  const abiertos = todos.filter(p => p.estado === 'borrador' || p.estado === 'enviado').length;

  center.innerHTML = `<div class="view-animate">
    <div class="section-head">
      <h2>Presupuesto</h2>
      <button class="btn btn-primary" onclick="window._app.openPresupuestoModal()">+ Nuevo presupuesto</button>
    </div>

    <div class="kpi-grid" style="margin-bottom:24px">
      <div class="kpi-card"><div class="kpi-top"><span class="kpi-label">Presupuestos</span><span class="kpi-ic" style="background:var(--primary-l);color:var(--primary)">${_i('fileText')}</span></div><div class="kpi-value">${todos.length}</div><div class="kpi-sub">${abiertos} abiertos</div></div>
      <div class="kpi-card"><div class="kpi-top"><span class="kpi-label">Cerrado (aceptado)</span><span class="kpi-ic" style="background:var(--green-l);color:var(--green)">${_i('checkCirc')}</span></div><div class="kpi-value kpi-value-sm">${formatCLP(totalCerrado)}</div><div class="kpi-sub">Con IVA incluido</div></div>
      <div class="kpi-card"><div class="kpi-top"><span class="kpi-label">IVA del periodo</span><span class="kpi-ic" style="background:var(--amber-l);color:var(--amber)">${_i('coins')}</span></div><div class="kpi-value kpi-value-sm">${formatCLP(todos.reduce((s, p) => s + (+p.iva || 0), 0))}</div><div class="kpi-sub">Suma de IVA emitido</div></div>
    </div>

    ${todos.length === 0
      ? `<div class="empty-state"><div class="empty-icon">${_i('fileText')}</div><h3>Sin presupuestos aún</h3><p>Crea un presupuesto a partir de una propuesta para sumar mano de obra, IVA y plan de servicio.</p><button class="btn btn-primary" onclick="window._app.openPresupuestoModal()">+ Nuevo presupuesto</button></div>`
      : `<div class="card" style="overflow:hidden">
          <table class="data-table">
            <thead><tr><th>Código</th><th>Cliente</th><th>Neto</th><th>IVA</th><th>Total</th><th>Estado</th><th>Vigencia</th><th>Acciones</th></tr></thead>
            <tbody>
              ${todos.map(p => `<tr>
                <td style="font-size:12px;font-weight:700;color:var(--text3);white-space:nowrap">${escHtml(p.correlativo || '—')}</td>
                <td><strong>${escHtml(clienteLabel(cliMap[p.clienteId]))}</strong></td>
                <td style="color:var(--text2)">${formatCLP(p.neto)}</td>
                <td style="color:var(--text2)">${formatCLP(p.iva)}</td>
                <td><strong style="font-size:15px;color:var(--navy)">${formatCLP(p.total)}</strong></td>
                <td><span class="badge" style="color:${stColors[p.estado] || 'var(--text3)'};background:${stBgs[p.estado] || 'var(--surface3)'};border-color:${stColors[p.estado] || 'var(--border)'}">${escHtml(estadoLabel(p.estado))}</span></td>
                <td style="font-size:12.5px;color:var(--text3)">${p.vigencia ? formatDate(p.vigencia) : '—'}</td>
                <td>
                  <div style="display:flex;gap:4px">
                    <button class="btn btn-ghost btn-sm" onclick="window._app.presupuestoPDF('${p.id}')" title="Generar PDF">${_i('fileText', 14)} PDF</button>
                    <button class="btn btn-ghost btn-sm" onclick="window._app.editPresupuesto('${p.id}')">Editar</button>
                    <button class="btn btn-ghost btn-sm" onclick="window._app.deletePresupuesto('${p.id}')" style="color:var(--danger)">Eliminar</button>
                  </div>
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>`}
  </div>`;
}

function _setupNotice() {
  return `<div class="view-animate">
    <div class="section-head"><h2>Presupuesto</h2></div>
    <div class="card card-pad" style="max-width:640px">
      <div style="display:flex;gap:14px;align-items:flex-start">
        <div style="width:46px;height:46px;border-radius:12px;background:var(--amber-l);color:var(--amber);display:flex;align-items:center;justify-content:center;flex-shrink:0">🗄️</div>
        <div>
          <h3 style="font-family:var(--serif);font-size:19px;font-weight:600;color:var(--ink);margin-bottom:6px">Falta preparar la tabla</h3>
          <p style="font-size:14px;color:var(--text2);line-height:1.55">El módulo Presupuesto necesita su tabla. Corre <code>supabase/presupuestos.sql</code> en el SQL Editor de Supabase y recarga. La Propuesta queda como la cotización del programa (sin IVA); el Presupuesto agrega mano de obra, IVA y plan de servicio.</p>
        </div>
      </div>
    </div>
  </div>`;
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function renderPresupuestoModal(clientesList, propuestasList, prospectosList, onSave, existing = null) {
  const body = document.getElementById('modalBody');
  if (!body) return;
  const p = existing || {};
  _pitems = _initItems(p);

  const prMap = Object.fromEntries(prospectosList.map(x => [x.id, x]));
  const propOpts = propuestasList.map(pr => {
    const lead = prMap[pr.prospectoId];
    const who = lead ? (lead.empresa || lead.nombre) : 'Prospecto';
    return `<option value="${pr.id}">${escHtml((pr.correlativo || 'PROP') + ' — ' + who)}</option>`;
  }).join('');

  body.innerHTML = `
    <div class="form-row">
      <div class="form-group">
        <label>Cliente <span class="req">*</span></label>
        <select id="presCliente">
          <option value="">— Selecciona —</option>
          ${clientesList.map(c => `<option value="${c.id}"${p.clienteId === c.id ? ' selected' : ''}>${escHtml(clienteLabel(c))}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Importar programa de propuesta</label>
        <select id="presPropuesta"><option value="">— Opcional —</option>${propOpts}</select>
      </div>
    </div>

    <div class="form-group">
      <label>Programa / Ítems</label>
      <div style="border:1px solid var(--border);border-radius:8px;overflow:hidden">
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="background:var(--surface2);font-size:12px;color:var(--text3);text-align:left">
            <th style="padding:7px 10px;font-weight:600">Descripción</th>
            <th style="padding:7px 6px;font-weight:600;width:60px">Cant.</th>
            <th style="padding:7px 8px;font-weight:600;width:140px">Precio unit. (CLP)</th>
            <th style="padding:7px 12px;font-weight:600;width:110px;text-align:right">Subtotal</th>
            <th style="width:34px"></th>
          </tr></thead>
          <tbody id="presItemsBody"></tbody>
        </table>
        <div style="padding:6px 8px;border-top:1px solid var(--border);background:var(--surface)">
          <button type="button" id="presAddItem" class="btn btn-ghost btn-sm" style="font-size:12.5px">+ Agregar ítem</button>
        </div>
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>Mano de obra (CLP)</label>
        <input id="presManoObra" type="text" inputmode="numeric" placeholder="0" value="${p.manoObra ? Number(p.manoObra).toLocaleString('es-CL') : ''}">
      </div>
      <div class="form-group">
        <label>Plan de servicio — valor mensual (CLP)</label>
        <input id="presPlanMensual" type="text" inputmode="numeric" placeholder="0" value="${p.planMensual ? Number(p.planMensual).toLocaleString('es-CL') : ''}">
      </div>
    </div>

    <div class="form-group">
      <label>Plan de servicio (descripción, si se contrata)</label>
      <textarea id="presPlanServicio" placeholder="Ej: Acompañamiento mensual con reportería y reuniones quincenales.">${escHtml(p.planServicio || '')}</textarea>
    </div>

    <div style="background:var(--surface2);border-radius:8px;padding:12px 16px;margin-top:4px;font-size:13.5px">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="color:var(--text3)">Programa</span><span id="presProg" style="font-weight:600">—</span></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="color:var(--text3)">+ Mano de obra</span><span id="presMO" style="font-weight:600">—</span></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="color:var(--text3)">Neto</span><span id="presNeto" style="font-weight:600">—</span></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="color:var(--text3)">IVA 19%</span><span id="presIva" style="font-weight:600">—</span></div>
      <div style="display:flex;justify-content:space-between;border-top:1px solid var(--border);padding-top:8px"><span style="font-weight:700;color:var(--navy)">Total (con IVA)</span><span id="presTotal" style="font-weight:800;font-size:16px;color:var(--navy)">—</span></div>
    </div>

    <div class="form-row" style="margin-top:14px">
      <div class="form-group">
        <label>Estado</label>
        <select id="presEstado">${ESTADOS.map(e => `<option value="${e.v}"${(p.estado || 'borrador') === e.v ? ' selected' : ''}>${e.label}</option>`).join('')}</select>
      </div>
      <div class="form-group">
        <label>Vigencia hasta</label>
        <input id="presVigencia" type="date" value="${p.vigencia || ''}">
      </div>
    </div>
    <div class="form-group"><label>Notas</label><textarea id="presNotas">${escHtml(p.notas || '')}</textarea></div>`;

  _renderItemRows();
  _updateTotalsUI();

  document.getElementById('presAddItem').addEventListener('click', () => { _pitems.push(_newItem()); _renderItemRows(); });
  document.getElementById('presManoObra').addEventListener('input', () => {
    const el = document.getElementById('presManoObra'); const d = el.value.replace(/\D/g, '');
    el.value = d ? Number(d).toLocaleString('es-CL') : ''; _updateTotalsUI();
  });
  document.getElementById('presPlanMensual').addEventListener('input', () => {
    const el = document.getElementById('presPlanMensual'); const d = el.value.replace(/\D/g, '');
    el.value = d ? Number(d).toLocaleString('es-CL') : '';
  });

  // Importar ítems desde una propuesta
  const propMapById = Object.fromEntries(propuestasList.map(x => [x.id, x]));
  document.getElementById('presPropuesta').addEventListener('change', (e) => {
    const pr = propMapById[e.target.value];
    if (!pr) return;
    _pitems = _initItems(pr);
    if (pr.prospectoId) {
      const lead = prMap[pr.prospectoId];
      const match = clientesList.find(c => c.leadId === pr.prospectoId);
      if (match) document.getElementById('presCliente').value = match.id;
    }
    document.getElementById('presNotas').value = pr.notas || document.getElementById('presNotas').value;
    _renderItemRows(); _updateTotalsUI();
  });

  document.getElementById('modalSave').onclick = async () => {
    const clienteId = document.getElementById('presCliente').value || null;
    const validItems = _pitems.filter(it => it.descripcion.trim());
    if (!clienteId) { toast('Selecciona un cliente', 'error'); return; }
    if (!validItems.length && !_manoObraVal()) { toast('Agrega al menos un ítem o mano de obra', 'error'); return; }
    const { neto, iva, total } = _calc();
    const propuestaId = document.getElementById('presPropuesta').value || p.propuestaId || null;
    const cli = clientesList.find(c => c.id === clienteId);
    const data = {
      clienteId,
      leadId:       cli?.leadId || null,
      propuestaId,
      servicios:    validItems,
      manoObra:     _manoObraVal(),
      planServicio: document.getElementById('presPlanServicio').value.trim(),
      planMensual:  parseCLP(document.getElementById('presPlanMensual').value || '0'),
      neto, iva, total,
      estado:       document.getElementById('presEstado').value,
      vigencia:     document.getElementById('presVigencia').value || null,
      notas:        document.getElementById('presNotas').value.trim(),
    };
    try {
      if (p.id) await presupuestos.update({ ...p, ...data });
      else      await presupuestos.add(data);
      if (onSave) onSave();
    } catch (err) {
      console.error('Error al guardar presupuesto:', err);
      toast(err?.message || 'No se pudo guardar el presupuesto', 'error');
    }
  };
}

function _renderItemRows() {
  const tbody = document.getElementById('presItemsBody');
  if (!tbody) return;
  tbody.innerHTML = _pitems.map((item, i) => `
    <tr>
      <td style="padding:4px 8px"><input type="text" class="pres-desc" data-i="${i}" value="${escHtml(item.descripcion)}" placeholder="Descripción" style="width:100%;font-size:13px;padding:5px 7px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--text)"></td>
      <td style="padding:4px 6px"><input type="number" class="pres-cant" data-i="${i}" min="1" value="${item.cantidad}" style="width:52px;font-size:13px;padding:5px 4px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--text);text-align:center"></td>
      <td style="padding:4px 6px"><input type="text" class="pres-precio" data-i="${i}" inputmode="numeric" value="${item.precioUnit ? Number(item.precioUnit).toLocaleString('es-CL') : ''}" placeholder="0" style="width:115px;font-size:13px;padding:5px 7px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--text);text-align:right"></td>
      <td style="padding:4px 12px;text-align:right;font-size:13px;font-weight:600;color:var(--navy);white-space:nowrap" data-sub="${i}">${formatCLP(item.cantidad * item.precioUnit)}</td>
      <td style="padding:4px 4px;text-align:center">${_pitems.length > 1 ? `<button type="button" class="pres-rm" data-i="${i}" style="border:none;background:none;color:var(--danger);cursor:pointer;font-size:18px;line-height:1;padding:2px 6px">×</button>` : ''}</td>
    </tr>`).join('');

  tbody.querySelectorAll('.pres-desc').forEach(inp => inp.addEventListener('input', e => { _pitems[+e.target.dataset.i].descripcion = e.target.value; }));
  tbody.querySelectorAll('.pres-cant').forEach(inp => inp.addEventListener('change', e => {
    const i = +e.target.dataset.i; _pitems[i].cantidad = Math.max(1, Math.round(+e.target.value || 1)); e.target.value = _pitems[i].cantidad;
    const sub = document.querySelector(`[data-sub="${i}"]`); if (sub) sub.textContent = formatCLP(_pitems[i].cantidad * _pitems[i].precioUnit); _updateTotalsUI();
  }));
  tbody.querySelectorAll('.pres-precio').forEach(inp => inp.addEventListener('change', e => {
    const i = +e.target.dataset.i; _pitems[i].precioUnit = parseCLP(e.target.value); e.target.value = _pitems[i].precioUnit ? Number(_pitems[i].precioUnit).toLocaleString('es-CL') : '';
    const sub = document.querySelector(`[data-sub="${i}"]`); if (sub) sub.textContent = formatCLP(_pitems[i].cantidad * _pitems[i].precioUnit); _updateTotalsUI();
  }));
  tbody.querySelectorAll('.pres-rm').forEach(btn => btn.addEventListener('click', e => { _pitems.splice(+e.target.dataset.i, 1); _renderItemRows(); _updateTotalsUI(); }));
}

function _updateTotalsUI() {
  const { prog, neto, iva, total } = _calc();
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = formatCLP(v); };
  set('presProg', prog); set('presMO', _manoObraVal()); set('presNeto', neto); set('presIva', iva); set('presTotal', total);
}

// ── PDF corporativo (programa + mano de obra + IVA + plan de servicio) ─────────
export async function presupuestoPDF(id) {
  const p = await presupuestos.get(id);
  if (!p) { toast('Presupuesto no encontrado', 'error'); return; }
  const [cli, empresa, autor] = await Promise.all([
    p.clienteId ? clientes.get(p.clienteId) : null,
    config.get('empresa'), config.get('userName'),
  ]);
  const items = _initItems(p);
  const progTotal = items.reduce((s, it) => s + it.cantidad * it.precioUnit, 0);

  const bodyHtml = `
    <table class="items">
      <thead><tr><th>Programa / Servicio</th><th class="num">Cant.</th><th class="num">Valor unit.</th><th class="num">Subtotal</th></tr></thead>
      <tbody>
        ${items.map(it => `<tr><td>${escHtml(it.descripcion)}</td><td class="num">${it.cantidad}</td><td class="num">${formatCLP(it.precioUnit)}</td><td class="num">${formatCLP(it.cantidad * it.precioUnit)}</td></tr>`).join('')}
        ${(+p.manoObra) ? `<tr><td><strong>Mano de obra</strong></td><td class="num"></td><td class="num"></td><td class="num">${formatCLP(p.manoObra)}</td></tr>` : ''}
      </tbody>
    </table>
    <div class="totals">
      <div class="row"><span class="lbl">Neto</span><span>${formatCLP(p.neto)}</span></div>
      <div class="row"><span class="lbl">IVA 19%</span><span>${formatCLP(p.iva)}</span></div>
      <div class="row grand"><span class="lbl" style="color:inherit">Total con IVA</span><span>${formatCLP(p.total)}</span></div>
    </div>
    ${(p.planServicio || +p.planMensual) ? `<div class="block">
      <h4>Plan de servicio</h4>
      <p>${escHtml(p.planServicio || 'Plan de acompañamiento.')}${(+p.planMensual) ? `\n\nValor mensual: ${formatCLP(p.planMensual)} + IVA (facturación recurrente).` : ''}</p>
    </div>` : ''}
    ${p.notas ? `<div class="notes"><strong>Notas:</strong> ${escHtml(p.notas)}</div>` : ''}`;

  const ok = openCorporateDoc({
    tipo: 'Presupuesto', titulo: 'Presupuesto de servicios', empresa: empresa || 'Tríada Consultoría', autor: autor || '',
    clienteNombre: cli ? (cli.razonSocial || cli.nombre) : '', clienteRut: cli?.rut || '',
    correlativo: p.correlativo, fecha: p.fecha, vigencia: p.vigencia, bodyHtml,
  });
  if (!ok) toast('Permite ventanas emergentes para generar el PDF', 'error');
}
