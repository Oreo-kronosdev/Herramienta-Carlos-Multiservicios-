# Fase 6 — Documento de presupuesto · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Un trabajador rellena en la obra, desde el móvil, una plantilla de toma de datos para el presupuesto: medidas, materiales, fotos y observaciones. Carlos la ve y la puede imprimir o guardar como PDF.

**Architecture:**
- **Datos:** cuatro tablas (`presupuestos`, `presupuesto_medidas`, `presupuesto_materiales`, `presupuesto_fotos`) más un bucket privado de Supabase Storage (`presupuestos`) para las fotos.
- **Permisos:** una única función `private.puede_ver_presupuesto(id)` decide el acceso, tanto en las tablas como en Storage: el jefe, o un trabajador activo asignado a la obra del presupuesto.
- **Subida de fotos:** se comprimen en el navegador (lado mayor 1600 px, JPEG 0,8) y se suben directamente con la sesión del usuario.
- **Visualización:** con URLs firmadas que caducan a la hora.
- **Impresión:** una vista con estilos de impresión, en lugar de generar el PDF en el servidor. El navegador ya sabe «Guardar como PDF».

**Spec:** `docs/spec.md`, módulo 7: «Documento de presupuesto: plantilla rellenable por el trabajador (medidas, fotos, materiales)».

## Decisiones tomadas sin consulta (el usuario pidió seguir con todas las fases; se apuntan para que las revise)

1. **Quién lo rellena:** el jefe o los trabajadores asignados a la obra. Todos ellos ven todos los presupuestos de esa obra y pueden editarlos.
2. **Sin precios:** es una toma de datos. Carlos pone el precio después, en la factura o en el campo «Presupuesto» de la obra.
3. **PDF desde el navegador:** se usa «Imprimir / Guardar como PDF» del propio navegador; no se genera en el servidor.
4. **Unidades fijas:** m, m², m³, ml, ud, kg, l.
5. **Fotos:** máximo 20 por presupuesto, de hasta 10 MB antes de comprimir. Se comprimen en el móvil para ahorrar datos.

## Global Constraints

- Las de las fases anteriores.
- Las cantidades se escriben al estilo español («12,5»). Se reutiliza `parseImporte` para los números, con 0 < x < 1e7.
- El bucket es **privado**: nunca hay URLs públicas.

## Modelo de datos

**Tablas**

| Tabla | Columnas |
|---|---|
| `presupuestos` | `id`, `obra_id` (obligatoria, se borra con la obra), `autor_id` (perfil; se pone a null si se borra el perfil), `titulo` (obligatorio, por defecto «Toma de datos»), `observaciones`, `created_at`, `updated_at` |
| `presupuesto_medidas` | `id`, `presupuesto_id` (se borra con el presupuesto), `concepto` (obligatorio), `cantidad numeric(12,2) > 0`, `unidad` (enum), `created_at` |
| `presupuesto_materiales` | Igual que medidas, con `material` en lugar de `concepto` |
| `presupuesto_fotos` | `id`, `presupuesto_id` (se borra con el presupuesto), `path` (único, obligatorio), `pie`, `created_at` |

**Permisos**

- `private.puede_ver_presupuesto(p uuid)`: `security definer`, `stable`. Devuelve verdadero si quien pregunta es el jefe, o si es un trabajador activo con una fila en `obra_trabajadores` para la obra de ese presupuesto.
- **RLS en las cuatro tablas:** select, insert, update y delete si `puede_ver_presupuesto(...)`.
  - En `presupuestos`, el insert comprueba además que el usuario sea jefe o esté asignado a esa obra, con un helper `private.puede_en_obra(obra uuid)`.
- **Storage:** bucket `presupuestos`, privado, con un límite de 5 MB por archivo y solo `image/jpeg`, `image/png` e `image/webp`. Las políticas sobre `storage.objects` (`bucket_id = 'presupuestos'`) comprueban `puede_ver_presupuesto((storage.foldername(name))[1]::uuid)` para select, insert y delete.

## Review Focus

1. **Acceso por id:** un trabajador no asignado intenta leer el presupuesto, sus filas o sus fotos (tablas y Storage) → nada. Lo comprueba pgTAP sobre `storage.objects`.
2. **Ruta de subida inventada:** subir una foto a un `presupuesto_id` ajeno queda bloqueado por la política de Storage (pgTAP).
3. **Fotos enormes o que no son imágenes:** se rechazan en el cliente con un mensaje claro, y el bucket las rechaza igualmente (límite de tamaño y tipo).
4. **Borrados:** al borrar un presupuesto se borran sus filas y sus archivos de Storage. Al borrar una foto, también su archivo (e2e: el objeto deja de existir).
5. **Vista de impresión:** sin navegación ni botones, con las fotos visibles (e2e con `page.emulateMedia({ media: 'print' })`).

