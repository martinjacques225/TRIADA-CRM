// modules/informe-ejecutivo/informe.paginate.js
// Pagina el Informe 360 en hojas A4 REALES, midiendo el contenido ya renderizado.
//
// ── Por qué existe ──────────────────────────────────────────────────────────
// El informe se escribía como 9 bloques `.report-page` de alto fijo con el número
// de hoja escrito a mano ("3 / 9"). El diseño nació para 3 pilares y hoy lleva 8:
// "Resultados por Pilar" mide 4,2 veces lo que cabe en una hoja. Como cada bloque
// lleva `page-break-after: always`, ese exceso se derramaba en hojas sueltas —el
// PDF salía con 12 hojas numeradas hasta 9— y html2canvas (compartir desde el
// móvil, que captura UNA hoja por `.report-page`) aplastaba la página larga.
// De ahí el "fuera de margen / fuera de orden".
//
// ── Qué hace ────────────────────────────────────────────────────────────────
// Reparte el contenido en tantas hojas A4 como haga falta, sin cortar una tarjeta
// por la mitad, repitiendo el encabezado de la sección con la marca "continúa", y
// numera al final: el "n / total" se calcula, no se escribe a mano. El resultado
// es 1 hoja física por cada `.report-page` — que es lo que necesitan tanto
// `window.print()` como la captura por página del móvil.
//
// ── Contrato con la vista (informe.view.js) ─────────────────────────────────
//   data-flow    en la <section>: esta página se puede repartir en varias hojas.
//   data-split   en un contenedor: sus HIJOS son las unidades que se reparten.
//   data-repeat  en el encabezado: se vuelve a dibujar en cada hoja de la sección.
// Un bloque sin `data-split` es indivisible: viaja entero a la hoja siguiente.

const A4_MM = 297;

/** Alto de 1 mm en px MEDIDO en el documento real (no asume 96 dpi). */
function pxPorMm(host) {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;visibility:hidden;height:100mm;width:0;padding:0;border:0';
  host.appendChild(probe);
  const px = probe.getBoundingClientRect().height / 100;
  probe.remove();
  return px || (96 / 25.4);
}

/** Alto ocupado por el contenido de la hoja, sin contar el pie. */
function altoContenido(pagina, pie, padTop) {
  const hijos = [...pagina.children].filter(c => c !== pie && !c.classList.contains('cover-aura'));
  if (!hijos.length) return 0;
  const top = pagina.getBoundingClientRect().top + padTop;
  return hijos[hijos.length - 1].getBoundingClientRect().bottom - top;
}

/** Marca el encabezado clonado como continuación ("Resultados por Pilar · continúa"). */
function marcarContinua(head) {
  if (head.querySelector('.rh-cont')) return;
  const t = head.querySelector('.rh-title');
  if (t) t.insertAdjacentHTML('afterend', '<span class="rh-cont">continúa</span>');
}

function repaginarSeccion(pagina, altoHoja) {
  const cs = getComputedStyle(pagina);
  const padTop = parseFloat(cs.paddingTop) || 0;
  const padBot = parseFloat(cs.paddingBottom) || 0;
  const pie = pagina.querySelector(':scope > .report-footer');
  // El pie va pegado abajo (margin-top:auto) con su borde y respiro: hay que
  // descontarlo del espacio útil o la última tarjeta se le monta encima.
  const altoPie = pie ? pie.getBoundingClientRect().height + 18 : 0;
  const disponible = altoHoja - padTop - padBot - altoPie;
  if (disponible <= 0) return [pagina];

  // 1) Desarmar la página en "átomos" en orden de lectura. El pie se saca del
  //    DOM y se usa de molde: cada hoja recibe el suyo como ÚLTIMO hijo (si se
  //    dejara puesto, la hoja original terminaría con dos pies y el viejo arriba).
  const hijos = [...pagina.children].filter(c => c !== pie && !c.classList.contains('cover-aura'));
  if (pie) pie.remove();
  const cabecera = hijos.find(c => c.hasAttribute('data-repeat')) || null;
  const atomos = [];
  for (const ch of hijos) {
    if (ch.hasAttribute('data-split')) {
      const molde = ch.cloneNode(false);            // contenedor vacío: conserva clases y estilos inline
      [...ch.children].forEach(sub => atomos.push({ nodo: sub, molde }));
    } else {
      atomos.push({ nodo: ch, molde: null });
    }
    ch.remove();
  }

  // 2) Repartir. La primera hoja es la <section> original (conserva su identidad).
  const hojas = [];
  let hoja = null, pieHoja = null, contenedor = null, moldeActual = null;

  const nuevaHoja = (primera) => {
    const h = primera ? pagina : pagina.cloneNode(false);
    if (!primera) {
      hojas[hojas.length - 1].after(h);
      if (cabecera) { const c = cabecera.cloneNode(true); marcarContinua(c); h.appendChild(c); }
    }
    pieHoja = pie ? (primera ? pie : pie.cloneNode(true)) : null;
    if (pieHoja) h.appendChild(pieHoja);
    hojas.push(h);
    contenedor = null; moldeActual = null;
    return h;
  };

  const colocar = (a) => {
    if (a.molde) {
      // Ítems seguidos del mismo contenedor comparten uno solo por hoja (si no,
      // se repetirían separadores y espacios entre cada tarjeta).
      if (moldeActual !== a.molde || !contenedor || contenedor.parentNode !== hoja) {
        contenedor = a.molde.cloneNode(false);
        moldeActual = a.molde;
        hoja.insertBefore(contenedor, pieHoja);
      }
      contenedor.appendChild(a.nodo);
    } else {
      contenedor = null; moldeActual = null;
      hoja.insertBefore(a.nodo, pieHoja);
    }
  };

  hoja = nuevaHoja(true);
  for (const a of atomos) {
    colocar(a);
    if (altoContenido(hoja, pieHoja, padTop) <= disponible) continue;

    // No cabe. Si la hoja solo tiene esto (más el encabezado), se queda igual:
    // abrir otra la dejaría vacía y no arreglaría nada.
    const otros = [...hoja.children].filter(c => c !== pieHoja && c !== a.nodo
      && !(a.molde && c === contenedor && contenedor.children.length === 1)
      && !c.hasAttribute('data-repeat'));
    if (!otros.length) continue;

    a.nodo.remove();
    if (contenedor && !contenedor.children.length) contenedor.remove();
    hoja = nuevaHoja(false);
    colocar(a);
  }
  return hojas;
}

/** Numera los pies: "n / total" calculado, nunca escrito a mano. */
function numerar(doc) {
  const hojas = [...doc.querySelectorAll('.report-page')];
  hojas.forEach((p, i) => {
    const n = p.querySelector('.rf-page');
    if (n) n.textContent = `${i + 1} / ${hojas.length}`;
  });
  return hojas.length;
}

/**
 * Pagina el informe ya insertado en el DOM. Devuelve el total de hojas.
 * Debe llamarse con el documento visible (aunque sea con opacidad 0): medir un
 * nodo `display:none` da 0 y la paginación saldría cualquier cosa.
 */
export async function paginateReport(doc) {
  if (!doc) return 0;
  // Sin esperar las tipografías se mide con la fuente de reserva y los cortes
  // caen donde no corresponde (Spectral y Libre Franklin llegan por CDN).
  if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (_) {} }
  const altoHoja = A4_MM * pxPorMm(doc);
  for (const p of [...doc.querySelectorAll('.report-page[data-flow]')]) {
    try { repaginarSeccion(p, altoHoja); }
    catch (err) { console.error('paginar sección', err); }   // una sección rota no tumba el informe
  }
  return numerar(doc);
}
