// js/estados.js — Estados del ciclo de lead y cargos comerciales (catálogo de negocio)
// NOTA: en la futura migración multiusuario pasan a tablas `lead_estados` y `roles`.

export const LEAD_ESTADOS = [
  'Nuevo', 'Intento de contacto', 'Contactado', 'Cita agendada',
  'Confirmado', 'Asistió', 'No asistió', 'Seguimiento',
  'Propuesta enviada', 'Venta cerrada', 'Perdido'
];

export const CARGOS = [
  'Asesor Training', 'Full Executive', 'Jefe de Grupo',
  'Gerente', 'Sales Manager', 'Director', 'CEO'
];

// Fase 2 — catálogos comerciales del lead/cita
export const NIVELES_INGLES = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
export const PRIORIDADES = ['Alta', 'Media', 'Baja'];
export const ORIGENES = ['Facebook', 'Instagram', 'LinkedIn', 'Referido', 'Web', 'Cold Call', 'Otro'];
