// modules/contratos/contratos.js
// Módulo Contratos — Fases 1+2 (piloto Asesoría + persistencia multitenant).
//
// Genera contratos a partir de las MISMAS plantillas de la fábrica de escritorio
// (05-VENTAS/_fuente), vendorizadas autocontenidas por _herramientas/vendor-contratos.py:
// la plantilla trae el CSS triada-doc.css y las fuentes woff2 embebidas, y cada campo
// <span class="fill"> anotado con data-k. Aquí se rellenan por clave (textContent → sin
// inyección), se previsualiza en un iframe con la MISMA hoja A4 y se exporta:
//   · "Imprimir PDF"  → window.print() de Chrome (mismo motor Blink que render.py). Día a día.
//   · "Descargar HTML para la fábrica" → HTML autocontenido y poblado, para render.py (Nivel 2,
//     el ejemplar pixel-exacto que se firma).
//
// Fase 2 persiste en Supabase (tabla public.contratos, RLS multitenant, bucket 'contratos',
// correlativo por (org,tipo)). Si la migración supabase/contratos.sql aún NO se aplicó, el
// módulo degrada con gracia: deja generar/previsualizar/exportar, pero no guardar.
//
// Convenciones de la casa: sin onclick inline con variables; cableado por delegación.
import { contratos as contratosDB } from '../../js/db.js';
import { escHtml, formatDate, toast } from '../../js/utils.js';
import { S } from '../../js/state.js';
import { TEMPLATES } from './plantillas/schemas.js';

const _i = (n, s) => (window.icon ? window.icon(n, '', s) : '');

// ── Datos fijos de Tríada (parte "Asesor"; solo el RUT del rep. es campo) ──────
const PROVEEDOR = {
  razon_social: 'TRIADA GESTIÓN Y DESARROLLO EMPRESARIAL SpA',
  rut: '78.450.911-7',
  representante: 'Martín Jacques',
  representante_rut: '19.807.642-2', // MARTÍN ALEJANDRO JACQUES VENEGAS (confirmado por el dueño)
};

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// ── Registro de plantillas (crecerá a las 9 en fases siguientes) ───────────────
const tplById = (id) => TEMPLATES.find((t) => t.id === id);

// ── Estado del módulo ──────────────────────────────────────────────────────────
const _state = { tplId: null, values: {}, editId: null, editEstado: null, persistOk: true, list: [], tplHtmlCache: {} };
let _debounce = null;

// ── Formato ──────────────────────────────────────────────────────────────────
const onlyDigits = (s) => String(s ?? '').replace(/\D+/g, '');
function fmtCLP(n) { return Number.isFinite(n) ? '$' + Math.round(n).toLocaleString('es-CL') : ''; }
function parseMoney(s) { const d = onlyDigits(s); return d ? parseInt(d, 10) : 0; }
function todayISO() {
  const t = new Date(), p = (x) => String(x).padStart(2, '0');
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
}
function rutValido(rut) {
  const clean = String(rut || '').replace(/[.\-\s]/g, '').toUpperCase();
  if (clean.length < 2) return null;
  const cuerpo = clean.slice(0, -1), dv = clean.slice(-1);
  if (!/^\d+$/.test(cuerpo)) return false;
  let suma = 0, mul = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) { suma += parseInt(cuerpo[i], 10) * mul; mul = mul === 7 ? 2 : mul + 1; }
  const res = 11 - (suma % 11);
  const dvEsp = res === 11 ? '0' : res === 10 ? 'K' : String(res);
  return dv === dvEsp;
}
function slug(s) {
  return String(s || 'cliente').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'cliente';
}

