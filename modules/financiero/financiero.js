// modules/financiero/financiero.js
// ── Módulo Financiero trIA (M2 "Lector IA" del Plan Maestro) ──────────────────
// "Dirigir en vez de llamar" (SIN API): subes/tipeas tus datos → el CRM genera un
// prompt-director → lo llevas a tu IA (Gemini/Claude) → pegas el JSON → informe
// financiero con la marca Tríada. Composition root: lista + KPIs y orquesta el
// flujo (FinancieroFlow) y el visor del informe. Interactividad por delegación.
import { analisisFinancieros, clientes as clientesRepo } from '../../js/db.js';
import { escHtml, formatDate, toast } from '../../js/utils.js';
import { S } from '../../js/state.js';
import { FIN_TIPOS, findTipo } from './domain/analisis.js';
import { FinancieroFlow } from './presentation/financiero.view.js';
import { openFinReport } from './presentation/informe-fin.view.js';

const _i = (n, s) => (window.icon ? window.icon(n, '', s) : '');

const ESTADO_META = {
  borrador:  { label: 'Borrador',      color: '#6B7686' },
  generado:  { label: 'Prompt listo',  color: '#C0892F' },
  analizado: { label: 'Informe listo', color: '#2E9B73' },
};
const estadoMeta = (e) => ESTADO_META[e] || ESTADO_META.borrador;
const isAdmin = () => S.profile?.role === 'admin';

// Estado del módulo (persiste entre navegaciones dentro de la sesión)
let _mode = 'list';   // 'list' | 'flow'
let _flow = null;
let _items = [];
let _cliById = {};

export async function render() {
  if (_mode === 'flow' && _flow) { await _flow.render(document.getElementById('center')); return; }
  await _renderList();
}

