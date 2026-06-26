// ============================================================================
// screens/diagnostico.js — ⭐ Diagnóstico 360 en terreno.
// IDÉNTICO al de PC en contenido Y forma: usa DIAG_PREGUNTAS / DIAG_GRUPOS /
// MADUREZ / scorePct del CRM (js/utils.js) y guarda en la MISMA tabla
// `diagnosticos` con el mismo shape (scores = {pilar: [fracciones 0..1]}, escala de
// madurez 1-5) + hallazgos y oportunidades → el informe sale igual.
// UX móvil: los 8 pilares (45 preguntas) en UN SOLO scroll, como el PC. Los tabs de
// arriba son salto rápido a cada área (con su puntaje en vivo) + scroll-spy. El
// botón Guardar es un footer sticky (en flujo) → siempre abajo, nunca a media lista.
// ============================================================================
import { db, DIAG_AREAS, DIAG_PREGUNTAS, DIAG_GRUPOS, scorePct, areaIcon, escHtml, MADUREZ } from '../core.js';
import { ic, toast } from '../ui.js';

const e = escHtml;
const TOTAL = DIAG_AREAS.reduce((s, a) => s + DIAG_PREGUNTAS[a.id].length, 0); // 45 (8 pilares)
const SCALE = MADUREZ; // escala de madurez 1-5 [{v,frac,label,short,color}]

let _ans = {}, _leadId = null, _lead = null, _io = null;

function optStyle(m, sel) {
  const base = 'flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:1px;padding:8px 2px;border:1px solid;border-radius:var(--radius-sm);font-family:var(--font);cursor:pointer;transition:var(--tr);';
  if (sel) return base + `border-color:transparent;background:${m.color};color:#fff`;
  return base + 'border-color:var(--border);background:var(--surface2);color:var(--text3)';
}
function optBtn(area, i, m) {
  const sel = _ans[area][i] === m.frac;
  return `<button type="button" class="dg-opt" data-area="${area}" data-i="${i}" data-v="${m.frac}" data-r="${m.v}" role="radio" aria-checked="${sel}" title="${m.label}" style="${optStyle(m, sel)}"><span style="font-size:15px;font-weight:800;line-height:1">${m.v}</span><span style="font-size:9px;font-weight:600;line-height:1.1">${m.short}</span></button>`;
}