// ── Derivar campos calculados (según tpl.computed: fecha + montos) ───────────────
function derive(values, tpl) {
  const d = { proveedor_representante_rut: PROVEEDOR.representante_rut, ...values };
  const c = (tpl && tpl.computed) || {};
  // Montos: del neto base se calcula IVA (19%) y total; mirrorKeys muestran el mismo neto.
  if (c.money && c.money.baseKey) {
    const neto = parseMoney(values[c.money.baseKey]);
    const todos = [c.money.baseKey, ...(c.money.mirrorKeys || []), ...(c.money.ivaKeys || []), ...(c.money.totalKeys || [])];
    if (neto > 0) {
      const iva = Math.round(neto * 0.19);
      d[c.money.baseKey] = fmtCLP(neto);
      (c.money.mirrorKeys || []).forEach((k) => { d[k] = fmtCLP(neto); });
      (c.money.ivaKeys || []).forEach((k) => { d[k] = fmtCLP(iva); });
      (c.money.totalKeys || []).forEach((k) => { d[k] = fmtCLP(neto + iva); });
    } else { todos.forEach((k) => { d[k] = ''; }); }
  }
  // Fecha: del input date salen día / mes / forma larga.
  const dk = c.dateInput || 'fecha';
  if (values[dk]) {
    const [y, m, dd] = values[dk].split('-').map(Number);
    if (y && m && dd) { d.fecha_dia = String(dd); d.fecha_mes = MESES[m - 1] || ''; d.fecha_anio = String(y); d.fecha_larga = `${dd} de ${MESES[m - 1] || ''} de ${y}`; }
  }
  return d;
}

// ── Fusión (textContent = anti-XSS) ─────────────────────────────────────────────
function mergeHtml(templateHtml, values, tpl) {
  const doc = new DOMParser().parseFromString(templateHtml, 'text/html');
  const d = derive(values, tpl);
  doc.querySelectorAll('[data-k]').forEach((el) => {
    const v = d[el.getAttribute('data-k')];
    if (v != null && String(v).trim() !== '') el.textContent = v;
  });
  return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
}

async function loadTemplate(tpl) {
  if (_state.tplHtmlCache[tpl.id]) return _state.tplHtmlCache[tpl.id];
  const res = await fetch(new URL(`./plantillas/${tpl.file}`, import.meta.url));
  if (!res.ok) throw new Error(`No se pudo cargar la plantilla (${res.status})`);
  const html = await res.text();
  _state.tplHtmlCache[tpl.id] = html;
  return html;
}

