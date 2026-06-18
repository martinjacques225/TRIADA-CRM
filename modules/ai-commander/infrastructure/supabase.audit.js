// modules/ai-commander/infrastructure/supabase.audit.js
// ── Capa de INFRAESTRUCTURA · adaptador de Auditoría ─────────────────────────
// Implementa AuditPort sobre la tabla `actividad` (ya existente en el CRM).
// Registra eventos SEMÁNTICOS (verbos en notación punto: proyecto.crear,
// tarea.mover, ia.ejecutar) que alimentan el feed del dashboard. Es complemento
// del trigger de BD `aic_audit_row` (que captura el INSERT/UPDATE/DELETE crudo):
// juntos dan auditoría completa con defensa en profundidad.
import { supabase } from '../../../js/supabase.js';
import { getCurrentUserId } from '../../../js/db.js';
import { AuditPort } from '../domain/ports.js';

export class SupabaseAudit extends AuditPort {
  async record({ entidad, accion, entidadId = null, payload = {} }) {
    try {
      await supabase.from('actividad').insert({
        entidad, entidad_id: entidadId, accion,
        usuario: getCurrentUserId(), payload,
      });
    } catch (err) {
      // La auditoría no debe romper el flujo de negocio si falla, pero el fallo
      // sí debe ser visible (no tragarlo en silencio): es relevante de seguridad.
      console.warn('Auditoría semántica: no se pudo registrar el evento:', err);
    }
  }

  async listRecent(limit = 12) {
    // Solo eventos semánticos del AI Commander (verbos con punto), no el ruido
    // crudo de los triggers (insert/update/delete).
    const { data, error } = await supabase.from('actividad').select('*')
      .in('entidad', ['proyecto', 'tarea', 'prompt', 'ia'])
      .like('accion', '%.%')
      .order('ts', { ascending: false }).limit(limit);
    if (error) return [];
    return (data || []).map(r => ({
      id: r.id, entidad: r.entidad, entidadId: r.entidad_id, accion: r.accion,
      usuario: r.usuario, payload: r.payload || {}, ts: r.ts,
    }));
  }
}
