// modules/respaldos/respaldos.js
import { appointments } from '../../services/appointment.service.js';
import { leads } from '../../services/lead.service.js';
import { sales } from '../../services/sales.service.js';
import { config } from '../../services/config.service.js';
import { S } from '../../js/state.js';
import { todayStr, toast, showFileError } from '../../js/utils.js';

const _markBackup = () => config.set('lastBackup', new Date().toISOString()).catch(() => {});

// Iconos necesarios para esta vista (pasados desde app.js como parámetro en Etapa 4)
// Por ahora se referencian como strings inline hasta que ui.js los centralice
const _ico = {
  backup: `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/></svg>`,
  upload: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>`,
  download:`<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>`,
  json:   `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16A8 8 0 0010 2zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clip-rule="evenodd"/></svg>`
};

export function render() {
  document.getElementById('center').innerHTML = `<div class="view-animate"><div class="backup-grid">
    <div class="backup-card">${_ico.backup}<h3>Exportar Excel</h3><p>Todas las citas en .xlsx</p><button class="btn-primary" id="expExcel">${_ico.download} Exportar Excel</button></div>
    <div class="backup-card">${_ico.upload}<h3>Importar Leads</h3><p>Carga leads desde .xlsx o .csv</p><div class="file-input-wrap"><input type="file" id="impExcel" accept=".xlsx,.xls,.csv"><p>${_ico.upload} Seleccionar archivo</p></div></div>
    <div class="backup-card">${_ico.json}<h3>Exportar JSON</h3><p>Backup completo de todos los datos</p><button class="btn-primary" id="expJson">${_ico.download} Exportar JSON</button></div>
    <div class="backup-card">${_ico.upload}<h3>Importar JSON</h3><p>Restaurar desde backup</p><div class="file-input-wrap"><input type="file" id="impJson" accept=".json"><p>${_ico.upload} Seleccionar .json</p></div></div>
  </div></div>`;
  document.getElementById('expExcel').addEventListener('click', exportExcel);
  document.getElementById('expJson').addEventListener('click',  exportJSON);
  document.getElementById('impExcel').addEventListener('change', e => { importLeadsExcel(e.target.files[0]); e.target.value = ''; });
  document.getElementById('impJson').addEventListener('change',  e => { importJSON(e.target.files[0]); e.target.value = ''; });
}

export async function exportExcel() {
  if (!window.XLSX) { toast('SheetJS no cargado','warn'); return; }
  const data = await appointments.getAll();
  const ws   = XLSX.utils.json_to_sheet(data), wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Citas');
  XLSX.writeFile(wb, `crm_citas_${todayStr()}.xlsx`);
  _markBackup();
  toast('Excel exportado','success');
}

// Normaliza texto para comparar encabezados (sin acentos, minúsculas, solo alfanumérico)
const _norm = s => String(s ?? '').trim().toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, ' ').trim();

// Sinónimos por campo del lead → se mapea por "el encabezado incluye la palabra clave"
const LEAD_COLS = {
  nombre:        ['nombre', 'first'],
  apellido:      ['apellido', 'last'],
  telefono:      ['telefono', 'tel', 'fono', 'celular', 'movil', 'whatsapp', 'phone'],
  email:         ['email', 'correo', 'mail'],
  empresa:       ['empresa', 'organizacion', 'compania', 'company'],
  cargo:         ['cargo', 'rol', 'puesto', 'position'],
  interes:       ['interes', 'producto', 'plan', 'area'],
  origen:        ['origen', 'fuente', 'canal', 'source'],
  observaciones: ['observacion', 'nota', 'comentario', 'obs']
};

// Mapea cada campo a su índice de columna según los encabezados reales del archivo
function mapLeadCols(headerRow) {
  const map = {};
  headerRow.forEach((cell, idx) => {
    const h = _norm(cell);
    if (!h) return;
    for (const [field, keys] of Object.entries(LEAD_COLS)) {
      if (map[field] !== undefined) continue;
      if (keys.some(k => h.includes(k))) { map[field] = idx; break; }
    }
  });
  return map;
}

export async function importLeadsExcel(file) {
  if (!file) return;
  if (!window.XLSX) { toast('SheetJS no cargado','warn'); return; }
  if (file.size > 10*1024*1024) { showFileError('Archivo enorme! Max 10MB','🐘'); return; }
  if (!file.name.match(/\.(xlsx?|csv)$/i)) { showFileError('Formato no compatible. Sube .xlsx o .csv','🤔'); return; }
  const reader = new FileReader();
  reader.onload = async e => {
    try {
      const wb  = XLSX.read(e.target.result, { type: 'array' });
      const ws  = wb.Sheets[wb.SheetNames[0]];
      // Leemos como matriz cruda para ubicar la fila de encabezados real (la plantilla tiene título arriba)
      const grid = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' });
      const hIdx = grid.findIndex(r => r.some(c => _norm(c) === 'nombre'));
      if (hIdx === -1) { showFileError('No encontré la columna NOMBRE en el archivo. Usa la plantilla.','🧐'); return; }
      const col = mapLeadCols(grid[hIdx]);
      // Si existe la fila marcadora ("▼ Agrega tus leads…"), los datos reales empiezan tras ella
      let start = hIdx + 1;
      const mIdx = grid.findIndex((r, i) => i > hIdx && r.some(c => _norm(c).includes('agrega tus leads') || String(c).includes('▼')));
      if (mIdx !== -1) start = mIdx + 1;

      const nCol = col.nombre;
      const get  = (row, f) => col[f] !== undefined ? String(row[col[f]] ?? '').trim() : '';
      let count = 0;
      for (let i = start; i < grid.length; i++) {
        const nombre = String(grid[i][nCol] ?? '').trim();
        const nlc = _norm(nombre);
        if (!nombre) continue;
        // saltar filas de ayuda/marcador remanentes
        if (nlc.startsWith('nombre de pila') || nlc.includes('agrega tus leads') || nombre.includes('▼')) continue;
        const r = grid[i];
        await leads.add({
          nombre,
          apellido:      get(r, 'apellido'),
          telefono:      get(r, 'telefono'),
          email:         get(r, 'email'),
          empresa:       get(r, 'empresa'),
          cargo:         get(r, 'cargo'),
          interes:       get(r, 'interes'),
          origen:        get(r, 'origen'),
          observaciones: get(r, 'observaciones'),
          estado: 'Nuevo'
        });
        count++;
      }
      if (count === 0) { showFileError('No encontré leads con nombre para importar. Revisa la columna NOMBRE.','🤔'); return; }
      toast(`${count} leads importados`, 'success');
      window._app?.navigate?.('leads');
    } catch { showFileError('No pude leer ese archivo. Verifica que sea .xlsx válido.','😬'); }
  };
  reader.readAsArrayBuffer(file);
}

export async function exportJSON() {
  const data = { appointments: await appointments.getAll(), leads: await leads.getAll(), sales: await sales.getAll() };
  const blob  = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a     = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download  = `crm_backup_${todayStr()}.json`; a.click();
  _markBackup();
  toast('JSON exportado','success');
}

export async function importJSON(file) {
  if (!file) return;
  if (!file.name.endsWith('.json')) { showFileError('Necesito el archivo .json del backup','🤨'); return; }
  const reader = new FileReader();
  reader.onload = async e => {
    try {
      const data = JSON.parse(e.target.result); let count = 0;
      if (Array.isArray(data.appointments)) for (const r of data.appointments) { const {id,...rest}=r; if(rest.nombre&&rest.fecha&&rest.hora){await appointments.add(rest);count++;} }
      if (Array.isArray(data.leads))        for (const r of data.leads)        { const {id,...rest}=r; if(rest.nombre){await leads.add(rest);count++;} }
      if (Array.isArray(data.sales))        for (const r of data.sales)        { const {id,...rest}=r; if(rest.plan){await sales.add(rest);count++;} }
      toast(`${count} registros restaurados`, 'success');
      window._app?.navigate?.(S.view);
    } catch { showFileError('JSON corrupto o inválido','😅'); }
  };
  reader.readAsText(file);
}
