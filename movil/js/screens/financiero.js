// ============================================================================
// screens/financiero.js — Análisis Financiero trIA (móvil).
// Paridad con el módulo de PC (modules/financiero): subes/tipeas tus datos →
// el CRM llama a Gemini (Edge Function) → Informe Financiero A4 con la piel del
// Informe 360. Reutiliza LITERALMENTE db.analisisFinancieros + el dominio puro
// (buildFinancePrompt/parseFinanceReport) + openFinReport (todo vía core.js).
// El gancho móvil: adjuntar el F29/liquidación con la cámara → informe.
// ============================================================================
import {
  db, store, escHtml, formatDate,
  FIN_TIPOS, findTipo, LECTOR, buildFinancePrompt, parseFinanceReport, openFinReport,
} from '../core.js';
import { ic, toast, haptic } from '../ui.js';

const e = escHtml;

const ESTADO = {
  borrador:  { label: 'Borrador',      color: '#6B7686' },
  generado:  { label: 'Prompt listo',  color: '#C2871A' },
  analizado: { label: 'Informe listo', color: '#2E9B73' },
};
const estadoOf = (s) => ESTADO[s] || ESTADO.borrador;

function blank() {
  return {
    id: null, correlativo: '', tipo: 'cierre', periodo: '', titulo: '',
    modoEntrada: 'documentos', contexto: '', cifras: {}, documentos: [],
    prompt: '', respuestaRaw: '', reporte: null, estado: 'borrador', manual: false,
  };
}

// Estado de la screen (en memoria, sobrevive a renderScreen)
let _view = 'list';
let _a = blank();
let _items = [];

// estilo de chip toggle (inline, no depende de CSS nuevo)
const chip = (on) => `padding:8px 14px;border-radius:999px;font-size:13px;font-weight:600;white-space:nowrap;cursor:pointer;border:1px solid ${on ? 'transparent' : 'var(--line,#e4e7ee)'};background:${on ? 'var(--teal,#0C7C88)' : 'transparent'};color:${on ? '#fff' : 'var(--text3,#8a94a6)'}`;
const inputStyle = 'width:100%;padding:11px 13px;border:1px solid var(--line,#e4e7ee);border-radius:11px;font-size:14px;color:var(--text,#1a2332);background:var(--surface,#fff);outline:none;box-sizing:border-box';

export default {
  chrome: false,

  async render() {
    if (_view === 'flow') return _renderFlow();
    return _renderList();
  },

  mount(app) {
    if (_view === 'flow') _mountFlow(app);
    else _mountList(app);
  },
};

// ── LISTA ───────────────────────────────────────────────────────────────────
async function _renderList() {
  try { _items = await db.analisisFinancieros.getAll(); }
  catch (err) { console.error('No se pudo cargar Financiero:', err); return _errorScreen(err); }

  const informes = _items.filter((x) => x.estado === 'analizado').length;

  return `
  <section class="screen">
    <header class="hdr hdr--bar">
      <div>
        <h1 class="hdr__title">Análisis Financiero</h1>
        <div class="hdr__sub">${_items.length} análisis · ${informes} con informe</div>
      </div>
      <button class="icon-btn icon-btn--bare" id="finClose" style="width:38px;height:38px" aria-label="Cerrar">${ic('x', { size: 20, sw: 2 })}</button>
    </header>

    <div class="pad">
      <button class="btn btn--primary btn--block" id="finNew" style="margin-bottom:13px">${ic('plus', { size: 18, sw: 2.2 })} Nuevo análisis</button>

      ${_items.length === 0
        ? `<div class="card" style="text-align:center;padding:30px 20px">
            <div class="empty__icon" style="margin:0 auto 12px">${ic('fileText', { size: 26 })}</div>
            <div class="empty__t">Aún no hay análisis</div>
            <div class="empty__d">Elige el tipo (cierre, IVA/F29 o remuneraciones), adjunta o tipea tus datos y la IA arma el informe con la marca Tríada.</div>
          </div>`
        : `<div class="list" style="display:flex;flex-direction:column;gap:10px">${_items.map(_card).join('')}</div>`}
    </div>
  </section>`;
}

