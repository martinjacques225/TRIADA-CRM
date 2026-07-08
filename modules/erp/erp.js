// modules/erp/erp.js — ERP · Operación (F1: Proyectos + Horas + Gastos + Rentabilidad)
//
// "El ERP del lunes": convertir un cliente en proyecto, registrar horas y gastos, y ver
// si cada proyecto gana plata. La rentabilidad se calcula con el dominio PURO (testeado);
// los gastos son CONFIDENCIALES (la RLS los tapa a quien no es finanzas). Módulo
// autocontenido: expone sus handlers en window._erp (patrón del AI Commander / window._aic).
import { proyectos, horas, gastos, clientes, facturas, profiles, movimientos, parametrosTributarios, proveedores, ordenesCompra, activosLicencias, empleados, remuneraciones } from '../../js/db.js';
import { supabase } from '../../js/supabase.js';
import { formatCLP, escHtml, toast } from '../../js/utils.js';
import { S } from '../../js/state.js';
import { calcRentabilidad } from './domain/rentabilidad.js';
import { calcFlujoCaja, calcF29 } from './domain/finanzas.js';
import { calcOC, ocToGasto, gastoToMovimiento } from './domain/compras.js';
import { calcDigest } from './domain/digest.js';
import { costoHora, calcMargenReal, resumenNomina, HORAS_MES } from './domain/nomina.js';

const _i  = (n, s) => (window.icon ? window.icon(n, '', s) : '');
const _num = (v) => Number(String(v ?? '').replace(/[^\d.-]/g, '')) || 0;
const _today = () => new Date().toISOString().slice(0, 10);
const _puedeFinanzas = () => { const p = S.profile || {}; return p.role === 'admin' || ['gerencia', 'finanzas'].includes(p.erp_role); };
const _puedeNomina   = () => { const p = S.profile || {}; return p.role === 'admin' || ['gerencia', 'finanzas'].includes(p.erp_role); };
const _tieneErp      = () => { const p = S.profile || {}; return p.role === 'admin' || !!p.erp_role; };
const _groupBy = (arr, key) => arr.reduce((m, x) => { (m[x[key]] = m[x[key]] || []).push(x); return m; }, {});

const _st = { view: 'cockpit', proyectoId: null, nuevoOpen: false, editOpen: false, tab: 'cockpit', ocLineas: [], provOpen: false, ocOpen: false, actOpen: false, nomPeriodo: null, empOpen: false, empEditId: null, remOpen: false, remEditId: null, _rems: [] };

export async function render() {
  _wire();
  if (_st.view === 'proyecto' && _st.proyectoId) return _renderProyecto(_st.proyectoId);
  // Las pestañas financieras solo existen para finanzas/gerencia/admin (la RLS también las tapa).
  if (_st.tab !== 'cockpit' && !_puedeFinanzas() && !(_st.tab === 'nomina' && _tieneErp())) _st.tab = 'cockpit';
  if (_st.tab === 'caja')    return _renderCaja();
  if (_st.tab === 'compras') return _renderCompras();
  if (_st.tab === 'equipo')  return _renderEquipo();
  if (_st.tab === 'nomina')  return _puedeNomina() ? _renderNomina() : _renderMiNomina();
  return _renderCockpit();
}

function _tabs(active) {
  const t = (id, label) => `<button onclick="window._erp.tab('${id}')" style="padding:9px 16px;border:none;background:none;border-bottom:2px solid ${active === id ? 'var(--primary)' : 'transparent'};color:${active === id ? 'var(--primary)' : 'var(--text3)'};font-weight:600;font-size:13.5px;cursor:pointer">${label}</button>`;
  const fin = _puedeFinanzas();
  const nom = _tieneErp();
  return `<div style="display:flex;gap:4px;flex-wrap:wrap;border-bottom:1px solid var(--border);margin:2px 0 20px">${t('cockpit', 'Centro de Mando')}${fin ? t('caja', 'Caja & Flujo') + t('compras', 'Compras') + t('equipo', 'Equipo & Activos') : ''}${nom ? t('nomina', _puedeNomina() ? 'Nómina' : 'Mi liquidación') : ''}</div>`;
}

// Digest determinista de trIA (no IA generativa) + "Requiere tu atención".
function _digestCard(d) {
  const col = d.criticos ? '#B23B3B' : 'var(--primary)';
  const dot = (nivel) => nivel === 'critico' ? '#B23B3B' : nivel === 'aviso' ? 'var(--amber)' : 'var(--text3)';
  return `<div class="card card-pad" style="border-left:3px solid ${col};margin-bottom:20px">
    <div style="display:flex;align-items:baseline;gap:9px;flex-wrap:wrap;margin-bottom:7px">
      <span style="font-size:10.5px;letter-spacing:.13em;text-transform:uppercase;color:var(--primary);font-weight:700">trIA · lectura del día</span>
      <span style="font-size:10.5px;color:var(--text3)">determinista, sin IA generativa</span>
    </div>
    <div style="font-size:15px;font-weight:600;color:var(--text);${d.alerts.length ? 'margin-bottom:12px' : ''}">${escHtml(d.titular)}</div>
    ${d.alerts.length ? `<div style="display:flex;flex-direction:column;gap:9px">
      ${d.alerts.map(a => `<div style="display:flex;align-items:center;gap:10px;font-size:13px;flex-wrap:wrap">
        <span style="width:8px;height:8px;border-radius:50%;background:${dot(a.nivel)};flex-shrink:0"></span>
        <span style="font-weight:600;color:var(--text)">${escHtml(a.titulo)}</span>
        <span style="color:var(--text3)">${escHtml(a.detalle)}</span>
        ${a.monto ? `<span style="margin-left:auto;font-weight:700;color:${a.nivel === 'critico' ? '#B23B3B' : 'var(--text)'}">${formatCLP(a.monto)}</span>` : ''}
      </div>`).join('')}
    </div>` : ''}
  </div>`;
}

