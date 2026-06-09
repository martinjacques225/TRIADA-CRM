// services/user.service.js
// Preparación futura: perfil del usuario / multiusuario.
// HOY el "usuario" es local y vive como claves en config (userName, cargo, filial, mascota, avatar...).
// FUTURO: tabla `perfiles` en Supabase (organizacion_id, filial_id, equipo_id, rol_id).
// Esta fachada aísla a la UI de ese cambio: mañana sólo se reescribe este archivo.
import { config } from '../js/db.js';

const PROFILE_KEYS = ['userName', 'cargo', 'filial', 'mascota', 'userAvatar', 'bannerUrl'];

export const UserService = {
  /** Devuelve el perfil local como objeto plano. */
  async getProfile() {
    const entries = await Promise.all(PROFILE_KEYS.map(async k => [k, await config.get(k)]));
    return Object.fromEntries(entries);
  },
  /** Actualiza una o varias claves del perfil. */
  async setProfile(partial = {}) {
    await Promise.all(Object.entries(partial)
      .filter(([k]) => PROFILE_KEYS.includes(k))
      .map(([k, v]) => config.set(k, v)));
  },
  get: (key) => config.get(key),
  set: (key, value) => config.set(key, value)
};
export default UserService;
