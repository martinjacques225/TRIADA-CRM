# demos/ — Vitrina de demos (publicadas junto a la app)

Estas son **copias estáticas** (snapshots) de las plantillas de producto de Tríada,
servidas en el mismo despliegue de GitHub Pages que el CRM para que la sección
**"Demos"** de la PWA móvil (`movil/` → Más → Demos) las abra a pantalla completa,
con todas sus funciones, sin depender de terceros (Vercel, etc.).

| Carpeta | Demo | Repo canónico |
|---|---|---|
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
