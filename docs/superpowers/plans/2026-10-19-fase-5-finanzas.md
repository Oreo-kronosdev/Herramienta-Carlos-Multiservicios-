# Fase 5 — Finanzas básicas · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Carlos apunta ingresos y gastos, emite y sigue sus facturas (pendientes o pagadas), ve el resumen del mes y lo exporta a Excel.

**Architecture:**
- Dos tablas, `movimientos` y `facturas`, que solo ve el jefe (RLS).
- Al marcar una factura como pagada, una función crea en la misma transacción su ingreso. Al desmarcarla, lo borra. Así el balance nunca cuenta una factura dos veces.
- La exportación es un Route Handler que genera un `.xlsx` con `exceljs` y tres hojas: Resumen, Movimientos y Facturas.

**Spec:** `docs/spec.md`, módulo 6: «Finanzas básicas: ingresos, gastos, facturas pendientes, con exportación a Excel».

## Decisiones tomadas sin consulta (el usuario pidió seguir con todas las fases; se apuntan para que las revise)

1. Las finanzas son **solo del jefe**. Los trabajadores no ven nada (ni la pestaña).
2. Una factura pagada genera automáticamente su **ingreso**, con la fecha de cobro. Los ingresos que no vienen de una factura (pagos en mano, etc.) se apuntan a mano.
3. Sin IVA ni impuestos desglosados: un importe por movimiento o factura. Si hace falta, se añadirá después.
4. Navegación del jefe: la pestaña «Equipo» pasa a ser **«Más»**, que lleva a Finanzas y Equipo. Siete pestañas no caben a 390 px. El inicio del jefe muestra «Pendiente de cobro» con enlace a Finanzas.
5. Si se borra una obra, sus movimientos y facturas se conservan sin obra (`on delete set null`). Un cliente con facturas no se puede borrar.
6. Exportación: el mes que se está viendo o el año completo.

## Global Constraints

- Las de las fases anteriores.
- Importes con `parseImporte`; aquí además `> 0` y `< 1e10`, lo que cierra el aviso menor de la fase 1.
- Fechas en Europe/Madrid.
- `formatEUR` en pantalla. En Excel, números reales con formato `#,##0.00 "€"` y fechas reales.

## Modelo de datos

- `tipo_movimiento` enum `('ingreso','gasto')`.
- `movimientos`:
  - `id uuid pk`
  - `tipo tipo_movimiento not null`
  - `concepto text not null`
  - `importe numeric(12,2) not null check (importe > 0)`
  - `fecha date not null`
  - `obra_id → obras on delete set null`
  - `factura_id uuid unique → facturas on delete cascade`
  - `created_at`
  - Índice en `fecha`.
- `facturas`:
  - `id uuid pk`
  - `numero text not null unique`
  - `cliente_id → clientes on delete restrict`
  - `obra_id → obras on delete set null`
  - `concepto text not null`
  - `importe numeric(12,2) not null check (importe > 0)`
  - `fecha_emision date not null`
  - `fecha_vencimiento date`
  - `pagada boolean not null default false`
  - `pagada_en date`
  - `created_at`
  - Índice en `pagada`.
- RLS: solo el jefe (`for all`) en las dos tablas; anon revocado.
- Funciones:
  - `public.marcar_factura(p_factura uuid, p_pagada boolean, p_fecha date)`:
    - `security invoker`, de modo que la RLS del jefe se aplica y un trabajador no puede usarla.
    - Pone `pagada` y `pagada_en`.
    - Si se paga, inserta el ingreso `"Factura <numero> · <cliente>"` (con `on conflict (factura_id) do nothing`).
    - Si se desmarca, borra el ingreso de esa factura.
  - Trigger: si se edita el importe o el número de una factura pagada, se actualiza su ingreso.

## Review Focus

1. Un trabajador intenta leer o crear movimientos o facturas por la API → 0 filas o 42501 (pgTAP).
2. Marcar una factura como pagada dos veces no duplica el ingreso; desmarcarla lo quita (pgTAP).
3. Los totales del mes usan las fechas del mes en Madrid; los movimientos del día 1 y del último día entran (unit `rangoMes`).
4. Un importe de 0, negativo o ≥ 1e10 da un error de campo (unit).
5. El Excel abre con hojas, cabeceras, fechas e importes numéricos; las cuentas cuadran con la pantalla (e2e: descargar y leer con exceljs).

## Tasks

### Task 1: Esquema, RLS y función de cobro

- **Migración:** `supabase/migrations/20261019020000_finanzas.sql`.
- **Test pgTAP** (`supabase/tests/finanzas.test.sql`):
  - Trabajador: 0 filas en las dos tablas; insert → 42501; `marcar_factura` → error o 0 filas.
  - Jefe:
    - `marcar_factura` crea exactamente un ingreso con el importe y la fecha.
    - Marcarla otra vez sigue dejando un solo ingreso.
    - Desmarcarla deja 0 ingresos y `pagada_en` a null.
    - Editar el importe de una factura pagada actualiza su ingreso.
  - Borrar la obra deja `obra_id` a null en la factura y en el movimiento.
  - Borrar un cliente con facturas → 23503.
  - anon → 42501.
- **Seed:** 3 movimientos este mes (un ingreso y dos gastos), 2 facturas (una pendiente y vencida, otra pendiente sin vencer) y 1 pagada con su ingreso.
- **Otros cambios:**
  - `borrarCliente`: el mensaje pasa a «No se puede borrar: tiene obras o facturas».
  - Su test e2e sigue buscando «No se puede borrar».

