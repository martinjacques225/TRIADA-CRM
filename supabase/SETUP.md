# Setup de Supabase — TRIADA CRM

Guía corta (~5 min) para dejar el backbone listo. Ver el diseño en `docs/SUPABASE_PLAN.md`.

## 1. Crear el proyecto
1. Entra a **https://supabase.com** → *Start your project* (gratis) → inicia sesión.
2. **New project**: nombre `triada-crm`, contraseña de la base (guárdala), región la más cercana (ej. South America / São Paulo).
3. Espera ~2 min a que aprovisione.

## 2. Correr el esquema
1. En el proyecto → menú izquierdo → **SQL Editor** → **New query**.
2. Abre `supabase/schema.sql` (de este repo), **copia todo** y pégalo.
3. **Run**. Debe decir *Success*. (Crea tablas, correlativos, triggers y RLS.)

## 3. Crear tu usuario admin
1. Menú izquierdo → **Authentication** → **Users** → **Add user** → tu email + contraseña.
2. Vuelve a **SQL Editor** y corre (con tu email):
   ```sql
   update profiles set role = 'admin', nombre = 'Martín' where email = 'TU_EMAIL';
   ```

## 4. Obtener las llaves
1. Menú izquierdo → **Project Settings** (engranaje) → **API**.
2. Copia:
   - **Project URL**
   - **anon public** (en *Project API keys*)

## 5. Pasármelas
Envíame esos dos valores (Project URL + anon public key) y tu email admin.
Yo creo `js/config.local.js` (no va al repo) e integro auth + `db.js`.

> La **anon key es pública** (segura, protegida por RLS). La **service_role key NO** me la pases ni la subas a ningún lado.
