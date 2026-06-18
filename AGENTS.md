# AGENTS.md — Estándar de ingeniería para agentes IA

> **Obligatorio.** Lee este archivo completo al inicio de cada sesión en este repositorio.
> Aplica la misma lógica en cualquier otro repo del workspace salvo que exista un `AGENTS.md`
> local que lo reemplace o lo refine.

Este documento existe para evitar **vibe coding** (generar código que “funciona” sin comprensión,
tests, CI ni gobernanza) y exigir **vibe engineering** (IA como acelerador bajo reglas verificables).

---

## 1. Principio rector

| Vibe coding (prohibido en producción) | Vibe engineering (obligatorio) |
|--------------------------------------|--------------------------------|
| Criterio: “compila / se ve bien” | Criterio: “pasa CI + tests + review mental” |
| Contexto solo en el chat | Contexto en el repo (`AGENTS.md`, `SECURITY.md`, ADRs) |
| `onclick=""` con datos dinámicos | Event delegation + `data-*` + listeners |
| `catch (_) {}` silencioso | Error visible (log + mensaje al usuario o re-throw) |
| README con emojis y stack obsoleto | README factual, actualizado en la misma sesión si cambia el stack |
| Cero tests, cero CI | CI mínimo desde el primer commit útil |
| Marcar ✅ sin verificar | Estados honestos: verificado / pendiente / roto |

**Regla de oro:** no commitees código que no puedas explicar, defender en review y depurar a las 2 AM.

---

## 2. Protocolo de sesión

### Al INICIO

1. Leer `AGENTS.md` (este archivo).
2. Leer `SECURITY.md` si existe.
3. Leer `docs/HANDOFF.md` si existe (estado vivo del proyecto).
4. Identificar si el trabajo es **demo** o **producción** (ver §10).
5. Revisar `.github/workflows/` — si no hay CI, crearlo antes de añadir features grandes.

### DURANTE el trabajo

1. Cambios mínimos y focalizados; no refactorizar módulos no relacionados.
2. Reutilizar patrones existentes del repo antes de inventar abstracciones nuevas.
3. Si generas HTML con datos de usuario/DB: usar escape sistemático (en TRIADA: `html\`\`` / `escHtml`).
4. No añadir `onclick="window._app....('${id}')"` con IDs o texto de usuario — usar `data-id` + listener.
5. No añadir `catch (_) {}` sin justificación documentada en el mismo bloque.
6. No hardcodear secretos (API keys privadas, service role, tokens). Claves *publishable*
   de Supabase van documentadas en `SECURITY.md`, nunca en commits nuevos sin revisión.

### Al FINAL

1. Ejecutar verificación local (§8).
2. Actualizar `README.md` si cambió stack, comandos, deploy o estructura.
3. Actualizar `docs/HANDOFF.md` si existe (estado, pendientes, bitácora).
4. **No marcar “funciona”** si solo pasó syntax check o preview con mocks.
5. Listar explícitamente qué quedó **sin verificar en entorno real**.

---

## 3. Archivos obligatorios del repositorio

Todo repo de producto (no demo desechable) debe tener:

| Archivo | Propósito |
|---------|-----------|
| `AGENTS.md` | Este estándar (adaptar §12 por proyecto) |
| `SECURITY.md` | Threat model, secretos, auth, RLS, formularios públicos |
| `README.md` | Stack real, cómo correr, deploy, estructura — **sin emojis decorativos** |
| `.github/workflows/ci.yml` | Pipeline mínimo (§8) |
| `tests/` o `*.test.js` | Al menos tests de utilidades críticas y mappers |
| `docs/HANDOFF.md` | Opcional pero recomendado para proyectos con Supabase/deploy externo |

Si falta alguno en un repo existente: **crearlo en la misma sesión** antes de seguir con features.

---

## 4. Definition of Done (DoD)

Un cambio **no está terminado** hasta cumplir todo lo aplicable:

- [ ] CI verde (o comandos equivalentes ejecutados localmente y documentados).
- [ ] Tests añadidos o actualizados para lógica nueva o bugs corregidos.
- [ ] Sin regresiones obvias de seguridad (XSS, IDOR, secretos, auth bypass).
- [ ] README/HANDOFF actualizados si el comportamiento o el setup cambió.
- [ ] Sin código muerto añadido; imports sin usar eliminados.
- [ ] Errores no tragados silenciosamente.
- [ ] Verificación descrita con honestidad (qué se probó y qué no).

---

## 5. Anti-patrones — NUNCA

### 5.1 Cero tests / cero CI

```
PROHIBIDO: mergear features sin pipeline que al menos ejecute syntax check + tests.
PROHIBIDO: decir "no hace falta test es solo un fix chico" en módulos de datos, auth o seguridad.
```

### 5.2 onclick inline con datos dinámicos

