// services/sales.service.js
// Contrato público de acceso a Ventas. Backend actual: IndexedDB. Futuro: Supabase.
// Contrato: add, get, getAll, update, delete, getByMonth
import { sales } from '../js/db.js';

export { sales };
export const SalesService = sales;
export default sales;
