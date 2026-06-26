/* ============================================================================
   data.js · Datos de demostración coherentes (reemplazar por reales en prod)
   Restaurante Triada · Talca · cocina internacional · CLP · es-CL
   Modelo y semilla portados del prototipo de Claude Design.
   ========================================================================== */

export const WAITERS = ['Camila Soto','Matías Rojas','Fernanda Díaz','Diego Pérez','Valentina Lagos','Joaquín Muñoz','Antonia Reyes','Sebastián Vera'];

/** Mesera con la "sesión" iniciada en el rol Mesero (demo). */
export const WAITER_ME = 'Camila Soto';

export const zoneOf = (n) => n <= 12 ? 'Salón principal' : n <= 20 ? 'Terraza' : n <= 23 ? 'Barra' : 'Privado';

/** Categorías del menú (orden de UI). */
export const CATEGORIES = [
  ['entradas','Entradas'], ['fondos','Fondos'], ['pastas','Pastas'],
  ['parrilla','Parrilla'], ['postres','Postres'], ['bebidas','Bebidas'], ['vinos','Vinos'],
];

export const MENU = [
  {id:'e1',cat:'entradas',name:'Ceviche de reineta',desc:'Reineta, leche de tigre, cilantro, camote',price:9900,tag:'Popular',insumo:'Reineta fresca'},
  {id:'e2',cat:'entradas',name:'Burrata cremosa',desc:'Tomates reliquia, albahaca, oliva',price:11900,insumo:'Tomate reliquia'},
  {id:'e3',cat:'entradas',name:'Empanadas de queso',desc:'Trío, masa artesanal',price:6900,tag:'Veg'},
  {id:'e4',cat:'entradas',name:'Tabla Tríada',desc:'Quesos, charcutería, encurtidos',price:16900,tag:'Compartir'},
  {id:'f1',cat:'fondos',name:'Lomo saltado',desc:'Salteado, papas rústicas, arroz',price:13900,tag:'Popular'},
  {id:'f2',cat:'fondos',name:'Risotto de hongos',desc:'Carnaroli, hongos, parmesano',price:12900,tag:'Veg',insumo:'Arroz carnaroli'},
  {id:'f3',cat:'fondos',name:'Salmón grillado',desc:'Quinoa, espárragos, beurre blanc',price:15900,insumo:'Salmón'},
  {id:'f4',cat:'fondos',name:'Pollo al curry',desc:'Curry tailandés, arroz jazmín',price:11900},
  {id:'p1',cat:'pastas',name:'Fettuccine Alfredo',desc:'Crema, parmesano, pimienta',price:10900},
  {id:'p2',cat:'pastas',name:'Ravioles de espinaca',desc:'Mantequilla, salvia, nuez',price:11900,tag:'Veg'},
  {id:'p3',cat:'pastas',name:'Lasaña boloñesa',desc:'Carne, bechamel, pomodoro',price:12400},
  {id:'g1',cat:'parrilla',name:'Lomo vetado 300g',desc:'Papas rústicas, chimichurri',price:16900,tag:'Popular',insumo:'Lomo vetado'},
  {id:'g2',cat:'parrilla',name:'Entraña a la parrilla',desc:'Ensalada de estación, pebre',price:15400},
  {id:'g3',cat:'parrilla',name:'Costillar BBQ',desc:'Glaseado casero, coleslaw',price:14900},
  {id:'d1',cat:'postres',name:'Tiramisú',desc:'Café, mascarpone, cacao',price:6400,tag:'Popular',insumo:'Mascarpone'},
  {id:'d2',cat:'postres',name:'Cheesecake maracuyá',desc:'Base de galleta artesanal',price:6900},
  {id:'d3',cat:'postres',name:'Volcán de chocolate',desc:'Helado de vainilla',price:6900},
  {id:'b1',cat:'bebidas',name:'Limonada menta-jengibre',desc:'Jarra 1L',price:4900},
  {id:'b2',cat:'bebidas',name:'Jugo natural',desc:'Naranja o berries',price:3900},
  {id:'b3',cat:'bebidas',name:'Bebida en lata',desc:'Línea Coca-Cola',price:2900},
  {id:'v1',cat:'vinos',name:'Carmenère Reserva',desc:'Valle del Maule · copa o botella',price:18900,insumo:'Carmenère Reserva'},
  {id:'v2',cat:'vinos',name:'Sauvignon Blanc',desc:'Valle de Casablanca',price:16900},
];

