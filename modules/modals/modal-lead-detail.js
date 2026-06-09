// modules/modals/modal-lead-detail.js — Ficha lateral profesional del Lead (Fase 2)
// Panel lateral deslizante: métricas, campos editables e historial cronológico unificado.
import { leads } from '../../services/lead.service.js';
import { calls } from '../../services/call.service.js';
import { appointments } from '../../services/appointment.service.js';
import { sales } from '../../services/sales.service.js';
import { LEAD_ESTADOS, NIVELES_INGLES, PRIORIDADES, ORIGENES } from '../../js/estados.js';
import { S } from '../../js/state.js';
import { escHtml, toast, formatDate, avatarHtml, statusBadgeClass } from '../../js/utils.js';

// ── Inyección del contenedor (una sola vez) ──
function _ensureDom() {
  if (document.getElementById('ldOverlay')) return;
  const el = document.createElement('div');
  el.className = 'ld-overlay';
  el.id = 'ldOverlay';
  el.innerHTML = `<aside class="ld-drawer" id="ldDrawer" role="dialog" aria-modal="true"></aside>`;
  document.body.appendChild(el);
  el.addEventListener('click', e => { if (e.target === el) closeLeadDetail(); });
}

export function closeLeadDetail() {
  S.leadDetailId = null;
  document.getElementById('ldOverlay')?.classList.remove('open');
}

// ── Helpers de tiempo/relativo ──
function _dt(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const fecha = formatDate(ts.slice ? ts.slice(0, 10) : d.toISOString().slice(0, 10));
  const hora = d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  return `${fecha} · ${hora}`;
}

// ── Construcción del timeline unificado ──
async function _buildTimeline(lead) {
  const items = [];
  // Llamadas
  try {
    const cs = await calls.getByLead(lead.id);
    cs.forEach(c => items.push({
      ts: c.timestamp || `${c.fecha || ''}T${c.hora || '00:00'}:00`,
      grupo: 'llamada', icon: '📞',
      title: `Llamada — ${escHtml(c.resultado || 'Registrada')}`,
      sub: c.telefono ? escHtml(c.telefono) : ''
    }));
  } catch {}
  // Citas vinculadas a este lead
  try {
    const all = await appointments.getAll();
    all.filter(a => a.leadId === lead.id).forEach(a => items.push({
      ts: `${a.fecha}T${a.hora || '00:00'}:00`,
      grupo: 'cita', icon: '📅',
      title: `Cita — ${escHtml(a.estado || 'Pendiente')}`,
      sub: `${formatDate(a.fecha)} ${a.hora || ''}${a.interes ? ' · ' + escHtml(a.interes) : ''}`
    }));
  } catch {}
  // Ventas (vinculadas por leadId o por nombre)
  try {
    const nombreLead = `${lead.nombre || ''} ${lead.apellido || ''}`.trim().toLowerCase();
    const vs = await sales.getAll();
    vs.filter(v => (v.leadId && v.leadId === lead.id) || (nombreLead && (v.nombre || '').trim().toLowerCase() === nombreLead))
      .forEach(v => items.push({
        ts: v.timestamp || `${v.fecha}T00:00:00`,
        grupo: 'venta', icon: '💰',
        title: `Venta — ${escHtml(v.plan || 'Plan')}`,
        sub: formatDate(v.fecha)
      }));
  } catch {}
  // Historial interno del lead (seguimientos, cambios de estado, eventos de cita)
  (lead.historial || []).forEach(h => {
    const map = {
      estado:               { grupo: 'estado',      icon: '🔄', title: 'Cambio de estado' },
      seguimiento:          { grupo: 'seguimiento', icon: '📝', title: 'Seguimiento' },
      cita_agendada:        { grupo: 'cita',        icon: '📅', title: 'Cita agendada' },
      cita_eliminada:       { grupo: 'cita',        icon: '🗑️', title: 'Cita eliminada' },
      devuelto_a_leads:     { grupo: 'cita',        icon: '↩️', title: 'Devuelto a Leads' },
      recuperado_de_agenda: { grupo: 'cita',        icon: '♻️', title: 'Recuperado de agenda' }
    };
    const m = map[h.tipo] || { grupo: 'seguimiento', icon: '•', title: 'Actividad' };
    items.push({ ts: h.timestamp, grupo: m.grupo, icon: m.icon, title: m.title, sub: escHtml(h.desc || '') });
  });

  items.sort((a, b) => String(b.ts || '').localeCompare(String(a.ts || '')));
  return items;
}

function _countBy(items, grupo) { return items.filter(i => i.grupo === grupo).length; }

