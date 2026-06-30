// ============================================================================
// screens/biblioteca.js — Biblioteca de documentos (móvil).
// Paridad con el módulo de PC (modules/biblioteca): repositorio documental
// compartido de la organización. Todo el equipo lee y sube; solo admin borra
// (lo impone la RLS). Archivo en el bucket privado 'biblioteca'; descarga por
// URL firmada temporal. Reutiliza LITERALMENTE db.documentos (mismo Supabase).
// ============================================================================
import { db, store, escHtml, formatDate } from '../core.js';
import { ic, toast, haptic, openSheet } from '../ui.js';

const e = escHtml;

const CATS = ['Contratos', 'Comercial', 'Propuestas', 'Precios', 'Marca', 'Operaciones', 'Finanzas', 'General'];
const CATC = { Contratos: '#16466B', Comercial: '#0C7C88', Propuestas: '#5160C0', Precios: '#2E9B73', Marca: '#C0892F', Operaciones: '#3D6E92', Finanzas: '#2F8C93', General: '#6B7686' };
const catColor = (c) => CATC[c] || '#6B7686';

const _state = { cat: 'Todas', q: '' };
let _docs = [];

function fmtBytes(n) {
  if (!n || n < 0) return '—';
  const u = ['B', 'KB', 'MB', 'GB']; let i = 0, v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${u[i]}`;
}
const ext = (n) => (String(n || '').split('.').pop() || '').toUpperCase().slice(0, 4);
const isAdmin = () => store.profile?.rol === 'admin';

// estilo de chip de filtro (activo/inactivo) — inline para no depender de CSS nuevo
function chipStyle(on) {
  return `padding:7px 13px;border-radius:999px;font-size:12.5px;font-weight:600;white-space:nowrap;cursor:pointer;border:1px solid ${on ? 'transparent' : 'var(--line,#e4e7ee)'};background:${on ? 'var(--teal,#0C7C88)' : 'transparent'};color:${on ? '#fff' : 'var(--text3,#8a94a6)'}`;
}

export default {
  chrome: false,

  async render() {
    let docs = [], team = [];
    try { [docs, team] = await Promise.all([db.documentos.getAll(), db.profiles.getAll().catch(() => [])]); }
    catch (err) { console.error('No se pudo cargar la biblioteca:', err); return _errorScreen(err); }
    _docs = docs;

    const nameById = Object.fromEntries(team.map((p) => [p.id, p.nombre]));
    const cats = [...new Set(docs.map((d) => d.categoria))].sort();
    if (_state.cat !== 'Todas' && !cats.includes(_state.cat)) _state.cat = 'Todas';
    const q = _state.q.trim().toLowerCase();
    const list = docs.filter((d) => (_state.cat === 'Todas' || d.categoria === _state.cat) && (!q || (d.nombre || '').toLowerCase().includes(q)));

    const chip = (label, val) => `<button data-cat="${e(val)}" style="${chipStyle(_state.cat === val)}">${e(label)}</button>`;

    return `
    <section class="screen">
      <header class="hdr hdr--bar">
        <div>
          <h1 class="hdr__title">Biblioteca</h1>
          <div class="hdr__sub">${docs.length} documento${docs.length !== 1 ? 's' : ''} · todo el equipo</div>
        </div>
        <button class="icon-btn icon-btn--bare" id="bibClose" style="width:38px;height:38px" aria-label="Cerrar">${ic('x', { size: 20, sw: 2 })}</button>
      </header>

      <div class="pad">
        <button class="btn btn--primary btn--block" id="bibUp" style="margin-bottom:13px">${ic('plus', { size: 18, sw: 2.2 })} Subir documento</button>

        <div style="display:flex;align-items:center;gap:8px;background:var(--surface2,#f2f4f7);border:1px solid var(--line,#e4e7ee);border-radius:12px;padding:9px 12px;margin-bottom:11px;color:var(--text3,#8a94a6)">
          ${ic('search', { size: 17 })}
          <input id="bibQ" type="search" placeholder="Buscar documento…" value="${e(_state.q)}" autocomplete="off" style="border:none;background:transparent;outline:none;flex:1;min-width:0;font-size:14px;color:var(--text,#1a2332)">
        </div>

        <div style="display:flex;gap:7px;overflow-x:auto;padding-bottom:4px;margin-bottom:14px;-webkit-overflow-scrolling:touch">
          ${chip('Todas', 'Todas')}${cats.map((c) => chip(c, c)).join('')}
        </div>

        ${docs.length === 0
          ? _emptyState()
          : list.length === 0
            ? `<div class="card" style="text-align:center;padding:26px 18px"><div class="empty__d">Ningún documento coincide.</div></div>`
            : `<div class="list" style="display:flex;flex-direction:column;gap:10px">${list.map((d) => _row(d, nameById)).join('')}</div>`}
      </div>
    </section>`;
  },

  mount(app) {
    const host = document.getElementById('screen');
    host.querySelector('#bibClose')?.addEventListener('click', () => app.navigate('hoy'));
    host.querySelector('#bibUp')?.addEventListener('click', () => _openUpload(app));

    const q = host.querySelector('#bibQ');
    if (q) q.addEventListener('input', () => {
      _state.q = q.value;
      const ql = q.value.trim().toLowerCase();
      host.querySelectorAll('[data-doc]').forEach((c) => {
        c.style.display = (!ql || c.getAttribute('data-name').includes(ql)) ? '' : 'none';
      });
    });
    host.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => {
      _state.cat = b.getAttribute('data-cat'); haptic(); app.renderScreen();
    }));
    host.querySelectorAll('[data-doc]').forEach((c) => c.addEventListener('click', (ev) => {
      if (ev.target.closest('[data-menu]')) return;
      _download(c.getAttribute('data-doc'));
    }));
    host.querySelectorAll('[data-menu]').forEach((b) => b.addEventListener('click', (ev) => {
      ev.stopPropagation(); _openMenu(app, b.getAttribute('data-menu'));
    }));
  },
};

function _row(d, nameById) {
  const c = catColor(d.categoria);
  const autor = d.subidoPor && nameById[d.subidoPor] ? ` · ${e(nameById[d.subidoPor])}` : '';
  return `<article class="card card--tap" data-doc="${d.id}" data-name="${e((d.nombre || '').toLowerCase())}" style="display:flex;align-items:center;gap:12px;padding:13px">
    <span style="width:42px;height:48px;border-radius:10px;flex:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;background:${c}16;color:${c}">
      ${ic('fileText', { size: 19 })}<span style="font-size:8px;font-weight:800;letter-spacing:.03em">${e(ext(d.nombre))}</span>
    </span>
    <span style="flex:1;min-width:0">
      <span style="display:block;font-weight:600;font-size:14px;color:var(--ink,#16234A);line-height:1.3;word-break:break-word">${e(d.nombre)}</span>
      <span style="display:flex;flex-wrap:wrap;align-items:center;gap:5px 8px;margin-top:4px;font-size:11.5px;color:var(--text3,#8a94a6)">
        <span style="font-weight:700;padding:2px 7px;border-radius:999px;color:${c};background:${c}16">${e(d.categoria)}</span>
        <span>${fmtBytes(d.sizeBytes)} · ${e(formatDate(d.fecha))}${autor}</span>
      </span>
    </span>
    <span data-menu="${d.id}" role="button" aria-label="Opciones" style="flex:none;width:34px;height:34px;display:flex;align-items:center;justify-content:center;color:var(--text3,#8a94a6)">${ic('dots', { size: 18 })}</span>
  </article>`;
}

async function _download(id) {
  const d = _docs.find((x) => x.id === id);
  if (!d) return;
  haptic();
  try {
    const url = await db.documentos.signedUrl(d.storagePath);
    window.open(url, '_blank', 'noopener');
  } catch (err) {
    console.error('No se pudo abrir el documento:', err);
    toast('No se pudo abrir el documento', 'err');
  }
}

function _openUpload(app) {
  let cat = 'General';
  const chips = CATS.map((c) => `<button data-pick="${c}" style="${chipStyle(c === 'General')}">${c}</button>`).join('');
  openSheet(`
    <div class="sheet__body">
      <div class="sheet__title">Subir documento(s)</div>
      <label style="display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;padding:24px 16px;border:2px dashed var(--line,#e4e7ee);border-radius:14px;color:var(--text3,#8a94a6);cursor:pointer">
        <input id="bibFiles" type="file" multiple hidden>
        ${ic('plus', { size: 24 })}
        <span id="bibFilesHint" style="font-size:13.5px;font-weight:600;color:var(--text2,#5a6376)">Elegir archivos</span>
        <span style="font-size:12px">PDF, Word, Excel, imágenes… (varios a la vez)</span>
      </label>
      <div class="muted" style="font-size:12px;margin:12px 0 7px">Categoría</div>
      <div style="display:flex;gap:7px;overflow-x:auto;padding-bottom:4px" id="bibPick">${chips}</div>
      <button class="btn btn--primary btn--block" id="bibDoUp" style="margin-top:15px" disabled>Subir</button>
    </div>`, {
    onMount: (el, close) => {
      const input = el.querySelector('#bibFiles');
      const hint = el.querySelector('#bibFilesHint');
      const doUp = el.querySelector('#bibDoUp');
      const picks = el.querySelectorAll('[data-pick]');
      picks.forEach((b) => b.addEventListener('click', () => {
        picks.forEach((x) => x.setAttribute('style', chipStyle(false)));
        b.setAttribute('style', chipStyle(true));
        cat = b.getAttribute('data-pick');
      }));
      input.addEventListener('change', () => {
        const n = input.files?.length || 0;
        hint.textContent = n === 0 ? 'Elegir archivos' : n === 1 ? input.files[0].name : `${n} archivos`;
        doUp.disabled = n === 0;
      });
      doUp.addEventListener('click', async () => {
        const files = [...(input.files || [])];
        if (!files.length) return;
        doUp.disabled = true; doUp.textContent = 'Subiendo…';
        let ok = 0;
        for (const f of files) {
          try { await db.documentos.add({ file: f, nombre: f.name, categoria: cat }); ok++; }
          catch (err) { console.error('Error subiendo', f.name, err); }
        }
        close();
        toast(`${ok}/${files.length} documento(s) subido(s) ✓`, ok ? 'ok' : 'err');
        app.renderScreen();
      });
    },
  });
}

function _openMenu(app, id) {
  const d = _docs.find((x) => x.id === id);
  if (!d) return;
  haptic();
  const admin = isAdmin();
  openSheet(`
    <div class="sheet__body">
      <div class="sheet__title" style="word-break:break-word">${e(d.nombre)}</div>
      <button class="sheet-link" data-act="open">${ic('external', { size: 20 })}<span>Abrir / descargar</span></button>
      <button class="sheet-link" data-act="edit">${ic('edit', { size: 20 })}<span>Editar datos</span></button>
      ${admin ? `<button class="sheet-link" data-act="del" style="color:var(--danger,#C04F3F)">${ic('trash', { size: 20 })}<span style="color:var(--danger,#C04F3F)">Eliminar</span></button>` : ''}
    </div>`, {
    onMount: (el, close) => {
      el.querySelector('[data-act="open"]').addEventListener('click', () => { close(); _download(id); });
      el.querySelector('[data-act="edit"]').addEventListener('click', () => { close(); _openEdit(app, id); });
      const del = el.querySelector('[data-act="del"]');
      if (del) del.addEventListener('click', async () => {
        close();
        if (!confirm(`¿Eliminar "${d.nombre}"? No se puede deshacer.`)) return;
        try { await db.documentos.remove(d.id, d.storagePath); toast('Documento eliminado', 'info'); app.renderScreen(); }
        catch (err) { console.error(err); toast(err?.message || 'No se pudo eliminar', 'err'); }
      });
    },
  });
}

function _openEdit(app, id) {
  const d = _docs.find((x) => x.id === id);
  if (!d) return;
  let cat = d.categoria;
  const chips = CATS.map((c) => `<button data-pick="${c}" style="${chipStyle(c === d.categoria)}">${c}</button>`).join('');
  const inputStyle = 'width:100%;padding:11px 13px;border:1px solid var(--line,#e4e7ee);border-radius:11px;font-size:14px;color:var(--text,#1a2332);background:var(--surface,#fff);outline:none;box-sizing:border-box';
  openSheet(`
    <div class="sheet__body">
      <div class="sheet__title">Editar documento</div>
      <input id="edName" value="${e(d.nombre)}" placeholder="Nombre" style="${inputStyle}">
      <div class="muted" style="font-size:12px;margin:12px 0 7px">Categoría</div>
      <div style="display:flex;gap:7px;overflow-x:auto;padding-bottom:4px">${chips}</div>
      <input id="edDesc" value="${e(d.descripcion || '')}" placeholder="Descripción (opcional)" style="${inputStyle};margin-top:11px">
      <button class="btn btn--primary btn--block" id="edSave" style="margin-top:15px">Guardar</button>
    </div>`, {
    onMount: (el, close) => {
      const picks = el.querySelectorAll('[data-pick]');
      picks.forEach((b) => b.addEventListener('click', () => {
        picks.forEach((x) => x.setAttribute('style', chipStyle(false)));
        b.setAttribute('style', chipStyle(true));
        cat = b.getAttribute('data-pick');
      }));
      el.querySelector('#edSave').addEventListener('click', async () => {
        const nombre = el.querySelector('#edName').value.trim();
        if (!nombre) { toast('El nombre es obligatorio', 'err'); return; }
        try {
          await db.documentos.update({ id: d.id, nombre, categoria: cat, descripcion: el.querySelector('#edDesc').value.trim() || null });
          close(); toast('Documento actualizado ✓', 'ok'); app.renderScreen();
        } catch (err) { console.error(err); toast(err?.message || 'No se pudo actualizar', 'err'); }
      });
    },
  });
}

function _emptyState() {
  return `<div class="card" style="text-align:center;padding:30px 20px">
    <div class="empty__icon" style="margin:0 auto 12px">${ic('fileText', { size: 26 })}</div>
    <div class="empty__t">Biblioteca vacía</div>
    <div class="empty__d">Sube los documentos de la empresa (contratos, propuestas, precios, marca…) para tenerlos a mano en terreno.</div>
  </div>`;
}

function _errorScreen(err) {
  return `<section class="screen">
    <header class="hdr hdr--bar"><div><h1 class="hdr__title">Biblioteca</h1></div></header>
    <div class="pad"><div class="card" style="text-align:center;padding:30px 18px">
      <div class="empty__t">No se pudo cargar</div>
      <div class="empty__d">${e(err?.message || 'Error de conexión')}</div>
    </div></div>
  </section>`;
}