function _card(a) {
  const t = findTipo(a.tipo);
  const em = estadoOf(a.estado);
  return `<article class="card card--tap" data-open="${a.id}" style="display:flex;align-items:center;gap:12px;padding:13px">
    <span style="width:42px;height:42px;border-radius:11px;flex:none;display:flex;align-items:center;justify-content:center;font-size:20px;background:var(--surface2,#f2f4f7)">${t.icon}</span>
    <span style="flex:1;min-width:0">
      <span style="display:block;font-weight:600;font-size:14px;color:var(--ink,#16234A);line-height:1.3;word-break:break-word">${e(a.titulo || t.label)}</span>
      <span style="display:flex;flex-wrap:wrap;align-items:center;gap:5px 8px;margin-top:4px;font-size:11.5px;color:var(--text3,#8a94a6)">
        <span style="font-weight:700;padding:2px 7px;border-radius:999px;color:${em.color};background:${em.color}16">${e(em.label)}</span>
        <span>${e(a.periodo || '')} · ${e(formatDate(a.fecha))}</span>
      </span>
    </span>
    ${a.estado === 'analizado' ? `<span style="flex:none;color:var(--teal,#0C7C88)">${ic('fileText', { size: 18 })}</span>` : `<span style="flex:none;color:var(--text3,#8a94a6)">${ic('next', { size: 18, sw: 2 })}</span>`}
  </article>`;
}

function _mountList(app) {
  const host = document.getElementById('screen');
  host.querySelector('#finClose')?.addEventListener('click', () => app.navigate('hoy'));
  host.querySelector('#finNew')?.addEventListener('click', () => { haptic(); _a = blank(); _view = 'flow'; app.renderScreen(); });
  host.querySelectorAll('[data-open]').forEach((c) => c.addEventListener('click', () => {
    const item = _items.find((x) => x.id === c.getAttribute('data-open'));
    if (!item) return;
    haptic();
    if (item.estado === 'analizado' && item.reporte) {
      openFinReport(item.reporte, _meta(item));
    } else {
      _a = { ...blank(), ...item }; _view = 'flow'; app.renderScreen();
    }
  }));
}

// ── FLUJO ───────────────────────────────────────────────────────────────────
function _renderFlow() {
  const t = findTipo(_a.tipo);
  return `
  <section class="screen">
    <header class="hdr hdr--bar">
      <button class="btn btn--ghost" id="finBack" style="padding:7px 12px">‹ Volver</button>
      <div class="hdr__title" style="font-size:17px">${_a.id ? 'Análisis' : 'Nuevo análisis'}</div>
      <span style="width:44px"></span>
    </header>

    <div class="pad">
      <div class="muted" style="font-size:12px;margin-bottom:8px">¿Qué vamos a analizar?</div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
        ${FIN_TIPOS.map((x) => `<button data-tipo="${x.id}" style="display:flex;align-items:center;gap:11px;text-align:left;padding:12px 13px;border-radius:12px;cursor:pointer;border:1.5px solid ${x.id === _a.tipo ? 'var(--teal,#0C7C88)' : 'var(--line,#e4e7ee)'};background:${x.id === _a.tipo ? 'var(--teal,#0C7C88)10' : 'transparent'}">
          <span style="font-size:20px">${x.icon}</span>
          <span style="flex:1"><span style="display:block;font-weight:600;font-size:14px;color:var(--ink,#16234A)">${e(x.label)}</span>
          <span style="display:block;font-size:11.5px;color:var(--text3,#8a94a6);line-height:1.35;margin-top:2px">${e(x.desc)}</span></span>
        </button>`).join('')}
      </div>

      <div class="muted" style="font-size:12px;margin-bottom:6px">Período</div>
      <input id="finPeriodo" value="${e(_a.periodo)}" placeholder="Ej: Junio 2026" autocomplete="off" style="${inputStyle};margin-bottom:14px">

      <div style="display:flex;gap:7px;margin-bottom:12px">
        <button data-modo="documentos" style="${chip(_a.modoEntrada === 'documentos')}">📎 Adjuntar</button>
        <button data-modo="cifras" style="${chip(_a.modoEntrada === 'cifras')}">⌨️ Tipear cifras</button>
      </div>

      ${_a.modoEntrada === 'documentos' ? _docsBlock(t) : _cifrasBlock(t)}

      <button class="btn btn--primary btn--block" id="finGo" style="margin-top:16px">✨ Generar informe</button>
      <button class="btn btn--ghost btn--block" id="finManual" style="margin-top:8px">o hacerlo manual (copiar/pegar)</button>
      <div class="muted" id="finHint" style="font-size:11.5px;text-align:center;margin-top:8px">La IA lee tus datos y arma el informe sola.</div>

      ${_a.manual ? _manualBlock() : ''}
    </div>
  </section>`;
}

