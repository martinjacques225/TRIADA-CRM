// js/features.js — interruptores de funcionalidad (feature flags)
//
// erp: enciende la sección "Operación" (el ERP). En F0 se muestra SOLO a admin
//      (el gate vive en renderNav de app.js); se abrirá al equipo por erp_role en F5.
//      Para apagarla por completo (a todos, incluido admin), poné erp:false.
export const FEATURES = {
  erp: true,
};
