# Fase 1 — Login, equipo, clientes y obras · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una PWA en español donde Carlos (jefe) entra con usuario y contraseña, da de alta a los trabajadores, gestiona clientes y obras y asigna obras a trabajadores; cada trabajador entra y ve solo sus obras asignadas.

**Architecture:** Next.js App Router con Server Components y Server Actions; toda la lectura/escritura pasa por Supabase con la sesión del usuario, y la seguridad la impone Postgres con RLS (la UI solo oculta, nunca protege). Las únicas operaciones con `service_role` (crear/editar usuarios de Auth) viven en Server Actions que comprueban antes que quien llama es jefe.

**Tech Stack:** Next.js (última estable) + TypeScript estricto + Tailwind CSS v4, `@supabase/supabase-js` + `@supabase/ssr`, Supabase CLI (Postgres local en Docker), pgTAP (`supabase test db`), Vitest, Playwright (Chromium en `/opt/pw-browsers/chromium`).

**Spec:** `docs/spec.md`

## Hoja de ruta (una fase = un plan; las fases 2–6 se planifican al terminar la anterior)

| Fase | Módulos | Entregable |
|---|---|---|
| **1 (este plan)** | 1 Login · 2 Clientes y obras | App desplegable con usuarios, clientes, obras y asignaciones |
| 2 | 3 Agenda + recordatorios | Citas/fechas límite por obra y persona; aviso por email (y notificación web si el móvil lo permite) N días antes |
| 3 | 4 Tareas por persona | Asignar, marcar hecho, fecha límite |
| 4 | 5 Checklist por obra | Lista de materiales/herramientas con marcado antes de salir |
| 5 | 6 Finanzas básicas | Ingresos, gastos, facturas pendientes, exportación `.xlsx` |
| 6 | 7 Documento de presupuesto | Plantilla rellenable (medidas, fotos, materiales) |

## Global Constraints

- Todo el texto visible en español (es-ES). Moneda `EUR` con `Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })`; fechas con `es-ES`.
- Roles exactamente: `jefe`, `trabajador`.
- App de uso interno: solo el jefe y los trabajadores. Todas las rutas salvo `/login` exigen sesión; `robots: { index: false, follow: false }` en `layout.tsx` y `app/robots.ts` con `disallow: '/'`.
- Sin registro público: en `supabase/config.toml` `[auth] enable_signup = false`; los usuarios solo los crea el jefe (o el script de arranque).
- Login con **nombre de usuario** + contraseña. Internamente Supabase Auth usa email: `usuario` → `usuario@usuarios.local` (función `usernameToEmail`). Confirmación de email desactivada.
- RLS activada en **todas** las tablas de `public`. Ninguna clave `service_role` en código de cliente (`SUPABASE_SERVICE_ROLE_KEY` solo en `lib/supabase/admin.ts`, importado con `import 'server-only'`).
- Mobile-first: todo input/select/textarea con `font-size` ≥ 16px; estilos hover solo bajo `@media (hover: hover)`; `viewport-fit=cover` + `env(safe-area-inset-*)`; usar `100dvh`, nunca `100vh`; objetivos táctiles ≥ 44px.
- PWA: `app/manifest.ts` (name "Mantenimiento", `display: 'standalone'`, `lang: 'es'`), iconos 192/512 + maskable, `theme_color` igual al color de la barra superior. Sin service worker offline en esta fase (no se pidió funcionamiento sin conexión).
- Interfaz diseñada con las skills `impeccable` (en lugar de `frontend-design`, ya cubierta) y `mobile-native`; patrones de datos con `supabase`, `supabase-postgres-best-practices` y `vercel-react-best-practices`.
- Nada fuera de la spec sin preguntar (sin búsqueda, sin filtros avanzados, sin modo offline, sin fotos en esta fase).

## Decisiones confirmadas (2026-10-18)

1. Los trabajadores **sí ven** el presupuesto de sus obras asignadas → columna `obras.presupuesto`.
2. El trabajador **sí puede cambiar el estado** de sus obras asignadas (solo el estado) → función `public.cambiar_estado_obra`.
3. Cliente con campo opcional `telefono` (aprobado).
4. Repositorio GitHub **privado**.
5. Despliegue: Vercel + proyecto Supabase en la nube (gratuitos). Para desplegar hace falta que crees el proyecto de Supabase (pasos en el README).

