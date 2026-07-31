// modules/oportunidades/domain/alertas.js — MOTOR DE ALERTAS (lógica pura).
//
// En Compra Ágil el reloj es el enemigo: se cierra en días, a veces en horas.
// Estas alertas son CUENTAS sobre los datos del CRM (no IA, no adivinanza) y
// cubren las doce del §18 del encargo.
//
// Todas las horas se calculan contra un `ahora` que se INYECTA: así los tests son
// deterministas y no dependen del reloj de la máquina.

import { estaViva, estadoLabel } from './estados.js';

const HORA = 3600 * 1000;
const DIA  = 24 * HORA;

const NIVEL_ORDEN = { critico: 0, alto: 1, medio: 2, info: 3 };

const ts = (v) => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  const n = d.getTime();
  return Number.isFinite(n) ? n : null;
};

/** Horas que faltan para el cierre (negativo = ya cerró). null si no hay fecha. */
export function horasHastaCierre(fechaCierre, ahora = Date.now()) {
  const t = ts(fechaCierre);
  if (t == null) return null;
  return (t - ts(ahora)) / HORA;
}

/** Días hasta el cierre, redondeados hacia abajo salvo el negativo. */
export function diasHastaCierre(fechaCierre, ahora = Date.now()) {
  const h = horasHastaCierre(fechaCierre, ahora);
  return h == null ? null : Math.floor(h / 24);
}

/**
 * Genera todas las alertas del módulo.
 *
 * @param {object} datos
 *  - oportunidades: [{id, titulo, estado, fechaCierre, tiempoInvertidoMin, ...}]
 *  - aprobacionesPorOp: { [opId]: [{area, decision}] }
 *  - ofertasPorOp:      { [opId]: [{estado, docs:[{obligatorio, estado}]}] }
 *  - resultadosPorOp:   { [opId]: {ocAceptada, recepcionConformeAt, facturaNumero, pagoEsperado, pagoReal, certificadoEstado} }
 *  - docsProveedor: [{id, nombre, fechaVencimiento, estado}]
 *  - ahora: Date | number | ISO
 *  - horasMaxCotizacion: tope de horas de preparación antes de avisar (default 2)
 */
