// ============================================================================
// screens/editar.js — corregir los datos de un lead ya creado.
// Mismo formulario que la captura (mismos campos, mismos chips, mismo formateo)
// pero precargado. En terreno el dato entra rápido y sale mal: un teléfono con
// un dígito de menos, la empresa mal escuchada, el rubro que se eligió apurado.
// Hasta acá eso obligaba a volver al computador.
//
// Dos reglas que NO se tocan desde esta pantalla:
//   · La ETAPA es del embudo, se cambia en la ficha ("Cambiar etapa"). Por eso el
//     guardado no manda `estado`: el mapper deja la columna intacta.
//   · `origenDetalle` (atribución del Experience Center) lo escribe solo el RPC
//     de la landing; leadToSupa nunca lo manda.
// ============================================================================
import { db, RUBROS, TAMANOS, DOLORES, ORIGENES, escHtml,
         attachFormatting, normalizeText, normalizeEmail, formatRut, validateRut, formatPhoneCL } from '../core.js';
import { ic, toast } from '../ui.js';

const e = escHtml;
let _lead = null;
let _form = {};

function chipGroup(name, options) {
  return `<div class="chip-wrap" data-group="${name}">${options.map((o) =>
    `<button type="button" class="chip ${_form[name] === o ? 'chip--on' : ''}" data-val="${e(o)}">${e(o)}</button>`).join('')}</div>`;
}

const val = (id) => (document.getElementById(id)?.value || '').trim();

