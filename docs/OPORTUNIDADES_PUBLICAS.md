# Módulo Oportunidades Públicas

Detectar, analizar, seleccionar, preparar y seguir oportunidades de **Mercado Público** y
**Compra Ágil**, con un objetivo explícito: analizar muchas y presentar pocas, bien elegidas.

Estado: **Fase 1 (MVP manual) implementada**. Fases 2, 3 y 4 no están construidas.

Fuente de las reglas de negocio (puntaje, causales, códigos UNSPSC, carpeta documental):
documento de decisión *Proyecto Mercado Público* (Tríada, 30-jul-2026).

---

## 1. Instalación

1. **Migración de base de datos.** Supabase → SQL Editor → New query → pegar y ejecutar
   `supabase/oportunidades_f1.sql`. Es idempotente: se puede correr más de una vez.
   Requiere que ya estén aplicados `multitenancy.sql` y `erp_f1.sql` (tabla `proyectos`).
2. **Verificación** (con la sesión de un usuario de la organización):
   ```sql
   select count(*) from op_plantillas;   -- 8
   select * from op_config;              -- 1 fila con 14 códigos UNSPSC
   ```
3. **Frontend.** No hay build: el módulo ya está enlazado en `index.html`
   (`modules/oportunidades/oportunidades.css`) y registrado en `app.js`.
   Si se toca un `.css` o `.js` enlazado, correr `npm run stamp`.
4. **Rollback:** `supabase/oportunidades_f1_rollback.sql` (destructivo, borra las tablas).

Sin la migración el módulo **no rompe el CRM**: muestra un aviso explicando qué correr.

## 2. Variables de entorno

Hoy, **ninguna**: la Fase 1 es completamente manual y no llama a servicios externos.

Para la Fase 2 (integración con la API oficial), el ticket va como **secret de la Edge
Function**, jamás en el frontend ni en la base de datos:

| Variable | Dónde vive | Para qué |
|---|---|---|
| `MERCADO_PUBLICO_TICKET` | Secrets de la Edge Function en Supabase | Autenticar contra la API oficial de Mercado Público |

`op_config.api_habilitada` es solo una **bandera de estado** para la UI. La tabla
`op_sync_logs.parametros` guarda los parámetros de cada sincronización **sin el ticket**.

## 3. Qué hace la Fase 1

| Sección | Qué resuelve |
|---|---|
| Resumen | KPIs, alertas ordenadas por urgencia, cierres próximos y las reglas de decisión a la vista |
| Bandeja | Búsqueda, filtros (estado, servicio, región, UNSPSC, responsable), orden, tabla o kanban, selección múltiple y descarte en lote |
| En análisis | Procesos que se están evaluando |
| Ofertas en preparación | Aprobadas y armando el paquete |
| Presentadas | Entregadas en el portal, esperando resultado |
| Adjudicaciones y ejecución | Orden de compra, ejecución, factura, pago y certificado |
| Plantillas | Ocho servicios estandarizados, copiables a una cotización sin tocar el original |
| Documentos del proveedor | Carpeta maestra en siete categorías, con vencimientos |
| Analítica | Embudo de siete etapas, tasa de éxito, ticket, márgenes, motivos de descarte y de pérdida, precio ofertado vs ganador |
| Configuración | Umbrales, códigos UNSPSC vigilados, servicios, regiones y estado de la API |

La ficha de cada oportunidad tiene nueve pestañas: Resumen · Requisitos · Puntaje ·
Financiero · Aprobaciones · Oferta · Ejecución · Documentos · Historial.

## 4. Arquitectura

```
modules/oportunidades/
  domain/                 LÓGICA PURA (sin DOM, sin Supabase) — testeada en node
    estados.js            23 estados + transiciones válidas + motivos obligatorios
    puntaje.js            6 criterios, 100 puntos, sugerencias deterministas
    descarte.js           11 causales críticas (detección automática + declarada)
    finanzas.js           horas → costos → contingencia → margen → IVA → precio
    aprobaciones.js       3 áreas, checklist y estado del trámite
    alertas.js            12 alertas (cierre, aprobación, documentos, pago, certificado)
    permisos.js           capacidades derivadas del perfil existente
    analitica.js          embudo y métricas del canal
    sincronizacion.js     idempotencia y control de duplicados (listo para Fase 2)
    catalogo.js           servicios, UNSPSC, regiones, categorías documentales
  presentation/           SOLO RENDER (datos → HTML, todo escapado)
    ui.js  bandeja.view.js  detalle.view.js  paneles.view.js
  oportunidades.js        composition root: estado, carga, eventos por delegación
  oportunidades.css       piel del módulo (tokens del CRM, 3 temas, 2 densidades)
```

