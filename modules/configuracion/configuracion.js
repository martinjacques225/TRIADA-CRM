// modules/configuracion/configuracion.js
import { config, prospectos, diagnosticos, propuestas, citas, clientes, facturas } from '../../js/db.js';
import { toast, formatCLP, formatDate } from '../../js/utils.js';
import { mascotaEnabled, mascotaTipo, mascotasDisponibles } from '../mascota/mascota.js';

const DAY = 86400000;

const THEMES = [
  { id: 'light',  label: 'Claro',  ico: 'sun'   },
  { id: 'dark',   label: 'Oscuro', ico: 'moon'  },
  { id: 'matrix', label: 'Matrix', ico: 'cpu'   },
];
const FONT_SCALES = [
  { v: '0.9',  label: 'Pequeña' },
  { v: '1',    label: 'Normal' },
  { v: '1.1',  label: 'Grande' },
  { v: '1.25', label: 'Muy grande' },
];

export async function render() {
  const [nombre, cargo, empresa, tema, densidad, fontScale] = await Promise.all([
    config.get('userName'), config.get('cargo'), config.get('empresa'),
    config.get('theme'), config.get('density'), config.get('fontScale'),
  ]);
  const dens = densidad || 'comfortable';
  const th   = tema || 'light';
  const fs   = fontScale || '1';
  const ico = (n, s = 16) => (window.icon ? window.icon(n, '', s) : '');

  const center = document.getElementById('center');
  center.innerHTML = `<div class="view-animate" style="max-width:680px">
    <div class="section-head"><h2>Configuración</h2></div>

    <div class="card card-pad" style="margin-bottom:18px">
      <h3 class="cfg-h">Perfil del consultor</h3>
      <div class="form-row">
        <div class="form-group"><label>Nombre</label><input id="cfgNombre" value="${(nombre || '')}"></div>
        <div class="form-group"><label>Cargo</label><input id="cfgCargo" value="${(cargo || '')}" placeholder="Ej: Consultor Senior"></div>
      </div>
      <div class="form-group"><label>Empresa / Filial</label><input id="cfgEmpresa" value="${(empresa || '')}" placeholder="Ej: Tríada Consultoría"></div>
      <button class="btn btn-primary" onclick="_saveProfile()">Guardar perfil</button>
    </div>

    <div class="card card-pad" style="margin-bottom:18px">
      <h3 class="cfg-h">Apariencia</h3>

      <div class="cfg-row">
        <div class="cfg-row-lbl">Tema</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${THEMES.map(t => `<button class="btn btn-sm ${th === t.id ? 'btn-primary' : 'btn-ghost'}" onclick="_setTheme('${t.id}')">${ico(t.ico, 15)} ${t.label}</button>`).join('')}
        </div>
      </div>

      <div class="cfg-row">
        <div class="cfg-row-lbl">Densidad</div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm ${dens === 'compact' ? 'btn-ghost' : 'btn-primary'}" onclick="_setDensity('comfortable')">${ico('sliders', 15)} Cómoda</button>
          <button class="btn btn-sm ${dens === 'compact' ? 'btn-primary' : 'btn-ghost'}" onclick="_setDensity('compact')">${ico('sliders', 15)} Compacta</button>
        </div>
      </div>

      <div class="cfg-row">
        <div class="cfg-row-lbl">Tamaño de fuente</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${FONT_SCALES.map(f => `<button class="btn btn-sm ${fs === f.v ? 'btn-primary' : 'btn-ghost'}" onclick="_setFont('${f.v}')" style="font-size:${Math.round(13 * Number(f.v))}px">A</button>`).join('')}
          <span style="font-size:12.5px;color:var(--text3);align-self:center;margin-left:4px">${FONT_SCALES.find(f => f.v === fs)?.label || 'Normal'}</span>
        </div>
      </div>
    </div>

    <div class="card card-pad" style="margin-bottom:18px">
      <h3 class="cfg-h">Mascota de la compañía</h3>
      <p style="font-size:13px;color:var(--text3);margin-bottom:14px">Un compañero flotante que sigue el cursor con la mirada, parpadea y reacciona a tus clics. Las interacciones avanzadas (colgarse de las tarjetas, jugar con el mouse) llegan en una próxima etapa.</p>
      <div class="cfg-row">
        <div class="cfg-row-lbl">Activar</div>
        <label class="cfg-switch">
          <input type="checkbox" id="cfgMascota" ${mascotaEnabled() ? 'checked' : ''} onchange="_toggleMascota(this.checked)">
          <span>${mascotaEnabled() ? 'Encendida' : 'Apagada'}</span>
        </label>
      </div>
      <div class="cfg-row">
        <div class="cfg-row-lbl">Personaje</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${mascotasDisponibles().map(m => `<button class="btn btn-sm ${mascotaTipo() === m.id ? 'btn-primary' : 'btn-ghost'}" ${m.disabled ? 'disabled style="opacity:.5;cursor:not-allowed"' : `onclick="_setMascota('${m.id}')"`}>${m.emoji} ${m.label}${m.disabled ? ' · pronto' : ''}</button>`).join('')}
        </div>
      </div>
    </div>

    <div class="card card-pad" style="margin-bottom:18px">
      <h3 class="cfg-h">Carga e importación de datos</h3>
      <p style="font-size:13px;color:var(--text3);margin-bottom:14px">Sube leads de forma masiva o importa los del formulario del landing.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="window._app.navigate('leads')">${ico('upload')} Carga masiva de leads</button>
        <button class="btn btn-ghost" onclick="window._app.importLanding()">${ico('download')} Importar leads del landing</button>
      </div>
    </div>

    <div class="card card-pad" style="margin-bottom:18px">
      <h3 class="cfg-h">Exportar</h3>
      <p style="font-size:13px;color:var(--text3);margin-bottom:14px">Descarga tu información en formatos de uso directo.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-ghost" onclick="_exportAgenda()">${ico('agenda')} Agenda (CSV)</button>
        <button class="btn btn-ghost" onclick="_exportClientes()">${ico('users')} Cartera de clientes (CSV)</button>
        <button class="btn btn-ghost" onclick="_exportInformePDF()">${ico('fileText')} Informe (PDF)</button>
      </div>
    </div>

    <div class="card card-pad">
      <h3 class="cfg-h">Zona de riesgo</h3>
      <p style="font-size:13px;color:var(--text3);margin-bottom:14px">Esta acción es irreversible.</p>
      <button class="btn btn-danger btn-sm" onclick="window._app.limpiarDatos()">${ico('trash')} Limpiar todos los datos</button>
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

  window._setTheme    = async (t) => { await (window._app?.setTheme?.(t) ?? config.set('theme', t)); window._app?.navigate?.('config'); };
  window._setDensity  = async (d) => { await (window._app?.setDensity?.(d) ?? config.set('density', d)); window._app?.navigate?.('config'); };
  window._setFont     = async (s) => { await window._app?.setFontScale?.(s); window._app?.navigate?.('config'); };
  window._toggleMascota = async (on) => { await window._app?.setMascotaEnabled?.(on); window._app?.navigate?.('config'); };
  window._setMascota  = async (t) => { await window._app?.setMascota?.(t); window._app?.navigate?.('config'); };

  // ── Exportaciones ──
  window._exportAgenda = async () => {
    const cs = await citas.getAll();
    if (!cs.length) { toast('No hay reuniones en la agenda', 'info'); return; }
    const sorted = [...cs].sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
    _downloadCSV('triada-agenda', ['Fecha', 'Hora', 'Título', 'Tipo', 'Estado', 'Lugar'],
      sorted.map(c => [c.fecha || '', (c.hora || '').slice(0, 5), c.titulo || '', c.tipo || '', c.estado || '', c.lugar || '']));
    toast(`Agenda exportada (${cs.length} reuniones)`, 'success');
  };

  window._exportClientes = async () => {
    const cl = await clientes.getAll();
    if (!cl.length) { toast('No hay clientes en la cartera', 'info'); return; }
    _downloadCSV('triada-clientes', ['Código', 'Razón social', 'RUT', 'Giro', 'Dirección', 'Alta'],
      cl.map(c => [c.correlativo || '', c.razonSocial || c.nombre || '', c.rut || '', c.giro || '', c.direccion || '', (c.fechaAlta || '').slice(0, 10)]));
    toast(`Cartera exportada (${cl.length} clientes)`, 'success');
  };

  window._exportInformePDF = async () => {
    const [pros, dgs, prs, cli, fac] = await Promise.all([
      prospectos.getAll(), diagnosticos.getAll(), propuestas.getAll(), clientes.getAll(), facturas.getAll(),
    ]);
    _printInforme({ pros, dgs, prs, cli, fac, empresa: empresa || 'Tríada Consultoría', autor: nombre || '' });
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────
function _downloadCSV(baseName, headers, rows) {
  const esc = (v) => { const s = String(v ?? ''); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const csv = [headers.join(';'), ...rows.map(r => r.map(esc).join(';'))].join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${baseName}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function _printInforme({ pros, dgs, prs, cli, fac, empresa, autor }) {
  const now = Date.now();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const within = (iso, d) => iso && (now - new Date(iso).getTime()) <= d * DAY && new Date(iso).getTime() <= now;
  const overdue = (f) => f.estado === 'vencido' || (['pendiente', 'parcial'].includes(f.estado) && f.vencimiento && new Date(f.vencimiento + 'T00:00:00') < today);
  const mora = (f) => f.vencimiento ? Math.max(0, Math.floor((today - new Date(f.vencimiento + 'T00:00:00')) / DAY)) : 0;
  const sum = (arr) => arr.reduce((s, f) => s + (+f.monto || 0), 0);

  const pagadas  = fac.filter(f => f.estado === 'pagado');
  const enPlazo  = fac.filter(f => ['pendiente', 'parcial'].includes(f.estado) && !overdue(f));
  const vencidas = fac.filter(overdue).map(f => ({ ...f, m: mora(f) })).sort((a, b) => b.m - a.m);

  const row = (l, v) => `<tr><td>${l}</td><td style="text-align:right;font-weight:700">${v}</td></tr>`;
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Informe Tríada</title>
    <style>
      *{font-family:'Segoe UI',Arial,sans-serif;color:#16234A}
      body{margin:36px;font-size:13px}
      h1{font-size:22px;margin:0 0 2px} .sub{color:#5E6A85;font-size:12px;margin-bottom:22px}
      h2{font-size:14px;border-bottom:2px solid #0C7C88;padding-bottom:4px;margin:22px 0 8px;color:#0C7C88}
      table{width:100%;border-collapse:collapse;margin-bottom:8px}
      td{padding:6px 8px;border-bottom:1px solid #E5E9F0}
      .foot{margin-top:30px;color:#94A0B6;font-size:11px;border-top:1px solid #E5E9F0;padding-top:8px}
      @media print{body{margin:0}}
    </style></head><body>
    <h1>Informe ejecutivo — ${empresa}</h1>
    <div class="sub">Generado el ${formatDate(new Date().toISOString())}${autor ? ' · ' + autor : ''}</div>

    <h2>Flujo de entrada de leads</h2>
    <table>
      ${row('Últimas 24 horas', pros.filter(p => within(p.fechaCreacion, 1)).length)}
      ${row('Últimos 7 días', pros.filter(p => within(p.fechaCreacion, 7)).length)}
      ${row('Últimos 30 días', pros.filter(p => within(p.fechaCreacion, 30)).length)}
      ${row('Total histórico', pros.length)}
    </table>

    <h2>Actividad</h2>
    <table>
      ${row('Diagnósticos realizados', dgs.length)}
      ${row('Propuestas', `${prs.length} (${prs.filter(p => p.estado === 'aceptada').length} aceptadas)`)}
      ${row('Clientes en cartera', cli.length)}
    </table>

    <h2>Facturación y cobranza</h2>
    <table>
      ${row('Facturas emitidas', `${fac.length} · ${formatCLP(sum(fac))}`)}
      ${row('Pagadas', `${pagadas.length} · ${formatCLP(sum(pagadas))}`)}
      ${row('Por cobrar (en plazo)', `${enPlazo.length} · ${formatCLP(sum(enPlazo))}`)}
      ${row('Vencidas', `${vencidas.length} · ${formatCLP(sum(vencidas))}`)}
    </table>
    ${vencidas.length ? `<table><tr><td colspan="2" style="font-weight:700;color:#C04F3F;border:none">Detalle de vencidas</td></tr>
      ${vencidas.map(f => { const c = cli.find(x => x.id === f.clienteId); return row(`${f.correlativo || '—'} · ${(c && (c.razonSocial || c.nombre)) || 'Cliente'}`, `${formatCLP(f.monto)} · ${f.m} días`); }).join('')}
    </table>` : ''}

    <div class="foot">Documento generado por TRIADA CRM. Usa "Guardar como PDF" en el diálogo de impresión.</div>
    <script>window.onload=function(){setTimeout(function(){window.print()},250)}<\/script>
    </body></html>`;

  const w = window.open('', '_blank');
  if (!w) { toast('Permite las ventanas emergentes para exportar el PDF', 'error'); return; }
  w.document.write(html);
  w.document.close();
}
