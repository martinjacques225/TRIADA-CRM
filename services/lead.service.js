// services/lead.service.js
// Contrato público de acceso a Leads. Backend actual: IndexedDB. Futuro: Supabase.
// Contrato: add, get, getAll, update, delete, addHistorial, search
import { leads } from '../js/db.js';

export { leads };
export const LeadService = leads;
export default leads;
