// js/pdf.js — Documento corporativo imprimible (cotización / presupuesto / informe)
// Abre una ventana con el layout de marca Tríada y dispara el diálogo de
// impresión (el usuario elige "Guardar como PDF"). Sin dependencias.
//
// LA PLANTILLA ES ÚNICA A PROPÓSITO: la usan propuestas, presupuestos, informes y
// el diagnóstico contable. Tocar acá cambia los cuatro. Es el diseño aprobado en
// la cotización COT-2026-08-28-OT (Olivos de Talca, 28-ago-2026).
//
// LAS TRES REGLAS DEL DISEÑO, que costaron dos vueltas con el dueño:
//   1. Esto es una COTIZACIÓN FORMAL, no una pieza editorial ni un brochure. Manda
//      la jerarquía documental: el tipo de documento es el título, la tabla es
//      sobria y los montos se leen de un vistazo.
//   2. TRIADA es la EMISORA y conserva el protagonismo institucional. El logo del
//      cliente va arriba a la derecha, más chico, bajo "Preparada para".
//   3. Nada de tipografías gigantes ni superficies decorativas. El dorado del
//      cliente aparece solo en la numeración de los ítems.
//
// CLASES QUE CONSUMEN LOS MÓDULOS en su `bodyHtml` (no renombrar sin actualizarlos):
//   table.items · td.num · .totals > .row / .row.grand · .block · .notes
import { escHtml, formatDate } from './utils.js';

// Datos del emisor. Se sobrescriben desde Configuración; el default es Tríada
// porque es el mismo criterio que ya usaba `empresa` en los cuatro módulos.
const EMISOR = {
  rut:       '78.450.911-7',
  direccion: '2 Sur 870, Talca · Región del Maule',
  email:     'contacto@grupotriada.cl',
};

const TRIADA_MARK = `<svg viewBox="16 16 282 88" role="img" aria-label="Tríada">
  <g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="13">
    <path d="M26 90 L60 62 L94 90" stroke="#3D6E92"/>
    <path d="M26 73 L60 45 L94 73" stroke="#2F8C93"/>
    <path d="M26 56 L60 28 L94 56" stroke="#6BA083"/>
  </g>
  <text x="116" y="78" font-family="Spectral, Georgia, serif" font-size="56" font-weight="600" fill="#0E1830" letter-spacing="0.3">Tríada</text>
</svg>`;

// Lee los datos del emisor de Configuración y devuelve SOLO las claves que el
// usuario llenó. Las vacías se omiten a propósito: así el destructuring de
// openCorporateDoc aplica el default de Tríada. Devolver '' las borraría del
// documento, que no es lo mismo que "no configurado".
export async function datosEmisor() {
  const { config } = await import('./db.js');
  const [rut, direccion, email] = await Promise.all([
    config.get('emisorRut'), config.get('emisorDireccion'), config.get('emisorEmail'),
  ]);
  const out = {};
  if (rut)       out.emisorRut       = rut;
  if (direccion) out.emisorDireccion = direccion;
  if (email)     out.emisorEmail     = email;
  return out;
}

