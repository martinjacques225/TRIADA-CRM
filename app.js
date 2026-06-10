// app.js — Tríada Diagnóstico CRM orchestrator
import { initDB, config, prospectos, diagnosticos, propuestas, citas, importLandingLeads, setCurrentUser } from './js/db.js';
import { requireAuth, signOut } from './js/auth.js';
import { supabase } from './js/supabase.js';

let _profile = null;
import { S } from './js/state.js';
import { toast, escHtml, PIPELINE_STAGES } from './js/utils.js';

import * as ModHome          from './modules/home/home.js';
import * as ModPipeline      from './modules/pipeline/pipeline.js';
import * as ModDiagnosticos  from './modules/diagnosticos/diagnosticos.js';
import * as ModAgenda        from './modules/agenda/agenda.js';
import * as ModPropuestas    from './modules/propuestas/propuestas.js';
import * as ModInformes      from './modules/informes/informes.js';
import * as ModConfig        from './modules/configuracion/configuracion.js';

import {
  closeModal,
  openProspectoModal, openProspectoDetail,
  openDiagnosticoModal,
  openCitaModal, openCitaModalForProspecto,
  openPropuestaModal, openPropuestaModalForProspecto,
  deleteProspecto, deleteCita, deletePropuesta,
} from './modules/modals/modals.js';
import { openInformeViewer } from './modules/informe-ejecutivo/informe.view.js';

// ════ NAV ════
const NAV_ITEMS = [
  { id: 'home',         icon: _icoHome(),    label: 'Inicio' },
  { id: 'pipeline',     icon: _icoPipe(),    label: 'Pipeline' },
  { id: 'diagnosticos', icon: _icoDiag(),    label: 'Diagnósticos' },
  { id: 'agenda',       icon: _icoAgenda(),  label: 'Agenda' },
  { id: 'propuestas',   icon: _icoProp(),    label: 'Propuestas' },
  { id: 'informes',     icon: _icoChart(),   label: 'Informes' },
  { id: 'config',       icon: _icoConfig(),  label: 'Configuración' },
];

export async function navigate(view) {
  S.view = view;
  S.searchQ = '';
  S.searchEstado = '';
  await renderNav();
  await refreshCenter();
}

async function refreshCenter() {
  const map = {
    home:         ModHome.render,
    pipeline:     ModPipeline.render,
    diagnosticos: ModDiagnosticos.render,
    agenda:       ModAgenda.render,
    propuestas:   ModPropuestas.render,
    informes:     ModInformes.render,
    config:       ModConfig.render,
  };
  const fn = map[S.view];
  if (fn) await fn();
}

export async function refreshView() {
  await refreshCenter();
}

export async function renderNav() {
  const nombre  = _profile?.nombre || await config.get('userName') || 'Consultor';
  const cargo   = _profile?.role   || await config.get('cargo')    || 'Tríada';
  let nuevos = 0;
  try { nuevos = (await prospectos.getAll()).filter(p => p.estado === 'Nuevo').length; } catch (_) {}
  const badges = { pipeline: nuevos };
  const nav = document.getElementById('nav');
  nav.innerHTML = `
    <a class="nav-brand" href="#" onclick="navigate('home');return false">
      <svg width="26" height="26" viewBox="0 0 120 120" fill="none">
        <path d="M26 90 L60 62 L94 90" stroke="#1E2761" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M26 73 L60 45 L94 73" stroke="#028090" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M26 56 L60 28 L94 56" stroke="#4FB286" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>TRÍADA <b style="font-weight:800;color:var(--primary)">CRM</b></span>
    </a>
    <button class="nav-create" onclick="window._app.openProspectoModal()">
      <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"/></svg>
      Nuevo prospecto
    </button>
    <div class="nav-section-label">Principal</div>
    ${NAV_ITEMS.slice(0,2).map(i=>_navItem(i,badges)).join('')}
    <div class="nav-section-label">Gestión</div>
    ${NAV_ITEMS.slice(2,5).map(i=>_navItem(i,badges)).join('')}
    <div class="nav-section-label">Análisis</div>
    ${NAV_ITEMS.slice(5).map(i=>_navItem(i,badges)).join('')}
    <a class="nav-footer nav-user-link" href="#" onclick="navigate('config');return false" title="Configuración">
      <div class="nav-user">
        <div class="avatar" style="width:36px;height:36px;background:var(--navy);font-size:14px">${(nombre[0]||'C').toUpperCase()}</div>
        <div style="flex:1;min-width:0"><div class="nav-user-name">${escHtml(nombre)}</div><div class="nav-user-role">${escHtml(cargo)}</div></div>
        <span class="nav-user-gear">${_icoConfig()}</span>
      </div>
    </a>
    <button onclick="window._app.signOut()" title="Cerrar sesión" style="display:flex;align-items:center;gap:7px;width:100%;padding:8px 16px;margin-top:2px;border:none;background:none;color:var(--text3);font-size:12.5px;cursor:pointer;border-radius:8px;transition:background .15s" onmouseover="this.style.background='var(--surface2)';this.style.color='var(--danger)'" onmouseout="this.style.background='none';this.style.color='var(--text3)'">
      <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clip-rule="evenodd"/></svg>
      Cerrar sesión
    </button>`;
}

