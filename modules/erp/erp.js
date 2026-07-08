// modules/erp/erp.js — ERP · Operación (F1: Proyectos + Horas + Gastos + Rentabilidad)
//
// "El ERP del lunes": convertir un cliente en proyecto, registrar horas y gastos, y ver
// si cada proyecto gana plata. La rentabilidad se calcula con el dominio PURO (testeado);
// los gastos son CONFIDENCIALES (la RLS los tapa a quien no es finanzas). Módulo
// autocontenido: expone sus handlers en window._erp (patrón del AI Commander / window._aic).
import { proyectos, horas, gastos, clientes, facturas, profiles, movimientos, parametrosTributarios } from '../../js/db.js';
import { supabase } from '../../js/supabase.js';
import { formatCLP, escHtml, toast } from '../../js/utils.js';
import { S } from '../../js/state.js';
import { calcRentabilidad } from './domain/rentabilidad.js';
import { calcFlujoCaja, calcF29 } from './domain/finanzas.js';

const _i  = (n, s) => (window.icon ? window.icon(n, '', s) : '');
const _num = (v) => Number(String(v ?? '').replace(/[^\d.-]/g, '')) || 0;
const _today = () => new Date().toISOString().slice(0, 10);
const _puedeFinanzas = () => { const p = S.profile || {}; return p.role === 'admin' || ['gerencia', 'finanzas'].includes(p.erp_role); };
const _groupBy = (arr, key) => arr.reduce((m, x) => { (m[x[key]] = m[x[key]] || []).push(x); return m; }, {});

const _st = { view: 'cockpit', proyectoId: null, nuevoOpen: false, editOpen: false, tab: 'cockpit' };

export async function render() {
  _wire();
  if (_st.view === 'proyecto' && _st.proyectoId) return _renderProyecto(_st.proyectoId);
  return _st.tab === 'caja' ? _renderCaja() : _renderCockpit();
}

function _tabs(active) {
  const t = (id, label) => `<button onclick="window._erp.tab('${id}')" style="padding:9px 16px;border:none;background:none;border-bottom:2px solid ${active === id ? 'var(--primary)' : 'transparent'};color:${active === id ? 'var(--primary)' : 'var(--text3)'};font-weight:600;font-size:13.5px;cursor:pointer">${label}</button>`;
  return `<div style="display:flex;gap:4px;border-bottom:1px solid var(--border);margin:2px 0 20px">${t('cockpit', 'Centro de Mando')}${t('caja', 'Caja & Flujo')}</div>`;
}

