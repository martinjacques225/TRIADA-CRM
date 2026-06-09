// modules/modals/modals.js — BARREL de modales.
// Los modales se separaron por responsabilidad (Fase Servicios):
//   - modal-core.js   → openModal, closeModal, _alert
//   - modal-cita.js   → openFormModal, openFormModalFromLead, openReagendarModal
//   - modal-lead.js   → openLeadModal, deleteLead
//   - modal-venta.js  → openSaleModal, deleteSale
//   - modal-wa.js     → openWAModal
// Se mantiene este barrel para no romper imports existentes (app.js).
export { openModal, closeModal } from './modal-core.js';
export { openFormModal, openFormModalFromLead, openReagendarModal, deleteAppointment, appointmentToLead } from './modal-cita.js';
export { openLeadModal, deleteLead } from './modal-lead.js';
export { openLeadDetail, closeLeadDetail } from './modal-lead-detail.js';
export { openSaleModal, deleteSale } from './modal-venta.js';
export { openWAModal } from './modal-wa.js';
