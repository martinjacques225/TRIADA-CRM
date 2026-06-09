// modules/configuracion/configuracion.js
import { config } from '../../services/config.service.js';
import { MASCOTAS } from '../../js/mascotas.js';
import { CARGOS } from '../../js/estados.js';
import { escHtml, avatarColor, getInitials, toast, showFileError } from '../../js/utils.js';

export async function render() {
  const nombre     = await config.get('userName') || '';
  const avatar     = await config.get('userAvatar');
  const mascotId   = await config.get('mascota') || 'aria';
  const themeVal   = await config.get('theme') || 'light';
  const notifOn    = await config.get('notificaciones') !== false;
  const autoMayus  = await config.get('autoMayusculas') !== false;
  const debutActivo= await config.get('debutActivo') || false;
  const filial     = await config.get('filial') || '';
  const equipo     = await config.get('equipo') || '';
  const cargo      = await config.get('cargo') || '';
  const bannerUrl  = await config.get('bannerUrl');
  const avBg       = avatarColor(nombre || 'user');
  const avContent  = avatar ? `<img src="${avatar}" alt="">` : getInitials(nombre);

  // Importar ico desde el contexto global (hasta Etapa 4 donde se centraliza en ui.js)
  const userIco    = `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/></svg>`;
  const settingsIco= `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/></svg>`;

  document.getElementById('center').innerHTML = `<div class="view-animate"><div class="config-grid">
    <div class="config-section">
      <div class="config-section-title">${userIco} Perfil</div>
      <div class="config-field"><label class="config-label">Avatar</label>
        <div class="avatar-upload-wrap">
          <div class="avatar-preview" style="background:${avBg}" id="avatarPreview">${avContent}</div>
          <div><div style="font-size:.76rem;color:var(--text2);margin-bottom:6px">JPG o PNG, max 5MB</div>
          <input type="file" id="avatarInput" accept="image/jpeg,image/png,image/webp" style="display:none">
          <button class="btn-secondary" onclick="document.getElementById('avatarInput').click()">Cambiar foto</button></div>
        </div></div>
      <div class="config-field"><label class="config-label">Nombre</label><input class="config-input" id="cfgNombre" value="${escHtml(nombre)}" placeholder="Nombre del asesor"></div>
      <div class="config-field"><label class="config-label">Cargo</label>
        <select class="config-select" id="cfgCargo"><option value="">Sin especificar</option>${CARGOS.map(c=>`<option value="${c}"${cargo===c?' selected':''}>${c}</option>`).join('')}</select></div>
      <div class="config-field"><label class="config-label">Filial</label><input class="config-input" id="cfgFilial" value="${escHtml(filial)}" placeholder="Nombre de la filial"></div>
      <div class="config-field"><label class="config-label">Equipo</label><input class="config-input" id="cfgEquipo" value="${escHtml(equipo)}" placeholder="Nombre del equipo"></div>
      <div class="config-field">
        <div class="toggle-row"><span class="toggle-label">🎓 Bono debut activo ($20.000)</span><button class="toggle${debutActivo?' on':''}" id="debutToggle"></button></div>
        <div style="font-size:.7rem;color:var(--text3);margin-top:4px">Solo la primera semana que trabajas</div>
      </div>
      <button class="btn-primary" id="cfgSave" style="width:100%;margin-top:6px">Guardar perfil</button>
    </div>
    <div class="config-section">
      <div class="config-section-title">${settingsIco} Apariencia</div>
      <div class="config-field"><label class="config-label">Tema</label>
        <div class="theme-selector">
          <div class="theme-option${themeVal==='light'?' selected':''}" data-theme-opt="light">☀️ Claro</div>
          <div class="theme-option${themeVal==='dark'?' selected':''}" data-theme-opt="dark">🌙 Oscuro</div>
        </div></div>
      <div class="config-field"><label class="config-label">Banner personalizado</label>
        <div style="margin-bottom:8px">
          ${bannerUrl
            ? `<img src="${bannerUrl}" alt="Banner" style="width:100%;height:70px;object-fit:cover;border-radius:var(--radius-sm);border:1px solid var(--border)" id="bannerPreview">`
            : `<div id="bannerPreview" style="width:100%;height:70px;background:var(--surface2);border:2px dashed var(--border);border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;color:var(--text3);font-size:.78rem">Sin banner</div>`}
        </div>
        <input type="file" id="bannerInput" accept="image/jpeg,image/png,image/webp" style="display:none">
        <div style="display:flex;gap:8px">
          <button class="btn-secondary" onclick="document.getElementById('bannerInput').click()">Subir imagen</button>
          ${bannerUrl?`<button class="btn-secondary" id="bannerRemove" style="color:var(--danger)">Eliminar</button>`:''}
        </div>
        <div style="font-size:.68rem;color:var(--text3);margin-top:4px">Se mostrará en la barra de navegación lateral</div>
      </div>
      <div class="config-field"><label class="config-label">Tu asistente</label>
        <div class="mascot-selector">${MASCOTAS.map(m=>`
          <div class="mascot-option${mascotId===m.id?' selected':''}" data-mascot="${m.id}">
            <div class="mascot-option-emoji" style="width:48px;height:48px;border-radius:50%;overflow:hidden;background:${m.color}">
              <img src="${m.img}" alt="${m.nombre}" style="width:100%;height:100%;object-fit:cover" onerror="this.parentElement.innerHTML='🤖'">
            </div>
            <span class="mascot-option-name">${m.nombre}</span>
          </div>`).join('')}
        </div></div>
      <div class="config-field" style="margin-top:12px">
        <div class="toggle-row"><span class="toggle-label">Notificaciones de citas</span><button class="toggle${notifOn?' on':''}" id="notifToggle"></button></div>
        <div class="toggle-row" style="margin-top:8px"><span class="toggle-label">Auto-registrar llamadas</span><button class="toggle on"></button></div>
        <div class="toggle-row" style="margin-top:8px"><span class="toggle-label">MAYÚSCULAS automáticas en formularios</span><button class="toggle${autoMayus?' on':''}" id="upperToggle"></button></div>
        <div style="font-size:.68rem;color:var(--text3);margin-top:4px">Aplica mayúsculas a nombres, empresa, cargo, etc. Excluye correos y enlaces.</div>
      </div>
      <div style="margin-top:14px;padding:11px;background:var(--surface2);border-radius:var(--radius-sm);font-size:.75rem;color:var(--text2);line-height:1.5">
        💡 Al tocar "Llamar", la app registra la llamada y te pregunta el resultado al volver.
      </div>
    </div>
  </div></div>`;

  _attachEvents();
}