// opts: { tipo, titulo, empresa, autor, cargo, emisorRut, emisorDireccion, emisorEmail,
//         clienteNombre, clienteRut, clienteLogo, correlativo, fecha, vigencia, bodyHtml }
export function openCorporateDoc(opts = {}) {
  const {
    tipo = 'Documento', titulo = '', empresa = 'Tríada Consultoría', autor = '', cargo = '',
    emisorRut = EMISOR.rut, emisorDireccion = EMISOR.direccion, emisorEmail = EMISOR.email,
    clienteNombre = '', clienteRut = '', clienteLogo = '',
    correlativo = '', fecha, vigencia, bodyHtml = '',
  } = opts;

  // "DOCUMENTO", no "N°": el identificador visible del documento (decisión del
  // dueño, 28-ago-2026 — el folio es el nombre del documento, no un número de fila).
  const meta = [
    correlativo   ? ['Documento', escHtml(correlativo)] : null,
    ['Fecha', formatDate(fecha || new Date().toISOString())],
    vigencia      ? ['Válido hasta', formatDate(vigencia)] : null,
    clienteNombre ? ['Cliente', escHtml(clienteNombre)] : null,
    clienteRut    ? ['RUT', escHtml(clienteRut)] : null,
  ].filter(Boolean);

  // El logo del cliente solo se acepta como data URI de PNG/JPG. Es lo único que
  // guarda `doc_logos` y evita meter una URL arbitraria en el documento.
  const logoOk = /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(clienteLogo || '');

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
  <title>${escHtml(tipo)} ${escHtml(correlativo || '')} — ${escHtml(empresa)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@400;500;600;700&family=Spectral:wght@600&display=swap" rel="stylesheet">
  <style>
    :root{
      --navy:#0E1830; --teal:#0E7C74; --oro:#BF8E24;
      --papel:#FDFCFA; --franja:#F5F4EF;
      --tinta:#12172A; --texto:#333A4C; --gris:#6E7588; --gris-2:#949BAB;
      --linea:#DFDCD3; --linea-2:#EBE8E0;
    }
    *{box-sizing:border-box}
    body{margin:0;background:var(--papel);color:var(--texto);
      font-family:'Libre Franklin',-apple-system,'Segoe UI',Arial,sans-serif;
      font-size:11.5px;line-height:1.55;-webkit-font-smoothing:antialiased}
    img{display:block;max-width:100%}
    .page{width:210mm;min-height:297mm;margin:0 auto;padding:17mm 15mm 14mm;
      background:var(--papel);display:flex;flex-direction:column}

    /* ── encabezado: TRIADA emite, el cliente acompaña ── */
    .cab{display:flex;align-items:flex-start;justify-content:space-between;gap:24px}
    .marca-t svg{height:32px;width:auto;display:block}
    .marca-t .bajada{margin-top:6px;font-size:7px;font-weight:700;letter-spacing:.22em;
      text-transform:uppercase;color:var(--teal)}
    .emisor{margin-top:11px;font-size:8.5px;line-height:1.7;color:var(--gris)}
    .emisor b{display:block;color:var(--texto);font-weight:600;font-size:9px;margin-bottom:1px}
    .marca-c{text-align:right;flex:0 0 auto;padding-top:2px;max-width:62mm}
    .marca-c .rot{margin-bottom:7px;font-size:6.5px;font-weight:700;letter-spacing:.16em;
      text-transform:uppercase;color:var(--gris-2)}
    .marca-c img{height:31px;width:auto;margin-left:auto}
    .regla{margin-top:17px;height:2px;background:var(--navy)}

    /* ── título ── */
    .titulo{margin-top:18px}
    .titulo h1{font-size:23px;font-weight:700;letter-spacing:.07em;line-height:1.1;
      color:var(--navy);margin:0;text-transform:uppercase}
    .titulo .sub{margin-top:4px;font-size:11px;color:var(--gris)}

    /* ── franja de datos ── */
    .meta{margin-top:17px;display:grid;grid-template-columns:auto auto auto 1fr auto;
      gap:0 26px;background:var(--franja);border-top:1px solid var(--linea);
      border-bottom:1px solid var(--linea);padding:14px 15px}
    .meta .k{font-size:7px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;
      color:var(--gris-2);margin-bottom:3px}
    .meta .v{font-size:11px;font-weight:600;color:var(--tinta);white-space:nowrap;
      font-variant-numeric:tabular-nums}

    /* ── tabla de ítems ── */
    table.items{width:100%;border-collapse:collapse;margin-top:26px;counter-reset:item}
    table.items th{font-size:7.5px;font-weight:700;letter-spacing:.11em;text-transform:uppercase;
      color:var(--gris);text-align:left;padding:0 0 8px;border-bottom:1.5px solid var(--navy)}
    table.items th.num{text-align:right}
    table.items td{padding:16px 0;border-bottom:1px solid var(--linea-2);font-size:11.5px;
      color:var(--texto);vertical-align:top}
    table.items td.num{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
    /* El subtotal (última columna) pesa más: es lo que el cliente busca. */
    table.items td.num:last-child{font-weight:600;color:var(--tinta)}
    table.items tbody tr:last-child td{border-bottom:1.5px solid var(--navy)}
    /* Numeración 01, 02, 03… por contador CSS: los módulos no la emiten y así no
       tienen que hacerlo. La clase .no-num la salta (fila "sin ítems", subtotales…). */
    table.items tbody tr:not(.no-num){counter-increment:item}
    table.items tbody tr:not(.no-num) td:first-child::before{
      content:counter(item,decimal-leading-zero);display:inline-block;width:19px;
      font-size:9px;font-weight:700;color:var(--oro);font-variant-numeric:tabular-nums}

    /* ── resumen financiero ── */
    .totals{width:84mm;margin:20px 0 0 auto}
    .totals .row{display:flex;justify-content:space-between;align-items:baseline;gap:20px;
      padding:11px 13px;font-size:11px;line-height:1}
    .totals .row + .row{border-top:1px solid var(--linea-2)}
    .totals .row .lbl{color:var(--texto)}
    .totals .row span:last-child{font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--tinta)}
    /* La fila destacada es un bloque oscuro: el monto final es lo más visible del
       documento. Va sola — los otros valores quedan en texto plano. */
    .totals .row.grand{margin-top:7px;background:var(--navy);color:#fff;padding:15px 14px;
      border-top:0;font-size:9.5px;font-weight:700;letter-spacing:.11em;text-transform:uppercase}
    .totals .row.grand .lbl{color:#fff}
    .totals .row.grand span:last-child{font-size:17px;letter-spacing:-.01em;color:#fff;
      text-transform:none}

    /* ── bloque destacado (plan de servicio, alcance…) ── */
    .block{margin:22px 0;padding:14px 16px;background:var(--franja);border-left:2px solid var(--teal)}
    .block h4{margin:0 0 5px;font-size:11px;font-weight:700;color:var(--navy);
      letter-spacing:.04em;text-transform:uppercase}
    .block p{margin:0;font-size:11px;color:var(--texto);white-space:pre-wrap;line-height:1.6}

    /* ── notas ── */
    .notes{margin-top:18px;font-size:9px;line-height:1.6;color:var(--gris)}
    .notes strong{color:var(--texto);font-weight:600}

    /* ── pie ──
       En FLUJO, no fijo. Un pie position:fixed se repite en cada hoja, que suena
       mejor, pero se dibuja dentro del área de contenido: hay que reservarle banda
       con el margen de @page y eso le come 26mm a la primera página — suficiente
       para que una cotización de 7 ítems se partiera en dos. Con margin-top:auto
       sobre .page en flex, el pie queda abajo en el documento de una página (que es
       el caso normal: cotización y presupuesto) y al final del contenido en uno
       largo. Sin cálculos de milímetros y sin riesgo de encimarse. */
    .foot{margin-top:auto;padding-top:12px;border-top:1px solid var(--linea);
      display:flex;justify-content:space-between;align-items:flex-end;gap:20px;
      font-size:7.5px;letter-spacing:.09em;text-transform:uppercase;color:var(--gris-2)}
    .foot b{display:block;color:var(--gris);font-weight:600;margin-bottom:2px}

    @media print{
      /* Los márgenes de @page los aplica el NAVEGADOR en todas las hojas; el
         padding de .page, solo en la primera. Por eso el margen vertical va acá:
         sin él, la página 2 de un informe arrancaba pegada al borde del papel.
         Sin márgenes laterales: los 15mm los pone .page, y así el ancho útil es
         el mismo en pantalla y en papel. */
      @page{size:A4;margin:14mm 0}
      *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
      /* Papel, no blanco: si no, entre el fin de .page y el pie fijo aparecía
         una banda blanca a lo ancho de la hoja. */
      html,body{background:var(--papel)}
      /* 14mm de @page + 3mm de padding = los 17mm de margen superior del diseño.
         min-height = A4 menos los dos márgenes de @page (297 - 28): es lo que hace
         que el pie caiga al fondo de la hoja en un documento de una sola página. */
      .page{width:auto;min-height:269mm;margin:0;padding:3mm 15mm 0}
      /* Nada de esto se puede partir a la mitad entre dos páginas. */
      table.items tr,.totals,.block,.meta,.cab{break-inside:avoid}
      table.items thead{display:table-header-group}
    }
  </style></head><body>
  <div class="page">

    <header class="cab">
      <div class="marca-t">
        ${TRIADA_MARK}
        <div class="bajada">Consultoría 360</div>
        <div class="emisor">
          <b>${escHtml(empresa)}</b>
          ${emisorRut ? `RUT ${escHtml(emisorRut)}<br>` : ''}
          ${emisorDireccion ? `${escHtml(emisorDireccion)}<br>` : ''}
          ${emisorEmail ? escHtml(emisorEmail) : ''}
        </div>
      </div>
      ${logoOk ? `<div class="marca-c">
        <div class="rot">Preparada para</div>
        <img src="${clienteLogo}" alt="${escHtml(clienteNombre || 'Cliente')}">
      </div>` : ''}
    </header>
    <div class="regla"></div>

    <div class="titulo">
      <h1>${escHtml(tipo)}</h1>
      ${titulo ? `<div class="sub">${escHtml(titulo)}</div>` : ''}
    </div>

    <div class="meta">
      ${meta.map(([k, v]) => `<div><div class="k">${k}</div><div class="v">${v}</div></div>`).join('')}
    </div>

    ${bodyHtml}

    <div class="foot">
      <div>
        <b>${escHtml(empresa)}</b>
        ${escHtml(autor)}${autor && cargo ? ' · ' : ''}${escHtml(cargo)}
      </div>
      <div>Documento generado por TRIADA CRM</div>
    </div>
  </div>
  <script>
    // Imprimir SOLO cuando estén las fuentes y las imágenes; si no, la primera
    // hoja sale con la tipografía de respaldo y el logo en blanco. El tope de 4 s
    // evita que un Google Fonts caído deje la ventana colgada sin imprimir.
    (function(){
      var listo = [ new Promise(function(r){
        if (document.readyState === 'complete') r(); else window.addEventListener('load', r);
      }) ];
      if (document.fonts && document.fonts.ready) listo.push(document.fonts.ready);
      Promise.race([
        Promise.all(listo),
        new Promise(function(r){ setTimeout(r, 4000); })
      ]).then(function(){ setTimeout(function(){ window.print(); }, 150); });
    })();
  <\/script>
  </body></html>`;

  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  return true;
}
