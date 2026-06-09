// modules/plantillas-wa/whatsapp.js
import { templates } from '../../services/template.service.js';
import { escHtml, toast } from '../../js/utils.js';

export async function render() {
  const center = document.getElementById('center');
  const tmpls  = await templates.getAll();
  const vars   = ['{{nombre}}','{{telefono}}','{{email}}','{{empresa}}','{{fecha}}','{{hora}}','{{plan}}','{{producto}}','{{zoom}}','{{asesor}}','{{cargo}}','{{filial}}'];
  center.innerHTML = `<div class="view-animate"><div class="templates-grid">
    ${tmpls.map(t => `
      <div class="template-card">
        <div class="template-card-header">
          <span class="template-card-name">${escHtml(t.nombre)}</span>
          <button class="btn-action primary" data-save="${t.id}">Guardar</button>
        </div>
        <textarea class="template-textarea" id="tmpl_${t.id}">${escHtml(t.contenido)}</textarea>
        <div class="template-vars">${vars.map(v => `<span class="var-tag" data-var="${v}" data-tmpl="${t.id}">${v}</span>`).join('')}</div>
      </div>`).join('')}
  </div></div>`;
  document.querySelectorAll('[data-save]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.save, t = tmpls.find(x => x.id === id); if (!t) return;
      t.contenido = document.getElementById('tmpl_' + id).value;
      await templates.update(t); toast('Plantilla guardada', 'success');
    });
  });
  document.querySelectorAll('.var-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const ta = document.getElementById('tmpl_' + tag.dataset.tmpl); if (!ta) return;
      const pos = ta.selectionStart, v = tag.dataset.var;
      ta.value = ta.value.slice(0, pos) + v + ta.value.slice(ta.selectionEnd);
      ta.selectionStart = ta.selectionEnd = pos + v.length; ta.focus();
    });
  });
}
