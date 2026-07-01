// modules/financiero/presentation/financiero.view.js
// ── PRESENTACIÓN · Flujo del análisis financiero (3 fases, SIN API) ───────────
//   0) Entrada: tipo + período + modo (adjuntar documentos / tipear cifras)
//   1) Dirección: el CRM genera el prompt-director → copiar + abrir Gemini → pegar
//   2) Informe: parsea el JSON → abre el Informe Financiero Tríada (A4) + guarda
// Self-contained: se cablea por delegación sobre el contenedor recién pintado
// (sin onclick inline con datos — regla de AGENTS.md). El estado vive en la
// instancia para sobrevivir a los re-renders.
import { analisisFinancieros, clientes as clientesRepo } from '../../../js/db.js';
import { escHtml, toast } from '../../../js/utils.js';
import { FIN_TIPOS, findTipo, LECTOR, buildFinancePrompt, parseFinanceReport } from '../domain/analisis.js';
import { openFinReport } from './informe-fin.view.js';

export class FinancieroFlow {
  constructor({ onBack, onSaved } = {}) {
    this._onBack = onBack || (() => {});
    this._onSaved = onSaved || (() => {});
    this._a = this._blank();
    this._clientes = [];
  }

  _blank() {
    return {
      id: null, tipo: 'cierre', periodo: '', titulo: '', clienteId: '',
      modoEntrada: 'documentos', contexto: '', cifras: {}, documentos: [],
      prompt: '', respuestaRaw: '', reporte: null, estado: 'borrador',
    };
  }

  // Cargar un análisis existente (desde la lista) o arrancar uno nuevo.
  load(analisis) { this._a = analisis ? { ...this._blank(), ...analisis } : this._blank(); }

  async render(container) {
    this._c = container;
    try { this._clientes = await clientesRepo.getAll(); } catch (_) { this._clientes = []; }
    const a = this._a;
    const tipo = findTipo(a.tipo);

    container.innerHTML = `<div class="view-animate fin-flow">
      <div class="fin-flow-head">
        <button type="button" class="btn btn-ghost btn-sm" id="finBack">← Volver</button>
        <div class="fin-flow-title">${a.id ? 'Análisis' : 'Nuevo análisis financiero'}${a.correlativo ? ` · <span class="text-muted">${escHtml(a.correlativo)}</span>` : ''}</div>
      </div>

      <div class="card card-pad">
        <div class="fin-step"><span class="fin-step-n">1</span> ¿Qué vamos a analizar?</div>

        <div class="fin-tipos">
          ${FIN_TIPOS.map((t) => `
            <button type="button" class="fin-tipo${t.id === a.tipo ? ' active' : ''}" data-fin-tipo="${t.id}">
              <span class="fin-tipo-ic">${t.icon}</span>
              <span class="fin-tipo-lb">${escHtml(t.label)}</span>
              <span class="fin-tipo-ds">${escHtml(t.desc)}</span>
            </button>`).join('')}
        </div>

        <div class="form-row" style="margin-top:14px">
          <div class="form-group"><label>Período <span class="req">*</span></label>
            <input id="finPeriodo" value="${escHtml(a.periodo)}" placeholder="Ej: Junio 2026" autocomplete="off"></div>
          <div class="form-group"><label>Cliente <span class="text-muted">(opcional)</span></label>
            <select id="finCliente">
              <option value="">— Mi empresa / interno —</option>
              ${this._clientes.map((c) => `<option value="${c.id}"${c.id === a.clienteId ? ' selected' : ''}>${escHtml(c.razonSocial || c.nombre || 'Cliente')}</option>`).join('')}
            </select></div>
        </div>
        <div class="form-group"><label>Contexto del negocio <span class="text-muted">(opcional — rubro, tamaño, notas)</span></label>
          <input id="finCtx" value="${escHtml(a.contexto)}" placeholder="Ej: restaurante, 12 empleados, ventas ~$18M/mes" autocomplete="off"></div>

        <div class="fin-modo">
          <span class="fin-modo-lb">¿Cómo entregas los datos?</span>
          <div class="fin-modo-tabs">
            <button type="button" class="fin-modo-tab${a.modoEntrada === 'documentos' ? ' active' : ''}" data-fin-modo="documentos">📎 Adjuntar documentos</button>
            <button type="button" class="fin-modo-tab${a.modoEntrada === 'cifras' ? ' active' : ''}" data-fin-modo="cifras">⌨️ Tipear cifras</button>
          </div>
        </div>

        ${a.modoEntrada === 'documentos' ? this._docsHtml(tipo) : this._cifrasHtml(tipo, a.cifras)}

        <div class="fin-actions">
          <button type="button" class="btn btn-primary" id="finAuto">✨ Generar informe</button>
          <button type="button" class="btn btn-ghost btn-sm" id="finManual">o hacerlo manual (copiar/pegar)</button>
        </div>
        <p class="form-hint" id="finAutoHint">La IA lee tus datos y arma el informe sola. Si aún no está configurada, usa el modo manual.</p>
      </div>

      ${a.manual ? this._promptHtml(a) : ''}
      ${a.manual ? this._infHtml(a) : ''}
    </div>`;

    this._wire();
  }