## Modelo de datos (Task 2 lo implementa)

- `profiles(id uuid pk → auth.users on delete cascade, username text unique not null, nombre text not null, rol rol_usuario not null default 'trabajador', activo boolean not null default true, created_at timestamptz default now())`
- `clientes(id uuid pk default gen_random_uuid(), nombre text not null, direccion text, administrador text, telefono text, created_at)` — `nombre` puede ser una persona o "Comunidad C/ Mayor 5"; `administrador` = administrador de fincas / presidente.
- `obras(id uuid pk, cliente_id uuid not null → clientes on delete restrict, titulo text not null, direccion text not null, tipo_trabajo tipo_trabajo not null, presupuesto numeric(12,2) check (presupuesto >= 0), estado estado_obra not null default 'pendiente', created_at)` + índice en `cliente_id`.
- `obra_trabajadores(obra_id → obras on delete cascade, user_id → profiles on delete cascade, primary key (obra_id, user_id))` + índice en `user_id`.
- Enums: `rol_usuario('jefe','trabajador')`; `tipo_trabajo('reparacion','tejado','canalones','chimenea','pintura','trabajo_altura','otro')`; `estado_obra('pendiente','presupuestada','en_curso','terminada','cancelada')`.
- Etiquetas en español en `lib/etiquetas.ts` (p. ej. `trabajo_altura` → "Trabajos en altura", `en_curso` → "En curso").

## Review Focus

1. **Trabajador que abre por URL una obra o cliente no asignado** (`/obras/<id>` de otro): debe ver "No encontrado", nunca datos. → Task 2 (pgTAP) y Task 6 (e2e).
2. **Nombres de usuario con mayúsculas, espacios o tildes** ("José Luis"): el login debe ser insensible a mayúsculas y espacios al principio/final; al crear, solo se aceptan `[a-z0-9._-]` de 3–30 caracteres con mensaje claro. → Task 3 (unit).
3. **Presupuesto escrito al estilo español** ("1.250,50", "1250,5", "1250"): se guarda 1250.50; texto inválido o negativo da error, no 0. → Task 6 (unit).
4. **Trabajador desactivado con la sesión abierta en el móvil:** en la siguiente navegación debe salir a `/login` con "Usuario desactivado". → Task 4 (e2e).
5. **El jefe se quita a sí mismo el rol o se desactiva:** debe impedirse (quedaría la empresa sin jefe). → Task 4 (unit en la acción + e2e).

---

## File Structure

```
app/
  layout.tsx                 viewport, fuentes, theme-color, <html lang="es">
  manifest.ts                manifest PWA
  globals.css                tokens de diseño + reglas mobile-native
  login/page.tsx             formulario usuario/contraseña
  login/actions.ts           signIn, signOut
  (app)/layout.tsx           shell autenticado: cabecera + navegación inferior; exige sesión y perfil activo
  (app)/page.tsx             inicio: jefe → resumen de obras por estado; trabajador → "Mis obras"
  (app)/equipo/...           page.tsx, nuevo/page.tsx, [id]/page.tsx, actions.ts (solo jefe)
  (app)/clientes/...         page.tsx, nuevo/page.tsx, [id]/page.tsx, actions.ts
  (app)/obras/...            page.tsx, nuevo/page.tsx, [id]/page.tsx, [id]/editar/page.tsx, actions.ts
components/                  Field.tsx, SubmitButton.tsx, BottomNav.tsx, EstadoBadge.tsx, EmptyState.tsx
lib/
  supabase/server.ts         createClient() para Server Components/Actions
  supabase/client.ts         createClient() navegador
  supabase/admin.ts          createAdminClient() service_role, server-only
  supabase/proxy.ts          updateSession(request)
  auth.ts                    getCurrentProfile(), requireJefe()
  username.ts                normalizeUsername, validateUsername, usernameToEmail
  importe.ts                 parseImporte, formatEUR
  etiquetas.ts               etiquetas de enums
  database.types.ts          generado por `supabase gen types`
proxy.ts                     refresco de sesión (si la versión de Next instalada aún usa `middleware.ts`, ese nombre)
scripts/create-user.ts       alta de usuarios por terminal (primer jefe)
supabase/migrations/…_fase1.sql
supabase/tests/rls_fase1.test.sql
supabase/seed.sql            datos de prueba locales (jefe "carlos", trabajador "pepe", 2 clientes, 3 obras)
tests/unit/*.test.ts         Vitest
tests/e2e/*.spec.ts          Playwright
README.md
```