export default {
  chrome: false,
  async render(app) {
    _lead = await db.prospectos.get(app.params.leadId);
    if (!_lead) {
      return `<section class="screen"><div class="pad"><div class="card" style="margin-top:60px;text-align:center;padding:30px"><div class="empty__t">Prospecto no encontrado</div><button class="btn btn--ghost btn--sm" id="edBack" style="margin-top:12px">Volver</button></div></div></section>`;
    }
    const l = _lead;
    // El origen del lead puede venir de la landing con una etiqueta que no está
    // en el catálogo de chips: en ese caso no se preselecciona nada y, al no
    // tocarlo, el guardado tampoco lo manda (queda como estaba).
    _form = {
      rubro: RUBROS.includes(l.rubro) ? l.rubro : '',
      tamano: TAMANOS.includes(l.tamano) ? l.tamano : '',
      dolor: DOLORES.includes(l.dolorPrincipal) ? l.dolorPrincipal : '',
      origen: ORIGENES.includes(l.origen) ? l.origen : '',
    };

    return `
    <section class="screen" style="display:flex;flex-direction:column">
      <header class="hdr hdr--back" style="padding-top:calc(16px + env(safe-area-inset-top))">
        <button class="icon-btn icon-btn--bare" id="edBack" style="width:38px;height:38px" aria-label="Volver">${ic('back', { size: 22, sw: 1.9 })}</button>
        <div><div class="hdr__title hdr__title--sm">Editar lead</div><div class="hdr__sub">${e(l.correlativo || l.nombre || '')}</div></div>
      </header>

      <div class="pad-form" style="flex:1">
        <div class="field"><label class="field__label" for="edNombre">Nombre de contacto</label><input id="edNombre" class="input" data-fmt="upper" autocapitalize="characters" placeholder="EJ: MARÍA FUENTES" value="${e(l.nombre || '')}"></div>
        <div class="field"><label class="field__label" for="edEmpresa">Empresa</label><input id="edEmpresa" class="input" data-fmt="upper" autocapitalize="characters" placeholder="EJ: PANADERÍA SAN ANDRÉS" value="${e(l.empresa || '')}"></div>
        <div class="row2" style="margin-bottom:14px">
          <div><label class="field__label" for="edTel">Teléfono</label><input id="edTel" class="input" type="tel" data-fmt="phone" placeholder="+56912345678" value="${e(l.telefono || '')}"></div>
          <div><label class="field__label" for="edEmail">Email</label><input id="edEmail" class="input" type="email" data-fmt="email" autocapitalize="off" autocorrect="off" placeholder="correo@…" value="${e(l.email || '')}"></div>
        </div>

        <div class="row2" style="margin-bottom:6px">
          <div style="flex:1.5"><label class="field__label" for="edDireccion">Dirección</label><input id="edDireccion" class="input" data-fmt="upper" autocapitalize="characters" placeholder="AV. SAN MIGUEL 1234" value="${e(l.direccion || '')}"></div>
          <div><label class="field__label" for="edComuna">Comuna</label><input id="edComuna" class="input" data-fmt="upper" autocapitalize="characters" placeholder="MOLINA" value="${e(l.comuna || '')}"></div>
        </div>
        <div class="field__hint" style="margin-bottom:16px">Con esto la ficha te abre la ruta en Google Maps o Waze — y sabes cómo volver.</div>

        <label class="field__label">Rubro</label>${chipGroup('rubro', RUBROS)}
        <label class="field__label" style="margin-top:16px">Tamaño</label>${chipGroup('tamano', TAMANOS)}
        <label class="field__label" style="margin-top:16px">Dolor principal</label>${chipGroup('dolor', DOLORES)}
        <label class="field__label" style="margin-top:16px">Origen</label>${chipGroup('origen', ORIGENES)}

        <label class="field__label field__label--opt" for="edRut" style="margin-top:16px">RUT <span>· opcional</span></label>
        <input id="edRut" class="input" data-fmt="rut" autocapitalize="characters" autocorrect="off" placeholder="12.345.678-5" value="${e(l.rut || '')}">
        <div class="field__hint">Se ordena solo (12.345.678-9). Si el dígito verificador no calza te avisa, pero igual guarda.</div>

        <label class="field__label" for="edNotas" style="margin-top:16px">Notas</label>
        <textarea id="edNotas" class="textarea" rows="3" data-fmt="upper" autocapitalize="characters" placeholder="CONTEXTO DE LA REUNIÓN, PRÓXIMOS PASOS…">${e(l.notas || '')}</textarea>

        <div class="field__hint" style="margin-top:14px">La etapa (${e(l.estado || '—')}) se cambia desde la ficha, con el botón del embudo.</div>
      </div>

      <div class="action-bar">
        <button class="btn btn--primary btn--block" id="edSave">Guardar cambios</button>
      </div>
    </section>`;
  },

  mount(app) {
    const host = document.getElementById('screen');
    host.querySelector('#edBack')?.addEventListener('click', () => app.back());
    if (!_lead) return;

    // Mismo cableado que la captura y que el escritorio: MAYÚSCULAS en vivo,
    // RUT 12.345.678-9, teléfono +56912345678 y teclado numérico al tocarlo.
    attachFormatting(host);

    host.querySelectorAll('[data-group]').forEach((g) => g.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-val]'); if (!b) return;
      const name = g.getAttribute('data-group'), v = b.getAttribute('data-val');
      _form[name] = _form[name] === v ? '' : v;
      g.querySelectorAll('.chip').forEach((c) => c.classList.toggle('chip--on', c.getAttribute('data-val') === _form[name]));
    }));

    host.querySelector('#edSave').addEventListener('click', async () => {
      const nombre = normalizeText(val('edNombre'));
      if (!nombre) { toast('El nombre es obligatorio', 'err'); return; }
      // Igual que en la captura: el RUT se guarda canónico venga como venga y
      // NUNCA bloquea — perder la corrección por un dígito verificador que no
      // calza es peor que el typo.
      const rut = formatRut(val('edRut'));
      const rutDudoso = !!rut && !validateRut(rut);
      const btn = host.querySelector('#edSave');
      btn.disabled = true;
      try {
        // Vaciar un campo debe BORRAR el dato: '' → null (no cadena vacía en la
        // fila). `estado` no se manda: lo maneja "Cambiar etapa" en la ficha.
        const cambios = {
          id: _lead.id,
          nombre,
          empresa: normalizeText(val('edEmpresa')) || null,
          telefono: formatPhoneCL(val('edTel')) || null,
          email: normalizeEmail(val('edEmail')) || null,
          direccion: normalizeText(val('edDireccion')) || null,
          comuna: normalizeText(val('edComuna')) || null,
          rubro: _form.rubro || null,
          tamano: _form.tamano || null,
          dolorPrincipal: _form.dolor || null,
          rut: rut || null,
          notas: normalizeText(val('edNotas')) || null,
        };
        // `origen` es un enum en la base y admite valores que el catálogo de
        // chips no tiene (p. ej. 'Red social', de una carga vieja). Si no hay
        // chip elegido la clave NO se agrega — ni siquiera como undefined: el
        // mock del preview hace `{...fila, ...cambios}` y una clave presente en
        // undefined borra el dato igual. Ausente es ausente en los dos caminos.
        if (_form.origen) cambios.origen = _form.origen;
        await db.prospectos.update(cambios);
        toast(rutDudoso ? 'Cambios guardados ✓ — revisa el RUT: el DV no calza' : 'Cambios guardados ✓', rutDudoso ? 'info' : 'ok', rutDudoso ? 5000 : 3000);
        app.back();
      } catch (err) {
        console.error(err); toast('No se pudieron guardar los cambios', 'err'); btn.disabled = false;
      }
    });
  },
};
