// modules/informes/mascot.engine.js
// MOTOR DE MASCOTAS. Toma los hallazgos neutros de analytics.engine y los redacta
// con la PERSONALIDAD de la mascota seleccionada. Esto es la "IA" realista del CRM offline.
//
// HOOK FUTURO: setAIProvider(fn) permite enchufar IA real (Fase 8 / Supabase) sin reescribir.
//   fn: async ({ mascota, section, insights, data }) => string  (devuelve el párrafo redactado)
//   Si hay provider, voiceAsync() lo usa; si no, cae al motor heurístico local.
import { MASCOTAS } from '../../js/mascotas.js';

let _aiProvider = null;
export function setAIProvider(fn) { _aiProvider = typeof fn === 'function' ? fn : null; }
export function hasAIProvider() { return !!_aiProvider; }

const SEC_NOMBRE = {
  leads: 'los leads', ventas: 'las ventas', agenda: 'la agenda',
  comisiones: 'las comisiones', medallas: 'las medallas', dashboard: 'el panel ejecutivo'
};

// Personalidad por mascota: intro (función de sección), flair por severidad y cierre.
const TONO = {
  aria: {
    intro: s => `Análisis completado. Procesando datos de ${SEC_NOMBRE[s] || s}:`,
    good: '📈 Dato positivo:', warn: '⚠️ Señal a corregir:', bad: '🔴 Alerta crítica:', info: '📊 Registro:',
    close: 'Recomendación ARIA: prioriza por impacto y mantén el pipeline limpio. La eficiencia es medible. ⚡'
  },
  titan: {
    intro: s => `¡A LA CANCHA! Reporte de batalla en ${SEC_NOMBRE[s] || s}:`,
    good: '🏆 ¡VICTORIA!', warn: '💪 ¡A CORREGIR!', bad: '⚔️ ¡ALERTA, GUERRERO!', info: '📋 Marcador:',
    close: 'Recomendación TITAN: ¡no aflojes! Los campeones rematan lo que empiezan. ¡A POR TODO! 🔥'
  },
  zen: {
    intro: s => `Observa los datos de ${SEC_NOMBRE[s] || s} con claridad, sin sesgos:`,
    good: 'Resultado favorable:', warn: 'Punto de fricción:', bad: 'Riesgo a atender:', info: 'Dato:',
    close: 'Recomendación ZEN: ajusta el proceso, no la motivación. La constancia supera a la intensidad.'
  },
  max: {
    intro: s => `¡Ey crack! Mira cómo viene ${SEC_NOMBRE[s] || s}:`,
    good: '🔥 ¡Eso bro!', warn: '😅 Ojo acá:', bad: '🚨 ¡Atento hermano!', info: '👀 Mira:',
    close: 'Recomendación MAX: dale con todo bro, el follow-up es donde se cierra. ¡Tú puedes crack! 💯'
  },
  nova: {
    intro: s => `¡Hola estrella! Veamos cómo brilla ${SEC_NOMBRE[s] || s}:`,
    good: '🌟 ¡Qué bien!', warn: '✨ A pulir:', bad: '💫 Atención:', info: '✨ Dato:',
    close: 'Recomendación NOVA: cada acción te acerca a las estrellas. Cuida cada lead con cariño. 🚀'
  },
  illidan: {
    intro: s => `Woof. 🐾 Revisemos juntos ${SEC_NOMBRE[s] || s}:`,
    good: '🐾 ¡Muy bien!', warn: '🐕 Ojo aquí:', bad: '🐾 Cuidado:', info: '🐕 Dato:',
    close: 'Recomendación ILLIDAN: estoy contigo. Sé constante con tus leads, la lealtad genera ventas. 🐾'
  }
};

function getMascota(id) { return MASCOTAS.find(m => m.id === id) || MASCOTAS[0]; }

// Versión SÍNCRONA (la usa el motor de informes para render directo a PDF).
export function voice(mascotaId, insights, section) {
  const m = getMascota(mascotaId);
  const t = TONO[m.id] || TONO.aria;
  const lines = (insights || []).map(i => ({
    severity: i.severity,
    flair: t[i.severity] || t.info,
    text: i.text
  }));
  return {
    mascota: { id: m.id, nombre: m.nombre, color: m.color, img: m.img, emoji: m.emoji },
    intro: t.intro(section),
    lines,
    close: t.close
  };
}

// Versión ASÍNCRONA con hook de IA real. Cae al motor local si no hay provider.
export async function voiceAsync(mascotaId, insights, section, data) {
  if (_aiProvider) {
    try {
      const m = getMascota(mascotaId);
      const text = await _aiProvider({ mascota: m, section, insights, data });
      if (text) return { mascota: { id: m.id, nombre: m.nombre, color: m.color, img: m.img, emoji: m.emoji }, intro: '', lines: [{ severity: 'info', flair: '', text }], close: '' };
    } catch { /* fallback al motor local */ }
  }
  return voice(mascotaId, insights, section);
}
