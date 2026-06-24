// ============================================================================
// screens/captura.js — captura rápida de lead (acción heroína de terreno).
// Guarda en `leads` (mismo Supabase). "Guardar y agendar 360" encadena con Nueva cita.
// ============================================================================
import { db, RUBROS, TAMANOS, DOLORES, ORIGENES, escHtml } from '../core.js';
import { ic, toast } from '../ui.js';

const e = escHtml;
let _form = {};

// RUT chileno con dígito verificador (módulo 11). Vacío = válido (es opcional).
function validRut(rut) {
  if (!rut) return true;
  const c = rut.replace(/[.\-\s]/g, '').toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(c)) return false;
  const body = c.slice(0, -1), dv = c.slice(-1);
  let sum = 0, mul = 2;
  for (let i = body.length - 1; i >= 0; i--) { sum += parseInt(body[i], 10) * mul; mul = mul === 7 ? 2 : mul + 1; }
  const r = 11 - (sum % 11);
  return (r === 11 ? '0' : r === 10 ? 'K' : String(r)) === dv;
}

function chipGroup(name, options) {
  return `<div class="chip-wrap" data-group="${name}">${options.map((o) =>
    `<button type="button" class="chip ${_form[name] === o ? 'chip--on' : ''}" data-val="${e(o)}">${e(o)}</button>`).join('')}</div>`;
}

const val = (id) => (document.getElementById(id)?.value || '').trim();

export default {
  chrome: false,
  render() {
    _form = { rubro: '', tamano: '', dolor: '', origen: 'Referido' };
    return `
    <section class="screen" style="display:flex;flex-direction:column">
      <header class="hdr hdr--back" style="padding-top:calc(16px + env(safe-area-inset-top))">
        <button class="icon-btn icon-btn--bare" id="capBack" style="width:38px;height:38px" aria-label="Volver">${ic('back', { size: 22, sw: 1.9 })}</button>
        <div><div class="hdr__title hdr__title--sm">Nuevo lead</div><div class="hdr__sub">Captura rápida · terreno</div></div>
      </header>

      <div class="pad-form" style="flex:1">
        <div class="field"><label class="field__label" for="capNombre">Nombre de contacto</label><input id="capNombre" class="input" placeholder="Ej: María Fuentes"></div>
        <div class="field"><label class="field__label" for="capEmpresa">Empresa</label><input id="capEmpresa" class="input" placeholder="Ej: Panadería San Andrés"></div>
        <div class="row2" style="margin-bottom:14px">
          <div><label class="field__label" for="capTel">Teléfono</label><input id="capTel" class="input" inputmode="tel" placeholder="+56 9 …"></div>
          <div><label class="field__label" for="capEmail">Email</label><input id="capEmail" class="input" inputmode="email" placeholder="correo@…"></div>
        </div>

        <label class="field__label">Rubro</label>${chipGroup('rubro', RUBROS)}
        <label class="field__label" style="margin-top:16px">Tamaño</label>${chipGroup('tamano', TAMANOS)}
        <label class="field__label" style="margin-top:16px">Dolor principal</label>${chipGroup('dolor', DOLORES)}
        <label class="field__label" style="margin-top:16px">Origen</label>${chipGroup('origen', ORIGENES)}

        <label class="field__label field__label--opt" for="capRut" style="margin-top:16px">RUT <span>· opcional</span></label>
        <input id="capRut" class="input" placeholder="76.543.210-K">
        <div class="field__hint">Se valida con dígito verificador (módulo 11).</div>

        <label class="field__label" for="capNotas" style="margin-top:16px">Notas</label>
        <textarea id="capNotas" class="textarea" rows="3" placeholder="Contexto de la reunión, próximos pasos…"></textarea>
      </div>

      <div class="action-bar">
        <button class="btn btn--primary btn--block" id="capSave">Guardar</button>
        <button class="btn btn--ghost" id="capSaveAgendar" style="height:48px;border:1.5px solid var(--navy);color:var(--navy);background:transparent">${ic('calendar', { size: 18, sw: 1.9 })} Guardar y agendar 360</button>
      </div>
    </section>`;
  },

  mount(app) {
    const host = document.getElementById('screen');
    host.querySelector('#capBack').addEventListener('click', () => app.back());

    host.querySelectorAll('[data-group]').forEach((g) => g.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-val]'); if (!b) return;
      const name = g.getAttribute('data-group'), v = b.getAttribute('data-val');
      _form[name] = _form[name] === v ? '' : v;
      g.querySelectorAll('.chip').forEach((c) => c.classList.toggle('chip--on', c.getAttribute('data-val') === _form[name]));
    }));

    const save = async (agendar) => {
      const nombre = val('capNombre');
      if (!nombre) { toast('El nombre es obligatorio', 'err'); return; }
      const rut = val('capRut');
      if (!validRut(rut)) { toast('RUT inválido (revisa el dígito verificador)', 'err'); return; }
      const btn = host.querySelector(agendar ? '#capSaveAgendar' : '#capSave');
      btn.disabled = true;
      try {
        const id = await db.prospectos.add({
          nombre, empresa: val('capEmpresa'), telefono: val('capTel'), email: val('capEmail'),
          rubro: _form.rubro, tamano: _form.tamano, dolorPrincipal: _form.dolor,
          origen: _form.origen || 'Referido', rut, notas: val('capNotas'), estado: 'Nuevo',
        });
        toast('Lead creado ✓', 'ok');
        if (agendar) app.navigate('cita', { leadId: id, tipo: 'diagnostico' });
        else app.navigate('leads');
      } catch (err) { console.error(err); toast('No se pudo guardar el lead', 'err'); btn.disabled = false; }
    };
    host.querySelector('#capSave').addEventListener('click', () => save(false));
    host.querySelector('#capSaveAgendar').addEventListener('click', () => save(true));
  },
};
