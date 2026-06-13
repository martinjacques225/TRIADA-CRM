// modules/presupuestos/presupuestos.js
// Presupuesto = documento posterior a la Propuesta. Mientras la Propuesta es el
// programa a ofrecer (cotización del servicio), el Presupuesto agrega IVA, mano
// de obra y plan de servicio. El módulo completo (con su tabla `presupuestos`)
// se habilita en la siguiente etapa; esta vista deja claro el rol y el flujo.
const _i = (n, s) => (window.icon ? window.icon(n, '', s) : '');

export async function render() {
  const center = document.getElementById('center');
  center.innerHTML = `<div class="view-animate">
    <div class="section-head"><h2>Presupuesto</h2></div>

    <div class="card card-pad" style="max-width:720px">
      <div style="display:flex;gap:14px;align-items:flex-start">
        <div style="width:46px;height:46px;border-radius:12px;background:var(--amber-l);color:var(--amber);display:flex;align-items:center;justify-content:center;flex-shrink:0">${_i('flag', 22)}</div>
        <div>
          <h3 style="font-family:var(--serif);font-size:19px;font-weight:600;color:var(--ink);margin-bottom:6px">Módulo en preparación</h3>
          <p style="font-size:14px;color:var(--text2);line-height:1.55">
            El <strong>Presupuesto</strong> es el documento que sigue a la Propuesta. La Propuesta presenta el
            <em>programa a ofrecer</em> (cotización del servicio); el Presupuesto lo aterriza con
            <strong>IVA</strong>, <strong>mano de obra</strong> y el <strong>plan de servicio</strong> en caso de contratarlo.
          </p>
        </div>
      </div>

      <div style="margin-top:18px;display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div style="background:var(--surface2);border-radius:10px;padding:14px">
          <div style="font-weight:700;color:var(--primary);font-size:13.5px;margin-bottom:6px">Propuesta</div>
          <ul style="margin:0;padding-left:18px;font-size:13px;color:var(--text2);display:flex;flex-direction:column;gap:4px">
            <li>Programa / servicios a ofrecer</li>
            <li>PDF corporativo tipo cotización</li>
            <li>Se envía como avance preliminar</li>
          </ul>
        </div>
        <div style="background:var(--surface2);border-radius:10px;padding:14px">
          <div style="font-weight:700;color:var(--amber);font-size:13.5px;margin-bottom:6px">Presupuesto</div>
          <ul style="margin:0;padding-left:18px;font-size:13px;color:var(--text2);display:flex;flex-direction:column;gap:4px">
            <li>IVA + mano de obra</li>
            <li>Plan de servicio (si se contrata)</li>
            <li>Documento de cierre comercial</li>
          </ul>
        </div>
      </div>

      <p style="font-size:12.5px;color:var(--text3);margin-top:16px">
        Se habilita en la próxima entrega, junto con la conversión de Propuesta a PDF. Su tabla
        <code>presupuestos</code> se crea con <code>supabase/presupuestos.sql</code>.
      </p>
    </div>
  </div>`;
}
