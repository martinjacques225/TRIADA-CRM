// modules/biblioteca/biblioteca.js
// Biblioteca de documentos de la organización (M4 "Bóveda" del Plan Maestro).
// Repositorio compartido: cualquier miembro del equipo lee y sube; solo admin borra
// (lo impone la RLS, ver supabase migración biblioteca_documentos). El archivo vive
// en el bucket privado 'biblioteca'; la descarga usa una URL firmada temporal.
//
// Self-contained: la interactividad se cablea por delegación sobre el wrapper recién
// renderizado (no usa onclick inline con variables — regla de AGENTS.md).
import { documentos, profiles } from '../../js/db.js';
import { escHtml, formatDate, toast } from '../../js/utils.js';
import { S } from '../../js/state.js';

const _i = (n, s) => (window.icon ? window.icon(n, '', s) : '');

// Categorías sugeridas (con color de marca). El usuario puede dejar 'General'.
const CATS = [
  { id: 'Contratos',   color: '#16466B' },
  { id: 'Comercial',   color: '#0C7C88' },
  { id: 'Propuestas',  color: '#5160C0' },
  { id: 'Precios',     color: '#2E9B73' },
  { id: 'Marca',       color: '#C0892F' },
  { id: 'Operaciones', color: '#3D6E92' },
  { id: 'Finanzas',    color: '#2F8C93' },
  { id: 'General',     color: '#6B7686' },
];
const catColor = (id) => (CATS.find((c) => c.id === id)?.color) || '#6B7686';

// Estado de vista (persiste entre renders dentro de la sesión)
const _state = { cat: 'Todas' };
let _docs = [];

