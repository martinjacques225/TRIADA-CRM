// js/constants.js — BARREL de compatibilidad.
// La definición real se separó en archivos especializados (Fase Servicios):
//   - js/planes.js    → PLANES, CONVENIOS
//   - js/estados.js   → LEAD_ESTADOS, CARGOS
//   - js/mascotas.js  → MASCOTAS, getMascotMsg
// Se mantiene este barrel para compatibilidad. El código nuevo debe importar
// directamente del archivo especializado.
export { PLANES, CONVENIOS } from './planes.js';
export { LEAD_ESTADOS, CARGOS } from './estados.js';
export { MASCOTAS, getMascotMsg } from './mascotas.js';
