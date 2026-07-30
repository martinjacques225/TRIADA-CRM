// ============================================================================
// screens/captura.js — captura rápida de lead (acción heroína de terreno).
// Guarda en `leads` (mismo Supabase). "Guardar y agendar 360" encadena con Nueva cita.
// ============================================================================
import { db, RUBROS, TAMANOS, DOLORES, ORIGENES, escHtml,
         attachFormatting, normalizeText, normalizeEmail, formatRut, validateRut, formatPhoneCL } from '../core.js';
import { ic, toast } from '../ui.js';

const e = escHtml;
let _form = {};

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
        <div class="field"><label class="field__label" for="capNombre">Nombre de contacto</label><input id="capNombre" class="input" data-fmt="upper" autocapitalize="characters" placeholder="EJ: MARÍA FUENTES"></div>
        <div class="field"><label class="field__label" for="capEmpresa">Empresa</label><input id="capEmpresa" class="input" data-fmt="upper" autocapitalize="characters" placeholder="EJ: PANADERÍA SAN ANDRÉS"></div>
        <div class="row2" style="margin-bottom:14px">
          <div><label class="field__label" for="capTel">Teléfono</label><input id="capTel" class="input" type="tel" data-fmt="phone" placeholder="+56912345678"></div>
          <div><label class="field__label" for="capEmail">Email</label><input id="capEmail" class="input" type="email" data-fmt="email" autocapitalize="off" autocorrect="off" placeholder="correo@…"></div>
        </div>

        <div class="row2" style="margin-bottom:6px">
          <div style="flex:1.5"><label class="field__label" for="capDireccion">Dirección</label><input id="capDireccion" class="input" data-fmt="upper" autocapitalize="characters" placeholder="AV. SAN MIGUEL 1234"></div>
          <div><label class="field__label" for="capComuna">Comuna</label><input id="capComuna" class="input" data-fmt="upper" autocapitalize="characters" placeholder="MOLINA"></div>
        </div>
        <div class="field__hint" style="margin-bottom:16px">Con esto la ficha te abre la ruta en Google Maps o Waze — y sabes cómo volver.</div>

        <label class="field__label">Rubro</label>${chipGroup('rubro', RUBROS)}
        <label class="field__label" style="margin-top:16px">Tamaño</label>${chipGroup('tamano', TAMANOS)}
        <label class="field__label" style="margin-top:16px">Dolor principal</label>${chipGroup('dolor', DOLORES)}
        <label class="field__label" style="margin-top:16px">Origen</label>${chipGroup('origen', ORIGENES)}

        <label class="field__label field__label--opt" for="capRut" style="margin-top:16px">RUT <span>· opcional</span></label>
        <input id="capRut" class="input" data-fmt="rut" autocapitalize="characters" autocorrect="off" placeholder="12.345.678-5">
        <div class="field__hint">Se ordena solo (12.345.678-9). Si el dígito verificador no calza te avisa, pero igual guarda.</div>

        <label class="field__label" for="capNotas" style="margin-top:16px">Notas</label>
        <textarea id="capNotas" class="textarea" rows="3" data-fmt="upper" autocapitalize="characters" placeholder="CONTEXTO DE LA REUNIÓN, PRÓXIMOS PASOS…"></textarea>
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

    // Mismo cableado que el escritorio: MAYÚSCULAS en vivo, RUT 12.345.678-9,
    // teléfono +56912345678 y teclado numérico (inputmode="tel") al tocarlo.
    attachFormatting(host);

    host.querySelectorAll('[data-group]').forEach((g) => g.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-val]'); if (!b) return;
      const name = g.getAttribute('data-group'), v = b.getAttribute('data-val');
      _form[name] = _form[name] === v ? '' : v;
      g.querySelectorAll('.chip').forEach((c) => c.classList.toggle('chip--on', c.getAttribute('data-val') === _form[name]));
    }));

    const save = async (agendar) => {
      const nombre = normalizeText(val('capNombre'));
      if (!nombre) { toast('El nombre es obligatorio', 'err'); return; }
      // El RUT se guarda canónico venga como venga y NUNCA bloquea: en terreno,
      // perder el lead por un dígito verificador que no calza es peor que el typo.
      const rut = formatRut(val('capRut'));
      const rutDudoso = !!rut && !validateRut(rut);
      const btn = host.querySelector(agendar ? '#capSaveAgendar' : '#capSave');
      btn.disabled = true;
      try {
        const id = await db.prospectos.add({
          nombre, empresa: normalizeText(val('capEmpresa')),
          telefono: formatPhoneCL(val('capTel')), email: normalizeEmail(val('capEmail')),
          // Vacío → undefined (leadToSupa lo descarta): no se manda la columna si
          // el vendedor no cargó dirección, y la fila no queda con cadenas vacías.
          direccion: normalizeText(val('capDireccion')) || undefined,
          comuna: normalizeText(val('capComuna')) || undefined,
          rubro: _form.rubro, tamano: _form.tamano, dolorPrincipal: _form.dolor,
          origen: _form.origen || 'Referido', rut, notas: normalizeText(val('capNotas')), estado: 'Nuevo',
        });
        toast(rutDudoso ? 'Lead creado ✓ — revisa el RUT: el DV no calza' : 'Lead creado ✓', rutDudoso ? 'info' : 'ok', rutDudoso ? 5000 : 3000);
        if (agendar) app.navigate('cita', { leadId: id, tipo: 'diagnostico' });
        else app.navigate('leads');
      } catch (err) { console.error(err); toast('No se pudo guardar el lead', 'err'); btn.disabled = false; }
    };
    host.querySelector('#capSave').addEventListener('click', () => save(false));
    host.querySelector('#capSaveAgendar').addEventListener('click', () => save(true));
  },
};
