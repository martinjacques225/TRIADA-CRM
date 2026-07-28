import test from 'node:test';
import assert from 'node:assert/strict';
import {
  direccionCompleta, tieneDireccion, mapsQuery,
  googleMapsUrl, googleMapsVerUrl, wazeUrl, appleMapsUrl, mapaPorDefectoUrl,
} from '../js/geo.js';

// ─── direccionCompleta: arma la línea legible ────────────────
test('direccionCompleta: dirección + comuna + región, en ese orden', () => {
  assert.equal(
    direccionCompleta({ direccion: 'Av. San Miguel 1234', comuna: 'Molina', region: 'Maule' }),
    'Av. San Miguel 1234, Molina, Maule'
  );
});
test('direccionCompleta: salta los campos vacíos (sin comas huérfanas)', () => {
  assert.equal(direccionCompleta({ comuna: 'Curicó', region: 'Maule' }), 'Curicó, Maule');
  assert.equal(direccionCompleta({ direccion: '  Balmaceda 55  ' }), 'Balmaceda 55');
});
test('direccionCompleta: no repite si comuna y región son lo mismo', () => {
  assert.equal(direccionCompleta({ comuna: 'Metropolitana', region: 'metropolitana' }), 'Metropolitana');
});
test('direccionCompleta: sin datos → cadena vacía (nunca "undefined")', () => {
  assert.equal(direccionCompleta({}), '');
  assert.equal(direccionCompleta(null), '');
  assert.equal(direccionCompleta({ direccion: null, comuna: undefined }), '');
});

// ─── tieneDireccion: ¿hay algo que navegar? ──────────────────
test('tieneDireccion: la región SOLA no alcanza (es media zona del país)', () => {
  assert.equal(tieneDireccion({ region: 'Maule' }), false);
  assert.equal(tieneDireccion({ comuna: 'Molina' }), true);
  assert.equal(tieneDireccion({ direccion: 'Balmaceda 55' }), true);
});
test('tieneDireccion: espacios en blanco no cuentan como dirección', () => {
  assert.equal(tieneDireccion({ direccion: '   ', comuna: '' }), false);
  assert.equal(tieneDireccion({}), false);
  assert.equal(tieneDireccion(null), false);
});

// ─── mapsQuery: lo que recibe el geocodificador ──────────────
test('mapsQuery: agrega ", Chile" para no saltar de país', () => {
  assert.equal(mapsQuery({ direccion: 'Balmaceda 55', comuna: 'Molina' }), 'Balmaceda 55, Molina, Chile');
});
test('mapsQuery: no duplica el país si ya venía escrito', () => {
  assert.equal(mapsQuery({ direccion: 'Balmaceda 55', comuna: 'Molina, Chile' }), 'Balmaceda 55, Molina, Chile');
});
test('mapsQuery: sin dirección → vacío', () => {
  assert.equal(mapsQuery({ region: 'Maule' }), '');
});

// ─── URLs: cada app abre donde debe ──────────────────────────
const LEAD = { direccion: 'Av. San Miguel 1234', comuna: 'Molina', region: 'Maule' };
const ESPERADO = encodeURIComponent('Av. San Miguel 1234, Molina, Maule, Chile');

test('googleMapsUrl: ruta en auto, con la navegación ya iniciada', () => {
  const u = googleMapsUrl(LEAD);
  assert.ok(u.startsWith('https://www.google.com/maps/dir/?api=1'));
  assert.ok(u.includes(`destination=${ESPERADO}`));
  assert.ok(u.includes('travelmode=driving'));
  assert.ok(u.includes('dir_action=navigate'));
});
test('googleMapsVerUrl: solo ubica el punto (no navega)', () => {
  const u = googleMapsVerUrl(LEAD);
  assert.ok(u.startsWith('https://www.google.com/maps/search/?api=1'));
  assert.ok(u.includes(`query=${ESPERADO}`));
});
test('wazeUrl: consulta + navigate=yes', () => {
  assert.equal(wazeUrl(LEAD), `https://waze.com/ul?q=${ESPERADO}&navigate=yes`);
});
test('appleMapsUrl: destino en auto', () => {
  assert.equal(appleMapsUrl(LEAD), `https://maps.apple.com/?daddr=${ESPERADO}&dirflg=d`);
});
test('todas las URLs: sin dirección devuelven "" (el botón no se muestra)', () => {
  const vacio = { region: 'Maule' };
  [googleMapsUrl, googleMapsVerUrl, wazeUrl, appleMapsUrl].forEach((fn) => assert.equal(fn(vacio), ''));
});
test('los datos del lead se escapan en la URL (comillas, &, espacios)', () => {
  const u = googleMapsUrl({ direccion: 'Ruta K-25 s/n & km 3', comuna: 'Río Claro' });
  assert.ok(!/[ &](?=[A-Za-zÀ-ÿ])/.test(u.split('destination=')[1].split('&travelmode')[0]));
  assert.ok(u.includes(encodeURIComponent('Ruta K-25 s/n & km 3, Río Claro, Chile')));
});

// ─── mapa por defecto según el teléfono ──────────────────────
test('mapaPorDefectoUrl: iPhone → Apple Maps · el resto → Google Maps', () => {
  const ios = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)';
  const android = 'Mozilla/5.0 (Linux; Android 14; Pixel 8)';
  assert.ok(mapaPorDefectoUrl(LEAD, ios).startsWith('https://maps.apple.com/'));
  assert.ok(mapaPorDefectoUrl(LEAD, android).startsWith('https://www.google.com/maps/dir/'));
  assert.ok(mapaPorDefectoUrl(LEAD).startsWith('https://www.google.com/maps/dir/'));
});
