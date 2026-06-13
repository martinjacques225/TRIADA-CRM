// modules/leads/leads.js
// Bandeja de entrada: los prospectos recién llegados, priorizando los que aún
// no se contactan. Cada lead trae acciones de contacto directo (WhatsApp, Zoom,
// llamar) + agendar y abrir ficha. Incluye carga masiva de leads.
import { prospectos } from '../../js/db.js';
import { escHtml, PIPELINE_STAGES, stageBadge, toast } from '../../js/utils.js';

const _i = (n, s) => (window.icon ? window.icon(n, '', s) : '');

let _all = [];
let _filter = 'pendientes'; // pendientes | nuevos | contactados | todos
let _q = '';

const FILTERS = [
  { id: 'pendientes',  label: 'Por contactar', test: p => p.estado === 'Nuevo' },
  { id: 'contactados', label: 'Contactados',   test: p => p.estado === 'Contactado' },
  { id: 'todos',       label: 'Todos',         test: () => true },
];

function _timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3.6e6);
  if (h < 1) return 'hace minutos';
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'ayer';
  if (d < 7) return `hace ${d} días`;
  const w = Math.floor(d / 7);
  return w === 1 ? 'hace 1 semana' : `hace ${w} semanas`;
}

export async function render() {
  _all = await prospectos.getAll();
  _setupApi();

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const since = (days) => { const d = new Date(); d.setDate(d.getDate() - days); return d.getTime(); };
  const nuevos       = _all.filter(p => p.estado === 'Nuevo').length;
  const contactados  = _all.filter(p => p.estado === 'Contactado').length;
  const ultimas24h   = _all.filter(p => new Date(p.fechaCreacion || 0).getTime() >= since(1)).length;
  const ultimaSemana = _all.filter(p => new Date(p.fechaCreacion || 0).getTime() >= since(7)).length;

  const center = document.getElementById('center');
  center.innerHTML = `<div class="view-animate">
    <div class="section-head">
      <h2>Leads — bandeja de entrada</h2>
      <div class="actions" style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-ghost" onclick="window._leads.bulk()">${_i('upload', 15)} Carga masiva</button>
        <button class="btn btn-ghost" onclick="window._app.importLanding()">${_i('download', 15)} Importar landing</button>
        <button class="btn btn-primary" onclick="window._app.openProspectoModal()">+ Nuevo lead</button>
      </div>
    </div>

    <div class="kpi-grid" style="margin-bottom:22px">
      <div class="kpi-card"><div class="kpi-top"><span class="kpi-label">Por contactar</span><span class="kpi-ic" style="background:var(--amber-l);color:var(--amber)">${_i('bell')}</span></div><div class="kpi-value">${nuevos}</div><div class="kpi-sub">Leads en estado Nuevo</div></div>
      <div class="kpi-card"><div class="kpi-top"><span class="kpi-label">Contactados</span><span class="kpi-ic" style="background:var(--violet-l);color:var(--violet)">${_i('phone')}</span></div><div class="kpi-value">${contactados}</div><div class="kpi-sub">En conversación</div></div>
      <div class="kpi-card"><div class="kpi-top"><span class="kpi-label">Últimas 24 h</span><span class="kpi-ic" style="background:var(--primary-l);color:var(--primary)">${_i('sparkle')}</span></div><div class="kpi-value">${ultimas24h}</div><div class="kpi-sub">Nuevos ingresos</div></div>
      <div class="kpi-card"><div class="kpi-top"><span class="kpi-label">Últimos 7 días</span><span class="kpi-ic" style="background:var(--green-l);color:var(--green)">${_i('trending')}</span></div><div class="kpi-value">${ultimaSemana}</div><div class="kpi-sub">Esta semana</div></div>
    </div>

    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:16px">
      ${FILTERS.map(f => {
        const cnt = _all.filter(f.test).length;
        return `<button class="btn btn-sm ${_filter === f.id ? 'btn-primary' : 'btn-ghost'}" onclick="window._leads.setFilter('${f.id}')">${escHtml(f.label)} <span style="opacity:.7">${cnt}</span></button>`;
      }).join('')}
      <div class="topbar-search" style="max-width:240px;margin-left:auto">
        ${_i('search')}
        <input id="leadSearch" placeholder="Buscar lead…" value="${escHtml(_q)}">
      </div>
    </div>

    <div id="leadList"></div>
  </div>`;

  const inp = document.getElementById('leadSearch');
  inp.addEventListener('input', e => { _q = e.target.value; _renderList(); });
  _renderList();
}

