// services/persistence.service.js
// Punto único de arranque de la persistencia.
// HOY: IndexedDB (js/db.js).  FUTURO: Supabase u otro backend.
// Los módulos NO deben importar js/db.js directamente; usan los servicios.
import { initDB } from '../js/db.js';

/**
 * Inicializa la capa de persistencia. Debe llamarse una vez al arrancar la app.
 * @returns {Promise<IDBDatabase>}
 */
export { initDB };
export default initDB;
