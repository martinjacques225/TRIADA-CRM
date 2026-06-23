// app.js — Tríada Diagnóstico CRM orchestrator
import { initDB, config, prospectos, diagnosticos, propuestas, citas, clientes, facturas, autodiags, importLandingLeads, setCurrentUser, getCurrentUserId } from './js/db.js';
import { requireAuth, signOut } from './js/auth.js';
import { supabase } from './js/supabase.js';

let _profile = null;

// El enum area_t guarda slugs ('tecnologia'); la UI usa labels ('Tecnología').
// Mandar el label rompía el UPDATE con 22P02 y el área nunca persistía.
const AREA_TO_DB   = { 'Tecnología': 'tecnologia', 'Ventas': 'ventas', 'Finanzas': 'finanzas' };
const AREA_FROM_DB = Object.fromEntries(Object.entries(AREA_TO_DB).map(([k, v]) => [v, k]));

async function _setArea(area) {
  _profile = { ..._profile, area };
  S.profile = _profile;
  await renderNav();
  const uid = getCurrentUserId();
  if (uid) {
    const { error } = await supabase.from('profiles').update({ area: AREA_TO_DB[area] || null }).eq('id', uid);
    if (error) console.error('No se pudo persistir el área activa:', error);
  }
}
import { S } from './js/state.js';
import { toast, escHtml, PIPELINE_STAGES, DIAG_AREAS, DIAG_PREGUNTAS, scorePct } from './js/utils.js';

import * as ModHome          from './modules/home/home.js';
import * as ModPipeline      from './modules/pipeline/pipeline.js';
import * as ModDiagnosticos  from './modules/diagnosticos/diagnosticos.js';
import * as ModAgenda        from './modules/agenda/agenda.js';
import * as ModPropuestas    from './modules/propuestas/propuestas.js';
import * as ModInformes      from './modules/informes/informes.js';
import * as ModConfig        from './modules/configuracion/configuracion.js';
import * as ModFacturacion   from './modules/facturacion/facturacion.js';
import * as ModAiCommander   from './modules/ai-commander/ai-commander.js';
import * as ModLeads         from './modules/leads/leads.js';
import * as ModProspectos    from './modules/prospectos/prospectos.js';
import * as ModClientes      from './modules/clientes/clientes.js';
import * as ModPresupuestos  from './modules/presupuestos/presupuestos.js';

import {
  closeModal,
  openProspectoModal, openProspectoDetail,
  openDiagnosticoModal,
  openCitaModal, openCitaModalForProspecto,
  openPropuestaModal, openPropuestaModalForProspecto,
  openFacturaModal, openFacturaModalForCliente, editFactura, deleteFactura,
  convertirACliente, openAddClienteModal, deleteCliente,
  openPresupuestoModal, deletePresupuesto,
  deleteProspecto, deleteCita, deletePropuesta,
} from './modules/modals/modals.js';
import { openMeetingDetail } from './modules/agenda/agenda.js';
import { initReminders } from './modules/agenda/reminders.js';
import { openInformeViewer } from './modules/informe-ejecutivo/informe.view.js';
import { initMascota, setMascotaEnabled, setMascota } from './modules/mascota/mascota.js';
import { initModalA11y } from './js/modal-a11y.js';

