// ============================================================================
// screens/propuesta.js — propuesta comercial.
// Ítems de servicio (descripción · cantidad · precio), totales Subtotal→IVA 19%→
// Total en CLP. Guarda en `propuestas` (servicios jsonb + valor + estado + vigencia).
// ============================================================================
import { db, PROP_ESTADOS, propEstadoLabel, formatCLP, formatDate, todayStr, escHtml, initials } from '../core.js';
import { ic, toast, openSheet, closeSheet } from '../ui.js';
import { openCotizacion } from '../cotizacion.js';

const e = escHtml;
let _form = {}, _formKey = null, _items = [], _lead = null;

const lineOf = (it) => (Number(it.cantidad) || 0) * (Number(it.precioUnit) || 0);
const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

function plusDays(n) {
  const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10);
}

function itemsHtml() {
  return _items.map((it, i) => `
    <div class="card" data-item="${i}" style="padding:14px">
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px">
        <input class="input pp-desc" data-i="${i}" placeholder="Descripción del servicio" value="${e(it.descripcion || '')}" style="flex:1;height:42px">
        <button class="pp-del" data-i="${i}" aria-label="Quitar" style="width:38px;height:42px;border-radius:8px;border:0;background:var(--danger-l);color:var(--danger);cursor:pointer;display:flex;align-items:center;justify-content:center;flex:none">${ic('trash', { size: 16, sw: 2 })}</button>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <div style="display:flex;align-items:center;border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden;flex:none">
          <button class="pp-dec" data-i="${i}" style="width:34px;height:38px;border:0;background:var(--surface2);color:var(--text);cursor:pointer;font-size:18px;line-height:1">−</button>
          <span class="tabular" data-qty="${i}" style="min-width:32px;text-align:center;font-weight:700;font-size:14px;color:var(--ink)">${Number(it.cantidad) || 1}</span>
          <button class="pp-inc" data-i="${i}" style="width:34px;height:38px;border:0;background:var(--surface2);color:var(--text);cursor:pointer;font-size:18px;line-height:1">+</button>
        </div>
        <input class="input pp-precio tabular" data-i="${i}" type="number" inputmode="numeric" min="0" placeholder="Precio unit." value="${it.precioUnit || ''}" style="flex:1;height:38px;text-align:right">
      </div>
      <div style="text-align:right;margin-top:9px;font-size:13px;color:var(--text2)">= <span class="serif tabular" data-line="${i}" style="font-size:16px;font-weight:600;color:var(--ink)">${formatCLP(lineOf(it))}</span></div>
    </div>`).join('');
}

