# Fase 3 — Tareas por persona · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Carlos asigna tareas a una persona, opcionalmente ligadas a una obra y con fecha límite. Cada persona ve las suyas y las marca como hechas.

**Architecture:**
- Una tabla `tareas` con RLS.
- El trabajador solo puede marcar o desmarcar sus tareas, mediante la función `marcar_tarea` (mismo patrón que `cambiar_estado_obra`).
- Las pantallas siguen los patrones de las fases 1 y 2.

**Spec:** `docs/spec.md`, módulo 4: «Tareas por persona: asignar, marcar como hecho, fecha límite».

## Decisiones tomadas sin consulta (el usuario pidió seguir con todas las fases; se apuntan para que las revise)

1. Cada tarea es de **una sola persona** («por persona»). Si son varias, se crea una tarea para cada una.
2. Solo el **jefe** crea, edita y borra tareas. El trabajador solo las marca como hechas o pendientes.
3. **Sin avisos** de fecha límite por notificación: no está en el módulo 4. Para eso existen las fechas límite de la agenda.
4. Una tarea con la fecha límite pasada y sin hacer se marca como **«Vencida»** (en rojo).

## Global Constraints

Las de las fases 1 y 2 (español, móvil, `Fresco`, `noValidate`, `Suspense`, `requireUser`/`requireJefe`, fechas en Europe/Madrid con `lib/fechas.ts`). Nada fuera de la spec.

## Modelo de datos

- `tareas`:
  - `id uuid pk`
  - `titulo text not null`
  - `notas text`
  - `fecha_limite date`
  - `obra_id → obras on delete cascade` (opcional)
  - `asignada_a uuid not null → profiles on delete cascade`
  - `hecha boolean not null default false`
  - `hecha_at timestamptz`
  - `created_at`
  - Índices en `asignada_a`, `obra_id` y `(hecha, fecha_limite)`.
- RLS:
  - El jefe todo.
  - El trabajador activo solo puede leer (select) las tareas con `asignada_a = auth.uid()`.
- `public.marcar_tarea(p_tarea uuid, p_hecha boolean)`:
  - `security definer` con `search_path` vacío.
  - Lo puede hacer el jefe o el trabajador activo dueño de la tarea; si no, lanza «No autorizado».
  - Pone `hecha` y `hecha_at` (`now()` o `null`).
  - Execute revocado a public y anon, concedido a authenticated.

## Review Focus

1. Un trabajador marca, por id, una tarea ajena → «No autorizado» (pgTAP).
2. Un trabajador desactivado no ve ni marca tareas (pgTAP).
3. «Vencida» se calcula con la fecha de Madrid: la fecha límite de hoy no está vencida, la de ayer sí (unit).
4. La edición por el jefe conserva `hecha` (el formulario no lo envía) (e2e).
5. Navegación con 6 pestañas sin scroll horizontal a 390 px (e2e mobile).

## Tasks

### Task 1: Esquema y RLS
- Files:
  - `supabase/migrations/<ts>_tareas.sql`: se crea a mano con el timestamp. No usar `supabase migration new`, que se queda esperando lo que se escriba por teclado.
  - `supabase/tests/tareas.test.sql`
  - seed: 3 tareas (2 de Pepe, una de ellas con fecha de ayer; 1 de Ana).
  - `lib/database.types.ts`
- Test (pgTAP):
  - A ve 1 tarea suya.
  - A no puede insertarla, ni editar su `titulo`.
  - `marcar_tarea` funciona en la suya y lanza «No autorizado» en la ajena.
  - A desactivado → 0 tareas y «No autorizado».
  - J ve todas y marca cualquiera.
  - `hecha_at` se rellena al marcar y vuelve a `null` al desmarcar.
  - anon → 42501.
- Commit `feat(db): tareas por persona con RLS`.

### Task 2: Validación y estado de la tarea
- Files: `lib/tarea.ts`; `tests/unit/tarea.test.ts`.
- Produces:
  - `parseTarea(fd): Resultado<TareaInput>`, con `TareaInput = { titulo, notas|null, fecha_limite|null, obra_id|null, asignada_a }`.
    - Título obligatorio.
    - Persona obligatoria: «Elige a quién se la asignas».
    - Fecha válida si existe.
  - `estadoTarea(t: { hecha: boolean; fecha_limite: string | null }, hoy: string): "hecha" | "vencida" | "pendiente"`.
- Tests:
  - Sin título ni persona → 2 errores.
  - Fecha `2026-02-30` → error.
  - Fecha vacía → null.
  - `estadoTarea`: con hoy `2026-10-19`, la de `2026-10-19` es «pendiente», la de `2026-10-18` «vencida», una hecha con fecha pasada «hecha» y sin fecha «pendiente».
- Commit `feat(tareas): validación y estado`.

### Task 3: Pantallas
- Files:
  - `app/(app)/tareas/{page,nueva/page,[id]/editar/page,actions,TareaForm,ListaTareas,MarcarTarea}.tsx|ts`
  - `components/BottomNav.tsx`: pestaña «Tareas» después de Agenda, con icono de lista con check.
  - `app/(app)/page.tsx`: bloque «Mis tareas» con las pendientes de la persona (las 5 primeras, primero las vencidas y luego por fecha).
  - `app/(app)/obras/[id]/page.tsx`: bloque «Tareas de esta obra»; el jefe tiene «Nueva tarea» con `?obra=`.
- Comportamiento:
  - `/tareas` muestra «Pendientes» (vencidas primero, luego por fecha límite, las que no tienen fecha al final) y un enlace «Ver hechas» (`?hechas=1`, las últimas 50).
  - Para el jefe, cada fila muestra a quién está asignada.
  - Cada fila tiene una casilla grande para marcarla, con optimismo (`useOptimistic`) que se deshace si hay error.
  - Al tocar el título: el jefe va a editar; el trabajador no navega (ruling: no hace falta ficha).
  - Acciones:
    - `guardarTarea`: solo jefe, inserta o actualiza sin tocar `hecha`.
    - `marcarTarea(id, hecha)`: `requireUser` + rpc.
    - `borrarTarea`: solo jefe.
- Test e2e (`tests/e2e/tareas.spec.ts`, en serie):
  - Carlos crea «Comprar silicona» para Pepe, en la obra c…01, con fecha mañana.
  - Aparece en `/tareas` con «Pepe», en la obra y en el inicio de Pepe.
  - Pepe la marca → pasa a «Ver hechas».
  - Pepe no ve «Nueva tarea» ni las tareas de Ana.
  - Carlos edita el título → sigue hecha.
  - Una tarea con fecha de ayer muestra «Vencida».
  - Sin persona → error.
  - Carlos la borra.
  - `mobile.spec` incluye `/tareas` y `/tareas/nueva`, y la navegación con 6 pestañas sin desborde.
- Commit `feat(tareas): asignar, marcar como hecha y fecha límite`.

### Task 4: README y verificación
- Añadir las tareas a la tabla de permisos del README.
- Verificación completa: lint, build, unit, db y e2e.
- Una ronda de capturas.
- Commit, push y revisión final independiente.
