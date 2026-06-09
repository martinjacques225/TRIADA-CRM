// js/ui.js — Shell de UI: nav, topbar, icons, mascota, eventos globales, PWA
import { appointments } from '../services/appointment.service.js';
import { calls } from '../services/call.service.js';
import { config } from '../services/config.service.js';
import { sales } from '../services/sales.service.js';
import { calcTotalMedallas, calcNivel } from '../services/medal.service.js';
import { MASCOTAS, getMascotMsg } from './mascotas.js';
import { S } from './state.js';
import { todayStr, nowTimeStr, escHtml, avatarColor, getInitials, toast, vibrate, formatDateLong, nivelInfo } from './utils.js';

// ═══ ICONS ═══ (centralizado aquí desde Etapa 4)
export const ico = {
  home:      `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/></svg>`,
  calendar:  `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"/></svg>`,
  list:      `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"/></svg>`,
  chart:     `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/></svg>`,
  whatsapp:  `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`,
  phone:     `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/></svg>`,
  zoom:      `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/></svg>`,
  edit:      `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>`,
  reschedule:`<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/></svg>`,
  plus:      `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>`,
  chevLeft:  `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>`,
  chevRight: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>`,
  search:    `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/></svg>`,
  download:  `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>`,
  upload:    `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>`,
  install:   `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>`,
  alert:     `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>`,
  settings:  `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/></svg>`,
  money:     `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clip-rule="evenodd"/></svg>`,
  medal:     `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 14a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" clip-rule="evenodd"/></svg>`,
  people:    `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>`,
  backup:    `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/></svg>`,
  trash:     `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>`,
  grid:      `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>`,
  kanban:    `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 4a1 1 0 011-1h5a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V4zm7 0a1 1 0 011-1h5a1 1 0 011 1v7a1 1 0 01-1 1h-5a1 1 0 01-1-1V4z"/></svg>`,
  user:      `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/></svg>`,
  json:      `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16A8 8 0 0010 2zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clip-rule="evenodd"/></svg>`
};