const TABLE_SEED = [
  // [num, status, seats, waiterIdx, total, minsAgo]
  [1,'atencion',4,0,38600,42],[2,'libre',2,null,0,0],[3,'atencion',4,1,52200,68],[4,'ocupada',2,0,24900,21],
  [5,'cuenta',6,2,96400,95],[6,'libre',4,null,0,0],[7,'ocupada',4,3,41200,54],[8,'reservada',4,null,0,0],
  [9,'ocupada',2,1,19800,18],[10,'libre',4,null,0,0],[11,'ocupada',6,4,78300,33],[12,'atencion',4,2,33700,47],
  [13,'ocupada',2,5,22100,29],[14,'libre',2,null,0,0],[15,'ocupada',4,3,47600,61],[16,'cuenta',4,6,61400,88],
  [17,'libre',4,null,0,0],[18,'ocupada',2,7,18500,12],[19,'reservada',6,null,0,0],[20,'ocupada',4,5,52900,39],
  [21,'ocupada',2,6,16200,24],[22,'libre',2,null,0,0],[23,'ocupada',4,7,44800,57],[24,'ocupada',6,4,112400,76],[25,'libre',8,null,0,0],
];

const TICKET_SEED = [
  {id:'t1',num:5,items:[{name:'Lomo saltado',qty:2},{name:'Ceviche de reineta',qty:1,note:'Sin cilantro'}],status:'preparacion',waiter:'Fernanda Díaz',mins:8},
  {id:'t2',num:11,items:[{name:'Risotto de hongos',qty:1},{name:'Salmón grillado',qty:2},{name:'Limonada menta-jengibre',qty:2}],status:'nueva',waiter:'Valentina Lagos',mins:2},
  {id:'t3',num:7,items:[{name:'Fettuccine Alfredo',qty:1},{name:'Empanadas de queso',qty:2}],status:'preparacion',waiter:'Diego Pérez',mins:12},
  {id:'t4',num:24,items:[{name:'Costillar BBQ',qty:1},{name:'Lomo vetado 300g',qty:1,note:'Término medio'},{name:'Tabla Tríada',qty:1}],status:'preparacion',waiter:'Valentina Lagos',mins:6},
  {id:'t5',num:3,items:[{name:'Burrata cremosa',qty:1},{name:'Risotto de hongos',qty:1}],status:'lista',waiter:'Matías Rojas',mins:15},
  {id:'t6',num:20,items:[{name:'Pollo al curry',qty:2},{name:'Limonada menta-jengibre',qty:1}],status:'nueva',waiter:'Joaquín Muñoz',mins:1},
  {id:'t7',num:16,items:[{name:'Tiramisú',qty:2},{name:'Volcán de chocolate',qty:1}],status:'lista',waiter:'Antonia Reyes',mins:4},
  {id:'t8',num:13,items:[{name:'Ceviche de reineta',qty:1},{name:'Sauvignon Blanc',qty:2}],status:'preparacion',waiter:'Joaquín Muñoz',mins:9},
  {id:'t9',num:9,items:[{name:'Empanadas de queso',qty:3,note:'Para compartir'}],status:'nueva',waiter:'Matías Rojas',mins:3},
  {id:'t10',num:1,items:[{name:'Lomo vetado 300g',qty:2,note:'Uno término medio'},{name:'Carmenère Reserva',qty:1}],status:'preparacion',waiter:'Camila Soto',mins:7},
  {id:'t11',num:4,items:[{name:'Risotto de hongos',qty:1},{name:'Tiramisú',qty:2}],status:'lista',waiter:'Camila Soto',mins:3},
];