---

### Task 1: Esqueleto del proyecto, PWA y dirección visual

**Files:**
- Create: proyecto Next.js (`create-next-app --ts --tailwind --app --eslint --no-src-dir --import-alias "@/*"`), `app/layout.tsx`, `app/manifest.ts`, `app/globals.css`, `public/icons/*`, `vitest.config.ts`, `playwright.config.ts`, `supabase/` (`supabase init`), `.env.example`
- Test: `tests/e2e/pwa.spec.ts`

**Interfaces:**
- Produces: tokens CSS en `:root` (`--color-bg`, `--color-surface`, `--color-text`, `--color-muted`, `--color-accent`, `--color-danger`, `--radius`), clases Tailwind mapeadas a ellos; scripts npm `dev`, `build`, `test` (vitest), `test:e2e` (playwright), `db:test` (`supabase test db`), `db:types`.

- [ ] **Step 1:** Cargar skills `impeccable` y `mobile-native`; fijar la dirección visual (paleta sobria tipo "taller": fondo claro cálido, acento naranja de señalización, tipografía legible al sol, sin aspecto de plantilla) y escribirla como tokens en `globals.css`. Incluir: `-webkit-tap-highlight-color: transparent`, `overscroll-behavior-y: none` en `body`, `touch-action: manipulation`, `user-select: none` en botones, inputs a 16px.
- [ ] **Step 2: Test fallido** `tests/e2e/pwa.spec.ts`:
  - `GET /manifest.webmanifest` → 200, `json.lang === 'es'`, `json.display === 'standalone'`, iconos con `sizes` "192x192" y "512x512".
  - En viewport 390×844, `meta[name=viewport]` contiene `viewport-fit=cover`; `getComputedStyle(input).fontSize` ≥ 16px en `/login`.
- [ ] **Step 3:** Implementar `manifest.ts`, `viewport` export en `layout.tsx` (`themeColor`, `viewportFit: 'cover'`), iconos.
- [ ] **Step 4:** `npm run test:e2e -- pwa` → PASS; `npm run build` → sin errores.
- [ ] **Step 5:** Commit `chore: esqueleto Next.js + Supabase + PWA`.

### Task 2: Esquema de base de datos y RLS

**Files:**
- Create: `supabase/migrations/<timestamp>_fase1.sql`, `supabase/seed.sql`, `supabase/tests/rls_fase1.test.sql`, `lib/database.types.ts`, `lib/etiquetas.ts`

**Interfaces:**
- Produces: tablas y enums del *Modelo de datos*; función `public.es_jefe() returns boolean` (`security definer`, `stable`, `set search_path = ''`, true si `profiles.rol = 'jefe' and activo` para `auth.uid()`); función `public.es_activo() returns boolean` igual pero solo `activo`; función `public.cambiar_estado_obra(p_obra uuid, p_estado estado_obra) returns void` (`security definer`, `set search_path = ''`): actualiza solo `estado` si quien llama es jefe o trabajador activo asignado a esa obra; si no, `raise exception 'No autorizado'`.

Políticas (rol `authenticated`; usar `(select public.es_jefe())` por rendimiento):
- `profiles`: select si `id = (select auth.uid())` o jefe. Sin insert/update/delete para `authenticated` (se gestionan con service_role).
- `clientes`: jefe todo; trabajador activo select si existe obra de ese cliente asignada a él.
- `obras`: jefe todo; trabajador activo select si existe fila en `obra_trabajadores` con su `user_id` (sin política de update para trabajadores: el estado lo cambian con `cambiar_estado_obra`).
- `obra_trabajadores`: jefe todo; trabajador select de sus filas.
- `anon`: sin acceso a nada.

