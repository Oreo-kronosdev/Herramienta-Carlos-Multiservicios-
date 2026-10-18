# Fase 2 — Agenda y recordatorios · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Carlos apunta citas y fechas límite (por obra y por persona). Cada persona ve las suyas y recibe una notificación en el móvil los días antes que se hayan elegido.

**Architecture:**
- Dos tablas nuevas con RLS (`eventos`, `evento_personas`) y una para las suscripciones push.
- Un endpoint (`/api/recordatorios`) que Vercel Cron llama una vez al día. Usa la clave secreta para elegir los avisos pendientes, los envía con `web-push` (el patrón de la guía PWA de Next en `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md`) y los marca como enviados.
- Un service worker mínimo (`public/sw.js`) que solo muestra notificaciones. Sigue sin haber modo offline.

**Tech Stack:** lo de la fase 1 + `web-push` (y `@types/web-push`) + Vercel Cron.

**Spec:** `docs/spec.md` (módulo 3) · Base: plan de la fase 1 (sus Global Constraints siguen vigentes).

## Decisiones confirmadas (2026-10-18)

1. Avisos por **notificación web push**. En iPhone solo funciona con la app instalada en la pantalla de inicio (iOS 16.4+). En esta fase no hay email.
2. Solo el **jefe** crea, edita y borra citas.
3. El trabajador ve **solo las citas en las que está asignado**.
4. Antelación **elegible por cita**: 0, 1, 2, 3 o 7 días; por defecto 1. El aviso sale a las 8:00 de España.

## Global Constraints