export const INVENTORY = [
  {id:'i1',name:'Reineta fresca',cat:'Pescados',stock:3.5,unit:'kg',min:5,daily:4.2,status:'critico'},
  {id:'i2',name:'Lomo vetado',cat:'Carnes',stock:8,unit:'kg',min:6,daily:5.5,status:'ok'},
  {id:'i3',name:'Arroz carnaroli',cat:'Abarrotes',stock:2,unit:'kg',min:4,daily:1.8,status:'critico'},
  {id:'i4',name:'Hongos portobello',cat:'Verduras',stock:1.8,unit:'kg',min:2,daily:2.1,status:'alerta'},
  {id:'i5',name:'Queso parmesano',cat:'Lácteos',stock:6,unit:'kg',min:3,daily:1.2,status:'ok'},
  {id:'i6',name:'Carmenère Reserva',cat:'Vinos',stock:9,unit:'bot',min:12,daily:6,status:'alerta'},
  {id:'i7',name:'Tomate reliquia',cat:'Verduras',stock:14,unit:'kg',min:5,daily:3.4,status:'ok'},
  {id:'i8',name:'Mascarpone',cat:'Lácteos',stock:1.2,unit:'kg',min:2.5,daily:0.9,status:'critico'},
  {id:'i9',name:'Camote',cat:'Verduras',stock:11,unit:'kg',min:4,daily:2.6,status:'ok'},
  {id:'i10',name:'Salmón',cat:'Pescados',stock:7,unit:'kg',min:5,daily:4.8,status:'ok'},
];

/** CRM de clientes (Admin). */
export const CLIENTS = [
  {id:'c1',name:'Isabel Fuentes',visits:24,spend:612400,freq:'2× / semana',bday:'14 jun',prefs:['Mesa terraza','Carmenère','Sin gluten'],tier:'VIP'},
  {id:'c2',name:'Familia Tapia',visits:18,spend:438900,freq:'Quincenal',bday:'02 ago',prefs:['Mesa 24 privado','Costillar BBQ'],tier:'Frecuente'},
  {id:'c3',name:'Andrés Cáceres',visits:31,spend:884200,freq:'Semanal',bday:'27 jun',prefs:['Barra','Lomo vetado','Sauvignon'],tier:'VIP'},
  {id:'c4',name:'Paula Riquelme',visits:9,spend:198700,freq:'Mensual',bday:'09 jul',prefs:['Vegetariana','Risotto'],tier:'Frecuente'},
  {id:'c5',name:'Grupo Maule SpA',visits:12,spend:1242000,freq:'Eventos',bday:'—',prefs:['Privado','Menú degustación'],tier:'Corporativo'},
  {id:'c6',name:'Tomás Herrera',visits:6,spend:142300,freq:'Ocasional',bday:'21 jun',prefs:['Terraza','Pisco sour'],tier:'Nuevo'},
];

/** Reservas por día (Admin). day = número del día de junio. */
export const RESERVATIONS = [
  {id:'r1',name:'Isabel Fuentes',people:2,time:'13:00',table:8,zone:'Salón',status:'confirmada',phone:'+56 9 8421 0093',day:'13'},
  {id:'r2',name:'Andrés Cáceres',people:4,time:'13:30',table:19,zone:'Terraza',status:'confirmada',phone:'+56 9 7733 1188',day:'13'},
  {id:'r3',name:'Carolina Méndez',people:6,time:'14:00',table:24,zone:'Privado',status:'pendiente',phone:'+56 9 9012 4456',day:'13'},
  {id:'r4',name:'Grupo Maule SpA',people:10,time:'20:30',table:null,zone:'Privado',status:'pendiente',phone:'+56 2 2456 7788',day:'13'},
  {id:'r5',name:'Tomás Herrera',people:2,time:'21:00',table:14,zone:'Terraza',status:'confirmada',phone:'+56 9 6654 2231',day:'13'},
  {id:'r6',name:'Javiera Soto',people:4,time:'21:30',table:null,zone:'Salón',status:'lista de espera',phone:'+56 9 4421 8890',day:'13'},
  {id:'r7',name:'Rodrigo Pinto',people:4,time:'13:30',table:6,zone:'Salón',status:'confirmada',phone:'+56 9 5521 7734',day:'12'},
  {id:'r8',name:'Catalina Vidal',people:2,time:'21:00',table:null,zone:'Terraza',status:'pendiente',phone:'+56 9 8890 1122',day:'12'},
  {id:'r9',name:'Empresa Andes Ltda',people:8,time:'14:00',table:24,zone:'Privado',status:'confirmada',phone:'+56 2 2980 4455',day:'14'},
  {id:'r10',name:'Francisca Soto',people:3,time:'20:30',table:null,zone:'Salón',status:'pendiente',phone:'+56 9 7012 3389',day:'14'},
  {id:'r11',name:'Martín Reyes',people:2,time:'21:30',table:13,zone:'Barra',status:'confirmada',phone:'+56 9 6634 0091',day:'11'},
];

