// services/template.service.js
// Contrato público de acceso a Plantillas WhatsApp. Backend actual: IndexedDB. Futuro: Supabase.
// Contrato: getAll, add, update
import { templates } from '../js/db.js';

export { templates };
export const TemplateService = templates;
export default templates;
