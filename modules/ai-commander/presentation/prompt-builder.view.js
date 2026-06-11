// modules/ai-commander/presentation/prompt-builder.view.js
// ── Capa de PRESENTACIÓN · Prompt Builder ────────────────────────────────────
import { escHtml, formatDate, ICONS, aiArchitectureBanner } from './ui.js';
import { PROMPT_TEMPLATES, findTemplate, composePrompt } from '../domain/entities.js';

export class PromptBuilderView {
  constructor(promptService, aiService, projectService, state) {
    this._prompts = promptService;
    this._ai = aiService;
    this._projects = projectService;
    this._state = state;
    this._sel = PROMPT_TEMPLATES[0].id;
  }

  async render(container) {
    const [projects, saved, providers] = await Promise.all([
      this._projects.list({}),
      this._prompts.list({}),
      Promise.resolve(this._ai.providers()),
    ]);
    const connected = this._ai.anyConfigured();
    const tpl = findTemplate(this._sel) || PROMPT_TEMPLATES[0];

    container.innerHTML = `
      ${connected ? '' : aiArchitectureBanner(
        'Las respuestas no se generan todavía. La arquitectura está lista para conectar OpenAI / Anthropic vía una Edge Function de Supabase (la clave del LLM vive en el servidor).')}

      <div class="aic-grid-2" style="margin-top:14px;align-items:start">
        <div class="card card-pad">
          <h3 class="aic-card-title">Constructor de prompt</h3>

          <label class="aic-label">Plantilla / rol</label>
          <div class="aic-template-grid" id="aicTplGrid">
            ${PROMPT_TEMPLATES.map(t => `
              <button type="button" class="aic-tpl${t.id === this._sel ? ' active' : ''}" data-tpl="${t.id}">
                <span class="aic-tpl-ico">${t.icon}</span>
                <span class="aic-tpl-name">${escHtml(t.rol)}</span>
              </button>`).join('')}
          </div>
          <p class="form-hint" id="aicTplDesc">${escHtml(tpl.descripcion)}</p>

          <div id="aicVars">${this._varsHtml(tpl)}</div>

          <label class="aic-label" style="margin-top:12px">Prompt final (editable)</label>
          <textarea id="aicPromptText" class="aic-textarea" rows="9">${escHtml(composePrompt(tpl.body, {}).texto)}</textarea>

          <div class="form-row" style="margin-top:12px">
            <div class="form-group"><label>Título</label><input id="aicPromptTitle" placeholder="Ej: Arquitectura módulo X"></div>
            <div class="form-group"><label>Proyecto</label>
              <select id="aicPromptProject"><option value="">— Sin proyecto —</option>
                ${projects.map(p => `<option value="${p.id}">${escHtml(p.nombre)}</option>`).join('')}</select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Proveedor (previsto)</label>
              <select id="aicPromptProvider">
                ${providers.map(p => `<option value="${p.id}">${escHtml(p.label)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group"><label>Modelo (previsto)</label>
              <select id="aicPromptModel"></select>
            </div>
          </div>

          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">
            <button class="btn btn-ghost btn-sm" onclick="window._aic.savePrompt(false)">💾 Guardar</button>
            <button class="btn btn-primary btn-sm" onclick="window._aic.savePrompt(true)">${ICONS.play} Guardar y ejecutar</button>
          </div>
        </div>

        <div class="card card-pad">
          <h3 class="aic-card-title">Prompts guardados (${saved.length})</h3>
          ${saved.length === 0
            ? `<p class="text-muted" style="font-size:13.5px;margin-top:10px">Aún no guardas prompts.</p>`
            : `<div class="aic-prompt-list">
                ${saved.map(pr => `
                  <div class="aic-prompt-item">
                    <div style="min-width:0;flex:1">
                      <div style="font-weight:600;font-size:13.5px;color:var(--navy)">${escHtml(pr.titulo || pr.rol || 'Prompt')} ${pr.codigo ? `<span class="aic-code">${escHtml(pr.codigo)}</span>` : ''}</div>
                      <div style="font-size:12px;color:var(--text3);margin-top:2px">${escHtml(pr.provider || '')}${pr.modelo ? ' · ' + escHtml(pr.modelo) : ''} · ${formatDate(pr.createdAt)}</div>
                    </div>
                    <div style="display:flex;gap:4px;flex-shrink:0">
                      <button class="btn-icon btn-sm" title="Ejecutar" onclick="window._aic.runPrompt('${pr.id}')">${ICONS.play}</button>
                      <button class="btn-icon btn-sm" title="Eliminar" onclick="window._aic.deletePrompt('${pr.id}')">${ICONS.trash}</button>
                    </div>
                  </div>`).join('')}
              </div>`}
        </div>
      </div>`;

    this._wire(providers);
  }

  _varsHtml(tpl) {
    if (!tpl.variables.length) return '';
    return `<label class="aic-label" style="margin-top:12px">Variables</label>
      <div class="aic-vars-grid">
        ${tpl.variables.map(v => `
          <div class="form-group" style="margin-bottom:8px">
            <label>${escHtml(v)}</label>
            <textarea class="aic-var" data-var="${escHtml(v)}" rows="2" placeholder="${escHtml(v)}…"></textarea>
          </div>`).join('')}
      </div>`;
  }

  _collectVars() {
    const vars = {};
    document.querySelectorAll('#aicVars .aic-var').forEach(el => { vars[el.dataset.var] = el.value; });
    return vars;
  }

  _recompose() {
    const tpl = findTemplate(this._sel);
    if (!tpl) return;
    const { texto } = composePrompt(tpl.body, this._collectVars());
    const ta = document.getElementById('aicPromptText');
    if (ta) ta.value = texto;
  }

  _wire(providers) {
    // Selección de plantilla.
    document.querySelectorAll('#aicTplGrid .aic-tpl').forEach(btn => {
      btn.addEventListener('click', () => {
        this._sel = btn.dataset.tpl;
        const tpl = findTemplate(this._sel);
        document.querySelectorAll('#aicTplGrid .aic-tpl').forEach(b => b.classList.toggle('active', b === btn));
        document.getElementById('aicTplDesc').textContent = tpl.descripcion;
        document.getElementById('aicVars').innerHTML = this._varsHtml(tpl);
        this._recompose();
        this._bindVarInputs();
      });
    });
    this._bindVarInputs();

    // Proveedor → repuebla modelos.
    const provSel = document.getElementById('aicPromptProvider');
    const modelSel = document.getElementById('aicPromptModel');
    const fillModels = () => {
      const prov = providers.find(p => p.id === provSel.value) || providers[0];
      modelSel.innerHTML = prov.models.map(m =>
        `<option value="${m.id}"${m.id === prov.defaultModel ? ' selected' : ''}>${escHtml(m.label)}</option>`).join('');
    };
    provSel.addEventListener('change', fillModels);
    fillModels();
  }

  _bindVarInputs() {
    document.querySelectorAll('#aicVars .aic-var').forEach(el => {
      el.addEventListener('input', () => this._recompose());
    });
  }
}
