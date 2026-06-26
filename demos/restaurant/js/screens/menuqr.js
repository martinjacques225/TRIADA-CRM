/* ============================================================================
   screens/menuqr.js · Menú QR — experiencia del CLIENTE FINAL (sin login)
   El comensal escanea el QR de su mesa, recorre la carta digital, arma su
   pedido y lo envía. La comanda cae en la KDS de Cocina (mesa 7, demo).
   Portado 1:1 del prototipo de Claude Design (marco de teléfono, estilos
   inline para conservar la estética de la cara pública del restaurante).
   ========================================================================== */

import { clp, esc } from '../util.js';
import { CATEGORIES, MENU } from '../data.js';
import { is86 } from '../domain.js';

/* Colores de tag del menú QR (mismos que el prototipo). */
const tagStyle = (tag) => tag === 'Popular' ? { bg: '#F8F0DD', fg: '#9A6B12' }
  : tag === 'Veg' ? { bg: '#E4F2EB', fg: '#1F7A57' }
  : { bg: '#ECEEFA', fg: '#3F4CA8' };

/* Gradientes de "foto" de plato (placeholder de marca, sin imágenes). */
const GRADS = [
  'linear-gradient(135deg, #0E6F7B, #16234A)',
  'linear-gradient(135deg, #2E9B73, #0C7C88)',
  'linear-gradient(135deg, #1B3A63, #0C7C88)',
  'linear-gradient(135deg, #0C7C88, #2BA0AB)',
];

