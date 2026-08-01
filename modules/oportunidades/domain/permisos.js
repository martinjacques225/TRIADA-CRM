// modules/oportunidades/domain/permisos.js — CAPACIDADES DEL USUARIO (lógica pura).
//
// No se inventa un sistema de permisos nuevo: se DERIVA del perfil que el CRM ya
// tiene (`role` + `area`). Los valores de área salen del enum REAL `area_t` de
// Supabase (comercial, finanzas, desarrollo, rrhh, operaciones, tecnologia,
// ventas, diseno) — no de una suposición: al aplicar la migración se vio que
// NADIE tiene área 'ventas' y que los comerciales están como 'comercial'.
//
//   Administrador → role 'admin'
//   Comercial     → area 'comercial' o 'ventas'
//   Técnico       → area 'tecnologia' o 'desarrollo', o erp_role 'operaciones'
//   Finanzas      → area 'finanzas', o erp_role 'finanzas'
//   Solo lectura  → role 'lector' (valor que el enum todavía no tiene), o
//                   cualquiera que no calce con ninguna de las anteriores
//
// `erp_role = 'gerencia'` NO abre las tres firmas a propósito: hoy 4 de los 5
// perfiles la tienen, y como comodín dejaría que una sola persona firmara dos
// de las tres áreas — la regla de "los tres socios" quedaría en nada.
//
// ⚠️ Esto es la UI. La barrera REAL es la RLS: public.op_puede_aprobar(area) y
// public.op_es_lector() en supabase/oportunidades_f1.sql. Si alguien evita esta
// función desde la consola, la base lo rechaza igual. Las dos deben decir lo
// mismo: si se cambia una, se cambia la otra.

const AREA_COMERCIAL = new Set(['Comercial', 'comercial', 'Ventas', 'ventas']);
const AREA_TECNICA   = new Set(['Tecnología', 'tecnologia', 'Desarrollo', 'desarrollo']);
const AREA_FINANZAS  = new Set(['Finanzas', 'finanzas']);

export function capacidades(profile) {
  const p = profile || {};
  const admin  = p.role === 'admin';
  const lector = p.role === 'lector';
  const erp    = p.erp_role || p.erpRole || null;

  const comercial  = admin || AREA_COMERCIAL.has(p.area);
  const tecnico    = admin || AREA_TECNICA.has(p.area)  || erp === 'operaciones';
  const financiera = admin || AREA_FINANZAS.has(p.area) || erp === 'finanzas';

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