// ══════════════ COCKPIT + CARTERA ══════════════
async function _renderCockpit() {
  const center = document.getElementById('center');
  center.innerHTML = `<div class="view-animate">${_head('')}<div class="card card-pad" style="text-align:center;color:var(--text3)">Cargando…</div></div>`;

  const finanzas = _puedeFinanzas();
  const [proj, fac, team, cli, org, gas, allHoras] = await Promise.all([
    proyectos.getAll().catch(() => []),
    facturas.getAll().catch(() => []),
    profiles.getAll().catch(() => []),
    clientes.getAll().catch(() => []),
    supabase.from('org_settings').select('display_name,tenant_tipo').limit(1).then(r => (r.data && r.data[0]) || null).catch(() => null),
    finanzas ? gastos.getAll().catch(() => []) : Promise.resolve([]),
    horas.getAll().catch(() => []),
  ]);

  const activos   = proj.filter(p => p.estado === 'activo').length;
  const saldo     = (f) => Math.max(0, (Number(f.monto) || 0) - (Number(f.pagado) || 0));
  const porCobrar = fac.filter(f => f.estado === 'pendiente' || f.estado === 'parcial').reduce((s, f) => s + saldo(f), 0);
  const vencido   = fac.filter(f => f.estado === 'vencido').reduce((s, f) => s + saldo(f), 0);

  const hByP = _groupBy(allHoras, 'proyectoId');
  const gByP = _groupBy(gas, 'proyectoId');
  const cliName = Object.fromEntries(cli.map(c => [c.id, c.nombre || c.empresa]));
  const tenantChip = org
    ? `<span class="badge" style="margin-left:10px;font-size:11px;color:var(--primary);background:var(--primary-l);border-color:var(--primary)">${escHtml(org.display_name || 'Tríada')} · ${org.tenant_tipo === 'interno' ? 'interno' : 'cliente'}</span>` : '';

  center.innerHTML = `<div class="view-animate">
    ${_head(tenantChip)}
    ${_tabs('cockpit')}
    <div class="kpi-grid">
      ${_kpi('Proyectos activos', activos, 'En curso', 'checkCirc', 'var(--primary)', 'var(--primary-l)')}
      ${_kpi('Por cobrar', formatCLP(porCobrar), 'Pendientes / parciales', 'coins', 'var(--amber)', 'var(--amber-l)')}
      ${_kpi('Vencido', formatCLP(vencido), 'Requiere cobro', 'coins', '#B23B3B', 'color-mix(in srgb,#B23B3B 15%,var(--surface))')}
      ${_kpi('Equipo activo', team.length, cli.length + ' clientes en cartera', 'users', 'var(--green)', 'var(--green-l)')}
    </div>

    <div class="section-head" style="margin-top:26px"><h2>Proyectos</h2>
      <button class="btn btn-primary btn-sm" onclick="window._erp.toggleNuevo()">+ Nuevo proyecto</button>
    </div>
    <div id="erpNuevo">${_st.nuevoOpen ? _formNuevo(cli) : ''}</div>
    <div class="card" style="overflow:hidden">
      ${proj.length === 0
        ? `<div class="card-pad" style="color:var(--text3);font-size:14px">Sin proyectos aún. Crea el primero desde un cliente ganado con “+ Nuevo proyecto”.</div>`
        : proj.map(p => _projRow(p, hByP[p.id] || [], finanzas ? (gByP[p.id] || []) : [], cliName[p.clienteId], finanzas)).join('')}
    </div>
  </div>`;
}

function _head(chip) {
  return `<div class="home-header"><div>
    <div class="home-greeting">Operación · ERP Tríada ${chip}</div>
    <h1 class="home-title">Centro de Mando</h1>
  </div></div>`;
}

function _kpi(label, value, sub, icon, color, bg) {
  return `<div class="kpi-card">
    <div class="kpi-top"><span class="kpi-label">${escHtml(label)}</span><span class="kpi-ic" style="background:${bg};color:${color}">${_i(icon)}</span></div>
    <div class="kpi-value kpi-value-sm">${value}</div>
    <div class="kpi-sub">${escHtml(sub)}</div>
  </div>`;
}

function _projRow(p, hs, gs, cliNombre, finanzas) {
  const r = calcRentabilidad(p, hs, gs);
  const col = r.margen >= 0 ? 'var(--green)' : '#B23B3B';
  const txt = r.confiable ? formatCLP(r.margen) + (r.margenPct != null ? ` · ${r.margenPct}%` : '') : 'dato faltante';
  const tarifaTxt = p.tarifa ? ` · $${Number(p.tarifa).toLocaleString('es-CL')}/h` : '';
  return `<div class="prospect-row" onclick="window._erp.open('${p.id}')" style="display:flex;align-items:center;gap:12px;padding:13px 16px;border-bottom:1px solid var(--border);cursor:pointer;transition:var(--tr)" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background=''">
    <div style="flex:1;min-width:0">
      <div style="font-size:14px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(p.nombre || '—')}</div>
      <div style="font-size:12px;color:var(--text3)">${escHtml(cliNombre || 'Interno')} · ${r.totalHoras} h${tarifaTxt}</div>
    </div>
    <div style="text-align:right;flex-shrink:0">
      <div style="font-size:13px;font-weight:700;color:${r.confiable ? col : 'var(--text3)'}">${txt}</div>
      <div style="font-size:11px;color:var(--text3)">margen</div>
    </div>
  </div>`;
}

