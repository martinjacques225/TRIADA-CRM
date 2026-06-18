# SECURITY.md — TRIADA CRM

> Reglas de seguridad obligatorias. Los agentes IA deben leer este archivo junto con `AGENTS.md`
> antes de tocar auth, SQL, forms públicos o integraciones.

---

## 1. Modelo de amenazas

| Activo | Riesgo principal | Control |
|--------|------------------|---------|
| Datos CRM (leads, clientes, facturas) | Broken access control, IDOR | RLS por `org_id`, signup cerrado |
| Sesión consultor (JWT en localStorage) | XSS → robo de token | Escape sistemático, CSP (pendiente), no onclick con user data |
| Form público diagnóstico | Spam, XSS almacenado, abuso insert | Escape + rate-limit (pendiente) + RLS insert anónimo acotado |
| Claves Supabase anon (pública en front) | Signup abierto = acceso total | **Signup OFF** en Supabase Auth |
| Tabla `correlativos` | DoS por sobrescritura | RLS deny-all + RPC `next_correlativo` SECURITY DEFINER |
| Audit `actividad` | Borrado/alteración | Triggers audit + RLS solo lectura para authenticated |
| IA / LLM | Filtración PII, claves en cliente | Edge Function server-side; ver `ai-providers.js` |

---

## 2. Configuración Supabase (operación manual)

Estas acciones **no las puede cerrar el código solo**. Verificar en cada deploy crítico:

1. **Authentication → Allow new users to sign up: OFF**
   - Con anon key pública, signup ON = cualquiera entra al CRM.
2. **Site URL y Redirect URLs** = URL de GitHub Pages del CRM.
3. **SQL aplicado** (en orden, idempotente donde indique el doc):
   - `supabase/schema.sql`
   - `supabase/multitenancy.sql`
   - `supabase/correlativos_rls.sql`
   - `supabase/indices.sql`
   - `supabase/rls_perf.sql`
   - Migraciones de feature (`presupuestos.sql`, `ai_commander.sql`, etc.)
4. **Invitaciones** vía Supabase Auth (no signup público) para nuevos usuarios.

---

## 3. Secretos

| Secreto | Dónde puede vivir | Dónde NO |
|---------|-------------------|----------|
| Supabase anon / publishable key | `js/supabase.js` (pública por diseño en GitHub Pages) | — |
| Supabase service role | Supabase dashboard / Edge Functions secrets | Nunca en front, nunca en git |
| API keys LLM (OpenAI, Anthropic) | Edge Function env | Nunca en front |
| `.env` / `config.local.js` | Máquina local, gitignored | Nunca commitear |

Pre-commit recomendado: escaneo de secretos (Gitleaks o equivalente) cuando se añada CI completo.

---

## 4. Frontend — XSS y render

### Obligatorio

- Interpolar datos de usuario/DB en HTML con `html\`\`` o `escHtml()` (`js/utils.js`).
- `escHtml` debe escapar: `& < > " '` (comilla simple incluida — XSS en atributos/onclick).
- HTML confiable (íconos SVG internos): usar `raw()` dentro de `html\`\``.

### Prohibido

- `innerHTML` con concatenación directa de campos de lead/cliente/prospecto.
- `onclick="...('${variable}')"` cuando `variable` viene de DB o formulario.
- Pegar API keys o tokens en README, HANDOFF o issues.

### Sinks a revisar en cada PR que toque UI

`home.js`, `modals.js`, `pipeline.js`, `informes.js`, `diagnostico-publico.html`, vistas de `ai-commander/presentation/`.

---

## 5. Autorización

- **RLS:** toda tabla con datos de negocio debe filtrar por `org_id = auth_org_id()` salvo excepción documentada aquí.
- **Roles:** cambios de `role`, `org_id`, `activo` en `profiles` bloqueados por trigger (solo admin).
- **Delete sensible:** facturas — solo admin (ver multitenancy.sql).
- **Form público:** insert anónimo solo en tablas/policies explícitas; nunca lectura anónima de CRM.

---

## 6. Enlaces y formularios públicos

`diagnostico-publico.html`:

- Validar `lead_id` / token antes de renderizar (enlace inválido = mensaje, no form).
- Pendiente: token firmado con expiry, rate-limit por IP, CAPTCHA en insert anónimo.
- No exponer stack traces ni mensajes PostgREST crudos al usuario final.

---

## 7. IA (AI Commander)

- Estado actual: **sin conexión a LLM** (`AI_CONFIG.edgeFunctionUrl = null`).
- Para activar: desplegar Edge Function `ai-complete` con clave server-side.
- No enviar PII de clientes a LLM sin política de retención acordada.
- Registrar prompts/respuestas en audit según diseño existente.

---

## 8. Checklist pre-deploy (agente o humano)

- [ ] Signup público OFF verificado en dashboard Supabase.
- [ ] Migraciones SQL pendientes corridas y anotadas en HANDOFF.
- [ ] Sin `innerHTML` nuevo sin escape en diff.
- [ ] Sin secretos privados en diff.
- [ ] CI verde (syntax + tests).
- [ ] Forms públicos probados con payload malicioso básico (`<script>`, `'`, `"`).

---

## 9. Incidentes conocidos / lecciones

| Incidente | Lección |
|-----------|---------|
| XSS almacenado vía campo `empresa` en lead | Escape + sacar user data de onclick |
| Signup abierto + anon key | Config Auth, no solo RLS |
| `correlativos` sin RLS | Tablas de sistema también necesitan políticas |
| ✅ falsos en HANDOFF | Verificar REST anon + sesión auth antes de marcar cerrado |

---

*Última actualización: 2026-06-16. Actualizar cuando cambie auth, RLS o superficie pública.*