// ═══ NAV ═══
export async function renderNav() {
  const userName  = await config.get('userName') || 'Asesor';
  const avatar    = await config.get('userAvatar');
  const mascotId  = await config.get('mascota') || 'aria';
  const mascota   = MASCOTAS.find(m => m.id === mascotId) || MASCOTAS[0];
  const bannerUrl = await config.get('bannerUrl');
  const cargo     = await config.get('cargo') || '';
  const filial    = await config.get('filial') || '';
  const equipo    = await config.get('equipo') || '';
  const bg        = avatarColor(userName);
  const avContent = avatar ? `<img src="${avatar}" alt="">` : getInitials(userName);
  S.userName = userName;  // usado por el header de saludo del dashboard

  // Nivel y medallas (motor existente, sin nueva lógica)
  let nivel = 0, medEnNivel = 0;
  try {
    const allS = await sales.getAll();
    const totalMed = calcTotalMedallas(allS);
    nivel = calcNivel(totalMed); medEnNivel = totalMed % 5;
  } catch {}
  const subtitulo = [cargo || mascota.nombre, equipo || filial].filter(Boolean).join(' · ');
  const nivelN    = nivelInfo(nivel);
  const lastBackup = await config.get('lastBackup');

  const sections  = [
    { label:'COMERCIAL',  items:[{id:'home',label:'Home',icon:ico.home},{id:'dashboard',label:'Dashboard',icon:ico.grid},{id:'agenda',label:'Agenda',icon:ico.calendar},{id:'leads',label:'Leads',icon:ico.people},{id:'whatsapp',label:'Plantillas WhatsApp',icon:ico.whatsapp}] },
    { label:'RENDIMIENTO',items:[{id:'mis_ventas',label:'Mis ventas',icon:ico.chart},{id:'calculadora',label:'Comisiones',icon:ico.money},{id:'medallas',label:'Medallas',icon:ico.medal}] },
    { label:'SISTEMA',    items:[{id:'respaldos',label:'Informes y Respaldos',icon:ico.backup},{id:'config',label:'Configuración',icon:ico.settings}] }
  ];
  document.getElementById('nav').innerHTML = `
    ${bannerUrl ? `<div class="nav-banner"><img src="${bannerUrl}" alt="Banner"></div>` : ''}
    <div class="nav-brand">
      <div class="nav-brand-icon" style="background:none;padding:0;overflow:hidden"><svg width="34" height="34" viewBox="0 0 120 120" fill="none"><path d="M26 90 L60 62 L94 90" stroke="#1E2761" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/><path d="M26 73 L60 45 L94 73" stroke="#028090" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/><path d="M26 56 L60 28 L94 56" stroke="#4FB286" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      <div class="nav-brand-text"><h1>Tríada CRM</h1><span>v3.5</span></div>
    </div>
    <div class="nav-user" onclick="window._app?.navigate?.('config')" style="cursor:pointer">
      <div class="nav-user-avatar" style="background:${bg}">${avContent}</div>
      <div class="nav-user-info">
        <div class="nav-user-name">${escHtml(userName)}</div>
        <div class="nav-user-role">${escHtml(subtitulo)}</div>
      </div>
    </div>
    <div class="nav-level" onclick="window._app?.navigate?.('medallas')" title="Nivel actual">
      <div class="nav-level-top">
        <span class="nav-level-medal" style="background:linear-gradient(135deg, ${nivelN.color}, ${nivelN.color}cc)">${ico.medal}</span>
        <div class="nav-level-info">
          <div class="nav-level-name">${nivelN.nombre}</div>
          <div class="nav-level-sub">${medEnNivel} de 5 medallas</div>
        </div>
      </div>
      <div class="nav-level-bar"><div class="nav-level-fill" style="width:${medEnNivel/5*100}%"></div></div>
    </div>
    ${sections.map(sec => `
      <div class="nav-section">
        <div class="nav-section-label">${sec.label}</div>
        ${sec.items.map(i => `<button class="nav-item${S.view===i.id?' active':''}" data-view="${i.id}" title="${i.label}" aria-label="${i.label}">${i.icon}<span>${i.label}</span></button>`).join('')}
      </div>`).join('')}
    <div class="nav-footer">
      <div class="nav-status"><span class="nav-status-dot"></span><div><div class="nav-status-on">Sincronizado</div><div class="nav-status-sub">${lastBackup ? 'Último respaldo: ' + _backupLabel(lastBackup) : 'Sin respaldos aún'}</div></div></div>
      <button class="nav-install-btn" id="backupBtn"><span>Informes y respaldos</span></button>
      <button class="nav-install-btn" id="installBtn" style="${S.deferredInstall?'margin-top:6px':'display:none'}">${ico.install}<span>Instalar app</span></button>
    </div>`;
  document.getElementById('nav').querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => window._app?.navigate?.(btn.dataset.view));
  });
  document.getElementById('installBtn')?.addEventListener('click', installPWA);
  document.getElementById('backupBtn')?.addEventListener('click', () => window._app?.navigate?.('respaldos'));
}