function _attachEvents() {
  document.getElementById('avatarInput').addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 5*1024*1024) { showFileError('Esa foto es enorme! Max 5MB','😅'); return; }
    if (!file.type.startsWith('image/')) { showFileError('Sube un JPG, PNG o WEBP','🤔'); return; }
    const reader = new FileReader();
    reader.onload = async ev => { await config.set('userAvatar', ev.target.result); document.getElementById('avatarPreview').innerHTML = `<img src="${ev.target.result}" alt="">`; toast('Foto actualizada','success'); window._app?.renderNav?.(); };
    reader.readAsDataURL(file);
  });
  document.getElementById('avatarPreview').addEventListener('click', () => document.getElementById('avatarInput').click());
  document.getElementById('bannerInput').addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 5*1024*1024) { showFileError('Imagen muy grande. Max 5MB','😅'); return; }
    if (!file.type.startsWith('image/')) { showFileError('Sube un JPG, PNG o WEBP','🤔'); return; }
    const reader = new FileReader();
    reader.onload = async ev => { await config.set('bannerUrl', ev.target.result); toast('Banner guardado','success'); window._app?.renderNav?.(); render(); };
    reader.readAsDataURL(file);
  });
  document.getElementById('bannerRemove')?.addEventListener('click', async () => { await config.set('bannerUrl', null); toast('Banner eliminado'); window._app?.renderNav?.(); render(); });
  document.querySelectorAll('[data-theme-opt]').forEach(opt => {
    opt.addEventListener('click', async () => { const t = opt.dataset.themeOpt; await config.set('theme', t); document.documentElement.setAttribute('data-theme', t); document.querySelectorAll('[data-theme-opt]').forEach(o => o.classList.toggle('selected', o.dataset.themeOpt === t)); toast('Tema cambiado','success'); });
  });
  document.querySelectorAll('[data-mascot]').forEach(opt => {
    opt.addEventListener('click', async () => { const id = opt.dataset.mascot; await config.set('mascota', id); document.querySelectorAll('[data-mascot]').forEach(o => o.classList.toggle('selected', o.dataset.mascot === id)); window._app?.showMascotMessage?.(null,'bienvenida'); window._app?.renderNav?.(); });
  });
  document.getElementById('debutToggle').addEventListener('click', async function () { const on = this.classList.toggle('on'); await config.set('debutActivo', on); toast(on?'Bono debut activado':'Bono debut desactivado'); });
  document.getElementById('notifToggle').addEventListener('click', async function () { const on = this.classList.toggle('on'); await config.set('notificaciones', on); if (on) window._app?.requestNotifications?.(); });
  document.getElementById('upperToggle').addEventListener('click', async function () { const on = this.classList.toggle('on'); await config.set('autoMayusculas', on); window._app?.setAutoUpper?.(on); toast(on?'Mayúsculas automáticas activadas':'Mayúsculas automáticas desactivadas'); });
  document.getElementById('cfgSave').addEventListener('click', async () => {
    await config.set('userName',  document.getElementById('cfgNombre').value.trim());
    await config.set('cargo',     document.getElementById('cfgCargo').value);
    await config.set('filial',    document.getElementById('cfgFilial').value.trim());
    await config.set('equipo',    document.getElementById('cfgEquipo').value.trim());
    toast('Configuración guardada','success'); window._app?.renderNav?.(); window._app?.renderBottomNav?.();
  });
}