// ── Render principal ──
export async function openLeadDetail(id) {
  _ensureDom();
  const lead = await leads.get(id);
  if (!lead) { toast('Lead no encontrado', 'error'); return; }
  S.leadDetailId = id;

  const timeline = await _buildTimeline(lead);
  const nCalls = _countBy(timeline, 'llamada');
  const drawer = document.getElementById('ldDrawer');
  const opt = (arr, sel, ph) => `<option value="">${ph}</option>` + arr.map(v => `<option${v === sel ? ' selected' : ''}>${v}</option>`).join('');

  drawer.innerHTML = `
    <div class="ld-head">
      <div class="ld-head-main">
        ${avatarHtml(lead.nombre, lead.apellido, lead.avatar, 46)}
        <div class="ld-head-info">
          <div class="ld-head-name">${escHtml((lead.nombre || '') + ' ' + (lead.apellido || ''))}</div>
          <div class="ld-head-badges">
            <span class="${statusBadgeClass(lead.estado)}">${escHtml(lead.estado || 'Nuevo')}</span>
            ${lead.prioridad ? `<span class="ld-prio ld-prio-${lead.prioridad.toLowerCase()}">${escHtml(lead.prioridad)}</span>` : ''}
          </div>
        </div>
      </div>
      <button class="ld-close" id="ldClose" aria-label="Cerrar">✕</button>
    </div>

    <div class="ld-metrics">
      <div class="ld-metric"><span class="ld-metric-n">${nCalls}</span><span class="ld-metric-l">Llamadas</span></div>
      <div class="ld-metric"><span class="ld-metric-n">${_countBy(timeline, 'cita')}</span><span class="ld-metric-l">Citas</span></div>
      <div class="ld-metric"><span class="ld-metric-n">${_countBy(timeline, 'venta')}</span><span class="ld-metric-l">Ventas</span></div>
    </div>
    <div class="ld-dates">
      <span>Creado: <strong>${_dt(lead.fechaCreacion)}</strong></span>
      <span>Última mod.: <strong>${_dt(lead.fechaActualizacion)}</strong></span>
    </div>

    <div class="ld-section">
      <div class="ld-section-title">Datos del lead</div>
      <div class="ld-form">
        <div class="ld-field"><label>Nombre</label><input class="form-input" id="dNombre" value="${escHtml(lead.nombre || '')}"></div>
        <div class="ld-field"><label>Teléfono</label><input class="form-input" id="dTel" value="${escHtml(lead.telefono || '')}"></div>
        <div class="ld-field"><label>Área laboral</label><input class="form-input" id="dArea" value="${escHtml(lead.areaLaboral || '')}"></div>
        <div class="ld-field"><label>Nivel de inglés</label><select class="form-select" id="dNivel">${opt(NIVELES_INGLES, lead.nivelIngles, 'Sin evaluar')}</select></div>
        <div class="ld-field"><label>Interés</label><input class="form-input" id="dInteres" value="${escHtml(lead.interes || '')}"></div>
        <div class="ld-field"><label>Origen del dato</label><select class="form-select" id="dOrigen">${opt(ORIGENES, lead.origen, 'Sin especificar')}</select></div>
        <div class="ld-field"><label>Estado</label><select class="form-select" id="dEstado">${LEAD_ESTADOS.map(e => `<option${lead.estado === e ? ' selected' : ''}>${e}</option>`).join('')}</select></div>
        <div class="ld-field"><label>Prioridad</label><select class="form-select" id="dPrioridad">${opt(PRIORIDADES, lead.prioridad, 'Sin prioridad')}</select></div>
        <div class="ld-field ld-field-full"><label>Observaciones</label><textarea class="form-textarea" id="dObs">${escHtml(lead.observaciones || '')}</textarea></div>
      </div>
      <button class="btn-primary ld-save" id="ldSave">Guardar cambios</button>
    </div>

    <div class="ld-section">
      <div class="ld-section-title">Registrar seguimiento</div>
      <div class="ld-seg-add">
        <input class="form-input" id="dSeg" placeholder="Nota de seguimiento...">
        <button class="btn-secondary" id="ldSeg">Agregar</button>
      </div>
    </div>

    <div class="ld-section">
      <div class="ld-section-title">Historial de actividad</div>
      <div class="ld-timeline" id="ldTimeline">${_timelineHtml(timeline)}</div>
    </div>`;

  document.getElementById('ldOverlay').classList.add('open');

  // ── Eventos ──
  document.getElementById('ldClose').onclick = closeLeadDetail;
  document.getElementById('ldSave').onclick = async () => {
    const data = {
      id,
      nombre:       document.getElementById('dNombre').value.trim(),
      telefono:     document.getElementById('dTel').value.trim(),
      areaLaboral:  document.getElementById('dArea').value.trim(),
      nivelIngles:  document.getElementById('dNivel').value,
      interes:      document.getElementById('dInteres').value.trim(),
      origen:       document.getElementById('dOrigen').value,
      estado:       document.getElementById('dEstado').value,
      prioridad:    document.getElementById('dPrioridad').value,
      observaciones:document.getElementById('dObs').value.trim()
    };
    if (!data.nombre) { toast('El nombre es obligatorio', 'error'); return; }
    await leads.update(data);
    toast('Lead actualizado', 'success');
    await openLeadDetail(id);                       // refresca métricas/timeline
    if (S.view === 'leads') window._app?.refreshView?.();
  };
  document.getElementById('ldSeg').onclick = async () => {
    const inp = document.getElementById('dSeg');
    const desc = inp.value.trim();
    if (!desc) return;
    await leads.addHistorial(id, { tipo: 'seguimiento', desc });
    toast('Seguimiento registrado', 'success');
    await openLeadDetail(id);
    if (S.view === 'leads') window._app?.refreshView?.();
  };
}

function _timelineHtml(items) {
  if (!items.length) return `<div class="ld-empty">Sin actividad registrada aún.</div>`;
  return items.map(i => `
    <div class="ld-tl-item ld-tl-${i.grupo}">
      <div class="ld-tl-icon">${i.icon}</div>
      <div class="ld-tl-body">
        <div class="ld-tl-title">${i.title}</div>
        ${i.sub ? `<div class="ld-tl-sub">${i.sub}</div>` : ''}
        <div class="ld-tl-time">${_dt(i.ts)}</div>
      </div>
    </div>`).join('');
}
