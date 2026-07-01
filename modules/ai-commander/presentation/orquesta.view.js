// modules/ai-commander/presentation/orquesta.view.js
// ── PRESENTACIÓN · Mesa de Orquesta ──────────────────────────────────────────
// Flujo de 3 fases, todo copy-paste (sin API):
//   0) Brief → 1) Reparto (3 prompts, copiar + abrir IA) + 3 cajas de respuesta
//   → 2) Síntesis (meta-prompt del Director para pegar en Claude).
// Auto-cableado sobre el contenedor recién pintado (mismo patrón que PromptBuilderView).
import { escHtml, ICONS } from './ui.js';
import { toast } from '../../../js/utils.js';
import { PROJECT_TYPES, ORQ_PROVIDERS, DIRECTOR, buildFanout, buildSynthesis } from '../domain/orchestration.js';

export class OrquestaView {
  constructor(state) {
    this._s = state;
    this._obj = '';
    this._tipo = PROJECT_TYPES[0].id;
    this._ctx = '';
    this._fanout = null;
    this._responses = { openai: '', anthropic: '', google: '' };
    this._synthesis = null;
  }

  async render(container) {
    this._container = container;
    container.innerHTML = `
      <div class="aic-orq view-animate">
        <div class="card card-pad">
          <h3 class="aic-card-title">🎼 Mesa de Orquesta</h3>
          <p class="form-hint">Describe el proyecto. El Director reparte el trabajo a ChatGPT, Claude y Gemini; tú pegas sus respuestas y él sintetiza el plan final. <strong>Sin costo de API</strong> — usa tus chats.</p>

          <label class="aic-label" style="margin-top:12px">Objetivo <span class="req">*</span></label>
          <textarea id="orqObj" class="aic-textarea" rows="3" placeholder="Ej: Hacer una landing para captar reservas de un restaurante…">${escHtml(this._obj)}</textarea>

          <div class="form-row" style="margin-top:10px">
            <div class="form-group"><label>Tipo de proyecto</label>
              <select id="orqTipo">${PROJECT_TYPES.map(t => `<option value="${t.id}"${t.id === this._tipo ? ' selected' : ''}>${t.icon} ${escHtml(t.label)}</option>`).join('')}</select>
            </div>
            <div class="form-group"><label>Contexto / marca / público <span class="text-muted">(opcional)</span></label>
              <input id="orqCtx" value="${escHtml(this._ctx)}" placeholder="Ej: marca sobria, público joven, en 2 semanas">
            </div>
          </div>

          <button class="btn btn-primary" id="orqGen" style="margin-top:6px">${ICONS.robot} ${this._fanout ? 'Regenerar reparto' : 'Generar reparto'}</button>
        </div>

        ${this._fanout ? this._repartoHtml() : ''}
        ${this._fanout ? this._synthHtml() : ''}
      </div>`;
    this._wire();
  }

  _repartoHtml() {
    return `
      <div class="aic-orq-phase">
        <div class="aic-orq-step"><span class="aic-orq-num">1</span> Reparto — copia cada prompt en su IA y trae la respuesta</div>
        <div class="aic-orq-cols">
          ${this._fanout.map(f => `
            <div class="card card-pad aic-orq-col">
              <div class="aic-orq-head"><span class="aic-orq-ic">${f.icon}</span><strong>${escHtml(f.label)}</strong></div>
              <div class="aic-orq-rol">${escHtml(f.rol)}</div>
              <textarea class="aic-textarea aic-orq-prompt" rows="7" readonly data-copy="${f.providerId}">${escHtml(f.prompt)}</textarea>
              <div class="aic-orq-actions">
                <button class="btn btn-ghost btn-sm" data-copybtn="${f.providerId}">📋 Copiar</button>
                <a class="btn btn-ghost btn-sm" href="${escHtml(f.url)}" target="_blank" rel="noopener">Abrir ${escHtml(f.label)} ↗</a>
              </div>
              <label class="aic-label" style="margin-top:10px">Pega la respuesta de ${escHtml(f.label)}</label>
              <textarea class="aic-textarea aic-orq-resp" rows="5" data-resp="${f.providerId}" placeholder="Pega aquí lo que te devolvió ${escHtml(f.label)}…">${escHtml(this._responses[f.providerId] || '')}</textarea>
            </div>`).join('')}
        </div>
      </div>`;
  }

  _synthHtml() {
    return `
      <div class="aic-orq-phase">
        <div class="aic-orq-step"><span class="aic-orq-num">2</span> Síntesis — el Director combina las tres</div>
        <button class="btn btn-primary" id="orqSynth">${DIRECTOR.icon} Generar síntesis del Director</button>
        ${this._synthesis ? `
          <div class="card card-pad" style="margin-top:12px">
            <div class="aic-orq-head"><span class="aic-orq-ic">${DIRECTOR.icon}</span><strong>Meta-prompt del Director</strong></div>
            <p class="form-hint">Pégalo en Claude (tu director) para el análisis final que combina las tres respuestas.</p>
            <textarea class="aic-textarea" rows="10" readonly data-copy="synth">${escHtml(this._synthesis)}</textarea>
            <div class="aic-orq-actions">
              <button class="btn btn-ghost btn-sm" data-copybtn="synth">📋 Copiar</button>
              <a class="btn btn-primary btn-sm" href="${escHtml(DIRECTOR.url)}" target="_blank" rel="noopener">Abrir Claude ↗</a>
            </div>
          </div>` : ''}
      </div>`;
  }

  _readBrief() {
    return {
      objetivo: document.getElementById('orqObj')?.value || '',
      tipo:     document.getElementById('orqTipo')?.value || PROJECT_TYPES[0].id,
      contexto: document.getElementById('orqCtx')?.value || '',
    };
  }

  // Persiste lo tipeado en la instancia para que sobreviva al re-render.
  _sync() {
    const b = this._readBrief();
    this._obj = b.objetivo; this._tipo = b.tipo; this._ctx = b.contexto;
    this._container.querySelectorAll('[data-resp]').forEach(t => { this._responses[t.dataset.resp] = t.value; });
    return b;
  }

  _wire() {
    const c = this._container;
    c.querySelector('#orqGen')?.addEventListener('click', () => {
      const b = this._sync();
      if (!b.objetivo.trim()) { toast('Escribe el objetivo primero', 'error'); return; }
      this._fanout = buildFanout(b);
      this._synthesis = null;
      this.render(c);
    });
    c.querySelector('#orqSynth')?.addEventListener('click', () => {
      const b = this._sync();
      this._synthesis = buildSynthesis(b, this._responses);
      this.render(c);
      // baja hasta la síntesis recién creada
      c.querySelector('[data-copy="synth"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    c.querySelectorAll('[data-copybtn]').forEach(btn => btn.addEventListener('click', () => {
      const ta = c.querySelector(`[data-copy="${btn.dataset.copybtn}"]`);
      if (ta) this._copy(ta.value, btn);
    }));
    // Guarda respuestas al tipear (sin re-render, para no perder el foco).
    c.querySelectorAll('[data-resp]').forEach(t => t.addEventListener('input', () => { this._responses[t.dataset.resp] = t.value; }));
  }

  _copy(text, btn) {
    const done = () => { const o = btn.textContent; btn.textContent = '✓ Copiado'; setTimeout(() => { btn.textContent = o; }, 1400); };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(() => toast('No se pudo copiar', 'error'));
    else { try { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); done(); } catch { toast('No se pudo copiar', 'error'); } }
  }
}
