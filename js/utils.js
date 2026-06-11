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
  const colors = ['#0C7C88','#16234A','#2E9B73','#5160C0','#C2871A','#C04F3F'];
  const ci = (ini.charCodeAt(0) || 0) % colors.length;
  return `<div class="avatar" style="width:${size}px;height:${size}px;background:${colors[ci]};font-size:${Math.round(size*0.38)}px">${ini}</div>`;
}

export const PIPELINE_STAGES = [
  { id: 'Nuevo',                 color: '#94A0B6', bg: '#F0F2F6',   icon: '🆕', iconName: 'sparkle' },
  { id: 'Contactado',            color: '#5160C0', bg: '#ECEEFA',   icon: '📞', iconName: 'phone' },
  { id: 'Diagnóstico Agendado',  color: '#C2871A', bg: '#F8F0DD',   icon: '📅', iconName: 'calClock' },
  { id: 'Diagnóstico Realizado', color: '#0C7C88', bg: '#E2F0F1',   icon: '🔍', iconName: 'search' },
  { id: 'Propuesta Enviada',     color: '#16234A', bg: '#E9ECF4',   icon: '📋', iconName: 'fileText' },
  { id: 'Negociando',            color: '#C04F3F', bg: '#F9E9E6',   icon: '🤝', iconName: 'handshake' },
  { id: 'Cliente',               color: '#2E9B73', bg: '#E4F2EB',   icon: '✅', iconName: 'checkCirc' },
  { id: 'Descartado',            color: '#94A0B6', bg: '#F0F2F6',   icon: '❌', iconName: 'xCirc' },
];

// Renderiza el ícono de línea de una etapa (cae al emoji si la lib no cargó)
export function stageIcon(estado, size = 14) {
  const st = PIPELINE_STAGES.find(s => s.id === estado);
  if (!st) return '';
  return (typeof window !== 'undefined' && window.icon) ? window.icon(st.iconName, '', size) : st.icon;
}

export const RUBROS = ['Comercio / retail','Servicios','Gastronomía','Salud','Construcción','Manufactura','Otro'];
export const TAMANOS = ['1 a 5','6 a 20','21 a 50','Más de 50'];
export const DOLORES = ['Vender más','Ordenar procesos','Controlar finanzas','Automatizar / tecnología','No sé por dónde partir'];
export const ORIGENES = ['Landing Web','Referido','Contacto directo','Red social','Evento','Otro'];

export const DIAG_AREAS = [
  { id: 'tec',      label: 'Tecnología',   icon: '🖥️', iconName: 'cpu',      color: '#5160C0' },
  { id: 'ventas',   label: 'Ventas',       icon: '📈', iconName: 'trending', color: '#0C7C88' },
  { id: 'finanzas', label: 'Finanzas',     icon: '💰', iconName: 'coins',    color: '#2E9B73' },
];

// Ícono de línea de un área (por id o por label); cae al emoji si la lib no cargó
export function areaIcon(area, size = 16) {
  const a = DIAG_AREAS.find(x => x.id === area || x.label === area);
  if (!a) return '';
  return (typeof window !== 'undefined' && window.icon) ? window.icon(a.iconName, '', size) : a.icon;
}

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
  const ic = (typeof window !== 'undefined' && window.icon) ? window.icon(st.iconName, '', 12) : st.icon;
  return `<span class="badge" style="color:${st.color};background:${st.bg};border-color:${st.color}22">${ic} ${escHtml(estado)}</span>`;
}
