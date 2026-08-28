// js/logo-picker.js — La caja que pide el logo del cliente.
//
// Se monta en la ficha del cliente y en los editores de propuesta y presupuesto.
// Cuando no hay logo muestra un placeholder que lo pide; cuando lo hay, la
// miniatura y el botón para quitarlo. Lo guarda en `doc_logos` (una fila por
// lead o por cliente) y de ahí lo toma js/pdf.js para la cabecera del documento.
//
// POR QUÉ REDIMENSIONA ANTES DE GUARDAR: el logo viaja como data URI dentro del
// HTML del documento (ver el encabezado de supabase/doc_logos_2026-08-28.sql).
// Un PNG de cámara de 4 MB serían ~5,3 MB de base64 en CADA cotización. Acá se
// reduce a 600×200 máx., que a 300 dpi sigue sobrando para los ~31 px de alto a
// los que se imprime, y deja el archivo en decenas de KB.
import { docLogos } from './db.js';
import { toast, escHtml } from './utils.js';

const MAX_W = 600;          // px — tope del lado largo
const MAX_H = 200;          // px — tope del alto
const MAX_ARCHIVO = 8 * 1024 * 1024;   // 8 MB de archivo crudo
const MAX_DATA_URI = 700000;           // debe coincidir con el check de la tabla
const TIPOS = ['image/png', 'image/jpeg'];

const _kb = (n) => n >= 1024 * 1024 ? (n / 1024 / 1024).toFixed(1) + ' MB' : Math.round(n / 1024) + ' KB';

// ── Estilos, una sola vez ─────────────────────────────────────
function _css() {
  if (document.getElementById('logoPickerCss')) return;
  const s = document.createElement('style');
  s.id = 'logoPickerCss';
  s.textContent = `
    .lgp{border:1px dashed var(--border);border-radius:10px;padding:14px;background:var(--surface2);
      display:flex;align-items:center;gap:14px}
    .lgp.has{border-style:solid;background:var(--surface)}
    .lgp.drag{border-color:var(--primary);background:var(--primary-l)}
    .lgp-ph{width:96px;height:52px;border-radius:7px;background:var(--surface3);flex:0 0 auto;
      display:flex;align-items:center;justify-content:center;color:var(--text3);font-size:20px}
    .lgp-prev{width:96px;height:52px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;
      background:#fff;border:1px solid var(--border);border-radius:7px;padding:5px}
    .lgp-prev img{max-width:100%;max-height:100%;object-fit:contain;display:block}
    .lgp-txt{flex:1;min-width:0}
    .lgp-t{font-size:13px;font-weight:600;color:var(--text);margin-bottom:2px}
    .lgp-s{font-size:11.5px;color:var(--text3);line-height:1.45}
    .lgp-acc{display:flex;gap:6px;flex-shrink:0}
    .lgp input[type=file]{display:none}`;
  document.head.appendChild(s);
}

// ── Lectura + redimensión ─────────────────────────────────────
// Devuelve { mime, dataUri, bytes, nombre } o lanza con un mensaje legible.
export function leerLogo(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No se seleccionó ningún archivo'));
    if (!TIPOS.includes(file.type)) return reject(new Error('El logo debe ser PNG o JPG'));
    if (file.size > MAX_ARCHIVO) return reject(new Error(`El archivo pesa ${_kb(file.size)}; el máximo son 8 MB`));

    const fr = new FileReader();
    fr.onerror = () => reject(new Error('No se pudo leer el archivo'));
    fr.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('El archivo no es una imagen válida'));
      img.onload = () => {
        try {
          const esc = Math.min(1, MAX_W / img.width, MAX_H / img.height);
          const w = Math.max(1, Math.round(img.width  * esc));
          const h = Math.max(1, Math.round(img.height * esc));
          const cv = document.createElement('canvas');
          cv.width = w; cv.height = h;
          const cx = cv.getContext('2d');
          // El JPG no tiene canal alfa: sin fondo blanco, lo transparente sale
          // negro. El PNG se deja tal cual para conservar la transparencia.
          if (file.type === 'image/jpeg') { cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h); }
          cx.imageSmoothingQuality = 'high';
          cx.drawImage(img, 0, 0, w, h);
          const mime = file.type;
          const dataUri = mime === 'image/jpeg' ? cv.toDataURL(mime, 0.9) : cv.toDataURL(mime);
          if (dataUri.length > MAX_DATA_URI) {
            return reject(new Error('El logo sigue siendo demasiado pesado. Prueba con una versión más simple o en PNG.'));
          }
          resolve({ mime, dataUri, bytes: Math.round(dataUri.length * 0.75), nombre: file.name });
        } catch (e) { reject(new Error('No se pudo procesar la imagen')); }
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}

