// modules/agenda/domain/calendario.js
// Cálculos puros del calendario de la Agenda: aritmética de fechas, expansión
// de recurrencias, filas que ocupa un mes en la grilla y ventana horaria de la
// vista Semana.
//
// Sin DOM y sin Supabase a propósito: esto se testea en node
// (tests/agenda.calendario.test.js). El módulo de presentación
// (modules/agenda/agenda.js) no vuelve a calcular nada de esto.

import { todayStr, MEETING_TYPES, toMeetingTipo } from '../../../js/utils.js';

const DIA_MS = 86400000;

/* ── aritmética de fechas ── */
export const startOfDay   = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
export const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
export const startOfWeek  = (d) => { const x = startOfDay(d); const w = (x.getDay() + 6) % 7; x.setDate(x.getDate() - w); return x; };
export const addDays      = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const addMonths    = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
export const ymd          = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const sameDay      = (a, b) => a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();

/* ── lectura de una cita ── */
export const horaOf    = (m) => (m.hora || '').slice(0, 5);
export const dateOf    = (m) => new Date(`${(m.fecha||todayStr()).slice(0,10)}T${horaOf(m) || '09:00'}`);
export const parseHora = (h) => { const [H,M] = (h||'0:0').split(':').map(Number); return (H||0) + (M||0)/60; };

/* ── filas que necesita el mes en la grilla ──
   Antes se pintaban siempre 42 celdas (6 semanas). Un mes que cabe en 4 o 5
   dejaba una fila entera vacía al final: espacio muerto que no dice nada. */
export function weeksInMonth(cursor) {
  const mStart = startOfMonth(cursor);
  const gStart = startOfWeek(mStart);
  const offset = Math.round((mStart - gStart) / DIA_MS);            // días de relleno antes del 1
  const dias   = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  return Math.ceil((offset + dias) / 7);
}

/* ── expandir recurrencias en un rango [start, end) ──
   `typeFilter` es un Set de ids de MEETING_TYPES; los tipos desconocidos
   (datos viejos) nunca se filtran para no esconder una cita real. */
export function expandMeetings(list, start, end, typeFilter = null) {
  const out = [];
  list.forEach(m => {
    if (m.estado === 'Cancelada' || !m.fecha) return;
    const tipo = toMeetingTipo(m.tipo);
    if (typeFilter && MEETING_TYPES.some(t => t.id === tipo) && !typeFilter.has(tipo)) return;
    const base = dateOf(m);
    if (isNaN(base)) return;
    const rec = m.recurrencia || 'none';
    if (rec === 'none') { if (base >= start && base < end) out.push({ m, date: base }); return; }
    if (rec !== 'daily' && rec !== 'weekly' && rec !== 'monthly') return;

    const cur = new Date(base);
    // Saltar de una vez hasta cerca del inicio del rango. Iterando paso a paso
    // desde el origen, una cita diaria creada hace más de 500 días se caía del
    // calendario en silencio al topar con el guardia de iteraciones.
    if (cur < start) _fastForward(cur, start, rec);

    let guard = 0;
    while (cur < end && guard++ < 500) {
      if (cur >= start) out.push({ m, date: new Date(cur), recurs: true });
      if (rec === 'daily')       cur.setDate(cur.getDate() + 1);
      else if (rec === 'weekly') cur.setDate(cur.getDate() + 7);
      else                       cur.setMonth(cur.getMonth() + 1);
    }
  });
  return out;
}

// Adelanta `cur` hasta justo antes de `start` conservando la cadencia. Usa
// Math.floor a propósito: quedarse corto por el cambio de hora sólo cuesta una
// o dos vueltas del bucle; pasarse se saltaría una ocurrencia válida.
function _fastForward(cur, start, rec) {
  if (rec === 'monthly') {
    const meses = (start.getFullYear() - cur.getFullYear()) * 12 + (start.getMonth() - cur.getMonth());
    if (meses > 0) cur.setMonth(cur.getMonth() + meses - 1);
    return;
  }
  const paso = rec === 'weekly' ? 7 : 1;
  const dias = Math.floor((startOfDay(start) - startOfDay(cur)) / DIA_MS);
  const saltos = Math.floor(dias / paso);
  if (saltos > 0) cur.setDate(cur.getDate() + saltos * paso);
}

/* ── ventana horaria de la vista Semana ──
   La rejilla arranca en 08:00 y termina en 20:00, pero si la semana tiene algo
   fuera de esa franja hay que estirarla: con la ventana fija, un desayuno a las
   07:00 se dibujaba pegado a la línea de las 08:00 (mentía) y un cierre a las
   21:30 caía fuera de la columna (desaparecía). */
export function hourWindow(occ, { min = 8, max = 20 } = {}) {
  let ini = min, fin = max;
  (occ || []).forEach(({ m }) => {
    const start = parseHora(horaOf(m));
    const end   = start + (m.durMin || 60) / 60;
    if (start < ini) ini = Math.floor(start);
    if (end   > fin) fin = Math.ceil(end);
  });
  return { startH: Math.max(0, ini), endH: Math.min(24, Math.max(fin, ini + 1)) };
}
