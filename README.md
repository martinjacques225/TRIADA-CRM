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
  diagnosticos/        Diagnóstico 360 (8 pilares, escala de madurez 1-5)
  diagnostico-contable/  Diagnóstico Contable y Tributario (prediagnóstico comercial
                       para empresas de mayor complejidad) — independiente del 360:
                       tablas dct_*, cuestionario, puntaje e historial propios
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
| [`docs/DIAGNOSTICO_CONTABLE.md`](docs/DIAGNOSTICO_CONTABLE.md) | Módulo Contable y Tributario: instalación, metodología de puntaje, permisos y pruebas |

## Los dos diagnósticos

Son instrumentos distintos y no comparten datos. Cada uno tiene su tabla, su
cuestionario, su puntaje, su historial y sus estados.

| | Diagnóstico 360 | Diagnóstico Contable y Tributario |
|---|---|---|
| **Para quién** | Pyme que quiere ordenarse | Empresas e industrias de mayor complejidad |
| **Qué mide** | Madurez en 8 pilares (dirección, operación, tecnología, ventas, marketing, finanzas, seguridad, oportunidades) | Salud contable y tributaria declarada |
| **Escala** | Madurez 1 a 5 | 0 a 3 por respuesta, con pesos 3/2/1 |
| **Salida** | Informe Ejecutivo 360 | Informe preliminar + precio inicial en UF |
| **Tabla** | `diagnosticos` | `dct_evaluaciones` |
| **Catálogo** | `js/utils.js` (`DIAG_AREAS`, `DIAG_PREGUNTAS`) | `modules/diagnostico-contable/domain/cuestionario.js` |

El Contable y Tributario es un **prediagnóstico comercial** basado en respuestas
declaradas por el cliente: no es auditoría, certificación ni dictamen, y el
módulo lo dice en pantalla y en el informe. Sus preguntas y ponderaciones viven
en `domain/` para poder ajustarlas sin tocar la interfaz.

## Roadmap

- [ ] Auditoría de eficiencia y funcionalidad (web + CRM)
- [ ] Integrar formulario de contacto e Informe 360 dentro del CRM
- [ ] Login (autenticación) para protección de datos
- [ ] Agendas por persona y recursos/herramientas por área
- [ ] Migración a Supabase (multi-usuario, RLS)

---
CRM comercial anterior (planes educativos) preservado en `CRM-COMERCIAL-V1.6/`.
