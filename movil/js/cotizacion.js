// ============================================================================
// cotizacion.js — Cotización comercial en PDF (para enviar al cliente).
// VISOR: reutiliza el scaffolding del Informe 360 (.informe-viewer + .report-page
// + el @media print de informe.css, cargado global) → estética Tríada idéntica.
// "Descargar PDF" = window.print() (A4 vector, nítido).
// "Compartir" = genera el PDF como ARCHIVO (html2canvas + jsPDF desde una hoja A4
// auto-contenida, sin la CSS responsive) y lo pasa al share nativo del teléfono
// (navigator.share con files → WhatsApp / Correo / etc. con el PDF adjunto).
// Ojo: wa.me y mailto NO permiten adjuntar archivos; el share nativo es el único
// camino web para "enviar el PDF". Fallback: descarga + wa.me/mailto con texto.
// ============================================================================
import { store, formatCLP, formatDate, todayStr } from './core.js';
import { toast } from './ui.js';
import { nodeToA4Pdf, shareFile } from './pdfshare.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const line = (it) => (Number(it.cantidad) || 0) * (Number(it.precioUnit) || 0);

// Contacto oficial (espejo de triada-home/inc/config.php).
const TRIADA_EMAIL = 'contacto@grupotriada.cl';
const TRIADA_WA_DISPLAY = '+56 9 6812 9791';
const TRIADA_WA_DIGITS = '56968129791';

// Variables de marca (informe.css .informe-viewer) para la hoja A4 auto-contenida
// que se rasteriza al compartir (fuera de .informe-viewer no heredaría los tokens).
const REP_VARS = "--rep-serif:'Spectral',Georgia,serif;--rep-sans:'Libre Franklin',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;--rep-paper:#FBF9F3;--rep-cream:#F4F1E9;--rep-ink:#14222E;--rep-body:#46555F;--rep-muted:#6B7780;--rep-faint:#8A90A3;--rep-border:#E5DFD0;--rep-petrol:#0C1B26;--rep-petrol-2:#143A4A;--rep-teal:#1C7A82;--rep-teal-2:#7FD0CC;--rep-teal-l:#E6F1F0";

const LOGO = (size = 32) => `<svg viewBox="0 0 120 120" fill="none" style="width:${size}px;height:${size}px;flex:none">
  <path d="M26 90 L60 62 L94 90" stroke="#3D6E92" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"></path>
  <path d="M26 73 L60 45 L94 73" stroke="#2F8C93" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"></path>
  <path d="M26 56 L60 28 L94 56" stroke="#6BA083" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"></path>
</svg>`;

const BTN = 'border-radius:9px;height:38px;padding:0 14px;font-weight:700;font-size:13px;font-family:var(--rep-sans,system-ui);cursor:pointer;display:inline-flex;align-items:center;gap:6px';
const BTN_GHOST = `${BTN};border:1px solid var(--rep-border,#E5DFD0);background:transparent;color:var(--rep-ink,#14222E)`;
const BTN_PRIMARY = `${BTN};border:0;background:#1C7A82;color:#fff`;

// Términos y condiciones — reflejan los del sitio (grupotriada.cl/terminos):
// abono 50% inicial, 50% restante, facturación, kickoff, renovación mensual.
const TYC = [
  '<b>Abono inicial del 50%.</b> Para reservar el cupo, activar la facturación y dar inicio formal al onboarding, se solicita un abono equivalente al 50% del valor total del servicio.',
  '<b>50% restante.</b> El saldo se paga antes de la activación / puesta en marcha del servicio.',
  'Los valores están expresados en pesos chilenos (CLP); el IVA (19%) se detalla en el total. Se emite la documentación tributaria correspondiente conforme a la normativa vigente en Chile.',
  'Esta cotización es válida hasta la fecha indicada; pasado ese plazo los valores pueden ser actualizados.',
  'El servicio comienza una vez confirmado el abono y realizada la reunión de kickoff (alineación de objetivos, accesos y expectativas).',
  'Los servicios de continuidad se renuevan mensualmente para mantener el servicio activo, según el plan contratado.',
  'Todo requerimiento fuera del alcance descrito se cotiza por separado; la información compartida se trata de forma confidencial.',
  'Los valores y la periodicidad definitivos quedan establecidos en el contrato firmado entre las partes. Términos completos en grupotriada.cl/terminos.',
];

function quoteCode(prop) {
  if (prop && prop.correlativo) return String(prop.correlativo);
  return 'COT-' + todayStr().replace(/-/g, '');
}

function computeTotals(prop) {
  const items = (prop.servicios || []).map((it) => ({
    descripcion: (it.descripcion || '').trim() || 'Servicio',
    cantidad: Number(it.cantidad) || 1,
    precioUnit: Number(it.precioUnit) || 0,
  }));
  const sub = items.reduce((s, it) => s + line(it), 0);
  const iva = Math.round(sub * 0.19);
  return { items, sub, iva, tot: sub + iva };
}