function _docsBlock(t) {
  return `
    <div class="muted" style="font-size:11.5px;margin-bottom:8px;line-height:1.4">Sugerido para <b>${e(t.label)}</b>: ${e(t.docs)}</div>
    <label style="display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;padding:20px 16px;border:2px dashed var(--line,#e4e7ee);border-radius:14px;color:var(--text3,#8a94a6);cursor:pointer">
      <input id="finFiles" type="file" accept="image/*,application/pdf,.xlsx,.xls,.doc,.docx" multiple hidden>
      ${ic('plus', { size: 24 })}
      <span style="font-size:13.5px;font-weight:600;color:var(--text2,#5a6376)">Adjuntar o tomar foto</span>
      <span style="font-size:12px">F29, liquidaciones, balance… (PDF o foto)</span>
    </label>
    ${_a.documentos.length ? `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:11px">
      ${_a.documentos.map((d, i) => `<span style="display:inline-flex;align-items:center;gap:7px;padding:6px 8px 6px 12px;background:var(--surface2,#f2f4f7);border-radius:999px;font-size:12px;max-width:220px">
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e(d.nombre)}</span>
        <button data-rmdoc="${i}" style="border:none;background:rgba(0,0,0,.08);width:18px;height:18px;border-radius:50%;color:var(--text2,#5a6376);font-size:11px;cursor:pointer">✕</button>
      </span>`).join('')}
    </div>` : ''}`;
}

function _cifrasBlock(t) {
  return `
    <div class="muted" style="font-size:11.5px;margin-bottom:8px">Tipea lo que tengas (en pesos). Lo que falte, la IA lo trata como supuesto.</div>
    <div style="display:flex;flex-direction:column;gap:9px">
      ${(t.cifras || []).map((c) => `<div>
        <div class="muted" style="font-size:11.5px;margin-bottom:4px">${e(c.label)}</div>
        <input data-cifra="${c.id}" value="${e(_a.cifras?.[c.id] ?? '')}" placeholder="${e(c.hint || '')}" inputmode="numeric" autocomplete="off" style="${inputStyle}">
      </div>`).join('')}
    </div>`;
}

function _manualBlock() {
  return `
    <div class="card" style="margin-top:16px;padding:14px">
      <div style="font-weight:600;font-size:14px;color:var(--ink,#16234A);margin-bottom:8px">Modo manual</div>
      <div class="muted" style="font-size:12px;margin-bottom:8px">Copia el prompt, pégalo en ${e(LECTOR.label)} con tus documentos y trae la respuesta.</div>
      <textarea id="finPrompt" readonly rows="6" style="${inputStyle};font-family:ui-monospace,monospace;font-size:12px;resize:vertical">${e(_a.prompt)}</textarea>
      <div style="display:flex;gap:8px;margin-top:9px">
        <button class="btn btn--ghost" id="finCopy" style="flex:1">📋 Copiar</button>
        <a class="btn btn--ghost" href="${e(LECTOR.url)}" target="_blank" rel="noopener" style="flex:1;text-align:center">Abrir ${e(LECTOR.label)} ↗</a>
      </div>
      <div class="muted" style="font-size:11.5px;margin:12px 0 5px">Pega aquí la respuesta (JSON) de la IA</div>
      <textarea id="finResp" rows="5" placeholder="Pega el bloque que empieza con &#96;&#96;&#96;json…" style="${inputStyle};font-family:ui-monospace,monospace;font-size:12px;resize:vertical">${e(_a.respuestaRaw)}</textarea>
      <button class="btn btn--primary btn--block" id="finReport" style="margin-top:11px">📄 Ver informe</button>
      <button class="btn btn--ghost btn--block" id="finSave" style="margin-top:8px">💾 Guardar</button>
    </div>`;
}

