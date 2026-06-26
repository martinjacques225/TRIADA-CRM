/* ============================================================
   BARBERÍA TRIADA · supabase.js
   Cliente Supabase (script clásico, usa el build UMD global) + API
   mínima del negocio. Si no hay conexión (offline, CDN bloqueada o
   sin config), BT_DB.ready = false y la demo sigue funcionando con
   sus datos locales (degradación elegante).
   ============================================================ */
(function () {
  'use strict';
  var cfg = window.BT_CONFIG || {};
  var sb = null;
  try {
    // El build UMD expone window.supabase = { createClient, ... }
    if (window.supabase && window.supabase.createClient && cfg.supabaseUrl && cfg.supabaseAnonKey) {
      sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true }
      });
    }
  } catch (e) {
    console.warn('[BT] Supabase no se pudo inicializar:', e);
  }

  window.BT_SB = sb;
  window.BT_DB = {
    ready: !!sb,

    // ── Reservas (Perfil C: insert anónimo) ──────────────────
    // Sin .select() a propósito: el rol anónimo NO puede leer citas
    // (return=minimal ⇒ 201 sin pedir SELECT).
    crearCita: function (cita) {
      if (!sb) return Promise.resolve({ error: { message: 'sin-conexion' } });
      return sb.from('citas').insert(cita);
    },

    // ── Inscripción al curso (Perfil C: insert anónimo) ──────
    crearInscripcion: function (insc) {
      if (!sb) return Promise.resolve({ error: { message: 'sin-conexion' } });
      return sb.from('inscripciones').insert(insc);
    },

    // ── Catálogo público (Perfil B: lectura sin login) ───────
    listarServicios: function () {
      if (!sb) return Promise.resolve({ data: null, error: { message: 'sin-conexion' } });
      return sb.from('servicios').select('*').eq('publicado', true).order('orden');
    },

    // ── Auth (login del CRM — Matías) ────────────────────────
    getSession: function () {
      if (!sb) return Promise.resolve({ data: { session: null } });
      return sb.auth.getSession();
    },
    signIn: function (email, password) {
      if (!sb) return Promise.resolve({ error: { message: 'sin-conexion' } });
      return sb.auth.signInWithPassword({ email: email, password: password });
    },
    signOut: function () {
      if (!sb) return Promise.resolve({});
      return sb.auth.signOut();
    },
    onAuth: function (cb) {
      if (sb) sb.auth.onAuthStateChange(cb);
    }
  };

  if (!sb) console.info('[BT] Modo demo local (sin Supabase): los datos no se guardan en la nube.');
})();
