// modules/diagnosticos/diagnosticos.js
import { diagnosticos, prospectos } from '../../js/db.js';
import { escHtml, formatDate, DIAG_AREAS, DIAG_PREGUNTAS, DIAG_GRUPOS, areaIcon, toast, scorePct } from '../../js/utils.js';

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
    tec:      scorePct(d.scoresTec),
    ventas:   scorePct(d.scoresVentas),
    finanzas: scorePct(d.scoresFinanzas),
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
  // Respuestas dinámicas: tantas casillas como preguntas tenga cada área (hoy 9 c/u).
  const answers = Object.fromEntries(
    DIAG_AREAS.map(a => [a.id, Array(DIAG_PREGUNTAS[a.id].length).fill(null)])
  );
  const totalPreguntas = DIAG_AREAS.reduce((s, a) => s + DIAG_PREGUNTAS[a.id].length, 0);

  const body = document.getElementById('modalBody');
  if (!body) return;

  function _renderAnswers() {
    DIAG_AREAS.forEach(a => {
      const cont = body.querySelector(`[data-area="${a.id}"]`);
      if (!cont) return;
      const preguntas = DIAG_PREGUNTAS[a.id];
      const grupos = DIAG_GRUPOS[a.id] || [{ label: '', n: preguntas.length }];
      let i = 0; // índice plano del área (alineado 1:1 con el motor del informe)
      cont.innerHTML = grupos.map(g => {
        let filas = '';
        for (let k = 0; k < g.n; k++, i++) {
          filas += `
            <div class="score-question">
              <div class="score-q-text" id="${a.id}-q-${i}">${escHtml(preguntas[i])}</div>
              <div class="score-q-btns" role="radiogroup" aria-labelledby="${a.id}-q-${i}">
                <button type="button" role="radio" aria-checked="${answers[a.id][i]===0}"   class="score-q-btn ${answers[a.id][i]===0?'active-no':''}"    data-a="${a.id}" data-i="${i}" data-v="0">No</button>
                <button type="button" role="radio" aria-checked="${answers[a.id][i]===0.5}" class="score-q-btn ${answers[a.id][i]===0.5?'active-mid':''}" data-a="${a.id}" data-i="${i}" data-v="0.5">Parcial</button>
                <button type="button" role="radio" aria-checked="${answers[a.id][i]===1}"   class="score-q-btn ${answers[a.id][i]===1?'active-yes':''}"   data-a="${a.id}" data-i="${i}" data-v="1">Sí</button>
              </div>
            </div>`;
        }
        return `<div class="diag-subgroup" style="--area:${a.color}">
          ${g.label ? `<div class="diag-subgroup-label">${escHtml(g.label)}</div>` : ''}
          ${filas}
        </div>`;
      }).join('');
    });
    // Listeners una sola vez; al hacer clic solo se actualiza el botón tocado (sin re-render total)
    body.querySelectorAll('.score-q-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const a = btn.dataset.a, i = +btn.dataset.i, v = parseFloat(btn.dataset.v);
        answers[a][i] = v;
        btn.parentElement.querySelectorAll('.score-q-btn').forEach(b => {
          b.classList.remove('active-yes', 'active-no', 'active-mid');
          b.setAttribute('aria-checked', 'false');
        });
        btn.classList.add(v === 1 ? 'active-yes' : v === 0 ? 'active-no' : 'active-mid');
        btn.setAttribute('aria-checked', 'true');
        _updateScores();
      });
    });
  }

  function _updateScores() {
    let respondidas = 0;
    DIAG_AREAS.forEach(area => {
      const arr = answers[area.id];
      respondidas += arr.filter(x => x !== null).length;
      const s = scorePct(arr);
      const el = document.getElementById(`score_${area.id}`);
      const bar = document.getElementById(`bar_${area.id}`);
      if (el) el.textContent = s + '%';
      if (bar) { bar.style.width = s + '%'; bar.style.background = s>=80?'#2E9B73':s>=50?'#C2871A':'#C04F3F'; }
    });
    const fill = document.getElementById('diagProgressFill');
    const lbl  = document.getElementById('diagProgressLabel');
    if (fill) fill.style.width = Math.round(respondidas / totalPreguntas * 100) + '%';
    if (lbl)  lbl.textContent  = `${respondidas}/${totalPreguntas} respondidas`;
  }

  body.innerHTML = `
    <div class="diag-summary">
      ${DIAG_AREAS.map(a=>`
        <div class="diag-summary-card" style="--area:${a.color}">
          <div class="diag-summary-icon">${areaIcon(a.id,22)}</div>
          <div class="diag-summary-label">${escHtml(a.label)}</div>
          <div class="diag-summary-score" id="score_${a.id}">0%</div>
          <div class="score-bar" style="height:7px;margin:0"><div class="score-fill" id="bar_${a.id}" style="width:0;background:${a.color}"></div></div>
        </div>`).join('')}
    </div>

    <div class="diag-progress">
      <div class="diag-progress-track"><div class="diag-progress-fill" id="diagProgressFill"></div></div>
      <span class="diag-progress-label" id="diagProgressLabel">0/${totalPreguntas} respondidas</span>
    </div>

    ${DIAG_AREAS.map(a=>`
      <section class="diag-area-block">
        <header class="diag-area-title"><span class="diag-area-title-ic" style="color:${a.color}">${areaIcon(a.id,18)}</span>${escHtml(a.label)}</header>
        <div data-area="${a.id}"></div>
      </section>`).join('')}

    <div class="form-group" style="margin-top:8px">
      <label>Hallazgos clave (uno por línea)</label>
      <textarea id="diagHallazgos" rows="3" placeholder="Ej: No usan CRM&#10;Sin control de costos variables"></textarea>
    </div>
    <div class="form-group">
      <label>Oportunidades detectadas (uno por línea)</label>
      <textarea id="diagOportunidades" rows="3" placeholder="Ej: Implementar seguimiento de cotizaciones&#10;Automatizar reportes financieros"></textarea>
    </div>`;

  _renderAnswers();

  document.getElementById('modalSave').onclick = async () => {
    const respondidas = [...answers.tec, ...answers.ventas, ...answers.finanzas].filter(x => x !== null).length;
    if (respondidas === 0) { toast('Responde al menos una pregunta antes de guardar', 'error'); return; }
    const hallazgos    = (document.getElementById('diagHallazgos')?.value    || '').split('\n').map(s=>s.trim()).filter(Boolean);
    const oportunidades= (document.getElementById('diagOportunidades')?.value || '').split('\n').map(s=>s.trim()).filter(Boolean);
    try {
      const newId = await diagnosticos.add({
        prospectoId,
        scoresTec: answers.tec, scoresVentas: answers.ventas, scoresFinanzas: answers.finanzas,
        hallazgos, oportunidades,
      });
      if (onSave) onSave(newId);
    } catch (err) {
      console.error('Error al guardar diagnóstico:', err);
      toast(err?.message || 'No se pudo guardar el diagnóstico', 'error');
    }
  };
}
