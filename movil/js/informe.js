// ============================================================================
// informe.js — ⭐ Informe Ejecutivo 360 en PDF (para enviar al cliente).
// Reutiliza LITERALMENTE el motor del escritorio: computeInforme (8 páginas,
// gráficos SVG, narrativa) + buildReportDoc + la piel informe.css (cargada en el
// HTML). El PDF sale IDÉNTICO al de PC. Aquí solo va el visor con chrome móvil.
// El @media print de informe.css aísla el informe y pagina en A4.
// ============================================================================
import { computeInforme } from '../../modules/informe-ejecutivo/informe.engine.js';
import { buildReportDoc } from '../../modules/informe-ejecutivo/informe.view.js';
import { store, db } from './core.js';
import { toast } from './ui.js';
import { nodeToA4Pdf, shareFile } from './pdfshare.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const LOGO_TRI = `<svg viewBox="0 0 120 120" fill="none" style="width:32px;height:32px;flex:none">
  <path d="M26 90 L60 62 L94 90" stroke="#3D6E92" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M26 73 L60 45 L94 73" stroke="#2F8C93" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M26 56 L60 28 L94 56" stroke="#6BA083" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
const BTN = 'border-radius:9px;height:38px;padding:0 14px;font-weight:700;font-size:13px;font-family:var(--rep-sans,system-ui);cursor:pointer;display:inline-flex;align-items:center;gap:6px';
const BTN_GHOST = `${BTN};border:1px solid var(--rep-border,#E5DFD0);background:transparent;color:var(--rep-ink,#14222E)`;
const BTN_PRIMARY = `${BTN};border:0;background:#1C7A82;color:#fff`;

// Abre el visor a pantalla completa con las 8 páginas A4. "Descargar PDF" usa
// window.print(): en móvil el diálogo del sistema permite Guardar/Compartir como PDF.
export function openInforme(diag, prospecto, evaluador) {
  const rep = computeInforme(diag, prospecto, evaluador);

  const prev = document.getElementById('informeViewer');
  if (prev) prev.remove();

  const v = document.createElement('div');
  v.id = 'informeViewer';
  v.className = 'informe-viewer';
  v.innerHTML = `
    <div class="report-toolbar">
      <div class="rt-left">${LOGO_TRI}<div><div class="rt-name">Informe Ejecutivo 360</div><div class="rt-meta">${esc(rep.empresa)} · ${esc(rep.codigo)}</div></div></div>
      <div class="rt-actions">
        <button id="rtClose" style="${BTN_GHOST}">Cerrar</button>
        <button id="rtShare" style="${BTN_GHOST}">Compartir</button>
        <button id="rtPrint" style="${BTN_PRIMARY}">Descargar PDF</button>
      </div>
    </div>
    <div class="report-scroll"><div class="report-doc">${buildReportDoc(rep)}</div></div>`;
  document.body.appendChild(v);
  document.body.classList.add('has-report-open');

  v.querySelector('#rtClose').onclick = () => { v.remove(); document.body.classList.remove('has-report-open'); };
  v.querySelector('#rtPrint').onclick = () => window.print();
  v.querySelector('#rtShare').onclick = () => shareInforme(rep, prospecto);
  const sc = v.querySelector('.report-scroll'); if (sc) sc.scrollTop = 0;
  return rep;
}

// Genera el PDF del informe (8 hojas A4) y lo entrega al share nativo del teléfono
// (WhatsApp/Correo con el archivo adjunto). Captura cada `.report-page` con
// windowWidth=1120 para forzar el layout A4 de escritorio (informe.css se reflowea
// en móvil). Es pesado (8 hojas) → toast de "preparando". Fallback en shareFile.
async function shareInforme(rep, prospecto) {
  const v = document.getElementById('informeViewer');
  const doc = v && v.querySelector('.report-doc');
  if (!doc) { toast('Abre el informe primero', 'err'); return; }
  // El informe son 8 hojas → la generación tarda varios segundos. Estado de carga
  // en el botón para que no parezca colgado (el toast se desvanece solo).
  const btn = v.querySelector('#rtShare');
  const label = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.style.opacity = '.6'; btn.textContent = 'Preparando…'; }
  toast('Preparando el informe… puede tardar unos segundos', 'info');
  let blob;
  try {
    blob = await nodeToA4Pdf(doc, { perPage: true, windowWidth: 1120 });
  } catch (err) {
    console.error('informe pdf', err);
    toast('No se pudo generar el PDF del informe', 'err');
    return;
  } finally {
    if (btn) { btn.disabled = false; btn.style.opacity = ''; btn.textContent = label; }
  }
  const nombre = (prospecto && prospecto.nombre) ? prospecto.nombre.split(/\s+/)[0] : '';
  const msg = `Hola${nombre ? ' ' + nombre : ''}, te comparto el Informe Ejecutivo 360 de Grupo Tríada${rep.codigo ? ' (' + rep.codigo + ')' : ''}.`;
  await shareFile(blob, `Informe-360-${rep.codigo || 'Triada'}.pdf`, { lead: prospecto, message: msg });
}

// Carga el diagnóstico (+ prospecto + evaluador desde el perfil) y abre el informe.
export async function openInformeByDiagId(diagId) {
  try {
    const diag = await db.diagnosticos.get(diagId);
    if (!diag) { toast('Diagnóstico no encontrado', 'err'); return; }
    const prospecto = diag.prospectoId ? await db.prospectos.get(diag.prospectoId).catch(() => null) : null;
    const evaluador = {
      nombre: (store.profile && store.profile.nombre) || 'Equipo Tríada',
      cargo: (store.profile && store.profile.rol) || 'Consultoría Estratégica',
      empresa: 'Tríada',
    };
    openInforme(diag, prospecto, evaluador);
  } catch (err) { console.error('informe', err); toast('No se pudo abrir el informe', 'err'); }
}
