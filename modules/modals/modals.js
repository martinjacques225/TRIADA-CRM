// modules/modals/modals.js
import { prospectos, diagnosticos, citas, propuestas, clientes, facturas, autodiags, presupuestos } from '../../js/db.js';
import { escHtml, PIPELINE_STAGES, RUBROS, TAMANOS, DOLORES, ORIGENES, DIAG_AREAS, toast, formatCLP, propEstadoLabel } from '../../js/utils.js';
import { attachFormatting, validateRut, validateEmail } from '../../js/format.js';
import { openMeetingModal } from '../agenda/agenda.js';
import { renderPropuestaModal } from '../propuestas/propuestas.js';
import { renderDiagnosticoModal } from '../diagnosticos/diagnosticos.js';
import { renderFacturaModal } from '../facturacion/facturacion.js';
import { renderAddClienteModal } from '../clientes/clientes.js';
import { renderPresupuestoModal } from '../presupuestos/presupuestos.js';

function _openModal(title, size = '') {
  document.getElementById('modalTitle').textContent = title;
  const box = document.querySelector('.modal-box');
  box.className = 'modal-box' + (size ? ' modal-'+size : '');
  document.getElementById('modalOverlay').classList.add('open');
  document.getElementById('modalSave').style.display = '';
  document.getElementById('modalCancel').textContent = 'Cancelar';
}

export function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  // El modal de reunión personaliza el botón de guardar; restaurar defaults.
  document.getElementById('modalSave').textContent = 'Guardar';
  document.getElementById('modalCancel').textContent = 'Cancelar';
}