- Todo lo de la fase 1: español, mobile-first, inputs ≥16px, hover protegido, `Fresco` en formularios, `requireUser`/`requireJefe` en cada página y acción, `<Suspense>` alrededor de los datos y `noValidate`.
- "Hoy" se calcula siempre en `Europe/Madrid`, nunca en UTC (`lib/fechas.ts`).
- Fechas mostradas con `Intl.DateTimeFormat('es-ES', …)`, del estilo "lunes, 20 de octubre". Las horas en formato 24 h.
- Claves VAPID: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT` (`mailto:…`). Se generan con `npx web-push generate-vapid-keys`. La privada solo se usa en el servidor.
- `CRON_SECRET`: Vercel lo envía como `Authorization: Bearer <CRON_SECRET>`. Sin él, el endpoint responde 401.
- `vercel.json` con el cron `0 6 * * *`: son las 8:00 en verano y las 7:00 en invierno. El plan Hobby de Vercel permite un cron al día con margen de una hora.
- Nada fuera de la spec: sin repetición de citas, sin calendario mensual y sin sincronizar con Google Calendar.

## Modelo de datos (Task 1)

- `tipo_evento` enum `('cita','fecha_limite')`.
- `eventos`:
  - `id uuid pk`
  - `titulo text not null`
  - `tipo tipo_evento not null default 'cita'`
  - `fecha date not null`
  - `hora time` (null = todo el día)
  - `obra_id uuid → obras on delete cascade` (opcional)
  - `notas text`
  - `avisar_dias smallint not null default 1 check (avisar_dias in (0,1,2,3,7))`
  - `fecha_aviso date generated always as (fecha - avisar_dias) stored`
  - `created_at`
  - Índices en `fecha_aviso` y en `obra_id`.
- `evento_personas`: `evento_id → eventos cascade`, `user_id → profiles cascade`, `avisado_at timestamptz`, `pk (evento_id, user_id)`, índice en `user_id`.
- `push_suscripciones`: `id uuid pk`, `user_id → profiles cascade`, `endpoint text unique not null`, `p256dh text not null`, `auth text not null`, `created_at`.
- Trigger: si cambian `fecha` o `avisar_dias` de un evento, se pone `avisado_at = null` en sus `evento_personas` (el aviso se vuelve a programar).
- RLS (`private.es_jefe()`/`es_activo()` de la fase 1):
  - `eventos` y `evento_personas`: el jefe todo. El trabajador activo, solo select de los eventos con una fila suya en `evento_personas` (y de esas filas).
  - `push_suscripciones`: cada usuario activo select/insert/delete de las suyas (`user_id = auth.uid()` en `using` y `with check`). El jefe no ve las de otros.

## Review Focus

1. **Cambio de día en Madrid frente a UTC:** a las 00:30 de Madrid (22:30 UTC del día anterior), "hoy" es el día de Madrid. → Task 2 (unit).
2. **El cron se ejecuta dos veces o se repite:** nadie recibe el mismo aviso dos veces (`avisado_at`). → Task 4 (unit y e2e).
3. **Una suscripción caducada (404/410):** se borra y el resto de envíos sigue; otro error no marca como avisado. → Task 4 (unit).
4. **Trabajador desactivado o cita ya pasada:** no recibe avisos; tampoco si el cron no se ejecutó a tiempo y la cita ya ha pasado. → Task 4 (unit).
5. **Cita que se mueve de fecha después de avisar:** se vuelve a avisar respecto a la nueva fecha. → Task 1 (pgTAP).

---

## File Structure

```
supabase/migrations/…_fase2.sql      tablas, trigger y RLS
supabase/tests/rls_fase2.test.sql
lib/fechas.ts                        hoyMadrid(), formatFecha(), formatHora()
lib/evento.ts                        parseEvento()
lib/recordatorios.ts                 elegirAvisos(), enviarAvisos() (lógica pura, el envío se inyecta)
app/(app)/agenda/                    page.tsx, nuevo/page.tsx, [id]/page.tsx, [id]/editar/page.tsx, actions.ts, EventoForm.tsx, ListaEventos.tsx
app/(app)/avisos/actions.ts          guardarSuscripcion(), borrarSuscripcion()
components/ActivarAvisos.tsx         botón para activar las notificaciones en este móvil
public/sw.js                         push + notificationclick
app/api/recordatorios/route.ts       GET protegido con CRON_SECRET
vercel.json                          cron
```

---

### Task 1: Esquema, RLS y re-armado de avisos

**Files:** Create `supabase/migrations/<ts>_fase2.sql` (con `supabase migration new fase2`), `supabase/tests/rls_fase2.test.sql`; Modify `supabase/seed.sql` (2 citas: una para pepe en la obra c…01 mañana y una fecha límite para ana en c…03), `lib/database.types.ts`, `lib/etiquetas.ts` (`TIPOS_EVENTO`, `AVISAR_DIAS: Record<0|1|2|3|7,string>` = "El mismo día", "1 día antes", …).

**Interfaces:**
- Produces: las tablas del modelo; `TipoEvento`; `TIPOS_EVENTO`; `AVISAR_DIAS`.

- [ ] **Step 1: Test fallido** `rls_fase2.test.sql`, con fixtures propias: J, A, B, obra O1 de A y eventos E1 (A, O1) y E2 (B).
  - A ve 1 evento (E1) y 1 fila de `evento_personas`. No puede insertar ni editar eventos (insert → 42501; update → 0 filas).
  - A desactivado → 0 eventos.
  - J ve 2 eventos; puede crear un evento y asignarlo.
  - A inserta su suscripción (`user_id = A`) → ok. Si la inserta con `user_id = B` → 42501. J ve 0 suscripciones de A.
  - `fecha_aviso` de E1 con `fecha='2026-10-20'` y `avisar_dias=2` es `'2026-10-18'`.
  - Re-armado: con `avisado_at = now()` en E1/A, `update eventos set fecha = fecha + 3` deja `avisado_at` en null. Cambiar solo `titulo` lo deja igual.
  - anon: select en `eventos` → 42501.
- [ ] **Step 2:** `npx supabase test db` → FAIL.
- [ ] **Step 3:** Migración, seed y etiquetas. Cargar antes la skill `supabase-postgres-best-practices`. Ejecutar después `npx supabase db advisors --local`: no debe haber hallazgos de seguridad.
- [ ] **Step 4:** `npx supabase db reset && npx supabase test db` → PASS (fase 1 y fase 2); `npm run db:types`.
- [ ] **Step 5:** Commit `feat(db): agenda y suscripciones push con RLS`.

### Task 2: Fechas y validación de eventos

**Files:** Create `lib/fechas.ts`, `lib/evento.ts`; Test `tests/unit/fechas.test.ts`, `tests/unit/evento.test.ts`.

**Interfaces:**
- Produces:
  - `hoyMadrid(ahora?: Date): string`: `'YYYY-MM-DD'` en Europe/Madrid (`Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' })`).
  - `formatFecha(iso: string): string`, del estilo "lunes, 20 de octubre". Añade el año solo si no es el año en curso.
  - `formatHora(h: string | null): string | null`: `'09:30:00'` → `'09:30'`.
  - `parseEvento(fd): Resultado<EventoInput>`, con `EventoInput = { titulo, tipo, fecha, hora: string|null, obra_id: string|null, notas: string|null, avisar_dias: 0|1|2|3|7, personas: string[] }`.

- [ ] **Step 1: Tests fallidos:**
  - `hoyMadrid(new Date('2026-10-18T22:30:00Z'))` = `'2026-10-19'`.
  - `hoyMadrid(new Date('2026-01-15T23:30:00Z'))` = `'2026-01-16'`.
  - `hoyMadrid(new Date('2026-10-18T21:59:00Z'))` = `'2026-10-18'`.
  - `formatHora('09:30:00')` = `'09:30'`.
  - `formatFecha('2026-10-20')` contiene `'20 de octubre'`.
  - `parseEvento`:
    - Sin título, sin fecha, con `fecha='2026-02-30'`, `tipo='x'` o `avisar_dias='5'` → un error por campo.
    - `hora` vacía → null; `obra_id` vacío → null.
    - Sin personas → error `personas: "Asigna al menos una persona"` (si no, nadie recibiría el aviso).