// ════ NAV ════
// Orden que sigue la presentación comercial: Principal → Gestión → Desarrollo → Análisis.
const NAV_SECTIONS = [
  { label: 'Principal', items: [
    { id: 'home',         icon: _icoHome(),       label: 'Inicio' },
    { id: 'leads',        icon: _icoLeads(),      label: 'Leads' },
    { id: 'pipeline',     icon: _icoPipe(),       label: 'Pipeline' },
    { id: 'agenda',       icon: _icoAgenda(),     label: 'Agenda' },
  ]},
  { label: 'Gestión', items: [
    { id: 'prospectos',   icon: _icoProspectos(), label: 'Prospectos' },
    { id: 'diagnosticos', icon: _icoDiag(),       label: 'Diagnóstico' },
    { id: 'propuestas',   icon: _icoProp(),       label: 'Propuesta' },
    { id: 'presupuestos', icon: _icoPresup(),     label: 'Presupuesto' },
    { id: 'clientes',     icon: _icoClientes(),   label: 'Clientes' },
    { id: 'facturacion',  icon: _icoFactura(),    label: 'Facturación' },
  ]},
  { label: 'Desarrollo', items: [
    { id: 'ai-commander', icon: _icoAi(),         label: 'Director de Orquesta' },
  ]},
  { label: 'Análisis', items: [
    { id: 'informes',     icon: _icoChart(),      label: 'Informes' },
  ]},
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
    leads:        ModLeads.render,
    pipeline:     ModPipeline.render,
    agenda:       ModAgenda.render,
    prospectos:   ModProspectos.render,
    diagnosticos: ModDiagnosticos.render,
    propuestas:   ModPropuestas.render,
    presupuestos: ModPresupuestos.render,
    clientes:     ModClientes.render,
    facturacion:  ModFacturacion.render,
    'ai-commander': ModAiCommander.render,
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
  // Conteo server-side: antes traía TODA la tabla leads en cada navegación solo
  // para contar los 'Nuevo' del badge. Ahora es un count head (0 filas).
  try { nuevos = await prospectos.countByEstado('Nuevo'); }
  catch (err) { console.warn('No se pudo contar leads "Nuevo" para el badge:', err); }
  const badges = { leads: nuevos };
  const nav = document.getElementById('nav');
  nav.innerHTML = `
    <a class="nav-brand nav-brand-hero" href="#" onclick="navigate('home');return false" title="Tríada Consultoría">
      <span class="brand-mark-wrap">
        <svg class="brand-mark" width="38" height="38" viewBox="0 0 120 120" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="bm1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="var(--green)"/><stop offset="1" stop-color="var(--teal)"/>
            </linearGradient>
          </defs>
          <path class="bm-a3" d="M26 90 L60 62 L94 90" stroke="var(--navy)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
          <path class="bm-a2" d="M26 73 L60 45 L94 73" stroke="var(--teal)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
          <path class="bm-a1" d="M26 56 L60 28 L94 56" stroke="url(#bm1)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
      <span class="brand-text">
        <span class="brand-name">Tríada<span class="brand-dot">·</span></span>
        <span class="brand-tag">Consultoría 360</span>
      </span>
    </a>
    ${NAV_SECTIONS.map(sec => `
      <div class="nav-section-label">${escHtml(sec.label)}</div>
      ${sec.items.map(i => _navItem(i, badges)).join('')}
    `).join('')}
    <div style="padding:8px 14px 6px;border-top:1px solid var(--border);margin-top:4px">
      <div style="font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--text3);margin-bottom:6px">Área activa</div>
      <div style="display:flex;gap:6px">
        ${[
          ['Tecnología','Tec','<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 2v2.5M15 2v2.5M9 19.5V22M15 19.5V22M2 9h2.5M2 15h2.5M19.5 9H22M19.5 15H22"/>'],
          ['Ventas','Vnts','<path d="M3 17 9.5 10.5l4 4L21 7"/><path d="M15 7h6v6"/>'],
          ['Finanzas','Fin','<ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3"/><path d="M9 12.9V17c0 1.7 2.7 3 6 3s6-1.3 6-3v-5c0-1.7-2.7-3-6-3"/>'],
        ].map(([a,lbl,inner]) => {
          const sel = _profile?.area === a;
          return `<button onclick="window._app.setArea('${a}')" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;padding:9px 2px 7px;font-size:9.5px;font-weight:600;border-radius:9px;border:1px solid ${sel?'transparent':'var(--border)'};background:${sel?'var(--teal-l)':'transparent'};color:${sel?'var(--teal)':'var(--text3)'};cursor:pointer;transition:var(--tr);line-height:1.2"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>${lbl}</button>`;
        }).join('')}
      </div>
    </div>
    <a class="nav-footer nav-user-link" href="#" onclick="navigate('config');return false" title="Configuración">
      <div class="nav-user">
        <div class="avatar" style="width:36px;height:36px;background:var(--navy);font-size:14px">${(nombre[0]||'C').toUpperCase()}</div>
        <div style="flex:1;min-width:0"><div class="nav-user-name">${escHtml(nombre)}</div><div class="nav-user-role">${escHtml(cargo)}</div></div>
        <span class="nav-user-gear">${_icoConfig()}</span>
      </div>
    </a>
    <button onclick="window._app.signOut()" title="Cerrar sesión" style="display:flex;align-items:center;gap:7px;width:100%;padding:8px 16px;margin-top:2px;border:none;background:none;color:var(--text3);font-size:12.5px;cursor:pointer;border-radius:8px;transition:background .15s" onmouseover="this.style.background='var(--surface2)';this.style.color='var(--danger)'" onmouseout="this.style.background='none';this.style.color='var(--text3)'">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="15" height="15" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
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
    if (data) data.area = AREA_FROM_DB[data.area] || data.area; // slug DB → label UI
    _profile = data;
    S.profile = data;
  } catch (err) { console.error('No se pudo cargar el perfil del usuario:', err); }
  await initDB();

  const theme = await config.get('theme') || 'light';
  document.documentElement.setAttribute('data-theme', theme);
  const density = await config.get('density') || 'comfortable';
  document.documentElement.setAttribute('data-density', density);
  _applyFontScale(await config.get('fontScale') || '1');

  // Modal close
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalCancel').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  });
  // Accesibilidad del modal: focus-trap + Esc + retorno de foco (C1/UX-1).
  initModalA11y();

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
    openCitaDetail: (id) => openMeetingDetail(id),
    openPropuestaModal, openPropuestaModalForProspecto,
    editCita:      (id) => openCitaModal(id),
    editPropuesta: (id) => openPropuestaModal(id),
    openFacturaModal, openFacturaModalForCliente, editFactura, deleteFactura,
    convertirACliente, openAddClienteModal, deleteCliente,
    openPresupuestoModal, deletePresupuesto,
    editPresupuesto: (id) => openPresupuestoModal(id),
    propuestaPDF:    (id) => ModPropuestas.propuestaPDF(id),
    presupuestoPDF:  (id) => ModPresupuestos.presupuestoPDF(id),
    exportInformePDF: () => ModInformes.exportInformePDF(),
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
      else toast('Sin teléfono registrado', 'info');
    },
    contactWhatsApp: async (id) => {
      const p = await prospectos.get(id);
      const digits = String(p?.telefono || '').replace(/\D/g, '');
      if (!digits) { toast('Sin teléfono registrado', 'info'); return; }
      // Normaliza a formato internacional Chile (+56) si no trae código de país
      const phone = digits.startsWith('56') ? digits : '56' + digits.replace(/^0+/, '');
      const nombre = (p?.nombre || '').split(' ')[0];
      const msg = `Hola ${nombre} 👋, te contacto desde Tríada Consultoría.`;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    },
    contactZoom: async (id) => {
      // Inicia una reunión Zoom instantánea; el anfitrión comparte el enlace con el lead.
      window.open('https://zoom.us/start/videomeeting', '_blank');
    },
    setArea: _setArea,
    setDensity: async (d) => {
      document.documentElement.setAttribute('data-density', d);
      await config.set('density', d);
    },
    setTheme: async (t) => {
      document.documentElement.setAttribute('data-theme', t);
      await config.set('theme', t);
    },
    setFontScale: async (s) => {
      _applyFontScale(s);
      await config.set('fontScale', String(s));
    },
    setMascotaEnabled: (on) => setMascotaEnabled(on),
    setMascota: (t) => setMascota(t),
    compartirDiagPorArea: async (diagId) => {
      const diag = await diagnosticos.get(diagId);
      if (!diag) { toast('Diagnóstico no encontrado', 'error'); return; }
      const prospecto = diag.prospectoId ? await prospectos.get(diag.prospectoId) : null;
      const empresa   = prospecto?.empresa || prospecto?.nombre || 'Cliente';

      const scores = {
        tec:      scorePct(diag.scoresTec),
        ventas:   scorePct(diag.scoresVentas),
        finanzas: scorePct(diag.scoresFinanzas),
      };

      _openSimpleModal('Compartir diagnóstico por área', `
        <p style="font-size:13px;color:var(--text3);margin-bottom:14px">
          Haz clic en un área para copiar el resumen y abrir WhatsApp.
        </p>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${DIAG_AREAS.map(a => `
            <button class="btn btn-ghost" style="justify-content:flex-start;gap:10px"
              onclick="window._app._sendAreaMsg('${diagId}','${a.id}')">
              <span style="font-size:16px">${a.icon}</span>
              <span style="flex:1;text-align:left">${escHtml(a.label)}</span>
              <span style="font-weight:700;color:${a.color}">${scores[a.id]}%</span>
            </button>`).join('')}
        </div>
      `, null);
      document.getElementById('modalSave').style.display = 'none';
      document.getElementById('modalCancel').textContent = 'Cerrar';
    },
    _sendAreaMsg: async (diagId, areaId) => {
      const diag      = await diagnosticos.get(diagId);
      const prospecto = diag?.prospectoId ? await prospectos.get(diag.prospectoId) : null;
      const empresa   = prospecto?.empresa || prospecto?.nombre || 'Cliente';
      const area      = DIAG_AREAS.find(a => a.id === areaId);
      const areaScores = areaId === 'tec' ? diag?.scoresTec : areaId === 'ventas' ? diag?.scoresVentas : diag?.scoresFinanzas;
      const score     = scorePct(areaScores);
      const nivel     = score >= 80 ? 'Maduro ✅' : score >= 50 ? 'En desarrollo ⚠️' : 'Crítico 🔴';
      const preguntas = DIAG_PREGUNTAS[areaId] || [];

      const lineasPreg = preguntas.map((q, i) => {
        const resp = (areaScores || [])[i];
        const mark = (resp === true || resp === 1) ? '✅' : resp === 0.5 ? '◐' : (resp === false || resp === 0) ? '❌' : '⬜';
        return `${mark} ${q}`;
      });

      const hallazgos    = (diag?.hallazgos    || []).slice(0, 5);
      const oportunidades = (diag?.oportunidades || []).slice(0, 4);

      const msg = [
        `🔍 *Diagnóstico 360 – ${empresa}*`,
        `📊 Área: ${area?.icon} *${area?.label}* · Score: ${score}% (${nivel})`,
        '',
        lineasPreg.length ? `*Respuestas:*\n${lineasPreg.join('\n')}` : '',
        hallazgos.length  ? `\n*Hallazgos detectados:*\n${hallazgos.map(h => `⚠ ${h}`).join('\n')}` : '',
        oportunidades.length ? `\n*Oportunidades de mejora:*\n${oportunidades.map(o => `💡 ${o}`).join('\n')}` : '',
        '',
        '_Diagnóstico realizado con TRIADA CRM_',
      ].filter(x => x !== '').join('\n');

      try { await navigator.clipboard.writeText(msg); toast('Texto copiado al portapapeles ✓', 'success'); } catch (_) {}
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    },
    compartirDiag: async (id, empresa) => {
      const base = 'https://martinjacques225.github.io/TRIADA-CRM/diagnostico-publico.html';
      const url  = `${base}?id=${id}&empresa=${encodeURIComponent(empresa)}`;
      try {
        await navigator.clipboard.writeText(url);
        toast('Enlace copiado al portapapeles ✓', 'success');
      } catch (_) {
        prompt('Copia este enlace para el cliente:', url);
      }
    },
    signOut,
    importLanding: async () => {
      const cnt = await importLandingLeads();
      if (cnt > 0) { toast(`${cnt} lead(s) importados del landing ✅`, 'success'); await refreshView(); }
      else toast('No hay leads nuevos del landing', 'info');
    },
    exportarDatos: async () => {
      const data = {
        prospectos:   await prospectos.getAll(),
        diagnosticos: await diagnosticos.getAll(),
        propuestas:   await propuestas.getAll(),
        citas:        await citas.getAll(),
        clientes:     await clientes.getAll(),
        facturas:     await facturas.getAll(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `triada-crm-${new Date().toISOString().slice(0,10)}.json`; a.click();
    },
    limpiarDatos: async () => {
      if (!confirm('¿Seguro? Se eliminarán TODOS los datos del CRM.')) return;
      try {
        // Orden FK-seguro: hijos antes que padres (facturas→clientes, todo→leads)
        for (const f of await facturas.getAll())     await facturas.delete(f.id);
        for (const p of await propuestas.getAll())   await propuestas.delete(p.id);
        for (const d of await diagnosticos.getAll()) await diagnosticos.delete(d.id);
        for (const c of await citas.getAll())        await citas.delete(c.id);
        for (const c of await clientes.getAll())     await clientes.delete(c.id);
        // autodiagnosticos es tabla opcional: falla suave si no se corrió su SQL.
        try { for (const a of await autodiags.getAll()) await autodiags.delete(a.id); }
        catch (err) { console.warn('Limpieza: no se pudieron borrar autodiagnósticos (¿tabla ausente?):', err?.message || err); }
        for (const p of await prospectos.getAll())   await prospectos.delete(p.id);
        toast('Datos eliminados', 'info');
      } catch (err) {
        console.error('Error al limpiar datos:', err);
        toast(err?.message || 'No se pudieron eliminar todos los datos', 'error');
      }
      await refreshView();
    },
  };

  // Import landing leads on startup
  const cnt = await importLandingLeads();
  if (cnt > 0) toast(`${cnt} lead(s) nuevos del landing importados`, 'success');

  await renderNav();
  await navigate('home');

  // Dock de recordatorios + campana del topbar (vive en todos los módulos)
  try { await initReminders(); } catch (err) { console.error('No se pudo iniciar el motor de recordatorios:', err); }
  // Mascota de la compañía (opt-in; se controla desde Configuración)
  try { await initMascota(); } catch (err) { console.error('No se pudo iniciar la mascota:', err); }
}