export function generarAlertas(datos = {}) {
  const {
    oportunidades = [], aprobacionesPorOp = {}, ofertasPorOp = {}, resultadosPorOp = {},
    docsProveedor = [], ahora = Date.now(), horasMaxCotizacion = 2,
  } = datos;

  const now = ts(ahora) ?? Date.now();
  const out = [];
  const push = (a) => out.push(a);

  oportunidades.forEach((op) => {
    const viva = estaViva(op.estado);

    // ── Cierre: 72 h · 24 h · 4 h ────────────────────────────────────────────
    // Solo mientras la oportunidad siga en juego y todavía no se haya presentado.
    const presentada = ['presentada', 'adjudicada', 'no_adjudicada', 'orden_recibida', 'en_ejecucion',
      'recepcion_conforme', 'facturada', 'pagada', 'certificado_solicitado', 'certificado_obtenido'].includes(op.estado);
    if (viva && !presentada) {
      const h = horasHastaCierre(op.fechaCierre, now);
      if (h != null) {
        if (h < 0) push(alerta('critico', 'cierre_vencido', op, 'El plazo de cierre ya pasó', `Cerró hace ${Math.abs(Math.round(h))} h y la oferta no se presentó.`));
        else if (h <= 4)  push(alerta('critico', 'cierre_4h',  op, 'Cierra en menos de 4 horas',  `Quedan ${Math.round(h * 10) / 10} h.`));
        else if (h <= 24) push(alerta('alto',    'cierre_24h', op, 'Cierra en menos de 24 horas', `Quedan ${Math.round(h)} h.`));
        else if (h <= 72) push(alerta('medio',   'cierre_72h', op, 'Cierra en menos de 72 horas', `Quedan ${Math.round(h / 24 * 10) / 10} días.`));
      }
    }

    // ── Aprobación pendiente ────────────────────────────────────────────────
    if (op.estado === 'pendiente_aprobacion') {
      const firmas = (aprobacionesPorOp[op.id] || []).length;
      if (firmas < 3) push(alerta('alto', 'aprobacion_pendiente', op, 'Aprobación pendiente', `Faltan ${3 - firmas} de 3 firmas.`));
    }

    // ── Documentos faltantes del paquete de oferta ──────────────────────────
    const ofertas = ofertasPorOp[op.id] || [];
    const oferta = ofertas.find((o) => o.estado !== 'reemplazada');
    if (oferta && ['oferta_preparacion', 'lista_presentar'].includes(op.estado)) {
      const faltan = (oferta.docs || []).filter((d) => d.obligatorio && d.estado === 'pendiente');
      if (faltan.length) push(alerta(op.estado === 'lista_presentar' ? 'critico' : 'medio', 'doc_faltante', op,
        'Documentos obligatorios pendientes', `${faltan.length} sin marcar: ${faltan.slice(0, 3).map((d) => d.nombre).join(', ')}.`));
    }

    // ── Cotización que se pasó de las 2 horas ───────────────────────────────
    const min = Number(op.tiempoInvertidoMin) || 0;
    if (viva && min > horasMaxCotizacion * 60) {
      push(alerta('medio', 'tiempo_excedido', op, 'La preparación superó el tope de tiempo',
        `${Math.round(min / 6) / 10} h invertidas (tope ${horasMaxCotizacion} h). Revisar si sigue valiendo la pena.`));
    }

    // ── Post-adjudicación: OC, recepción, factura, pago, certificado ────────
    const r = resultadosPorOp[op.id];
    if (r) {
      if (op.estado === 'orden_recibida' && !r.ocAceptada) {
        push(alerta('alto', 'oc_pendiente', op, 'Orden de compra pendiente de revisión',
          r.ocCoincide === false ? 'La orden NO coincide con la oferta: revisar antes de aceptar.' : 'Comparar la orden con la oferta antes de aceptarla.'));
      }
      if (op.estado === 'en_ejecucion' && !r.recepcionConformeAt) {
        push(alerta('medio', 'recepcion_pendiente', op, 'Recepción conforme pendiente', 'El trabajo está en ejecución y aún no hay recepción conforme.'));
      }
      if (op.estado === 'recepcion_conforme' && !r.facturaNumero) {
        push(alerta('alto', 'factura_pendiente', op, 'Factura pendiente', 'Hay recepción conforme y todavía no se emite la factura.'));
      }
      const esperado = ts(r.pagoEsperado);
      if (esperado != null && !r.pagoReal && now > esperado) {
        push(alerta('critico', 'pago_atrasado', op, 'Pago atrasado',
          `Se esperaba el ${String(r.pagoEsperado).slice(0, 10)}; van ${Math.floor((now - esperado) / DIA)} días.`));
      }
      if (op.estado === 'pagada' && (r.certificadoEstado || 'no_solicitado') === 'no_solicitado') {
        push(alerta('medio', 'certificado_pendiente', op, 'Certificado de experiencia no solicitado',
          'El pago ya entró: pedir el certificado ahora, que es lo que habilita licitaciones mayores.'));
      }
    }
  });

  // ── Documentos del proveedor por vencer / vencidos ────────────────────────
  docsProveedor.forEach((d) => {
    const v = ts(d.fechaVencimiento);
    if (v == null) return;
    const dias = Math.floor((v - now) / DIA);
    if (dias < 0) {
      push({ nivel: 'critico', tipo: 'doc_vencido', opId: null, titulo: 'Documento vencido', detalle: `${d.nombre} venció hace ${Math.abs(dias)} días.`, refId: d.id });
    } else if (dias <= 30) {
      push({ nivel: dias <= 7 ? 'alto' : 'medio', tipo: 'doc_por_vencer', opId: null, titulo: 'Documento por vencer', detalle: `${d.nombre} vence en ${dias} días.`, refId: d.id });
    }
  });

  return out.sort((a, b) => (NIVEL_ORDEN[a.nivel] - NIVEL_ORDEN[b.nivel]) || String(a.titulo).localeCompare(String(b.titulo)));
}

function alerta(nivel, tipo, op, titulo, detalle) {
  return { nivel, tipo, opId: op.id, opTitulo: op.titulo, estado: op.estado, estadoLabel: estadoLabel(op.estado), titulo, detalle };
}

/** Conteo por nivel, para la píldora del encabezado. */
export function resumenAlertas(alertas = []) {
  return alertas.reduce((acc, a) => { acc[a.nivel] = (acc[a.nivel] || 0) + 1; acc.total++; return acc; },
    { total: 0, critico: 0, alto: 0, medio: 0, info: 0 });
}
