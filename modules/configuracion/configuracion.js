// modules/configuracion/configuracion.js
import { config, prospectos, diagnosticos, propuestas, citas } from '../../js/db.js';
import { toast } from '../../js/utils.js';

export async function render() {
  const [nombre, cargo, empresa, tema, densidad] = await Promise.all([
    config.get('userName'), config.get('cargo'), config.get('empresa'), config.get('theme'), config.get('density')
  ]);
  const dens = densidad || 'comfortable';
  const ico = (n, s = 16) => (window.icon ? window.icon(n, '', s) : '');

  const center = document.getElementById('center');
  center.innerHTML = `<div class="view-animate" style="max-width:680px">
    <div class="section-head"><h2>Configuración</h2></div>

    <div class="card card-pad" style="margin-bottom:18px">
      <h3 style="font-family:var(--serif);font-size:18px;font-weight:500;color:var(--ink);margin-bottom:16px">Perfil del consultor</h3>
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
      <h3 style="font-family:var(--serif);font-size:18px;font-weight:500;color:var(--ink);margin-bottom:16px">Apariencia</h3>
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
        <div style="font-size:13px;font-weight:600;color:var(--text2);width:74px">Tema</div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm ${tema==='dark'?'btn-ghost':'btn-primary'}" onclick="_setTheme('light')">${ico('sun',15)} Claro</button>
          <button class="btn btn-sm ${tema==='dark'?'btn-primary':'btn-ghost'}" onclick="_setTheme('dark')">${ico('moon',15)} Oscuro</button>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:14px">
        <div style="font-size:13px;font-weight:600;color:var(--text2);width:74px">Densidad</div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm ${dens==='compact'?'btn-ghost':'btn-primary'}" onclick="_setDensity('comfortable')">${ico('sliders',15)} Cómoda</button>
          <button class="btn btn-sm ${dens==='compact'?'btn-primary':'btn-ghost'}" onclick="_setDensity('compact')">${ico('sliders',15)} Compacta</button>
        </div>
      </div>
    </div>

    <div class="card card-pad" style="margin-bottom:18px">
      <h3 style="font-family:var(--serif);font-size:18px;font-weight:500;color:var(--ink);margin-bottom:6px">Importar leads del landing</h3>
      <p style="font-size:13px;color:var(--text3);margin-bottom:14px">Importa los leads que llenaron el formulario del landing Tríada desde el mismo navegador.</p>
      <button class="btn btn-primary" onclick="window._app.importLanding()">Importar leads del landing</button>
    </div>

    <div class="card card-pad">
      <h3 style="font-family:var(--serif);font-size:18px;font-weight:500;color:var(--ink);margin-bottom:6px">Datos</h3>
      <p style="font-size:13px;color:var(--text3);margin-bottom:14px">Exporta o limpia todos los datos del CRM. Las acciones son irreversibles.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-ghost" onclick="window._app.exportarDatos()">${ico('download')} Exportar JSON</button>
        <button class="btn btn-danger btn-sm" onclick="window._app.limpiarDatos()">${ico('trash')} Limpiar todos los datos</button>
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
    await (window._app?.setTheme?.(t) ?? config.set('theme', t));
    window._app?.navigate?.('config');
  };

  window._setDensity = async (d) => {
    await (window._app?.setDensity?.(d) ?? config.set('density', d));
    window._app?.navigate?.('config');
  };
}