// Escala global de tipografía/UI. Valores: 0.9 / 1 / 1.1 / 1.25
// `zoom` escala toda la UI y hoy lo soportan Chrome/Edge/Safari y Firefox ≥126.
// Para motores SIN `zoom` (Firefox viejo), se cae a `transform: scale()` estándar
// con compensación de tamaño (UX-3 de la Auditoría 360).
const _ZOOM_OK = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('zoom', '1');
function _applyFontScale(scale) {
  const s = Number(scale) || 1;
  const root = document.documentElement;
  if (_ZOOM_OK) {
    root.style.zoom = s === 1 ? '' : String(s);
    return;
  }
  // Fallback: escalar desde la esquina superior izquierda y compensar el ancho/alto
  // para que el contenido siga ocupando el viewport completo.
  const b = document.body;
  if (s === 1) {
    b.style.transform = b.style.transformOrigin = b.style.width = b.style.height = '';
  } else {
    b.style.transformOrigin = 'top left';
    b.style.transform = `scale(${s})`;
    b.style.width = `${100 / s}%`;
    b.style.height = `${100 / s}%`;
  }
}

function _openSimpleModal(title, bodyHtml, onSave) {
  document.getElementById('modalTitle').textContent = title;
  document.querySelector('.modal-box').className = 'modal-box';
  document.getElementById('modalBody').innerHTML = bodyHtml;
  document.getElementById('modalSave').style.display = '';
  document.getElementById('modalSave').onclick = onSave;
  document.getElementById('modalOverlay').classList.add('open');
}