// ══════════════ COCKPIT + CARTERA ══════════════
async function _renderCockpit() {
  const center = document.getElementById('center');
  center.innerHTML = `<div class="view-animate">${_head('')}<div class="card card-pad" style="text-align:center;color:var(--text3)">Cargando…</div></div>`;

  const finanzas = _puedeFinanzas();
  const [proj, fac, team, cli, org, gas, allHoras, acts] = await Promise.all([
    proyectos.getAll().catch(() => []),
    facturas.getAll().catch(() => []),
    profiles.getAll().catch(() => []),
    clientes.getAll().catch(() => []),
    supabase.from('org_settings').select('display_name,tenant_tipo').limit(1).then(r => (r.data && r.data[0]) || null).catch(() => null),
    finanzas ? gastos.getAll().catch(() => []) : Promise.resolve([]),
    horas.getAll().catch(() => []),
    finanzas ? activosLicencias.getAll().catch(() => []) : Promise.resolve([]),
  ]);
  const dg = calcDigest({ proyectos: proj, facturas: fac, gastos: gas, horas: allHoras, activos: acts }, _today());

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
    ${_digestCard(dg)}
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

// ══════════════ COMPRAS (F3): proveedores + OC → gasto → movimiento ══════════════
async function _renderCompras() {
  const center = document.getElementById('center');
  center.innerHTML = `<div class="view-animate">${_head('')}${_tabs('compras')}<div class="card card-pad" style="text-align:center;color:var(--text3)">Cargando…</div></div>`;

  const [provs, ocs, proj] = await Promise.all([
    proveedores.getAll().catch(() => []),
    ordenesCompra.getAll().catch(() => []),
    proyectos.getAll().catch(() => []),
  ]);
  const provName = Object.fromEntries(provs.map(p => [p.id, p.nombre]));
  const projName = Object.fromEntries(proj.map(p => [p.id, p.nombre]));
  const tot = calcOC(_st.ocLineas);

  center.innerHTML = `<div class="view-animate">
    ${_head('')}
    ${_tabs('compras')}

    <div class="section-head"><h2>Órdenes de compra</h2>
      <button class="btn btn-primary btn-sm" onclick="window._erp.toggleOC()">+ Nueva OC</button>
    </div>
    ${_st.ocOpen ? _formOC(provs, proj, tot) : ''}
    <div class="card" style="overflow:hidden">
      ${ocs.length === 0
        ? `<div class="card-pad" style="color:var(--text3);font-size:13.5px">Sin órdenes de compra. Crea un proveedor y luego una OC.</div>`
        : ocs.map(o => `<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border)">
            <div style="width:105px;font-size:12.5px;font-weight:600;color:var(--text)">${escHtml(o.correlativo || '—')}</div>
            <div style="flex:1;min-width:0;font-size:13px;color:var(--text)">${escHtml(provName[o.proveedorId] || 'Sin proveedor')}${o.proyectoId ? ' · ' + escHtml(projName[o.proyectoId] || '') : ''}</div>
            <span class="badge" style="font-size:10.5px">${escHtml(o.estado)}</span>
            <div style="width:115px;text-align:right;font-weight:700;font-size:13px">${formatCLP(o.total)}</div>
            ${o.estado !== 'recepcionada' && o.estado !== 'anulada'
              ? `<button class="btn btn-ghost btn-sm" title="Recepcionar: genera el gasto imputado al proyecto" onclick="window._erp.recepcionarOC('${o.id}')">Recepcionar</button>`
              : `<span style="font-size:11.5px;color:var(--green);width:100px;text-align:center">✓ gasto creado</span>`}
            <button class="btn-icon btn-sm" title="Eliminar" onclick="window._erp.delOC('${o.id}')">${_i('trash', 15)}</button>
          </div>`).join('')}
    </div>

    <div class="section-head" style="margin-top:24px"><h2>Proveedores</h2>
      <button class="btn btn-primary btn-sm" onclick="window._erp.toggleProv()">+ Proveedor</button>
    </div>
    ${_st.provOpen ? _formProveedor() : ''}
    <div class="card" style="overflow:hidden">
      ${provs.length === 0
        ? `<div class="card-pad" style="color:var(--text3);font-size:13.5px">Sin proveedores. Crea el primero para poder emitir órdenes de compra.</div>`
        : provs.map(p => `<div style="display:flex;align-items:center;gap:12px;padding:11px 16px;border-bottom:1px solid var(--border)">
            <div style="width:105px;font-size:12.5px;color:var(--text3)">${escHtml(p.correlativo || '')}</div>
            <div style="flex:1;min-width:0;font-size:13.5px;font-weight:600;color:var(--text)">${escHtml(p.nombre)}</div>
            <div style="font-size:12.5px;color:var(--text3)">${escHtml(p.rut || '')}${p.contacto ? ' · ' + escHtml(p.contacto) : ''}</div>
            <button class="btn-icon btn-sm" title="Eliminar" onclick="window._erp.delProveedor('${p.id}')">${_i('trash', 15)}</button>
          </div>`).join('')}
    </div>
  </div>`;
}

