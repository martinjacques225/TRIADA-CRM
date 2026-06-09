// modules/informes/informes.js
// VISTA "Informes y Respaldos". Centro de Informes (genera PDF profesional) + respaldo de datos.
// Reutiliza el motor de respaldos existente (no duplica lógica de export/import).
import { ico } from '../../js/ui.js';
import { toast, todayStr } from '../../js/utils.js';
import { REPORTS, generate } from './report.engine.js';
import { exportExcel, exportJSON, importLeadsExcel, importJSON } from '../respaldos/respaldos.js';

const PERIODOS = [
  { id: 'hoy', label: 'Hoy' }, { id: 'semana', label: 'Semana actual' },
  { id: 'mes', label: 'Mes actual' }, { id: 'custom', label: 'Personalizado' }
];
const INCLUIR = [
  { id: 'inc_graficos', key: 'graficos', label: 'Gráficos', def: true },
  { id: 'inc_recomendaciones', key: 'recomendaciones', label: 'Recomendaciones IA', def: true },
  { id: 'inc_kpis', key: 'kpis', label: 'KPIs', def: true },
  { id: 'inc_estadisticas', key: 'estadisticas', label: 'Estadísticas', def: true }
];

export function render() {
  const center = document.getElementById('center');
  const reportCards = REPORTS.map(r => `
    <label class="rep-opt${r.available ? '' : ' off'}">
      <input type="checkbox" class="rep-check" value="${r.id}" ${r.available ? '' : 'disabled'} ${r.id === 'general' ? 'checked' : ''}>
      <span class="rep-opt-box"></span>
      <span class="rep-opt-txt">${r.label}${r.available ? '' : '<em>Etapa 2</em>'}</span>
    </label>`).join('');

  const periodoBtns = PERIODOS.map((p, i) =>
    `<label class="seg${i === 2 ? ' on' : ''}"><input type="radio" name="periodo" value="${p.id}" ${i === 2 ? 'checked' : ''}>${p.label}</label>`).join('');

  const incluirChecks = INCLUIR.map(c =>
    `<label class="inc-opt"><input type="checkbox" id="${c.id}" ${c.def ? 'checked' : ''}><span>${c.label}</span></label>`).join('');

  center.innerHTML = `<div class="view-animate informes">
    <div class="inf-card">
      <div class="inf-head">${ico.chart}<div><h3>Centro de Informes</h3><p>Genera informes ejecutivos en PDF. Puedes combinar varios en un único documento.</p></div></div>

      <div class="inf-block"><div class="inf-block-t">1 · Selecciona informes</div>
        <div class="rep-grid">${reportCards}</div></div>

      <div class="inf-block"><div class="inf-block-t">2 · Periodo</div>
        <div class="seg-group">${periodoBtns}</div>
        <div class="custom-dates" id="customDates" style="display:none">
          <label>Desde <input type="date" id="dStart"></label>
          <label>Hasta <input type="date" id="dEnd"></label>
        </div></div>

      <div class="inf-block"><div class="inf-block-t">3 · Incluir</div>
        <div class="inc-grid">${incluirChecks}</div></div>

      <button class="btn-primary inf-generate" id="btnGenerar">${ico.download}<span>Generar PDF</span></button>
      <div class="inf-hint">El PDF se descargará automáticamente. La primera vez necesita conexión para cargar el generador.</div>
    </div>

    <div class="inf-card">
      <div class="inf-head">${ico.backup}<div><h3>Respaldo de datos</h3><p>Exporta o restaura tu información.</p></div></div>
      <div class="backup-grid">
        <div class="backup-card">${ico.backup}<h3>Exportar Excel</h3><p>Todas las citas en .xlsx</p><button class="btn-primary" id="expExcel">${ico.download} Exportar Excel</button></div>
        <div class="backup-card">${ico.upload}<h3>Importar Leads</h3><p>Carga leads desde .xlsx o .csv</p><div class="file-input-wrap"><input type="file" id="impExcel" accept=".xlsx,.xls,.csv"><p>${ico.upload} Seleccionar archivo</p></div></div>
        <div class="backup-card">${ico.json}<h3>Exportar JSON</h3><p>Backup completo de todos los datos</p><button class="btn-primary" id="expJson">${ico.download} Exportar JSON</button></div>
        <div class="backup-card">${ico.upload}<h3>Importar JSON</h3><p>Restaurar desde backup</p><div class="file-input-wrap"><input type="file" id="impJson" accept=".json"><p>${ico.upload} Seleccionar .json</p></div></div>
      </div>
    </div>
  </div>`;

  // Periodo segmentado
  center.querySelectorAll('input[name="periodo"]').forEach(r => r.addEventListener('change', () => {
    center.querySelectorAll('.seg').forEach(s => s.classList.toggle('on', s.querySelector('input').checked));
    center.querySelector('#customDates').style.display = r.value === 'custom' && r.checked ? 'flex' : 'none';
    if (center.querySelector('input[name="periodo"]:checked').value === 'custom') {
      const ds = center.querySelector('#dStart'), de = center.querySelector('#dEnd');
      if (!ds.value) ds.value = todayStr(); if (!de.value) de.value = todayStr();
    }
  }));

  center.querySelector('#btnGenerar').addEventListener('click', onGenerate);

  // Respaldos (motor existente)
  center.querySelector('#expExcel').addEventListener('click', exportExcel);
  center.querySelector('#expJson').addEventListener('click', exportJSON);
  center.querySelector('#impExcel').addEventListener('change', e => { importLeadsExcel(e.target.files[0]); e.target.value = ''; });
  center.querySelector('#impJson').addEventListener('change', e => { importJSON(e.target.files[0]); e.target.value = ''; });
}

async function onGenerate() {
  const center = document.getElementById('center');
  const reports = [...center.querySelectorAll('.rep-check:checked')].map(c => c.value);
  if (!reports.length) { toast('Selecciona al menos un informe', 'warn'); return; }

  const periodKind = center.querySelector('input[name="periodo"]:checked').value;
  const customStart = center.querySelector('#dStart')?.value;
  const customEnd = center.querySelector('#dEnd')?.value;
  if (periodKind === 'custom' && (!customStart || !customEnd)) { toast('Indica el rango de fechas', 'warn'); return; }

  const includes = {};
  INCLUIR.forEach(c => { includes[c.key] = center.querySelector('#' + c.id)?.checked !== false; });

  const btn = center.querySelector('#btnGenerar');
  const prev = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = '<span class="inf-spin"></span><span>Generando informe…</span>';
  try {
    const fname = await generate({ reports, periodKind, customStart, customEnd, includes });
    toast('Informe generado: ' + fname, 'success');
  } catch (err) {
    toast(err.message || 'No se pudo generar el informe', 'warn');
  } finally {
    btn.disabled = false; btn.innerHTML = prev;
  }
}
