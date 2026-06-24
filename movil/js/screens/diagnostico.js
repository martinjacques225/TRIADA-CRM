// ============================================================================
// screens/diagnostico.js — ⭐ Diagnóstico 360 en terreno.
// IDÉNTICO al de PC en contenido: usa DIAG_PREGUNTAS / DIAG_GRUPOS / answerValue /
// scorePct del CRM (js/utils.js) y guarda en la MISMA tabla `diagnosticos` con el
// mismo shape (scoresTec/Ventas/Finanzas de 0/0.5/1) → el informe sale igual.
// UX móvil: un área a la vez (tabs), sub-dimensiones, toggle No/Parcial/Sí,
// progreso X/27 y puntaje por área en vivo.
// ============================================================================
import { db, DIAG_AREAS, DIAG_PREGUNTAS, DIAG_GRUPOS, scorePct, escHtml } from '../core.js';
import { ic, toast } from '../ui.js';

const e = escHtml;
const TOTAL = DIAG_AREAS.reduce((s, a) => s + DIAG_PREGUNTAS[a.id].length, 0); // 27
// Colores del puntaje sobre el fondo navy del resumen (variantes claras).
const SUM_COLOR = { tec: '#7C8AE0', ventas: '#2BBCC4', finanzas: '#3FB587' };
const OPT_C = { 0: ['var(--danger)', 'var(--danger-l)'], 0.5: ['var(--amber)', 'var(--amber-l)'], 1: ['var(--green)', 'var(--green-l)'] };

let _ans = {}, _area = 'tec', _leadId = null, _lead = null;

function optStyle(v, sel) {
  const base = 'flex:1;height:42px;border:1px solid;border-radius:var(--radius-sm);font-family:var(--font);font-weight:700;font-size:13px;cursor:pointer;transition:var(--tr);';
  if (sel) { const [c, bg] = OPT_C[v]; return base + `border-color:${c};background:${bg};color:${c}`; }
  return base + 'border-color:var(--border);background:var(--surface2);color:var(--text2)';
}
function optBtn(area, i, v, label) {
  const sel = _ans[area][i] === v;
  return `<button type="button" class="dg-opt" data-area="${area}" data-i="${i}" data-v="${v}" role="radio" aria-checked="${sel}" style="${optStyle(v, sel)}">${label}</button>`;
}

function questionsHtml(area) {
  const a = DIAG_AREAS.find((x) => x.id === area);
  const preguntas = DIAG_PREGUNTAS[area];
  const grupos = DIAG_GRUPOS[area] || [{ label: '', n: preguntas.length }];
  let i = 0, out = '';
  for (const g of grupos) {
    let qs = '';
    for (let k = 0; k < g.n; k++, i++) {
      qs += `<div class="card" style="padding:14px">
        <div style="font-size:13.5px;color:var(--text);line-height:1.5;margin-bottom:12px">${e(preguntas[i])}</div>
        <div class="dg-opts" style="display:flex;gap:7px" role="radiogroup">${optBtn(area, i, 0, 'No')}${optBtn(area, i, 0.5, 'Parcial')}${optBtn(area, i, 1, 'Sí')}</div>
      </div>`;
    }
    out += `<div style="margin-bottom:18px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:11px"><span style="width:6px;height:18px;border-radius:3px;background:${a.color}"></span><span style="font-size:12px;font-weight:700;letter-spacing:.04em;color:var(--text2);text-transform:uppercase">${e(g.label)}</span></div>
      <div style="display:flex;flex-direction:column;gap:10px">${qs}</div>
    </div>`;
  }
  return out;
}

function areaTab(a) {
  const on = _area === a.id;
  return `<button class="dg-tab" data-area="${a.id}" style="flex:none;display:flex;align-items:center;gap:8px;border:1px solid ${on ? a.color : 'var(--border)'};background:${on ? a.color + '1A' : 'var(--surface)'};color:${on ? a.color : 'var(--text2)'};border-radius:20px;padding:8px 13px;font-weight:700;font-size:13px;cursor:pointer">${e(a.label)} <span id="dgTab-${a.id}" class="tabular" style="font-size:11px;opacity:.85">${scorePct(_ans[a.id])}</span></button>`;
}
const tabsHtml = () => DIAG_AREAS.map(areaTab).join('');