export default {
  chrome: false,
  async render(app) {
    const key = app.params.propId ? 'edit:' + app.params.propId : 'new:' + (app.params.leadId || '');
    if (_formKey !== key) {
      if (app.params.propId) {
        const p = await db.propuestas.get(app.params.propId).catch(() => null);
        _form = { id: p?.id || null, prospectoId: p?.prospectoId || null, estado: p?.estado || 'borrador', vigencia: p?.vigencia || plusDays(15), correlativo: p?.correlativo || null };
        _items = (p?.servicios && p.servicios.length) ? p.servicios.map((s) => ({ descripcion: s.descripcion || '', cantidad: s.cantidad || 1, precioUnit: s.precioUnit || 0 })) : [{ descripcion: '', cantidad: 1, precioUnit: 0 }];
      } else {
        _form = { id: null, prospectoId: app.params.leadId || null, estado: 'borrador', vigencia: plusDays(15) };
        _items = [{ descripcion: 'Diagnóstico Empresarial 360', cantidad: 1, precioUnit: 0 }];
      }
      _formKey = key;
    }
    _lead = _form.prospectoId ? await db.prospectos.get(_form.prospectoId).catch(() => null) : null;

    const sub = _items.reduce((s, it) => s + lineOf(it), 0);
    const iva = Math.round(sub * 0.19), tot = sub + iva;
    const estadoChip = (o) => `<button class="pp-estado" data-v="${o.v}" style="flex:none;border:1px solid ${_form.estado === o.v ? 'var(--teal)' : 'var(--border)'};background:${_form.estado === o.v ? 'var(--teal-l)' : 'var(--surface)'};color:${_form.estado === o.v ? 'var(--teal-d)' : 'var(--text2)'};border-radius:20px;padding:8px 14px;font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap">${e(o.label)}</button>`;
    const lead = _lead;

    return `
    <section class="screen" style="display:flex;flex-direction:column">
      <header class="hdr hdr--back">
        <button class="icon-btn icon-btn--bare" id="ppBack" style="width:38px;height:38px" aria-label="Volver">${ic('back', { size: 22, sw: 1.9 })}</button>
        <div class="serif" style="font-size:20px;font-weight:600;color:var(--ink)">${_form.id ? 'Editar propuesta' : 'Propuesta'}</div>
      </header>

      <div class="pad-form">
        <button type="button" id="ppProspecto" style="width:100%;display:flex;align-items:center;gap:11px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:12px 13px;cursor:pointer;margin-bottom:18px;text-align:left;box-shadow:var(--shadow-sm)">
          <span style="width:38px;height:38px;border-radius:11px;background:var(--navy-l);color:var(--navy);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex:none">${lead ? e(initials(lead.nombre)) : ic('users', { size: 18 })}</span>
          <span style="flex:1;min-width:0"><span style="display:block;font-size:11px;color:var(--text3)">Para</span><span class="ell" style="display:block;font-weight:600;font-size:14.5px;color:var(--ink)">${lead ? e(lead.empresa || lead.nombre) : 'Vincular prospecto'}</span></span>
          ${ic('next', { size: 18, sw: 1.9 })}
        </button>

        <h2 class="serif" style="font-size:18px;font-weight:600;color:var(--ink);margin-bottom:10px">Ítems de servicio</h2>
        <div class="list" id="ppItems">${itemsHtml()}</div>
        <button id="ppAdd" class="btn" style="width:100%;height:46px;margin-top:10px;border:1px dashed var(--border2);background:var(--surface);color:var(--teal)">${ic('plus', { size: 17, sw: 2 })} Agregar ítem</button>

        <div class="card" style="padding:16px;margin-top:16px">
          <div style="display:flex;justify-content:space-between;margin-bottom:9px"><span style="font-size:13.5px;color:var(--text2)">Subtotal</span><span class="tabular" id="propSub" style="font-size:14px;font-weight:600;color:var(--text)">${formatCLP(sub)}</span></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:11px;padding-bottom:11px;border-bottom:1px solid var(--border)"><span style="font-size:13.5px;color:var(--text2)">IVA 19%</span><span class="tabular" id="propIva" style="font-size:14px;font-weight:600;color:var(--text)">${formatCLP(iva)}</span></div>
          <div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:14px;font-weight:700;color:var(--ink)">Total</span><span class="serif tabular" id="propTot" style="font-size:26px;font-weight:600;color:var(--teal)">${formatCLP(tot)}</span></div>
        </div>

        <label class="field__label" style="margin:18px 0 8px">Estado</label>
        <div class="chip-row" id="ppEstado" style="padding:0 0 16px;gap:7px">${PROP_ESTADOS.map(estadoChip).join('')}</div>

        <label class="field__label">Vigencia</label>
        <input id="ppVigencia" class="input" type="date" value="${e(_form.vigencia)}">
      </div>

      <div class="action-bar">
        <div style="display:flex;gap:9px">
          <button class="btn btn--ghost" id="ppPDF" style="flex:1;height:46px;font-size:13px;color:var(--ink)">${ic('fileText', { size: 17 })} Cotización PDF</button>
          <button class="btn btn--ghost" id="ppShare" style="flex:1;height:46px;font-size:13px;color:var(--ink)">${ic('share', { size: 17 })} Compartir</button>
        </div>
        <button class="btn btn--primary btn--block" id="ppSave">${_form.id ? 'Guardar cambios' : 'Guardar propuesta'}</button>
      </div>
    </section>`;
  },

  mount(app) {
    const host = document.getElementById('screen');
    const itemsEl = host.querySelector('#ppItems');

    const recompute = () => {
      let sub = 0;
      _items.forEach((it, i) => { const lt = lineOf(it); sub += lt; const sp = itemsEl.querySelector(`[data-line="${i}"]`); if (sp) sp.textContent = formatCLP(lt); });
      const iva = Math.round(sub * 0.19);
      setText('propSub', formatCLP(sub)); setText('propIva', formatCLP(iva)); setText('propTot', formatCLP(sub + iva));
    };
    const rerenderItems = () => { itemsEl.innerHTML = itemsHtml(); recompute(); };

    host.querySelector('#ppBack').addEventListener('click', () => app.back());

    itemsEl.addEventListener('input', (ev) => {
      const d = ev.target.closest('.pp-desc'), p = ev.target.closest('.pp-precio');
      if (d) { _items[+d.dataset.i].descripcion = d.value; }
      else if (p) { _items[+p.dataset.i].precioUnit = Math.max(0, +p.value || 0); recompute(); }
    });
    itemsEl.addEventListener('click', (ev) => {
      const inc = ev.target.closest('.pp-inc'), dec = ev.target.closest('.pp-dec'), del = ev.target.closest('.pp-del');
      if (inc) { const i = +inc.dataset.i; _items[i].cantidad = (Number(_items[i].cantidad) || 1) + 1; itemsEl.querySelector(`[data-qty="${i}"]`).textContent = _items[i].cantidad; recompute(); }
      else if (dec) { const i = +dec.dataset.i; _items[i].cantidad = Math.max(1, (Number(_items[i].cantidad) || 1) - 1); itemsEl.querySelector(`[data-qty="${i}"]`).textContent = _items[i].cantidad; recompute(); }
      else if (del) { if (_items.length <= 1) { toast('Deja al menos un ítem', 'info'); return; } _items.splice(+del.dataset.i, 1); rerenderItems(); }
    });
    host.querySelector('#ppAdd').addEventListener('click', () => { _items.push({ descripcion: '', cantidad: 1, precioUnit: 0 }); rerenderItems(); });

    host.querySelector('#ppEstado').addEventListener('click', (ev) => {
      const b = ev.target.closest('.pp-estado'); if (!b) return;
      _form.estado = b.getAttribute('data-v');
      host.querySelectorAll('.pp-estado').forEach((c) => { const on = c.getAttribute('data-v') === _form.estado; c.style.borderColor = on ? 'var(--teal)' : 'var(--border)'; c.style.background = on ? 'var(--teal-l)' : 'var(--surface)'; c.style.color = on ? 'var(--teal-d)' : 'var(--text2)'; });
    });

    host.querySelector('#ppProspecto').addEventListener('click', () => openProspectoPicker(app));
    host.querySelector('#ppPDF').addEventListener('click', () => {
      _form.vigencia = host.querySelector('#ppVigencia').value || _form.vigencia;
      const servicios = _items.filter((it) => (it.descripcion || '').trim() || lineOf(it) > 0).map((it) => ({ descripcion: (it.descripcion || '').trim(), cantidad: Number(it.cantidad) || 1, precioUnit: Number(it.precioUnit) || 0 }));
      if (!servicios.length) { toast('Agrega al menos un ítem con precio para la cotización', 'info'); return; }
      openCotizacion({ ..._form, servicios }, _lead);
    });
    host.querySelector('#ppShare').addEventListener('click', () => toast('Compartir: guarda primero y úsalo desde la ficha', 'info'));

    host.querySelector('#ppSave').addEventListener('click', async (ev) => {
      _form.vigencia = host.querySelector('#ppVigencia').value;
      const servicios = _items.filter((it) => (it.descripcion || '').trim() || lineOf(it) > 0).map((it) => ({ descripcion: (it.descripcion || '').trim(), cantidad: Number(it.cantidad) || 1, precioUnit: Number(it.precioUnit) || 0 }));
      if (!servicios.length) { toast('Agrega al menos un ítem con precio', 'err'); return; }
      const sub = servicios.reduce((s, it) => s + lineOf(it), 0);
      const valor = sub + Math.round(sub * 0.19);
      ev.target.disabled = true;
      const payload = { prospectoId: _form.prospectoId, servicios, valor, estado: _form.estado, vigencia: _form.vigencia };
      try {
        if (_form.id) await db.propuestas.update({ id: _form.id, ...payload });
        else await db.propuestas.add(payload);
        _formKey = null;
        toast(_form.id ? 'Propuesta actualizada ✓' : 'Propuesta guardada ✓', 'ok');
        if (_form.prospectoId) app.navigate('ficha', { leadId: _form.prospectoId, tab: 'prop' });
        else app.navigate('hoy');
      } catch (err) { console.error(err); toast('No se pudo guardar la propuesta', 'err'); ev.target.disabled = false; }
    });
  },
};

async function openProspectoPicker(app) {
  const leads = await db.prospectos.getAll().catch(() => []);
  const rows = leads.map((l) => `<button class="pk-lead" data-id="${e(l.id)}" style="width:100%;display:flex;align-items:center;gap:11px;background:none;border:0;border-bottom:1px solid var(--border);padding:12px 2px;cursor:pointer;text-align:left"><span style="width:34px;height:34px;border-radius:10px;background:var(--surface2);color:var(--text2);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex:none">${e(initials(l.nombre))}</span><span style="flex:1;min-width:0"><span class="ell" style="display:block;font-weight:600;font-size:14px;color:var(--ink)">${e(l.nombre)}</span><span class="ell" style="display:block;font-size:12px;color:var(--text2)">${e(l.empresa || '')}</span></span></button>`).join('');
  openSheet(`<div class="sheet__body"><div class="sheet__title">Vincular prospecto</div>${rows || '<div class="muted" style="padding:14px;font-size:13px">No hay prospectos.</div>'}</div>`, {
    onMount: (el) => el.querySelectorAll('.pk-lead').forEach((b) => b.addEventListener('click', () => { _form.prospectoId = b.getAttribute('data-id') || null; closeSheet(); app.renderScreen(); })),
  });
}