### Task 2: Lógica pura

**Archivo:** `lib/finanzas.ts`

**Funciones:**
- `parseMovimiento(fd)`: devuelve `{ tipo, concepto, importe, fecha, obra_id|null }`.
- `parseFactura(fd)`: devuelve `{ numero, cliente_id, obra_id|null, concepto, importe, fecha_emision, fecha_vencimiento|null }`. El vencimiento no puede ser anterior a la emisión.
- `rangoMes(mes: string)`: con `'2026-10'` devuelve `{ desde: '2026-10-01', hasta: '2026-10-31' }`. Si el mes no es válido, devuelve el actual.
- `mesAnterior(mes)` y `mesSiguiente(mes)`.
- `resumen(movs)`: devuelve `{ ingresos, gastos, balance }`, redondeado a céntimos (suma en céntimos enteros).
- `nombreMes('2026-10')`: «octubre de 2026».

**Tests unitarios:**
- Importe 0, −5, `1e10` y «abc» → error.
- Vencimiento anterior a la emisión → error.
- `rangoMes('2026-02')` termina el día 28; `rangoMes('2028-02')` termina el 29.
- `resumen`: 0.1 + 0.2 da exactamente 0.30 en céntimos.
- `mesSiguiente('2026-12')` es `'2027-01'`.

### Task 3: Pantallas

**Rutas** (todas con `requireJefe`):

| Ruta | Contenido |
|---|---|
| `/finanzas?mes=` | Resumen, «Facturas pendientes» y «Movimientos del mes» |
| `/finanzas/movimientos/nuevo?tipo=` | Alta de un movimiento |
| `/finanzas/movimientos/[id]` | Editar o borrar. Si viene de una factura: solo lectura y enlace a la factura |
| `/finanzas/facturas/nueva` | Alta de una factura |
| `/finanzas/facturas/[id]` | Editar, borrar y «Marcar como pagada» con fecha (hoy por defecto) o «Marcar como no pagada» |
| `/mas` | Enlaces grandes a Finanzas y Equipo |

**Pantalla `/finanzas`:**
- Arriba, un selector de mes: ← octubre de 2026 →.
- Tarjetas: Ingresos, Gastos, Balance (en verde si es positivo y en rojo si es negativo) y «Pendiente de cobro», con el total de las facturas no pagadas de cualquier mes y cuántas están vencidas.
- «Facturas pendientes»: todas, de cualquier mes, ordenadas por vencimiento. Cada una con:
  - la etiqueta «Vencida» si toca;
  - el botón «Cobrada», que la marca como pagada con la fecha de hoy.
- «Movimientos del mes».
- Botones «Nuevo gasto», «Nuevo ingreso» y «Nueva factura».
- Enlaces «Exportar mes a Excel» y «Exportar año a Excel».

**Otros cambios:**
- `BottomNav`: el jefe ve «Más» en lugar de «Equipo». Está activa en `/mas`, `/equipo` y `/finanzas`.
- `mobile.spec`:
  - El jefe ve Inicio, Obras, Agenda, Tareas, Clientes y Más.
  - Se añaden las rutas nuevas.
  - El trabajador no ve «Más».

**Test e2e** (`tests/e2e/finanzas.spec.ts`, en serie):
1. Carlos apunta un gasto de «45,90» y un ingreso de «200». Las tarjetas del mes cambian en esas cantidades exactas, comparando con los valores leídos antes.
2. Crea la factura F-TEST con 1.210,00 y la marca como «Cobrada». Sale de las pendientes, aparece en los movimientos como ingreso y «Pendiente de cobro» baja en 1.210,00.
3. La desmarca: vuelve a pendientes y el ingreso desaparece.
4. Pepe abre `/finanzas` → redirige a `/`. No tiene la pestaña «Más».
5. Una factura con vencimiento anterior a la emisión da error.
6. Al terminar, se borran los datos de prueba.

### Task 4: Exportación a Excel

**Implementación:**
- Dependencia: `npm i exceljs`.
- Ruta: `app/(app)/finanzas/exportar/route.ts`. Responde a `GET ?mes=YYYY-MM` o `?ano=YYYY`, con `requireJefe`.
- Respuesta: `Content-Type` de xlsx y `Content-Disposition: attachment; filename="finanzas-2026-10.xlsx"`.
- Hojas:

| Hoja | Contenido |
|---|---|
| Resumen | Periodo, ingresos, gastos, balance y pendiente de cobro |
| Movimientos | Fecha, Tipo, Concepto, Obra, Importe. Los gastos van en negativo para que la suma sea el balance. Fila de total con fórmula |
| Facturas | Número, Cliente, Obra, Concepto, Importe, Emisión, Vencimiento, Estado, Pagada el. Incluye todas las facturas emitidas en el periodo y también las pendientes de periodos anteriores, marcadas «Pendiente» |

**Test e2e:**
- Descargar `?mes=` del mes actual.
- Abrirlo con exceljs y comprobar:
  - los nombres de las hojas;
  - las cabeceras;
  - que la suma de los importes de «Movimientos» coincide con el balance de la pantalla;
  - que las fechas son de tipo Date.
- Pepe → no recibe un 200 (redirige).

### Task 5: README, verificación, revisión y PR