function _formProveedor() {
  return `<div class="card card-pad" style="margin-bottom:12px;border-left:3px solid var(--primary)">
    <div style="display:grid;grid-template-columns:1.5fr 1fr 1fr auto;gap:12px;align-items:end">
      <div class="form-group" style="margin:0"><label>Nombre *</label><input id="erpProvNom" type="text" placeholder="Proveedor SpA"></div>
      <div class="form-group" style="margin:0"><label>RUT</label><input id="erpProvRut" type="text" placeholder="76.123.456-7"></div>
      <div class="form-group" style="margin:0"><label>Contacto</label><input id="erpProvCont" type="text" placeholder="Nombre / email"></div>
      <button class="btn btn-primary btn-sm" onclick="window._erp.crearProveedor()">Guardar</button>
    </div>
  </div>`;
}

function _formOC(provs, proj, tot) {
  return `<div class="card card-pad" style="margin-bottom:12px;border-left:3px solid var(--primary)">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
      <div class="form-group" style="margin:0"><label>Proveedor</label><select id="erpOcProv"><option value="">— Selecciona —</option>${provs.map(p => `<option value="${p.id}">${escHtml(p.nombre)}</option>`).join('')}</select></div>
      <div class="form-group" style="margin:0"><label>Imputar a proyecto</label><select id="erpOcProy"><option value="">— Sin proyecto —</option>${proj.map(p => `<option value="${p.id}">${escHtml(p.nombre)}</option>`).join('')}</select></div>
    </div>
    <div style="border-top:1px solid var(--border);padding-top:12px">
      <div style="font-size:12px;color:var(--text3);margin-bottom:8px;font-weight:600;letter-spacing:.04em;text-transform:uppercase">Líneas</div>
      ${_st.ocLineas.length
        ? _st.ocLineas.map((l, i) => `<div style="display:flex;align-items:center;gap:10px;padding:6px 0;font-size:13px">
            <div style="flex:1;min-width:0">${escHtml(l.descripcion || '—')}</div>
            <div style="width:60px;text-align:right;color:var(--text3)">${l.cantidad} ×</div>
            <div style="width:110px;text-align:right">${formatCLP(l.precioUnit)}</div>
            <div style="width:120px;text-align:right;font-weight:600">${formatCLP((Number(l.cantidad) || 0) * (Number(l.precioUnit) || 0))}</div>
            <button class="btn-icon btn-sm" title="Quitar línea" onclick="window._erp.delLinea(${i})">${_i('trash', 14)}</button>
          </div>`).join('')
        : `<div style="font-size:13px;color:var(--text3);padding:4px 0">Agrega al menos una línea.</div>`}
      <div style="display:grid;grid-template-columns:1fr 90px 140px auto;gap:10px;align-items:end;margin-top:10px">
        <div class="form-group" style="margin:0"><label>Descripción</label><input id="erpLinDesc" type="text" placeholder="Notebook"></div>
        <div class="form-group" style="margin:0"><label>Cant.</label><input id="erpLinCant" type="number" value="1"></div>
        <div class="form-group" style="margin:0"><label>Precio unit.</label><input id="erpLinPrecio" type="number" placeholder="500000"></div>
        <button class="btn btn-ghost btn-sm" onclick="window._erp.addLinea()">+ Línea</button>
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-top:14px;border-top:1px solid var(--border);padding-top:12px">
      <div style="font-size:13px;color:var(--text3)">Neto ${formatCLP(tot.neto)} · IVA ${formatCLP(tot.iva)} · <strong style="color:var(--text)">Total ${formatCLP(tot.total)}</strong></div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-ghost btn-sm" onclick="window._erp.toggleOC()">Cancelar</button>
        <button class="btn btn-primary btn-sm" onclick="window._erp.crearOC()">Crear OC</button>
      </div>
    </div>
  </div>`;
}

// ══════════════ EQUIPO & ACTIVOS (F5) ══════════════
const ERP_ROLES = [['', '— sin acceso ERP —'], ['gerencia', 'Gerencia'], ['finanzas', 'Finanzas'], ['operaciones', 'Operaciones'], ['colaborador', 'Colaborador']];

