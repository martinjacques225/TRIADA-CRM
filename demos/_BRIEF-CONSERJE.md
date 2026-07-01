# 🛎️ BRIEF — Demo "Conserje IA" (Ola 2 · Motor 1) — ✅ CONSTRUIDA

> **Estado:** ✅ **construida y verificada 2026-07-01** · `demos/conserje/index.html` (standalone, 1 archivo).
> Los **6 escenarios** (1 Atención 24/7, 2 Agendar cita, 3 Capturar lead, 4 Recordatorio+reagenda,
> 5 Llamada→resumen, 6 Cotiza/deriva) van completos — se superó el mínimo viable (1·2·3·5).
> Mockup de teléfono con chat WhatsApp guionizado (typing + delays) + panel CRM que se llena en vivo
> (cita / lead / resumen+tarea / reagenda con hora tachada / derivación). Cero API, cero backend, cero red
> (salvo Google Fonts). Registrada en `movil/js/screens/demos.js` (1ª del array, ícono `whatsapp`) + `README.md`.
> Verificado por render (Preview MCP: 6 escenarios, responsive 375px sin desborde, consola limpia) + 77/77 tests.
> **Carpeta:** `demos/conserje/index.html` (standalone, patrón de `demos/auditor|gemelo|fugas`).
> **Leer junto a:** `PLAN-MAESTRO-TRIADA.md` (§6 Ola 2, §5 estándares) y el principio "Demo simulada, API diferida" del HANDOFF.

---

## 0. Principio rector de esta demo (y de todas las que sigan)

**Demo simulada, API diferida (try-before-buy).** El usuario **NO quiere contratar ninguna API por ahora.**
La estrategia es: **el cliente ve el Conserje funcionando "de verdad" (simulado), dice "quiero eso", y recién cuando se cobra la venta se invierte en la API/infra real.**

Por eso esta demo debe:
1. **Mostrar TODAS las ventajas y situaciones** del producto final (las de "qué haría una vez desplegado"), **simuladas de forma convincente y completa** — nunca a medias, nunca un placeholder obvio (ver `feedback_no_a_medias`).
2. **Cero API, cero backend, cero costo.** Todo el "cerebro" de trIA es un **guión sembrado** en JS (conversaciones + datos de ejemplo) con animación realista (typing, burbujas con delay, contadores).
3. Ser **honesta**: se etiqueta como demostración, y trae un **CTA de contratación** que explica **qué se activa al contratar** (WhatsApp real, línea telefónica, conexión al CRM/agenda).

---

## 1. Qué representa

La demo del **Conserje IA = el Motor 1 completo** vestido para venta. Engloba, en una sola pieza, lo que en el plan estaban como 3 ítems:
- **IA-1 · WhatsApp 24/7** (atiende, responde, agenda, califica y registra leads solo).
- **IA-2 · Transcripción de llamadas → CRM** (llama, transcribe, resume, crea tarea de seguimiento).
- **D5 · Asistente de reuniones** (confirma, reagenda, manda recordatorios).

> Nombre visible propuesto: **"Conserje IA"** — *trIA que atiende, agenda y cierra por ti, 24/7.*

---

## 2. Estructura de pantalla

- **Header + hero** igual que las otras demos (petróleo, logo 3 chevrons, badge `trIA · Conserje IA`, kick `Conserje IA · Tríada`).
  - H1 propuesto: *"El vendedor que nunca duerme."* · sub: *"trIA contesta tu WhatsApp y tu teléfono a cualquier hora — responde, agenda, cotiza y deja todo anotado en tu CRM. Míralo en acción."*
- **Escenario central = mockup de teléfono** (marco tipo celular) con un **chat de WhatsApp simulado** que se reproduce solo (burbujas con "escribiendo…" y delays). Junto/debajo, un **panel "resultado"** que muestra el efecto de la conversación (cita creada, lead en el CRM, resumen de llamada) apareciendo en vivo.
- **Selector de escenarios** (chips/botones): el usuario elige qué situación reproducir; cada una demuestra una función. Botón "▶ Reproducir" y "↺ Reiniciar".
- **Sección "Lo que hace por ti"**: 4-6 tarjetas de beneficios (24/7, no pierde leads, agenda sola, resume llamadas, responde al toque, nunca se enferma).
- **Bloque de contratación** (final): "Esto es una demostración…" + **qué se activa al contratar** + CTA a grupotriada.cl.
- **Footer** con disclaimer (igual patrón; recalcar "conversaciones de ejemplo").

---

## 3. Escenarios a incluir (guiones sembrados) — CADA UNO demuestra una función

Cada guión termina con un **micro-resultado visible** (el "cierre"), que es lo que engancha.