function _formNuevo(cli) {
  return `<div class="card card-pad" style="margin-bottom:14px;border-left:3px solid var(--primary)">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group" style="grid-column:1/-1"><label>Nombre del proyecto *</label><input id="erpNomP" type="text" placeholder="Ej: Rediseño web ACME"></div>
      <div class="form-group"><label>Cliente</label><select id="erpCliP"><option value="">— Interno (Tríada) —</option>${cli.map(c => `<option value="${c.id}">${escHtml(c.nombre || c.empresa || '—')}</option>`).join('')}</select></div>
      <div class="form-group"><label>Tipo</label><input id="erpTipoP" type="text" placeholder="Consultoría / Desarrollo…"></div>
      <div class="form-group"><label>Tarifa por hora (CLP)</label><input id="erpTarifaP" type="number" placeholder="20000"></div>
      <div class="form-group"><label>Presupuesto de horas</label><input id="erpPresHP" type="number" placeholder="40"></div>
      <div class="form-group" style="grid-column:1/-1"><label>Valor acordado / ingreso (CLP)</label><input id="erpPresMP" type="number" placeholder="1000000"></div>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:6px">
      <button class="btn btn-ghost btn-sm" onclick="window._erp.toggleNuevo()">Cancelar</button>
      <button class="btn btn-primary btn-sm" onclick="window._erp.crearProyecto()">Crear proyecto</button>
    </div>
  </div>`;
}

function _formEconomia(p) {
  return `<div style="margin-top:14px;border-top:1px solid var(--border);padding-top:14px;display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:12px;align-items:end">
    <div class="form-group" style="margin:0"><label>Tarifa por hora (CLP)</label><input id="erpEcoTarifa" type="number" value="${p.tarifa ?? ''}" placeholder="20000"></div>
    <div class="form-group" style="margin:0"><label>Valor acordado / ingreso (CLP)</label><input id="erpEcoMonto" type="number" value="${p.presupuestoMonto ?? ''}" placeholder="1000000"></div>
    <div class="form-group" style="margin:0"><label>Presupuesto de horas</label><input id="erpEcoHoras" type="number" value="${p.presupuestoHoras ?? ''}" placeholder="40"></div>
    <button class="btn btn-primary btn-sm" onclick="window._erp.saveEconomia('${p.id}')">Guardar</button>
  </div>`;
}

