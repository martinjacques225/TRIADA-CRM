// modules/modals/modal-lead.js — Modal de Lead (nuevo/editar) y eliminación de lead
import { leads } from '../../services/lead.service.js';
import { LEAD_ESTADOS, NIVELES_INGLES, PRIORIDADES, ORIGENES } from '../../js/estados.js';
import { S } from '../../js/state.js';
import { escHtml, toast } from '../../js/utils.js';
import { openModal, closeModal } from './modal-core.js';

// ── Lead ──
export async function openLeadModal(id = null) {
  let lead = null; if (id) lead = await leads.get(id);
  const isEdit = !!lead;
  document.getElementById('modalTitle').textContent = isEdit ? 'Editar lead' : 'Nuevo lead';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-row">
      <div class="form-field"><label class="form-label">Nombre <span class="req">*</span></label><input class="form-input" id="lNombre" value="${escHtml(lead?.nombre||'')}"><span class="form-error" id="eLN"></span></div>
      <div class="form-field"><label class="form-label">Apellido</label><input class="form-input" id="lApellido" value="${escHtml(lead?.apellido||'')}"></div>
    </div>
    <div class="form-row">
      <div class="form-field"><label class="form-label">Teléfono</label><input class="form-input" id="lTel" value="${escHtml(lead?.telefono||'')}" placeholder="+56 9 ..."></div>
      <div class="form-field"><label class="form-label">Email</label><input class="form-input" id="lEmail" type="email" value="${escHtml(lead?.email||'')}"></div>
    </div>
    <div class="form-row">
      <div class="form-field"><label class="form-label">Área laboral</label><input class="form-input" id="lArea" value="${escHtml(lead?.areaLaboral||'')}" placeholder="Ej: Ingeniería, Salud..."></div>
      <div class="form-field"><label class="form-label">Nivel de inglés</label>
        <select class="form-select" id="lNivelIngles"><option value="">Sin evaluar</option>${NIVELES_INGLES.map(v=>`<option${lead?.nivelIngles===v?' selected':''}>${v}</option>`).join('')}</select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-field"><label class="form-label">Interés</label><input class="form-input" id="lInteres" value="${escHtml(lead?.interes||'')}"></div>
      <div class="form-field"><label class="form-label">Origen del dato</label>
        <select class="form-select" id="lOrigen"><option value="">Sin especificar</option>${ORIGENES.map(v=>`<option${lead?.origen===v?' selected':''}>${v}</option>`).join('')}</select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-field"><label class="form-label">Estado</label>
        <select class="form-select" id="lEstado">${LEAD_ESTADOS.map(e=>`<option${lead?.estado===e?' selected':''}>${e}</option>`).join('')}</select>
      </div>
      <div class="form-field"><label class="form-label">Prioridad</label>
        <select class="form-select" id="lPrioridad"><option value="">Sin prioridad</option>${PRIORIDADES.map(v=>`<option${lead?.prioridad===v?' selected':''}>${v}</option>`).join('')}</select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-field"><label class="form-label">Empresa</label><input class="form-input" id="lEmpresa" value="${escHtml(lead?.empresa||'')}"></div>
      <div class="form-field"><label class="form-label">Cargo</label><input class="form-input" id="lCargo" value="${escHtml(lead?.cargo||'')}"></div>
    </div>
    <div class="form-row full"><div class="form-field"><label class="form-label">Observaciones</label><textarea class="form-textarea" id="lObs">${escHtml(lead?.observaciones||'')}</textarea></div></div>`;
  openModal();
  document.getElementById('modalSave').onclick = async () => {
    const nombre = document.getElementById('lNombre').value.trim();
    if (!nombre) { document.getElementById('eLN').textContent = 'Requerido'; return; }
    const nuevoEstado = document.getElementById('lEstado').value;
    const data = { nombre,
      apellido:     document.getElementById('lApellido').value.trim(),
      telefono:     document.getElementById('lTel').value.trim(),
      email:        document.getElementById('lEmail').value.trim(),
      areaLaboral:  document.getElementById('lArea').value.trim(),
      nivelIngles:  document.getElementById('lNivelIngles').value,
      empresa:      document.getElementById('lEmpresa').value.trim(),
      cargo:        document.getElementById('lCargo').value.trim(),
      interes:      document.getElementById('lInteres').value.trim(),
      origen:       document.getElementById('lOrigen').value,
      estado:       nuevoEstado,
      prioridad:    document.getElementById('lPrioridad').value,
      observaciones:document.getElementById('lObs').value.trim()
    };
    if (isEdit) {
      data.id = id;
      if (nuevoEstado !== 'Cita agendada' && nuevoEstado !== 'Confirmado') data.agendado = false;
      await leads.update(data); toast('Lead actualizado','success');
    } else {
      await leads.add(data); toast('Lead creado','success');
      window._app?.showMascotMessage?.(null, 'lead_cargado');
    }
    closeModal(); if (S.view === 'leads') window._app?.refreshView?.();
  };
  document.getElementById('modalCancel').onclick = closeModal;
}

// ── Eliminar lead ──
export async function deleteLead(id) {
  if (!confirm('¿Eliminar este lead?')) return;
  await leads.delete(id); toast('Lead eliminado');
  if (S.view === 'leads') window._app?.refreshView?.();
}