// ════════════════════════════════════════════════════════════════════════════════
// RENDER PRINCIPAL — lista de contratos + entrada a "Nuevo contrato"
// ════════════════════════════════════════════════════════════════════════════════
export async function render() {
  const center = document.getElementById('center');
  center.innerHTML = `<div class="view-animate"><div class="ct-loading">Cargando contratos…</div></div>`;

  let list = [], persistOk = true, persistErr = '';
  try { list = await contratosDB.getAll(); }
  catch (err) { persistOk = false; persistErr = err?.message || 'Sin conexión'; }
  _state.persistOk = persistOk; _state.list = list;

  const borradores = list.filter((c) => c.estado === 'borrador').length;
  const emitidos = list.filter((c) => c.estado !== 'borrador').length;

  center.innerHTML = `<div class="view-animate contratos-view">
    <div class="section-head">
      <div>
        <h2>Contratos</h2>
        <p class="ct-sub">Genera contratos con la plantilla de la marca y expórtalos en PDF estandarizado.</p>
      </div>
      <button class="btn btn-primary" data-ct="new">${_i('plus', 16)} Nuevo contrato</button>
    </div>

    ${persistOk ? '' : `<div class="ct-banner ct-banner--warn">
      ${_i('alert', 18)}
      <div><strong>Guardado no activado todavía.</strong> Aplica la migración
      <code>supabase/contratos.sql</code> en Supabase para guardar y listar contratos.
      Mientras tanto puedes crear, previsualizar y exportar (no se guardan).
      <span class="ct-banner__err">${escHtml(persistErr)}</span></div>
    </div>`}

    ${persistOk ? `<div class="kpi-grid" style="margin:4px 0 20px">
      <div class="kpi-card"><div class="kpi-top"><span class="kpi-label">Contratos</span><span class="kpi-ic" style="background:var(--primary-l);color:var(--primary)">${_i('fileText')}</span></div><div class="kpi-value">${list.length}</div><div class="kpi-sub">En total</div></div>
      <div class="kpi-card"><div class="kpi-top"><span class="kpi-label">Borradores</span><span class="kpi-ic" style="background:var(--surface3);color:var(--text2)">${_i('pencil')}</span></div><div class="kpi-value">${borradores}</div><div class="kpi-sub">Sin emitir</div></div>
      <div class="kpi-card"><div class="kpi-top"><span class="kpi-label">Emitidos</span><span class="kpi-ic" style="background:var(--green-l);color:var(--green)">${_i('fileCheck')}</span></div><div class="kpi-value">${emitidos}</div><div class="kpi-sub">Con folio</div></div>
    </div>` : ''}

    ${(!persistOk || list.length === 0)
      ? `<h3 class="ct-h3">Elegir plantilla</h3>
         <div class="ct-tpl-grid">
           ${TEMPLATES.map(_tplCard).join('')}
           <article class="ct-tpl-card ct-tpl-card--soon"><div class="ct-tpl-card__ic">${_i('clock', 20)}</div><div class="ct-tpl-card__nm">Sitio web · Landing · App · SaaS · Mantención · Marco · NDA · Anexo datos · Impulsa</div><div class="ct-tpl-card__desc">Se suman en las próximas fases.</div></article>
         </div>`
      : `<div class="ct-list">${list.map(_row).join('')}</div>`}
  </div>`;

  center.querySelector('.contratos-view').addEventListener('click', _onMainClick);
}

function _tplCard(tpl) {
  return `<article class="ct-tpl-card" data-tpl="${escHtml(tpl.id)}" role="button" tabindex="0">
    <div class="ct-tpl-card__ic ct-tpl-card__ic--on">${_i(tpl.icon, 20)}</div>
    <div class="ct-tpl-card__nm">${escHtml(tpl.nombre)}</div>
    <div class="ct-tpl-card__desc">${escHtml(tpl.desc)}</div>
    <div class="ct-tpl-card__cta">${_i('arrowR', 15)} Crear contrato</div>
  </article>`;
}

const ESTADO_META = {
  borrador: { label: 'Borrador', cls: 'is-borrador' },
  emitido: { label: 'Emitido', cls: 'is-emitido' },
  firmado: { label: 'Firmado', cls: 'is-firmado' },
  anulado: { label: 'Anulado', cls: 'is-anulado' },
};
function _row(c) {
  const est = ESTADO_META[c.estado] || ESTADO_META.borrador;
  const tpl = tplById(c.tipo);
  const nombre = tpl ? tpl.nombre : c.tipo;
  const draft = c.estado === 'borrador';
  return `<article class="ct-item" data-id="${c.id}">
    <div class="ct-item__ic">${_i('fileText', 20)}</div>
    <div class="ct-item__main">
      <div class="ct-item__title">${escHtml(c.correlativo || 'Sin folio')} · Contrato de ${escHtml(nombre)}</div>
      <div class="ct-item__meta">
        <span class="ct-badge ${est.cls}">${est.label}</span>
        <span>${escHtml(c.clienteNombre || 'Sin cliente')}</span>
        <span>${escHtml(formatDate(c.fecha))}</span>
      </div>
    </div>
    <div class="ct-item__actions">
      ${draft
        ? `<button class="btn btn-ghost btn-sm" data-act="edit" data-id="${c.id}">${_i('pencil', 15)} Editar</button>`
        : `<button class="btn btn-ghost btn-sm" data-act="view" data-id="${c.id}">${_i('eye', 15)} Ver</button>`}
      <button class="btn-icon btn-sm" data-act="download" data-id="${c.id}" title="Descargar HTML para la fábrica">${_i('download', 15)}</button>
      ${draft ? `<button class="btn-icon btn-sm" data-act="delete" data-id="${c.id}" title="Eliminar borrador" style="color:var(--danger)">${_i('trash', 15)}</button>` : ''}
    </div>
  </article>`;
}

