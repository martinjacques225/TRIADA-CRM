#!/usr/bin/env node
// scripts/stamp-assets.mjs
// Pone `?v=<hash del contenido>` en los CSS y JS que enlazan los HTML de entrada.
//
// ── Por qué existe ──────────────────────────────────────────────────────────
// GitHub Pages sirve todo con `Cache-Control: max-age=600` y no deja configurar
// cabeceras. Cuando un deploy cambia un archivo que YA existía, el navegador
// sigue usando su copia vieja — y si en el mismo deploy entró un archivo NUEVO,
// ese sí se baja fresco. Resultado: mitad nuevo, mitad viejo.
//
// Eso rompió el PDF del Diagnóstico 360 el 29-jul-2026: `informe.paginate.js`
// era archivo nuevo (llegó fresco) e `informe.css` ya existía (llegó de caché).
// El paginador repartía en 17 hojas y el CSS viejo las partía en dos: 34 hojas.
// En incógnito salían las 17 correctas. El síntoma no fue un error: fue un PDF
// silenciosamente mal armado, que es peor.
//
// ── Cómo funciona ───────────────────────────────────────────────────────────
// El sello es el **hash del contenido del propio archivo**, no un número que
// alguien recuerda subir. Consecuencias buenas:
//   · Si el archivo no cambió, el sello no cambia → la caché se sigue usando.
//   · Si cambió, la URL cambia → el navegador lo baja sí o sí.
//   · Es idempotente: correrlo dos veces sin tocar nada no genera diff. De ahí
//     que el guardián de CI pueda ser "corre esto y falla si aparece un diff".
//
// ── Uso ─────────────────────────────────────────────────────────────────────
//   npm run stamp          sella y escribe
//   npm run stamp -- --check   no escribe; sale 1 si algo estaba sin sellar
//
// ── Límite conocido, a propósito ────────────────────────────────────────────
// NO reescribe los `import` de los módulos ES (un `import './x.js'` dentro de un
// .js resuelve relativo y perdería el sello igual). O sea: los módulos siguen
// expuestos a los 10 minutos de `max-age`. Se acepta porque un módulo desfasado
// suele reventar con un error visible en consola, mientras que un CSS desfasado
// rompe en silencio — que es la clase de fallo que costó dos sesiones encontrar.
// Si algún día entra un bundler, esto se reemplaza por hashes en el nombre.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// HTML de entrada que enlazan assets locales. `diagnostico-publico.html` no
// enlaza ninguno (lleva su CSS embebido) y por eso no está.
const ENTRADAS = [
  'index.html',
  'preview.html',
  'movil/index.html',
  'movil/preview.html',
];

// href/src que apunten a un .css o .js local, con o sin sello previo.
const REF = /(\s(?:href|src)=")((?:\.{1,2}\/)[^"?]+\.(?:css|js))(\?v=[^"]*)?(")/g;

// El hash se calcula sobre el contenido con finales de línea NORMALIZADOS a LF.
// Sin esto el sello depende de la máquina: en Windows `core.autocrlf` deja CRLF en
// la copia de trabajo mientras el repo (y por lo tanto lo que sirve GitHub Pages)
// guarda LF, así que el mismo archivo daba dos hashes distintos y el guardián de CI
// fallaba contra un sello sellado en Windows. Pasó con `app.js` el 29-jul-2026.
// El ida y vuelta por 'latin1' es byte a byte (1 byte = 1 carácter), así que no
// toca los acentos. Ojo: `toString('binary')` + `update(<string>)` NO sirve —
// `update` reinterpreta la cadena como UTF-8 y cambia el hash de todo archivo con
// tildes. Tiene que volver a ser Buffer antes de hashear.
const normalizar = (buf) => Buffer.from(buf.toString('latin1').replace(/\r\n/g, '\n'), 'latin1');

const soloVerificar = process.argv.includes('--check');
let sellados = 0, sinCambios = 0;
const desincronizados = [];

for (const entrada of ENTRADAS) {
  const rutaHtml = join(RAIZ, entrada);
  if (!existsSync(rutaHtml)) { console.warn(`  AVISO  no existe, se omite: ${entrada}`); continue; }

  const antes = readFileSync(rutaHtml, 'utf8');
  const baseDir = dirname(rutaHtml);

  const despues = antes.replace(REF, (todo, pre, ruta, selloViejo, post) => {
    const asset = resolve(baseDir, ruta);
    // Un href que no existe en disco se deja intacto: puede ser de otro origen
    // o un archivo generado. Sellar algo que no podemos leer sería inventar.
    if (!existsSync(asset)) { console.warn(`  AVISO  referenciado pero no está en disco: ${ruta} (${entrada})`); return todo; }
    const hash = createHash('sha1').update(normalizar(readFileSync(asset))).digest('hex').slice(0, 8);
    const sello = `?v=${hash}`;
    if (selloViejo === sello) sinCambios++;
    else { sellados++; desincronizados.push(`${entrada} → ${ruta}`); }
    return `${pre}${ruta}${sello}${post}`;
  });

  if (despues !== antes && !soloVerificar) writeFileSync(rutaHtml, despues);
}

if (soloVerificar) {
  if (desincronizados.length) {
    console.error(`\n✗ ${desincronizados.length} asset(s) con el sello desactualizado:\n`);
    for (const d of desincronizados) console.error(`    ${d}`);
    console.error(`\n  Corrige con:  npm run stamp\n`);
    console.error(`  Sin el sello, GitHub Pages sirve el archivo viejo desde la caché del`);
    console.error(`  navegador hasta 10 minutos y el CRM queda mitad nuevo, mitad viejo.\n`);
    process.exit(1);
  }
  console.log(`✓ los ${sinCambios} assets enlazados están sellados al día.`);
} else {
  console.log(`✓ sellados ${sellados} · ya al día ${sinCambios}`);
  if (sellados) for (const d of desincronizados) console.log(`    ${d}`);
}