/** Construye el estado inicial fresco (en el navegador, Date.now() está disponible). */
export function seedState() {
  const now = Date.now();
  const min = 60000;

  const tables = TABLE_SEED.map(([num, status, seats, wi, total, mins]) => ({
    id: 'm' + num, num, zone: zoneOf(num), seats, status,
    waiter: wi == null ? null : WAITERS[wi], waiterIdx: wi, total, mins,
  }));

  // Cada comanda guarda su epoch de creación para envejecer timers en vivo.
  const tickets = TICKET_SEED.map(t => ({ ...t, items: t.items.map(i => ({ ...i })), createdAt: now - t.mins * min }));

  // Historial de cocina del turno (comandas ya entregadas, con tiempo de prep).
  const kitchenHistory = [
    { id: 'h1', num: 2,  waiter: 'Camila Soto',    items: [{name:'Lomo saltado',qty:1},{name:'Jugo natural',qty:2}], prepMins: 11, deliveredAt: now - 14 * min },
    { id: 'h2', num: 18, waiter: 'Sebastián Vera',  items: [{name:'Salmón grillado',qty:1},{name:'Burrata cremosa',qty:1}], prepMins: 16, deliveredAt: now - 22 * min },
    { id: 'h3', num: 21, waiter: 'Antonia Reyes',   items: [{name:'Empanadas de queso',qty:2}], prepMins: 7, deliveredAt: now - 31 * min },
    { id: 'h4', num: 9,  waiter: 'Matías Rojas',    items: [{name:'Fettuccine Alfredo',qty:2},{name:'Tiramisú',qty:1}], prepMins: 13, deliveredAt: now - 38 * min },
    { id: 'h5', num: 15, waiter: 'Diego Pérez',     items: [{name:'Costillar BBQ',qty:1}], prepMins: 19, deliveredAt: now - 52 * min },
    { id: 'h6', num: 11, waiter: 'Valentina Lagos', items: [{name:'Pollo al curry',qty:2},{name:'Limonada menta-jengibre',qty:1}], prepMins: 9, deliveredAt: now - 67 * min },
  ];

  // Transacciones ya emitidas en el turno (boletas del cajero).
  const transactions = [
    { folio: 100482, num: 6,  waiter: 'Diego Pérez',     subtotal: 34800, discountPct: 0,  tipPct: 10, tip: 3480, total: 38280, method: 'tarjeta',       items: [{qty:2,name:'Empanadas de queso',price:6900},{qty:1,name:'Lomo saltado',price:13900},{qty:2,name:'Jugo natural',price:3900}], at: now - 26 * min, voided: false },
    { folio: 100479, num: 14, waiter: 'Joaquín Muñoz',   subtotal: 21800, discountPct: 0,  tipPct: 12, tip: 2616, total: 24416, method: 'efectivo',      items: [{qty:1,name:'Risotto de hongos',price:12900},{qty:1,name:'Fettuccine Alfredo',price:10900}], at: now - 44 * min, voided: false },
    { folio: 100475, num: 22, waiter: 'Camila Soto',     subtotal: 58700, discountPct: 10, tipPct: 10, tip: 5283, total: 58113, method: 'transferencia', items: [{qty:2,name:'Lomo vetado 300g',price:16900},{qty:1,name:'Carmenère Reserva',price:18900}], at: now - 71 * min, voided: false },
    { folio: 100470, num: 10, waiter: 'Fernanda Díaz',   subtotal: 16800, discountPct: 0,  tipPct: 0,  tip: 0,    total: 16800, method: 'tarjeta',       items: [{qty:1,name:'Salmón grillado',price:15900}], at: now - 96 * min, voided: true },
  ];

  return {
    // ---- dominio compartido ----
    tables, menu: MENU, tickets, inventory: INVENTORY,
    kitchenHistory, deliveredBase: 80,
    eightySix: { e1: 'Sin reineta fresca en cocina' }, // mapa menuId -> motivo (86 = agotado)

    // ---- cajero ----
    transactions,
    caja: { open: true, fondo: 80000, openedAt: now - 5 * 60 * min, closedAt: null },

    // ---- admin ----
    clients: CLIENTS, reservations: RESERVATIONS,
    adminScreen: 'dashboard', salesMode: 'semana', resDay: '13',
    showResForm: false, resForm: { name: '', people: 2, time: '20:00', zone: 'Salón' },

    // ---- menú QR (cliente final, sin login) ----
    qrCat: 'entradas', qrCart: [], qrSheet: false,

    // ---- UI efímera (no dominio) ----
    toast: null,
  };
}