// ── El componente ─────────────────────────────────────────────
// container : elemento donde montarlo
// ref       : { leadId } o { clienteId } — a quién pertenece el logo
// opts.onChange(logo|null) : se llama tras guardar o quitar
// opts.diferido            : true para el alta de una ficha que TODAVÍA no tiene
//                            id. El archivo se procesa y se previsualiza, pero no
//                            se escribe hasta que el llamador ejecute flush(ref)
//                            con el id recién creado.
//
// Si `ref` no trae entidad y no es diferido (p. ej. una propuesta sin prospecto
// elegido), el selector se muestra deshabilitado explicando qué falta, en vez de
// aceptar un archivo que no tendría dónde guardarse.
export function mountLogoPicker(container, ref, opts = {}) {
  if (!container) return null;
  _css();
  const { onChange, diferido = false } = opts;
  let actual = null;
  let pendiente = false;   // hay imagen elegida que aún no se escribió

  const entidad = () => (ref?.clienteId || ref?.leadId) || null;
  const bloqueado = () => !diferido && !entidad();

  function pintar() {
    const hay = !!actual;
    const sinEntidad = bloqueado();
    container.innerHTML = `
      <div class="lgp${hay ? ' has' : ''}">
        ${hay
          ? `<div class="lgp-prev"><img src="${actual.dataUri}" alt="Logo del cliente"></div>`
          : `<div class="lgp-ph">${sinEntidad ? '·' : '+'}</div>`}
        <div class="lgp-txt">
          <div class="lgp-t">Logo del cliente</div>
          <div class="lgp-s">${
            sinEntidad
              ? (opts.mensajeSinEntidad || 'Elige primero el cliente para poder cargar su logo.')
              : hay
                ? `${escHtml(actual.nombre || 'Imagen cargada')} · ${_kb(actual.bytes || 0)} · sale en la cabecera de los documentos`
                : 'Arrastra el archivo aquí o búscalo. PNG o JPG. Se usa en la cabecera de las cotizaciones, presupuestos e informes.'
          }</div>
        </div>
        <div class="lgp-acc">
          <button type="button" class="btn btn-ghost btn-sm" data-lgp-pick ${sinEntidad ? 'disabled style="opacity:.45"' : ''}>${hay ? 'Cambiar' : 'Subir logo'}</button>
          ${hay ? `<button type="button" class="btn btn-ghost btn-sm" data-lgp-del style="color:var(--danger)">Quitar</button>` : ''}
        </div>
        <input type="file" accept="image/png,image/jpeg" data-lgp-file>
      </div>`;

    const caja = container.querySelector('.lgp');
    const file = container.querySelector('[data-lgp-file]');
    container.querySelector('[data-lgp-pick]')?.addEventListener('click', () => file.click());
    file.addEventListener('change', e => { if (e.target.files?.[0]) guardar(e.target.files[0]); e.target.value = ''; });
    container.querySelector('[data-lgp-del]')?.addEventListener('click', quitar);

    if (!sinEntidad) {
      ['dragenter', 'dragover'].forEach(ev => caja.addEventListener(ev, e => {
        e.preventDefault(); caja.classList.add('drag');
      }));
      ['dragleave', 'drop'].forEach(ev => caja.addEventListener(ev, e => {
        e.preventDefault(); caja.classList.remove('drag');
      }));
      caja.addEventListener('drop', e => {
        const f = e.dataTransfer?.files?.[0];
        if (f) guardar(f);
      });
    }
  }

  async function guardar(file) {
    if (bloqueado()) { toast('Elige primero el cliente', 'error'); return; }
    let logo;
    try { logo = await leerLogo(file); }
    catch (err) { toast(err.message, 'error', 5000); return; }
    // Modo diferido: la ficha aún no existe, así que no hay a quién asociarlo.
    // Se muestra y se guarda cuando el llamador tenga el id (flush).
    if (diferido && !entidad()) {
      actual = logo; pendiente = true; pintar(); onChange?.(actual);
      return;
    }
    try {
      await docLogos.set(ref, logo);
      actual = logo;
      pintar();
      toast('Logo guardado', 'success');
      onChange?.(actual);
    } catch (err) {
      console.error('No se pudo guardar el logo:', err);
      // El caso más probable la primera vez: la migración doc_logos sin correr.
      toast(err?.message?.includes('doc_logos')
        ? 'Falta correr la migración doc_logos en Supabase'
        : (err?.message || 'No se pudo guardar el logo'), 'error', 6000);
    }
  }

  async function quitar() {
    if (!confirm('¿Quitar el logo de este cliente? Los documentos volverán a salir solo con la marca Tríada.')) return;
    if (pendiente && !entidad()) { actual = null; pendiente = false; pintar(); onChange?.(null); return; }
    try {
      await docLogos.remove(ref);
      actual = null;
      pintar();
      onChange?.(null);
    } catch (err) {
      console.error('No se pudo quitar el logo:', err);
      toast('No se pudo quitar el logo', 'error');
    }
  }

  // Carga inicial: pinta el placeholder de inmediato y rellena cuando llega.
  pintar();
  if (entidad()) {
    docLogos.get(ref).then(l => { actual = l; pintar(); }).catch(() => {});
  }

  return {
    // Permite re-apuntar el selector cuando cambia el <select> de cliente.
    setRef(nuevo) {
      ref = nuevo;
      actual = null;
      pintar();
      if (entidad()) docLogos.get(ref).then(l => { actual = l; pintar(); }).catch(() => {});
    },
    get value() { return actual; },
    // Escribe el logo elegido en modo diferido, ya con el id real de la ficha.
    // No lanza: que un logo no suba jamás debe tumbar el alta del cliente.
    async flush(nuevoRef) {
      if (!pendiente || !actual) return false;
      try {
        await docLogos.set(nuevoRef, actual);
        pendiente = false;
        return true;
      } catch (err) {
        console.error('No se pudo guardar el logo tras crear la ficha:', err);
        toast('La ficha se creó, pero el logo no se pudo guardar. Cárgalo desde el botón "Logo".', 'error', 7000);
        return false;
      }
    },
  };
}