  _docsHtml(tipo) {
    const docs = this._a.documentos || [];
    return `<div class="fin-docs">
      <p class="form-hint">Sugerido para <strong>${escHtml(tipo.label)}</strong>: ${escHtml(tipo.docs)}</p>
      <label class="fin-drop" id="finDrop">
        <input id="finFiles" type="file" multiple hidden>
        <span class="fin-drop-ic">📎</span>
        <span class="fin-drop-t">Arrastra los archivos aquí o haz clic para elegir</span>
        <span class="fin-drop-d">Se guardan cifrados en tu bóveda. Luego los adjuntas tú en el chat de la IA.</span>
      </label>
      ${docs.length ? `<div class="fin-chips">
        ${docs.map((d, i) => `<span class="fin-chip"><span class="fin-chip-nm">${escHtml(d.nombre)}</span><button type="button" class="fin-chip-x" data-fin-rmdoc="${i}" title="Quitar">✕</button></span>`).join('')}
      </div>` : ''}
    </div>`;
  }

  _cifrasHtml(tipo, cifras) {
    return `<div class="fin-cifras">
      <p class="form-hint">Tipea lo que tengas a mano (en pesos). Lo que falte, la IA lo tratará como supuesto.</p>
      <div class="fin-cifras-grid">
        ${(tipo.cifras || []).map((c) => `<div class="form-group">
          <label>${escHtml(c.label)}</label>
          <input class="fin-cifra" data-fin-cifra="${c.id}" value="${escHtml(cifras?.[c.id] ?? '')}" placeholder="${escHtml(c.hint || '')}" inputmode="numeric" autocomplete="off">
        </div>`).join('')}
      </div>
    </div>`;
  }

  _promptHtml(a) {
    const adj = a.modoEntrada === 'documentos'
      ? `<p class="fin-note">📎 <strong>Importante:</strong> en el chat, <strong>adjunta los ${(a.documentos || []).length || 'tus'} archivo(s)</strong> junto con este texto para que la IA los lea.</p>`
      : '';
    return `<div class="card card-pad fin-phase">
      <div class="fin-step"><span class="fin-step-n">2</span> Lleva el trabajo a tu IA</div>
      <p class="form-hint">Copia este prompt y pégalo en ${LECTOR.label} (o Claude). ${escHtml(LECTOR.nota)}</p>
      ${adj}
      <textarea class="fin-textarea" id="finPrompt" rows="10" readonly>${escHtml(a.prompt)}</textarea>
      <div class="fin-actions">
        <button type="button" class="btn btn-ghost btn-sm" id="finCopy">📋 Copiar prompt</button>
        <a class="btn btn-ghost btn-sm" href="${escHtml(LECTOR.url)}" target="_blank" rel="noopener">Abrir ${escHtml(LECTOR.label)} ↗</a>
        <button type="button" class="btn btn-ghost btn-sm" id="finGen">↻ Regenerar</button>
      </div>
    </div>`;
  }

  _infHtml(a) {
    return `<div class="card card-pad fin-phase">
      <div class="fin-step"><span class="fin-step-n">3</span> Pega la respuesta y genera el informe</div>
      <p class="form-hint">Pega aquí el bloque JSON que te devolvió la IA. El CRM lo convierte en tu Informe Financiero con la marca Tríada.</p>
      <textarea class="fin-textarea" id="finResp" rows="7" placeholder="Pega aquí la respuesta de la IA (el bloque que empieza con &#96;&#96;&#96;json)…">${escHtml(a.respuestaRaw)}</textarea>
      <div class="fin-actions">
        <button type="button" class="btn btn-primary" id="finReport">📄 Ver informe</button>
        <button type="button" class="btn btn-ghost" id="finSave">💾 Guardar análisis</button>
        ${a.reporte ? `<span class="fin-ok">✓ Informe generado</span>` : ''}
      </div>
    </div>`;
  }

