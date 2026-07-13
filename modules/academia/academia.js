// modules/academia/academia.js — Academia · Aspirantes (SOLO LECTURA)
// Lista inscripciones/aspirantes/progreso bajo RLS (supabase/academia_f1.sql):
// un reclutador ve solo sus asignados; admin/gerencia ven la org; el resto, vacío.
// Sin acciones de escritura. El RUT NO se muestra (vive fuera de PostgREST; solo
// por RPC academia_revelar_rut con MFA). F1.5 · vista del piloto.
import { academia, isMissingTable } from '../../js/db.js';
import { escHtml } from '../../js/utils.js';

const ESTADOS = {
  registered: 'Registrado', in_training: 'En formación', theory_complete: 'Teoría lista',
  validation_pending: 'Validación pendiente', corrections_required: 'Correcciones',
  approved: 'Aprobado', not_approved: 'No aprobado', letter_sent: 'Carta enviada', withdrawn: 'Retirado',
};

let _rows = [], _q = '';

export async function render() {
  const center = document.getElementById('center');
  let rows;
  try {
    rows = await academia.inscripciones();
  } catch (err) {
    if (isMissingTable(err)) { center.innerHTML = _notice(); return; }
    console.error('[Academia]', err);
    center.innerHTML = `<div class="view-animate" style="padding:24px">
      <h2 style="font-family:var(--serif,serif)">Academia · Aspirantes</h2>
      <p style="color:var(--text2);margin-top:10px">No se pudieron cargar los aspirantes: ${escHtml(err?.message || String(err))}</p>
    </div>`;
    return;
  }
  _rows = rows || [];

  const kInsc   = _rows.length;
  const kActivo = _rows.filter(r => ['in_training', 'theory_complete', 'validation_pending', 'corrections_required'].includes(r.status)).length;
  const kAprob  = _rows.filter(r => r.status === 'approved' || r.status === 'letter_sent').length;

  center.innerHTML = `<div class="view-animate" style="padding:20px 22px">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
      <h2 style="font-family:var(--serif,serif);font-size:22px;color:var(--text,#14222E)">Academia · Aspirantes</h2>
      <span style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text3,#8a90a3);border:1px solid var(--border,#e4ddcb);border-radius:99px;padding:3px 10px">Solo lectura</span>
    </div>
    <p style="color:var(--text2,#46555f);font-size:13px;margin-bottom:20px">Progreso de formación de tus aspirantes. La visibilidad la controla la seguridad del servidor (ves solo los tuyos).</p>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:22px">
      ${_kpi('Inscripciones', kInsc, 'visibles para ti')}
      ${_kpi('En formación', kActivo, 'cursando')}
      ${_kpi('Aprobados', kAprob, 'egresados / carta')}
    </div>

    <div style="display:flex;margin-bottom:14px">
      <input id="acaSearch" placeholder="Buscar aspirante, comuna, programa…" value="${escHtml(_q)}"
        style="margin-left:auto;max-width:300px;width:100%;font-size:14px;padding:9px 12px;border:1px solid var(--border,#e4ddcb);border-radius:9px;background:var(--surface,#fff);color:var(--text,#14222E)">
    </div>

    <div id="acaList"></div>
  </div>`;

  const s = document.getElementById('acaSearch');
  if (s) s.addEventListener('input', e => { _q = e.target.value; _list(); });
  _list();
}

function _kpi(label, value, sub) {
  return `<div style="background:var(--surface,#fff);border:1px solid var(--border,#e4ddcb);border-radius:12px;padding:14px 16px">
    <div style="font-size:12px;font-weight:600;color:var(--text3,#8a90a3)">${escHtml(label)}</div>
    <div style="font-size:26px;font-weight:700;color:var(--text,#14222E);margin-top:4px">${value}</div>
    <div style="font-size:11px;color:var(--text3,#8a90a3);margin-top:2px">${escHtml(sub)}</div>
  </div>`;
}

function _list() {
  const el = document.getElementById('acaList'); if (!el) return;
  let list = _rows;
  if (_q) {
    const q = _q.toLowerCase();
    list = list.filter(r => [r.aspirante?.full_name, r.aspirante?.personal_email, r.aspirante?.commune,
      r.reclutador?.display_name, r.programa?.name, r.route_code]
      .some(v => (v || '').toLowerCase().includes(q)));
  }
  if (!list.length) {
    el.innerHTML = `<div style="text-align:center;padding:48px 20px;color:var(--text3,#8a90a3)">
      <div style="font-size:32px;margin-bottom:8px">🎓</div>
      <p style="font-weight:600;color:var(--text2,#46555f)">Sin aspirantes</p>
      <p style="font-size:13px;margin-top:4px">No hay inscripciones que coincidan (o aún no tienes ninguna asignada).</p>
    </div>`;
    return;
  }
  el.innerHTML = `<div style="border:1px solid var(--border,#e4ddcb);border-radius:12px;overflow:hidden">
    <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead><tr style="background:var(--surface2,#f4f1e9);text-align:left">
        ${['Código', 'Aspirante', 'Comuna', 'Programa', 'Reclutador', 'Avance', 'Estado'].map(h =>
          `<th style="padding:10px 12px;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--text3,#8a90a3)">${h}</th>`).join('')}
      </tr></thead>
      <tbody>${list.map(_row).join('')}</tbody>
    </table></div>
  </div>`;
}

function _row(r) {
  const a = r.aspirante || {}, prog = r.progreso || [];
  const conAvance = prog.filter(p => (p.max_slide || 0) > 0).length;
  const aprobTeoria = prog.filter(p => p.theory_passed_at).length;
  const cell = 'padding:11px 12px;border-top:1px solid var(--border,#e4ddcb);color:var(--text2,#46555f);vertical-align:top';
  return `<tr>
    <td style="${cell};font-weight:700;font-size:12px;color:var(--text3,#8a90a3);white-space:nowrap">${escHtml(a.codigo || '—')}</td>
    <td style="${cell}"><strong style="color:var(--text,#14222E)">${escHtml(a.full_name || 'Sin nombre')}</strong>
      <div style="font-size:12px;color:var(--text3,#8a90a3)">${escHtml(a.personal_email || '')}</div></td>
    <td style="${cell}">${escHtml(a.commune || '—')}</td>
    <td style="${cell}">${escHtml(r.programa?.name || r.route_code || '— sin asignar')}</td>
    <td style="${cell}">${escHtml(r.reclutador?.display_name || '—')}</td>
    <td style="${cell};white-space:nowrap">${conAvance} con avance · ${aprobTeoria} teoría ✔</td>
    <td style="${cell}"><span style="font-size:11.5px;font-weight:600;border:1px solid var(--border,#e4ddcb);border-radius:99px;padding:2px 9px;white-space:nowrap">${escHtml(ESTADOS[r.status] || r.status || '—')}</span></td>
  </tr>`;
}

function _notice() {
  return `<div class="view-animate" style="text-align:center;padding:56px 20px;color:var(--text3,#8a90a3)">
    <div style="font-size:34px;margin-bottom:10px">🗄️</div>
    <h3 style="color:var(--text2,#46555f)">Academia no inicializada</h3>
    <p style="font-size:13px;margin-top:6px">Corre <code>supabase/academia_f1.sql</code> en el proyecto para crear las tablas <code>academia_*</code>.</p>
  </div>`;
}