export default {
  chrome: false,
  async render(app) {
    _leadId = app.params.leadId;
    _area = 'tec';
    _ans = Object.fromEntries(DIAG_AREAS.map((a) => [a.id, Array(DIAG_PREGUNTAS[a.id].length).fill(null)]));
    _lead = _leadId ? await db.prospectos.get(_leadId).catch(() => null) : null;
    const empresa = (_lead && (_lead.empresa || _lead.nombre)) || 'Sin prospecto';

    const sumCell = (id, label) => `<div style="flex:1;text-align:center"><div class="serif tabular" id="dgSum-${id}" style="font-size:30px;font-weight:600;color:${SUM_COLOR[id]}">0</div><div style="font-size:10.5px;color:#9FB0D4;margin-top:3px">${label}</div></div>`;

    return `
    <section class="screen">
      <header class="hdr" style="padding-bottom:12px;border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:12px">
          <button class="icon-btn icon-btn--bare" id="dgBack" style="width:38px;height:38px" aria-label="Volver">${ic('back', { size: 22, sw: 1.9 })}</button>
          <div style="flex:1"><div class="serif" style="font-size:19px;font-weight:600;color:var(--ink)">Diagnóstico 360</div><div class="ell hdr__sub">${e(empresa)}</div></div>
          <div style="text-align:right"><div class="tabular" style="font-size:16px;font-weight:700;color:var(--ink)"><span id="dgCount">0</span><span style="color:var(--text3);font-weight:500">/${TOTAL}</span></div></div>
        </div>
        <div style="height:6px;border-radius:3px;background:var(--surface2);overflow:hidden"><div id="dgProgress" style="height:100%;border-radius:3px;background:linear-gradient(90deg,var(--violet),var(--teal),var(--green));width:0;transition:width .3s var(--ease)"></div></div>
        <div class="chip-row" id="dgTabs" style="gap:7px;margin-top:12px;padding:0">${tabsHtml()}</div>
      </header>

      <div class="pad-form">
        <div id="dgQuestions">${questionsHtml(_area)}</div>
        <div style="background:linear-gradient(150deg,var(--navy),var(--navy-d));border-radius:var(--radius);padding:18px;color:#fff">
          <div style="font-size:11px;font-weight:700;letter-spacing:.12em;color:#9FB0D4;text-transform:uppercase;margin-bottom:14px">Puntaje por área</div>
          <div style="display:flex;gap:12px">${sumCell('tec', 'Tecnología')}${sumCell('ventas', 'Ventas')}${sumCell('finanzas', 'Finanzas')}</div>
        </div>
      </div>

      <div class="action-bar"><button class="btn btn--primary btn--block" id="dgSave">Guardar diagnóstico</button></div>
    </section>`;
  },

  mount(app) {
    const host = document.getElementById('screen');
    const qEl = host.querySelector('#dgQuestions');
    const tabsEl = host.querySelector('#dgTabs');

    const updateLive = () => {
      let answered = 0;
      DIAG_AREAS.forEach((a) => {
        answered += _ans[a.id].filter((x) => x !== null).length;
        const pct = scorePct(_ans[a.id]);
        const tab = host.querySelector(`#dgTab-${a.id}`); if (tab) tab.textContent = pct;
        const sum = host.querySelector(`#dgSum-${a.id}`); if (sum) sum.textContent = pct;
      });
      host.querySelector('#dgCount').textContent = answered;
      host.querySelector('#dgProgress').style.width = Math.round(answered / TOTAL * 100) + '%';
    };

    host.querySelector('#dgBack').addEventListener('click', () => app.back());

    tabsEl.addEventListener('click', (ev) => {
      const b = ev.target.closest('.dg-tab'); if (!b) return;
      _area = b.getAttribute('data-area');
      qEl.innerHTML = questionsHtml(_area);
      tabsEl.innerHTML = tabsHtml();
      updateLive();
    });

    qEl.addEventListener('click', (ev) => {
      const b = ev.target.closest('.dg-opt'); if (!b) return;
      const area = b.dataset.area, i = +b.dataset.i, v = parseFloat(b.dataset.v);
      _ans[area][i] = v;
      b.parentElement.querySelectorAll('.dg-opt').forEach((x) => {
        const xv = parseFloat(x.dataset.v), sel = _ans[area][i] === xv;
        x.style.cssText = optStyle(xv, sel);
        x.setAttribute('aria-checked', sel);
      });
      updateLive();
    });

    host.querySelector('#dgSave').addEventListener('click', async (ev) => {
      const answered = DIAG_AREAS.reduce((s, a) => s + _ans[a.id].filter((x) => x !== null).length, 0);
      if (!answered) { toast('Responde al menos una pregunta antes de guardar', 'err'); return; }
      ev.target.disabled = true;
      try {
        await db.diagnosticos.add({
          prospectoId: _leadId,
          scoresTec: _ans.tec, scoresVentas: _ans.ventas, scoresFinanzas: _ans.finanzas,
          hallazgos: [], oportunidades: [],
        });
        toast('Diagnóstico 360 guardado ✓', 'ok');
        if (_leadId) app.navigate('ficha', { leadId: _leadId, tab: 'diag' });
        else app.navigate('hoy');
      } catch (err) { console.error(err); toast('No se pudo guardar el diagnóstico', 'err'); ev.target.disabled = false; }
    });
  },
};