async function _onMainClick(e) {
  const nw = e.target.closest('[data-ct="new"]');
  if (nw) { _openTemplatePicker(); return; }
  const card = e.target.closest('[data-tpl]');
  if (card) { openEditor(card.getAttribute('data-tpl')); return; }
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const id = btn.getAttribute('data-id');
  const row = _state.list.find((c) => c.id === id);
  const act = btn.getAttribute('data-act');
  if (act === 'edit' && row) openEditor(row.tipo, row);
  else if (act === 'view' && row) await _viewMaster(row);
  else if (act === 'download' && row) await _downloadRow(row);
  else if (act === 'delete' && row) await _deleteRow(row);
}

function _openTemplatePicker() {
  _resetModal('Nuevo contrato — elige la plantilla');
  document.getElementById('modalBody').innerHTML = `<div class="ct-tpl-grid ct-tpl-grid--modal">
    ${TEMPLATES.map(_tplCard).join('')}
    <article class="ct-tpl-card ct-tpl-card--soon"><div class="ct-tpl-card__ic">${_i('clock', 20)}</div><div class="ct-tpl-card__nm">Más plantillas pronto</div><div class="ct-tpl-card__desc">Sitio web, app, SaaS, Impulsa…</div></article>
  </div>`;
  document.getElementById('modalSave').style.display = 'none';
  document.getElementById('modalBody').addEventListener('click', (e) => {
    const card = e.target.closest('[data-tpl]');
    if (card) { _hideModal(); openEditor(card.getAttribute('data-tpl')); }
  }, { once: true });
  _showModal();
}

// ════════════════════════════════════════════════════════════════════════════════
// EDITOR — formulario + vista previa en vivo
// ════════════════════════════════════════════════════════════════════════════════
async function openEditor(tplId, contract = null) {
  const tpl = tplById(tplId);
  if (!tpl) return;
  _state.tplId = tplId;
  _state.editId = contract ? contract.id : null;
  _state.editEstado = contract ? contract.estado : null;

  const values = {};
  tpl.grupos.forEach((g) => g.campos.forEach((c) => { values[c.k] = c.default != null ? c.default : ''; }));
  values.fecha = todayISO();
  if (contract && contract.datos) Object.assign(values, contract.datos);
  _state.values = values;

  const canSave = _state.persistOk;
  const center = document.getElementById('center');
  center.innerHTML = `<div class="view-animate ct-editor" data-tpl="${escHtml(tplId)}">
    <div class="ct-editor__bar">
      <button class="btn btn-ghost btn-sm" data-ct="back">${_i('chevL', 15)} Volver</button>
      <div class="ct-editor__title">${_i('fileText', 16)} Contrato de ${escHtml(tpl.nombre)}${contract && contract.correlativo ? ' · ' + escHtml(contract.correlativo) : ''}</div>
      <div class="ct-editor__actions">
        <button class="btn btn-ghost btn-sm" data-ct="download">${_i('download', 15)} HTML (fábrica)</button>
        <button class="btn btn-ghost btn-sm" data-ct="print">${_i('fileCheck', 15)} Imprimir PDF</button>
        ${canSave ? `<button class="btn btn-ghost btn-sm" data-ct="save">${_i('pencil', 15)} Guardar borrador</button>` : ''}
        ${canSave ? `<button class="btn btn-primary btn-sm" data-ct="emit">${_i('checkCirc', 15)} Emitir</button>` : ''}
      </div>
    </div>

    <div class="ct-editor__body">
      <form class="ct-form" autocomplete="off">
        ${tpl.grupos.map((g) => _grupo(g, values)).join('')}
        <div class="ct-form__note">${_i('shield', 14)} Los datos se fusionan en tu navegador. ${canSave ? 'Al emitir se asigna folio y se archiva el documento.' : 'Aún no se guardan (falta la migración).'}</div>
      </form>

      <div class="ct-preview">
        <div class="ct-preview__head">${_i('eye', 14)} Vista previa <span class="ct-preview__hint">A4 · misma hoja que el PDF</span></div>
        <div class="ct-preview__stage"><div class="ct-preview__scaler"><iframe class="ct-preview__frame" title="Vista previa" sandbox="allow-same-origin"></iframe></div></div>
      </div>
    </div>
  </div>`;

  const root = center.querySelector('.ct-editor');
  _wireEditor(root, tpl);
  await refreshPreview(tpl);
  fitPreview(root);
}

