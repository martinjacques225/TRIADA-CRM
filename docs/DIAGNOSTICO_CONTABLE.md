# Módulo Diagnóstico Contable y Tributario

Prediagnóstico **comercial** para empresas e industrias de mayor complejidad. Lo
levanta el ejecutivo en reunión con gerentes, administradores y responsables
financieros, y su salida decide si corresponde derivar a la asesoría
especializada de Sebastián.

> **No es una auditoría, certificación, informe legal ni dictamen profesional.**
> Se construye sobre las respuestas *declaradas* por el cliente y sin verificar
> documentación de respaldo. El módulo lo dice en pantalla y en el informe, y hay
> tests que impiden que el texto derive hacia afirmaciones de certificación.

Es el **segundo** instrumento de diagnóstico del CRM. El primero —Diagnóstico
360— sigue igual y **no comparte nada** con este (ver §3).

---

## 1. Instalación

1. Supabase → SQL Editor → New query → pegar y ejecutar
   [`supabase/diagnostico_contable_f1.sql`](../supabase/diagnostico_contable_f1.sql).
2. Verificar (debe devolver dos filas con `rowsecurity = true`):

   ```sql
   select tablename, rowsecurity from pg_tables
   where schemaname = 'public' and tablename like 'dct_%';
   ```

3. Entrar al CRM → **Diagnósticos → Contable y Tributario**.

Si la migración no está aplicada, el módulo **no se rompe**: detecta el error
`42P01`/`PGRST205` y muestra un aviso con el nombre del archivo a ejecutar.

**Rollback:** [`diagnostico_contable_f1_rollback.sql`](../supabase/diagnostico_contable_f1_rollback.sql).
Borra las evaluaciones — exportar antes si hay datos reales. Deja la fila `DCT`
de `correlativos` a propósito, para que los folios no se repitan si el módulo se
reinstala.

**Estado (2026-07-31):** migración aplicada y verificada contra la base real. El
módulo **todavía no se ha abierto con un usuario logueado** en el CRM (ver §9).

---

## 2. El flujo

```
Portada (indicadores + historial)
   └─ Nuevo diagnóstico
        1. Identificación      empresa del CRM o nueva; no puntúa
        2. Necesidad principal qué la trae; no puntúa
        3. Evaluación financiera   contabilidad, base de preparación, auditoría
        4. Evaluación tributaria   régimen, ingresos, activos, sociedades
        5. Resultado           puntaje, alertas, antecedentes, precio, acción
             ├─ Solicitar evaluación con Sebastián   (CTA principal)
             ├─ Generar informe preliminar           (CTA secundario)
             ├─ Crear oportunidad comercial          → lead en el pipeline
             └─ Programar seguimiento                → cita en la agenda
```

Guardado automático con respaldo local, botón *Guardar borrador*, navegación
anterior/siguiente y opción **"No lo sé"** en toda pregunta que puntúe.

---

## 3. Separado del Diagnóstico 360

No es una variante ni una configuración del 360: es otro instrumento.

| | Diagnóstico 360 | Contable y Tributario |
|---|---|---|
| Módulo | `modules/diagnosticos/` | `modules/diagnostico-contable/` |
| Vista (nav) | `diagnosticos` | `diagnostico-contable` |
| Tabla | `diagnosticos` | `dct_evaluaciones` (+ `dct_actividad`) |
| Catálogo | `js/utils.js` (`DIAG_AREAS`, `DIAG_PREGUNTAS`) | `domain/cuestionario.js` |
| Escala | madurez 1-5 (fracciones 0…1) | 0-3 por respuesta, pesos 3/2/1 |
| Resultado | Informe Ejecutivo 360 | Informe preliminar + precio en UF |
| Estados | `diag_estado` (borrador…aprobado) | `dct_evaluaciones.estado` (6 propios) |
| Correlativo | `DIA-` | `DCT-` |

`tests/dct.mappers.test.js` **fija esa frontera**: `dctToSupa` no puede escribir
`scores`/`hallazgos`, y `diagToSupa` no puede escribir ninguna columna de este
módulo. Si alguien intenta fusionarlos, el test falla.

---

## 4. Arquitectura