Capa de datos: repos en `js/db.js` (prefijo `op*`) y mappers en `js/mappers.js`.
La bandeja **pagina en el servidor**; los hijos se piden por `oportunidad_id`.

## 5. Tablas

`op_config` · `op_oportunidades` · `op_documentos` · `op_requisitos` · `op_puntajes` ·
`op_riesgos` · `op_costos` · `op_costo_items` · `op_aprobaciones` · `op_plantillas` ·
`op_ofertas` · `op_oferta_docs` · `op_actividad` · `op_resultados` · `op_proveedor_docs` ·
`op_certificados` · `op_sync_logs`.

Todas con `org_id NOT NULL`, trigger `set_org_id()` y RLS por `auth_org_id()`.
Bucket privado `oportunidades` con RLS por `{org_id}/…`.

Reglas que vive la **base de datos**, no solo la interfaz:

- `op_puntajes_motivo_ck`: si una persona pisa el puntaje sugerido, el motivo es obligatorio.
- `op_guard_oc`: no se puede aceptar una orden de compra que no coincide con la oferta sin
  registrar la observación.
- `op_aprobaciones`: la RLS impide firmar por otro (`aprobado_por = auth.uid()`) y firmar un
  área que no corresponde (`op_puede_aprobar(area)`).
- `op_actividad`: solo INSERT. Sin UPDATE ni DELETE para nadie: el historial no se reescribe.

## 6. Permisos

Se **derivan** del perfil que el CRM ya tiene (`role` + `area` + `erp_role`), sin inventar un
sistema nuevo:

| Perfil del encargo | Cómo se reconoce | Qué puede firmar |
|---|---|---|
| Administrador | `role = 'admin'` | las tres áreas |
| Comercial | `area = 'Ventas'` o `erp_role = 'gerencia'` | comercial |
| Técnico | `area = 'Tecnología'` o `erp_role = 'operaciones'` | técnica |
| Finanzas | `area = 'Finanzas'` o `erp_role = 'finanzas'` | financiera |
| Solo lectura | `role = 'lector'` (rol aditivo, hoy nadie lo tiene) | nada |

## 7. Lo que el módulo NO hace (a propósito)

- **No presenta ofertas.** No toca la cuenta de Mercado Público. Prepara los antecedentes;
  subir la oferta al portal es siempre un acto humano.
- **No genera documentos jurídicos** ni declaraciones que no hayan sido validadas.
- **No promete adjudicación.** El puntaje ordena la decisión; no la reemplaza.
- **No usa IA todavía.** Las sugerencias de puntaje son cuentas deterministas, rotuladas
  como tales. La lectura de documentos con IA es Fase 3.

## 8. Fases siguientes (no construidas)

- **Fase 2 — Integración oficial.** Edge Function que consulta la API oficial con el ticket
  del servidor, guarda el registro original en `op_oportunidades.datos_api`, deduplica con
  `domain/sincronizacion.js` (ya implementado y testeado) y registra cada corrida en
  `op_sync_logs`. Antes de escribir una línea: revisar la documentación vigente de la API.
  No inventar endpoints, no hacer scraping del portal.
- **Fase 3 — IA.** Lectura de las bases adjuntas y extracción estructurada hacia
  `op_requisitos` (cada requisito con documento, sección y nivel de confianza; la
  confirmación humana sigue siendo obligatoria).
- **Fase 4 — Documentos y aprendizaje.** Generación de la carpeta de oferta en DOCX/PDF y
  recomendaciones a partir del historial de precios y de pérdidas.

## 9. Datos demo

Las ocho plantillas que carga la migración vienen marcadas `es_demo = true` y la interfaz las
rotula como **"estimación interna"**: las horas y los precios son referencias que los socios
todavía no validaron. Revisarlos antes de usarlos en una oferta real.

## 10. Pruebas

```bash
npm test
```

Cubren: fórmulas de IVA, margen, precio sugerido, capital de trabajo, puntaje total y
veredicto, causales de descarte, transiciones de estado, aprobaciones, permisos, alertas,
detección de duplicados, embudo y métricas, y los mappers de la base de datos.
