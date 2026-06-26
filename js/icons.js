/* TRÍADA CRM — Biblioteca de íconos de línea (reemplaza emojis)
   API:  icon('panel')  ->  '<svg ...>...</svg>'
         icon('panel', 'nav-icon', 20)                                  */
(function () {
  // Inner markup de cada ícono (viewBox 24×24, trazo currentColor)
  const P = {
    panel:    '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    pipeline: '<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="11" rx="1.5"/><rect x="17" y="4" width="4" height="7" rx="1.5"/>',
    agenda:   '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9h18M8 2.5v4M16 2.5v4"/><path d="M8 13h2M14 13h2M8 17h2"/>',
    diag:     '<path d="M3 12h3l2-5 4 11 2.5-7 1.5 3h5"/>',
    informe:  '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 17v-3M12 17v-5M15 17v-2"/>',
    propuesta:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 16.5h4"/>',
    factura:  '<path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"/><path d="M9 7h6M9 11h6M9 15h3"/>',
    informes: '<path d="M4 20V4M4 20h16"/><rect x="7" y="11" width="3" height="6"/><rect x="12" y="7" width="3" height="10"/><rect x="17" y="13" width="3" height="4"/>',
    config:   '<path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h7M15 18h5"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="13" cy="18" r="2"/>',
    user:     '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6"/>',
    users:    '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5"/><path d="M16 5a3.5 3.5 0 0 1 0 7M17.5 14.5c2.6.5 4 2.4 4 5.5"/>',
    search:   '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    bell:     '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M10.5 21a2 2 0 0 0 3 0"/>',
    sun:      '<circle cx="12" cy="12" r="4.5"/><path d="M12 1.5v2.5M12 20v2.5M4 12H1.5M22.5 12H20M5 5l1.8 1.8M17.2 17.2 19 19M19 5l-1.8 1.8M6.8 17.2 5 19"/>',
    moon:     '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/>',
    plus:     '<path d="M12 5v14M5 12h14"/>',
    menu:     '<path d="M3 6h18M3 12h18M3 18h18"/>',
    list:     '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
    kanban:   '<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="11" rx="1.5"/><rect x="17" y="4" width="4" height="7" rx="1.5"/>',
    sliders:  '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1.5 14h5M9.5 8h5M17.5 16h5"/>',
    arrowUR:  '<path d="M7 17 17 7M8 7h9v9"/>',
    arrowR:   '<path d="M5 12h14M13 6l6 6-6 6"/>',
    chevR:    '<path d="m9 6 6 6-6 6"/>',
    chevD:    '<path d="m6 9 6 6 6-6"/>',
    cpu:      '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 2v2.5M15 2v2.5M9 19.5V22M15 19.5V22M2 9h2.5M2 15h2.5M19.5 9H22M19.5 15H22"/>',
    trending: '<path d="M3 17 9.5 10.5l4 4L21 7"/><path d="M15 7h6v6"/>',
    coins:    '<ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3"/><path d="M9 12.9V17c0 1.7 2.7 3 6 3s6-1.3 6-3v-5c0-1.7-2.7-3-6-3"/>',
    sparkle:  '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M18 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
    phone:    '<path d="M6.5 3h-3A1.5 1.5 0 0 0 2 4.6C2 13 11 22 19.4 22a1.5 1.5 0 0 0 1.6-1.5v-3a1.2 1.2 0 0 0-1-1.2l-3.4-.7a1.2 1.2 0 0 0-1.2.5l-1 1.4a13 13 0 0 1-5.6-5.6l1.4-1a1.2 1.2 0 0 0 .5-1.2L8.7 4a1.2 1.2 0 0 0-1.2-1z"/>',
    calClock: '<path d="M20 9.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h6"/><path d="M3 9h17M8 2.5v4M15 2.5v4"/><circle cx="17.5" cy="16.5" r="4.5"/><path d="M17.5 14.8v1.7l1.2 1"/>',
    clipCheck:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><path d="m9 13 2 2 4-4"/>',
    handshake:'<path d="m11 17 2 2a1 1 0 0 0 1.4 0L18 15.4"/><path d="m2 12 3.5-3.5a2 2 0 0 1 2.8 0L12 12l1.5-1.5a2 2 0 0 1 2.8 0L22 16"/><path d="M2 12v4l3 3M22 12v4M14.5 13.5 12 16"/>',
    checkCirc:'<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.3 2.3L16 9"/>',
    xCirc:    '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
    pencil:   '<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/><path d="m14.5 5.5 3 3"/>',
    trash:    '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/><path d="M10 11v6M14 11v6"/>',
    share:    '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.6 6.8-4M8.6 13.4l6.8 4"/>',
    eye:      '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
    fileText: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    fileCheck:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="m9 15 2 2 4-4"/>',
    clock:    '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    mapPin:   '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    mail:     '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6 8.5-6"/>',
    building: '<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 21v-4h6v4M8 7h2M14 7h2M8 11h2M14 11h2"/>',
    target:   '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
    alert:    '<path d="M12 3 2.5 20h19z"/><path d="M12 9v5M12 17.5v.1"/>',
    bulb:     '<path d="M9 18h6M10 21h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.7.6 1 1 1 2.3h6c0-1.3.3-1.7 1-2.3A7 7 0 0 0 12 2z"/>',
    dollar:   '<path d="M12 2v20M17 6.5C17 4.5 14.8 3.5 12 3.5S7 4.6 7 7s2.2 3 5 3.5 5 1.3 5 3.5-2.2 3.5-5 3.5-5-1-5-3"/>',
    layers:   '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5M3 8l9 5 9-5"/>',
    wallet:   '<path d="M3 7a2 2 0 0 1 2-2h13v3"/><path d="M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H5"/><circle cx="16.5" cy="12.5" r="1.3"/>',
    flag:     '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    refresh:  '<path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>',
    logout:   '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    rocket:   '<path d="M5 14c-1.5 1.5-2 5-2 5s3.5-.5 5-2c.9-.9.9-2.3 0-3.2a2.3 2.3 0 0 0-3 .2z"/><path d="M9 12a13 13 0 0 1 9-9c1.7 0 2.2.5 2 2a13 13 0 0 1-9 9z"/><path d="M9 12 7 10M12 15l2-2"/>',
    dot:      '<circle cx="12" cy="12" r="3.5"/>',
    upload:   '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
    chevL:    '<path d="m15 6-6 6 6 6"/>',
    video:    '<rect x="2.5" y="6" width="13" height="12" rx="2"/><path d="m15.5 10 6-3.5v11l-6-3.5z"/>',
    bellRing: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M10.5 21a2 2 0 0 0 3 0"/><path d="M2.5 5.5A6 6 0 0 1 5 2M21.5 5.5A6 6 0 0 0 19 2"/>',
    grid:     '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
    columns:  '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 4v16"/>',
    x:        '<path d="M18 6 6 18M6 6l12 12"/>',
    repeat:   '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
    // ── Pilares del Diagnóstico 360 ──
    compass:  '<circle cx="12" cy="12" r="9"/><path d="m15.6 8.4-2.1 5.1-5.1 2.1 2.1-5.1z"/>',
    workflow: '<rect x="3" y="3" width="7" height="6" rx="1.5"/><rect x="14" y="15" width="7" height="6" rx="1.5"/><path d="M6.5 9v3a2 2 0 0 0 2 2h9"/>',
    megaphone:'<path d="M5 9v6h3l9 4V5L8 9z"/><path d="M19 9.5a3 3 0 0 1 0 5"/>',
    shield:   '<path d="M12 2 4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5z"/><path d="m9 12 2 2 4-4"/>',
    crosshair:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    // Glyph oficial de WhatsApp (burbuja + auricular) — relleno con currentColor
    whatsapp: '<path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.95.51 3.85 1.48 5.52L2 22l4.7-1.23a9.9 9.9 0 0 0 5.34 1.56h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.1.81.83-3.02-.2-.31a8.2 8.2 0 0 1 12.76-10.2 8.13 8.13 0 0 1 2.4 5.79c0 4.54-3.7 8.24-8.23 8.24zm4.52-6.16c-.25-.12-1.47-.72-1.69-.8-.23-.08-.39-.12-.56.12-.17.25-.64.8-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.47c-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29z"/>',
  };
  const FILLED = new Set(['whatsapp']);
  function icon(name, cls, size) {
    const inner = P[name] || P.dot;
    const c = cls ? ` class="${cls}"` : '';
    const s = size ? ` width="${size}" height="${size}"` : '';
    const fl = FILLED.has(name);
    const paint = fl ? 'fill="currentColor" stroke="none"' : 'fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"';
    return `<svg${c}${s} viewBox="0 0 24 24" ${paint} aria-hidden="true">${inner}</svg>`;
  }
  window.icon = icon;
})();
