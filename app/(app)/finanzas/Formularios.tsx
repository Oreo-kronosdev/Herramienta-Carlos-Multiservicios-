"use client";

import { useActionState, useState, useTransition } from "react";
import { Field } from "@/components/Field";
import { Select } from "@/components/Select";
import { SubmitButton } from "@/components/SubmitButton";
import { Aviso } from "@/components/Aviso";
import type { TipoMovimiento } from "@/lib/etiquetas";
import type { FormState } from "@/app/(app)/equipo/actions";
import { borrarFactura, borrarMovimiento, guardarFactura, guardarMovimiento, marcarFactura } from "./actions";
import { Formulario } from "@/components/Formulario";

const aTexto = (n: number | null | undefined) => (n == null ? "" : n.toFixed(2).replace(".", ","));
const opciones = <T extends { id: string }>(xs: T[], k: keyof T) => Object.fromEntries(xs.map((x) => [x.id, String(x[k])]));

type Movimiento = { id: string; tipo: TipoMovimiento; concepto: string; importe: number; fecha: string; obra_id: string | null };

export function MovimientoForm({
  movimiento,
  tipo,
  hoy,
  obras,
}: {
  movimiento?: Movimiento;
  tipo: TipoMovimiento;
  hoy: string;
  obras: { id: string; titulo: string }[];
}) {
  const [state, action] = useActionState<FormState, FormData>(guardarMovimiento, {});
  const e = state.errores ?? {};
  return (
    <Formulario estado={state} action={action} noValidate className="space-y-4 rounded-card border border-line bg-surface p-4">
      <Aviso error={state.error} />
      {movimiento ? <input type="hidden" name="id" value={movimiento.id} /> : null}
      <input type="hidden" name="tipo" value={movimiento?.tipo ?? tipo} />
      <Field label="Concepto" name="concepto" defaultValue={movimiento?.concepto} error={e.concepto} hint={tipo === "gasto" ? "Ej.: Tejas, gasolina…" : "Ej.: Pago en mano"} required />
      <Field label="Importe (€)" name="importe" inputMode="decimal" defaultValue={aTexto(movimiento?.importe)} error={e.importe} hint="Ej.: 45,90" required />
      <Field label="Fecha" name="fecha" type="date" defaultValue={movimiento?.fecha ?? hoy} error={e.fecha} required />
      <Select label="Obra" name="obra_id" opciones={opciones(obras, "titulo")} vacia="Sin obra" defaultValue={movimiento?.obra_id ?? ""} />
      <SubmitButton>Guardar</SubmitButton>
    </Formulario>
  );
}

type Factura = {
  id: string;
  numero: string;
  cliente_id: string;
  obra_id: string | null;
  concepto: string;
  importe: number;
  fecha_emision: string;
  fecha_vencimiento: string | null;
};

export function FacturaForm({
  factura,
  hoy,
  obras,
  clientes,
}: {
  factura?: Factura;
  hoy: string;
  obras: { id: string; titulo: string }[];
  clientes: { id: string; nombre: string }[];
}) {
  const [state, action] = useActionState<FormState, FormData>(guardarFactura, {});
  const e = state.errores ?? {};
  return (
    <Formulario estado={state} action={action} noValidate className="space-y-4 rounded-card border border-line bg-surface p-4">
      <Aviso error={state.error} />
      {factura ? <input type="hidden" name="id" value={factura.id} /> : null}
      <Field label="Número" name="numero" defaultValue={factura?.numero} error={e.numero} hint="Ej.: 2026-014" autoCapitalize="characters" required />
      <Select label="Cliente" name="cliente_id" opciones={opciones(clientes, "nombre")} vacia="Elige cliente" defaultValue={factura?.cliente_id ?? ""} error={e.cliente_id} />
      <Select label="Obra" name="obra_id" opciones={opciones(obras, "titulo")} vacia="Sin obra" defaultValue={factura?.obra_id ?? ""} />
      <Field label="Concepto" name="concepto" defaultValue={factura?.concepto} error={e.concepto} required />
      <Field label="Importe (€)" name="importe" inputMode="decimal" defaultValue={aTexto(factura?.importe)} error={e.importe} hint="Total de la factura. Ej.: 1.210,00" required />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Emitida el" name="fecha_emision" type="date" defaultValue={factura?.fecha_emision ?? hoy} error={e.fecha_emision} required />
        <Field label="Vence el" name="fecha_vencimiento" type="date" defaultValue={factura?.fecha_vencimiento ?? ""} error={e.fecha_vencimiento} hint="Opcional" />
      </div>
      <SubmitButton>Guardar factura</SubmitButton>
    </Formulario>
  );
}

function Borrar({ id, accion, texto, pregunta }: { id: string; accion: typeof borrarFactura; texto: string; pregunta: string }) {
  const [state, action] = useActionState<FormState, FormData>(accion, {});
  return (
    <form
      action={action}
      onSubmit={(ev) => {
        if (!confirm(pregunta)) ev.preventDefault();
      }}
      className="space-y-3"
    >
      <Aviso error={state.error} />
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="danger" pendingText="Borrando…">
        {texto}
      </SubmitButton>
    </form>
  );
}
export const BorrarMovimiento = ({ id }: { id: string }) => (
  <Borrar id={id} accion={borrarMovimiento} texto="Borrar movimiento" pregunta="¿Borrar este movimiento?" />
);
export const BorrarFactura = ({ id }: { id: string }) => (
  <Borrar id={id} accion={borrarFactura} texto="Borrar factura" pregunta="¿Borrar esta factura? Si estaba cobrada, también se quita su ingreso." />
);

// Botón de una sola pulsación (lista de pendientes y ficha de factura) con error visible.
export function BotonFactura({ id, pagada, fecha, texto, estilo = "ok" }: { id: string; pagada: boolean; fecha?: string; texto: string; estilo?: "ok" | "neutro" }) {
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        disabled={pendiente}
        onClick={() =>
          startTransition(async () => {
            try {
              setError((await marcarFactura(id, pagada, fecha)).error ?? null);
            } catch {
              setError("Sin conexión. Inténtalo de nuevo.");
            }
          })
        }
        className={`h-11 rounded-[10px] px-4 text-[15px] font-semibold whitespace-nowrap active:scale-[0.98] disabled:opacity-50 ${
          estilo === "ok" ? "bg-ok text-white" : "border-2 border-line bg-surface"
        }`}
      >
        {pendiente ? "Guardando…" : texto}
      </button>
      {error ? (
        <span role="alert" className="text-[13px] font-semibold text-danger">
          {error}
        </span>
      ) : null}
    </span>
  );
}

export function CobrarConFecha({ id, hoy }: { id: string; hoy: string }) {
  const [fecha, setFecha] = useState(hoy);
  return (
    <div className="space-y-3">
      <Field label="Cobrada el" name="pagada_en" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      <BotonFactura id={id} pagada fecha={fecha} texto="Marcar como pagada" />
    </div>
  );
}