// ══════════════ CAJA & FLUJO (F2) ══════════════
async function _renderCaja() {
  const center = document.getElementById('center');
  center.innerHTML = `<div class="view-animate">${_head('')}${_tabs('caja')}<div class="card card-pad" style="text-align:center;color:var(--text3)">Cargando…</div></div>`;

  const periodo = _today().slice(0, 7);
  const [mov, fac, gas, params] = await Promise.all([
    movimientos.getAll().catch(() => []),
    facturas.getAll().catch(() => []),
    gastos.getAll().catch(() => []),
    parametrosTributarios.getByPeriodo(periodo).catch(() => null),
  ]);

  const fl  = calcFlujoCaja(mov, fac, gas, _today());
  const f29 = calcF29(fac, gas, params || {}, periodo);
  const money = formatCLP;

  center.innerHTML = `<div class="view-animate">
    ${_head('')}
    ${_tabs('caja')}

    <div class="kpi-grid">
      ${_kpi('Saldo en caja', money(fl.saldoCaja), 'Ingresos − egresos reales', 'coins', 'var(--primary)', 'var(--primary-l)')}
      ${_kpi('Por cobrar', money(fl.porCobrar), fl.vencidoCobrar > 0 ? money(fl.vencidoCobrar) + ' vencido' : 'al día', 'checkCirc', 'var(--green)', 'var(--green-l)')}
      ${_kpi('Por pagar', money(fl.porPagar), fl.vencidoPagar > 0 ? money(fl.vencidoPagar) + ' vencido' : 'al día', 'coins', '#B23B3B', 'color-mix(in srgb,#B23B3B 15%,var(--surface))')}
      ${_kpi('Proyección', money(fl.proyeccion), 'caja + cobrar − pagar', 'chart', 'var(--violet)', 'var(--violet-l)')}
    </div>

    <div class="section-head" style="margin-top:26px"><h2>Borrador F29 · ${periodo}</h2></div>
    <div class="card card-pad">
      <div style="display:flex;flex-wrap:wrap;gap:22px;align-items:flex-end">
        <div><div class="kpi-label">IVA débito (ventas)</div><div class="kpi-value kpi-value-sm">${money(f29.ivaDebito)}</div></div>
        <div><div class="kpi-label">IVA crédito (gastos)</div><div class="kpi-value kpi-value-sm">${money(f29.ivaCredito)}</div></div>
        <div><div class="kpi-label">PPM</div><div class="kpi-value kpi-value-sm">${money(f29.ppm)}</div></div>
        <div style="margin-left:auto;text-align:right"><div class="kpi-label">Total F29 estimado</div><div class="kpi-value">${money(f29.totalF29)}</div></div>
      </div>
      <div style="margin-top:12px;font-size:12px;color:var(--text3)">Borrador de apoyo — <strong>no reemplaza a tu contador</strong>. Asume que el monto de la factura incluye IVA.</div>
      ${f29.flags.includes('sin_ppm') ? `<div style="margin-top:8px;font-size:12.5px;color:#9A6a1a;background:color-mix(in srgb,var(--amber) 12%,var(--surface));border-radius:8px;padding:8px 12px">⚠ Falta el % PPM del período (complétalo abajo para estimar el PPM).</div>` : ''}
    </div>

    <div class="section-head" style="margin-top:22px"><h2>Parámetros del período</h2><span class="text-muted" style="font-size:13px">${periodo}</span></div>
    <div class="card card-pad">
      <div style="display:grid;grid-template-columns:repeat(4,1fr) auto;gap:12px;align-items:end">
        <div class="form-group" style="margin:0"><label>UF</label><input id="erpPUF" type="number" value="${params?.uf ?? ''}" placeholder="38000"></div>
        <div class="form-group" style="margin:0"><label>UTM</label><input id="erpPUTM" type="number" value="${params?.utm ?? ''}" placeholder="66000"></div>
        <div class="form-group" style="margin:0"><label>% PPM</label><input id="erpPPPM" type="number" step="0.1" value="${params?.pctPpm ?? ''}" placeholder="1"></div>
        <div class="form-group" style="margin:0"><label>% Retención</label><input id="erpPRet" type="number" step="0.1" value="${params?.pctRetencion ?? ''}" placeholder="14.5"></div>
        <button class="btn btn-primary btn-sm" onclick="window._erp.saveParams('${periodo}','${params?.id || ''}')">Guardar</button>
      </div>
    </div>

    <div class="section-head" style="margin-top:22px"><h2>Movimientos de caja</h2></div>
    <div class="card card-pad" style="margin-bottom:10px">
      <div style="display:grid;grid-template-columns:120px 1fr 140px auto;gap:10px;align-items:end">
        <div class="form-group" style="margin:0"><label>Tipo</label><select id="erpMTipo"><option value="ingreso">Ingreso</option><option value="egreso">Egreso</option></select></div>
        <div class="form-group" style="margin:0"><label>Descripción</label><input id="erpMDesc" type="text" placeholder="Detalle"></div>
        <div class="form-group" style="margin:0"><label>Monto (CLP)</label><input id="erpMMonto" type="number" placeholder="100000"></div>
        <button class="btn btn-primary btn-sm" onclick="window._erp.addMovimiento()">+ Movimiento</button>
      </div>
    </div>
    <div class="card" style="overflow:hidden">
      ${mov.length === 0
        ? `<div class="card-pad" style="color:var(--text3);font-size:13.5px">Sin movimientos registrados.</div>`
        : mov.slice(0, 40).map(m => `<div style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid var(--border)">
            <div style="width:74px;font-size:12.5px;color:var(--text3)">${escHtml((m.fechaReal || '').slice(0, 10))}</div>
            <div style="flex:1;font-size:13px;color:var(--text)">${escHtml(m.descripcion || '')}</div>
            <div style="width:120px;text-align:right;font-weight:700;font-size:13px;color:${m.tipo === 'ingreso' ? 'var(--green)' : '#B23B3B'}">${m.tipo === 'ingreso' ? '+' : '−'}${money(m.monto)}</div>
            <button class="btn-icon btn-sm" title="Eliminar" onclick="window._erp.delMovimiento('${m.id}')">${_i('trash', 15)}</button>
          </div>`).join('')}
    </div>
  </div>`;
}