function _grupo(g, values) {
  return `<details class="ct-group"${g.abierto ? ' open' : ''}>
    <summary class="ct-group__sum">${escHtml(g.titulo)}<span class="ct-group__chev">${_i('chevD', 16)}</span></summary>
    <div class="ct-group__body">${g.campos.map((c) => _campo(c, values[c.k])).join('')}</div>
  </details>`;
}

function _campo(c, val) {
  const v = val != null ? val : '';
  const req = c.required ? '<span class="ct-req" title="Obligatorio">*</span>' : '';
  const help = c.help ? `<div class="ct-help">${escHtml(c.help)}</div>` : '';
  let control;
  if (c.type === 'select') {
    control = `<select class="ct-input" data-k="${c.k}">${c.opciones.map((o) => `<option value="${escHtml(o)}"${o === v ? ' selected' : ''}>${escHtml(o)}</option>`).join('')}</select>`;
  } else if (c.type === 'date') {
    control = `<input class="ct-input" type="date" data-k="${c.k}" value="${escHtml(v)}">`;
  } else if (c.type === 'money') {
    control = `<div class="ct-money"><span>$</span><input class="ct-input" type="text" inputmode="numeric" data-k="${c.k}" value="${escHtml(v)}" placeholder="0"></div><div class="ct-money-calc" data-calc="montos"></div>`;
  } else {
    const pre = c.prefijo ? `<span class="ct-prefix">${escHtml(c.prefijo)}</span>` : '';
    const ph = c.ph ? ` placeholder="${escHtml(c.ph)}"` : '';
    control = `<div class="ct-field-wrap">${pre}<input class="ct-input${c.type === 'rut' ? ' ct-rut' : ''}" type="text" data-k="${c.k}" value="${escHtml(v)}"${ph}></div>`;
  }
  return `<label class="ct-field" data-field="${c.k}"><span class="ct-label">${escHtml(c.label)}${req}</span>${control}${help}<span class="ct-err" hidden></span></label>`;
}

function _wireEditor(root, tpl) {
  root.querySelector('.ct-editor__bar').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-ct]'); if (!btn) return;
    const act = btn.getAttribute('data-ct');
    if (act === 'back') render();
    else if (act === 'print') doPrint(tpl);
    else if (act === 'download') doDownload(tpl);
    else if (act === 'save') doSave(tpl, btn);
    else if (act === 'emit') doEmit(tpl, btn);
  });

  const form = root.querySelector('.ct-form');
  form.addEventListener('input', (e) => {
    const input = e.target.closest('[data-k]'); if (!input) return;
    _state.values[input.getAttribute('data-k')] = input.value;
    validateField(input);
    clearTimeout(_debounce);
    _debounce = setTimeout(() => refreshPreview(tpl), 250);
    updateMoneyCalc(root, tpl);
  });
  form.addEventListener('change', (e) => {
    const input = e.target.closest('[data-k]'); if (!input) return;
    _state.values[input.getAttribute('data-k')] = input.value;
    refreshPreview(tpl);
  });

  updateMoneyCalc(root, tpl);
  window.addEventListener('resize', () => fitPreview(root));
}

