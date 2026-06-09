// services/appointment.service.js
// Contrato público de acceso a Citas/Agenda. Backend actual: IndexedDB. Futuro: Supabase.
// Contrato: add, get, getAll, getByDate, update, delete, checkConflict, search
import { appointments } from '../js/db.js';

export { appointments };
export const AppointmentService = appointments;
export default appointments;
