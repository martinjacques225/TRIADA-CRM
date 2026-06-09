# ROADMAP.md
> Plan de desarrollo por fases — basado en arquitectura actual y objetivos del proyecto

---

## Estado Actual: Fase 3 — Modularización

La aplicación ya completó la transición de un monolito (`app.backup.js`) a una arquitectura modular. El proyecto está funcional pero tiene deuda técnica que debe resolverse antes de escalar.

---

## Fase 4 — Limpieza y Consolidación (✅ COMPLETADA — v3.2)
> Sin agregar funcionalidades. Solo eliminar deuda técnica.

### Tareas
- [x] Eliminar `./db.js` raíz (obsoleto) y `app.backup.js`
- [ ] Unificar íconos SVG duplicados — todos deben venir de `js/ui.js` (`ico`) *(pendiente, cosmético)*
- [x] Eliminar `deleteLead` duplicada en `modules/leads/leads.js` (ahora sólo en `modal-lead.js`)
- [x] Eliminar `deleteSale` duplicada en `modules/ventas/ventas.js` (ahora sólo en `modal-venta.js`)
- [x] Separar `js/constants.js` en: `planes.js`, `estados.js`, `mascotas.js` (constants.js queda como barrel)
- [x] Separar `modules/modals/modals.js` en `modal-core/cita/lead/venta/wa` (modals.js queda como barrel)
- [ ] Agregar paginación/cursor básico para las queries `getAll()` *(pendiente)*
- [x] Documentar contrato formal de `window._app` → `docs/SERVICES_CONTRACT.md`

**Riesgo:** Bajo — sin cambios de datos ni lógica de negocio. Verificado: sintaxis + 186 imports OK.

---

## Fase 5 — Nuevas Funcionalidades (PENDIENTE)
> Agregar módulos pedidos en el backlog, sin cambiar arquitectura de datos.

### Módulos a crear
- [ ] **Módulo de Tareas** — crear, asignar, fecha límite, prioridad, relación con lead
- [ ] **Módulo de Prospección** — staging para leads importados antes de activarlos
- [ ] **Vista de Actividad Comercial** — línea de tiempo visual por lead (usa store `calls`)
- [ ] **Embudo de ventas** — vista Kanban expandida con todas las etapas del ciclo
- [ ] **Reportes exportables** — PDF y Excel con métricas de conversión
- [ ] **Recordatorios in-app** — alertas para leads sin contactar, seguimientos pendientes

### Mejoras a módulos existentes
- [ ] Dashboard: agregar gráfico de embudo y conversión por origen
- [ ] Agenda: vista semanal y mensual además de la diaria
- [ ] Leads: filtros por fecha, fuente, producto, ejecutivo
- [ ] WhatsApp: agregar variable `{{empresa}}` y `{{ciudad}}`
- [ ] Respaldos: incluir `calls` y `templates` en el JSON de backup

**Riesgo:** Medio — nuevas funcionalidades pueden introducir bugs en existentes si se toca `modals.js`.

---

## Fase 6 — Capa de Servicios (✅ COMPLETADA — v3.2)
> Preparar arquitectura para backend sin romper funcionalidad actual.

### Objetivo (cumplido)
Abstraer la capa de datos para que los módulos no llamen directamente a `IndexedDB`, sino a un servicio intermedio que luego puede apuntar a Supabase, una API REST, o seguir en local.

### Estructura implementada
```
services/
├── index.js                  ← barrel / punto de entrada
├── persistence.service.js    ← initDB
├── lead.service.js           ← adapter sobre js/db.js
├── appointment.service.js
├── sales.service.js
├── call.service.js
├── template.service.js
├── config.service.js
├── commission.service.js     ← fachada sobre utils.js
├── medal.service.js          ← fachada sobre utils.js
└── user.service.js           ← preparación multiusuario
```
> `sync.service.js` (sincronización) se difiere a Fase 8, junto con Supabase.

### Resultado
- Cero acceso directo a IndexedDB desde la UI. Contratos en `docs/SERVICES_CONTRACT.md`.
- Sin cambios de comportamiento. Verificación estática OK (sintaxis + 186 imports).

**Riesgo realizado:** Bajo (se implementó como re-export fino, sin tocar lógica).

---

## Fase 7 — Autenticación y Multiusuario (PENDIENTE)
> Implementar Supabase como backend. Sincronización entre dispositivos.

### Requisitos previos
- Fase 6 completada
- Definido modelo de datos multiusuario: `usuarios`, `equipos`, `roles`
- Estrategia de migración de datos locales decidida

### Entidades nuevas requeridas
- `Ejecutivo` (usuario de la app, antes solo era un `config.userName`)
- `Equipo` / `Organización`
- `Rol` (asesor, jefe de grupo, gerente, etc.)

### Decisiones pendientes
- ¿Los datos locales migran a Supabase automáticamente o es opt-in?
- ¿La app sigue funcionando offline con sync posterior?
- ¿Un ejecutivo puede ver leads de otro?

**Riesgo:** Muy alto — cambia el modelo de datos raíz.

---

## Fase 8 — IA y Automatizaciones (FUTURO)
> Funcionalidades avanzadas que requieren backend activo.

- Resumen automático de historial de cliente
- Recomendación de siguiente acción
- Predicción de conversión
- Dictado por voz para notas
- OCR para tarjetas de presentación
- Automatizaciones: si lead nuevo → crear tarea; si no asistió → crear seguimiento

**Condición de entrada:** Fase 7 completada.

---

## Restricciones Permanentes

1. **No romper datos existentes** — el nombre de la DB (`AgendaComercialDB`) y los stores no deben cambiar sin migración controlada.
2. **Mobile-first** — cualquier nueva UI debe probarse en pantalla de 375px.
3. **Sin dependencias innecesarias** — mantener bundle mínimo; usar CDN solo para lo imprescindible.
4. **Offline primero** — toda funcionalidad core debe funcionar sin internet.
