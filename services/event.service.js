// services/event.service.js
// Contrato público del log de actividad reciente. Backend actual: IndexedDB. Futuro: Supabase.
// Contrato: getAll, getRecent
import { events } from '../js/db.js';

export { events };
export const EventService = events;
export default events;
