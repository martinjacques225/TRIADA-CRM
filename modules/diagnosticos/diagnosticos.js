// modules/diagnosticos/diagnosticos.js
import { diagnosticos, prospectos } from '../../js/db.js';
import { escHtml, formatDate, DIAG_AREAS, DIAG_PREGUNTAS, areaIcon, toast } from '../../js/utils.js';

const _i = (n, s) => (window.icon ? window.icon(n, '', s) : '');

export async function render() {
  const [todos, todosP] = await Promise.all([diagnosticos.getAll(), prospectos.getAll()]);
  const pMap = Object.fromEntries(todosP.map(p => [p.id, p]));

  const sorted = [...todos].sort((a,b) => (b.fecha||'').localeCompare(a.fecha||''));

  const center = document.getElementById('center');
  center.innerHTML = `<div class="view-animate">
    <div class="section-head">
      <h2>Diagnósticos 360</h2>
      <button class="btn btn-primary" onclick="window._app.openNuevoDiagnostico()">+ Nuevo diagnóstico</button>
    </div>

    ${todos.length === 0
      ? `<div class="empty-state">
          <div class="empty-icon">${_i('diag')}</div>
          <h3>Sin diagnósticos aún</h3>
          <p>Realiza un Diagnóstico 360 con un prospecto para ver resultados de Tecnología, Ventas y Finanzas.</p>
          <button class="btn btn-primary" onclick="window._app.openNuevoDiagnostico()">Iniciar diagnóstico</button>
        </div>`
      : `<div class="diag-list">
          ${sorted.map(d => _diagCard(d, pMap[d.prospectoId])).join('')}
        </div>`}
  </div>`;
}

function _scoreColor(score) {
  if (score >= 80) return '#2E9B73';
  if (score >= 50) return '#C2871A';
  return '#C04F3F';
}

function _scoreLabel(score) {
  if (score >= 80) return 'Maduro';
  if (score >= 50) return 'En desarrollo';
  return 'Crítico';
}

