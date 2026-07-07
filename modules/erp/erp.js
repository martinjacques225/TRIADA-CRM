// modules/erp/erp.js — ERP · Centro de Mando (F0: panel de agregación)
//
// Vista inicial del ERP Tríada: AGREGA lo que ya existe (proyectos, facturas, equipo,
// clientes) sin tablas nuevas. Los módulos propios del ERP (proyectos/horas/gastos/caja)
// llegan en F1+. Se muestra solo a admin mientras se construye (gate en app.js/renderNav).
import { clientes, facturas, profiles } from '../../js/db.js';
import { supabase } from '../../js/supabase.js';
import { formatCLP, escHtml } from '../../js/utils.js';

const _i = (n, s) => (window.icon ? window.icon(n, '', s) : '');
const _saldo = (f) => Math.max(0, (Number(f.monto) || 0) - (Number(f.pagado) || 0));

export async function render() {
  const center = document.getElementById('center');
  center.innerHTML = `<div class="view-animate"><div class="home-header"><div>
      <div class="home-greeting">Operación · ERP Tríada</div>
      <h1 class="home-title">Centro de Mando</h1>
    </div></div>
    <div class="card card-pad" style="text-align:center;color:var(--text3);font-size:14px">Cargando indicadores…</div>
  </div>`;

  // Repos existentes + lecturas ligeras (proyectos y org_settings aún no tienen repo en db.js).
  // Todo fail-soft: si una lectura falla, el panel igual renderiza.
  const [cli, fac, team, proj, org] = await Promise.all([
    clientes.getAll().catch(() => []),
    facturas.getAll().catch(() => []),
    profiles.getAll().catch(() => []),
    supabase.from('proyectos').select('id,estado').then(r => r.data || []).catch(() => []),
    supabase.from('org_settings').select('display_name,tenant_tipo,plan').limit(1)
      .then(r => (r.data && r.data[0]) || null).catch(() => null),
  ]);

  const proyectosActivos = proj.filter(p => p.estado === 'activo').length;
  const porCobrar = fac.filter(f => f.estado === 'pendiente' || f.estado === 'parcial').reduce((s, f) => s + _saldo(f), 0);
  const vencido   = fac.filter(f => f.estado === 'vencido').reduce((s, f) => s + _saldo(f), 0);
  const equipoAct = team.length;
  const clientesN = cli.length;

  const tenant = org
    ? `<span class="badge" style="margin-left:10px;font-size:11px;color:var(--primary);background:var(--primary-l);border-color:var(--primary)">${escHtml(org.display_name || 'Tríada')} · ${org.tenant_tipo === 'interno' ? 'interno' : 'cliente'}</span>`
    : '';

  center.innerHTML = `<div class="view-animate">
    <div class="home-header">
      <div>
        <div class="home-greeting">Operación · ERP Tríada ${tenant}</div>
        <h1 class="home-title">Centro de Mando</h1>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-top"><span class="kpi-label">Proyectos activos</span><span class="kpi-ic" style="background:var(--primary-l);color:var(--primary)">${_i('checkCirc')}</span></div>
        <div class="kpi-value">${proyectosActivos}</div>
        <div class="kpi-sub">En curso</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-top"><span class="kpi-label">Por cobrar</span><span class="kpi-ic" style="background:var(--amber-l);color:var(--amber)">${_i('coins')}</span></div>
        <div class="kpi-value kpi-value-sm">${formatCLP(porCobrar)}</div>
        <div class="kpi-sub">Pendientes / parciales</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-top"><span class="kpi-label">Vencido</span><span class="kpi-ic" style="background:color-mix(in srgb,#B23B3B 15%,var(--surface));color:#B23B3B">${_i('coins')}</span></div>
        <div class="kpi-value kpi-value-sm" style="color:#B23B3B">${formatCLP(vencido)}</div>
        <div class="kpi-sub">Requiere gestión de cobro</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-top"><span class="kpi-label">Equipo activo</span><span class="kpi-ic" style="background:var(--green-l);color:var(--green)">${_i('users')}</span></div>
        <div class="kpi-value">${equipoAct}</div>
        <div class="kpi-sub">${clientesN} clientes en cartera</div>
      </div>
    </div>

    <div class="card card-pad" style="margin-top:22px;border-left:3px solid var(--primary)">
      <div style="font-weight:700;color:var(--navy);margin-bottom:5px">Vista inicial del ERP · Fase 0</div>
      <div style="font-size:13.5px;color:var(--text3);line-height:1.65">
        Este panel <strong>agrega lo que ya existe</strong> en el CRM, sin tablas nuevas. En las próximas fases llegan los módulos propios del ERP:
        <strong>Proyectos + Horas + Gastos + Rentabilidad</strong> (el “ERP del lunes”), luego <strong>Caja y flujo</strong>, <strong>Compras</strong> y <strong>Equipo</strong>.
        Visible solo para administración mientras se construye.
      </div>
    </div>
  </div>`;
}
