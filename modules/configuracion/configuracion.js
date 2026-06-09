// modules/configuracion/configuracion.js
import { config, prospectos, diagnosticos, propuestas, citas } from '../../js/db.js';
import { toast } from '../../js/utils.js';

export async function render() {
  const [nombre, cargo, empresa, tema] = await Promise.all([
    config.get('userName'), config.get('cargo'), config.get('empresa'), config.get('theme')
  ]);

  const center = document.getElementById('center');
  center.innerHTML = `<div class="view-animate" style="max-width:680px">
    <div class="section-head"><h2>Configuración</h2></div>

    <div class="card card-pad" style="margin-bottom:18px">
      <h3 style="font-size:15px;font-weight:700;color:var(--navy);margin-bottom:16px">Perfil del consultor</h3>
      <div class="form-row">
        <div class="form-group">
          <label>Nombre</label>
          <input id="cfgNombre" value="${(nombre||'')}">
        </div>
        <div class="form-group">
          <label>Cargo</label>
          <input id="cfgCargo" value="${(cargo||'')}" placeholder="Ej: Consultor Senior">
        </div>
      </div>
      <div class="form-group">
        <label>Empresa / Filial</label>
        <input id="cfgEmpresa" value="${(empresa||'')}" placeholder="Ej: Tríada Consultoría">
      </div>
      <button class="btn btn-primary" onclick="_saveProfile()">Guardar perfil</button>
    </div>

    <div class="card card-pad" style="margin-bottom:18px">
      <h3 style="font-size:15px;font-weight:700;color:var(--navy);margin-bottom:16px">Apariencia</h3>
      <div style="display:flex;gap:12px;align-items:center">
        <div style="font-size:13.5px;color:var(--text2)">Tema</div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-sm${tema!=='dark'?' btn-primary':''}" onclick="_setTheme('light')">☀️ Claro</button>
          <button class="btn btn-ghost btn-sm${tema==='dark'?' btn-primary':''}" onclick="_setTheme('dark')">🌙 Oscuro</button>
        </div>
      </div>
    </div>

    <div class="card card-pad" style="margin-bottom:18px">
      <h3 style="font-size:15px;font-weight:700;color:var(--navy);margin-bottom:6px">Importar leads del landing</h3>
      <p style="font-size:13px;color:var(--text3);margin-bottom:14px">Importa los leads que llenaron el formulario del landing Tríada desde el mismo navegador.</p>
      <button class="btn btn-primary" onclick="window._app.importLanding()">Importar leads del landing</button>
    </div>

    <div class="card card-pad">
      <h3 style="font-size:15px;font-weight:700;color:var(--navy);margin-bottom:6px">Datos</h3>
      <p style="font-size:13px;color:var(--text3);margin-bottom:14px">Exporta o limpia todos los datos del CRM. Las acciones son irreversibles.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-ghost" onclick="window._app.exportarDatos()">📥 Exportar JSON</button>
        <button class="btn btn-danger btn-sm" onclick="window._app.limpiarDatos()">🗑 Limpiar todos los datos</button>
      </div>
    </div>
  </div>`;

  window._saveProfile = async () => {
    await Promise.all([
      config.set('userName', document.getElementById('cfgNombre').value.trim()),
      config.set('cargo',    document.getElementById('cfgCargo').value.trim()),
      config.set('empresa',  document.getElementById('cfgEmpresa').value.trim()),
    ]);
    toast('Perfil guardado', 'success');
    window._app?.renderNav?.();
  };

  window._setTheme = async (t) => {
    document.documentElement.setAttribute('data-theme', t);
    await config.set('theme', t);
    window._app?.navigate?.('config');
  };
}