export async function openProspectoModal(id = null) {
  const existing = id ? await prospectos.get(id) : null;
  _openModal(existing ? 'Editar prospecto' : 'Nuevo prospecto');

  const body = document.getElementById('modalBody');
  const p = existing || {};
  body.innerHTML = `
    <div class="form-section">Datos de contacto</div>
    <div class="form-row">
      <div class="form-group"><label>Nombre <span class="req">*</span></label><input id="pNombre" data-fmt="upper" value="${escHtml(p.nombre||'')}" placeholder="NOMBRE COMPLETO"></div>
      <div class="form-group"><label>Empresa</label><input id="pEmpresa" data-fmt="upper" value="${escHtml(p.empresa||'')}" placeholder="NOMBRE DE LA EMPRESA"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>RUT empresa</label><input id="pRut" data-fmt="rut" value="${escHtml(p.rut||'')}" placeholder="76.123.456-7"><div class="form-hint">Se valida automáticamente (módulo 11)</div></div>
      <div class="form-group"><label>Email</label><input id="pEmail" type="email" data-fmt="email" value="${escHtml(p.email||'')}" placeholder="correo@empresa.cl"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Teléfono / WhatsApp</label><input id="pTelefono" data-fmt="phone" value="${escHtml(p.telefono||'')}" placeholder="+56 9 1234 5678"></div>
      <div class="form-group"><label>Rubro</label>
        <select id="pRubro"><option value="">Selecciona…</option>${RUBROS.map(r=>`<option${p.rubro===r?' selected':''}>${r}</option>`).join('')}</select>
      </div>
    </div>

    <div class="form-section">Clasificación y pipeline</div>
    <div class="form-row">
      <div class="form-group"><label>N° trabajadores</label>
        <select id="pTamano">${TAMANOS.map(t=>`<option${p.tamano===t?' selected':''}>${t}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label>Etapa en pipeline</label>
        <select id="pEstado">${PIPELINE_STAGES.map(s=>`<option value="${s.id}"${(p.estado||'Nuevo')===s.id?' selected':''}>${s.icon} ${s.id}</option>`).join('')}</select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Origen</label>
        <select id="pOrigen"><option value="">—</option>${ORIGENES.map(o=>`<option${p.origen===o?' selected':''}>${o}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label>Dolor / preocupación principal</label>
        <select id="pDolor"><option value="">—</option>${DOLORES.map(d=>`<option${p.dolorPrincipal===d?' selected':''}>${d}</option>`).join('')}</select>
      </div>
    </div>
    <div class="form-group"><label>Notas internas</label>
      <textarea id="pNotas">${escHtml(p.notas||'')}</textarea>
    </div>`;

  attachFormatting(body);

  document.getElementById('modalSave').onclick = async () => {
    const nombre = document.getElementById('pNombre').value.trim();
    if (!nombre) { toast('El nombre es obligatorio', 'error'); return; }
    const rut   = document.getElementById('pRut').value.trim();
    const email = document.getElementById('pEmail').value.trim();
    if (rut && !validateRut(rut))       { toast('El RUT no es válido', 'error'); return; }
    if (email && !validateEmail(email)) { toast('El correo no es válido', 'error'); return; }
    const data = {
      nombre,
      empresa:        document.getElementById('pEmpresa').value.trim(),
      rut,
      email,
      telefono:       document.getElementById('pTelefono').value.trim(),
      rubro:          document.getElementById('pRubro').value,
      tamano:         document.getElementById('pTamano').value,
      estado:         document.getElementById('pEstado').value,
      origen:         document.getElementById('pOrigen').value,
      dolorPrincipal: document.getElementById('pDolor').value,
      notas:          document.getElementById('pNotas').value.trim(),
    };
    try {
      if (existing) { await prospectos.update({ ...existing, ...data }); toast('Prospecto actualizado', 'success'); }
      else          { await prospectos.add(data); toast('Prospecto creado', 'success'); }
      closeModal();
      window._app?.refreshView?.();
    } catch (err) {
      console.error('Error al guardar prospecto:', err);
      toast(err?.message || 'No se pudo guardar el prospecto', 'error');
    }
  };
}

export async function openProspectoDetail(id) {
  const p = await prospectos.get(id);
  if (!p) return;
  const [diags, todasC, todasProp, clienteExistente] = await Promise.all([
    diagnosticos.byProspecto(id), citas.byProspecto(id),
    propuestas.byProspecto(id), clientes.getByLead(id),
  ]);
  // Autodiagnóstico del cliente (referencia): falla suave si la tabla no existe aún
  let autos = [];
  try { autos = await autodiags.byProspecto(id); }
  catch (err) { console.debug('autodiagnosticos no disponibles para este lead (tabla opcional):', err?.message || err); }

  _openModal(`Ficha: ${p.nombre}`, 'lg');
  document.getElementById('modalSave').style.display = 'none';
  document.getElementById('modalCancel').textContent = 'Cerrar';

  const st = PIPELINE_STAGES.find(s=>s.id===p.estado) || PIPELINE_STAGES[0];
  const tieneClienteFicha = clienteExistente && clienteExistente.length > 0;

  const body = document.getElementById('modalBody');
  body.innerHTML = `
    <div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:18px;flex-wrap:wrap">
      <div style="width:56px;height:56px;border-radius:50%;background:${st.color};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px;flex-shrink:0">${(p.nombre||'?')[0].toUpperCase()}</div>
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <div style="font-size:20px;font-weight:800;color:var(--navy)">${escHtml(p.nombre)}</div>
          ${p.correlativo ? `<span style="font-size:11px;font-weight:700;color:var(--text3);background:var(--surface2);padding:2px 8px;border-radius:980px;letter-spacing:.04em">${escHtml(p.correlativo)}</span>` : ''}
        </div>
        <div style="font-size:14px;color:var(--text3)">${escHtml(p.empresa||'')}${p.rubro?' · '+p.rubro:''}</div>
        <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
          <span class="badge" style="color:${st.color};background:${st.bg};border-color:${st.color}">${st.icon} ${st.id}</span>
          ${p.dolorPrincipal?`<span class="chip-dolor">${escHtml(p.dolorPrincipal)}</span>`:''}
        </div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="closeModal();window._app.openProspectoModal('${p.id}')">Editar</button>
    </div>
    <hr class="divider">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;font-size:13.5px">
      ${p.email    ?`<div><span style="color:var(--text3)">Email</span><br><strong>${escHtml(p.email)}</strong></div>`:''}
      ${p.telefono ?`<div><span style="color:var(--text3)">Teléfono</span><br><strong>${escHtml(p.telefono)}</strong></div>`:''}
      ${p.tamano   ?`<div><span style="color:var(--text3)">Trabajadores</span><br><strong>${escHtml(p.tamano)}</strong></div>`:''}
      ${p.origen   ?`<div><span style="color:var(--text3)">Origen</span><br><strong>${escHtml(p.origen)}</strong></div>`:''}
    </div>
    ${p.notas?`<div style="background:var(--surface2);border-radius:8px;padding:12px;font-size:13.5px;color:var(--text2);margin-bottom:16px"><em>${escHtml(p.notas)}</em></div>`:''}

    <div style="display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap">
      <button class="btn btn-primary btn-sm" onclick="window._app.openDiagnosticoModal('${p.id}')">+ Diagnóstico</button>
      <button class="btn btn-ghost btn-sm" onclick="window._app.openCitaModalForProspecto('${p.id}')">+ Cita</button>
      <button class="btn btn-ghost btn-sm" onclick="window._app.openPropuestaModalForProspecto('${p.id}')">+ Propuesta</button>
      <button class="btn btn-ghost btn-sm" onclick="window._app.openFacturaModal('${p.id}')">+ Factura</button>
      <button class="btn btn-ghost btn-sm" data-share="${escHtml(p.empresa||p.nombre)}" onclick="window._app.compartirDiag('${p.id}', this.dataset.share)" title="Copiar enlace del formulario 360 para el cliente">🔗 Compartir 360</button>
      ${p.estado === 'Cliente'
        ? tieneClienteFicha
          ? `<span style="font-size:12px;color:var(--green);align-self:center">✓ Ficha de cliente creada</span>`
          : `<button class="btn btn-ghost btn-sm" onclick="window._app.convertirACliente('${p.id}')">👤 Crear ficha de cliente</button>`
        : ''}
    </div>

    ${autos.length ? (() => {
      const a = autos[0]; // el más reciente
      const sc = {
        tec:     Math.round(((a.scoresTec     ||[]).filter(x=>x===true).length/5)*100),
        ventas:  Math.round(((a.scoresVentas  ||[]).filter(x=>x===true).length/5)*100),
        finanzas:Math.round(((a.scoresFinanzas||[]).filter(x=>x===true).length/5)*100),
      };
      return `<div style="background:var(--amber-l);border:1px solid var(--amber);border-radius:10px;padding:12px;margin-bottom:16px;font-size:13px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <span style="font-weight:700;color:var(--amber)">📋 Autodiagnóstico del cliente <span style="font-weight:500;font-size:11.5px">(referencia, no oficial)</span></span>
          <span style="font-size:11.5px;color:var(--text3)">${new Date(a.fecha).toLocaleDateString('es-CL')}</span>
        </div>
        <div style="display:flex;gap:14px">
          ${DIAG_AREAS.map(ar => `<div style="flex:1;text-align:center"><div style="font-size:11px;color:var(--text3)">${ar.label}</div><div style="font-size:17px;font-weight:800;color:${ar.color}">${sc[ar.id]}%</div></div>`).join('')}
        </div>
        <div style="font-size:11.5px;color:var(--text3);margin-top:8px">El diagnóstico oficial se realiza desde el CRM (botón "+ Diagnóstico") y genera el Informe Ejecutivo 360.</div>
      </div>`;
    })() : ''}

    <h4 style="font-size:14px;font-weight:700;color:var(--navy);margin-bottom:10px">Diagnósticos (${diags.length})</h4>
    ${diags.length===0?`<p style="font-size:13px;color:var(--text3)">Sin diagnósticos aún.</p>`:
      diags.map(d=>{
        const scores = {
          tec:     Math.round(((d.scoresTec     ||[]).filter(x=>x===true).length/5)*100),
          ventas:  Math.round(((d.scoresVentas  ||[]).filter(x=>x===true).length/5)*100),
          finanzas:Math.round(((d.scoresFinanzas||[]).filter(x=>x===true).length/5)*100),
        };
        return `<div style="background:var(--surface2);border-radius:10px;padding:12px;margin-bottom:8px;font-size:13px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <div style="font-weight:600;color:var(--navy)">${new Date(d.fecha).toLocaleDateString('es-CL')}${d.correlativo?` · <span style="font-size:11px;color:var(--text3);font-weight:700">${escHtml(d.correlativo)}</span>`:''}</div>
            <button class="btn btn-navy btn-sm" onclick="window._app.openInformeEjecutivo('${d.id}')">${window.icon?window.icon('fileText'):''} Informe 360</button>
          </div>
          <div style="display:flex;gap:14px">
            ${[{l:'Tec',ic:'cpu',v:scores.tec,c:'#5160C0'},{l:'Ventas',ic:'trending',v:scores.ventas,c:'#0C7C88'},{l:'Fin',ic:'coins',v:scores.finanzas,c:'#2E9B73'}].map(a=>
              `<div style="flex:1;text-align:center"><div style="font-size:11px;color:var(--text3);display:inline-flex;align-items:center;gap:5px">${window.icon?window.icon(a.ic,'',13):''} ${a.l}</div><div style="font-size:18px;font-weight:800;color:${a.c}">${a.v}%</div></div>`).join('')}
          </div>
        </div>`;
      }).join('')}

    <h4 style="font-size:14px;font-weight:700;color:var(--navy);margin:14px 0 10px">Citas (${todasC.length})</h4>
    ${todasC.length===0?`<p style="font-size:13px;color:var(--text3)">Sin citas.</p>`:
      todasC.map(c=>`<div style="font-size:13px;padding:8px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between">
        <span>${c.tipo || 'Cita'} — ${c.fecha?.slice(0,10)||'—'} ${c.hora||''}</span>
        <span style="color:var(--text3)">${c.estado}</span>
      </div>`).join('')}

    <h4 style="font-size:14px;font-weight:700;color:var(--navy);margin:14px 0 10px">Propuestas (${todasProp.length})</h4>
    ${todasProp.length===0?`<p style="font-size:13px;color:var(--text3)">Sin propuestas.</p>`:
      todasProp.map(prop => {
        const items = Array.isArray(prop.servicios)
          ? (typeof prop.servicios[0] === 'string' ? prop.servicios : prop.servicios.map(it => it.descripcion || '—'))
          : [];
        const desc = items.slice(0, 2).join(', ') || '—';
        return `<div style="font-size:13px;padding:10px 0;border-bottom:1px solid var(--border)">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
            <div>
              ${prop.correlativo ? `<div style="font-size:11px;font-weight:700;color:var(--text3);margin-bottom:3px">${escHtml(prop.correlativo)}</div>` : ''}
              <span style="color:var(--text2)">${escHtml(desc)}${items.length > 2 ? ` +${items.length-2} más` : ''}</span>
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div style="font-weight:700;color:var(--navy)">${prop.valor ? formatCLP(prop.valor) : '—'}</div>
              <div style="font-size:12px;color:var(--text3)">${escHtml(propEstadoLabel(prop.estado))}</div>
            </div>
          </div>
          ${prop.estado === 'aceptada'
            ? `<button class="btn btn-ghost btn-sm" style="margin-top:6px;font-size:12px" onclick="window._app.openFacturaModal('${p.id}')">🧾 Crear factura</button>`
            : ''}
        </div>`;
      }).join('')}
  `;

  window.closeModal = closeModal;
}

export async function openDiagnosticoModal(prospectoId) {
  const p = await prospectos.get(prospectoId);
  _openModal(`Diagnóstico 360 — ${p?.nombre || 'Prospecto'}`, 'lg');
  renderDiagnosticoModal(prospectoId, async (newDiagId) => {
    closeModal();
    if (p && (p.estado === 'Nuevo' || p.estado === 'Contactado' || p.estado === 'Diagnóstico Agendado')) {
      await prospectos.update({ ...p, estado: 'Diagnóstico Realizado' });
    }
    toast('Diagnóstico guardado · generando informe…', 'success');
    await window._app?.refreshView?.();
    if (newDiagId) setTimeout(() => window._app?.openInformeEjecutivo?.(newDiagId), 400);
  });
}

// Las citas ahora son reuniones del calendario (modules/agenda/agenda.js).
export async function openCitaModal(id = null) {
  await openMeetingModal(id ? { edit: id } : {});
}

export async function openCitaModalForProspecto(prospectoId) {
  await openMeetingModal({ prospectoId });
}

export async function openPropuestaModal(id = null) {
  const existing = id ? await propuestas.get(id) : null;
  const allP = await prospectos.getAll();
  _openModal(existing ? 'Editar propuesta' : 'Nueva propuesta', 'lg');
  renderPropuestaModal(allP, () => { closeModal(); toast(existing?'Propuesta actualizada':'Propuesta creada','success'); window._app?.refreshView?.(); }, existing);
}

export async function openPropuestaModalForProspecto(prospectoId) {
  const allP = await prospectos.getAll();
  const p = allP.find(x=>x.id===prospectoId);
  _openModal(`Nueva propuesta — ${p?.nombre||''}`, 'lg');
  renderPropuestaModal(allP, () => { closeModal(); toast('Propuesta creada','success'); window._app?.refreshView?.(); }, { prospectoId });
}

export async function openFacturaModal(leadId = null) {
  const todosCli = await clientes.getAll();
  // Si se abre desde la ficha de un prospecto, preselecciona su cliente (si existe)
  let preselClienteId = null;
  if (leadId) {
    const delLead = await clientes.getByLead(leadId);
    if (delLead && delLead.length) preselClienteId = delLead[0].id;
  }
  _openModal('Nueva factura');
  renderFacturaModal(todosCli, () => {
    closeModal();
    toast('Factura creada', 'success');
    window._app?.refreshView?.();
  }, null, preselClienteId);
}

// Crear factura preseleccionando directamente un cliente (desde el módulo Clientes)
export async function openFacturaModalForCliente(clienteId) {
  const todosCli = await clientes.getAll();
  _openModal('Nueva factura');
  renderFacturaModal(todosCli, () => {
    closeModal();
    toast('Factura creada', 'success');
    window._app?.refreshView?.();
  }, null, clienteId);
}

// Añadir cliente tomando cualquier prospecto (cualquier etapa) o ficha manual
export async function openAddClienteModal(preselLeadId = null) {
  const allP = await prospectos.getAll();
  _openModal('Añadir cliente');
  renderAddClienteModal(allP, () => {
    closeModal();
    toast('Cliente creado', 'success');
    window._app?.refreshView?.();
  }, preselLeadId);
}

export async function openPresupuestoModal(id = null) {
  const [existing, cli, props, pros] = await Promise.all([
    id ? presupuestos.get(id) : Promise.resolve(null),
    clientes.getAll(), propuestas.getAll(), prospectos.getAll(),
  ]);
  if (!cli.length) {
    toast('Primero crea un cliente (módulo Clientes) para presupuestar', 'info');
    window._app?.navigate?.('clientes');
    return;
  }
  _openModal(existing ? 'Editar presupuesto' : 'Nuevo presupuesto', 'lg');
  renderPresupuestoModal(cli, props, pros, () => {
    closeModal();
    toast(existing ? 'Presupuesto actualizado' : 'Presupuesto creado', 'success');
    window._app?.refreshView?.();
  }, existing);
}

export async function deletePresupuesto(id) {
  if (!confirm('¿Eliminar este presupuesto?')) return;
  try {
    await presupuestos.delete(id);
    toast('Presupuesto eliminado', 'info');
    window._app?.refreshView?.();
  } catch (err) {
    console.error('Error al eliminar presupuesto:', err);
    toast(err?.message || 'No se pudo eliminar el presupuesto', 'error');
  }
}

export async function deleteCliente(id) {
  const facts = await facturas.byCliente(id);
  if (facts.length) {
    toast(`No se puede eliminar: el cliente tiene ${facts.length} factura(s). Elimínalas primero.`, 'error');
    return;
  }
  if (!confirm('¿Eliminar esta ficha de cliente?')) return;
  try {
    await clientes.delete(id);
    toast('Cliente eliminado', 'info');
    window._app?.refreshView?.();
  } catch (err) {
    console.error('Error al eliminar cliente:', err);
    toast(err?.message || 'No se pudo eliminar el cliente', 'error');
  }
}

export async function editFactura(id) {
  const [existing, todosCli] = await Promise.all([facturas.get(id), clientes.getAll()]);
  _openModal('Editar factura');
  renderFacturaModal(todosCli, () => {
    closeModal();
    toast('Factura actualizada', 'success');
    window._app?.refreshView?.();
  }, existing);
}

export async function convertirACliente(leadId) {
  const p = await prospectos.get(leadId);
  if (!p) { toast('Prospecto no encontrado', 'error'); return; }
  const existing = await clientes.getByLead(leadId);
  if (existing && existing.length > 0) {
    toast('Este prospecto ya tiene ficha de cliente', 'info');
    return;
  }
  try {
    // La tabla clientes guarda razon_social/rut/giro (email/telefono viven en el lead)
    await clientes.add({
      leadId,
      razonSocial: p.empresa || p.nombre,
      rut:         p.rut,
      giro:        p.rubro,
    });
    toast(`Cliente "${p.empresa || p.nombre}" creado exitosamente`, 'success');
    window._app?.refreshView?.();
  } catch (err) {
    console.error('Error al crear cliente:', err);
    toast(err?.message || 'No se pudo crear la ficha de cliente', 'error');
  }
}

export async function deleteProspecto(id) {
  if (!confirm('¿Eliminar este prospecto? Se eliminarán también sus diagnósticos, citas, propuestas, ficha de cliente y facturas. Esta acción no se puede deshacer.')) return;
  try {
    // Sin ON DELETE CASCADE en la DB: borrar hijos antes que el lead (si no, 23503)
    const [diags, cits, props, clis] = await Promise.all([
      diagnosticos.byProspecto(id), citas.byProspecto(id),
      propuestas.byProspecto(id), clientes.getByLead(id),
    ]);
    for (const c of clis) {
      const facts = await facturas.byCliente(c.id);
      for (const f of facts) await facturas.delete(f.id);
    }
    for (const x of props) await propuestas.delete(x.id);
    for (const x of diags) await diagnosticos.delete(x.id);
    for (const x of cits)  await citas.delete(x.id);
    for (const x of clis)  await clientes.delete(x.id);
    try { for (const a of await autodiags.byProspecto(id)) await autodiags.delete(a.id); } catch (_) {}
    await prospectos.delete(id);
    toast('Prospecto eliminado', 'info');
    window._app?.refreshView?.();
  } catch (err) {
    console.error('Error al eliminar prospecto:', err);
    toast(err?.message || 'No se pudo eliminar el prospecto', 'error');
  }
}

export async function deleteCita(id) {
  if (!confirm('¿Eliminar esta cita?')) return;
  await citas.delete(id);
  toast('Cita eliminada', 'info');
  window._app?.refreshView?.();
}

export async function deletePropuesta(id) {
  if (!confirm('¿Eliminar esta propuesta?')) return;
  await propuestas.delete(id);
  toast('Propuesta eliminada', 'info');
  window._app?.refreshView?.();
}

export async function deleteFactura(id) {
  if (!confirm('¿Eliminar esta factura?')) return;
  await facturas.delete(id);
  toast('Factura eliminada', 'info');
  window._app?.refreshView?.();
}
