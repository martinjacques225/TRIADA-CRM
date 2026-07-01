# demos/ — Vitrina de demos (publicadas junto a la app)

Estas son **copias estáticas** (snapshots) de las plantillas de producto de Tríada,
servidas en el mismo despliegue de GitHub Pages que el CRM para que la sección
**"Demos"** de la PWA móvil (`movil/` → Más → Demos) las abra a pantalla completa,
con todas sus funciones, sin depender de terceros (Vercel, etc.).

| Carpeta | Demo | Repo canónico |
|---|---|---|
| `conserje/`   | Conserje IA con trIA (demo del Motor 1 · WhatsApp 24/7 + llamadas + agenda, **simulada** — mockup de teléfono con chat guionizado → resultado en el CRM, sin backend ni API) | — (standalone, `demos/conserje/index.html`) |
| `remodela/`   | Simulador de Remodelación con trIA (demo del Motor 3 visual · Ola 3 · slider antes/después + selector de **espacio** (living/cocina/dormitorio/local) y de estilo + propuesta con materiales y presupuesto; imágenes IA, sin backend ni API) | — (standalone, `demos/remodela/index.html` + `img/`) |
| `documentos/` | Generador de Documentos con trIA (demo del Motor 3 / Imprenta IA · Ola 3 · cotización/contrato/carta/recibo con marca editable en vivo + "redactar con trIA" + descargar PDF vía print; sin backend ni API) | — (standalone, `demos/documentos/index.html`) |
| `academia/`   | Academia Online con trIA (demo · Ola 3 · LMS de cursos: temario + video-lecciones + tutor trIA con Q&A + progreso + certificado al finalizar; sin backend ni API) | — (standalone, `demos/academia/index.html`) |
| `tienda/`     | Tienda Online con trIA (demo · Ola 4 · ecommerce: marca editable + catálogo + buscador trIA + carrito + checkout + confirmación; productos ilustrados, sin backend ni cobros reales) | — (standalone, `demos/tienda/index.html`) |
| `inventario/` | Control de Inventario con trIA (demo · Ola 4 · panel de stock: KPIs valor/quiebre/por-agotarse + tabla con ajuste +/− en vivo + alertas y reposición sugerida por trIA; sin backend) | — (standalone, `demos/inventario/index.html`) |
| `encuestas/`  | Encuestas con trIA (demo · Ola 4 · satisfacción + NPS: responder (estrellas/NPS/opciones/comentario) → resultados en vivo (distribución, NPS, lo más valorado, comentarios) + resumen de trIA; sin backend) | — (standalone, `demos/encuestas/index.html`) |
| `proyectos/`  | Gestión de Proyectos con trIA (demo · Ola 4 · tablero kanban 4 columnas con drag&drop + flechas, tareas con responsable/prioridad/plazo, barra de avance y resumen de trIA en vivo; sin backend) | — (standalone, `demos/proyectos/index.html`) |
| `analizador/` | Analizador Comercial con trIA (demo del Motor 2 · Ola 4 · lee el embudo de ventas → salud comercial + ventas en riesgo en vivo, cuello de botella, hallazgos con plan y ranking del equipo; datos de ejemplo, sin backend) | — (standalone, `demos/analizador/index.html`) |
| `documental/` | Centro Documental con trIA (demo del Motor 4 / Bóveda · Ola 4 · gestor documental con **permisos por rol** en vivo: cambias Administración/RRHH/Finanzas/Colaborador → se reservan/bloquean documentos; KPIs, buscador, filtro por categoría, visor y subir; datos de ejemplo, sin backend) | — (standalone, `demos/documental/index.html`) |
| `contratacion/` | Contratación Inteligente con trIA (demo del Motor 2 · Ola 4 · rankea candidatos según criterios ponderables: mueves el peso de experiencia/habilidades/prueba/entrevista → el **ranking se reordena en vivo**; ficha por candidato con fortalezas/banderas/resumen trIA + agendar/descartar; datos de ejemplo, sin backend) | — (standalone, `demos/contratacion/index.html`) |
| `compras/`    | Gestión de Compras con trIA (demo del Motor 2 · Ola 4 · compara cotizaciones por precio/plazo/garantía/reputación → **índice trIA** + análisis de mercado + ahorro; cantidad editable y **agregar cotización** recalculan en vivo, recomienda al mejor —no siempre el más barato—; datos de ejemplo, sin backend) | — (standalone, `demos/compras/index.html`) |
| `pedidos/`    | Pedidos Online con trIA (demo Foundation · Ola 4 · carta digital de un local: menú por categorías + buscador + carrito (qty/subtotal) + retiro/delivery + tip de trIA → **seguimiento del pedido en vivo** (recibido→en cocina→en camino→entregado) con timeline animado y ETA; datos de ejemplo, sin backend ni cobros) | — (standalone, `demos/pedidos/index.html`) |
| `auditor/`    | Auditor de Imagen Corporativa con trIA (demo del Motor 2 · autodiagnóstico interactivo → informe con puntaje, sin backend) | — (standalone, `demos/auditor/index.html`) |
| `gemelo/`     | Gemelo Virtual con trIA (demo del Motor 2 · simulador interactivo de decisiones, sin backend) | — (standalone, `demos/gemelo/index.html`) |
| `fugas/`      | Detección de Fugas con trIA (demo del Motor 2 · datos de ejemplo, sin backend) | — (standalone, `demos/fugas/index.html`) |
| `restaurant/` | CRM de Restaurantes (4 roles: Admin · Mesero · Cocina KDS · Cajero) | `TRIADA-CRM-RESTAURANT-TEMPLATE` |
| `barberia/`   | Barbería Triada (web · reservas · cursos · CRM, con trIA)          | `BARBER-TEMPLATE` |

