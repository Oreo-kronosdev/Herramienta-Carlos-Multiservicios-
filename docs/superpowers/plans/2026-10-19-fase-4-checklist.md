# Fase 4 — Checklist de materiales y herramientas por obra · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Cada obra tiene su lista de materiales y herramientas. Antes de salir, quien va a la obra marca lo que ya ha preparado, para que nadie vaya sin lo necesario.

**Architecture:**
- Una tabla `checklist_items` con RLS.
- El trabajador asignado a la obra marca y desmarca, y reinicia la lista, mediante dos funciones `security definer`. Así no puede cambiar el texto ni borrar elementos.
- La lista vive dentro de la ficha de la obra. No hay pantalla nueva ni pestaña nueva.

**Spec:** `docs/spec.md`, módulo 5: «Checklist de materiales y herramientas por obra (para que nadie vaya a la obra sin lo necesario)».

## Decisiones tomadas sin consulta (el usuario pidió seguir con todas las fases; se apuntan para que las revise)

1. El **jefe** añade y borra elementos. Los **trabajadores asignados** a la obra los marcan como preparados y pueden desmarcar todo para la siguiente salida.
2. Hay dos grupos fijos: **Material** y **Herramientas**.
3. **«Desmarcar todo»** deja la lista lista para la siguiente salida, tras pedir confirmación.
4. Sin plantillas ni copiar listas entre obras, porque no se pidió.

## Global Constraints

Las de las fases 1 a 3: español, móvil, `Suspense`, `requireUser`/`requireJefe`, `noValidate`, `useOptimistic` para las casillas (como en tareas) y objetivos táctiles ≥ 44 px.

## Modelo de datos

- `tipo_checklist` enum `('material','herramienta')`.
- `checklist_items`:
  - `id uuid pk`
  - `obra_id uuid not null → obras on delete cascade`
  - `texto text not null check (length(trim(texto)) between 1 and 120)`
  - `tipo tipo_checklist not null`
  - `preparado boolean not null default false`
  - `created_at`
  - Índice en `obra_id`.
- RLS:
  - El jefe lo gestiona todo.
  - El trabajador activo asignado a la obra (existe una fila en `obra_trabajadores`) solo puede leer.
- Funciones:
  - `public.marcar_preparado(p_item uuid, p_preparado boolean)`
  - `public.reiniciar_checklist(p_obra uuid)`: pone todo a `preparado = false`.
  - Las dos con `security definer` y `search_path` vacío.
  - Permitidas al jefe o al trabajador activo asignado a la obra del elemento; si no, «No autorizado».
  - Revocadas a public y anon.

## Review Focus

1. Un trabajador no asignado a la obra marca un elemento por id → «No autorizado» (pgTAP).
2. Un trabajador asignado intenta cambiar el texto o borrar un elemento → 0 filas o 42501 (pgTAP).
3. Un texto vacío o de más de 120 caracteres da un error claro, no un fallo genérico (unit).
4. Que dos personas marquen a la vez no pisa elementos distintos: cada marca es una fila (por diseño). La reinicialización solo toca la obra indicada (pgTAP).
5. En la ficha de la obra, el progreso «X de Y preparados» se actualiza al marcar (e2e).

## Tasks

### Task 1: Esquema y RLS
- Migración `supabase/migrations/20261019010000_checklist.sql`. Se escribe a mano, sin `supabase migration new`.
- Test pgTAP `supabase/tests/checklist.test.sql`.
- Seed: 4 elementos en la obra c…01 (Silicona, Guantes · Material; Escalera de 7 m, Arnés · Herramientas).
- Regenerar los tipos (`npm run db:types`).
- Lo que debe comprobar el test:
  - **Trabajador A (asignado a O1):**
    - Ve los elementos de O1 y no los de O2.
    - Marca uno de O1, pero no uno de O2 («No autorizado»).
    - No puede editar el texto (0 filas) ni insertar (42501).
    - `reiniciar_checklist(O1)` desmarca todo O1 y deja O2 como estaba.
  - **A desactivado:** ve 0 elementos y recibe «No autorizado».
  - **Jefe:** lo ve todo y puede insertar y borrar.
  - **anon:** 42501.
- Commit `feat(db): checklist por obra con RLS`.

### Task 2: Validación
- Se crea `lib/checklist.ts` con `parseItem(fd): Resultado<{ obra_id: string; texto: string; tipo: TipoChecklist }>`.
- Mensajes de error:
  - Texto vacío → «Escribe qué hace falta».
  - Más de 120 caracteres → «Máximo 120 caracteres».
  - Tipo no válido → «Elige material o herramienta».
- Se añade `TIPOS_CHECKLIST` a `lib/etiquetas.ts`.
- Tests unitarios: un caso válido y cada uno de los errores anteriores.
- Commit.

### Task 3: Lista en la ficha de la obra
- Archivos nuevos en `app/(app)/obras/checklist/`:
  - `actions.ts`: `anadirItem(prev, fd)` (solo jefe), `borrarItem(id)` (solo jefe), `marcarItem(id, preparado)` y `reiniciarChecklist(obraId)`.
  - `Checklist.tsx` (servidor) y `ItemCheck.tsx` (cliente, con `useOptimistic`).
  - `NuevoItem.tsx` (cliente, solo jefe): texto, un selector Material/Herramienta con dos botones grandes y «Añadir». El campo de texto se vacía al añadir.
- Se modifica `app/(app)/obras/[id]/page.tsx`: nueva sección «Material y herramientas» entre el selector de estado y los datos. Muestra:
  - el progreso «X de Y preparados» con una barra;
  - los dos grupos;
  - «Desmarcar todo», con confirmación;
  - para el jefe, un botón «Quitar» por elemento con `aria-label="Quitar <texto>"`.
- Test e2e (`tests/e2e/checklist.spec.ts`, en serie):
  1. Carlos añade «Brocha 50 mm» (Material) y «Andamio» (Herramientas) a c…01. Aparecen en su grupo.
  2. Pepe ve la lista con «0 de 6 preparados». Marca dos elementos y ve «2 de 6». Al recargar, sigue en 2.
  3. Pepe no ve «Añadir» ni «Quitar».
  4. Pepe pulsa «Desmarcar todo» y vuelve a «0 de 6».
  5. Ana no puede abrir c…01 («No encontrado»; ya cubierto en la fase 1, se reafirma).
  6. Carlos quita «Andamio».
- `mobile.spec` revisa c…01 (ya está incluida) sin desbordes.
- Commit.

### Task 4: README, verificación, revisión y PR (como en las fases anteriores)