async function _renderEquipo() {
  const center = document.getElementById('center');
  center.innerHTML = `<div class="view-animate">${_head('')}${_tabs('equipo')}<div class="card card-pad" style="text-align:center;color:var(--text3)">Cargando…</div></div>`;

  const esAdmin = S.profile?.role === 'admin';
  const [team, acts] = await Promise.all([
    profiles.listAll().catch(() => []),
    activosLicencias.getAll().catch(() => []),
  ]);
  const vigentes = acts.filter(a => a.estado === 'activo');
  const totalMensual = vigentes.reduce((s, a) => s + a.costoMensual, 0);

  center.innerHTML = `<div class="view-animate">
    ${_head('')}
    ${_tabs('equipo')}

    <div class="section-head"><h2>Equipo & accesos al ERP</h2><span class="text-muted" style="font-size:13px">${esAdmin ? 'Solo un admin puede cambiar accesos' : 'Solo lectura'}</span></div>
    <div class="card" style="overflow:hidden">
      ${team.length === 0
        ? `<div class="card-pad" style="color:var(--text3);font-size:13.5px">Sin miembros.</div>`
        : team.map(m => `<div style="display:flex;align-items:center;gap:12px;padding:11px 16px;border-bottom:1px solid var(--border)">
            <div style="width:34px;height:34px;border-radius:50%;background:var(--navy);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12.5px;flex-shrink:0">${escHtml((m.nombre || '?')[0].toUpperCase())}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13.5px;font-weight:600;color:var(--text)">${escHtml(m.nombre)}</div>
              <div style="font-size:12px;color:var(--text3)">${escHtml(m.cargo || m.rol || '')}</div>
            </div>
            <div style="width:210px">
              <select ${esAdmin ? `onchange="window._erp.setErpRole('${m.id}', this.value)"` : 'disabled'}>
                ${ERP_ROLES.map(([v, l]) => `<option value="${v}"${(m.erpRole || '') === v ? ' selected' : ''}>${l}</option>`).join('')}
              </select>
            </div>
          </div>`).join('')}
    </div>
    <div style="font-size:12.5px;color:var(--text3);margin:10px 0 26px">Quien tenga un acceso ERP asignado verá la sección «Operación». <strong>Gerencia</strong> y <strong>Finanzas</strong> ven además caja, gastos y compras (lo impone la RLS, no solo la UI).</div>

    <div class="section-head"><h2>Activos & licencias</h2>
      <button class="btn btn-primary btn-sm" onclick="window._erp.toggleAct()">+ Activo</button>
    </div>
    <div class="kpi-grid" style="margin-bottom:12px">
      ${_kpi('Costo mensual', formatCLP(totalMensual), vigentes.length + ' activos vigentes', 'coins', 'var(--violet)', 'var(--violet-l)')}
    </div>
    ${_st.actOpen ? _formActivo() : ''}
    <div class="card" style="overflow:hidden">
      ${acts.length === 0
        ? `<div class="card-pad" style="color:var(--text3);font-size:13.5px">Sin activos. Registra tus SaaS (Supabase, SiteGround, Claude…) para ver el costo mensual y avisos de renovación.</div>`
        : acts.map(a => `<div style="display:flex;align-items:center;gap:12px;padding:11px 16px;border-bottom:1px solid var(--border)">
            <div style="flex:1;min-width:0;font-size:13.5px;font-weight:600;color:var(--text)">${escHtml(a.nombre)}</div>
            <div style="font-size:12.5px;color:var(--text3)">${escHtml(a.tipo || '')}${a.fechaRenovacion ? ' · renueva ' + escHtml((a.fechaRenovacion || '').slice(0, 10)) : ''}</div>
            <div style="width:130px;text-align:right;font-weight:700;font-size:13px">${formatCLP(a.costoMensual)}/mes</div>
            <button class="btn-icon btn-sm" title="Eliminar" onclick="window._erp.delActivo('${a.id}')">${_i('trash', 15)}</button>
          </div>`).join('')}
    </div>
  </div>`;
}

function _formActivo() {
  return `<div class="card card-pad" style="margin-bottom:12px;border-left:3px solid var(--primary)">
    <div style="display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr auto;gap:12px;align-items:end">
      <div class="form-group" style="margin:0"><label>Nombre *</label><input id="erpActNom" type="text" placeholder="Supabase Pro"></div>
      <div class="form-group" style="margin:0"><label>Tipo</label><input id="erpActTipo" type="text" placeholder="SaaS"></div>
      <div class="form-group" style="margin:0"><label>Costo mensual (CLP)</label><input id="erpActCosto" type="number" placeholder="24000"></div>
      <div class="form-group" style="margin:0"><label>Renovación</label><input id="erpActFecha" type="date"></div>
      <button class="btn btn-primary btn-sm" onclick="window._erp.crearActivo()">Guardar</button>
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
            ${g.estado === 'pendiente' ? `<button class="btn btn-ghost btn-sm" title="Registrar el pago: genera un egreso en la caja" onclick="window._erp.pagarGasto('${g.id}')">Pagar</button>` : `<span style="font-size:11.5px;color:var(--green);width:52px;text-align:center">✓ pagado</span>`}
            <button class="btn-icon btn-sm" title="Eliminar" onclick="window._erp.delGasto('${g.id}')">${_i('trash', 15)}</button>
          </div>`).join('')}
    </div>` : ''}
  </div>`;
}