## Tasks

### Task 1: Esquema, RLS y Storage

- **Arrancar Storage en local:** `supabase stop` y después `supabase start` sin excluir `storage-api`.
- **Migración** `supabase/migrations/20261019030000_presupuestos.sql`: tablas, permisos, el bucket (insert en `storage.buckets` con `file_size_limit` y `allowed_mime_types`) y las políticas de Storage.
- **pgTAP** `supabase/tests/presupuestos.test.sql`:
  - **A, asignado a O1:**
    - Crea un presupuesto en O1, pero no en O2 (42501).
    - Ve los presupuestos de O1, aunque los haya creado otra persona.
    - No ve los de O2.
    - Inserta y lee medidas del suyo; no en uno ajeno.
    - En `storage.objects` (`bucket_id = 'presupuestos'`):
      - inserta con `name = '<presupuesto O1>/x.jpg'` → ok;
      - inserta con `'<presupuesto O2>/x.jpg'` → 42501;
      - hace select de un objeto de O2 → 0 filas.
  - **A desactivado:** 0 filas.
  - **El jefe:** todo.
  - **anon:** nada.
- **Seed:** un presupuesto en c…01 con 2 medidas y 2 materiales, sin fotos.
- Commit.

### Task 2: Lógica pura

**Archivos:** `lib/presupuesto.ts` y `lib/imagen.ts`.

**Funciones:**
- `parseLinea(fd, campoTexto: 'concepto' | 'material')`: devuelve `{ texto, cantidad, unidad }`. Cantidades «12,5» → 12.5, «0» → error y unidad inventada → error.
- `validarFoto(file: { type: string; size: number })`: devuelve `string | null` con un mensaje de error si no es imagen o pasa de 10 MB.
- `medidasReducidas(w, h, max = 1600)`: con 4000×3000 devuelve 1600×1200; con 800×600 no cambia.

**Tests:** unitarios para cada caso.

### Task 3: Pantallas

**Rutas:**
- `/presupuestos/nuevo?obra=` crea el presupuesto (`requireUser`; la RLS decide si puede) y redirige al editor.
- `/presupuestos/[id]` es el editor:
  - Título y observaciones, con un formulario y «Guardar».
  - **Medidas:** lista con «Quitar» por fila y un formulario para añadir: concepto, cantidad (`inputmode="decimal"`) y unidad.
  - **Materiales:** igual que Medidas.
  - **Fotos:** cuadrícula de miniaturas con URLs firmadas, el pie editable y «Quitar». El botón «Añadir fotos» abre `<input type="file" accept="image/*" multiple>` (en el móvil ofrece cámara o galería). Por cada foto: comprimir, subir y llamar a la acción `registrarFoto`, con la barra «Subiendo 2 de 3…».
  - Enlace «Ver para imprimir».
  - Para el jefe y para quien tenga acceso: «Borrar presupuesto», que borra también los archivos con `storage.remove`.
- `/presupuestos/[id]/imprimir`:
  - Página A4 con estilos `@media print`: cabecera «Carlos Multiservicios», obra, dirección, cliente, fecha, autor, las dos tablas, las fotos de 2 en 2 con su pie y las observaciones.
  - El botón «Imprimir / Guardar PDF» llama a `window.print()`.
  - Se oculta la navegación con `print:hidden`.
- **Ficha de la obra:** nueva sección «Presupuestos (toma de datos)» con la lista y el botón «Nuevo».

**Test e2e** (`tests/e2e/presupuestos.spec.ts`, en serie):
1. Pepe, en c…01 → Nuevo. Añade la medida «Canalón fachada» 12,5 ml y el material «Abrazaderas» 20 ud.
2. Sube una foto. Es un PNG generado en el test (`setInputFiles` con un buffer). Aparece la miniatura y se le pone el pie «Bajante roto».
3. Recarga: todo sigue ahí.
4. Abre «Ver para imprimir»:
   - En el medio de impresión no se ve la navegación.
   - Se ven «12,5», «ml», «Abrazaderas» y la imagen, con su `naturalWidth` mayor que 0.
5. Ana no puede abrir el presupuesto («No encontrado»).
6. Carlos lo ve y lo borra; el objeto de Storage ya no existe (comprobado con el cliente admin).
7. Un archivo `.txt` muestra «Solo se pueden subir fotos».

### Task 4: README, verificación, revisión y PR