  // Persiste lo tipeado en la instancia (sobrevive al re-render).
  _sync() {
    const g = (id) => this._c.querySelector('#' + id);
    const a = this._a;
    if (g('finPeriodo')) a.periodo = g('finPeriodo').value;
    if (g('finCliente')) a.clienteId = g('finCliente').value;
    if (g('finCtx')) a.contexto = g('finCtx').value;
    if (g('finResp')) a.respuestaRaw = g('finResp').value;
    this._c.querySelectorAll('[data-fin-cifra]').forEach((el) => { a.cifras[el.dataset.finCifra] = el.value; });
  }

  _wire() {
    const c = this._c;
    c.querySelector('#finBack')?.addEventListener('click', () => this._onBack());

    // Delegación para tarjetas de tipo, modo, y quitar adjunto.
    c.addEventListener('click', async (e) => {
      const tp = e.target.closest('[data-fin-tipo]');
      if (tp) { this._sync(); this._a.tipo = tp.dataset.finTipo; this.render(c); return; }
      const md = e.target.closest('[data-fin-modo]');
      if (md) { this._sync(); this._a.modoEntrada = md.dataset.finModo; this.render(c); return; }
      const rm = e.target.closest('[data-fin-rmdoc]');
      if (rm) { await this._removeDoc(Number(rm.dataset.finRmdoc)); return; }
    });

    // Subida de archivos (input + drag&drop)
    const input = c.querySelector('#finFiles');
    const drop = c.querySelector('#finDrop');
    if (input) input.addEventListener('change', () => this._uploadFiles([...(input.files || [])]));
    if (drop) {
      ['dragover', 'dragenter'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('fin-drop--over'); }));
      ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove('fin-drop--over')));
      drop.addEventListener('drop', (e) => { e.preventDefault(); if (e.dataTransfer?.files?.length) this._uploadFiles([...e.dataTransfer.files]); });
    }

    c.querySelector('#finAuto')?.addEventListener('click', () => this._generateAuto());
    c.querySelector('#finManual')?.addEventListener('click', () => this._generate());
    c.querySelector('#finGen')?.addEventListener('click', () => this._generate());
    c.querySelector('#finCopy')?.addEventListener('click', (e) => this._copy(this._a.prompt, e.currentTarget));
    c.querySelector('#finReport')?.addEventListener('click', () => this._showReport());
    c.querySelector('#finSave')?.addEventListener('click', (e) => this._save(e.currentTarget));
  }

  async _uploadFiles(files) {
    if (!files.length) return;
    toast(`Subiendo ${files.length} archivo(s)…`, 'info');
    let ok = 0;
    for (const f of files) {
      try { const desc = await analisisFinancieros.uploadDoc(f); this._a.documentos.push(desc); ok++; }
      catch (err) { console.error('Error subiendo adjunto', f.name, err); toast(`Error subiendo ${f.name}: ${err?.message || ''}`, 'error'); }
    }
    if (ok) toast(`${ok} archivo(s) en tu bóveda ✓`, 'success');
    this.render(this._c);
  }

  async _removeDoc(i) {
    const doc = this._a.documentos[i];
    if (!doc) return;
    this._a.documentos.splice(i, 1);
    // Best-effort: limpiar el objeto del bucket (puede fallar si no es admin → queda sin referencia).
    if (doc.path) {
      try { await analisisFinancieros.removeDoc(doc.path); }
      catch (err) { console.warn('No se pudo limpiar el adjunto del bucket:', err?.message || err); }
    }
    this.render(this._c);
  }

  // Valida la entrada y arma el prompt-director en la instancia. Devuelve el prompt o null.
  _buildPromptOrToast() {
    this._sync();
    const a = this._a;
    if (!a.periodo.trim()) { toast('Indica el período (ej: Junio 2026)', 'error'); return null; }
    if (a.modoEntrada === 'documentos' && !a.documentos.length) { toast('Adjunta al menos un documento, o usa “Tipear cifras”', 'error'); return null; }
    a.prompt = buildFinancePrompt({ tipo: a.tipo, periodo: a.periodo, contexto: a.contexto, modo: a.modoEntrada, cifras: a.cifras });
    return a.prompt;
  }

  // Modo AUTOMÁTICO: la IA (Edge Function → Gemini) analiza y arma el informe sola.
  async _generateAuto() {
    const prompt = this._buildPromptOrToast();
    if (!prompt) return;
    const a = this._a;
    const btn = this._c.querySelector('#finAuto');
    const hint = this._c.querySelector('#finAutoHint');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Analizando con IA…'; }
    if (hint) hint.textContent = a.modoEntrada === 'documentos' ? 'Leyendo tus documentos y analizando…' : 'Analizando las cifras…';
    try {
      const archivos = [];
      if (a.modoEntrada === 'documentos') {
        for (const d of a.documentos) {
          try { archivos.push({ mime: d.mime || 'application/octet-stream', data: await analisisFinancieros.docBase64(d.path) }); }
          catch (e) { console.warn('No se pudo adjuntar el documento', d.nombre, e); }
        }
      }
      const texto = await analisisFinancieros.analizar(prompt, archivos);
      const res = parseFinanceReport(texto);
      if (!res.ok) throw new Error(res.error || 'La IA no devolvió un informe válido');
      a.reporte = res.report; a.respuestaRaw = texto; a.estado = 'analizado';
      openFinReport(res.report, this._meta());
      await this._save();            // auto-guarda (persiste + refresca la vista)
    } catch (err) {
      console.error('Análisis automático falló:', err);
      if (err.code === 'no_key') toast('La IA aún no está configurada. Puedes hacerlo manual abajo.', 'info');
      else toast('No se pudo generar automático: ' + (err.message || 'error') + '. Prueba el modo manual.', 'error');
      a.manual = true;               // cae al copy-paste, con el prompt ya listo
      this.render(this._c);
    }
  }

  // Modo MANUAL (copy-paste): entra al flujo y (re)genera el prompt-director.
  _generate() {
    if (!this._buildPromptOrToast()) return;
    this._a.manual = true;
    if (this._a.estado === 'borrador') this._a.estado = 'generado';
    this.render(this._c);
    this._c.querySelector('#finPrompt')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  _showReport() {
    this._sync();
    const a = this._a;
    if (!a.respuestaRaw.trim()) { toast('Pega primero la respuesta de la IA', 'error'); return; }
    const res = parseFinanceReport(a.respuestaRaw);
    if (!res.ok) { toast(res.error || 'No se pudo leer la respuesta', 'error'); return; }
    a.reporte = res.report;
    a.estado = 'analizado';
    openFinReport(res.report, this._meta());
    // Reflejar el "✓ Informe generado" sin perder lo tipeado.
    this.render(this._c);
  }

  _meta() {
    const a = this._a;
    const cli = this._clientes.find((c) => c.id === a.clienteId);
    return {
      tipoLabel: findTipo(a.tipo).label,
      periodo: a.periodo,
      empresa: cli ? (cli.razonSocial || cli.nombre) : (a.contexto ? '' : ''),
      codigo: a.correlativo || '',
    };
  }

  async _save(btn) {
    this._sync();
    const a = this._a;
    if (!a.periodo.trim()) { toast('Indica el período antes de guardar', 'error'); return; }
    if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }
    const payload = {
      tipo: a.tipo, periodo: a.periodo,
      titulo: a.titulo?.trim() || `${findTipo(a.tipo).label} · ${a.periodo}`,
      clienteId: a.clienteId || null,
      modoEntrada: a.modoEntrada, contexto: a.contexto,
      cifras: a.cifras, documentos: a.documentos,
      prompt: a.prompt, respuestaRaw: a.respuestaRaw, reporte: a.reporte,
      estado: a.estado,
    };
    try {
      const saved = a.id
        ? await analisisFinancieros.update(a.id, payload)
        : await analisisFinancieros.add(payload);
      this._a = { ...this._blank(), ...saved };
      toast('Análisis guardado ✓', 'success');
      this._onSaved();
      this.render(this._c);
    } catch (err) {
      console.error('No se pudo guardar el análisis financiero:', err);
      toast(err?.message || 'No se pudo guardar el análisis', 'error');
      if (btn) { btn.disabled = false; btn.textContent = '💾 Guardar análisis'; }
    }
  }

  _copy(text, btn) {
    const done = () => { const o = btn.textContent; btn.textContent = '✓ Copiado'; setTimeout(() => { btn.textContent = o; }, 1400); };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(() => toast('No se pudo copiar', 'error'));
    else { try { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); done(); } catch { toast('No se pudo copiar', 'error'); } }
  }
}