// ══════════════ DETALLE DE PROYECTO ══════════════
async function _renderProyecto(id) {
  const center = document.getElementById('center');
  const back = `<button class="btn btn-ghost btn-sm" onclick="window._erp.back()">← Proyectos</button>`;
  center.innerHTML = `<div class="view-animate">${back}<div class="card card-pad" style="text-align:center;color:var(--text3);margin-top:12px">Cargando…</div></div>`;

  const finanzas = _puedeFinanzas();
  const [p, hs, gs, cli] = await Promise.all([
    proyectos.get(id).catch(() => null),
    horas.byProyecto(id).catch(() => []),
    finanzas ? gastos.byProyecto(id).catch(() => []) : Promise.resolve([]),
    clientes.getAll().catch(() => []),
  ]);
  if (!p) { center.innerHTML = `<div class="view-animate">${back}<div class="card card-pad" style="margin-top:12px">Proyecto no encontrado.</div></div>`; return; }

  const cliNombre = (cli.find(c => c.id === p.clienteId) || {});
  const r = calcRentabilidad(p, hs, gs);
  const margenCol = r.margen >= 0 ? 'var(--green)' : '#B23B3B';

  center.innerHTML = `<div class="view-animate">
    ${back}
    <div class="home-header" style="margin-top:12px"><div>
      <div class="home-greeting">${escHtml(cliNombre.nombre || cliNombre.empresa || 'Proyecto interno')} · ${escHtml(p.correlativo || '')}</div>
      <h1 class="home-title">${escHtml(p.nombre || '—')}</h1>
    </div></div>

    <!-- Rentabilidad -->
    <div class="card card-pad" style="border-left:3px solid ${margenCol}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div class="kpi-label" style="font-size:12.5px">Rentabilidad del proyecto</div>
        <button class="btn btn-ghost btn-sm" onclick="window._erp.toggleEdit()">✎ Editar tarifa / valor</button>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:22px;align-items:flex-end">
        <div><div class="kpi-label">Ingreso comprometido</div><div class="kpi-value kpi-value-sm">${formatCLP(r.ingreso)}</div></div>
        <div><div class="kpi-label">Costo (horas + gastos)</div><div class="kpi-value kpi-value-sm">${formatCLP(r.costoTotal)}</div><div class="kpi-sub">${r.totalHoras} h${p.tarifa ? ` × $${Number(p.tarifa).toLocaleString('es-CL')}` : ''} + ${formatCLP(r.costoGastos)} gastos</div></div>
        <div style="margin-left:auto;text-align:right"><div class="kpi-label">Margen</div><div class="kpi-value" style="color:${margenCol}">${formatCLP(r.margen)}</div>${r.margenPct != null ? `<div class="kpi-sub" style="color:${margenCol}">${r.margenPct}%</div>` : ''}</div>
      </div>
      ${r.flags.length ? `<div style="margin-top:12px;font-size:12.5px;color:#9A6a1a;background:color-mix(in srgb,var(--amber) 12%,var(--surface));border-radius:8px;padding:8px 12px">⚠ Dato faltante: ${r.flags.map(f => f === 'sin_tarifa' ? 'falta la tarifa por hora' : 'falta el valor acordado (lo que cobras por el proyecto)').join(' · ')}. Toca <strong>«✎ Editar tarifa / valor»</strong> aquí arriba para completarlo — el margen es referencial hasta entonces.</div>` : ''}
      ${_st.editOpen ? _formEconomia(p) : ''}
    </div>

    <!-- Horas -->
    <div class="section-head" style="margin-top:24px"><h2>Horas</h2><span class="text-muted" style="font-size:13px">${r.totalHoras} h registradas</span></div>
    <div class="card card-pad" style="margin-bottom:10px">
      <div style="display:grid;grid-template-columns:130px 90px 1fr auto;gap:10px;align-items:end">
        <div class="form-group" style="margin:0"><label>Fecha</label><input id="erpHFecha" type="date" value="${_today()}"></div>
        <div class="form-group" style="margin:0"><label>Horas</label><input id="erpHHoras" type="number" step="0.5" placeholder="2"></div>
        <div class="form-group" style="margin:0"><label>Nota</label><input id="erpHNota" type="text" placeholder="Qué hiciste"></div>
        <button class="btn btn-primary btn-sm" onclick="window._erp.addHora('${id}')">+ Hora</button>
      </div>
    </div>
    <div class="card" style="overflow:hidden">
      ${hs.length === 0
        ? `<div class="card-pad" style="color:var(--text3);font-size:13.5px">Sin horas registradas.</div>`
        : hs.map(h => `<div style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid var(--border)">
            <div style="width:74px;font-size:12.5px;color:var(--text3)">${escHtml((h.fecha || '').slice(0, 10))}</div>
            <div style="width:56px;font-weight:700;font-size:13.5px">${h.horas} h</div>
            <div style="flex:1;font-size:13px;color:var(--text)">${escHtml(h.nota || '')}</div>
            <button class="btn-icon btn-sm" title="Eliminar" onclick="window._erp.delHora('${h.id}')">${_i('trash', 15)}</button>
          </div>`).join('')}
    </div>

    ${finanzas ? `
    <!-- Gastos -->
    <div class="section-head" style="margin-top:24px"><h2>Gastos</h2><span class="text-muted" style="font-size:13px">${formatCLP(r.costoGastos)} · confidencial</span></div>
    <div class="card card-pad" style="margin-bottom:10px">
      <div style="display:grid;grid-template-columns:1fr 1fr 120px auto;gap:10px;align-items:end">
        <div class="form-group" style="margin:0"><label>Categoría</label><input id="erpGCat" type="text" placeholder="Proveedor / insumo"></div>
        <div class="form-group" style="margin:0"><label>Descripción</label><input id="erpGDesc" type="text" placeholder="Detalle"></div>
        <div class="form-group" style="margin:0"><label>Neto (CLP)</label><input id="erpGNeto" type="number" placeholder="50000"></div>
        <button class="btn btn-primary btn-sm" onclick="window._erp.addGasto('${id}')">+ Gasto</button>
      </div>
      <div class="kpi-sub" style="margin-top:6px">Se agrega IVA 19% automático (neto + IVA = total).</div>
    </div>
    <div class="card" style="overflow:hidden">
      ${gs.length === 0
        ? `<div class="card-pad" style="color:var(--text3);font-size:13.5px">Sin gastos registrados.</div>`
        : gs.map(g => `<div style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid var(--border)">
            <div style="width:74px;font-size:12.5px;color:var(--text3)">${escHtml((g.fecha || '').slice(0, 10))}</div>
            <div style="flex:1;font-size:13px;color:var(--text)">${escHtml(g.categoria || '')}${g.descripcion ? ' · ' + escHtml(g.descripcion) : ''}</div>
            <span class="badge" style="font-size:10.5px">${g.estado || 'pendiente'}</span>
            <div style="width:100px;text-align:right;font-weight:700;font-size:13px">${formatCLP(g.total)}</div>
            <button class="btn-icon btn-sm" title="Eliminar" onclick="window._erp.delGasto('${g.id}')">${_i('trash', 15)}</button>
          </div>`).join('')}
    </div>` : ''}
  </div>`;
}