```javascript
// MAL — XSS, imposible CSP, acoplamiento global
`<button onclick="window._app.delete('${userId}')">`

// BIEN
`<button type="button" class="btn-delete" data-id="${escHtml(userId)}">`
// + en init: container.addEventListener('click', e => { ... e.target.closest('.btn-delete') ... })
```

### 5.3 innerHTML con input sin escapar

```javascript
// MAL
el.innerHTML = `<span>${lead.empresa}</span>`;

// BIEN (TRIADA)
el.innerHTML = html`<span>${lead.empresa}</span>`;
// o escHtml(lead.empresa) en plantillas manuales
```

### 5.4 Errores silenciosos

```javascript
// MAL
try { await fetchData(); } catch (_) {}

// BIEN
try { await fetchData(); } catch (err) {
  console.error('[modulo] fetchData', err);
  toast('No se pudieron cargar los datos.', 'error');
}
```

### 5.5 God-modules

Un archivo no debe mezclar: fetch Supabase + reglas de negocio + render HTML + wiring de eventos.
Separar en capas (ver patrón `modules/ai-commander/` en TRIADA).

### 5.6 README desactualizado o informal

- No usar emojis en títulos, listas ni roadmap (🚀 ✅ 🔥 etc.).
- No afirmar stack obsoleto (ej. IndexedDB si ya es Supabase).
- No dejar roadmap con ítems ya implementados sin marcar hechos.
- Fecha o referencia al HANDOFF si el README es escueto.

### 5.7 Verificación falsa

```
PROHIBIDO: ✅ "auth funciona" sin probar login real.
PROHIBIDO: ✅ "RLS aplicado" sin correr SQL en Supabase y probar REST anon/auth.
PROHIBIDO: ✅ "XSS cerrado" sin revisar todos los sinks (innerHTML, onclick, atributos).
```

Usar: **Verificado** | **Implementado, pendiente verificar en prod** | **Roto** | **Pendiente**.

### 5.8 IA en el cliente con claves privadas

Las API keys de LLM van en Edge Functions / backend. El front solo llama un endpoint propio.
Ver `modules/ai-commander/infrastructure/ai-providers.js` como referencia.

### 5.9 getAll() sin paginación en vistas nuevas

No añadir listados que traigan tablas enteras al browser. Usar `page({ limit, offset })` o equivalente.

---

## 6. Patrones — SIEMPRE

### 6.1 Arquitectura por capas (módulos nuevos o refactors)

```
modules/<nombre>/
  domain/          entidades, reglas, ports (interfaces)
  application/     casos de uso (sin DOM, sin Supabase directo)
  infrastructure/  adaptadores (Supabase, APIs)
  presentation/    render + eventos (sin lógica de negocio pesada)
  <nombre>.js      composition root (inyección)
```

Copiar `modules/ai-commander/` como plantilla en TRIADA-CRM.

### 6.2 Datos: repository con mappers

- Un solo lugar por entidad para `fromRow` / `toRow`.
- Preferir factory `makeRepo(table, from, to)` sobre CRUD copy-paste.
- Invalidar caché de lectura tras mutaciones.

### 6.3 Seguridad en front

- Escapar toda interpolación de datos externos en HTML.
- Nunca confiar en RLS como única defensa si la anon key es pública: cerrar signup público,
  rate-limit en forms anónimos, tokens firmados en enlaces públicos.
- Documentar cada excepción en `SECURITY.md`.

### 6.4 Eventos: delegation, no globals

- Reducir `window._app` / `window._aic` — objetivo a largo plazo: eliminar onclick inline.
- Un listener por contenedor para acciones repetidas (tablas, kanban, modales).

### 6.5 Commits

- Mensajes en imperativo, 1–2 frases, foco en el *por qué*.
- No commitear `.env`, `config.local.js` con secretos, ni dumps de credenciales.

---

## 7. Estándares de documentación

### README.md

Debe incluir (actualizado):

1. Qué es el producto (1 párrafo).
2. Stack real (frontend, backend, deploy).
3. Cómo correr local (`npx serve`, variables, Supabase si aplica).
4. Estructura de carpetas (árbol breve).
5. Enlaces a `AGENTS.md`, `SECURITY.md`, `docs/HANDOFF.md`.

Prohibido: emojis decorativos, promesas de features no implementadas, instrucciones obsoletas.

### SECURITY.md

Ver archivo en la raíz. Actualizar cuando cambie auth, RLS, forms públicos o integraciones.

### HANDOFF.md (TRIADA y proyectos similares)

- Fuente de verdad del estado.
- Bitácora al final de cada sesión.
- Separar "código pusheado" vs "verificado en Supabase/prod".

---

## 8. CI y tests mínimos

### CI (`.github/workflows/ci.yml`)

Debe ejecutarse en push y PR a `main`:

1. `node --check` en todos los archivos `.js` del repo (excluir `node_modules`).
2. `npm test` (tests con Node test runner nativo).
3. (Opcional) grep fail si aparece `catch (_)` nuevo sin comentario `// intentional`.

