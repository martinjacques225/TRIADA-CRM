// modules/oportunidades/domain/permisos.js — CAPACIDADES DEL USUARIO (lógica pura).
//
// No se inventa un sistema de permisos nuevo: se DERIVA del perfil que el CRM ya
// tiene (`role` admin/consultor/lector + `area` ventas/tecnologia/finanzas +
// `erp_role` gerencia/finanzas/operaciones). Los cinco perfiles que pide el
// encargo salen de combinarlos:
//
//   Administrador → role 'admin'
//   Comercial     → area 'Ventas'     o erp_role 'gerencia'
//   Técnico       → area 'Tecnología' o erp_role 'operaciones'
//   Finanzas      → area 'Finanzas'   o erp_role 'finanzas'
//   Solo lectura  → role 'lector' (o sin ninguna de las anteriores)
//
// ⚠️ Esto es la UI. La barrera REAL es la RLS: public.op_puede_aprobar(area) y
// public.op_es_lector() en supabase/oportunidades_f1.sql. Si alguien evita esta
// función desde la consola, la base lo rechaza igual.

const AREA_COMERCIAL = new Set(['Ventas', 'ventas']);
const AREA_TECNICA   = new Set(['Tecnología', 'tecnologia']);
const AREA_FINANZAS  = new Set(['Finanzas', 'finanzas']);

export function capacidades(profile) {
  const p = profile || {};
  const admin  = p.role === 'admin';
  const lector = p.role === 'lector';

  const comercial  = admin || AREA_COMERCIAL.has(p.area) || p.erp_role === 'gerencia' || p.erpRole === 'gerencia';
  const tecnico    = admin || AREA_TECNICA.has(p.area)   || p.erp_role === 'operaciones' || p.erpRole === 'operaciones';
  const financiera = admin || AREA_FINANZAS.has(p.area)  || ['finanzas', 'gerencia'].includes(p.erp_role || p.erpRole);

  return {
    esAdmin: admin,
    esLector: lector,
    editar:      !lector,
    configurar:  admin,
    verFinanzas: !lector,       // la calculadora es el corazón del módulo: la ven los tres socios
    eliminar:    admin,
    aprobar: {
      comercial:  !lector && comercial,
      tecnica:    !lector && tecnico,
      financiera: !lector && financiera,
    },
    /** Etiqueta legible del perfil, para mostrarla en la cabecera del módulo. */
    perfil: lector ? 'Solo lectura'
      : admin ? 'Administrador'
      : comercial ? 'Comercial'
      : tecnico ? 'Técnico'
      : financiera ? 'Finanzas'
      : 'Solo lectura',
  };
}

/** ¿Puede firmar esta área? Atajo para la vista de aprobaciones. */
export function puedeAprobarArea(profile, area) {
  const c = capacidades(profile);
  return !!c.aprobar[area];
}