async function _renderList() {
  const center = document.getElementById('center');
  center.innerHTML = `<div class="view-animate"><div class="fin-loading">Cargando análisis financieros…</div></div>`;

  let items = [], clientes = [];
  try {
    [items, clientes] = await Promise.all([
      analisisFinancieros.getAll(),
      clientesRepo.getAll().catch(() => []),
    ]);
  } catch (err) {
    console.error('No se pudo cargar el módulo financiero:', err);
    center.innerHTML = `<div class="view-animate"><div class="empty-state">
      <div class="empty-icon">${_i('alert')}</div><h3>No se pudo cargar</h3>
      <p>${escHtml(err?.message || 'Error de conexión')}</p></div></div>`;
    return;
  }
  _items = items;
  _cliById = Object.fromEntries(clientes.map((c) => [c.id, c.razonSocial || c.nombre || 'Cliente']));

  const now = new Date();
  const delMes = items.filter((x) => { const d = new Date(x.fecha); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length;
  const informes = items.filter((x) => x.estado === 'analizado').length;

  center.innerHTML = `<div class="view-animate financiero-view">
    <div class="section-head">
      <div>
        <h2>Análisis Financiero <span class="fin-tria">trIA</span></h2>
        <p class="fin-sub">Sube tus cierres, IVA o liquidaciones y recibe un diagnóstico con formato Tríada. Sin exponer tus datos a terceros.</p>
      </div>
      <button class="btn btn-primary" data-fin="new">${_i('upload', 16)} Nuevo análisis</button>
    </div>

    <div class="kpi-grid" style="margin-bottom:20px">
      <div class="kpi-card"><div class="kpi-top"><span class="kpi-label">Análisis</span><span class="kpi-ic" style="background:var(--primary-l);color:var(--primary)">${_i('fileText')}</span></div>
        <div class="kpi-value">${items.length}</div><div class="kpi-sub">En total</div></div>
      <div class="kpi-card"><div class="kpi-top"><span class="kpi-label">Este mes</span><span class="kpi-ic" style="background:var(--green-l);color:var(--green)">${_i('layers')}</span></div>
        <div class="kpi-value">${delMes}</div><div class="kpi-sub">Creados este mes</div></div>
      <div class="kpi-card"><div class="kpi-top"><span class="kpi-label">Informes</span><span class="kpi-ic" style="background:var(--violet-l);color:var(--violet)">${_i('download')}</span></div>
        <div class="kpi-value">${informes}</div><div class="kpi-sub">Listos para PDF</div></div>
    </div>

    ${items.length === 0
      ? `<div class="empty-state">
          <div class="empty-icon">${_i('fileText')}</div>
          <h3>Aún no hay análisis</h3>
          <p>Empieza uno: elige el tipo (cierre de mes, IVA/F29 o remuneraciones), adjunta tus documentos o tipea las cifras, y deja que la IA que ya usas haga el análisis. El informe sale con la marca Tríada.</p>
          <button class="btn btn-primary" data-fin="new">${_i('upload', 16)} Crear el primer análisis</button>
        </div>`
      : `<div class="fin-grid">${items.map((a) => _card(a)).join('')}</div>`}
  </div>`;

  _wireList(center.querySelector('.financiero-view'));
}

function _card(a) {
  const t = findTipo(a.tipo);
  const em = estadoMeta(a.estado);
  const cli = a.clienteId && _cliById[a.clienteId] ? _cliById[a.clienteId] : 'Interno';
  return `<article class="fin-card" data-fin-id="${a.id}">
    <div class="fin-card-ic">${t.icon}</div>
    <div class="fin-card-main">
      <div class="fin-card-tt">${escHtml(a.titulo || t.label)}</div>
      <div class="fin-card-meta">
        <span class="fin-badge" style="color:${em.color};background:${em.color}18">${escHtml(em.label)}</span>
        <span>${escHtml(t.label)}</span>
        <span>${escHtml(a.periodo || '')}</span>
        <span>· ${escHtml(cli)}</span>
        <span>${escHtml(formatDate(a.fecha))}</span>
      </div>
    </div>
    <div class="fin-card-actions">
      ${a.estado === 'analizado' ? `<button class="btn btn-primary btn-sm" data-fin-act="report" data-fin-id="${a.id}">${_i('download', 15)} Informe</button>` : ''}
      <button class="btn btn-ghost btn-sm" data-fin-act="open" data-fin-id="${a.id}">${a.estado === 'analizado' ? 'Editar' : 'Continuar'}</button>
      <button class="btn-icon btn-sm" data-fin-act="delete" data-fin-id="${a.id}" title="Eliminar" style="color:var(--danger)">${_i('trash', 15)}</button>
    </div>
  </article>`;
}

function _wireList(root) {
  if (!root) return;
  root.addEventListener('click', async (e) => {
    if (e.target.closest('[data-fin="new"]')) { _openFlow(null); return; }
    const btn = e.target.closest('[data-fin-act]');
    if (!btn) return;
    const id = btn.getAttribute('data-fin-id');
    const act = btn.getAttribute('data-fin-act');
    const item = _items.find((x) => x.id === id);
    if (!item) return;
    if (act === 'report') _openReport(item);
    else if (act === 'open') _openFlow(item);
    else if (act === 'delete') await _delete(item);
  });
}

function _openFlow(item) {
  _mode = 'flow';
  _flow = new FinancieroFlow({
    onBack: () => { _mode = 'list'; _flow = null; render(); },
    onSaved: () => { /* la lista se recarga al volver (getAll invalidado en el add/update) */ },
  });
  _flow.load(item);
  render();
}

function _openReport(item) {
  if (!item.reporte) { toast('Este análisis aún no tiene informe generado', 'info'); return; }
  const cli = item.clienteId && _cliById[item.clienteId] ? _cliById[item.clienteId] : '';
  openFinReport(item.reporte, {
    tipoLabel: findTipo(item.tipo).label,
    periodo: item.periodo,
    empresa: cli,
    codigo: item.correlativo || '',
  });
}

async function _delete(item) {
  if (!confirm(`¿Eliminar "${item.titulo || findTipo(item.tipo).label}"? Se borrará el análisis y sus documentos adjuntos.`)) return;
  try {
    await analisisFinancieros.remove(item.id, item.documentos || []);
    toast('Análisis eliminado', 'info');
    await _renderList();
  } catch (err) {
    console.error('No se pudo eliminar el análisis:', err);
    toast(err?.message || 'No se pudo eliminar (¿requiere permiso de admin?)', 'error');
  }
}