function _navItem(item, badges = {}) {
  const b = badges[item.id];
  return `<a class="nav-item${S.view===item.id?' active':''}" href="#" onclick="navigate('${item.id}');return false">
    <span class="nav-icon">${item.icon}</span><span class="nav-item-label">${escHtml(item.label)}</span>${b ? `<span class="nav-badge">${b}</span>` : ''}
  </a>`;
}

// ════ INIT ════
async function init() {
  const user = await requireAuth();
  setCurrentUser(user.id);
  try {
    const { data } = await supabase.from('profiles').select('nombre, role, area').eq('id', user.id).single();
    _profile = data;
  } catch (_) {}
  await initDB();

  const theme = await config.get('theme') || 'light';
  document.documentElement.setAttribute('data-theme', theme);

  // Modal close
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalCancel').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  });

  // Register global app API
  window._app = {
    navigate, refreshView, renderNav,
    openProspectoModal, openProspectoDetail,
    openDiagnosticoModal,
    openNuevoDiagnostico: async () => {
      const all = await prospectos.getAll();
      if (!all.length) { toast('Primero agrega un prospecto', 'info'); return; }
      // Open picker
      _openSimpleModal('Seleccionar prospecto', `
        <div class="form-group">
          <label>Prospecto</label>
          <select id="pickProspecto">
            <option value="">— Selecciona —</option>
            ${all.map(p=>`<option value="${p.id}">${escHtml(p.nombre+(p.empresa?' — '+p.empresa:''))}</option>`).join('')}
          </select>
        </div>`, async () => {
        const pid = document.getElementById('pickProspecto').value;
        if (!pid) { toast('Selecciona un prospecto', 'error'); return; }
        openDiagnosticoModal(pid);
      });
    },
    openCitaModal, openCitaModalForProspecto,
    openPropuestaModal, openPropuestaModalForProspecto,
    editCita:      (id) => openCitaModal(id),
    editPropuesta: (id) => openPropuestaModal(id),
    deleteProspecto, deleteCita, deletePropuesta,
    openInformeEjecutivo: async (diagId) => {
      const diag = await diagnosticos.get(diagId);
      if (!diag) { toast('Diagnóstico no encontrado', 'error'); return; }
      const prospecto = diag.prospectoId ? await prospectos.get(diag.prospectoId) : null;
      const evaluador = {
        nombre:  _profile?.nombre || await config.get('userName') || 'Equipo Tríada',
        cargo:   _profile?.role   || await config.get('cargo')    || 'Consultoría Estratégica',
        empresa: await config.get('empresa') || 'Tríada',
      };
      openInformeViewer(diag, prospecto, evaluador);
    },
    deleteDiagnostico: async (id) => {
      if (!confirm('¿Eliminar este diagnóstico y su informe?')) return;
      await diagnosticos.delete(id);
      toast('Diagnóstico eliminado', 'info');
      await refreshView();
    },
    callProspecto: async (id) => {
      const p = await prospectos.get(id);
      if (p?.telefono) window.open(`tel:${p.telefono}`);
    },
    signOut,
    importLanding: async () => {
      const cnt = await importLandingLeads();
      if (cnt > 0) { toast(`${cnt} lead(s) importados del landing ✅`, 'success'); await refreshView(); }
      else toast('No hay leads nuevos del landing', 'info');
    },
    exportarDatos: async () => {
      const data = { prospectos: await prospectos.getAll(), diagnosticos: await diagnosticos.getAll(), propuestas: await propuestas.getAll(), citas: await citas.getAll() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `triada-crm-${new Date().toISOString().slice(0,10)}.json`; a.click();
    },
    limpiarDatos: async () => {
      if (!confirm('¿Seguro? Se eliminarán TODOS los datos del CRM.')) return;
      const all_p = await prospectos.getAll(); for (const p of all_p) await prospectos.delete(p.id);
      const all_d = await diagnosticos.getAll(); for (const d of all_d) await diagnosticos.delete(d.id);
      const all_c = await citas.getAll(); for (const c of all_c) await citas.delete(c.id);
      const all_pr = await propuestas.getAll(); for (const p of all_pr) await propuestas.delete(p.id);
      toast('Datos eliminados', 'info'); await refreshView();
    },
  };

  // Import landing leads on startup
  const cnt = await importLandingLeads();
  if (cnt > 0) toast(`${cnt} lead(s) nuevos del landing importados`, 'success');

  await renderNav();
  await navigate('home');
}

function _openSimpleModal(title, bodyHtml, onSave) {
  document.getElementById('modalTitle').textContent = title;
  document.querySelector('.modal-box').className = 'modal-box';
  document.getElementById('modalBody').innerHTML = bodyHtml;
  document.getElementById('modalSave').style.display = '';
  document.getElementById('modalSave').onclick = onSave;
  document.getElementById('modalOverlay').classList.add('open');
}

// ════ SVG ICONS (inline, no deps) ════
function _icoHome()   { return `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/></svg>`; }
function _icoPipe()   { return `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 4a1 1 0 011-1h5a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V4zm7 0a1 1 0 011-1h5a1 1 0 011 1v7a1 1 0 01-1 1h-5a1 1 0 01-1-1V4z"/></svg>`; }
function _icoDiag()   { return `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"/></svg>`; }
function _icoAgenda() { return `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"/></svg>`; }
function _icoProp()   { return `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z"/><path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/></svg>`; }
function _icoChart()  { return `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/></svg>`; }
function _icoConfig() { return `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/></svg>`; }

document.addEventListener('DOMContentLoaded', init);