| # | Escenario | Qué muestra | Cierre visible |
|---|---|---|---|
| 1 | **Atención 24/7 + FAQ** | Cliente escribe **23:40** "¿atienden mañana?"; trIA responde al instante con horario y ofrece agendar | Sello "respondido en 3 s · 23:40" |
| 2 | **Agendar cita** | trIA ofrece 2-3 horarios, el cliente elige, trIA confirma | Tarjeta **"Cita creada"** cae en el panel (día/hora/servicio) |
| 3 | **Capturar lead** | Un desconocido consulta por un servicio; trIA califica (nombre, necesidad, presupuesto) | Ficha **"Nuevo lead"** aparece en el "CRM" con los datos |
| 4 | **Recordatorio + reagendar** | trIA manda recordatorio 1 día antes; el cliente pide cambiar hora; trIA reagenda solo | Cita se **actualiza** (hora tachada → nueva) |
| 5 | **Llamada → resumen** (IA-2) | Simula una llamada; la **transcripción** va apareciendo; al colgar, trIA genera **resumen + tarea** | Bloque **"Resumen de la llamada"** + tarea de seguimiento creada |
| 6 | **Cotiza / deriva** | trIA da un precio referencial; si es complejo, **deriva a un humano** con contexto | Aviso "Te contactará un asesor" + traspaso |

> Mínimo viable = escenarios **1, 2, 3, 5** (los 4 más vendibles). 4 y 6 si el tiempo alcanza.

---

## 4. Cómo se simula (sin API)

- Guiones como arreglos de mensajes `{ de:'cliente'|'tria', texto, delayMs }` en JS. Un "motor de reproducción" que va agregando burbujas con `setTimeout`/`rAF`, mostrando "escribiendo…" antes de cada mensaje de trIA.
- El "CRM" / panel de resultado son bloques HTML que se rellenan al llegar a cierto punto del guión (no hay datos reales; es sembrado).
- Reloj/hora de los mensajes = strings fijos en el guión (nada de `Date` real; recordar el gotcha: los timestamps se escriben en el guión).
- **Sin** `fetch`, **sin** Supabase, **sin** llaves. Cero red salvo las fuentes de Google.

---

## 5. Bloque de contratación (clave de la estrategia)

Texto guía (ajustable):
> **Esto es una demostración con conversaciones de ejemplo.** Al contratar, conectamos **tu número de WhatsApp** y **tu teléfono** reales, y trIA atiende de verdad — 24/7, sin descanso — dejando cada lead y cada cita en tu CRM.

**"Qué se activa al contratar"** (lista corta, honesta): número de WhatsApp Business real · atención telefónica con transcripción · integración con tu agenda y tu CRM · respuestas afinadas a tu negocio. → CTA **"Quiero mi Conserje IA →"** a grupotriada.cl.

---

## 6. Las 4 puertas (obligatorias)

1. **🔒 Seguridad** — no aplica backend; solo estático. Sin secretos. Incluir metas `Cache-Control: no-cache` (gotcha de caché ya visto en gemelo/fugas).
2. **🎨 Marca** — tokens/marca idénticos a `demos/auditor`. "trIA" siempre así escrito.
3. **🏗️ Construcción** — vanilla, un solo `index.html`, guiones separados en un `const ESCENARIOS = [...]` para editarlos fácil. Verificar por render (Preview MCP) antes de decir "funciona".
4. **📦 Integración** — registrar en `movil/js/screens/demos.js` (nueva entrada `conserje`, primera del array, ícono `whatsapp` o `phone`) + fila en `demos/README.md`. Se abre a pantalla completa desde **Más → Demos**.

---

## 7. Checklist de construcción (próxima sesión = manos a la obra)

- [ ] `demos/conserje/index.html` — header/hero/marca (copiar base de `auditor`).
- [ ] Mockup de teléfono + motor de reproducción de chat (typing + delays).
- [ ] Panel de resultado (cita / lead / resumen) que se rellena en vivo.
- [ ] Guiones de los escenarios 1, 2, 3, 5 (mínimo) + selector + reproducir/reiniciar.
- [ ] Sección de beneficios + bloque de contratación + footer.
- [ ] Registrar en `movil/js/screens/demos.js` + `demos/README.md`.
- [ ] **Verificar por render:** reproduce cada escenario, burbujas aparecen, resultado cae, responsive 375px sin desborde, 0 errores de consola. Correr `npm test` (no debe romper nada).
- [ ] Commit + push (GitHub Pages) → en vivo en `/demos/conserje/`.
- [ ] Actualizar HANDOFF (§4.2 → ✅), Plan Maestro §8-#12 y §9, y memoria.

---

## 8. Nota de alcance

Esta demo **cosecha la Ola 2 en modo demostración** (sin API). La **infra real** de la Ola 2 (Twilio + WhatsApp Business de Meta + backend always-on + API) queda **explícitamente diferida** hasta que un cliente compre — ahí se retoma §7-D2 del Plan Maestro. Mientras tanto, la demo es la herramienta de venta.
