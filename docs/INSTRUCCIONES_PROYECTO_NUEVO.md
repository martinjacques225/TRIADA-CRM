# CRM COMERCIAL — Instrucciones del proyecto (para el nuevo proyecto Cowork)

> **Cómo usar este archivo:** copia el bloque que está debajo de la línea `=== INICIO INSTRUCCIONES ===`
> y pégalo en la configuración de instrucciones del **nuevo proyecto Cowork**.
> Selecciona como carpeta del proyecto el clon Git: `C:\Users\velve\Documents\GitHub\CRM-COMERCIAL-V1.6`.
> No uses la carpeta antigua `RECURSOS UTILES APPS` (quedó solo como respaldo).

---

=== INICIO INSTRUCCIONES ===

## 1. Qué es este proyecto

CRM Comercial: una **PWA** (Progressive Web App) para asesores y equipos de ventas. Corre 100% en el navegador, sin backend todavía. Instalable en escritorio y Android, funciona offline.

- **Stack:** Vanilla JavaScript (ES Modules) + CSS Variables + IndexedDB. **Sin frameworks** (no React/Vue/Angular).
- **Única dependencia externa:** SheetJS (`xlsx`) vía CDN, para importar/exportar Excel.
- **Persistencia hoy:** IndexedDB (`AgendaComercialDB` v2), detrás de una **capa de servicios** ya lista para enchufar Supabase u otro backend sin tocar la UI.
- **Objetivo de producto:** convertir esto en un CRM comercial profesional (estilo HubSpot/Pipedrive/Salesforce, pero simple y rápido) para vendedores y pequeñas empresas.

## 2. Estado actual real (LEER antes de tocar nada)

- **Versión:** 3.3 — fase de *correcciones funcionales / pulido pre-Supabase*.
- **Capa de servicios:** ✅ completada (v3.2). La UI ya **no** accede a IndexedDB directamente.
- **Supabase / multiusuario / sincronización:** ❌ **NO implementados.** Solo está preparada la arquitectura (ver `docs/ARQUITECTURA_FASE2.md`).
- **Pendiente del usuario:** probar en navegador (Leads, Agenda, Ventas, Configuración, Calculadora) y hacer Commit + Push de los cambios v3.3 ya preparados.
- **Verificación hecha:** estática (sintaxis + imports resueltos). Falta prueba funcional en navegador.

Funciones que YA existen y NO se deben romper: Agenda/citas, Leads (Grid + Kanban), Dashboard, Ventas, Calculadora + Simulador mensual, Plantillas WhatsApp (con variables dinámicas vía `buildMessage`), motor de comisiones (incentivos semanales + BPI + conectividad + debut), medallas/niveles, import/export Excel y JSON, modo claro/oscuro, mascotas IA, PWA + Service Worker offline, notificaciones nativas.

## 3. Carpeta de trabajo y flujo Git ⚠️ CRÍTICO

- **Carpeta oficial de trabajo:** el clon Git `C:\Users\velve\Documents\GitHub\CRM-COMERCIAL-V1.6`.
  Remoto: `https://github.com/martinjacques225/CRM-COMERCIAL-V1.6.git` · rama base: `main`.
- La carpeta `RECURSOS UTILES APPS` es **solo respaldo**: no trabajar ahí para no desincronizar.
- **Reglas de Git acordadas:**
  1. `main` siempre debe ser la versión que funciona.
  2. Todo lo nuevo o de riesgo (Supabase, sync, módulos grandes) va en una **rama aparte**, nunca directo en `main`.
  3. Orden: Claude verifica (sintaxis + imports) → **el usuario prueba en navegador** → revisa el diff en GitHub Desktop → Commit → Push → merge a `main` solo si funciona.
  4. Nada se sube solo: Commit y Push son manuales del usuario. Claude no tiene credenciales de GitHub: prepara los cambios, el usuario los publica.
  5. Todo cambio debe ser reversible (Revert).

## 4. Arquitectura y regla de oro

```
index.html      → shell; todo se renderiza en JS (carga app.js como módulo)
app.js          → orquestador: init, navegación, registro de window._app
styles.css      → estilos globales con variables CSS (claro/oscuro)
sw.js           → Service Worker (cache-first locales). Subir CACHE al cambiar assets.
manifest.json   → PWA manifest

js/             → capa base
  db.js         → IndexedDB (6 stores). SOLO lo usan los services, NUNCA la UI.
  state.js      → estado global (objeto S)
  planes.js / estados.js / mascotas.js → catálogos (constants.js es barrel)
  ui.js         → shell UI: nav, topbar, mascota, PWA, notificaciones
  utils.js      → utilidades puras + motor de comisiones

services/       → ★ ÚNICA vía a datos y lógica de negocio
  index.js (barrel), persistence, lead, appointment, sales, call,
  template, config, commission, medal, user

modules/        → vistas, cada una expone render():
  agenda, calculadora, configuracion, dashboard, leads, medallas,
  plantillas-wa, respaldos, ventas, modals/ (core, cita, lead, venta, wa)
```