function validateField(input) {
  const label = input.closest('.ct-field'); if (!label) return;
  const err = label.querySelector('.ct-err');
  if (input.classList.contains('ct-rut')) {
    const ok = rutValido(input.value);
    if (ok === false) { label.classList.add('ct-field--err'); if (err) { err.textContent = 'RUT inválido'; err.hidden = false; } }
    else { label.classList.remove('ct-field--err'); if (err) err.hidden = true; }
  }
}

function updateMoneyCalc(root, tpl) {
  const box = root.querySelector('[data-calc="montos"]'); if (!box) return;
  const baseKey = tpl && tpl.computed && tpl.computed.money && tpl.computed.money.baseKey;
  const neto = baseKey ? parseMoney(_state.values[baseKey]) : 0;
  if (neto > 0) {
    const iva = Math.round(neto * 0.19);
    box.innerHTML = `<span>Neto ${fmtCLP(neto)}</span><span>IVA 19% ${fmtCLP(iva)}</span><strong>Total ${fmtCLP(neto + iva)}</strong>`;
    box.hidden = false;
  } else { box.innerHTML = ''; box.hidden = true; }
}

async function refreshPreview(tpl) {
  const frame = document.querySelector('.ct-preview__frame'); if (!frame) return;
  try {
    const html = await loadTemplate(tpl);
    frame.srcdoc = mergeHtml(html, _state.values, tpl);
    frame.onload = () => fitPreview(document.querySelector('.ct-editor'));
  } catch (err) { console.error('Vista previa:', err); toast(err?.message || 'No se pudo cargar la plantilla', 'error'); }
}

function fitPreview(root) {
  if (!root) return;
  const stage = root.querySelector('.ct-preview__stage'), scaler = root.querySelector('.ct-preview__scaler'), frame = root.querySelector('.ct-preview__frame');
  if (!stage || !scaler || !frame) return;
  const A4W = 794, avail = stage.clientWidth - 24, s = Math.min(1, avail / A4W);
  let h = 1123; try { h = frame.contentDocument?.documentElement?.scrollHeight || h; } catch (_) {}
  frame.style.width = A4W + 'px'; frame.style.height = h + 'px';
  frame.style.transformOrigin = 'top left'; frame.style.transform = `scale(${s})`;
  scaler.style.width = A4W * s + 'px'; scaler.style.height = h * s + 'px';
}

// ── Exportación (Nivel 1 imprimir · Nivel 2 descargar HTML para render.py) ─────
async function doPrint(tpl) {
  const missing = requiredMissing(tpl);
  if (missing) { toast(`Falta completar: ${missing}`, 'error'); return; }
  const merged = mergeHtml(await loadTemplate(tpl), _state.values, tpl);
  const script = `<script>(function(){function go(){try{window.focus();}catch(e){}window.print();}if(document.fonts&&document.fonts.ready){document.fonts.ready.then(function(){setTimeout(go,80);});}else{setTimeout(go,400);}})();<\/script>`;
  const printable = merged.replace('</body>', script + '</body>');
  const ifr = document.createElement('iframe');
  ifr.setAttribute('aria-hidden', 'true');
  ifr.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;';
  ifr.srcdoc = printable;
  document.body.appendChild(ifr);
  const cleanup = () => { try { ifr.remove(); } catch (_) {} };
  ifr.contentWindow?.addEventListener?.('afterprint', () => setTimeout(cleanup, 500));
  setTimeout(cleanup, 60000);
  toast('Abriendo el diálogo de impresión…', 'info');
}

async function doDownload(tpl) {
  const merged = mergeHtml(await loadTemplate(tpl), _state.values, tpl);
  _downloadBlob(merged, `Contrato-Asesoria-${slug(_state.values.cliente_razon_social)}.html`);
  toast('Descargado — pásalo por render.py para el PDF final', 'success');
}