- [ ] **Step 1: Test fallido** `rls_fase1.test.sql` (pgTAP, simulando usuarios con `set local role authenticated; set local request.jwt.claims = '{"sub":"<uuid>"}'`). Con seed: jefe J, trabajadores A y B, obra O1 asignada a A, obra O2 asignada a B, clientes C1 (de O1), C2 (de O2):
  - A: `select count(*) from obras` = 1 (con `presupuesto` visible); `from clientes` = 1; `from profiles` = 1.
  - A: `insert into clientes` → lanza error RLS; `update obras set titulo='x' where id=O1` afecta 0 filas; `update profiles set rol='jefe'` afecta 0 filas.
  - A: `select cambiar_estado_obra(O1,'en_curso')` → O1 queda `en_curso` y el resto de columnas igual; `cambiar_estado_obra(O2,'terminada')` → lanza 'No autorizado'.
  - A desactivado (`activo=false`): `select count(*) from obras` = 0.
  - J: ve 2 obras, 2 clientes, 3 perfiles; puede insertar cliente y cambiar el estado de cualquier obra.
  - `anon`: `select count(*) from obras` = 0.
  - `delete from clientes where id=C1` como J → error de FK (tiene obras).
- [ ] **Step 2:** `supabase start && supabase test db` → FAIL (tablas no existen).
- [ ] **Step 3:** Escribir migración + seed (cargar skill `supabase-postgres-best-practices` antes).
- [ ] **Step 4:** `supabase db reset && supabase test db` → todos PASS; `npm run db:types` genera `lib/database.types.ts`.
- [ ] **Step 5:** Commit `feat(db): esquema fase 1 con RLS`.

### Task 3: Login con usuario y contraseña

**Files:**
- Create: `lib/username.ts`, `lib/supabase/{server,client,proxy}.ts`, `proxy.ts`, `lib/auth.ts`, `app/login/page.tsx`, `app/login/actions.ts`, `app/(app)/layout.tsx`, `app/(app)/page.tsx` (placeholder), `components/{Field,SubmitButton}.tsx`
- Test: `tests/unit/username.test.ts`, `tests/e2e/login.spec.ts`

**Interfaces:**
- Produces:
  - `normalizeUsername(raw: string): string` — trim + minúsculas.
  - `validateUsername(u: string): string | null` — mensaje de error o `null`; regla `^[a-z0-9._-]{3,30}$`.
  - `usernameToEmail(u: string): string` — `${normalizeUsername(u)}@usuarios.local`.
  - `getCurrentProfile(): Promise<Profile | null>` (usa `supabase.auth.getUser()`, nunca `getSession()` en servidor).
  - `requireJefe(): Promise<Profile>` — redirige a `/` si no es jefe.
  - Acciones `signIn(prev, formData)` / `signOut()`.

- [ ] **Step 1: Tests fallidos:**
  - unit: `normalizeUsername('  Pepe ')` = `'pepe'`; `validateUsername('jo')` ≠ null; `validateUsername('josé luis')` ≠ null; `validateUsername('jose.luis')` = null; `usernameToEmail('Carlos')` = `'carlos@usuarios.local'`.
  - e2e: `/obras` sin sesión → redirige a `/login`; login `carlos`/contraseña seed → ve "Inicio"; login `CARLOS ` también entra; contraseña mala → texto "Usuario o contraseña incorrectos" y sigue en `/login`; "Salir" → vuelve a `/login`.
- [ ] **Step 2:** Ejecutar → FAIL.
- [ ] **Step 3:** Implementar siguiendo la skill `supabase` (patrón `@supabase/ssr` con cookies). Formulario: `autocomplete="username"` / `"current-password"`, `autocapitalize="none"`, botón con estado de carga (`useFormStatus`). `(app)/layout.tsx` llama `getCurrentProfile()`; sin perfil → `/login`; `activo=false` → `signOut` y `/login?motivo=desactivado`.
- [ ] **Step 4:** `npm test && npm run test:e2e -- login` → PASS.
- [ ] **Step 5:** Commit `feat(auth): login con usuario y contraseña`.

### Task 4: Gestión del equipo (jefe) y script de alta

**Files:**
- Create: `lib/supabase/admin.ts`, `app/(app)/equipo/{page,nuevo/page,[id]/page,actions}.tsx|ts`, `scripts/create-user.ts`
- Test: `tests/unit/equipo-actions.test.ts`, `tests/e2e/equipo.spec.ts`