// ══════════════ NÓMINA (F4 · confidencial) ══════════════
async function _renderNomina() {
  const center = document.getElementById('center');
  center.innerHTML = `<div class="view-animate">${_head('')}${_tabs('nomina')}<div class="card card-pad" style="text-align:center;color:var(--text3)">Cargando…</div></div>`;

  const periodo = _st.nomPeriodo || _today().slice(0, 7);
  const [emps, rems, team, proj, allHoras, gas] = await Promise.all([
    empleados.getAll().catch(() => []),
    remuneraciones.byPeriodo(periodo).catch(() => []),
    profiles.listAll().catch(() => []),
    proyectos.getAll().catch(() => []),
    horas.getAll().catch(() => []),
    gastos.getAll().catch(() => []),
  ]);
  _st._rems = rems;

  const costoPorProfile = {};
  emps.forEach(e => { if (e.profileId) costoPorProfile[e.profileId] = costoHora(e); });
  const empName = Object.fromEntries(emps.map(e => [e.id, e.nombre]));
  const hByP = _groupBy(allHoras, 'proyectoId');
  const gByP = _groupBy(gas, 'proyectoId');
  const tot = resumenNomina(rems);
  const editEmp = _st.empEditId ? emps.find(e => e.id === _st.empEditId) : null;
  const editRem = _st.remEditId ? rems.find(r => r.id === _st.remEditId) : null;
  const margenRows = proj.filter(p => p.estado === 'activo')
    .map(p => ({ p, m: calcMargenReal(p, hByP[p.id] || [], gByP[p.id] || [], costoPorProfile) }));

  center.innerHTML = `<div class="view-animate">
    ${_head('')}
    ${_tabs('nomina')}

    <div class="card card-pad" style="border-left:3px solid var(--primary);margin-bottom:20px">
      <div style="font-size:12.5px;color:var(--text3)">La nómina es <strong>confidencial</strong> y vive en un almacén aislado (no alcanzable por internet). El ERP <strong>registra el costo</strong>: la liquidación se calcula fuera y se adjunta como PDF. Cada colaborador ve solo su liquidación.</div>
    </div>

    <div class="section-head"><h2>Equipo · costo-empresa</h2>
      <button class="btn btn-primary btn-sm" onclick="window._erp.toggleEmp()">+ Persona</button>
    </div>
    ${(_st.empOpen || editEmp) ? _formEmpleado(team, editEmp) : ''}
    <div class="card" style="overflow:hidden">
      ${emps.length === 0
        ? `<div class="card-pad" style="color:var(--text3);font-size:13.5px">Sin personas registradas. Agrega al equipo para costear las horas por su costo-empresa real.</div>`
        : emps.map(e => `<div style="display:flex;align-items:center;gap:12px;padding:11px 16px;border-bottom:1px solid var(--border)">
            <div style="flex:1;min-width:0">
              <div style="font-size:13.5px;font-weight:600;color:var(--text)">${escHtml(e.nombre)}${e.activo === false ? ' · inactivo' : ''}</div>
              <div style="font-size:12px;color:var(--text3)">${escHtml(e.cargo || 'Sin cargo')}${e.profileId ? '' : ' · sin usuario CRM'}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:13px;font-weight:700">${formatCLP(e.costoEmpresaBase)}/mes</div>
              <div style="font-size:11px;color:var(--text3)">≈ ${formatCLP(Math.round(costoHora(e)))}/h</div>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="window._erp.editEmp('${e.id}')">Editar</button>
          </div>`).join('')}
    </div>

    <div class="section-head" style="margin-top:24px"><h2>Libro de remuneraciones</h2>
      <input type="month" value="${periodo}" onchange="window._erp.setNomPeriodo(this.value)" style="padding:7px 10px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);font-size:13px">
    </div>
    <div class="kpi-grid" style="margin-bottom:12px">
      ${_kpi('Imponible', formatCLP(tot.imponible), tot.n + ' liquidaciones', 'coins', 'var(--primary)', 'var(--primary-l)')}
      ${_kpi('Líquido pagado', formatCLP(tot.liquido), 'del período', 'coins', 'var(--green)', 'var(--green-l)')}
      ${_kpi('Costo-empresa', formatCLP(tot.costoEmpresa), 'costo total del equipo', 'coins', 'var(--violet)', 'var(--violet-l)')}
    </div>
    <div class="section-head" style="margin-top:2px"><span class="text-muted" style="font-size:13px">Período ${periodo}</span>
      <button class="btn btn-primary btn-sm" onclick="window._erp.toggleRem()">+ Remuneración</button>
    </div>
    ${(_st.remOpen || editRem) ? _formRemuneracion(emps, periodo, editRem) : ''}
    <div class="card" style="overflow:hidden">
      ${rems.length === 0
        ? `<div class="card-pad" style="color:var(--text3);font-size:13.5px">Sin remuneraciones cargadas para ${periodo}.</div>`
        : rems.map(r => `<div style="display:flex;align-items:center;gap:12px;padding:11px 16px;border-bottom:1px solid var(--border)">
            <div style="flex:1;min-width:0;font-size:13.5px;font-weight:600;color:var(--text)">${escHtml(r.empleadoNombre || empName[r.empleadoId] || '—')}</div>
            <div style="width:135px;text-align:right;font-size:12.5px;color:var(--text3)">imp. ${formatCLP(r.imponible)}</div>
            <div style="width:120px;text-align:right;font-weight:700;font-size:13px">${formatCLP(r.liquido)}</div>
            ${r.pdfPath ? `<button class="btn btn-ghost btn-sm" onclick="window._erp.verLiq('${r.id}')">Ver PDF</button>` : `<span style="width:74px;font-size:11.5px;color:var(--text3);text-align:center">sin PDF</span>`}
            <button class="btn btn-ghost btn-sm" onclick="window._erp.editRem('${r.id}')">Editar</button>
            <button class="btn-icon btn-sm" title="Eliminar" onclick="window._erp.delRem('${r.id}')">${_i('trash', 15)}</button>
          </div>`).join('')}
    </div>

    <div class="section-head" style="margin-top:24px"><h2>Margen real por proyecto</h2><span class="text-muted" style="font-size:13px">costo del equipo × horas</span></div>
    <div class="card" style="overflow:hidden">
      ${margenRows.length === 0
        ? `<div class="card-pad" style="color:var(--text3);font-size:13.5px">Sin proyectos activos.</div>`
        : margenRows.map(({ p, m }) => `<div style="display:flex;align-items:center;gap:12px;padding:11px 16px;border-bottom:1px solid var(--border)">
            <div style="flex:1;min-width:0">
              <div style="font-size:13.5px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(p.nombre || '—')}</div>
              <div style="font-size:12px;color:var(--text3)">costo equipo ${formatCLP(m.costoHoras)} + gastos ${formatCLP(m.costoGastos)}${m.flags.includes('horas_sin_costo') ? ` · ⚠ ${m.horasSinCosto} h sin costo` : ''}</div>
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div style="font-size:13px;font-weight:700;color:${m.margen >= 0 ? 'var(--green)' : '#B23B3B'}">${formatCLP(m.margen)}${m.margenPct != null ? ` · ${m.margenPct}%` : ''}</div>
              <div style="font-size:11px;color:var(--text3)">margen real</div>
            </div>
          </div>`).join('')}
    </div>
    <div style="font-size:12px;color:var(--text3);margin:10px 0 26px">El costo-hora es una aproximación (costo-empresa ÷ ${HORAS_MES} h/mes). El margen «real» usa el costo del equipo — distinto del margen referencial del Centro de Mando, que usa la tarifa manual del proyecto.</div>
  </div>`;
}