function _downloadBlob(html, name) {
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function requiredMissing(tpl) {
  const faltan = [];
  tpl.grupos.forEach((g) => g.campos.forEach((c) => { if (c.required && String(_state.values[c.k] || '').trim() === '') faltan.push(c.label); }));
  return faltan.length ? faltan.slice(0, 3).join(', ') + (faltan.length > 3 ? '…' : '') : null;
}

// ── Persistencia ────────────────────────────────────────────────────────────────
function _meta(tpl) {
  return {
    id: _state.editId, tipo: tpl.id, prefijo: tpl.prefijo,
    titulo: `Contrato de ${tpl.nombre}`,
    clienteNombre: _state.values.cliente_razon_social || '',
    clienteRut: _state.values.cliente_rut || '',
    datos: { ..._state.values },
  };
}

async function doSave(tpl, btn) {
  btn.disabled = true;
  try {
    const id = await contratosDB.saveDraft(_meta(tpl));
    _state.editId = id;
    toast('Borrador guardado ✓', 'success');
  } catch (err) { console.error(err); toast(err?.message || 'No se pudo guardar', 'error'); }
  finally { btn.disabled = false; }
}

async function doEmit(tpl, btn) {
  const missing = requiredMissing(tpl);
  if (missing) { toast(`Falta completar: ${missing}`, 'error'); return; }
  if (!confirm('Al emitir se asigna un folio y el contrato queda inmutable. ¿Continuar?')) return;
  btn.disabled = true; btn.textContent = 'Emitiendo…';
  try {
    const masterHtml = mergeHtml(await loadTemplate(tpl), _state.values, tpl);
    const { correlativo } = await contratosDB.emitir({ ..._meta(tpl), masterHtml });
    toast(`Contrato emitido ✓ — folio ${correlativo}`, 'success');
    await render();
  } catch (err) {
    console.error(err); toast(err?.message || 'No se pudo emitir', 'error');
    btn.disabled = false; btn.textContent = 'Emitir';
  }
}

// ── Acciones de lista ────────────────────────────────────────────────────────────
async function _downloadRow(row) {
  const tpl = tplById(row.tipo); if (!tpl) return;
  contratosDB.logAcceso(row.id); // audita el acceso a la PII (no bloquea)
  const merged = mergeHtml(await loadTemplate(tpl), row.datos || {}, tpl);
  _downloadBlob(merged, `Contrato-${slug(tpl.nombre)}-${slug(row.clienteNombre)}.html`);
  toast('Descargado — pásalo por render.py para el PDF final', 'success');
}

async function _viewMaster(row) {
  if (!row.storagePath) { toast('Este contrato no tiene archivo asociado', 'error'); return; }
  try {
    contratosDB.logAcceso(row.id); // audita el acceso a la PII (no bloquea)
    const url = await contratosDB.signedUrl(row.storagePath);
    window.open(url, '_blank', 'noopener');
  } catch (err) { console.error(err); toast('No se pudo abrir el documento', 'error'); }
}

async function _deleteRow(row) {
  if (!confirm(`¿Eliminar el borrador de ${row.clienteNombre || 'este contrato'}? No se puede deshacer.`)) return;
  try {
    await contratosDB.remove(row.id, row.storagePath);
    toast('Borrador eliminado', 'info');
    await render();
  } catch (err) { console.error(err); toast(err?.message || 'No se pudo eliminar', 'error'); }
}

// ── Modal global ──────────────────────────────────────────────────────────────
function _resetModal(title) {
  document.querySelector('.modal-box').className = 'modal-box';
  document.getElementById('modalTitle').textContent = title;
  const save = document.getElementById('modalSave');
  save.style.display = ''; save.disabled = false; save.textContent = 'Guardar';
  document.getElementById('modalCancel').textContent = 'Cancelar';
}
function _showModal() { document.getElementById('modalOverlay').classList.add('open'); }
function _hideModal() { document.getElementById('modalOverlay').classList.remove('open'); }