**Interfaces:**
- Consumes: `requireJefe`, `validateUsername`, `usernameToEmail`.
- Produces:
  - `crearUsuario(prev, formData)` — campos `username`, `nombre`, `password` (mín. 8), `rol`. Usa `auth.admin.createUser({ email, password, email_confirm: true })` + insert en `profiles`; si falla el insert, borra el usuario de Auth (sin huérfanos).
  - `actualizarUsuario(prev, formData)` — `nombre`, `rol`, `activo`; desactivar también hace `auth.admin.updateUserById(id, { ban_duration: '876000h' })`, reactivar `'none'`.
  - `cambiarPassword(prev, formData)`.
  - `comprobarCambioPropio(actorId: string, targetId: string, cambios: { rol?: Rol; activo?: boolean }): string | null` — función pura; error si el jefe se quita el rol o se desactiva.
  - CLI: `npx tsx scripts/create-user.ts <usuario> <contraseña> "<Nombre>" [jefe|trabajador]` (lee `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` de `.env.local`).

- [ ] **Step 1: Tests fallidos:**
  - unit: `comprobarCambioPropio('j','j',{rol:'trabajador'})` ≠ null; `({activo:false})` ≠ null; `comprobarCambioPropio('j','a',{activo:false})` = null.
  - e2e (como carlos): crear trabajador `luis`/`clave1234` → aparece en lista; cerrar sesión, entrar como `luis` → entra; `luis` en `/equipo` → redirigido a `/`; crear usuario `pepe` repetido → "Ese usuario ya existe"; desactivar a `luis` con su sesión abierta en otro contexto de navegador → al recargar, `/login` con "Usuario desactivado"; carlos intentando quitarse el rol de jefe → mensaje de error y sigue siendo jefe.
- [ ] **Step 2:** Ejecutar → FAIL.
- [ ] **Step 3:** Implementar. Cada acción empieza con `await requireJefe()`.
- [ ] **Step 4:** `npm test && npm run test:e2e -- equipo` → PASS. Ejecutar el script contra local y entrar con el usuario creado.
- [ ] **Step 5:** Commit `feat(equipo): alta y gestión de usuarios`.

### Task 5: Clientes

**Files:**
- Create: `app/(app)/clientes/{page,nuevo/page,[id]/page,actions}.tsx|ts`, `components/EmptyState.tsx`
- Test: `tests/unit/cliente.test.ts`, `tests/e2e/clientes.spec.ts`

**Interfaces:**
- Produces: `parseCliente(fd: FormData): { ok: true; data: ClienteInput } | { ok: false; errores: Record<string, string> }` (`nombre` obligatorio, resto opcional, recorta espacios, vacío → `null`); acciones `guardarCliente(prev, fd)` (crea o edita según `id`) y `borrarCliente(id)`.

- [ ] **Step 1: Tests fallidos:**
  - unit: `parseCliente` sin nombre → `errores.nombre = 'El nombre es obligatorio'`; `'  Comunidad Mayor 5 '` → `'Comunidad Mayor 5'`; teléfono vacío → `null`.
  - e2e (carlos): lista vacía muestra EmptyState "Aún no hay clientes"; crear cliente → aparece; editar dirección → se ve; borrar cliente con obras → "No se puede borrar: tiene obras"; teléfono se muestra como enlace `tel:`. Como `pepe`: solo ve los clientes de sus obras y no hay botón "Nuevo cliente".
- [ ] **Step 2:** Ejecutar → FAIL.
- [ ] **Step 3:** Implementar. Ficha del cliente lista sus obras. Botón borrar con confirmación.
- [ ] **Step 4:** `npm test && npm run test:e2e -- clientes` → PASS.
- [ ] **Step 5:** Commit `feat(clientes): alta, edición y listado`.

### Task 6: Obras y asignación de trabajadores

**Files:**
- Create: `lib/importe.ts`, `app/(app)/obras/{page,nuevo/page,[id]/page,[id]/editar/page,actions}.tsx|ts`, `components/EstadoBadge.tsx`; Modify: `app/(app)/page.tsx`
- Test: `tests/unit/importe.test.ts`, `tests/unit/obra.test.ts`, `tests/e2e/obras.spec.ts`