**REGLA DE ORO (obligatoria):** las vistas/módulos hablan con `services/`, **nunca** con `js/db.js`. Para migrar a Supabase mañana solo se reescribe el interior de cada `*.service.js`; la UI no se toca. Mantener el estado compartido en `js/state.js` (`S`) y la navegación/modales en `window._app` (contrato en `docs/SERVICES_CONTRACT.md`).

## 5. Modelo de datos (no romper)

IndexedDB `AgendaComercialDB` v2. Stores: `appointments`, `leads`, `calls`, `sales`, `templates`, `config`. No cambiar el nombre de la DB ni los stores sin una migración controlada. Fechas como string ISO `YYYY-MM-DD` salvo timestamps completos.

## 6. Cómo quiero que trabajes conmigo

- **Conciso y directo.** Trabajo rápido. Si te pido arreglar algo, **arréglalo y dime qué aplicaste** — no me expliques cómo encontraste el problema ni el plan paso a paso salvo que lo pida.
- **Al retomar:** recuérdame en 2–3 líneas dónde quedamos y una sugerencia, y seguimos. Puede que no recuerde los detalles previos.
- **Sé mi experto, no un sí-señor.** Si mi idea está mal, dímelo. Si falta info, pídela; si yo tampoco sé, dame opciones.
- **Código mínimo y reutilizable.** No escribas 2000 líneas si se puede en una décima parte con motores/funciones reutilizables. Evita soluciones temporales difíciles de escalar.
- **Imágenes:** si se necesitan, dame el **prompt** para pedírselas a ChatGPT en vez de generarlas tú; trabajamos en conjunto.
- **Tareas a medias:** si dejamos algo incompleto, retómalo tú cuando puedas, sin que te lo pida, hasta terminarlo.
- **Piensa como arquitecto de software y producto**, no solo como programador.

## 7. Reglas de desarrollo

1. Analiza la app antes de modificar código (estructura, dependencias, estilos, flujos).
2. No elimines funcionalidades existentes ni rompas compatibilidad con datos actuales.
3. **Mobile-first:** prueba cualquier UI nueva pensando en 375px de ancho.
4. **Offline primero:** lo core debe funcionar sin internet.
5. Sin dependencias innecesarias; CDN solo para lo imprescindible.
6. Al cambiar assets, subir el número de `CACHE` en `sw.js` y agregar los archivos a `ASSETS`.
7. Documenta los cambios relevantes en `docs/CHANGELOG.md` y actualiza `docs/CLAUDE_CONTEXT.md` al cerrar una fase.
8. Entrega código completo y funcional; toda función nueva debe verse integrada al diseño actual.

## 8. Hacia dónde vamos (backlog / próximos pasos)

**Inmediato:** que el usuario pruebe v3.3 en navegador y haga Commit + Push.

**Fase 5 — módulos nuevos (no dependen de Supabase), cada uno en su rama:**
- Módulo de Tareas (crear/asignar, fecha límite, prioridad, relación con lead).
- Módulo de Prospección (staging de leads importados antes de activarlos).
- Vista de Actividad Comercial (línea de tiempo por lead, usa store `calls`).
- Embudo de ventas Kanban ampliado con todas las etapas.
- Reportes exportables PDF/Excel (conversión, ventas, citas, productividad).
- Recordatorios in-app (lead sin contactar, seguimiento pendiente, cita mañana/en 1h).
- Mejoras: Dashboard (embudo + conversión por origen), Agenda (vista semanal/mensual), Leads (filtros por fecha/fuente/producto/ejecutivo), WhatsApp (`{{empresa}}`, `{{ciudad}}`), Respaldos (incluir `calls` y `templates`).

**Deuda menor (bajo riesgo):** paginación en `getAll()`, unificar íconos SVG (todos desde `js/ui.js`), migrar `window._app` a imports explícitos. Recomendado antes de Supabase: adoptar UUID + `organizacion_id` y externalizar `lead.historial[]` a un concepto de `actividad`.

**Fases futuras (alto riesgo, requieren backend):** Fase 7 Supabase + Auth + multiusuario/roles · Fase 8 sincronización offline-first · Fase 9 migración asistida IndexedDB→Supabase · IA/OCR/dictado por voz/automatizaciones.

## 9. Documentos de referencia (en `docs/`)

- `CLAUDE_CONTEXT.md` — memoria permanente del proyecto. **Leer al iniciar cada fase.**
- `PROJECT_CONTEXT.md` — contexto técnico/producto (DB, comisiones, flujos, PWA).
- `SERVICES_CONTRACT.md` — contratos de los servicios y de `window._app`.
- `ARQUITECTURA_FASE2.md` — diseño multiusuario/Supabase (modelo de datos, roles, migración).
- `BUSINESS_RULES.md` — reglas de negocio (citas, leads, ventas, comisiones, BPI, medallas).
- `ROADMAP.md` — plan por fases. · `CHANGELOG.md` — historial de cambios.

=== FIN INSTRUCCIONES ===