function _meta(a = _a) {
  return { tipoLabel: findTipo(a.tipo).label, periodo: a.periodo, empresa: '', codigo: a.correlativo || '' };
}

function _sync() {
  const g = (id) => document.getElementById(id);
  if (g('finPeriodo')) _a.periodo = g('finPeriodo').value;
  if (g('finResp')) _a.respuestaRaw = g('finResp').value;
  document.querySelectorAll('[data-cifra]').forEach((el) => { _a.cifras[el.getAttribute('data-cifra')] = el.value; });
}

function _mountFlow(app) {
  const host = document.getElementById('screen');
  host.querySelector('#finBack')?.addEventListener('click', () => { _view = 'list'; app.renderScreen(); });

  host.querySelectorAll('[data-tipo]').forEach((b) => b.addEventListener('click', () => { _sync(); _a.tipo = b.getAttribute('data-tipo'); haptic(); app.renderScreen(); }));
  host.querySelectorAll('[data-modo]').forEach((b) => b.addEventListener('click', () => { _sync(); _a.modoEntrada = b.getAttribute('data-modo'); haptic(); app.renderScreen(); }));
  host.querySelectorAll('[data-rmdoc]').forEach((b) => b.addEventListener('click', async () => {
    const i = Number(b.getAttribute('data-rmdoc'));
    const doc = _a.documentos[i];
    _a.documentos.splice(i, 1);
    if (doc?.path) { try { await db.analisisFinancieros.removeDoc(doc.path); } catch (err) { console.warn('No se pudo limpiar el adjunto:', err?.message || err); } }
    app.renderScreen();
  }));

  const input = host.querySelector('#finFiles');
  if (input) input.addEventListener('change', () => _uploadFiles(app, [...(input.files || [])]));

  host.querySelector('#finGo')?.addEventListener('click', () => _generateAuto(app));
  host.querySelector('#finManual')?.addEventListener('click', () => _enterManual(app));
  host.querySelector('#finCopy')?.addEventListener('click', () => _copy(_a.prompt));
  host.querySelector('#finReport')?.addEventListener('click', () => _showManualReport(app));
  host.querySelector('#finSave')?.addEventListener('click', () => _save(app, true));
}

async function _uploadFiles(app, files) {
  if (!files.length) return;
  toast(`Subiendo ${files.length} archivo(s)…`, 'info');
  let ok = 0;
  for (const f of files) {
    try { _a.documentos.push(await db.analisisFinancieros.uploadDoc(f)); ok++; }
    catch (err) { console.error('Error subiendo', f.name, err); toast(`Error subiendo ${f.name}`, 'err'); }
  }
  if (ok) toast(`${ok} archivo(s) en tu bóveda ✓`, 'ok');
  app.renderScreen();
}

function _buildPromptOrToast() {
  _sync();
  if (!_a.periodo.trim()) { toast('Indica el período (ej: Junio 2026)', 'err'); return null; }
  if (_a.modoEntrada === 'documentos' && !_a.documentos.length) { toast('Adjunta un documento o usa “Tipear cifras”', 'err'); return null; }
  _a.prompt = buildFinancePrompt({ tipo: _a.tipo, periodo: _a.periodo, contexto: _a.contexto, modo: _a.modoEntrada, cifras: _a.cifras });
  return _a.prompt;
}