// Vista mínima para un colaborador: SOLO sus propias liquidaciones (el RPC
// listar_nomina ya filtra por fila propia; la UI no decide nada de seguridad).
async function _renderMiNomina() {
  const center = document.getElementById('center');
  center.innerHTML = `<div class="view-animate">${_head('')}${_tabs('nomina')}<div class="card card-pad" style="text-align:center;color:var(--text3)">Cargando…</div></div>`;
  const rems = await remuneraciones.byPeriodo(null).catch(() => []);
  _st._rems = rems;
  center.innerHTML = `<div class="view-animate">
    ${_head('')}
    ${_tabs('nomina')}
    <div class="section-head"><h2>Mis liquidaciones</h2></div>
    <div class="card" style="overflow:hidden">
      ${rems.length === 0
        ? `<div class="card-pad" style="color:var(--text3);font-size:13.5px">No tienes liquidaciones cargadas todavía.</div>`
        : rems.map(r => `<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border)">
            <div style="flex:1;font-size:13.5px;font-weight:600;color:var(--text)">${escHtml(r.periodo)}</div>
            <div style="width:130px;text-align:right;font-weight:700;font-size:13px">${formatCLP(r.liquido)}</div>
            ${r.pdfPath ? `<button class="btn btn-ghost btn-sm" onclick="window._erp.verLiq('${r.id}')">Ver PDF</button>` : `<span style="width:74px;font-size:11.5px;color:var(--text3);text-align:center">sin PDF</span>`}
          </div>`).join('')}
    </div>
    <div style="font-size:12px;color:var(--text3);margin:10px 0 26px">Solo tú y el área de finanzas pueden ver tu liquidación.</div>
  </div>`;
}

function _formEmpleado(team, e) {
  const v = e || {};
  return `<div class="card card-pad" style="margin-bottom:12px;border-left:3px solid var(--primary)">
    <div style="display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:12px">
      <div class="form-group" style="margin:0"><label>Nombre *</label><input id="nomEmpNom" type="text" value="${escHtml(v.nombre || '')}" placeholder="Nombre y apellido"></div>
      <div class="form-group" style="margin:0"><label>Cargo</label><input id="nomEmpCargo" type="text" value="${escHtml(v.cargo || '')}" placeholder="Consultor / Diseñador…"></div>
      <div class="form-group" style="margin:0"><label>RUT</label><input id="nomEmpRut" type="text" value="${escHtml(v.rut || '')}" placeholder="12.345.678-9"></div>
      <div class="form-group" style="margin:0"><label>Costo-empresa mensual (CLP)</label><input id="nomEmpCosto" type="number" value="${v.costoEmpresaBase || ''}" placeholder="1800000"></div>
      <div class="form-group" style="margin:0"><label>Usuario del CRM (para que vea su liquidación)</label><select id="nomEmpProf"><option value="">— sin vincular —</option>${team.map(m => `<option value="${m.id}"${v.profileId === m.id ? ' selected' : ''}>${escHtml(m.nombre)}${m.activo === false ? ' (inactivo)' : ''}</option>`).join('')}</select></div>
      <div class="form-group" style="margin:0"><label>Cuenta bancaria</label><input id="nomEmpCuenta" type="text" value="${escHtml(v.cuentaBancaria || '')}" placeholder="Banco · N.º de cuenta"></div>
      <div class="form-group" style="margin:0;grid-column:1/-1"><label>Dirección</label><input id="nomEmpDir" type="text" value="${escHtml(v.direccion || '')}" placeholder="Calle 123, comuna"></div>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;align-items:center;margin-top:8px">
      ${e ? `<label style="display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--text3);margin-right:auto"><input id="nomEmpActivo" type="checkbox"${v.activo === false ? '' : ' checked'}> activo</label>` : ''}
      <button class="btn btn-ghost btn-sm" onclick="window._erp.cancelEmp()">Cancelar</button>
      <button class="btn btn-primary btn-sm" onclick="window._erp.guardarEmp()">${e ? 'Guardar cambios' : 'Agregar persona'}</button>
    </div>
  </div>`;
}

