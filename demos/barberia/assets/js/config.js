/* ============================================================
   BARBERÍA TRIADA · config.js  —  copia para la VITRINA de demos
   ------------------------------------------------------------
   Esta copia corre en MODO DEMO LOCAL (sin Supabase) a propósito:
   así la plataforma completa (sitio web · reservas · cursos · CRM)
   queda NAVEGABLE SIN LOGIN para mostrarla en una reunión. El portón
   de acceso de la app solo aparece cuando hay backend conectado
   (ver app.js: `v.locked = BT_DB.ready && !authed`). Con las llaves
   vacías, BT_DB.ready = false → no hay portón → todo explorable.
   Las reservas/inscripciones funcionan en local (no se guardan en la
   nube), que es justo lo que queremos para la demo.

   El backend real (con su anon key pública) vive en el repo canónico
   BARBER-TEMPLATE; acá NO se vendoriza ninguna credencial.
   ============================================================ */
window.BT_CONFIG = {
  supabaseUrl:     '',
  supabaseAnonKey: ''
};
