/* ============================================================
   BARBERÍA TRIADA · data.js
   Datos de la demo (catálogo, cartera, finanzas). En producción
   esto viene de Supabase (ver supabase/02_barberia.sql). Acá vive
   como datos de ejemplo para que la demo funcione sin backend.
   Expuesto como window.BT_DATA (script clásico, sin módulos, para
   que el index.html abra incluso por doble-clic, sin servidor).
   ============================================================ */
window.BT_DATA = (function () {
  // ── Paletas de acento (personalización por cliente) ──────────
  const PAL = {
    teal:    { name: 'Tríada Teal',     a: '#0C7C88', h: '#0A626C', soft: '#ECF7F8', c100: '#D3EBED', d700: '#084E56', fg: '#fff' },
    burdeos: { name: 'Burdeos',         a: '#9B2D3A', h: '#7E222D', soft: '#F8ECEE', c100: '#EFD3D8', d700: '#5E1A22', fg: '#fff' },
    naranja: { name: 'Naranja quemado', a: '#C2611A', h: '#A04E12', soft: '#FBF1E7', c100: '#F2DCC4', d700: '#7E3D0E', fg: '#fff' },
    cobre:   { name: 'Cobre',           a: '#B8893B', h: '#976E2C', soft: '#F8F1E4', c100: '#EFE0C4', d700: '#6E5220', fg: '#fff' },
    bosque:  { name: 'Verde bosque',    a: '#2E7D52', h: '#246340', soft: '#E8F2EC', c100: '#CBE4D5', d700: '#184A2E', fg: '#fff' },
    cobalto: { name: 'Azul cobalto',    a: '#2456C7', h: '#1C45A1', soft: '#EAF0FC', c100: '#CCD9F4', d700: '#163578', fg: '#fff' },
    violeta: { name: 'Violeta',         a: '#6D4AC0', h: '#583B9C', soft: '#F0ECFA', c100: '#DCD2F1', d700: '#3F2A73', fg: '#fff' },
    grafito: { name: 'Grafito',         a: '#3A4556', h: '#2A3344', soft: '#EEF0F3', c100: '#D6DBE2', d700: '#222A38', fg: '#fff' }
  };
  const PORDER = ['teal', 'burdeos', 'naranja', 'cobre', 'bosque', 'cobalto', 'violeta', 'grafito'];

  // ── Fondos / temas (neutrales) ───────────────────────────────
  const THEMES = {
    mineral: { name: 'Mineral', bg: '#F4F6F8', sf: '#FFFFFF', sf2: '#F0F2F6', ink: '#142037', tx: '#2A3553', tx2: '#5E6A85', tx3: '#94A0B6', bd: '#E5E9F0', bd2: '#D6DCE6', hair: '#EEF0F4' },
    calido:  { name: 'Cálido',  bg: '#F6F1E9', sf: '#FFFFFF', sf2: '#F1EBE0', ink: '#2A2018', tx: '#4A3D30', tx2: '#7A6B58', tx3: '#A8987F', bd: '#EAE0D2', bd2: '#DDD0BC', hair: '#F0E9DC' },
    frio:    { name: 'Frío',    bg: '#EDF1F6', sf: '#FFFFFF', sf2: '#E6ECF3', ink: '#142037', tx: '#2A3553', tx2: '#5E6A85', tx3: '#94A0B6', bd: '#DDE5EF', bd2: '#CCD7E5', hair: '#E7EDF4' },
    perla:   { name: 'Perla',   bg: '#F1F0F3', sf: '#FFFFFF', sf2: '#EAE9EE', ink: '#1B1A22', tx: '#34323D', tx2: '#65636F', tx3: '#9B99A5', bd: '#E4E2E8', bd2: '#D5D3DB', hair: '#ECEAF0' },
    oscuro:  { name: 'Oscuro',  bg: '#0B1220', sf: '#111A2C', sf2: '#16223A', ink: '#ECF1FA', tx: '#C5D0E4', tx2: '#8C99B5', tx3: '#5C6B8A', bd: '#233351', bd2: '#2E4063', hair: '#1E2C48' }
  };
  const THORDER = ['mineral', 'calido', 'frio', 'perla', 'oscuro'];

  // ── Estilo de íconos (tiles) ─────────────────────────────────
  const ICONS = {
    acento:  { name: 'Acento',  bg: 'var(--accent-soft)', fg: 'var(--accent-700)', chip: 'var(--accent)' },
    relleno: { name: 'Relleno', bg: 'var(--accent)',      fg: 'var(--accent-fg)',  chip: 'var(--accent)' },
    neutro:  { name: 'Neutro',  bg: 'var(--surface2)',    fg: 'var(--ink)',        chip: '#94A0B6' }
  };
  const IORDER = ['acento', 'relleno', 'neutro'];

  // ── Catálogo de servicios ────────────────────────────────────
  const SERV = [
    { id: 'corte', n: 'Corte',              d: '30 min', p: 12000, desc: 'Tijera y máquina, lavado incluido' },
    { id: 'cb',    n: 'Corte + barba',      d: '45 min', p: 18000, desc: 'Corte completo + perfilado y toalla caliente' },
    { id: 'barba', n: 'Perfilado de barba', d: '25 min', p: 9000,  desc: 'Diseño, navaja y aceite' },
    { id: 'afe',   n: 'Afeitado clásico',   d: '30 min', p: 11000, desc: 'Navaja, toalla caliente y bálsamo' },
    { id: 'nino',  n: 'Corte niño',         d: '25 min', p: 9000,  desc: 'Hasta 12 años' },
    { id: 'lin',   n: 'Diseño / líneas',    d: '40 min', p: 14000, desc: 'Freestyle, fades y detalles' }
  ];

  // ── Cartera de clientes (CRM) ────────────────────────────────
  const CLI = [
    { n: 'Diego Soto',       tel: '+56 9 8123 4567', last: 'hace 2 sem',  visits: 14, spent: 182000, fav: 'Corte + barba',   notas: 'Máquina 1.5 a los lados. Siempre puntual.',          risk: false },
    { n: 'Felipe Rojas',     tel: '+56 9 7644 1290', last: 'hace 5 días',  visits: 9,  spent: 121000, fav: 'Corte',           notas: 'Conversador, hincha de Colo-Colo.',                  risk: false },
    { n: 'Camilo Vera',      tel: '+56 9 9012 8833', last: 'hace 1 mes',   visits: 21, spent: 298000, fav: 'Corte + barba',   notas: 'Cliente fiel desde 2023. Trátalo VIP.',              risk: true },
    { n: 'Tomás Díaz',       tel: '+56 9 6233 7781', last: 'hace 3 días',  visits: 4,  spent: 48000,  fav: 'Afeitado clásico', notas: 'Nuevo, llegó por Instagram.',                        risk: false },
    { n: 'Sebastián Lagos',  tel: '+56 9 8890 2245', last: 'hace 6 sem',   visits: 17, spent: 236000, fav: 'Diseño / líneas',  notas: 'Pide diseños, trae referencias. Reactivar.',         risk: true },
    { n: 'Andrés Pinto',     tel: '+56 9 5567 9034', last: 'hace 12 días', visits: 7,  spent: 94000,  fav: 'Corte',           notas: 'Reagenda seguido, recordarle el día antes.',         risk: false }
  ];

  // ── Datasets estáticos del CRM ───────────────────────────────
  const REV = { vals: [210, 180, 250, 160, 290, 340, 150], lbls: ['L', 'M', 'M', 'J', 'V', 'S', 'D'] };
  const PROX = [
    { h: '15:00', name: 'Diego Soto',  svc: 'Corte + barba' },
    { h: '15:45', name: 'Tomás Díaz',  svc: 'Afeitado clásico' },
    { h: '17:15', name: 'Camilo Vera', svc: 'Corte + barba' },
    { h: '18:45', name: 'Felipe Rojas', svc: 'Corte' }
  ];
  const AGENDA_BASE = [
    { time: '10:00', busy: true,  who: 'Felipe Rojas',    svc: 'Corte',           dur: '30m' },
    { time: '10:45', busy: false },
    { time: '11:30', busy: true,  who: 'Martín Soto',     svc: 'Corte niño',      dur: '25m' },
    { time: '12:15', busy: false },
    { time: '13:00', busy: true,  who: 'Ignacio Pérez',   svc: 'Afeitado clásico', dur: '30m' },
    { time: '15:00', busy: true,  who: 'Diego Soto',      svc: 'Corte + barba',   dur: '45m' },
    { time: '15:45', busy: false },
    { time: '16:30', busy: true,  who: 'Camilo Vera',     svc: 'Corte + barba',   dur: '45m' },
    { time: '17:15', busy: false },
    { time: '18:00', busy: true,  who: 'Sebastián Lagos', svc: 'Diseño / líneas', dur: '40m' },
    { time: '18:45', busy: false },
    { time: '19:30', busy: true,  who: 'Andrés Pinto',    svc: 'Corte',           dur: '30m' }
  ];
  const WEEK = { lbl: ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'], num: ['16', '17', '18', '19', '20', '21', '22'], full: ['Lun 16', 'Mar 17', 'Mié 18', 'Jue 19', 'Vie 20', 'Sáb 21', 'Dom 22'] };
  const GASTOS = [
    { n: 'Arriendo local',       v: 450000 },
    { n: 'Insumos y productos',  v: 220000 },
    { n: 'Servicios básicos',    v: 90000 },
    { n: 'Marketing / RRSS',     v: 60000 }
  ];
  const SHARE = [
    { n: 'Corte', v: 38 }, { n: 'Corte + barba', v: 31 }, { n: 'Barba', v: 12 },
    { n: 'Afeitado', v: 9 }, { n: 'Niño', v: 6 }, { n: 'Líneas', v: 4 }
  ];
  const OCC = { vals: [40, 55, 62, 48, 30, 0, 58, 70, 82, 95, 55], h: ['10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'] };
  const RECS = [
    'Sube $1.000 el corte + barba: tu demanda lo soporta y suma ~$96.000/mes.',
    'Publica los cupos del viernes en Instagram el miércoles — es cuando más reservan.',
    'Ofrece pack 4 cortes a Camilo y Sebastián para reducir su riesgo de fuga.'
  ];
  const COURSE_MODS = [
    { n: '01 · Fundamentos',       desc: 'Higiene, herramientas, anatomía capilar y atención al cliente.' },
    { n: '02 · Técnicas de corte', desc: 'Tijera, máquina, fades y degradados sobre modelos.' },
    { n: '03 · Barba y afeitado',  desc: 'Diseño, navaja, toalla caliente y el ritual completo.' },
    { n: '04 · Negocio y marca',   desc: 'Precios, agenda, RRSS y fidelización con Tríada.' }
  ];
  const SLOTS = ['10:00', '10:45', '11:30', '12:15', '13:00', '15:00', '15:45', '16:30', '17:15', '18:00', '18:45', '19:30'];
  const SLOTS_TAKEN = { '11:30': 1, '13:00': 1, '16:30': 1 };
  const SESS_DATES = ['12 jun', '22 may', '30 abr', '2 abr'];

  // Configuración del negocio (en producción → tabla `orgs` / settings)
  const SHOP = {
    name: 'Barbería Triada',
    whatsapp: '56912345678',
    domain: 'barberiatriada.cl',
    address: 'Av. Providencia 1572, local 4',
    comuna: 'Providencia · Metro Manuel Montt',
    coursePrice: '$290.000',
    courseCuota: '3 cuotas de $98.000'
  };

  return { PAL, PORDER, THEMES, THORDER, ICONS, IORDER, SERV, CLI, REV, PROX,
    AGENDA_BASE, WEEK, GASTOS, SHARE, OCC, RECS, COURSE_MODS, SLOTS, SLOTS_TAKEN,
    SESS_DATES, SHOP };
})();