```
modules/diagnostico-contable/
  domain/                     lógica PURA (sin DOM, sin Supabase) — testeada en node
    cuestionario.js           etapas, preguntas, opciones, pesos y condiciones
    puntaje.js                motor de cálculo, niveles y antecedentes
    alertas.js                catálogo de alertas prioritarias
    recomendacion.js          precio inicial y próxima acción comercial
    estados.js                estados comerciales y transiciones
  presentation/               solo render (todo escapado con escHtml)
    ui.js                     piezas compartidas
    portada.view.js           indicadores + historial filtrable
    cuestionario.view.js      las 5 etapas
    resultado.view.js         puntaje, alertas y recomendación
    informe.view.js           informe imprimible + resumen en texto
  diagnostico-contable.js     composition root: estado, datos y eventos
  diagnostico-contable.css    piel del módulo (namespaceada en .dct-*)
```

Datos en `js/db.js` (`dctEvaluaciones`, `dctActividad`) y `js/mappers.js`
(`dctFromSupa` / `dctToSupa`). Eventos por delegación: **cero `onclick` inline con
datos**. El listado usa `dctEvaluaciones.page()` — los filtros se resuelven en
Postgres, nunca trayendo la tabla al navegador.

---

## 5. Cómo se calcula el puntaje

```
Puntaje = puntos obtenidos / máximo aplicable × 100
```

**Calificación por respuesta:** `3` saludable · `2` aceptable con observaciones ·
`1` débil · `0` alerta importante o desconocimiento crítico.

**Pesos:** `3` regularización contable, auditoría IFRS, inscripción CMF, opinión
del auditor, control de ingresos adicionales y operaciones relacionadas · `2`
régimen tributario, hallazgos pendientes, artículo 33 bis y estructura societaria
· `1` moneda base y elementos administrativos secundarios · `0` no puntúa.

**Interpretación:** 85-100 salud favorable · 70-84 condición estable con
observaciones · 50-69 riesgo relevante · 0-49 riesgo alto.

### Las cinco reglas que sostienen el instrumento

No son detalles de implementación: si se "simplifican", el diagnóstico deja de
servir. Cada una tiene su test.

1. **El puntaje no se muestra mientras se responde.** Si el entrevistado lo ve
   subir y bajar, deja de contestar lo que pasa y contesta lo que conviene.
2. **Un "No lo sé" vale 0 pero se cuenta aparte.** No es lo mismo una empresa que
   declara "no está regularizada" que una donde nadie lo sabe: las dos puntúan 0,
   pero solo la segunda suma respuestas desconocidas.
3. **Lo que no corresponde al recorrido no entra al denominador.** Una empresa con
   balance tributario no arrastra el peso de la rama IFRS.
4. **Las alertas prioritarias se muestran aunque el puntaje sea favorable.** Es el
   contrapeso al promedio: se puede sacar 88 y tener la contabilidad sin
   regularizar.
5. **Tener inversiones no resta; resta no controlarlas.** El puntaje de T3 sale del
   control declarado (contabilizado, declarado, respaldado), no de la selección.
   Lo mismo con la facturación: que bajen las ventas no es una falla contable; no
   tener la información consolidada, sí.

### Precio inicial

| Base de preparación | Precio |
|---|---|
| Balance tributario | Diagnóstico especializado **desde 10 UF** |
| IFRS/NIIF (o ambos) | Diagnóstico especializado **desde 20 UF** |
| Desconocida | Valor sujeto a revisión de antecedentes |

Siempre acompañado de la aclaración de qué puede moverlo (tamaño, sociedades,
períodos, volumen documental, activos, inversiones y complejidad de los
hallazgos).

---

## 6. Tablas

| Tabla | Para qué |
|---|---|
| `dct_evaluaciones` | Una fila por diagnóstico. Identificación, `respuestas` (jsonb), resultado calculado y seguimiento comercial. |
| `dct_actividad` | Historial append-only: quién hizo qué y cuándo. Sin `update` ni `delete`, tampoco en la RLS. |

**Por qué `respuestas` es jsonb y no 30 columnas:** la metodología va a cambiar
cuando Sebastián la afine, y normalizarla obliga a una migración por cada ajuste.
Lo que **sí** se materializa en columnas es el RESULTADO (`puntaje_general`,
`puntaje_financiero`, `puntaje_tributario`, `nivel_riesgo`, `precio_inicial_uf`,
`estado`): de eso se filtra, se ordena y se sacan los indicadores, y eso se
resuelve en Postgres.

El resultado **solo se persiste cuando el cuestionario está cerrado**: un borrador
a medias con un puntaje en la tabla contaminaría los indicadores de la portada.

---

## 7. Permisos