En vivo:
- https://martinjacques225.github.io/TRIADA-CRM/demos/restaurant/
- https://martinjacques225.github.io/TRIADA-CRM/demos/barberia/

## Cómo actualizar un snapshot
Son front 100% estático (sin build). Para refrescar una demo, copia el front del
repo canónico encima de su carpeta (sin `.git/`, `README.md` ni `supabase/*.sql`):

```bash
# Restaurant
cp -r TRIADA-CRM-RESTAURANT-TEMPLATE/{index.html,css,js,assets} TRIADA-CRM/demos/restaurant/
# Barbería
cp -r BARBER-TEMPLATE/{index.html,assets} TRIADA-CRM/demos/barberia/
```

> ⚠️ **Barbería — tras refrescar, vacía las llaves de `barberia/assets/js/config.js`.**
> La app de la Barbería bloquea TODA la demo tras un login cuando hay Supabase conectado
> (`app.js`: `v.locked = BT_DB.ready && !authed`). Esta copia corre en **modo demo local**
> (llaves vacías → `BT_DB.ready=false` → sin login → todo navegable). Si copias el front
> canónico encima, vuelve el `config.js` con backend real y **reaparece el muro de login**:
> deja `supabaseUrl` y `supabaseAnonKey` en `''`.

> ℹ️ **Barbería — modo compacto (móvil) ya en sync con el canónico (2026-06-25).**
> El showcase canónico era solo de escritorio (riel + marco de dispositivo de ancho fijo) y se
> desordenaba/​desbordaba en el teléfono (y el modo "Notebook" colapsaba). El fix = **modo compacto**
> (`window.innerWidth < 820`) en `assets/js/app.js` (`compute`) y `assets/js/app.render2.js`
> (`buildCompact`/`compactTopBar`/`compactMenu` + `ACT.menu/closeMenu/navMenu` + listener de `resize`):
> a pantalla completa, sin riel ni marco, con navegación/personalización en una hoja "Menú".
> **Ya está acá Y en el canónico `BARBER-TEMPLATE` (commit `ce284d6`)** → re-vendorizar es seguro para
> este fix; lo ÚNICO que siempre hay que rehacer al re-vendorizar es vaciar las llaves del `config.js`.

> La lista de demos que aparece en la app se controla en `movil/js/screens/demos.js`
> (constante `DEMOS`). Agregar una demo = vendorizar su front acá + una entrada ahí.
