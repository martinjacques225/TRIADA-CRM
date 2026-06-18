import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clean, isMissingTable, isMissingCol, toOrigenSlug, toFactEstado,
  leadToSupa, leadFromSupa,
  diagToSupa, diagFromSupa,
  citaToSupa, citaToSupaBase,
  clienteToSupa, facturaToSupa,
  presupToSupa, presupFromSupa,
} from '../js/mappers.js';

// ─── clean: descarta undefined, conserva null/0/'' ───────────
test('clean: descarta solo undefined (mantiene null, 0, "")', () => {
  assert.deepEqual(
    clean({ a: 1, b: undefined, c: null, d: 0, e: '' }),
    { a: 1, c: null, d: 0, e: '' }
  );
});

// ─── toOrigenSlug: enum lead_origen (la footgun del 22P02) ───
test('toOrigenSlug: mapea la etiqueta UI al slug del enum', () => {
  assert.equal(toOrigenSlug('Landing Web'), 'landing');
  assert.equal(toOrigenSlug('Meta Ads'), 'meta_ads');
  assert.equal(toOrigenSlug('Google Ads'), 'google_ads');
});
test('toOrigenSlug: un slug ya válido pasa tal cual', () => {
  assert.equal(toOrigenSlug('whatsapp'), 'whatsapp');
});
test('toOrigenSlug: desconocido/vacío cae a "manual" (nunca rompe el enum)', () => {
  assert.equal(toOrigenSlug('Evento'), 'manual');
  assert.equal(toOrigenSlug(''), 'manual');
  assert.equal(toOrigenSlug(undefined), 'manual');
});

// ─── toFactEstado: enum fact_estado ──────────────────────────
test('toFactEstado: normaliza a minúscula y valida contra el enum', () => {
  assert.equal(toFactEstado('Pendiente'), 'pendiente');
  assert.equal(toFactEstado('PAGADO'), 'pagado');
  assert.equal(toFactEstado('parcial'), 'parcial');
});
test('toFactEstado: desconocido/vacío cae a "pendiente"', () => {
  assert.equal(toFactEstado('Enviada'), 'pendiente');
  assert.equal(toFactEstado(null), 'pendiente');
});

// ─── leadToSupa / leadFromSupa ───────────────────────────────
test('leadToSupa: renombra campos UI→DB y aplica defaults', () => {
  const out = leadToSupa({ nombre: 'Ana', rubro: 'Servicios', facturacionEst: 1000, dolorPrincipal: 'X', origen: 'Landing Web' });
  assert.equal(out.giro, 'Servicios');             // rubro → giro
  assert.equal(out.facturacion_est, 1000);          // facturacionEst → facturacion_est
  assert.equal(out.dolor_principal, 'X');
  assert.equal(out.origen, 'landing');              // vía toOrigenSlug
  assert.equal(out.estado, 'Nuevo');                // default
  assert.ok(!('rubro' in out));                     // no filtra el nombre UI
});
test('leadToSupa: respeta el estado provisto', () => {
  assert.equal(leadToSupa({ nombre: 'A', estado: 'Contactado' }).estado, 'Contactado');
});
test('leadFromSupa: codigo→correlativo, giro→rubro, origen DB→UI; null→null', () => {
  assert.equal(leadFromSupa(null), null);
  const ui = leadFromSupa({ id: '1', codigo: 'L-001', giro: 'Salud', origen: 'meta_ads', nombre: 'Ana' });
  assert.equal(ui.correlativo, 'L-001');
  assert.equal(ui.rubro, 'Salud');
  assert.equal(ui.origen, 'Meta Ads');
});

// ─── diagnósticos: scores anidados ───────────────────────────
test('diagToSupa: arma scores anidado por área + default estado', () => {
  const out = diagToSupa({ prospectoId: 'p1', scoresTec: [true, false] });
  assert.equal(out.lead_id, 'p1');
  assert.deepEqual(out.scores, { tecnologia: [true, false], ventas: [], finanzas: [] });
  assert.equal(out.estado, 'borrador');
});
test('diagFromSupa: scores.* → scoresTec/Ventas/Finanzas (vacío si falta)', () => {
  const ui = diagFromSupa({ id: 'd1', codigo: 'D-1', lead_id: 'p1', scores: { ventas: [true] } });
  assert.deepEqual(ui.scoresVentas, [true]);
  assert.deepEqual(ui.scoresTec, []);
  assert.equal(ui.prospectoId, 'p1');
});

// ─── citas: payload base vs extendido (fallback 42703) ───────
test('citaToSupaBase NO incluye columnas del calendario; citaToSupa SÍ', () => {
  const data = { prospectoId: 'p1', titulo: 'R', durMin: 30, recurrencia: 'weekly' };
  const base = citaToSupaBase(data);
  assert.ok(!('duracion_min' in base) && !('recurrencia' in base));
  const full = citaToSupa(data);
  assert.equal(full.duracion_min, 30);
  assert.equal(full.recurrencia, 'weekly');
  assert.equal(full.lead_id, 'p1');
});

// ─── clientes: cadena de fallback de razón social ────────────
test('clienteToSupa: razon_social cae a empresa o nombre si no hay razonSocial', () => {
  assert.equal(clienteToSupa({ empresa: 'ACME SpA' }).razon_social, 'ACME SpA');
  assert.equal(clienteToSupa({ nombre: 'Juan' }).razon_social, 'Juan');
  assert.equal(clienteToSupa({ razonSocial: 'R', empresa: 'E' }).razon_social, 'R');
});

// ─── facturas: estado vía enum ───────────────────────────────
test('facturaToSupa: normaliza estado al enum', () => {
  assert.equal(facturaToSupa({ clienteId: 'c1', estado: 'Vencido' }).estado, 'vencido');
  assert.equal(facturaToSupa({ clienteId: 'c1' }).estado, 'pendiente');
});

// ─── presupuestos: round-trip de defaults numéricos ──────────
test('presupFromSupa: defaults numéricos cuando faltan', () => {
  const ui = presupFromSupa({ id: 'pr1', cliente_id: 'c1' });
  assert.equal(ui.manoObra, 0);
  assert.equal(ui.total, 0);
  assert.deepEqual(ui.servicios, []);
  assert.equal(ui.estado, 'borrador');
});
test('presupToSupa: mapea camelCase→snake_case', () => {
  const out = presupToSupa({ clienteId: 'c1', manoObra: 500, planMensual: 100 });
  assert.equal(out.cliente_id, 'c1');
  assert.equal(out.mano_obra, 500);
  assert.equal(out.plan_mensual, 100);
});

// ─── detección de errores Postgres ───────────────────────────
test('isMissingTable / isMissingCol detectan los códigos correctos', () => {
  assert.ok(isMissingTable({ code: '42P01' }));
  assert.ok(isMissingTable({ code: 'PGRST205' }));
  assert.ok(!isMissingTable({ code: '42703' }));
  assert.ok(isMissingCol({ code: '42703' }));
  assert.ok(isMissingCol({ message: 'column "x" does not exist' }));
  assert.ok(!isMissingCol({ code: '42P01' }));
});