function _renderList() {
  const f = FILTERS.find(x => x.id === _filter) || FILTERS[2];
  let list = _all.filter(f.test);
  if (_q) {
    const q = _q.toLowerCase();
    list = list.filter(p => [p.nombre, p.empresa, p.email, p.telefono, p.rubro].some(v => (v || '').toLowerCase().includes(q)));
  }
  // Más recientes primero
  list.sort((a, b) => (b.fechaCreacion || '').localeCompare(a.fechaCreacion || ''));

  const el = document.getElementById('leadList');
  if (!el) return;
  if (!list.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">${_i('bell')}</div><h3>Sin leads aquí</h3><p>No hay leads que coincidan con este filtro.</p></div>`;
    return;
  }
  el.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px">
    ${list.map(_leadCard).join('')}
  </div>`;
}

function _leadCard(p) {
  const st = PIPELINE_STAGES.find(s => s.id === p.estado) || PIPELINE_STAGES[0];
  const tieneTel = !!(p.telefono || '').trim();
  return `<div class="card card-pad" style="display:flex;flex-direction:column;gap:12px">
    <div style="display:flex;gap:11px;align-items:flex-start">
      <div style="width:42px;height:42px;border-radius:50%;background:${st.color};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;flex-shrink:0">${(p.nombre || '?')[0].toUpperCase()}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:14.5px;font-weight:700;color:var(--navy);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(p.nombre || 'Sin nombre')}</div>
        <div style="font-size:12.5px;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(p.empresa || p.rubro || '—')}</div>
      </div>
      <span style="font-size:11px;color:var(--text3);white-space:nowrap">${_timeAgo(p.fechaCreacion)}</span>
    </div>

    <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
      ${stageBadge(p.estado)}
      ${p.origen ? `<span class="badge" style="background:var(--surface2);color:var(--text2);border-color:var(--border)">${escHtml(p.origen)}</span>` : ''}
      ${p.dolorPrincipal ? `<span class="chip-dolor">${escHtml(p.dolorPrincipal)}</span>` : ''}
    </div>

    ${(p.email || p.telefono) ? `<div style="font-size:12.5px;color:var(--text2);display:flex;flex-direction:column;gap:3px">
      ${p.email ? `<span style="display:inline-flex;align-items:center;gap:6px">${_i('mail', 13)} ${escHtml(p.email)}</span>` : ''}
      ${p.telefono ? `<span style="display:inline-flex;align-items:center;gap:6px">${_i('phone', 13)} ${escHtml(p.telefono)}</span>` : ''}
    </div>` : ''}

    <div style="display:flex;gap:6px;flex-wrap:wrap;border-top:1px solid var(--border);padding-top:11px;margin-top:auto">
      <button class="btn btn-sm" style="background:#25D366;color:#fff;border:none;${tieneTel ? '' : 'opacity:.45;'}" onclick="window._app.contactWhatsApp('${p.id}')" title="WhatsApp">${_i('phone', 14)} WhatsApp</button>
      <button class="btn btn-sm" style="background:#2D8CFF;color:#fff;border:none" onclick="window._app.contactZoom('${p.id}')" title="Iniciar Zoom">${_i('video', 14)} Zoom</button>
      <button class="btn btn-ghost btn-sm" style="${tieneTel ? '' : 'opacity:.45;'}" onclick="window._app.callProspecto('${p.id}')" title="Llamar">${_i('phone', 14)} Llamar</button>
      <button class="btn btn-ghost btn-sm" onclick="window._app.openCitaModalForProspecto('${p.id}')" title="Agendar">${_i('agenda', 14)}</button>
      <button class="btn btn-ghost btn-sm" onclick="window._app.openProspectoDetail('${p.id}')" title="Ver ficha" style="margin-left:auto">Ficha →</button>
    </div>
  </div>`;
}

// ── API global del módulo ─────────────────────────────────────────────────────
function _setupApi() {
  window._leads = {
    setFilter(id) { _filter = id; render(); },
    bulk() {
      document.getElementById('modalTitle').textContent = 'Carga masiva de leads';
      document.querySelector('.modal-box').className = 'modal-box modal-lg';
      document.getElementById('modalBody').innerHTML = `
        <p style="font-size:13px;color:var(--text3);margin-bottom:12px">
          Pega un lead por línea con el formato <strong>Nombre; Empresa; Email; Teléfono; Rubro</strong>.
          Solo el nombre es obligatorio; los demás campos son opcionales (deja vacío entre <code>;</code>).
        </p>
        <textarea id="bulkText" rows="10" style="width:100%;font-family:ui-monospace,monospace;font-size:13px" placeholder="Juan Pérez; Comercial Sur; juan@sur.cl; +56 9 1111 2222; Comercio / retail
María Soto; ; maria@correo.cl; ; Servicios"></textarea>
        <div id="bulkPreview" style="font-size:12.5px;color:var(--text3);margin-top:8px"></div>`;
      const save = document.getElementById('modalSave');
      save.style.display = ''; save.textContent = 'Importar';
      document.getElementById('modalCancel').textContent = 'Cancelar';
      const ta = document.getElementById('bulkText');
      const prev = document.getElementById('bulkPreview');
      const parse = () => ta.value.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
        const [nombre, empresa, email, telefono, rubro] = l.split(';').map(s => (s || '').trim());
        return { nombre, empresa, email, telefono, rubro };
      }).filter(r => r.nombre);
      ta.addEventListener('input', () => { prev.textContent = `${parse().length} lead(s) detectado(s).`; });
      save.onclick = async () => {
        const rows = parse();
        if (!rows.length) { toast('No se detectaron leads válidos', 'error'); return; }
        let ok = 0;
        for (const r of rows) {
          try { await prospectos.add({ ...r, origen: 'Manual', estado: 'Nuevo' }); ok++; } catch (e) { console.error('bulk lead', e); }
        }
        document.getElementById('modalOverlay').classList.remove('open');
        save.textContent = 'Guardar';
        toast(`${ok} lead(s) importados`, ok ? 'success' : 'error');
        render();
      };
      document.getElementById('modalOverlay').classList.add('open');
    },
  };
}
