// ============================================================================
// cotizacion.js — Cotización comercial en PDF (para enviar al cliente).
// Reutiliza el scaffolding del Informe 360: .informe-viewer + .report-page + el
// @media print de modules/informe-ejecutivo/informe.css (cargado global en
// index.html y preview.html) → misma estética Tríada (crema/petróleo/Spectral)
// y misma impresión A4. "Descargar PDF" = window.print() (en móvil: Guardar /
// Compartir como PDF). Trabaja con el estado actual de la propuesta (no requiere
// guardarla antes).
// ============================================================================
import { store, formatCLP, formatDate, todayStr } from './core.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const line = (it) => (Number(it.cantidad) || 0) * (Number(it.precioUnit) || 0);

const LOGO = (size = 32) => `<svg viewBox="0 0 120 120" fill="none" style="width:${size}px;height:${size}px;flex:none">
  <path d="M26 90 L60 62 L94 90" stroke="#3D6E92" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M26 73 L60 45 L94 73" stroke="#2F8C93" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M26 56 L60 28 L94 56" stroke="#6BA083" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const BTN = 'border-radius:9px;height:38px;padding:0 14px;font-weight:700;font-size:13px;font-family:var(--rep-sans,system-ui);cursor:pointer;display:inline-flex;align-items:center;gap:6px';
const BTN_GHOST = `${BTN};border:1px solid var(--rep-border,#E5DFD0);background:transparent;color:var(--rep-ink,#14222E)`;
const BTN_PRIMARY = `${BTN};border:0;background:#1C7A82;color:#fff`;

// Código de la cotización: usa el correlativo de la propuesta si existe; si no,
// genera uno por fecha (COT-AAAAMMDD).
function quoteCode(prop) {
  if (prop && prop.correlativo) return String(prop.correlativo);
  return 'COT-' + todayStr().replace(/-/g, '');
}

function pageHtml(prop, lead) {
  const items = (prop.servicios || []).map((it) => ({
    descripcion: (it.descripcion || '').trim() || 'Servicio',
    cantidad: Number(it.cantidad) || 1,
    precioUnit: Number(it.precioUnit) || 0,
  }));
  const sub = items.reduce((s, it) => s + line(it), 0);
  const iva = Math.round(sub * 0.19);
  const tot = sub + iva;
  const code = quoteCode(prop);
  const hoy = todayStr();
  const vig = prop.vigencia || hoy;

  const emisorNombre = (store.profile && store.profile.nombre) || 'Equipo Tríada';
  const emisorCargo = (store.profile && store.profile.rol) || 'Consultoría Estratégica';
  const emisorEmail = (store.user && store.user.email) || 'contacto@grupotriada.cl';

  const clienteTitulo = lead && (lead.empresa || lead.nombre) ? esc(lead.empresa || lead.nombre) : 'Cliente';
  const clienteLinea = (lbl, val) => val ? `<div style="font-size:12.5px;color:var(--rep-body);margin-top:2px">${lbl ? `<span style="color:var(--rep-faint)">${lbl}: </span>` : ''}${esc(val)}</div>` : '';

  const rows = items.map((it) => `
    <tr style="border-bottom:1px solid var(--rep-border);break-inside:avoid">
      <td style="padding:11px 12px;font-size:13px;color:var(--rep-ink);line-height:1.45">${esc(it.descripcion)}</td>
      <td style="text-align:center;padding:11px 8px;font-size:13px;color:var(--rep-body)">${it.cantidad}</td>
      <td style="text-align:right;padding:11px 10px;font-size:13px;color:var(--rep-body);white-space:nowrap">${formatCLP(it.precioUnit)}</td>
      <td style="text-align:right;padding:11px 12px;font-size:13px;font-weight:600;color:var(--rep-ink);white-space:nowrap">${formatCLP(line(it))}</td>
    </tr>`).join('');

  return `
  <div class="report-page" style="gap:0">
    <!-- Encabezado -->
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

    <!-- De / Para -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:13px;margin-bottom:24px">
      <div style="background:var(--rep-cream);border:1px solid var(--rep-border);border-radius:10px;padding:14px 16px;break-inside:avoid">
        <div style="font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--rep-faint);margin-bottom:7px">De</div>
        <div style="font-family:var(--rep-serif);font-size:15px;font-weight:600;color:var(--rep-ink)">Grupo Tríada</div>
        <div style="font-size:12.5px;color:var(--rep-body);margin-top:3px">${esc(emisorNombre)} · ${esc(emisorCargo)}</div>
        <div style="font-size:12.5px;color:var(--rep-body)">${esc(emisorEmail)}</div>
        <div style="font-size:12.5px;color:var(--rep-body)">grupotriada.cl</div>
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

    <!-- Ítems -->
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

    <!-- Totales -->
    <div style="display:flex;justify-content:flex-end;margin-bottom:22px;break-inside:avoid">
      <div style="width:270px">
        <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:var(--rep-body)"><span>Subtotal</span><span class="tabular">${formatCLP(sub)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:var(--rep-body);border-bottom:1px solid var(--rep-border)"><span>IVA 19%</span><span class="tabular">${formatCLP(iva)}</span></div>
        <div style="display:flex;justify-content:space-between;align-items:baseline;padding:11px 0 0"><span style="font-size:14px;font-weight:700;color:var(--rep-ink)">Total</span><span style="font-family:var(--rep-serif);font-size:25px;font-weight:600;color:var(--rep-teal)">${formatCLP(tot)}</span></div>
      </div>
    </div>

    <!-- Vigencia -->
    <div style="background:var(--rep-teal-l);border:1px solid var(--rep-teal-2);border-radius:9px;padding:11px 14px;margin-bottom:20px;font-size:12.5px;color:var(--rep-petrol-2);break-inside:avoid">
      Esta cotización es válida hasta el <b>${esc(formatDate(vig))}</b>.
    </div>

    <!-- Términos y condiciones -->
    <div style="break-inside:avoid">
      <div style="font-family:var(--rep-serif);font-size:15px;font-weight:600;color:var(--rep-ink);margin-bottom:9px">Términos y condiciones</div>
      <ol style="margin:0;padding-left:18px;font-size:11.5px;color:var(--rep-body);line-height:1.7">
        <li>Los valores están expresados en pesos chilenos (CLP); el IVA (19%) se detalla en el total.</li>
        <li>Esta cotización tiene validez hasta la fecha indicada; pasado ese plazo los valores pueden ser actualizados.</li>
        <li>La forma y los plazos de pago se acuerdan entre las partes al momento de aceptar la cotización.</li>
        <li>Los trabajos se inician una vez aceptada formalmente esta cotización.</li>
        <li>Todo requerimiento fuera del alcance descrito se cotiza por separado.</li>
        <li>La aceptación de esta cotización puede realizarse por medios electrónicos.</li>
      </ol>
    </div>

    <!-- Footer -->
    <div class="report-footer">
      <span class="rf-brand">Grupo Tríada · Consultoría Estratégica</span>
      <span class="rf-code">${esc(code)}</span>
    </div>
  </div>`;
}

// Abre el visor a pantalla completa con la cotización A4. "Descargar PDF" usa
// window.print(): en móvil el diálogo del sistema permite Guardar/Compartir como PDF.
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
        <button id="ctzPrint" style="${BTN_PRIMARY}">Descargar PDF</button>
      </div>
    </div>
    <div class="report-scroll"><div class="report-doc">${pageHtml(propuesta, lead)}</div></div>`;
  document.body.appendChild(v);
  document.body.classList.add('has-report-open');

  v.querySelector('#ctzClose').onclick = () => { v.remove(); document.body.classList.remove('has-report-open'); };
  v.querySelector('#ctzPrint').onclick = () => window.print();
  const sc = v.querySelector('.report-scroll'); if (sc) sc.scrollTop = 0;
}