async function _generateAuto(app) {
  const prompt = _buildPromptOrToast();
  if (!prompt) return;
  const btn = document.getElementById('finGo');
  const hint = document.getElementById('finHint');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Analizando con IA…'; }
  if (hint) hint.textContent = _a.modoEntrada === 'documentos' ? 'Leyendo tus documentos…' : 'Analizando las cifras…';
  try {
    const archivos = [];
    if (_a.modoEntrada === 'documentos') {
      for (const d of _a.documentos) {
        try { archivos.push({ mime: d.mime || 'application/octet-stream', data: await db.analisisFinancieros.docBase64(d.path) }); }
        catch (err) { console.warn('No se pudo adjuntar', d.nombre, err); }
      }
    }
    const texto = await db.analisisFinancieros.analizar(prompt, archivos);
    const res = parseFinanceReport(texto);
    if (!res.ok) throw new Error(res.error || 'La IA no devolvió un informe válido');
    _a.reporte = res.report; _a.respuestaRaw = texto; _a.estado = 'analizado';
    openFinReport(res.report, _meta());
    await _save(app, false);
    _view = 'list'; app.renderScreen();
  } catch (err) {
    console.error('Análisis automático falló:', err);
    if (err.code === 'no_key') toast('La IA aún no está configurada. Usa el modo manual.', 'info');
    else toast('No se pudo automático: ' + (err.message || 'error') + '. Prueba el manual.', 'err');
    _a.manual = true; app.renderScreen();
  }
}

function _enterManual(app) {
  if (!_buildPromptOrToast()) return;
  _a.manual = true;
  if (_a.estado === 'borrador') _a.estado = 'generado';
  app.renderScreen();
}

function _showManualReport(app) {
  _sync();
  if (!_a.respuestaRaw.trim()) { toast('Pega primero la respuesta de la IA', 'err'); return; }
  const res = parseFinanceReport(_a.respuestaRaw);
  if (!res.ok) { toast(res.error || 'No se pudo leer la respuesta', 'err'); return; }
  _a.reporte = res.report; _a.estado = 'analizado';
  openFinReport(res.report, _meta());
  _save(app, false);
}

async function _save(app, andRender) {
  _sync();
  if (!_a.periodo.trim()) { toast('Indica el período antes de guardar', 'err'); return; }
  const payload = {
    tipo: _a.tipo, periodo: _a.periodo,
    titulo: _a.titulo?.trim() || `${findTipo(_a.tipo).label} · ${_a.periodo}`,
    modoEntrada: _a.modoEntrada, contexto: _a.contexto, cifras: _a.cifras,
    documentos: _a.documentos, prompt: _a.prompt, respuestaRaw: _a.respuestaRaw,
    reporte: _a.reporte, estado: _a.estado,
  };
  try {
    const saved = _a.id ? await db.analisisFinancieros.update(_a.id, payload) : await db.analisisFinancieros.add(payload);
    _a = { ...blank(), ...saved };
    if (andRender) { toast('Análisis guardado ✓', 'ok'); _view = 'list'; app.renderScreen(); }
  } catch (err) {
    console.error('No se pudo guardar:', err);
    toast(err?.message || 'No se pudo guardar', 'err');
  }
}

function _copy(text) {
  haptic();
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(() => toast('Copiado ✓', 'ok')).catch(() => toast('No se pudo copiar', 'err'));
  else { try { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); toast('Copiado ✓', 'ok'); } catch { toast('No se pudo copiar', 'err'); } }
}

function _errorScreen(err) {
  return `<section class="screen">
    <header class="hdr hdr--bar"><div><h1 class="hdr__title">Análisis Financiero</h1></div></header>
    <div class="pad"><div class="card" style="text-align:center;padding:30px 18px">
      <div class="empty__t">No se pudo cargar</div>
      <div class="empty__d">${e(err?.message || 'Error de conexión')}</div>
    </div></div>
  </section>`;
}