function fmtBytes(n) {
  if (!n || n < 0) return '—';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0, v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${u[i]}`;
}
const fileExt = (nombre) => (String(nombre || '').split('.').pop() || '').toUpperCase().slice(0, 4);

const isAdmin = () => S.profile?.role === 'admin';

// ── Render ────────────────────────────────────────────────────────────────────
export async function render() {
  const center = document.getElementById('center');
  center.innerHTML = `<div class="view-animate"><div class="bib-loading">Cargando biblioteca…</div></div>`;

  let docs = [], team = [];
  try {
    [docs, team] = await Promise.all([
      documentos.getAll(),
      profiles.getAll().catch(() => []),
    ]);
  } catch (err) {
    console.error('No se pudo cargar la biblioteca:', err);
    center.innerHTML = `<div class="view-animate"><div class="empty-state">
      <div class="empty-icon">${_i('alert')}</div>
      <h3>No se pudo cargar la biblioteca</h3>
      <p>${escHtml(err?.message || 'Error de conexión')}</p>
    </div></div>`;
    return;
  }
  _docs = docs;

  const nameById = Object.fromEntries(team.map((p) => [p.id, p.nombre]));
  const admin = isAdmin();
  const catsPresent = [...new Set(docs.map((d) => d.categoria))].sort();
  if (_state.cat !== 'Todas' && !catsPresent.includes(_state.cat)) _state.cat = 'Todas';
  const list = _state.cat === 'Todas' ? docs : docs.filter((d) => d.categoria === _state.cat);
  const totalBytes = docs.reduce((s, d) => s + (d.sizeBytes || 0), 0);

  const chip = (label, value) => `<button class="bib-fchip${_state.cat === value ? ' active' : ''}" data-bib-cat="${escHtml(value)}">${escHtml(label)}</button>`;

  center.innerHTML = `<div class="view-animate biblioteca-view">
    <div class="section-head">
      <div>
        <h2>Biblioteca</h2>
        <p class="bib-sub">Documentos de la empresa, accesibles para todo el equipo.</p>
      </div>
      <button class="btn btn-primary" data-bib="upload">${_i('upload', 16)} Subir documento</button>
    </div>

    <div class="kpi-grid" style="margin-bottom:20px">
      <div class="kpi-card">
        <div class="kpi-top"><span class="kpi-label">Documentos</span><span class="kpi-ic" style="background:var(--primary-l);color:var(--primary)">${_i('fileText')}</span></div>
        <div class="kpi-value">${docs.length}</div>
        <div class="kpi-sub">En la biblioteca</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-top"><span class="kpi-label">Categorías</span><span class="kpi-ic" style="background:var(--green-l);color:var(--green)">${_i('layers')}</span></div>
        <div class="kpi-value">${catsPresent.length}</div>
        <div class="kpi-sub">Tipos de documento</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-top"><span class="kpi-label">Espacio usado</span><span class="kpi-ic" style="background:var(--violet-l);color:var(--violet)">${_i('layers')}</span></div>
        <div class="kpi-value kpi-value-sm">${fmtBytes(totalBytes)}</div>
        <div class="kpi-sub">Total almacenado</div>
      </div>
    </div>

    <div class="bib-toolbar">
      <div class="bib-search">
        ${_i('search', 16)}
        <input id="bibSearch" type="search" placeholder="Buscar documento…" autocomplete="off">
      </div>
      <div class="bib-filters">
        ${chip('Todas', 'Todas')}
        ${catsPresent.map((c) => chip(c, c)).join('')}
      </div>
    </div>

    ${docs.length === 0
      ? `<div class="empty-state">
          <div class="empty-icon">${_i('fileText')}</div>
          <h3>Biblioteca vacía</h3>
          <p>Sube los documentos de la empresa (contratos, propuestas, precios, marca…) para que todo el equipo los tenga a mano. Puedes arrastrar varios archivos a la vez.</p>
          <button class="btn btn-primary" data-bib="upload">${_i('upload', 16)} Subir el primer documento</button>
        </div>`
      : `<div class="bib-grid">
          ${list.map((d) => _card(d, nameById, admin)).join('')}
        </div>
        <div class="bib-empty-filter" hidden>${_i('search')}<span>Ningún documento coincide con la búsqueda.</span></div>`}
  </div>`;

  _wire(center.querySelector('.biblioteca-view'));
}

function _card(d, nameById, admin) {
  const c = catColor(d.categoria);
  const autor = d.subidoPor && nameById[d.subidoPor] ? ` · ${escHtml(nameById[d.subidoPor])}` : '';
  return `<article class="bib-card" data-id="${d.id}" data-name="${escHtml((d.nombre || '').toLowerCase())}">
    <div class="bib-card__icon" style="background:${c}16;color:${c}">${_i('fileText', 22)}<span class="bib-ext">${escHtml(fileExt(d.nombre))}</span></div>
    <div class="bib-card__main">
      <div class="bib-card__name">${escHtml(d.nombre)}</div>
      <div class="bib-card__meta">
        <span class="bib-tag" style="color:${c};background:${c}16">${escHtml(d.categoria)}</span>
        <span>${fmtBytes(d.sizeBytes)}</span>
        <span>${escHtml(formatDate(d.fecha))}${autor}</span>
      </div>
      ${d.descripcion ? `<div class="bib-card__desc">${escHtml(d.descripcion)}</div>` : ''}
    </div>
    <div class="bib-card__actions">
      <button class="btn btn-primary btn-sm" data-act="download" data-id="${d.id}">${_i('download', 15)} Descargar</button>
      <button class="btn-icon btn-sm" data-act="edit" data-id="${d.id}" title="Editar datos">${_i('pencil', 15)}</button>
      ${admin ? `<button class="btn-icon btn-sm" data-act="delete" data-id="${d.id}" title="Eliminar" style="color:var(--danger)">${_i('trash', 15)}</button>` : ''}
    </div>
  </article>`;
}

// ── Cableado (delegación sobre el wrapper recién pintado) ──────────────────────
function _wire(root) {
  if (!root) return;

  root.addEventListener('click', async (e) => {
    const up = e.target.closest('[data-bib="upload"]');
    if (up) { _openUpload(); return; }

    const fchip = e.target.closest('[data-bib-cat]');
    if (fchip) { _state.cat = fchip.getAttribute('data-bib-cat'); await render(); return; }

    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.getAttribute('data-act');
    const id = btn.getAttribute('data-id');
    if (act === 'download') await _download(id);
    else if (act === 'edit') _openEdit(id);
    else if (act === 'delete') await _delete(id);
  });

  // Búsqueda: filtra en cliente (preserva el foco del input, no re-renderiza)
  const search = root.querySelector('#bibSearch');
  if (search) search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    let visibles = 0;
    root.querySelectorAll('.bib-card').forEach((card) => {
      const hit = !q || card.getAttribute('data-name').includes(q);
      card.style.display = hit ? '' : 'none';
      if (hit) visibles++;
    });
    const hint = root.querySelector('.bib-empty-filter');
    if (hint) hint.hidden = visibles !== 0;
  });
}

// ── Acciones ───────────────────────────────────────────────────────────────────
async function _download(id) {
  const d = _docs.find((x) => x.id === id);
  if (!d) return;
  try {
    const url = await documentos.signedUrl(d.storagePath);
    window.open(url, '_blank', 'noopener');
  } catch (err) {
    console.error('No se pudo generar el enlace de descarga:', err);
    toast('No se pudo generar el enlace de descarga', 'error');
  }
}

async function _delete(id) {
  const d = _docs.find((x) => x.id === id);
  if (!d) return;
  if (!confirm(`¿Eliminar "${d.nombre}"? Esta acción no se puede deshacer.`)) return;
  try {
    await documentos.remove(d.id, d.storagePath);
    toast('Documento eliminado', 'info');
    await render();
  } catch (err) {
    console.error('No se pudo eliminar el documento:', err);
    toast(err?.message || 'No se pudo eliminar (¿se requiere permiso de admin?)', 'error');
  }
}

// ── Modales (usan el modal global) ─────────────────────────────────────────────
function _resetModal(title) {
  document.querySelector('.modal-box').className = 'modal-box';
  document.getElementById('modalTitle').textContent = title;
  const save = document.getElementById('modalSave');
  save.style.display = ''; save.disabled = false; save.textContent = 'Guardar';
  document.getElementById('modalCancel').textContent = 'Cancelar';
}
function _showModal() { document.getElementById('modalOverlay').classList.add('open'); }
function _hideModal() { document.getElementById('modalOverlay').classList.remove('open'); }

const _catOptions = (sel) => CATS.map((c) => `<option value="${c.id}"${c.id === sel ? ' selected' : ''}>${c.id}</option>`).join('');

function _openUpload() {
  _resetModal('Subir documento(s)');
  const body = document.getElementById('modalBody');
  body.innerHTML = `
    <label class="bib-drop" id="bibDrop">
      <input id="bibFiles" type="file" multiple hidden>
      <span class="bib-drop__ic">${_i('upload', 26)}</span>
      <span class="bib-drop__t">Arrastra archivos aquí o haz clic para elegir</span>
      <span class="bib-drop__d" id="bibDropHint">Puedes seleccionar varios a la vez (PDF, Word, Excel, imágenes…)</span>
    </label>
    <div class="form-group">
      <label>Categoría</label>
      <select id="bibCat">${_catOptions('General')}</select>
    </div>
    <div class="form-group">
      <label>Descripción <span style="font-weight:400;color:var(--text3)">(opcional, solo para 1 archivo)</span></label>
      <input id="bibDesc" placeholder="Ej: Contrato marco de servicios v2">
    </div>`;

  const input = document.getElementById('bibFiles');
  const drop = document.getElementById('bibDrop');
  const hint = document.getElementById('bibDropHint');
  const refreshHint = () => {
    const n = input.files?.length || 0;
    hint.textContent = n === 0 ? 'Puedes seleccionar varios a la vez (PDF, Word, Excel, imágenes…)'
      : n === 1 ? `1 archivo: ${input.files[0].name}` : `${n} archivos seleccionados`;
  };
  input.addEventListener('change', refreshHint);
  ['dragover', 'dragenter'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('bib-drop--over'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove('bib-drop--over')));
  drop.addEventListener('drop', (e) => { e.preventDefault(); if (e.dataTransfer?.files?.length) { input.files = e.dataTransfer.files; refreshHint(); } });

  const save = document.getElementById('modalSave');
  save.textContent = 'Subir';
  save.onclick = async () => {
    const files = [...(input.files || [])];
    if (!files.length) { toast('Selecciona al menos un archivo', 'error'); return; }
    const cat = document.getElementById('bibCat').value || 'General';
    const desc = document.getElementById('bibDesc').value.trim() || null;
    save.disabled = true; save.textContent = 'Subiendo…';
    let ok = 0;
    for (const f of files) {
      try {
        await documentos.add({ file: f, nombre: f.name, descripcion: files.length === 1 ? desc : null, categoria: cat });
        ok++;
      } catch (err) {
        console.error('Error subiendo', f.name, err);
        toast(`Error subiendo ${f.name}: ${err?.message || ''}`, 'error');
      }
    }
    _hideModal();
    toast(`${ok}/${files.length} documento(s) subido(s) ✓`, ok ? 'success' : 'error');
    await render();
  };
  _showModal();
}

function _openEdit(id) {
  const d = _docs.find((x) => x.id === id);
  if (!d) return;
  _resetModal('Editar documento');
  const body = document.getElementById('modalBody');
  body.innerHTML = `
    <div class="form-group">
      <label>Nombre</label>
      <input id="bibName" value="${escHtml(d.nombre)}">
    </div>
    <div class="form-group">
      <label>Categoría</label>
      <select id="bibCat">${_catOptions(d.categoria)}</select>
    </div>
    <div class="form-group">
      <label>Descripción</label>
      <input id="bibDesc" value="${escHtml(d.descripcion || '')}" placeholder="Opcional">
    </div>`;
  const save = document.getElementById('modalSave');
  save.onclick = async () => {
    const nombre = document.getElementById('bibName').value.trim();
    if (!nombre) { toast('El nombre es obligatorio', 'error'); return; }
    save.disabled = true;
    try {
      await documentos.update({
        id: d.id,
        nombre,
        categoria: document.getElementById('bibCat').value || 'General',
        descripcion: document.getElementById('bibDesc').value.trim() || null,
      });
      _hideModal();
      toast('Documento actualizado ✓', 'success');
      await render();
    } catch (err) {
      console.error('No se pudo actualizar el documento:', err);
      toast(err?.message || 'No se pudo actualizar', 'error');
      save.disabled = false;
    }
  };
  _showModal();
}