// ════ SVG ICONS — set de línea profesional (trazo currentColor, viewBox 24) ════
function _ln(inner) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`; }
function _icoHome()   { return _ln('<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>'); }
function _icoPipe()   { return _ln('<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="11" rx="1.5"/><rect x="17" y="4" width="4" height="7" rx="1.5"/>'); }
function _icoDiag()   { return _ln('<path d="M3 12h3l2-5 4 11 2.5-7 1.5 3h5"/>'); }
function _icoAgenda() { return _ln('<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9h18M8 2.5v4M16 2.5v4"/><path d="M8 13h2M14 13h2M8 17h2"/>'); }
function _icoProp()   { return _ln('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 16.5h4"/>'); }
function _icoChart()  { return _ln('<path d="M4 20V4M4 20h16"/><rect x="7" y="11" width="3" height="6"/><rect x="12" y="7" width="3" height="10"/><rect x="17" y="13" width="3" height="4"/>'); }
function _icoConfig() { return _ln('<path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h7M15 18h5"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="13" cy="18" r="2"/>'); }
function _icoFactura(){ return _ln('<path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"/><path d="M9 7h6M9 11h6M9 15h3"/>'); }
function _icoAi()     { return _ln('<path d="M12 3v3M5.5 6.5l2 2M18.5 6.5l-2 2"/><rect x="6" y="8" width="12" height="11" rx="3"/><circle cx="9.5" cy="13" r="1.2"/><circle cx="14.5" cy="13" r="1.2"/><path d="M9.5 16h5"/>'); }
function _icoLeads()  { return _ln('<path d="M3 5h18M3 5v6a9 9 0 0 0 18 0V5"/><path d="M12 14v6M8 20h8"/>'); }
function _icoProspectos(){ return _ln('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5"/><path d="M17 8h4M19 6v4"/>'); }
function _icoClientes(){ return _ln('<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5"/><path d="m15.5 9 1.4 1.4 2.6-2.6"/>'); }
function _icoPresup() { return _ln('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/><path d="M16.5 16.5 18 18l3-3"/>'); }

document.addEventListener('DOMContentLoaded', init);
