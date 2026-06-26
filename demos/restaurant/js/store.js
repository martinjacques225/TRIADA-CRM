/* ============================================================================
   store.js · Store reactivo mínimo (estado + suscripción + render coalescido)
   Patrón: las acciones de dominio llaman store.set(patch); los suscriptores
   (el router/render) se notifican una vez por "tick" vía microtask — coalesce
   múltiples set() del mismo handler en un solo render y, a diferencia de rAF,
   dispara de forma fiable aunque la pestaña no esté pintando.
   ========================================================================== */

export function createStore(initial) {
  let state = initial;
  const subs = new Set();
  let queued = false;

  function notify() {
    queued = false;
    for (const fn of subs) fn(state);
  }

  return {
    get state() { return state; },

    /** Mezcla un parche superficial en el estado y agenda render (microtask). */
    set(patch) {
      state = Object.assign({}, state, typeof patch === 'function' ? patch(state) : patch);
      if (!queued) { queued = true; queueMicrotask(notify); }
      return state;
    },

    /** Suscribe una función de render. Devuelve función para desuscribir. */
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },

    /** Fuerza un render inmediato. */
    flush() { queued = false; notify(); },
  };
}