// Etiqueta amigable para el último respaldo ("Hoy 11:30", "Ayer 09:12", "12 Jun")
function _backupLabel(iso) {
  if (!iso) return '';
  const d = new Date(iso), hoy = todayStr(), ds = d.toISOString().slice(0, 10);
  const hm = d.toTimeString().slice(0, 5);
  if (ds === hoy) return `Hoy ${hm}`;
  const ayer = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (ds === ayer) return `Ayer ${hm}`;
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

export function renderBottomNav() {
  const items = [
    {id:'home',label:'Home',icon:ico.home},{id:'agenda',label:'Agenda',icon:ico.calendar},
    {id:'leads',label:'Leads',icon:ico.people},{id:'calculadora',label:'Comisión',icon:ico.money},
    {id:'config',label:'Config',icon:ico.settings}
  ];
  document.getElementById('bottom-nav').innerHTML = items.map(i =>
    `<button class="bottom-nav-item${S.view===i.id?' active':''}" data-view="${i.id}" aria-label="${i.label}">${i.icon}<span>${i.label}</span></button>`
  ).join('');
  document.getElementById('bottom-nav').querySelectorAll('.bottom-nav-item').forEach(btn => {
    btn.addEventListener('click', () => { vibrate(30); window._app?.navigate?.(btn.dataset.view); });
  });
}

export function renderTopbar(addDaysFn, refreshViewFn, openFormModalFn, openLeadModalFn, openSaleModalFn) {
  const tb = document.getElementById('topbar');
  if (S.view === 'agenda') {
    tb.innerHTML = `
      <button class="btn-icon" id="prevDay" aria-label="Día anterior">${ico.chevLeft}</button>
      <div class="topbar-date-nav"><div class="date-display">${_formatDateLong(S.date)}</div></div>
      <button class="btn-icon" id="nextDay" aria-label="Día siguiente">${ico.chevRight}</button>
      <button class="btn-today">Hoy</button>
      <button class="btn-primary" id="btnNewAppt">${ico.plus}<span>Nueva cita</span></button>`;
    document.getElementById('prevDay').addEventListener('click',   () => { S.date = addDaysFn(S.date,-1); refreshViewFn(); });
    document.getElementById('nextDay').addEventListener('click',   () => { S.date = addDaysFn(S.date, 1); refreshViewFn(); });
    document.querySelector('.btn-today').addEventListener('click', () => { S.date = todayStr(); refreshViewFn(); });
    document.getElementById('btnNewAppt').addEventListener('click', () => openFormModalFn());
  } else if (S.view === 'dashboard' || S.view === 'home') {
    const hh = new Date().getHours();
    const saludo = hh < 12 ? 'Buenos días' : hh < 19 ? 'Buenas tardes' : 'Buenas noches';
    tb.innerHTML = `
      <div class="tb-greet">
        <div class="tb-greet-title">¡${saludo}, ${escHtml((S.userName || 'Asesor').split(' ')[0])}! 👋</div>
        <div class="tb-greet-date">${formatDateLong(todayStr())}</div>
      </div>
      <div class="tb-actions">
        <div class="tb-daynav">
          <button class="btn-icon" id="dPrev" aria-label="Día anterior">${ico.chevLeft}</button>
          <button class="btn-today" id="dToday">Hoy</button>
          <button class="btn-icon" id="dNext" aria-label="Día siguiente">${ico.chevRight}</button>
        </div>
        <button class="btn-primary" id="dNewAppt">${ico.plus}<span>Nueva cita</span></button>
      </div>`;
    document.getElementById('dToday').addEventListener('click', () => { S.date = todayStr(); window._app?.navigate?.('agenda'); });
    document.getElementById('dPrev').addEventListener('click',  () => { S.date = addDaysFn(todayStr(), -1); window._app?.navigate?.('agenda'); });
    document.getElementById('dNext').addEventListener('click',  () => { S.date = addDaysFn(todayStr(), 1);  window._app?.navigate?.('agenda'); });
    document.getElementById('dNewAppt').addEventListener('click', () => openFormModalFn());
  } else {
    const titles = { leads:'Leads', whatsapp:'Plantillas WhatsApp', calculadora:'Calculadora de Comisiones',
      mis_ventas:'Mis Ventas', medallas:'Medallas & Nivel', dashboard:'Dashboard',
      respaldos:'Informes y Respaldos', config:'Configuración' };
    tb.innerHTML = `
      <span class="topbar-title">${titles[S.view]||''}</span>
      ${S.view==='leads'     ? `<button class="btn-primary" id="btnNewLead">${ico.plus}<span>Nuevo lead</span></button>`       : ''}
      ${S.view==='mis_ventas'? `<button class="btn-primary" id="btnNewSale">${ico.plus}<span>Registrar venta</span></button>`  : ''}`;
    document.getElementById('btnNewLead')?.addEventListener('click', () => openLeadModalFn());
    document.getElementById('btnNewSale')?.addEventListener('click', () => openSaleModalFn());
  }
}

// ═══ DISPATCHER DE EVENTOS ═══
export function attachCardEvents() {
  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const { action, id, tel, zoom, nombre, type } = btn.dataset, numId = parseInt(id);
      const app = window._app;
      if      (action==='call')         { const c = type==='lead' ? { leadId:numId, nombre, telefono:tel } : { apptId:numId, nombre, telefono:tel }; app?.autoLogCall?.(c); window.open(`tel:${tel}`); }
      else if (action==='wa')           app?.openWAModal?.(numId, type||'appt');
      else if (action==='zoom')         window.open(zoom,'_blank');
      else if (action==='edit')         app?.openFormModal?.(numId);
      else if (action==='edit-lead')    app?.openLeadModal?.(numId);
      else if (action==='view-lead')    app?.openLeadDetail?.(numId);
      else if (action==='agendar-lead') app?.openFormModalFromLead?.(numId);
      else if (action==='reagendar')    app?.openReagendarModal?.(numId);
      else if (action==='delete-appt')  app?.deleteAppointment?.(numId);
      else if (action==='appt-to-lead') app?.appointmentToLead?.(numId);
      else if (action==='delete-sale')  app?.deleteSale?.(numId);
      else if (action==='delete-lead')  app?.deleteLead?.(numId);
    });
  });
}