// Contenido de la cotización (sin el contenedor de página). Usa var(--rep-*),
// así que debe vivir dentro de algo que los defina (.informe-viewer o REP_VARS).
function pageInner(prop, lead) {
  const { items, sub, iva, tot } = computeTotals(prop);
  const code = quoteCode(prop);
  const hoy = todayStr();
  const vig = prop.vigencia || hoy;
  const emisorNombre = (store.profile && store.profile.nombre) || 'Equipo Tríada';
  const emisorCargo = (store.profile && store.profile.rol) || 'Consultoría Estratégica';

  const clienteTitulo = lead && (lead.empresa || lead.nombre) ? esc(lead.empresa || lead.nombre) : 'Cliente';
  const clienteLinea = (lbl, val) => val ? `<div style="font-size:12.5px;color:var(--rep-body);margin-top:2px">${lbl ? `<span style="color:var(--rep-faint)">${lbl}: </span>` : ''}${esc(val)}</div>` : '';

  const rows = items.map((it) => `
    <tr style="border-bottom:1px solid var(--rep-border);break-inside:avoid">
      <td style="padding:11px 12px;font-size:13px;color:var(--rep-ink);line-height:1.45">${esc(it.descripcion)}</td>
      <td style="text-align:center;padding:11px 8px;font-size:13px;color:var(--rep-body)">${it.cantidad}</td>
      <td style="text-align:right;padding:11px 10px;font-size:13px;color:var(--rep-body);white-space:nowrap">${formatCLP(it.precioUnit)}</td>
      <td style="text-align:right;padding:11px 12px;font-size:13px;font-weight:600;color:var(--rep-ink);white-space:nowrap">${formatCLP(line(it))}</td>
    </tr>`).join('');

  const tyc = TYC.map((t) => `<li style="margin-bottom:4px">${t}</li>`).join('');

  return `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid var(--rep-petrol);padding-bottom:16px;margin-bottom:22px">
      <div style="display:flex;align-items:center;gap:12px">
        ${LOGO(38)}
        <div>
          <div style="font-family:var(--rep-serif);font-size:22px;font-weight:600;color:var(--rep-ink);letter-spacing:.03em">Grupo Tríada</div>
          <div style="font-size:11px;color:var(--rep-muted);letter-spacing:.1em;text-transform:uppercase">Consultoría Estratégica</div>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-family:var(--rep-serif);font-size:25px;font-weight:600;color:var(--rep-teal);letter-spacing:.02em">Cotización</div>
        <div style="font-family:var(--rep-sans);font-size:12px;color:var(--rep-muted);margin-top:5px">N° ${esc(code)}</div>
        <div style="font-size:12px;color:var(--rep-muted)">Fecha: ${esc(formatDate(hoy))}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:13px;margin-bottom:24px">
      <div style="background:var(--rep-cream);border:1px solid var(--rep-border);border-radius:10px;padding:14px 16px;break-inside:avoid">
        <div style="font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--rep-faint);margin-bottom:7px">De</div>
        <div style="font-family:var(--rep-serif);font-size:15px;font-weight:600;color:var(--rep-ink)">Grupo Tríada</div>
        <div style="font-size:12.5px;color:var(--rep-body);margin-top:3px">${esc(emisorNombre)} · ${esc(emisorCargo)}</div>
        <div style="font-size:12.5px;color:var(--rep-body)">${TRIADA_EMAIL}</div>
        <div style="font-size:12.5px;color:var(--rep-body)">${TRIADA_WA_DISPLAY} · grupotriada.cl</div>
      </div>
      <div style="background:var(--rep-cream);border:1px solid var(--rep-border);border-radius:10px;padding:14px 16px;break-inside:avoid">
        <div style="font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--rep-faint);margin-bottom:7px">Para</div>
        <div style="font-family:var(--rep-serif);font-size:15px;font-weight:600;color:var(--rep-ink)">${clienteTitulo}</div>
        ${lead && lead.nombre && lead.empresa ? clienteLinea('', lead.nombre) : ''}
        ${clienteLinea('RUT', lead && lead.rut)}
        ${clienteLinea('', lead && lead.email)}
        ${clienteLinea('', lead && lead.telefono)}
      </div>
    </div>

    <table style="width:100%;table-layout:fixed;border-collapse:collapse;margin-bottom:18px;font-family:var(--rep-sans)">
      <thead>
        <tr style="background:var(--rep-petrol);color:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact">
          <th style="text-align:left;padding:10px 12px;font-size:10.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;width:46%">Descripción</th>
          <th style="text-align:center;padding:10px 8px;font-size:10.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;width:12%">Cant.</th>
          <th style="text-align:right;padding:10px 10px;font-size:10.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;width:21%">Precio unit.</th>
          <th style="text-align:right;padding:10px 12px;font-size:10.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;width:21%">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div style="display:flex;justify-content:flex-end;margin-bottom:20px;break-inside:avoid">
      <div style="width:270px">
        <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:var(--rep-body)"><span>Subtotal</span><span>${formatCLP(sub)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:var(--rep-body);border-bottom:1px solid var(--rep-border)"><span>IVA 19%</span><span>${formatCLP(iva)}</span></div>
        <div style="display:flex;justify-content:space-between;align-items:baseline;padding:11px 0 0"><span style="font-size:14px;font-weight:700;color:var(--rep-ink)">Total</span><span style="font-family:var(--rep-serif);font-size:25px;font-weight:600;color:var(--rep-teal)">${formatCLP(tot)}</span></div>
      </div>
    </div>

    <div style="background:var(--rep-teal-l);border:1px solid var(--rep-teal-2);border-radius:9px;padding:11px 14px;margin-bottom:18px;font-size:12.5px;color:var(--rep-petrol-2);break-inside:avoid">
      Esta cotización es válida hasta el <b>${esc(formatDate(vig))}</b>.
    </div>

    <div style="break-inside:avoid">
      <div style="font-family:var(--rep-serif);font-size:15px;font-weight:600;color:var(--rep-ink);margin-bottom:8px">Términos y condiciones</div>
      <ol style="margin:0;padding-left:18px;font-size:11px;color:var(--rep-body);line-height:1.55">${tyc}</ol>
    </div>

    <div style="margin-top:auto;padding-top:16px;border-top:1px solid var(--rep-border);display:flex;justify-content:space-between;align-items:center;font-size:10.5px;color:var(--rep-faint);letter-spacing:.03em">
      <span style="font-weight:600;color:var(--rep-muted)">Grupo Tríada · Consultoría Estratégica</span>
      <span style="font-family:'Libre Franklin',monospace;letter-spacing:.04em">${esc(code)}</span>
    </div>`;
}