### Tests mínimos obligatorios

| Área | Qué testear |
|------|-------------|
| Utilidades | `escHtml`, `html\`\``, formatters, parsers |
| Mappers DB | round-trip `fromRow(toRow(x))` para entidades críticas |
| Reglas de dominio | funciones puras en `domain/` |
| Seguridad | casos XSS en helpers de escape |

No hace falta E2E completo al inicio; sí tests unitarios en lo que romper producción si falla.

Comando local antes de push:

```bash
npm test
node --check app.js js/*.js modules/**/*.js
```

---

## 9. Matriz de riesgo — cuándo exigir más rigor

| Área | Nivel | Requisito extra |
|------|-------|-----------------|
| Demo / prototipo desechable | Bajo | DoD relajado; igualmente sin secretos en repo |
| UI estática, copy, CSS | Medio | Review visual; sin lógica de datos |
| CRUD interno autenticado | Alto | Tests mappers + escape + CI |
| Auth, RLS, SQL migrations | Crítico | Verificación manual en Supabase + documentar en HANDOFF |
| Forms públicos / anon insert | Crítico | Rate-limit, validación, escape, revisión SECURITY.md |
| Pagos, PII, facturación | Crítico | Tests + review de permisos + no silent catch |
| Operaciones destructivas (DELETE masivo, DROP) | Crítico | Confirmación humana fuera del agente; nunca autónomo |

---

## 10. Demo vs producción

- **Demo:** código desechable, pocas pantallas, sin datos reales. Igual: no secretos, no mentir en docs.
  No exige CI completo si el usuario lo declara explícitamente como demo temporal.
- **Producción (TRIADA-CRM, clientes, CRM, SaaS):** este documento completo es obligatorio.
- Ante duda, tratar como **producción**.

---

## 11. Checklist de remediación — TRIADA-CRM

Aplicar en orden de prioridad. No añadir features grandes hasta cerrar ítems CRÍTICOS.

### CRÍTICO (operación / seguridad)

- [ ] Supabase: **Allow new users to sign up = OFF** (bypass auth con anon key).
- [ ] Correr `supabase/correlativos_rls.sql` si no está aplicado.
- [ ] Verificar RLS multitenancy con sesión auth real (no solo anon REST).
- [ ] Invitaciones socios + roles en `profiles` (ver HANDOFF §1).

### ALTO (deuda vibe coding)

- [ ] CI en `.github/workflows/ci.yml` — mantener verde.
- [ ] Tests en `tests/` para escape XSS y mappers de `js/db.js`.
- [ ] Eliminar onclick inline en módulos tocados (empezar por `modals.js`, `pipeline.js`).
- [ ] Sustituir `catch (_) {}` por manejo explícito en archivos tocados.
- [ ] README alineado con Supabase + auth + deploy real (sin emojis).
- [ ] Paginación en listados principales (`makeRepo.page`).
- [ ] Rate-limit o CAPTCHA en `diagnostico-publico.html`.

### MEDIO (mantenibilidad)

- [ ] Repository factory en `js/db.js` (eliminar CRUD duplicado).
- [ ] Refactor incremental de god-modules hacia patrón `ai-commander`.
- [ ] CSP meta tag (empezar permisiva).
- [ ] Unificar config (`js/supabase.js` vs `config.local.js`) con decisión documentada.
- [ ] Commitear trabajo pendiente documentado en HANDOFF (limpieza P0/P1).

### BAJO

- [ ] Evaluar `modules/mascota/` para build empresarial.
- [ ] Edge Function `ai-complete` antes de conectar LLM real.
- [ ] ADRs en `docs/adr/` para decisiones de datos y auth.

---

## 12. Plantilla rápida para repos nuevos

Al crear un repo nuevo, copiar y adaptar:

1. Este `AGENTS.md` (ajustar §11 por proyecto).
2. `SECURITY.md` (auth, secretos, dependencias).
3. `.github/workflows/ci.yml` del template TRIADA.
4. `tests/smoke.test.js` con al menos un test que pase.
5. `README.md` factual desde el día 1.
6. `.gitignore` con `.env`, `config.local.js`, `node_modules`.

---

## 13. Referencias internas TRIADA

| Recurso | Uso |
|---------|-----|
| `docs/HANDOFF.md` | Estado vivo, gotchas, pendientes Supabase |
| `docs/AUDITORIA_EMPRESARIAL.md` | Hallazgos OWASP, scores, backlog |
| `docs/LIMPIEZA_P0_P1.md` | Qué se limpió y qué se excluyó deliberadamente |
| `modules/ai-commander/` | Plantilla arquitectónica de referencia |
| `js/utils.js` | `escHtml`, `html\`\``, `raw()` |
| `SECURITY.md` | Reglas de seguridad del proyecto |

---

*Última actualización: 2026-06-16. Mantener este archivo cuando cambien reglas de equipo o stack.*
