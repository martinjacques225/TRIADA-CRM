// services/config.service.js
// Contrato público de configuración/preferencias (key-value). Backend actual: IndexedDB. Futuro: Supabase.
// Contrato: get(key), set(key, value)
import { config } from '../js/db.js';

export { config };
export const ConfigService = config;
export default config;