function _diagCard(d, p) {
  const scores = {
    tec:     Math.round(((d.scoresTec     || []).filter(x=>x===true).length / 5) * 100),
    ventas:  Math.round(((d.scoresVentas  || []).filter(x=>x===true).length / 5) * 100),
    finanzas:Math.round(((d.scoresFinanzas|| []).filter(x=>x===true).length / 5) * 100),
  };
  const overall = Math.round((scores.tec + scores.ventas + scores.finanzas) / 3);
  const oc = _scoreColor(overall);

  return `<div class="diag-card card card-pad">
    <div class="diag-card-head">
      <div>
        <div style="font-size:16px;font-weight:700;color:var(--navy)">${escHtml(p?.nombre || 'Prospecto eliminado')}</div>
        <div style="font-size:13px;color:var(--text3)">${escHtml(p?.empresa||'')} · ${formatDate(d.fecha)}${d.correlativo ? ` · <span style="font-weight:600">${escHtml(d.correlativo)}</span>` : ''}</div>
      </div>
      <div class="diag-overall" style="border-color:${oc};color:${oc}">
        <div class="diag-overall-val">${overall}%</div>
        <div class="diag-overall-lbl">${_scoreLabel(overall)}</div>
      </div>
    </div>
    <div class="diag-areas-row">
      ${DIAG_AREAS.map(a => {
        const s = scores[a.id];
        const c = _scoreColor(s);
        return `<div class="diag-area-mini">
          <div class="diag-area-mini-head" style="display:flex;align-items:center;gap:7px"><span style="color:${a.color};display:inline-flex">${areaIcon(a.id,16)}</span><span style="color:${c}">${a.label}</span></div>
          <div class="score-bar" style="height:8px;margin:6px 0"><div class="score-fill" style="width:${s}%;background:${c}"></div></div>
          <div style="font-size:13px;font-weight:700;color:${c}">${s}%</div>
        </div>`;
      }).join('')}
    </div>
    ${d.hallazgos?.length ? `<div class="diag-hallazgos"><span style="font-size:12px;font-weight:600;color:var(--text3);letter-spacing:.08em;text-transform:uppercase">Hallazgos clave</span><div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px">${d.hallazgos.slice(0,3).map(h=>`<span style="font-size:12.5px;background:var(--amber-l);color:var(--amber);border:1px solid var(--amber);padding:3px 10px;border-radius:980px;display:inline-flex;align-items:center;gap:5px">${_i('alert',12)} ${escHtml(h)}</span>`).join('')}</div></div>` : ''}
    <div class="diag-card-actions">
      <button class="btn btn-navy btn-sm" onclick="window._app.openInformeEjecutivo('${d.id}')">${_i('fileText')} Ver Informe Ejecutivo 360</button>
      <button class="btn btn-ghost btn-sm" onclick="window._app.compartirDiagPorArea('${d.id}')">${_i('share')} Compartir</button>
      <button class="btn btn-ghost btn-sm" onclick="window._app.deleteDiagnostico('${d.id}')" style="color:var(--danger)">Eliminar</button>
    </div>
  </div>`;
}

// Modal para crear/completar diagnóstico
export function renderDiagnosticoModal(prospectoId, onSave) {
  let answers = { tec: Array(5).fill(null), ventas: Array(5).fill(null), finanzas: Array(5).fill(null) };

  const body = document.getElementById('modalBody');
  if (!body) return;

  function _renderAnswers() {
    document.querySelectorAll('[data-area]').forEach(areaEl => {
      const aId = areaEl.dataset.area;
      const qs = DIAG_PREGUNTAS[aId];
      areaEl.innerHTML = qs.map((q, i) => `
        <div class="score-question">
          <div class="score-q-text">${escHtml(q)}</div>
          <div class="score-q-btns">
            <button type="button" class="score-q-btn ${answers[aId][i]===true?'active-yes':''}" data-a="${aId}" data-i="${i}" data-v="yes">Sí</button>
            <button type="button" class="score-q-btn ${answers[aId][i]===false?'active-no':''}"  data-a="${aId}" data-i="${i}" data-v="no">No</button>
          </div>
        </div>`).join('');
    });
    // Listeners una sola vez; al hacer clic solo se actualiza el botón tocado (sin re-render total)
    document.querySelectorAll('.score-q-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const a = btn.dataset.a, i = +btn.dataset.i, v = btn.dataset.v === 'yes';
        answers[a][i] = v;
        btn.parentElement.querySelectorAll('.score-q-btn').forEach(b => b.classList.remove('active-yes', 'active-no'));
        btn.classList.add(v ? 'active-yes' : 'active-no');
        _updateScores();
      });
    });
  }

  function _updateScores() {
    DIAG_AREAS.forEach(area => {
      const s = Math.round((answers[area.id].filter(x=>x===true).length / 5) * 100);
      const el = document.getElementById(`score_${area.id}`);
      const bar = document.getElementById(`bar_${area.id}`);
      if (el) el.textContent = s + '%';
      if (bar) { bar.style.width = s + '%'; bar.style.background = s>=80?'#2E9B73':s>=50?'#C2871A':'#C04F3F'; }
    });
  }

  body.innerHTML = `
    <div style="display:flex;gap:16px;margin-bottom:18px;flex-wrap:wrap">
      ${DIAG_AREAS.map(a=>`<div style="flex:1;min-width:120px;background:var(--surface2);border-radius:10px;padding:12px;text-align:center">
        <div style="margin-bottom:4px;color:${a.color};display:flex;justify-content:center">${areaIcon(a.id,22)}</div>
        <div style="font-size:13px;font-weight:600;color:${a.color}">${a.label}</div>
        <div id="score_${a.id}" style="font-size:22px;font-weight:800;color:var(--navy);margin:4px 0">0%</div>
        <div class="score-bar"><div class="score-fill" id="bar_${a.id}" style="width:0;background:${a.color}"></div></div>
      </div>`).join('')}
    </div>
    ${DIAG_AREAS.map(a=>`
      <div style="margin-bottom:18px">
        <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:10px;display:flex;align-items:center;gap:7px"><span style="color:${a.color};display:inline-flex">${areaIcon(a.id,17)}</span> ${a.label}</div>
        <div data-area="${a.id}"></div>
      </div>`).join('')}
    <div class="form-group" style="margin-top:8px">
      <label>Hallazgos clave (uno por línea)</label>
      <textarea id="diagHallazgos" rows="3" placeholder="Ej: No usan CRM&#10;Sin control de costos variables"></textarea>
    </div>
    <div class="form-group">
      <label>Oportunidades detectadas (uno por línea)</label>
      <textarea id="diagOportunidades" rows="3" placeholder="Ej: Implementar seguimiento de cotizaciones&#10;Automatizar reportes financieros"></textarea>
    </div>
    <div class="form-group">
      <label>Notas del diagnóstico</label>
      <textarea id="diagNotas" rows="3" placeholder="Observaciones generales del consultor…"></textarea>
    </div>`;

  _renderAnswers();

  document.getElementById('modalSave').onclick = async () => {
    const respondidas = [...answers.tec, ...answers.ventas, ...answers.finanzas].filter(x => x !== null).length;
    if (respondidas === 0) { toast('Responde al menos una pregunta antes de guardar', 'error'); return; }
    const hallazgos    = (document.getElementById('diagHallazgos')?.value    || '').split('\n').map(s=>s.trim()).filter(Boolean);
    const oportunidades= (document.getElementById('diagOportunidades')?.value || '').split('\n').map(s=>s.trim()).filter(Boolean);
    const notas        =  document.getElementById('diagNotas')?.value || '';
    const newId = await diagnosticos.add({
      prospectoId, fecha: new Date().toISOString(),
      scoresTec: answers.tec, scoresVentas: answers.ventas, scoresFinanzas: answers.finanzas,
      hallazgos, oportunidades, notasDiagnostico: notas,
    });
    if (onSave) onSave(newId);
  };
}
