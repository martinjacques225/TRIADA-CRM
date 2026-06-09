# Plan — Nuevo Home + correcciones UX

**Objetivo:** llevar el panel principal al diseño del mockup y, de paso, aplicar las 6 correcciones UX detectadas (tipografía, contraste, foco, tooltips, targets táctiles, mascota intrusiva).

**Decisiones ya tomadas:**
- **Home nuevo + Dashboard actual:** se crea una vista `home` con el mockup como landing. El `dashboard` actual queda como vista analítica aparte.
- **Actividad reciente:** se implementa con un **log de eventos nuevo** (store `events` en IndexedDB).
- **Leads calientes:** la regla la defines tú. Hasta entonces se usa un placeholder (ver Fase 1).

**Regla de oro respetada:** las vistas hablan con `services/`, nunca con `js/db.js`. `main` siempre funcional; todo esto va en rama aparte. Al cambiar assets se sube `CACHE` en `sw.js`.

---

## 1. Mapa del mockup → estado actual

| Bloque del mockup | Hoy | Acción |
|---|---|---|
| Ítem de menú **Home** | No existe (el menú abre en Dashboard) | **Nuevo** ítem + vista |
| Nivel **"Silver II"** con nombre | `calcNivel` devuelve número ("Nivel 0") | **Nuevo** mapeo nivel→nombre |
| Footer **"Último respaldo Hoy 11:30"** | No se guarda timestamp | **Nuevo** (config `lastBackup`) |
| KPIs superiores (Meta mensual, Próxima medalla, Comisión proyectada, BPI) | Existen cálculos, otro set | **Reusar** motores, recomponer |
| **Misión del día** (Citas, Seguimientos, Leads calientes 🔥, Venta para medalla, Comisión) + mascota | No existe | **Nuevo** |
| **Próximas citas** | Existe en dashboard (`dh-appt`) | **Reusar** |
| **Actividad reciente** (timeline) | No existe | **Nuevo** (store `events`) |
| **Tu rendimiento** (donut) | Existe en panel dashboard | **Reusar** |
| **Rendimiento del mes** (mini-KPIs + donut + Evolución con selector) | Gráficos existen, sin selector | **Reusar** + selector de rango |
| Banner inferior "¡Sigue así!" + "Tu mejor día fue el Jueves" | Banner existe, sin insight | **Reusar** + motor "mejor día" |
| Mascota dentro de la página (hero + banner) | Solo burbuja flotante intrusiva | **Mover** a la página + atenuar la flotante |

---

## 2. Funciones nuevas a agregar

1. **Log de eventos** — store `events` (DB_VERSION 2→3, migración no destructiva), `services/event.service.js`, y *hooks* al crear lead / venta / reagenda / medalla / cita. Campos: `tipo`, `titulo`, `detalle`, `refId`, `timestamp`.
2. **Niveles con nombre** — mapa `nivel → {tier, sub}` (ej. Bronze/Silver/Gold/Platino/Diamante × I-II-III). Solo presentación; no cambia el motor de medallas (1 medalla/4 ventas semana, 1 nivel/5 medallas).
3. **Leads calientes** — motor en `lead.service.js`. *Pendiente tu regla*; placeholder por defecto: estado en {Seguimiento, Propuesta enviada} con actividad en los últimos N días.
4. **Mejor día de la semana** — motor que cuenta cierres por día y devuelve el máximo ("Jueves con 3 cierres").
5. **Selector de rango** en el gráfico de evolución (Semana / Mes / Año).
6. **Último respaldo** — guardar `lastBackup` al exportar; mostrar en footer del nav.
7. **Mascota integrada** — render estático en Home (hero + banner) reutilizando `MASCOTAS`.

---

## 3. Correcciones UX integradas

- **Tipografía:** subir base a 15-16px y piso de labels a ~11px (eliminar `.58–.66rem`).
- **Contraste:** texto informativo con `--text2` (no `--text3`).
- **Foco visible:** `:focus-visible` global con outline `--primary` en botones, nav-items y tarjetas.
- **Nav colapsado (769–900px):** `title`/`aria-label` en los íconos.
- **Targets táctiles:** `.btn-icon` y chevrons a 40-44px en móvil.
- **`aria-label`** consistente en todos los icon-buttons.
- **Mascota:** quitar los tips temporizados y el 55% por navegación; queda en Home y reaparece solo en eventos con sentido (medalla, regreso, primera venta).

---

## 4. Fases (alineadas al git-flow)

Cada fase: Claude prepara y verifica (sintaxis + imports) → tú pruebas en navegador → commit/push manual. Bump de `CACHE` en `sw.js` cuando cambien assets; registrar en `docs/CHANGELOG.md`.

**Fase 0 — Base UX (solo CSS/tokens, riesgo bajo).** Tipografía, contraste, `:focus-visible`, tooltips, targets, aria. No toca lógica.

**Fase 1 — Datos y motores.** Store `events` (DB v3 + migración) y `event.service.js`; mapeo de niveles; motores "mejor día" y "leads calientes" (placeholder); `lastBackup`. Solo capa servicios/utils.

**Fase 2 — Vista Home (esqueleto).** `modules/home/home.js` + `home.css`, ítem de menú **Home**, topbar y navegación. Reutiliza render de dashboard donde aplica. KPIs superiores + Próximas citas + Tu rendimiento + Rendimiento del mes.

**Fase 3 — Bloques nuevos.** Misión del día, Actividad reciente, banner con insight, selector de rango. Mascota estática integrada.

**Fase 4 — Mascota.** Re-tunear la burbuja flotante (eventos significativos), ya que ahora vive en Home.

**Fase 5 — QA y cierre.** Responsive (incl. decidir Home en bottom-nav móvil), dark mode de los componentes nuevos, bump de `CACHE`, CHANGELOG + CLAUDE_CONTEXT.

---

## 5. Decisiones pendientes (tuyas)

1. **Regla de "leads calientes"** — ¿cuál es el criterio exacto? (estado + días, score, marca manual…).
2. **Bottom-nav móvil** — hoy tiene 5 ítems (Agenda, Leads, Comisión, Stats, Config). ¿Agrego Home y quito cuál? Propuesta: Home, Agenda, Leads, Comisión, Config (mover Stats al menú lateral).
3. **Nombres de niveles** — ¿usamos Bronze/Silver/Gold/Platino/Diamante o tu propia nomenclatura?

---

## 6. Notas técnicas

- La migración `DB_VERSION 2→3` solo **agrega** el store `events`; no toca stores existentes → sin riesgo para datos actuales.
- Los números del mockup (12 citas, 3 leads calientes) son ilustrativos; los reales saldrán de los motores.
- Nada de esto cambia los cálculos de comisión/BPI/medallas existentes; solo presentación y datos nuevos.
