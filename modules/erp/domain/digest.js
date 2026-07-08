// modules/erp/domain/digest.js — LÓGICA PURA (testeable en node).
//
// El "digest de trIA" del Centro de Mando. Se rotula como lectura de trIA, pero es
// 100% DETERMINISTA: cuenta vencimientos, proyectos detenidos y datos faltantes.
// Ninguna IA generativa, ningún dato sale del CRM. Alimenta "Requiere tu atención".

const n   = (v) => Number(v) || 0;
const ymd = (d) => (d || '').toString().slice(0, 10);
const dias = (a, b) => Math.floor((Date.parse(a) - Date.parse(b)) / 86400000);
const plural = (k, s, p) => k === 1 ? s : p;

export const DIAS_SIN_AVANCE = 10;
export const DIAS_RENOVACION = 15;

export function calcDigest({ proyectos = [], facturas = [], gastos = [], horas = [], activos = [] } = {}, hoy) {
  const today = ymd(hoy);
  const alerts = [];

  // 1) Facturas vencidas → cobranza
  const facVenc = facturas.filter(f => (f.estado === 'pendiente' || f.estado === 'parcial') && f.vencimiento && ymd(f.vencimiento) < today);
  if (facVenc.length) {
    alerts.push({
      nivel: 'critico', tipo: 'facturas_vencidas',
      titulo: `${facVenc.length} ${plural(facVenc.length, 'factura vencida', 'facturas vencidas')}`,
      detalle: 'Requiere gestión de cobro',
      monto: facVenc.reduce((s, f) => s + Math.max(0, n(f.monto) - n(f.pagado)), 0),
    });
  }

  // 2) Gastos vencidos → por pagar
  const gasVenc = gastos.filter(g => g.estado === 'pendiente' && g.vencimiento && ymd(g.vencimiento) < today);
  if (gasVenc.length) {
    alerts.push({
      nivel: 'critico', tipo: 'gastos_vencidos',
      titulo: `${gasVenc.length} ${plural(gasVenc.length, 'gasto vencido', 'gastos vencidos')}`,
      detalle: 'Vencieron sin pagar',
      monto: gasVenc.reduce((s, g) => s + n(g.total), 0),
    });
  }

  // 3) Proyectos activos sin horas hace DIAS_SIN_AVANCE+ (o nunca)
  const ultima = {};
  horas.forEach(h => { const f = ymd(h.fecha); if (!ultima[h.proyectoId] || f > ultima[h.proyectoId]) ultima[h.proyectoId] = f; });
  const detenidos = proyectos.filter(p => p.estado === 'activo').filter(p => {
    const u = ultima[p.id];
    return !u || dias(today, u) >= DIAS_SIN_AVANCE;
  });
  if (detenidos.length) {
    alerts.push({
      nivel: 'aviso', tipo: 'proyectos_sin_avance',
      titulo: `${detenidos.length} ${plural(detenidos.length, 'proyecto sin avance', 'proyectos sin avance')}`,
      detalle: `Sin horas registradas en ${DIAS_SIN_AVANCE}+ días`,
    });
  }

  // 4) Proyectos activos sin tarifa o sin valor acordado → margen no confiable
  const sinDatos = proyectos.filter(p => p.estado === 'activo' && (p.tarifa == null || p.presupuestoMonto == null));
  if (sinDatos.length) {
    alerts.push({
      nivel: 'info', tipo: 'proyectos_sin_datos',
      titulo: `${sinDatos.length} ${plural(sinDatos.length, 'proyecto sin tarifa o valor', 'proyectos sin tarifa o valor')}`,
      detalle: 'Su margen es referencial hasta completarlo',
    });
  }

  // 5) Licencias por renovar en los próximos DIAS_RENOVACION días
  const porRenovar = activos.filter(a => a.estado === 'activo' && a.fechaRenovacion
    && dias(ymd(a.fechaRenovacion), today) >= 0 && dias(ymd(a.fechaRenovacion), today) <= DIAS_RENOVACION);
  if (porRenovar.length) {
    alerts.push({
      nivel: 'aviso', tipo: 'renovaciones',
      titulo: `${porRenovar.length} ${plural(porRenovar.length, 'licencia por renovar', 'licencias por renovar')}`,
      detalle: `En los próximos ${DIAS_RENOVACION} días`,
    });
  }

  const criticos = alerts.filter(a => a.nivel === 'critico').length;
  const titular = alerts.length === 0
    ? 'Todo en orden: sin vencimientos ni proyectos detenidos.'
    : `${alerts.length} ${plural(alerts.length, 'cosa requiere', 'cosas requieren')} tu atención${criticos ? ` · ${criticos} ${plural(criticos, 'urgente', 'urgentes')}` : ''}.`;

  return { alerts, titular, criticos };
}
