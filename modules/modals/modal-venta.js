// modules/modals/modal-venta.js — Modal de Venta y eliminación de venta
import { sales } from '../../services/sales.service.js';
import { PLANES } from '../../js/planes.js';
import { fmtMoney, toast, vibrate, todayStr } from '../../js/utils.js';
import { openModal, closeModal } from './modal-core.js';

// ── Venta ──
export async function openSaleModal() {
  document.getElementById('modalTitle').textContent = 'Registrar venta';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-row full"><div class="form-field"><label class="form-label">Nombre del cliente <span class="req">*</span></label><input class="form-input" id="sNombre" placeholder="Nombre completo"><span class="form-error" id="eSN"></span></div></div>
    <div class="form-row">
      <div class="form-field"><label class="form-label">Plan vendido <span class="req">*</span></label>
        <select class="form-select" id="sPlan">${PLANES.map(p=>`<option value="${p.id}">${p.nombre}${p.comision!=null?' — '+fmtMoney(p.comision):' — Por confirmar'}${p.esContado?' ★':''}</option>`).join('')}</select>
      </div>
      <div class="form-field"><label class="form-label">Fecha</label><input class="form-input" id="sFecha" type="date" value="${todayStr()}"></div>
    </div>
    <div class="form-row full" id="becaRow"></div>
    <div class="form-row full"><div class="form-field"><label class="form-label">Observaciones</label><textarea class="form-textarea" id="sObs" placeholder="Notas..."></textarea></div></div>`;
  const updateBecaRow = () => {
    const p = PLANES.find(x => x.id === document.getElementById('sPlan').value);
    document.getElementById('becaRow').innerHTML = p?.beca ? `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:#FEF9C3;border:1px solid #FDE68A;border-radius:var(--radius-sm);width:100%">
        <span style="font-size:1.2rem">🎓</span>
        <div style="flex:1"><div style="font-size:.82rem;font-weight:700;color:#92400E">Incluir Beca Familiar</div><div style="font-size:.7rem;color:#A16207">Gancho de cierre gratuito</div></div>
        <button class="toggle" id="saleBecaToggle"></button>
      </div>` : '';
    document.getElementById('saleBecaToggle')?.addEventListener('click', function () { this.classList.toggle('on'); });
  };
  document.getElementById('sPlan').addEventListener('change', updateBecaRow);
  updateBecaRow(); openModal();
  document.getElementById('modalSave').onclick = async () => {
    const nombre = document.getElementById('sNombre').value.trim();
    if (!nombre) { document.getElementById('eSN').textContent = 'Requerido'; return; }
    const becaOn = document.getElementById('saleBecaToggle')?.classList.contains('on') || false;
    await sales.add({ nombre, plan: document.getElementById('sPlan').value, fecha: document.getElementById('sFecha').value, becaFamiliar: becaOn, observaciones: document.getElementById('sObs').value.trim() });
    toast('Venta registrada! 🎉','success'); vibrate([50,30,50]);
    closeModal();
    window._app?.navigate?.('mis_ventas');
    window._app?.showMascotMessage?.(null, 'venta');
  };
  document.getElementById('modalCancel').onclick = closeModal;
}

// ── Eliminar venta ──
export async function deleteSale(id) {
  if (!confirm('¿Eliminar esta venta?')) return;
  await sales.delete(id); toast('Venta eliminada');
  window._app?.navigate?.('mis_ventas');
}