function _formRemuneracion(emps, periodo, r) {
  const v = r || {};
  const editing = !!r;
  return `<div class="card card-pad" style="margin-bottom:12px;border-left:3px solid var(--primary)">
    <div style="display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:12px">
      <div class="form-group" style="margin:0"><label>Persona *</label><select id="nomRemEmp"${editing ? ' disabled' : ''}><option value="">— Selecciona —</option>${emps.filter(e => e.activo !== false || e.id === v.empleadoId).map(e => `<option value="${e.id}"${v.empleadoId === e.id ? ' selected' : ''}>${escHtml(e.nombre)}</option>`).join('')}</select></div>
      <div class="form-group" style="margin:0"><label>Período</label><input id="nomRemPer" type="month" value="${v.periodo || periodo}"${editing ? ' disabled' : ''}></div>
      <div class="form-group" style="margin:0"><label>Imponible (CLP)</label><input id="nomRemImp" type="number" value="${v.imponible || ''}" placeholder="1200000"></div>
      <div class="form-group" style="margin:0"><label>Líquido (CLP)</label><input id="nomRemLiq" type="number" value="${v.liquido || ''}" placeholder="950000"></div>
      <div class="form-group" style="margin:0"><label>Costo-empresa (CLP)</label><input id="nomRemCosto" type="number" value="${v.costoEmpresa || ''}" placeholder="1500000"></div>
      <div class="form-group" style="margin:0;grid-column:2/-1"><label>PDF de liquidación${editing && v.pdfPath ? ' (reemplaza el actual)' : ' (opcional)'}</label><input id="nomRemFile" type="file" accept="application/pdf"></div>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
      <button class="btn btn-ghost btn-sm" onclick="window._erp.toggleRem()">Cancelar</button>
      <button class="btn btn-primary btn-sm" onclick="window._erp.guardarRem('${periodo}')">${editing ? 'Guardar cambios' : 'Guardar remuneración'}</button>
    </div>
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
    // ── Compras (F3): proveedores + OC → gasto → movimiento ──
    toggleProv: () => { _st.provOpen = !_st.provOpen; render(); },
    toggleOC:   () => { _st.ocOpen = !_st.ocOpen; if (!_st.ocOpen) _st.ocLineas = []; render(); },
    addLinea: () => {
      const desc   = document.getElementById('erpLinDesc')?.value.trim();
      const cant   = _num(document.getElementById('erpLinCant')?.value);
      const precio = _num(document.getElementById('erpLinPrecio')?.value);
      if (!desc || !(cant > 0) || !(precio > 0)) { toast('Completa descripción, cantidad y precio', 'error'); return; }
      _st.ocLineas.push({ descripcion: desc, cantidad: cant, precioUnit: precio });
      render();
    },
    delLinea: (i) => { _st.ocLineas.splice(i, 1); render(); },
    crearProveedor: async () => {
      const nombre = document.getElementById('erpProvNom')?.value.trim();
      if (!nombre) { toast('El proveedor necesita un nombre', 'error'); return; }
      try {
        await proveedores.add({
          nombre,
          rut:      document.getElementById('erpProvRut')?.value.trim()  || null,
          contacto: document.getElementById('erpProvCont')?.value.trim() || null,
        });
        _st.provOpen = false; toast('Proveedor creado', 'success'); render();
      } catch (err) { console.error(err); toast('No se pudo crear el proveedor', 'error'); }
    },
    delProveedor: async (id) => { try { await proveedores.delete(id); render(); } catch (err) { console.error(err); toast('No se pudo eliminar', 'error'); } },
    crearOC: async () => {
      if (!_st.ocLineas.length) { toast('Agrega al menos una línea', 'error'); return; }
      const t = calcOC(_st.ocLineas);
      try {
        await ordenesCompra.add({
          proveedorId: document.getElementById('erpOcProv')?.value || null,
          proyectoId:  document.getElementById('erpOcProy')?.value || null,
          lineas: _st.ocLineas, neto: t.neto, iva: t.iva, total: t.total,
          estado: 'emitida', fecha: _today(),
        });
        _st.ocLineas = []; _st.ocOpen = false;
        toast('Orden de compra creada', 'success'); render();
      } catch (err) { console.error(err); toast('No se pudo crear la OC', 'error'); }
    },
    delOC: async (id) => { try { await ordenesCompra.delete(id); render(); } catch (err) { console.error(err); toast('No se pudo eliminar', 'error'); } },
    recepcionarOC: async (id) => {
      try {
        const oc = await ordenesCompra.get(id);
        if (!oc) { toast('OC no encontrada', 'error'); return; }
        let provNombre = null;
        if (oc.proveedorId) { const p = await proveedores.get(oc.proveedorId).catch(() => null); provNombre = p?.nombre || null; }
        const gastoId = await gastos.add(ocToGasto(oc, provNombre, _today()));
        await ordenesCompra.update({ id, estado: 'recepcionada', gastoId });
        toast('OC recepcionada — gasto creado', 'success'); render();
      } catch (err) { console.error(err); toast('No se pudo recepcionar la OC', 'error'); }
    },
    // ── Equipo & Activos (F5) ──
    setErpRole: async (id, val) => {
      try { await profiles.update({ id, erpRole: val || null }); toast('Acceso ERP actualizado', 'success'); render(); }
      catch (err) { console.error(err); toast('No se pudo cambiar el acceso (solo admin)', 'error'); }
    },
    toggleAct: () => { _st.actOpen = !_st.actOpen; render(); },
    crearActivo: async () => {
      const nombre = document.getElementById('erpActNom')?.value.trim();
      if (!nombre) { toast('El activo necesita un nombre', 'error'); return; }
      try {
        await activosLicencias.add({
          nombre,
          tipo:            document.getElementById('erpActTipo')?.value.trim() || null,
          costoMensual:    _num(document.getElementById('erpActCosto')?.value) || 0,
          fechaRenovacion: document.getElementById('erpActFecha')?.value || null,
        });
        _st.actOpen = false; toast('Activo registrado', 'success'); render();
      } catch (err) { console.error(err); toast('No se pudo registrar el activo', 'error'); }
    },
    delActivo: async (id) => { try { await activosLicencias.delete(id); render(); } catch (err) { console.error(err); toast('No se pudo eliminar', 'error'); } },
    pagarGasto: async (id) => {
      try {
        const g = await gastos.get(id);
        if (!g) { toast('Gasto no encontrado', 'error'); return; }
        await movimientos.add(gastoToMovimiento(g, _today()));
        await gastos.update({ id, estado: 'pagado' });
        toast('Pago registrado — egreso en la caja', 'success'); render();
      } catch (err) { console.error(err); toast('No se pudo registrar el pago', 'error'); }
    },
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
    // ── Nómina (F4) ──
    toggleEmp:    () => { _st.empOpen = !_st.empOpen; _st.empEditId = null; render(); },
    editEmp:      (id) => { _st.empEditId = id; _st.empOpen = false; render(); },
    cancelEmp:    () => { _st.empOpen = false; _st.empEditId = null; render(); },
    setNomPeriodo: (v) => { _st.nomPeriodo = v || null; render(); },
    toggleRem:    () => { _st.remOpen = !_st.remOpen; _st.remEditId = null; render(); },
    editRem:      (id) => { _st.remEditId = id; _st.remOpen = true; render(); },
    guardarEmp: async () => {
      const nombre = document.getElementById('nomEmpNom')?.value.trim();
      if (!nombre) { toast('Ponle el nombre a la persona', 'error'); return; }
      const chk = document.getElementById('nomEmpActivo');
      try {
        await empleados.save({
          id:               _st.empEditId || null,
          nombre,
          cargo:            document.getElementById('nomEmpCargo')?.value.trim()  || null,
          rut:              document.getElementById('nomEmpRut')?.value.trim()    || null,
          costoEmpresaBase: _num(document.getElementById('nomEmpCosto')?.value),
          profileId:        document.getElementById('nomEmpProf')?.value          || null,
          cuentaBancaria:   document.getElementById('nomEmpCuenta')?.value.trim() || null,
          direccion:        document.getElementById('nomEmpDir')?.value.trim()    || null,
          activo:           chk ? chk.checked : true,
        });
        _st.empOpen = false; _st.empEditId = null;
        toast('Persona guardada', 'success'); render();
      } catch (err) { console.error(err); toast('No se pudo guardar (¿tienes acceso a nómina?)', 'error'); }
    },
    guardarRem: async (periodo) => {
      const editId = _st.remEditId || null;
      const prev = editId ? (_st._rems || []).find(x => x.id === editId) : null;
      const empId = editId ? prev?.empleadoId : document.getElementById('nomRemEmp')?.value;
      if (!empId) { toast('Elige a la persona', 'error'); return; }
      const per = editId ? prev?.periodo : (document.getElementById('nomRemPer')?.value || periodo);
      let uploadedPath = null;
      try {
        const file = document.getElementById('nomRemFile')?.files?.[0];
        if (file) {
          const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
          if (!isPdf) { toast('La liquidación debe ser un PDF', 'error'); return; }
          const emps = await empleados.getAll();
          const emp = emps.find(e => e.id === empId);
          uploadedPath = await remuneraciones.uploadPdf(file, emp?.profileId || null);
        }
        try {
          await remuneraciones.save({
            id:           editId,
            empleadoId:   empId,
            periodo:      per,
            imponible:    _num(document.getElementById('nomRemImp')?.value),
            liquido:      _num(document.getElementById('nomRemLiq')?.value),
            costoEmpresa: _num(document.getElementById('nomRemCosto')?.value),
            pdfPath:      uploadedPath,   // sin archivo nuevo → null → el RPC conserva el actual
          });
        } catch (saveErr) {
          if (uploadedPath) await remuneraciones.removePdf(uploadedPath);   // revertir la subida
          throw saveErr;
        }
        if (editId && uploadedPath && prev?.pdfPath && prev.pdfPath !== uploadedPath) {
          await remuneraciones.removePdf(prev.pdfPath);   // reemplazo: limpiar el PDF anterior
        }
        _st.remOpen = false; _st.remEditId = null;
        toast('Remuneración guardada', 'success'); render();
      } catch (err) { console.error(err); toast(err?.message || 'No se pudo guardar la remuneración', 'error'); }
    },
    verLiq: async (id) => {
      const r = (_st._rems || []).find(x => x.id === id);
      if (!r?.pdfPath) { toast('Esta remuneración no tiene PDF', 'error'); return; }
      try { const url = await remuneraciones.signedUrl(r.pdfPath); window.open(url, '_blank', 'noopener'); }
      catch (err) { console.error(err); toast('No se pudo abrir la liquidación', 'error'); }
    },
    delRem: async (id) => {
      try {
        const r = (_st._rems || []).find(x => x.id === id);
        await remuneraciones.delete(id);
        if (r?.pdfPath) await remuneraciones.removePdf(r.pdfPath);   // limpiar el PDF (best-effort)
        toast('Remuneración eliminada', 'success'); render();
      } catch (err) { console.error(err); toast('No se pudo eliminar', 'error'); }
    },
  };
}