- [ ] **Step 2:** `npx vitest run` → FAIL.
- [ ] **Step 3:** Implementar. Una fecha es válida si se puede reconstruir, es decir, si `new Date(f + 'T00:00:00Z').toISOString().slice(0, 10) === f`.
- [ ] **Step 4:** `npx vitest run` → PASS.
- [ ] **Step 5:** Commit `feat(agenda): fechas en hora de Madrid y validación de citas`.

### Task 3: Pantallas de agenda

**Files:**
- Create `app/(app)/agenda/{page,nuevo/page,[id]/page,[id]/editar/page,actions,EventoForm,ListaEventos}.tsx|ts`.
- Modify `components/BottomNav.tsx` (pestaña "Agenda" entre Obras y Clientes, con icono de calendario), `app/(app)/page.tsx` (bloque "Próximos 7 días" para todos) y `app/(app)/obras/[id]/page.tsx` (bloque "Agenda de esta obra" y, para el jefe, el enlace "Nueva cita" con `?obra=<id>`).
- Test `tests/e2e/agenda.spec.ts`.

**Interfaces:**
- Consumes: `parseEvento`, `formatFecha`, `formatHora` y `hoyMadrid` (Task 2); las tablas (Task 1).
- Produces:
  - `guardarEvento(prev, fd)`: inserta o actualiza el evento y reemplaza `evento_personas`; redirige a `/agenda/[id]`.
  - `borrarEvento(prev, fd)`.
  - `ListaEventos({ eventos })`: agrupa por fecha. Cada fila muestra la hora o "Todo el día", el título, una etiqueta de tipo ("Fecha límite" en color de aviso) y la obra.
- `/agenda` muestra desde hoy en adelante, ordenado por fecha y hora, con el enlace "Ver pasadas" (`?pasadas=1`, las últimas 30).
- `EventoForm`:
  - Campos: Título, Tipo, Fecha (`type="date"`), Hora (`type="time"`, opcional), Obra (select opcional), Personas (casillas) y "Avisar" (select con `AVISAR_DIAS`, por defecto 1), Notas.
  - Al elegir una obra, se marcan las personas asignadas a esa obra si todavía no hay ninguna marcada.

- [ ] **Step 1: Test fallido** `agenda.spec.ts`, en serie y con título único:
  - Carlos crea una cita mañana a las 09:30 en la obra c…01 para Pepe con "2 días antes". La ficha muestra la fecha en español, "09:30", la obra (como enlace) y "Pepe".
  - Aparece en `/agenda`, en "Próximos 7 días" del inicio y en "Agenda de esta obra" de c…01.
  - Pepe la ve; no ve "Nueva cita", "Editar" ni las citas de Ana. Si abre por URL la cita de Ana → "No encontrado".
  - Ana no la ve.
  - Sin personas → "Asigna al menos una persona".
  - Carlos la borra → desaparece de `/agenda`.
  - La navegación del jefe tiene 5 pestañas y la del trabajador 4, y ninguna tiene scroll horizontal (`mobile.spec.ts` añade `/agenda` y `/agenda/nuevo` a las rutas).
- [ ] **Step 2:** `npx playwright test agenda` → FAIL.
- [ ] **Step 3:** Implementar con los componentes existentes (`Field`, `Select`, `Cabecera`, `EmptyState`, `Fresco`, `Aviso`).
- [ ] **Step 4:** `npx playwright test agenda mobile` → PASS.
- [ ] **Step 5:** Commit `feat(agenda): citas y fechas límite por obra y persona`.

### Task 4: Recordatorios por notificación

**Files:**
- Create `lib/recordatorios.ts`, `app/api/recordatorios/route.ts`, `public/sw.js`, `components/ActivarAvisos.tsx`, `app/(app)/avisos/actions.ts`, `vercel.json`.
- Modify `app/(app)/agenda/page.tsx` (tarjeta `ActivarAvisos` arriba), `.env.example`, `proxy.ts` (excluir `/api/recordatorios` y `/sw.js` del redireccionamiento al login).
- Test `tests/unit/recordatorios.test.ts`, `tests/e2e/recordatorios.spec.ts`.

