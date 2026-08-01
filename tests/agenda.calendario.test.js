import test from 'node:test';
import assert from 'node:assert/strict';
import {
  weeksInMonth, expandMeetings, hourWindow, ymd, startOfWeek,
} from '../modules/agenda/domain/calendario.js';

const cita = (o) => ({ id: 'x', titulo: 'Reunión', tipo: 'diagnostico', estado: 'Confirmada',
  fecha: '2026-08-01', hora: '10:00', durMin: 60, recurrencia: 'none', ...o });
const d = (s) => new Date(s);

/* ── weeksInMonth: filas que ocupa el mes en la grilla ── */

test('agosto 2026 (empieza sábado, 31 días) necesita 6 filas', () => {
  assert.equal(weeksInMonth(d('2026-08-15T12:00')), 6);
});

test('febrero 2027 (empieza lunes, 28 días) cabe justo en 4 filas', () => {
  assert.equal(weeksInMonth(d('2027-02-10T12:00')), 4);
});

test('julio 2026 (empieza miércoles, 31 días) necesita 5 filas', () => {
  assert.equal(weeksInMonth(d('2026-07-10T12:00')), 5);
});

test('la grilla siempre cubre el mes completo', () => {
  for (let m = 0; m < 12; m++) {
    const cursor = new Date(2026, m, 15);
    const gStart = startOfWeek(new Date(2026, m, 1));
    const fin = new Date(gStart); fin.setDate(fin.getDate() + weeksInMonth(cursor) * 7 - 1);
    const ultimo = new Date(2026, m + 1, 0);
    assert.ok(fin >= ultimo, `mes ${m + 1}: la grilla corta el ${ymd(fin)} y el mes acaba el ${ymd(ultimo)}`);
  }
});

/* ── expandMeetings: recurrencias ── */

test('sin recurrencia: aparece sólo si cae dentro del rango', () => {
  const list = [cita({ fecha: '2026-08-05' })];
  assert.equal(expandMeetings(list, d('2026-08-01'), d('2026-09-01')).length, 1);
  assert.equal(expandMeetings(list, d('2026-09-01'), d('2026-10-01')).length, 0);
});

test('una cita cancelada no se muestra nunca', () => {
  const list = [cita({ estado: 'Cancelada' })];
  assert.equal(expandMeetings(list, d('2026-08-01'), d('2026-09-01')).length, 0);
});

test('semanal: una ocurrencia por semana dentro del rango', () => {
  const list = [cita({ fecha: '2026-08-03', recurrencia: 'weekly' })];      // lunes
  const out = expandMeetings(list, d('2026-08-01'), d('2026-09-01'));
  assert.deepEqual(out.map(o => ymd(o.date)), ['2026-08-03','2026-08-10','2026-08-17','2026-08-24','2026-08-31']);
  assert.ok(out.every(o => o.recurs));
});

test('mensual: conserva el día del mes', () => {
  const list = [cita({ fecha: '2026-01-15', recurrencia: 'monthly' })];
  const out = expandMeetings(list, d('2026-08-01'), d('2026-11-01'));
  assert.deepEqual(out.map(o => ymd(o.date)), ['2026-08-15','2026-09-15','2026-10-15']);
});

// La regresión que motivó el salto adelante: iterando día a día desde el
// origen, el guardia de 500 vueltas se agotaba antes de llegar al rango y la
// cita desaparecía del calendario sin ningún error.
test('diaria antigua (más de 500 días atrás) sigue apareciendo hoy', () => {
  const list = [cita({ fecha: '2023-01-01', recurrencia: 'daily' })];
  const out = expandMeetings(list, d('2026-08-01'), d('2026-08-08'));
  assert.deepEqual(out.map(o => ymd(o.date)),
    ['2026-08-01','2026-08-02','2026-08-03','2026-08-04','2026-08-05','2026-08-06','2026-08-07']);
});

test('semanal antigua: el salto adelante respeta el día de la semana', () => {
  const list = [cita({ fecha: '2022-03-02', recurrencia: 'weekly' })];       // miércoles
  const out = expandMeetings(list, d('2026-08-01'), d('2026-08-31'));
  assert.deepEqual(out.map(o => ymd(o.date)), ['2026-08-05','2026-08-12','2026-08-19','2026-08-26']);
});

test('mensual antigua: no se salta la primera ocurrencia del rango', () => {
  const list = [cita({ fecha: '2020-08-01', recurrencia: 'monthly' })];
  const out = expandMeetings(list, d('2026-08-01'), d('2026-09-01'));
  assert.deepEqual(out.map(o => ymd(o.date)), ['2026-08-01']);
});

test('el filtro de tipos esconde el tipo apagado', () => {
  const list = [cita({ id: 'a', tipo: 'diagnostico' }), cita({ id: 'b', tipo: 'seguimiento' })];
  const out = expandMeetings(list, d('2026-08-01'), d('2026-09-01'), new Set(['diagnostico']));
  assert.deepEqual(out.map(o => o.m.id), ['a']);
});

test('un tipo desconocido (dato viejo) no lo esconde el filtro', () => {
  const list = [cita({ id: 'z', tipo: 'lo-que-sea' })];
  const out = expandMeetings(list, d('2026-08-01'), d('2026-09-01'), new Set(['diagnostico']));
  assert.deepEqual(out.map(o => o.m.id), ['z']);
});

test('una recurrencia desconocida no cuelga el calendario', () => {
  const list = [cita({ recurrencia: 'cada-luna-llena' })];
  assert.deepEqual(expandMeetings(list, d('2026-08-01'), d('2026-09-01')), []);
});

/* ── hourWindow: franja visible de la vista Semana ── */

const occ = (hora, durMin = 60) => ({ m: cita({ hora, durMin }) });

test('sin nada fuera de rango, la franja queda en 08–20', () => {
  assert.deepEqual(hourWindow([occ('10:00'), occ('15:30')]), { startH: 8, endH: 20 });
});

test('una semana vacía usa la franja por defecto', () => {
  assert.deepEqual(hourWindow([]), { startH: 8, endH: 20 });
});

test('un desayuno a las 07:00 estira la franja hacia arriba', () => {
  assert.deepEqual(hourWindow([occ('07:00')]), { startH: 7, endH: 20 });
});

test('un cierre a las 21:30 estira la franja hacia abajo (incluye su duración)', () => {
  assert.deepEqual(hourWindow([occ('21:30', 60)]), { startH: 8, endH: 23 });
});

test('la franja nunca se sale del día', () => {
  const w = hourWindow([occ('23:30', 120)]);
  assert.equal(w.endH, 24);
  assert.ok(w.startH >= 0);
});

test('se respetan los límites por defecto que se pasen', () => {
  assert.deepEqual(hourWindow([occ('10:00')], { min: 9, max: 18 }), { startH: 9, endH: 18 });
});
