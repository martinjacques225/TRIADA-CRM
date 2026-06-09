// js/utils.js — Shared helpers

export function escHtml(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-CL', { day:'2-digit', month:'short', year:'numeric' });
}

export function formatDateShort(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-CL', { day:'2-digit', month:'short' });
}

export function formatCLP(n) {
  if (!n && n !== 0) return '—';
  return '$' + Number(n).toLocaleString('es-CL');
}

export function toast(msg, type = 'info', duration = 3000) {
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 320); }, duration);
}

export function initials(nombre, empresa) {
  const src = nombre || empresa || '?';
  return src.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
}

export function avatarHtml(nombre, empresa, size = 36) {
  const ini = initials(nombre, empresa);
  const colors = ['#028090','#1E2761','#4FB286','#5B6BD6','#F0B429','#E0604F'];
  const ci = (ini.charCodeAt(0) || 0) % colors.length;
  return `<div class="avatar" style="width:${size}px;height:${size}px;background:${colors[ci]};font-size:${Math.round(size*0.38)}px">${ini}</div>`;
}

export const PIPELINE_STAGES = [
  { id: 'Nuevo',                 color: '#9DA7B3', bg: '#F8FAFC',   icon: '🆕' },
  { id: 'Contactado',            color: '#5B6BD6', bg: '#EEF0FB',   icon: '📞' },
  { id: 'Diagnóstico Agendado',  color: '#F0B429', bg: '#FEF6E6',   icon: '📅' },
  { id: 'Diagnóstico Realizado', color: '#028090', bg: '#E6F2F4',   icon: '🔍' },
  { id: 'Propuesta Enviada',     color: '#1E2761', bg: '#ECEEF5',   icon: '📋' },
  { id: 'Negociando',            color: '#E0604F', bg: '#FCEEEC',   icon: '🤝' },
  { id: 'Cliente',               color: '#4FB286', bg: '#ECF7F1',   icon: '✅' },
  { id: 'Descartado',            color: '#94A3B8', bg: '#F1F5F9',   icon: '❌' },
];

export const RUBROS = ['Comercio / retail','Servicios','Gastronomía','Salud','Construcción','Manufactura','Otro'];
export const TAMANOS = ['1 a 5','6 a 20','21 a 50','Más de 50'];
export const DOLORES = ['Vender más','Ordenar procesos','Controlar finanzas','Automatizar / tecnología','No sé por dónde partir'];
export const ORIGENES = ['Landing Web','Referido','Contacto directo','Red social','Evento','Otro'];

export const DIAG_AREAS = [
  { id: 'tec',      label: 'Tecnología',   icon: '🖥️', color: '#5B6BD6' },
  { id: 'ventas',   label: 'Ventas',       icon: '📈', color: '#028090' },
  { id: 'finanzas', label: 'Finanzas',     icon: '💰', color: '#4FB286' },
];

export const DIAG_PREGUNTAS = {
  tec: [
    '¿Los sistemas internos están integrados entre sí?',
    '¿El equipo usa herramientas digitales para su trabajo diario?',
    '¿Se automatizan tareas repetitivas?',
    '¿Los datos del negocio están centralizados y accesibles?',
    '¿Se mide el desempeño digital con indicadores?',
  ],
  ventas: [
    '¿Existe un proceso de ventas documentado y seguido?',
    '¿Se hace seguimiento estructurado a cada prospecto?',
    '¿Se mide la tasa de conversión de cotizaciones?',
    '¿El equipo tiene metas claras y seguimiento regular?',
    '¿Se usa algún CRM o herramienta de gestión de clientes?',
  ],
  finanzas: [
    '¿Se conoce el margen real de cada producto o servicio?',
    '¿El flujo de caja se proyecta con al menos 3 meses de anticipación?',
    '¿Los costos fijos y variables están claramente identificados?',
    '¿Se revisan los estados financieros mensualmente?',
    '¿Existen indicadores de rentabilidad por línea de negocio?',
  ],
};

export function stageBadge(estado) {
  const st = PIPELINE_STAGES.find(s => s.id === estado);
  if (!st) return `<span class="badge">${escHtml(estado)}</span>`;
  return `<span class="badge" style="color:${st.color};background:${st.bg};border-color:${st.color}22">${st.icon} ${escHtml(estado)}</span>`;
}
