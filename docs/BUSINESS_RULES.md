# BUSINESS_RULES.md
> Reglas de negocio implementadas — extraídas del código fuente real

---

## Reglas de Citas

1. **Conflicto de horario** — No se puede crear una cita en la misma fecha+hora que otra existente (excepto si la existente tiene estado `Reagendada`). Se verifica antes de guardar.
2. **Estados de cita** — `Pendiente`, `Asistió`, `No asistió`, `Contrató`, `No interesado`, `Reagendada`.
3. **Reagendar** — Cambia fecha, hora y estado a `Reagendada`. Queda en historial.
4. **Duración** — Campo numérico, entre 15 y 240 minutos, paso de 15. Por defecto: 30 minutos.
5. **Notificación** — Si hay permisos de notificación, alerta 10 minutos antes de la cita del día.

---

## Reglas de Leads

1. **Estado inicial** — Todo lead nuevo entra con estado `Nuevo`.
2. **Estados del ciclo** — En orden típico: `Nuevo → Intento de contacto → Contactado → Cita agendada → Confirmado → Asistió → Seguimiento → Propuesta enviada → Venta cerrada`. También: `No asistió`, `Perdido`.
3. **Campo `agendado`** — Se activa en `true` cuando se agenda una cita desde el lead. Filtra la vista por defecto para no mostrar leads ya gestionados.
4. **Historial** — Cada acción relevante (agendar cita, etc.) agrega una entrada al array `historial` del lead con `tipo`, `desc`, y `timestamp`.
5. **Importación masiva** — Todos los leads importados ingresan con estado `Nuevo`. Columnas mapeadas case-insensitive (acepta `nombre`, `Nombre`, `NOMBRE`).
6. **Nivel de interés** — Campo opcional: `Alto`, `Medio`, `Bajo`.
7. **Origen** — `Facebook`, `Instagram`, `LinkedIn`, `Referido`, `Web`, `Cold Call`, `Otro`.

---

## Reglas de Ventas

1. **Planes disponibles** (definidos en `js/constants.js`):
   - Plan Contado: comisión $66.000, pago único $1.199.990
   - Plan Crédito 12c: comisión $38.000
   - Plan Crédito 13c: comisión $35.000
   - Plan Contado Convenio: comisión $60.000
   - Plan Crédito Convenio: comisión $33.000
   - Plan Módulo: comisión $33.000
   - Plan 1 Persona: comisión $52.000, pago único $715.000 (contado)
   - Plan 3X1: comisión $40.000, matrícula $190.000 + 13 cuotas de $138.000 (3 personas)
   - Plan Excepcional: comisión variable (extraoficial), solo retención extrema

   > Valores tomados del Anexo de Capacitación LGS ("Gestión por Participante").

2. **Planes contado** — Determinado por la bandera `esContado` del catálogo (`js/planes.js`), no por id hardcodeado. Hoy son contado: `contado`, `convenio_contado` y `una_persona`. Aplica al cálculo de incentivos semanales.

3. **Beca Familiar** — Disponible en todos los planes excepto `modulo` y `excepcional`. Es un gancho de cierre gratuito.

4. **Convenios** — Lista de empresas/sindicatos habilitados para precios de convenio (definidos en `constants.js`).

---

## Motor de Comisiones

### Comisión base
- Se suma la comisión del plan por cada venta del mes.

### Incentivo semanal (semana Lun-Dom)
Se aplica el mayor entre incentivo por contados o incentivo general:

| Planes contado en la semana | Incentivo contado |
|-----------------------------|-------------------|
| ≥ 5 | $325.000 |
| ≥ 3 | $145.000 |
| ≥ 2 | $90.000 |

| Total ventas en la semana | Incentivo general |
|---------------------------|-------------------|
| ≥ 5 | $125.000 |
| ≥ 3 | $60.000 |
| ≥ 2 | $30.000 |

### BPI (Bono de Productividad Individual) — mensual

| Total matrículas del mes | BPI por matrícula |
|--------------------------|-------------------|
| ≥ 13 | $23.000 c/u |
| ≥ 10 | $21.000 c/u |
| ≥ 6 | $20.000 c/u |
| < 6 | $0 |

### Otros componentes mensuales fijos
- **Conectividad:** $40.000
- **Debut (si activo):** $20.000

### Fórmula total mensual
```
Total = Comisiones base + Incentivos semanales + BPI + $40.000 (conectividad) + $20.000 (debut si activo)
```

### Simulador mensual (Calculadora → "Simulador mensual")
- Vista "what-if": el asesor ingresa ventas proyectadas por plan y por semana (5 semanas).
- No toca datos reales; se persiste en `localStorage` (`crm_sim_grid_v1`).
- Reusa el mismo motor que las ventas reales: `calcProjection()` compone `calcIncentiveSemanal` (bonos semanales) + `calcBPI` (escala mensual) + fijos.
- Expone el sueldo mensual proyectado, desglose y mini-gráfico comisión/bono por semana.
- Contrato: `calcProjection(weekGrid, PLANES, debutActivo)` en `services/commission.service.js`.

---

## Sistema de Medallas y Niveles

- **1 medalla** por cada **4 ventas** en una misma semana (semana Lun-Dom).
- **1 nivel** por cada **5 medallas** acumuladas históricamente.
- Sin límite máximo de nivel documentado en código.

---

## Reglas de Plantillas WhatsApp

1. **Variables soportadas:** `{{nombre}}`, `{{telefono}}`, `{{fecha}}`, `{{hora}}`, `{{zoom}}`, `{{producto}}`, `{{ejecutivo}}`.
2. **`{{ejecutivo}}`** se reemplaza con `config.userName` del asesor actual.
3. **`{{producto}}`** se mapea al campo `interes` de la cita o lead.
4. **`{{zoom}}`** se mapea a `zoomLink`; si está vacío, se muestra `'sin link'`.
5. **Plantillas por defecto** — 19 plantillas precargadas en primera instalación. Las nuevas plantillas que se agreguen en futuras versiones se migran automáticamente.

---

## Reglas de Respaldo

1. **Export JSON** — Incluye `appointments`, `leads` y `sales`. NO incluye `calls`, `templates` ni `config`.
2. **Import JSON** — Agrega registros sin eliminar los existentes (no es reemplazo completo). Los IDs originales se descartan para evitar colisiones.
3. **Import Excel** — Solo importa a `leads`. Requiere columna `nombre` (case-insensitive). Límite de 10 MB por archivo.
4. **Export Excel** — Solo exporta `appointments` (no leads ni ventas).

> **Riesgo detectado:** Import JSON no importa `calls` ni `templates` — datos de llamadas y plantillas personalizadas se pierden en una restauración.

---

## Reglas de Notificación

1. Se solicita permiso en el primer inicio.
2. El watcher corre cada 60 segundos revisando citas del día actual.
3. Solo notifica citas con estado `Pendiente`.
4. Solo notifica si la cita está entre 0 y 10 minutos en el futuro.
5. Cada cita solo se notifica una vez por sesión (se guarda en `S.notified`).
