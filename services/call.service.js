// services/call.service.js
// Contrato público de acceso a Llamadas. Backend actual: IndexedDB. Futuro: Supabase.
// Contrato: add, get, getAll, update, getByLead, getByAppt, getByDateRange
import { calls } from '../js/db.js';

export { calls };
export const CallService = calls;
export default calls;