**Interfaces:**
- Produces:
  - `type Pendiente = { evento_id, user_id, titulo, fecha, hora, activo: boolean }`.
  - `elegirAvisos(filas: Pendiente[], hoy: string): Pendiente[]`: se queda con las filas con `fecha >= hoy` y `activo`. La consulta ya filtra `fecha_aviso <= hoy` y `avisado_at is null`.
  - `textoAviso(p: Pendiente, hoy: string): { title: string; body: string; url: string }`, con títulos como "Mañana: Revisión de chimenea", "Hoy: …" o "En 3 días: …". El cuerpo lleva la fecha y la hora. La url es `/agenda/<id>`.
  - `enviarAvisos(pendientes, suscripcionesPorUsuario: Map<string, Sub[]>, enviar: (sub, payload) => Promise<void>): Promise<{ avisados: {evento_id,user_id}[]; caducadas: string[]; fallos: number }>`.
    - Un error con `statusCode` 404 o 410 manda la suscripción a `caducadas`.
    - Una persona cuenta como avisada si al menos un envío fue bien.
    - Una persona sin suscripciones también cuenta como avisada (no hay nada que reintentar), y así no se acumula.
  - `GET /api/recordatorios`:
    - 401 sin `Authorization: Bearer ${CRON_SECRET}`.
    - Si no, consulta con `createAdminClient()` (`evento_personas` ⨝ `eventos` ⨝ `profiles.activo`, con `fecha_aviso <= hoy` y `avisado_at is null`), envía con `web-push`, marca `avisado_at = now()`, borra las caducadas y responde `{ avisados, caducadas, fallos }`.
  - `guardarSuscripcion(sub: { endpoint, keys: { p256dh, auth } })`: `requireUser`, luego upsert por `endpoint` con el `user_id` propio. `borrarSuscripcion(endpoint)`.
  - `ActivarAvisos`: según el estado muestra "Activar avisos en este móvil", "Avisos activados ✓ (Desactivar)", "Este navegador no permite avisos" o, en iPhone sin instalar, "En iPhone, primero instala la app: Compartir → Añadir a pantalla de inicio".

- [ ] **Step 1: Tests fallidos:**
  - unit `elegirAvisos`: descarta `fecha < hoy` y `activo=false`; se queda con la de hoy y la futura.
  - unit `textoAviso`: con hoy `2026-10-19` y fecha `2026-10-20` el título empieza por "Mañana:". Con la misma fecha, "Hoy:". Con +3, "En 3 días:".
  - unit `enviarAvisos` con un `enviar` falso:
    - 2 suscripciones de pepe, una lanza `{statusCode: 410}` → pepe avisado y 1 caducada.
    - Ana con una suscripción que lanza `{statusCode: 500}` → no avisada y `fallos=1`.
    - Luis sin suscripciones → avisado.
  - e2e:
    - `GET /api/recordatorios` sin cabecera → 401.
    - Con la cabecera, primero se crea una cita para hoy asignada a Pepe y se le crea una suscripción falsa con un endpoint inválido → 200 y esa fila con `avisado_at` no nulo.
    - Segunda llamada → `avisados` = 0 (no se repite).
    - En `/agenda`, como Pepe, se ve el botón "Activar avisos en este móvil" (o el mensaje de "no permite").
- [ ] **Step 2:** `npx vitest run && npx playwright test recordatorios` → FAIL.
- [ ] **Step 3:** Implementar.
  - `npm i web-push && npm i -D @types/web-push`.
  - `sw.js`: en `push`, `showNotification(title, { body, icon: '/icons/icon-192.png', data: { url } })`; en `notificationclick`, abrir o enfocar `url`.
  - Registrar el SW en `ActivarAvisos` (`navigator.serviceWorker.register('/sw.js', { scope: '/' })`).
  - Para el e2e local, añadir a `.env.local` claves VAPID generadas en local y un `CRON_SECRET` de prueba.
- [ ] **Step 4:** `npx vitest run && npx playwright test` → PASS.
- [ ] **Step 5:** Commit `feat(avisos): recordatorios por notificación con cron diario`.

### Task 5: README y verificación

**Files:** Modify `README.md` (sección "Avisos en el móvil": generar las claves VAPID, variables en Vercel, `CRON_SECRET`, horario del cron, y cómo activarlos en Android y en iPhone).

- [ ] **Step 1:** Escribir el README.
- [ ] **Step 2:** Verificación completa con la skill `verification-before-completion`: `npm run lint && npm run build && npx vitest run && npx supabase test db && npx playwright test` → todo PASS. Capturas a 390×844 de la agenda, la ficha de una cita, el formulario y el inicio con "Próximos 7 días"; una sola ronda de revisión visual.
- [ ] **Step 3:** Commit `docs: avisos en el móvil`. Push de `fase-2`, revisión final independiente y PR.
- [ ] **Pendiente del usuario:** probar una notificación real en su móvil después de desplegar. Desde el contenedor no se puede recibir un push real.
