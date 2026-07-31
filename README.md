# Tríada CRM — Diagnóstico Empresarial 360

CRM de la consultora **Tríada** para gestionar el ciclo completo de consultoría:
captar el lead desde la web, repartir las áreas del cliente entre el equipo y
producir el **Informe Ejecutivo 360**.

> **Flujo del negocio:** el cliente llena el formulario de contacto (web) →
> el lead entra al CRM → el equipo se divide las áreas (Tecnología, Ventas,
> Finanzas) → se ejecuta el Diagnóstico 360 → se genera el Informe Ejecutivo →
> se envía la propuesta.

## Stack

- **Frontend:** Vanilla JS (ES Modules), sin frameworks ni build step.
- **Datos:** **Supabase** (Postgres + Auth + RLS multitenant). Capa aislada en
  `js/db.js` (repositorios) y `js/mappers.js` (snake_case ↔ camelCase).
  Migraciones espejadas en `supabase/*.sql`.
- **Deploy:** GitHub Pages desde `main`. Los assets enlazados llevan sello de
  caché (`npm run stamp`); sin él, un `.css`/`.js` modificado se sirve viejo.
- **PWA:** `manifest.json` + app móvil en `movil/`.

## Estructura

```
app.js                 Orquestador: navegación, router de vistas, API global
index.html             Shell de la app
manifest.json          PWA
styles.css             Design system (paleta Tríada)
js/
  db.js                Capa de datos (repositorios Supabase)
  mappers.js           Transformaciones puras fila ↔ dominio
  state.js             Estado de UI (no persistido)
  utils.js             Helpers + constantes de dominio (etapas, áreas, preguntas)
  format.js            Normalización de RUT, teléfono, email y montos
modules/
  home/                Panel principal (KPIs, citas, mini-funnel)
  pipeline/            Embudo de prospectos (kanban + lista, 8 etapas)
  diagnosticos/        Diagnóstico 360 por área (Tecnología, Ventas, Finanzas)
  agenda/              Citas
  propuestas/          Propuestas y valores
  contratos/           Generación de contratos desde plantillas de marca
  oportunidades/       Oportunidades Públicas (Mercado Público / Compra Ágil)
  erp/                 Operación: proyectos, horas, gastos, caja, nómina
  financiero/          Análisis financiero asistido
  informes/            Analítica de conversión
  informe-ejecutivo/   Motor del Informe Ejecutivo 360 (engine + charts + viewer)
  configuracion/       Perfil, tema, import/export
  modals/              Modales compartidos
supabase/              Migraciones SQL espejadas (+ rollback por fase)
movil/                 PWA móvil
tools/                 Utilidades de build del informe (standalone)
```

## Desarrollo local

```bash
npx serve -l 5174 .
# abrir http://localhost:5174
npm test          # tests unitarios (Node test runner)
```

Sin build step. Backend: Supabase (Postgres + Auth + RLS). Ver `docs/HANDOFF.md` para estado y pendientes.

## Gobernanza (agentes IA y equipo)

| Archivo | Contenido |
|---------|-----------|
| [`AGENTS.md`](AGENTS.md) | Estándar de ingeniería: DoD, anti-patrones, CI, remediación TRIADA |
| [`SECURITY.md`](SECURITY.md) | Threat model, RLS, XSS, secretos, checklist pre-deploy |
| [`docs/HANDOFF.md`](docs/HANDOFF.md) | Estado vivo del proyecto |
| [`docs/OPORTUNIDADES_PUBLICAS.md`](docs/OPORTUNIDADES_PUBLICAS.md) | Módulo de Mercado Público: instalación, tablas, permisos y fases |

## Áreas de diagnóstico

| Área | Foco |
|---|---|
| 🖥️ Tecnología | Integración de sistemas, automatización, datos centralizados |
| 📈 Ventas | Proceso comercial, seguimiento, conversión, CRM |
| 💰 Finanzas | Márgenes, flujo de caja, costos, rentabilidad |

## Roadmap

- [ ] Auditoría de eficiencia y funcionalidad (web + CRM)
- [ ] Integrar formulario de contacto e Informe 360 dentro del CRM
- [ ] Login (autenticación) para protección de datos
- [ ] Agendas por persona y recursos/herramientas por área
- [ ] Migración a Supabase (multi-usuario, RLS)

---
CRM comercial anterior (planes educativos) preservado en `CRM-COMERCIAL-V1.6/`.
