// ============================================================================
// pdfshare.js — utilidades compartidas para generar y COMPARTIR PDFs (cotización
// e Informe 360). Genera el PDF como ARCHIVO (html2canvas + jsPDF) y lo entrega
// al share nativo del teléfono (navigator.share con files → WhatsApp / Correo con
// el PDF adjunto). Ojo: wa.me/mailto NO adjuntan archivos → el share nativo es el
// único camino web para "enviar el PDF". Fallback: descarga + wa.me/mailto al lead.
// ============================================================================
import { openSheet } from './ui.js';

let _libs = null;
export async function loadPdfLibs() {
  if (_libs) return _libs;
  const [jspdf, h2c] = await Promise.all([
    import('https://cdn.jsdelivr.net/npm/jspdf@2.5.2/+esm'),
    import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm'),
  ]);
  _libs = { jsPDF: jspdf.jsPDF, html2canvas: h2c.default };
  return _libs;
}

// Genera un Blob PDF A4. Modos:
//  · default: captura `node` completo y lo pagina (hojas auto-contenidas, p. ej.
//    la cotización: un único nodo A4 con estilos inline).
//  · { perPage:true }: captura CADA `.report-page` hijo como una hoja A4 (informe).
//  · { windowWidth }: simula ese ancho de ventana en html2canvas → defiende del
//    breakpoint responsive de informe.css (renderiza el A4 de escritorio, no el
//    reflow móvil). Sin esto, una hoja A4 (~794px<880px) se reflowea en el móvil.
export async function nodeToA4Pdf(node, opts = {}) {
  const { jsPDF, html2canvas } = await loadPdfLibs();
  if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (_) {} }
  const base = { scale: 2, useCORS: true, logging: false };
  if (opts.windowWidth) base.windowWidth = opts.windowWidth;
  const pw = 210, ph = 297;
  const pdf = new jsPDF('p', 'mm', 'a4');

  if (opts.perPage) {
    const pages = [...node.querySelectorAll('.report-page')];
    for (let i = 0; i < pages.length; i++) {
      const canvas = await html2canvas(pages[i], base);
      const img = canvas.toDataURL('image/jpeg', 0.9);
      const imgH = canvas.height * pw / canvas.width;
      if (i > 0) pdf.addPage();
      pdf.addImage(img, 'JPEG', 0, 0, pw, Math.min(imgH, ph));
    }
  } else {
    const canvas = await html2canvas(node, base);
    const img = canvas.toDataURL('image/jpeg', 0.95);
    const imgH = canvas.height * pw / canvas.width;
    if (imgH <= ph + 2) {
      // Cabe en una hoja (tolerancia de redondeo sub-pixel); clamp para no generar
      // una 2ª página vacía ni recortar el footer.
      pdf.addImage(img, 'JPEG', 0, 0, pw, Math.min(imgH, ph));
    } else {
      let heightLeft = imgH, position = 0;
      pdf.addImage(img, 'JPEG', 0, position, pw, imgH); heightLeft -= ph;
      while (heightLeft > 2) { position = heightLeft - imgH; pdf.addPage(); pdf.addImage(img, 'JPEG', 0, position, pw, imgH); heightLeft -= ph; }
    }
  }
  return pdf.output('blob');
}

// Comparte un Blob PDF: share nativo con el archivo, o fallback (descarga +
// WhatsApp/correo al lead). lead = {telefono,email,nombre}; message = texto.
export async function shareFile(blob, filename, { lead, message } = {}) {
  const file = new File([blob], filename, { type: 'application/pdf' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename.replace(/\.pdf$/i, ''), text: message || '' });
      return 'shared';
    } catch (err) { if (err && err.name === 'AbortError') return 'cancelled'; }
  }
  // Fallback: descarga el PDF y ofrece WhatsApp/correo (adjuntar a mano).
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  fallbackSheet(lead, message);
  return 'fallback';
}

function fallbackSheet(lead, msg) {
  const phone = ((lead && lead.telefono) || '').replace(/\D/g, '');
  const email = (lead && lead.email) || '';
  const m = msg || '';
  const wa = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(m);
  const mail = 'mailto:' + encodeURIComponent(email) + '?subject=' + encodeURIComponent('Documento Grupo Tríada') + '&body=' + encodeURIComponent(m + '\n\n(Adjunto el PDF.)');
  openSheet(`<div class="sheet__body">
    <div class="sheet__title">Compartir PDF</div>
    <div style="font-size:13px;color:var(--text2);margin-bottom:14px">El PDF se descargó a tu dispositivo. Adjúntalo en tu mensaje:</div>
    <a href="${wa}" target="_blank" rel="noopener" style="display:flex;align-items:center;justify-content:center;gap:8px;height:48px;border-radius:var(--radius-sm);background:#25D366;color:#0b2e1a;font-weight:700;font-size:14px;text-decoration:none;margin-bottom:10px">WhatsApp</a>
    <a href="${mail}" style="display:flex;align-items:center;justify-content:center;gap:8px;height:48px;border-radius:var(--radius-sm);background:var(--surface);border:1px solid var(--border);color:var(--text);font-weight:700;font-size:14px;text-decoration:none">Correo</a>
  </div>`);
}