**Interfaces:**
- Produces:
  - `parseImporte(raw: string): number | null | 'invalido'` — vacío → `null`; acepta `1.250,50`, `1250,5`, `1250`, `1250.50`; negativo o texto → `'invalido'`.
  - `formatEUR(n: number): string`.
  - `parseObra(fd): { ok: true; data: ObraInput } | { ok: false; errores }` (`cliente_id`, `titulo`, `direccion`, `tipo_trabajo`, `estado` obligatorios y validados contra los enums; `presupuesto` vía `parseImporte`; `trabajadores: string[]`).
  - Acciones `guardarObra(prev, fd)` (obra + reemplazo de `obra_trabajadores`; solo jefe), `cambiarEstado(id, estado)` (llama `rpc('cambiar_estado_obra')`; jefe y trabajador asignado), `borrarObra(id)` (solo jefe).

- [ ] **Step 1: Tests fallidos:**
  - unit: `parseImporte('1.250,50')` = 1250.5; `('1250,5')` = 1250.5; `('1250')` = 1250; `('')` = null; `('-3')` = `'invalido'`; `('abc')` = `'invalido'`; `formatEUR(1250.5)` = `'1250,50 €'` (comparar con `Intl` normalizando espacios no separables); `parseObra` con `tipo_trabajo='piscinas'` → error.
  - e2e (carlos): crear obra para C1 tipo "Canalones", presupuesto "1.250,50", asignada a pepe → ficha muestra "1250,50 €" y "Pepe"; cambiar estado a "En curso" → badge actualizado; inicio del jefe muestra recuento por estado. Como `pepe`: inicio lista solo sus obras; la ficha muestra el presupuesto y el selector de estado, pero no "Editar" ni "Borrar"; cambia el estado a "Terminada" → se guarda; abrir por URL la obra de otro trabajador → "No encontrado".
- [ ] **Step 2:** Ejecutar → FAIL.
- [ ] **Step 3:** Implementar. Selector de cliente con opción de dirección precargada desde el cliente; trabajadores como lista de casillas grandes. Dirección enlazada a Google Maps (`https://www.google.com/maps/search/?api=1&query=`).
- [ ] **Step 4:** `npm test && npm run test:e2e -- obras` → PASS.
- [ ] **Step 5:** Commit `feat(obras): obras, presupuesto y asignación`.

### Task 7: Navegación, pulido móvil y README

**Files:**
- Create: `components/BottomNav.tsx`, `README.md`; Modify: `app/(app)/layout.tsx`, `app/globals.css`
- Test: `tests/e2e/mobile.spec.ts`

**Interfaces:**
- Consumes: todo lo anterior.

- [ ] **Step 1: Test fallido** `mobile.spec.ts` (viewport 390×844, `hasTouch`): navegación inferior visible con "Inicio", "Obras", "Clientes" y, solo para jefe, "Equipo"; la página no tiene scroll horizontal (`scrollWidth <= clientWidth`) en todas las rutas; ningún `input/select/textarea` < 16px; tras tocar un botón no queda estilo hover aplicado (comprobar que las reglas `:hover` están dentro de `@media (hover: hover)` leyendo `document.styleSheets`).
- [ ] **Step 2:** Ejecutar → FAIL.
- [ ] **Step 3:** Implementar `BottomNav` con `padding-bottom: env(safe-area-inset-bottom)`; repaso de diseño con `impeccable` (jerarquía, estados vacíos, errores, carga) y checklist de `mobile-native`. Escribir README: requisitos, desarrollo local (`supabase start`, `.env.local`, `npm run dev`), despliegue (crear proyecto Supabase → `supabase link` + `supabase db push` → desactivar registro → proyecto en Vercel con `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`), crear el primer jefe con el script, crear el resto desde "Equipo", instalar en el móvil ("Añadir a pantalla de inicio").
- [ ] **Step 4:** Verificación completa (skill `verification-before-completion`): `npm run lint && npm run build && npm test && npm run db:test && npm run test:e2e` → todo PASS; capturas en 390×844 de login, inicio, obra, cliente y equipo para revisión.
- [ ] **Step 5:** Commit `feat: navegación móvil, pulido y README`. Entrega de la fase 1 para revisión antes de planificar la fase 2.