RLS multitenant estándar de la casa: se ve y se escribe **lo de la propia
organización, y nada más**. Si `op_es_lector()` existe (viene con el módulo de
Oportunidades), un perfil de solo lectura no puede escribir; si no existe, la
migración cae a la versión sin esa condición y el módulo no depende de ella.

`dct_actividad` exige además `usuario = auth.uid()`: **nadie firma el historial a
nombre de otro**.

---

## 8. Lo que el módulo NO hace (a propósito)

- **No emite un dictamen.** Es un prediagnóstico comercial: todo el texto habla
  "de acuerdo con la información declarada".
- **No afirma que una empresa esté certificada ni libre de contingencias**, ni
  siquiera con 100 puntos.
- **No concluye que un trabajo de auditoría carece de validez** porque la
  inscripción en la CMF no esté confirmada: lo deja como antecedente a validar.
- **No verifica documentación.** No pide adjuntos: pide *antecedentes a
  solicitar*, que es lo que se lleva el ejecutivo de la reunión.
- **No usa APIs de pago ni datos simulados.** El informe se arma en el navegador
  con `js/pdf.js`, el mismo componente de propuestas y presupuestos.
- **No manda correos.** "Solicitar evaluación con Sebastián" cambia el estado y
  deja el registro; el contacto lo hace una persona.

---

## 9. Pruebas

```bash
npm test            # 364 tests; 76 son de este módulo
```

| Archivo | Qué cubre |
|---|---|
| `tests/dct.puntaje.test.js` | Motor de cálculo, ramas condicionales, T3, progreso e integridad del catálogo |
| `tests/dct.flujo.test.js` | Alertas, precio, recomendación y transiciones de estado |
| `tests/dct.mappers.test.js` | Round-trip DB↔UI, canonización y la frontera con el 360 |

**Verificado contra la base real (31-jul-2026)**, con el payload que genera el
módulo y en transacciones que se deshicieron solas:

- INSERT completo aceptado: correlativo `DCT-000001`, `org_id` auto-estampada,
  jsonb anidado intacto (incluidos acentos y montos de 10 dígitos), auditoría
  registrando `insert` y `update`.
- **RLS, 12 controles en verde:** un consultor inserta, lee y edita lo de su
  organización · **no** ve, **no** edita y **no** borra lo de otra · el anónimo no
  ve nada y no puede insertar · firmar el historial a nombre de otro se **rechaza**
  con `42501`.

**Verificado por render** (página temporal, ya borrada): las cinco pantallas sin
errores de consola, contraste WCAG AA en claro y oscuro, sin scroll horizontal en
escritorio ni tablet, y el informe filtrando las notas internas del ejecutivo.

### ⬜ Lo que falta verificar

- **Abrirlo con un usuario logueado en el CRM.** La base acepta las escrituras y
  el dominio está testeado, pero el camino completo desde la interfaz —guardar,
  crear la oportunidad, agendar el seguimiento— no se ha ejecutado con una sesión
  real.
- Deploy a GitHub Pages y paridad en la PWA móvil (`movil/`).

---

## 10. Pendiente de negocio: la revisión del especialista

Las ponderaciones, los umbrales (85/70/50) y los precios (10 y 20 UF) salen del
encargo, **no de una validación de Sebastián**. Antes de usar el módulo con un
cliente tiene que revisarlos.

Para eso no hay que mandarle código. Se genera un documento con todo el
cuestionario —preguntas, alternativas, puntos, pesos, condiciones, alertas,
umbrales y precios— donde puede marcar su veredicto punto por punto y descargar
sus observaciones en un archivo:

```bash
npm run exportar:cuestionario
```

Sale en `Desktop/PROYECTOS/PRESENTACIONES/ALIANZA-SEBASTIAN/`, junto al resto del
material de la alianza. Para dejarlo en otro lado:

```bash
npm run exportar:cuestionario -- "C:\ruta\destino.html"
```

El documento **se genera desde el catálogo real** (`domain/`), no de una copia:
si alguien cambia una pregunta o un puntaje, se vuelve a correr el comando y el
documento queda al día. Es un HTML autocontenido —sin CDN, sin fuentes externas
y sin red— así que se abre con doble clic en cualquier computador, funciona sin
internet, guarda el avance en el propio navegador y se imprime limpio.

Cuando devuelva su archivo de observaciones, los ajustes se aplican en
`domain/cuestionario.js` y `domain/puntaje.js`, que están escritos como
configuración editable con las razones de cada decisión en comentarios.