// ══════════════ HANDLERS (window._erp) ══════════════
function _wire() {
  window._erp = {
    toggleNuevo: () => { _st.nuevoOpen = !_st.nuevoOpen; render(); },
    toggleEdit:  () => { _st.editOpen = !_st.editOpen; render(); },
    tab:         (t) => { _st.tab = t; render(); },
    open:  (id) => { _st.view = 'proyecto'; _st.proyectoId = id; _st.editOpen = false; render(); },
    back:  ()   => { _st.view = 'cockpit'; _st.proyectoId = null; _st.editOpen = false; render(); },
    crearProyecto: async () => {
      const nombre = document.getElementById('erpNomP')?.value.trim();
      if (!nombre) { toast('Ponle un nombre al proyecto', 'error'); return; }
      try {
        await proyectos.add({
          nombre,
          clienteId:        document.getElementById('erpCliP')?.value || null,
          tipo:             document.getElementById('erpTipoP')?.value.trim() || null,
          tarifa:           _num(document.getElementById('erpTarifaP')?.value) || null,
          presupuestoHoras: _num(document.getElementById('erpPresHP')?.value) || null,
          presupuestoMonto: _num(document.getElementById('erpPresMP')?.value) || null,
        });
        _st.nuevoOpen = false;
        toast('Proyecto creado', 'success');
        render();
      } catch (err) { console.error(err); toast('No se pudo crear el proyecto', 'error'); }
    },
    saveEconomia: async (id) => {
      try {
        await proyectos.update({
          id,
          tarifa:           _num(document.getElementById('erpEcoTarifa')?.value) || null,
          presupuestoMonto: _num(document.getElementById('erpEcoMonto')?.value) || null,
          presupuestoHoras: _num(document.getElementById('erpEcoHoras')?.value) || null,
        });
        _st.editOpen = false;
        toast('Valores actualizados', 'success');
        render();
      } catch (err) { console.error(err); toast('No se pudo actualizar', 'error'); }
    },
    addHora: async (pid) => {
      const h = _num(document.getElementById('erpHHoras')?.value);
      if (!(h > 0)) { toast('Indica las horas (> 0)', 'error'); return; }
      try {
        await horas.add({
          proyectoId: pid,
          fecha:      document.getElementById('erpHFecha')?.value || _today(),
          horas:      h,
          nota:       document.getElementById('erpHNota')?.value.trim() || null,
          facturable: true,
        });
        toast('Horas registradas', 'success');
        render();
      } catch (err) { console.error(err); toast('No se pudieron registrar las horas', 'error'); }
    },
    addGasto: async (pid) => {
      const neto = _num(document.getElementById('erpGNeto')?.value);
      if (!(neto > 0)) { toast('Indica el neto del gasto', 'error'); return; }
      const iva = Math.round(neto * 0.19);
      try {
        await gastos.add({
          proyectoId:  pid,
          categoria:   document.getElementById('erpGCat')?.value.trim() || null,
          descripcion: document.getElementById('erpGDesc')?.value.trim() || null,
          neto, iva, total: neto + iva,
          estado:      'pendiente',
          fecha:       _today(),
        });
        toast('Gasto registrado', 'success');
        render();
      } catch (err) { console.error(err); toast('No se pudo registrar el gasto', 'error'); }
    },
    delHora: async (id) => { try { await horas.delete(id); render(); } catch (err) { console.error(err); toast('No se pudo eliminar', 'error'); } },
    delGasto: async (id) => { try { await gastos.delete(id); render(); } catch (err) { console.error(err); toast('No se pudo eliminar', 'error'); } },
    addMovimiento: async () => {
      const monto = _num(document.getElementById('erpMMonto')?.value);
      if (!(monto > 0)) { toast('Indica el monto', 'error'); return; }
      try {
        await movimientos.add({
          tipo:        document.getElementById('erpMTipo')?.value || 'ingreso',
          descripcion: document.getElementById('erpMDesc')?.value.trim() || null,
          monto, fechaReal: _today(),
        });
        toast('Movimiento registrado', 'success'); render();
      } catch (err) { console.error(err); toast('No se pudo registrar el movimiento', 'error'); }
    },
    delMovimiento: async (id) => { try { await movimientos.delete(id); render(); } catch (err) { console.error(err); toast('No se pudo eliminar', 'error'); } },
    saveParams: async (periodo, id) => {
      const payload = {
        periodo,
        uf:           _num(document.getElementById('erpPUF')?.value)  || null,
        utm:          _num(document.getElementById('erpPUTM')?.value) || null,
        pctPpm:       _num(document.getElementById('erpPPPM')?.value) || null,
        pctRetencion: _num(document.getElementById('erpPRet')?.value) || null,
      };
      try {
        if (id) await parametrosTributarios.update({ id, ...payload });
        else    await parametrosTributarios.add(payload);
        toast('Parámetros guardados', 'success'); render();
      } catch (err) { console.error(err); toast('No se pudieron guardar los parámetros', 'error'); }
    },
  };
}