// ═══ MASCOTA ═══
const VIEW_CTX = {
  home: 'ver_dashboard', agenda: 'ver_agenda', leads: 'ver_leads', dashboard: 'ver_dashboard',
  mis_ventas: 'ver_ventas', whatsapp: 'ver_agenda', config: 'ver_config',
  calculadora: 'tip_comercial', medallas: 'tip_comercial',
  respaldos: 'tip_comercial'
};

export async function showMascotMessage(msg, ctx = 'bienvenida', big = false) {
  const mascotId = await config.get('mascota') || 'aria';
  const mascota  = MASCOTAS.find(m => m.id === mascotId) || MASCOTAS[0];
  const bubble   = document.getElementById('mascot-bubble');
  // Nombre de la mascota encima del mensaje
  const nameEl = document.getElementById('mascotName');
  if (nameEl) nameEl.textContent = mascota.nombre;
  document.getElementById('mascotMsg').textContent = msg || getMascotMsg(mascota, ctx);
  const wrap = document.getElementById('mascotAvatarWrap');
  wrap.style.background = mascota.color;
  // Ring CSS variable para el color del pulse
  wrap.style.setProperty('--mascot-color', mascota.color);
  wrap.innerHTML = mascota.img
    ? `<img src="${mascota.img}" alt="${mascota.nombre}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
    : mascota.emoji || '🤖';
  bubble.classList.toggle('big', big);
  // Re-trigger animación de entrada
  bubble.classList.add('hidden');
  void bubble.offsetWidth; // reflow
  bubble.classList.remove('hidden');
  clearTimeout(window._mascotTimer);
  window._mascotTimer = setTimeout(() => bubble.classList.add('hidden'), big ? 9000 : 7000);
}

// Muestra mascota al navegar — 55% de probabilidad para no ser repetitivo
export async function showMascotForView(view) {
  if (Math.random() > 0.55) return;
  const ctx = VIEW_CTX[view] || 'tip_comercial';
  // Pequeño delay para que la vista termine de renderizar
  setTimeout(() => showMascotMessage(null, ctx), 400);
}

// Tips aleatorios cada 5-8 min mientras la app está abierta
export function startMascotTips() {
  const fireTip = () => {
    if (!document.hidden) showMascotMessage(null, 'tip_comercial');
    const next = (5 + Math.random() * 3) * 60 * 1000; // 5-8 min
    window._mascotTipTimer = setTimeout(fireTip, next);
  };
  // Primera vez a los 4-6 min
  window._mascotTipTimer = setTimeout(fireTip, (4 + Math.random() * 2) * 60 * 1000);
}

export async function checkMascotRegreso() {
  const lastVisit = await config.get('lastVisit');
  const today     = todayStr();
  if (lastVisit && lastVisit !== today) {
    const diff = Math.round((new Date(today) - new Date(lastVisit)) / 86400000);
    if (diff >= 2) setTimeout(() => showMascotMessage(null, 'regreso'), 2000);
  }
  await config.set('lastVisit', today);
}

// ═══ AUTO-CALL ═══
export async function autoLogCall({ apptId, leadId, nombre, telefono }, callsDB) {
  const callId = await callsDB.add({ apptId:apptId||null, leadId:leadId||null, nombre:nombre||'', telefono:telefono||'', resultado:'Iniciada', auto:true });
  S.pendingCallId = callId;
  const onVisible = () => {
    if (!document.hidden && S.pendingCallId) {
      document.removeEventListener('visibilitychange', onVisible);
      setTimeout(() => showCallResultModal(callId, callsDB), 600);
    }
  };
  document.addEventListener('visibilitychange', onVisible);
  setTimeout(() => {
    if (S.pendingCallId === callId) { document.removeEventListener('visibilitychange', onVisible); showCallResultModal(callId, callsDB); }
  }, 25000);
}

export function showCallResultModal(callId, callsDB) {
  if (!callId) return; S.pendingCallId = null;
  const resultados = [{val:'Contestó',emoji:'✅',label:'Contestó'},{val:'No contestó',emoji:'📵',label:'No contestó'},{val:'Buzón',emoji:'📬',label:'Buzón'},{val:'Ocupado',emoji:'⏳',label:'Ocupado'}];
  document.getElementById('callResultBody').innerHTML = `
    <p style="font-size:.78rem;color:var(--text2);margin-bottom:12px">¿Cómo resultó la llamada?</p>
    <div class="call-result-grid">${resultados.map(r=>`<button class="call-result-btn" data-result="${r.val}"><span class="cr-emoji">${r.emoji}</span>${r.label}</button>`).join('')}</div>`;
  document.getElementById('callResultOverlay').classList.add('open');
  document.querySelectorAll('.call-result-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const c = await callsDB.get(callId); if (c) { c.resultado = btn.dataset.result; await callsDB.update(c); }
      document.getElementById('callResultOverlay').classList.remove('open');
      vibrate(30); toast('Llamada: ' + btn.dataset.result);
      showMascotMessage(null, 'llamada');
    });
  });
}

// ═══ NOTIFICACIONES & PWA ═══
export async function requestNotifications() {
  if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission();
}
export function startNotificationWatcher(appointmentsDB) {
  setInterval(async () => {
    if (Notification.permission !== 'granted') return;
    const now   = new Date(), appts = await appointmentsDB.getByDate(todayStr());
    appts.forEach(a => {
      if (S.notified.has(a.id) || a.estado !== 'Pendiente') return;
      const [h, m] = a.hora.split(':').map(Number), t = new Date(now);
      t.setHours(h, m, 0, 0);
      const diff = (t - now) / 60000;
      if (diff >= 0 && diff <= 10) {
        S.notified.add(a.id);
        showMascotMessage(null, 'cita_proxima');
        new Notification('Cita en 10 minutos', { body:`${a.nombre} - ${a.hora}`, icon:'./icon-lgs.png' });
      }
    });
  }, 60000);
}
export function installPWA() {
  if (S.deferredInstall) { S.deferredInstall.prompt(); S.deferredInstall.userChoice.then(() => { S.deferredInstall = nu