// Bloque de UN área: título con ícono + puntaje en vivo, luego sus subgrupos y preguntas.
function areaBlock(area) {
  const a = DIAG_AREAS.find((x) => x.id === area);
  const preguntas = DIAG_PREGUNTAS[area];
  const grupos = DIAG_GRUPOS[area] || [{ label: '', n: preguntas.length }];
  let i = 0, groups = '';
  for (const g of grupos) {
    let qs = '';
    for (let k = 0; k < g.n; k++, i++) {
      qs += `<div class="card" style="padding:14px">
        <div style="font-size:13.5px;color:var(--text);line-height:1.5;margin-bottom:12px">${e(preguntas[i])}</div>
        <div class="dg-opts" style="display:flex;gap:5px" role="radiogroup">${SCALE.map((m) => optBtn(area, i, m)).join('')}</div>
      </div>`;
    }
    groups += `<div style="margin-bottom:16px">
      ${g.label ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:11px"><span style="width:6px;height:18px;border-radius:3px;background:${a.color}"></span><span style="font-size:12px;font-weight:700;letter-spacing:.04em;color:var(--text2);text-transform:uppercase">${e(g.label)}</span></div>` : ''}
      <div style="display:flex;flex-direction:column;gap:10px">${qs}</div>
    </div>`;
  }
  return `<section id="dgArea-${area}" class="dg-area" data-area="${area}" style="margin-bottom:24px">
    <header style="display:flex;align-items:center;gap:11px;padding:2px 0 14px">
      <span style="width:34px;height:34px;border-radius:10px;background:${a.color}1A;color:${a.color};display:flex;align-items:center;justify-content:center;flex:none">${areaIcon(area, 19)}</span>
      <div style="flex:1;min-width:0"><div class="serif" style="font-size:18px;font-weight:600;color:var(--ink)">${e(a.label)}</div><div style="font-size:11px;color:var(--text3)">${preguntas.length} preguntas</div></div>
      <div class="tabular" style="font-size:16px;font-weight:700;color:${a.color}"><span id="dgAreaScore-${area}">0</span><span style="opacity:.55;font-size:12px">%</span></div>
    </header>
    ${groups}
  </section>`;
}

function tabStyle(a, on) {
  return `flex:none;display:flex;align-items:center;gap:8px;border:1px solid ${on ? a.color : 'var(--border)'};background:${on ? a.color + '1A' : 'var(--surface)'};color:${on ? a.color : 'var(--text2)'};border-radius:20px;padding:8px 13px;font-weight:700;font-size:13px;cursor:pointer;transition:var(--tr)`;
}
function areaTab(a) {
  return `<button class="dg-tab" id="dgTabBtn-${a.id}" data-area="${a.id}" style="${tabStyle(a, false)}">${e(a.label)} <span id="dgTab-${a.id}" class="tabular" style="font-size:11px;opacity:.85">0</span></button>`;
}
const tabsHtml = () => DIAG_AREAS.map(areaTab).join('');

export default {
  chrome: false,
  async render(app) {
    _leadId = app.params.leadId;
    _ans = Object.fromEntries(DIAG_AREAS.map((a) => [a.id, Array(DIAG_PREGUNTAS[a.id].length).fill(null)]));
    _lead = _leadId ? await db.prospectos.get(_leadId).catch(() => null) : null;
    const empresa = (_lead && (_lead.empresa || _lead.nombre)) || 'Sin prospecto';

    const sumCell = (a) => `<div style="text-align:center;min-width:0"><div class="serif tabular" id="dgSum-${a.id}" style="font-size:23px;font-weight:600;color:#fff;line-height:1">0</div><div style="width:18px;height:3px;border-radius:2px;background:${a.color};margin:4px auto 4px"></div><div style="font-size:9.5px;color:#9FB0D4;line-height:1.15">${e(a.label)}</div></div>`;

    return `
    <section class="screen" style="display:flex;flex-direction:column">
      <header class="hdr" style="padding-bottom:12px;border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:12px">
          <button class="icon-btn icon-btn--bare" id="dgBack" style="width:38px;height:38px" aria-label="Volver">${ic('back', { size: 22, sw: 1.9 })}</button>
          <div style="flex:1"><div class="serif" style="font-size:19px;font-weight:600;color:var(--ink)">Diagnóstico 360</div><div class="ell hdr__sub">${e(empresa)}</div></div>
          <div style="text-align:right"><div class="tabular" style="font-size:16px;font-weight:700;color:var(--ink)"><span id="dgCount">0</span><span style="color:var(--text3);font-weight:500">/${TOTAL}</span></div></div>
        </div>
        <div style="height:6px;border-radius:3px;background:var(--surface2);overflow:hidden"><div id="dgProgress" style="height:100%;border-radius:3px;background:linear-gradient(90deg,var(--violet),var(--teal),var(--green));width:0;transition:width .3s var(--ease)"></div></div>
        <div style="display:flex;flex-wrap:wrap;gap:2px 10px;margin-top:9px">${SCALE.map((m) => `<span style="font-size:10px;color:var(--text3)"><b style="color:${m.color};font-variant-numeric:tabular-nums">${m.v}</b> ${m.label}</span>`).join('')}</div>
        <div class="chip-row" id="dgTabs" style="gap:7px;margin-top:12px;padding:0">${tabsHtml()}</div>
      </header>

      <div class="pad-form">
        ${DIAG_AREAS.map((a) => areaBlock(a.id)).join('')}

        <div style="background:linear-gradient(150deg,var(--navy),var(--navy-d));border-radius:var(--radius);padding:18px;color:#fff;margin-bottom:18px">
          <div style="font-size:11px;font-weight:700;letter-spacing:.12em;color:#9FB0D4;text-transform:uppercase;margin-bottom:14px">Puntaje por pilar</div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px 8px">${DIAG_AREAS.map(sumCell).join('')}</div>
        </div>

        <div class="field"><label class="field__label field__label--opt" for="dgHallazgos">Hallazgos clave <span>· uno por línea</span></label><textarea id="dgHallazgos" class="textarea" rows="3" placeholder="Ej: No usan CRM&#10;Sin control de costos variables"></textarea></div>
        <div class="field" style="margin-bottom:0"><label class="field__label field__label--opt" for="dgOportunidades">Oportunidades detectadas <span>· una por línea</span></label><textarea id="dgOportunidades" class="textarea" rows="3" placeholder="Ej: Implementar seguimiento de cotizaciones&#10;Automatizar reportes financieros"></textarea></div>
      </div>

      <div class="action-bar"><button class="btn btn--primary btn--block" id="dgSave">Guardar diagnóstico</button></div>
    </section>`;
  },

  mount(app) {
    if (_io) { _io.disconnect(); _io = null; }
    const host = document.getElementById('screen');
    const tabsEl = host.querySelector('#dgTabs');
    const hdr = host.querySelector('.hdr');

    const updateLive = () => {
      let answered = 0;
      DIAG_AREAS.forEach((a) => {
        answered += _ans[a.id].filter((x) => x !== null).length;
        const pct = scorePct(_ans[a.id]);
        const tab = host.querySelector(`#dgTab-${a.id}`); if (tab) tab.textContent = pct;
        const sum = host.querySelector(`#dgSum-${a.id}`); if (sum) sum.textContent = pct;
        const ar = host.querySelector(`#dgAreaScore-${a.id}`); if (ar) ar.textContent = pct;
      });
      host.querySelector('#dgCount').textContent = answered;
      host.querySelector('#dgProgress').style.width = Math.round(answered / TOTAL * 100) + '%';
    };

    host.querySelector('#dgBack').addEventListener('click', () => app.back());

    // Tabs = salto rápido a cada área, descontando el alto del header sticky.
    tabsEl.addEventListener('click', (ev) => {
      const b = ev.target.closest('.dg-tab'); if (!b) return;
      const sec = host.querySelector(`#dgArea-${b.getAttribute('data-area')}`);
      if (sec) host.scrollTo({ top: Math.max(0, sec.offsetTop - hdr.offsetHeight - 6), behavior: 'smooth' });
    });

    // Respuestas (delegado: las preguntas viven en las 3 secciones).
    host.addEventListener('click', (ev) => {
      const b = ev.target.closest('.dg-opt'); if (!b) return;
      const area = b.dataset.area, i = +b.dataset.i, v = parseFloat(b.dataset.v);
      _ans[area][i] = v;
      b.parentElement.querySelectorAll('.dg-opt').forEach((x) => {
        const m = SCALE.find((s) => s.v === +x.dataset.r), sel = _ans[area][i] === m.frac;
        x.style.cssText = optStyle(m, sel);
        x.setAttribute('aria-checked', sel);
      });
      updateLive();
    });

    // Scroll-spy: resalta el tab del área que se está viendo.
    const setActive = (id) => DIAG_AREAS.forEach((a) => {
      const btn = host.querySelector(`#dgTabBtn-${a.id}`);
      if (btn) btn.style.cssText = tabStyle(a, a.id === id);
    });
    if ('IntersectionObserver' in window) {
      const secs = DIAG_AREAS.map((a) => host.querySelector(`#dgArea-${a.id}`)).filter(Boolean);
      _io = new IntersectionObserver((entries) => {
        const vis = entries.filter((en) => en.isIntersecting)
          .sort((p, q) => p.boundingClientRect.top - q.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.dataset.area);
      }, { root: host, rootMargin: `-${hdr.offsetHeight + 10}px 0px -55% 0px`, threshold: 0 });
      secs.forEach((s) => _io.observe(s));
    }
    setActive(DIAG_AREAS[0].id);

    host.querySelector('#dgSave').addEventListener('click', async (ev) => {
      const answered = DIAG_AREAS.reduce((s, a) => s + _ans[a.id].filter((x) => x !== null).length, 0);
      if (!answered) { toast('Responde al menos una pregunta antes de guardar', 'err'); return; }
      const parse = (sel) => (host.querySelector(sel)?.value || '').split('\n').map((s) => s.trim()).filter(Boolean);
      ev.target.disabled = true;
      try {
        await db.diagnosticos.add({
          prospectoId: _leadId,
          scores: _ans,
          hallazgos: parse('#dgHallazgos'), oportunidades: parse('#dgOportunidades'),
        });
        toast('Diagnóstico 360 guardado ✓', 'ok');
        if (_io) { _io.disconnect(); _io = null; }
        if (_leadId) app.navigate('ficha', { leadId: _leadId, tab: 'diag' });
        else app.navigate('hoy');
      } catch (err) { console.error(err); toast('No se pudo guardar el diagnóstico', 'err'); ev.target.disabled = false; }
    });
  },
};