/* Chevron de marca (placeholder dentro de la "foto"). */
const chevron = (size, color, opacity) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 120 120" fill="none" style="position:absolute;right:-8px;bottom:-8px;opacity:${opacity};"><path d="M26 90 L60 62 L94 90" stroke="${color}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path d="M26 73 L60 45 L94 73" stroke="${color}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path d="M26 56 L60 28 L94 56" stroke="${color}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export function renderMenuQR(state) {
  const cat = state.qrCat || 'entradas';
  const cart = state.qrCart || [];
  const count = cart.reduce((a, c) => a + c.qty, 0);
  const sum = cart.reduce((a, c) => a + c.price * c.qty, 0);
  const sheetOpen = state.qrSheet && count > 0;

  const cats = CATEGORIES.map(([id, name]) => {
    const active = cat === id;
    const style = active
      ? 'flex:none;padding:9px 17px;border-radius:9999px;border:none;cursor:pointer;font-family:inherit;font-size:13.5px;font-weight:700;background:#16234A;color:#fff;white-space:nowrap;'
      : 'flex:none;padding:9px 17px;border-radius:9999px;border:1px solid #D6DCE6;cursor:pointer;font-family:inherit;font-size:13.5px;font-weight:600;background:#FFFFFF;color:#5E6A85;white-space:nowrap;';
    return `<button data-action="qr:cat" data-val="${id}" style="${style}">${esc(name)}</button>`;
  }).join('');

  const items = MENU.filter(m => m.cat === cat).map((m, i) => {
    const off = is86(m.id, state);
    const ts = m.tag ? tagStyle(m.tag) : null;
    const tag = off
      ? `<span style="font-size:9.5px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#B23A2A;background:#F9E9E6;padding:2px 7px;border-radius:9999px;">Agotado</span>`
      : (m.tag ? `<span style="font-size:9.5px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${ts.fg};background:${ts.bg};padding:2px 7px;border-radius:9999px;">${esc(m.tag)}</span>` : '');
    return `<div style="display:flex;gap:14px;align-items:center;${off ? 'opacity:.55;' : ''}">
      <div style="width:84px;height:84px;flex:none;border-radius:16px;background:${GRADS[i % GRADS.length]};position:relative;overflow:hidden;box-shadow:0 4px 12px rgba(20,32,55,.12);">
        ${chevron(58, '#fff', 0.28)}
      </div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:16px;font-weight:700;color:#142037;">${esc(m.name)}</span>
          ${tag}
        </div>
        <div style="font-size:13px;color:#94A0B6;line-height:1.4;margin-top:3px;">${esc(m.desc)}</div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;">
          <span style="font-family:var(--font-serif);font-size:18px;font-weight:600;color:#142037;font-variant-numeric:tabular-nums;">${clp(m.price)}</span>
          <button data-action="qr:add" data-id="${m.id}"${off ? ' disabled aria-disabled="true"' : ''} aria-label="Agregar ${esc(m.name)}" style="display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border:none;border-radius:11px;background:${off ? '#C7CEDA' : '#0C7C88'};color:#fff;cursor:${off ? 'not-allowed' : 'pointer'};box-shadow:0 3px 10px rgba(12,124,136,.3);"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg></button>
        </div>
      </div>
    </div>`;
  }).join('');

  const cartBar = count > 0 ? `
    <div style="position:absolute;bottom:16px;left:16px;right:16px;z-index:6;">
      <button data-action="qr:open" class="qr-cartbar" style="display:flex;align-items:center;gap:12px;width:100%;padding:13px 16px 13px 18px;background:#142037;color:#fff;border:none;cursor:pointer;font-family:inherit;border-radius:16px;box-shadow:0 14px 34px rgba(11,19,38,.4);transition:transform .15s;">
        <span style="display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:28px;padding:0 8px;border-radius:9999px;background:#0C7C88;font-size:13.5px;font-weight:700;font-variant-numeric:tabular-nums;">${count}</span>
        <span style="flex:1;text-align:left;font-size:14.5px;font-weight:600;">Ver pedido</span>
        <span style="font-family:var(--font-serif);font-size:18px;font-weight:600;font-variant-numeric:tabular-nums;">${clp(sum)}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7FE0CF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>` : '';

  const sheet = sheetOpen ? `
    <div data-action="qr:close" style="position:absolute;inset:0;z-index:8;background:rgba(11,19,38,0.45);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);"></div>
    <div style="position:absolute;bottom:0;left:0;right:0;z-index:9;background:#FFFFFF;border-radius:26px 26px 34px 34px;box-shadow:0 -14px 44px rgba(11,19,38,.34);max-height:88%;display:flex;flex-direction:column;animation:triadaSheetUp .32s cubic-bezier(.22,.61,.36,1);">
      <div style="padding:14px 20px 10px;border-bottom:1px solid #F0F2F6;">
        <div style="width:38px;height:4px;border-radius:9999px;background:#D6DCE6;margin:0 auto 12px;"></div>
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div style="font-family:var(--font-serif);font-size:21px;font-weight:600;color:#142037;">Tu pedido</div>
          <button data-action="qr:close" aria-label="Cerrar" style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;border:1px solid #E5E9F0;background:#FFFFFF;border-radius:9px;cursor:pointer;color:#5E6A85;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
        </div>
      </div>
      <div style="flex:1;overflow-y:auto;padding:8px 20px;">
        ${cart.map(c => `
          <div style="display:flex;align-items:center;gap:12px;padding:13px 0;border-bottom:1px solid #F0F2F6;">
            <div style="flex:1;min-width:0;">
              <div style="font-size:14.5px;font-weight:600;color:#142037;">${esc(c.name)}</div>
              <div style="font-size:13px;color:#94A0B6;font-variant-numeric:tabular-nums;margin-top:2px;">${clp(c.price * c.qty)}</div>
            </div>
            <div style="display:flex;align-items:center;gap:4px;">
              <button data-action="qr:dec" data-id="${c.id}" aria-label="Quitar uno" style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;border:1px solid #D6DCE6;background:#FFFFFF;border-radius:9px;cursor:pointer;color:#5E6A85;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14"/></svg></button>
              <span style="min-width:24px;text-align:center;font-size:15px;font-weight:700;color:#142037;font-variant-numeric:tabular-nums;">${c.qty}</span>
              <button data-action="qr:inc" data-id="${c.id}" aria-label="Agregar uno" style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;border:1px solid #A8D8DC;background:#ECF7F8;border-radius:9px;cursor:pointer;color:#0C7C88;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button>
            </div>
          </div>`).join('')}
      </div>
      <div style="padding:16px 20px 24px;border-top:1px solid #E5E9F0;background:#FBFCFD;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
          <span style="font-size:14px;font-weight:600;color:#5E6A85;">Total</span>
          <span style="font-family:var(--font-serif);font-size:24px;font-weight:600;color:#142037;font-variant-numeric:tabular-nums;">${clp(sum)}</span>
        </div>
        <button data-action="qr:send" style="display:flex;align-items:center;justify-content:center;gap:9px;width:100%;height:52px;border:none;cursor:pointer;font-family:inherit;font-size:16px;font-weight:700;color:#fff;background:#0C7C88;border-radius:14px;box-shadow:0 6px 16px rgba(12,124,136,.3);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z"/></svg>Enviar pedido al mesero
        </button>
        <div style="text-align:center;font-size:12px;color:#94A0B6;margin-top:10px;">Un mesero confirmará tu pedido en la mesa 7</div>
      </div>
    </div>` : '';

  return `<div data-screen="menuqr" style="min-height:100vh;background:radial-gradient(circle at 30% 0%, #ECF7F8, #E7EBF1 60%);display:flex;justify-content:center;padding:32px 16px 48px;">
    <div style="width:392px;max-width:100%;background:#0B1326;border-radius:44px;padding:11px;box-shadow:0 30px 70px rgba(20,32,55,.28);align-self:flex-start;">
      <div style="position:relative;background:#FFFFFF;border-radius:34px;overflow:hidden;height:788px;">
        <div style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:134px;height:26px;background:#0B1326;border-radius:0 0 16px 16px;z-index:5;"></div>

        <div style="height:100%;overflow-y:auto;">
          <!-- Hero -->
          <div style="position:relative;padding:40px 22px 22px;background:linear-gradient(150deg, #16234A, #0F1933);color:#fff;overflow:hidden;">
            <div style="position:absolute;right:-30px;top:-10px;opacity:0.16;"><svg width="180" height="180" viewBox="0 0 120 120" fill="none"><path d="M26 90 L60 62 L94 90" stroke="#7FE0CF" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path d="M26 73 L60 45 L94 73" stroke="#7FE0CF" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path d="M26 56 L60 28 L94 56" stroke="#7FE0CF" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <div style="position:relative;">
              <div style="display:inline-flex;align-items:center;gap:7px;padding:5px 12px;background:rgba(127,224,207,0.14);border:1px solid rgba(127,224,207,0.25);border-radius:9999px;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#7FE0CF;margin-bottom:14px;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v.01M21 21v-3M14 21h3"/></svg>Mesa 7 · Menú digital
              </div>
              <h1 style="margin:0;color:#FFFFFF;font-family:var(--font-serif);font-optical-sizing:auto;font-size:36px;font-weight:500;letter-spacing:-0.02em;line-height:1.04;">Restaurante Tríada<span style="color:#2BA0AB;">.</span></h1>
              <p style="margin:8px 0 0;font-size:14px;color:#AEB9D4;line-height:1.5;">Cocina internacional · Talca. Toca un plato para agregarlo a tu pedido y un mesero lo confirmará.</p>
            </div>
          </div>

          <!-- Promo -->
          <div style="padding:16px 18px 4px;">
            <div style="display:flex;align-items:center;gap:13px;padding:14px 16px;background:linear-gradient(120deg, #F8F0DD, #FBF6E8);border:1px solid #E6CF93;border-radius:16px;">
              <div style="width:42px;height:42px;flex:none;border-radius:12px;background:#B8893B;display:flex;align-items:center;justify-content:center;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12v8H4v-8M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7ZM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7Z"/></svg></div>
              <div style="flex:1;">
                <div style="font-size:14.5px;font-weight:700;color:#142037;">Promo del día · 2×1 en limonadas</div>
                <div style="font-size:12.5px;color:#9A6B12;font-weight:600;">Válido hasta las 19:00 hrs</div>
              </div>
            </div>
          </div>

          <!-- Category chips -->
          <div style="position:sticky;top:0;z-index:4;display:flex;gap:8px;padding:14px 18px;background:rgba(255,255,255,0.94);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);overflow-x:auto;border-bottom:1px solid #F0F2F6;">
            ${cats}
          </div>

          <!-- Items -->
          <div style="padding:14px 18px 120px;display:flex;flex-direction:column;gap:14px;">
            ${items}
          </div>
        </div>

        ${cartBar}
        ${sheet}
      </div>
    </div>
  </div>`;
}