// ── Visor a pantalla completa ───────────────────────────────────────────────
export function openCotizacion(propuesta, lead) {
  const prev = document.getElementById('cotizacionViewer');
  if (prev) prev.remove();

  const code = quoteCode(propuesta);
  const v = document.createElement('div');
  v.id = 'cotizacionViewer';
  v.className = 'informe-viewer';
  v.innerHTML = `
    <div class="report-toolbar">
      <div class="rt-left">${LOGO(32)}<div><div class="rt-name">Cotización</div><div class="rt-meta">${esc((lead && (lead.empresa || lead.nombre)) || 'Sin prospecto')} · ${esc(code)}</div></div></div>
      <div class="rt-actions">
        <button id="ctzClose" style="${BTN_GHOST}">Cerrar</button>
        <button id="ctzShare" style="${BTN_GHOST}">Compartir</button>
        <button id="ctzPrint" style="${BTN_PRIMARY}">Descargar PDF</button>
      </div>
    </div>
    <div class="report-scroll"><div class="report-doc"><div class="report-page" style="gap:0">${pageInner(propuesta, lead)}</div></div></div>`;
  document.body.appendChild(v);
  document.body.classList.add('has-report-open');

  v.querySelector('#ctzClose').onclick = () => { v.remove(); document.body.classList.remove('has-report-open'); };
  v.querySelector('#ctzPrint').onclick = () => window.print();
  v.querySelector('#ctzShare').onclick = () => shareCotizacion(propuesta, lead);
  const sc = v.querySelector('.report-scroll'); if (sc) sc.scrollTop = 0;
}

// ── Generación del PDF + compartir (vía pdfshare.js) ────────────────────────
async function generatePdfBlob(prop, lead) {
  // Hoja A4 auto-contenida (794×1123px @96dpi): tokens --rep-* inline + SIN la
  // clase .report-page → la media query responsive de informe.css no la afecta.
  const holder = document.createElement('div');
  holder.style.cssText = 'position:fixed;left:-10000px;top:0;z-index:-1;pointer-events:none';
  holder.innerHTML = `<div id="ctzCapture" style="${REP_VARS};width:794px;min-height:1123px;box-sizing:border-box;background:var(--rep-paper);color:var(--rep-ink);padding:83px 76px 60px;font-family:var(--rep-sans);display:flex;flex-direction:column">${pageInner(prop, lead)}</div>`;
  document.body.appendChild(holder);
  try {
    return await nodeToA4Pdf(holder.firstElementChild);
  } finally {
    holder.remove();
  }
}

// Genera el PDF y lo entrega al share nativo del teléfono (WhatsApp/Correo con el
// archivo adjunto); fallback (descarga + wa.me/mailto al lead) vive en shareFile.
export async function shareCotizacion(prop, lead) {
  toast('Preparando la cotización…', 'info');
  let blob;
  try {
    blob = await generatePdfBlob(prop, lead);
  } catch (err) {
    console.error('cotizacion pdf', err);
    toast('No se pudo generar el PDF de la cotización', 'err');
    return;
  }
  const code = quoteCode(prop);
  const { tot } = computeTotals(prop);
  const nombre = (lead && lead.nombre) ? lead.nombre.split(/\s+/)[0] : '';
  const msg = `Hola${nombre ? ' ' + nombre : ''}, te comparto la cotización de Grupo Tríada (N° ${code}) por ${formatCLP(tot)}.`;
  await shareFile(blob, `Cotizacion-${code}.pdf`, { lead, message: msg });
}
