# AI Commander — Módulo de proyectos de desarrollo asistido por IA

Módulo del TRIADA CRM para **gestionar los proyectos internos de desarrollo
asistido por IA** del equipo. Incluye gestión de proyectos, tareas, Kanban,
Prompt Builder, historial de respuestas de IA y un dashboard de avance.

> **Estado de la IA:** la arquitectura está *preparada* para integrar OpenAI,
> Anthropic y otros, pero **ninguna API de IA está conectada todavía** (a
> propósito). Ejecutar un prompt registra el evento con estado `no_conectado`
> sin realizar ninguna petición de red.

## Cómo activarlo

1. En Supabase → **SQL Editor** → pega y corre `supabase/ai_commander.sql`
   (requiere haber corrido antes `supabase/schema.sql`).
2. Recarga el CRM. Aparece **AI Commander** en el menú (sección *Desarrollo*).

Hasta correr el SQL, el módulo se degrada con un aviso "Falta preparar la base
de datos" (no rompe el resto del CRM).

## Arquitectura (Clean Architecture + SOLID)

Las dependencias apuntan **hacia adentro**: presentación e infraestructura
dependen de la aplicación, que depende del dominio. El dominio no conoce a nadie.

```
modules/ai-commander/
├── ai-commander.js            Composition Root: inyecta adaptadores→servicios→vistas,
│                              enruta pestañas, expone window._aic. Contrato render().
├── domain/                    Reglas de negocio puras (sin I/O, sin DOM, sin Supabase)
│   ├── entities.js            Entidades, invariantes, progreso, composePrompt, catálogo de plantillas
│   └── ports.js               Interfaces (puertos): repos, AuditPort, AIProviderPort
├── application/               Casos de uso (dependen solo de puertos → DIP, testeable)
│   ├── project.service.js
│   ├── task.service.js        (incluye mover en el Kanban)
│   ├── prompt.service.js
│   ├── ai.service.js          orquesta "ejecutar prompt" vía AIProviderPort
│   └── dashboard.service.js   read-model agregado
├── infrastructure/            Adaptadores (implementan los puertos)
│   ├── supabase.repositories.js   Postgres vía Supabase (fromRow/toRow, igual que js/db.js)
│   ├── supabase.audit.js          eventos semánticos → tabla `actividad`
│   └── ai-providers.js            EL SEAM: registry + Edge Function (hoy inactivo)
└── presentation/              Vistas (render(container) + window._aic para acciones)
    ├── ui.js  dashboard.view.js  projects.view.js  board.view.js
    ├── prompt-builder.view.js  history.view.js
```

**SOLID:**
- **S**RP — cada servicio/vista/adaptador tiene una responsabilidad.
- **O**CP — agregar un proveedor de IA = una entrada en el catálogo (sin tocar la app).
- **L**SP — todos los proveedores cumplen `AIProviderPort` y son intercambiables.
- **I**SP — puertos pequeños y específicos por agregado.
- **D**IP — la aplicación depende de interfaces; la infraestructura las implementa.

## Base de datos (PostgreSQL)

Tablas: `proyectos`, `tareas`, `ai_prompts`, `ai_responses`.
- **IDs:** UUID técnico + **código correlativo** legible (`PROJ-`, `TASK-`, `PRMT-`)
  vía las secuencias server-side del CRM.
- **Multiempresa futura:** todas llevan `org_id` (nullable hoy). Activar
  multi-tenant = poblarlo + endurecer las policies (bloque comentado en el SQL).
- **Auditoría completa (defensa en profundidad):**
  - Trigger de BD `aic_audit_row` → registra cada INSERT/UPDATE/DELETE crudo en
    `actividad` (no se puede saltar desde el cliente).
  - `AuditPort` (app) → registra eventos semánticos legibles
    (`proyecto.crear`, `tarea.mover`, `ia.ejecutar`) para el feed del dashboard.
  - Columnas `created_by` / `updated_by` en proyectos y tareas.
- **RLS:** mismo modelo del CRM ("acceso compartido + login").

## El seam de IA (preparado, sin implementar)

`infrastructure/ai-providers.js` define `AI_CONFIG.edgeFunctionUrl = null` y un
`ProviderRegistry` con el catálogo de Anthropic (Claude Opus 4.8 por defecto),
OpenAI y Google.

Cuando se integre la IA real (roadmap **Fase 11**):
1. Crear una **Supabase Edge Function** `ai-complete` que reciba
   `{ provider, model, system, messages, params }`, llame al proveedor con la
   **clave guardada server-side** (nunca en el cliente) y devuelva
   `{ content, usage }`.
2. Poner su URL en `AI_CONFIG.edgeFunctionUrl` (o en `js/config.local.js`).

Con eso, `AIProviderPort.isConfigured()` pasa a `true` y `complete()` enruta por
la función. **Ninguna otra capa cambia** (Open/Closed).
