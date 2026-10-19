"use client";

import { useActionState, useState } from "react";
import { Field } from "@/components/Field";
import { Select } from "@/components/Select";
import { SubmitButton } from "@/components/SubmitButton";
import { Aviso } from "@/components/Aviso";
import { ESTADOS_OBRA, TIPOS_TRABAJO, type EstadoObra, type TipoTrabajo } from "@/lib/etiquetas";
import type { FormState } from "@/app/(app)/equipo/actions";
import { borrarObra, guardarObra } from "./actions";
import { Formulario } from "@/components/Formulario";

type Obra = {
  id: string;
  cliente_id: string;
  titulo: string;
  direccion: string;
  tipo_trabajo: TipoTrabajo;
  estado: EstadoObra;
  presupuesto: number | null;
  asignados: string[];
};
type Props = {
  obra?: Obra;
  clientes: { id: string; nombre: string; direccion: string | null }[];
  trabajadores: { id: string; nombre: string }[];
};

export function ObraForm({ obra, clientes, trabajadores }: Props) {
  const [state, action] = useActionState<FormState, FormData>(guardarObra, {});
  const e = state.errores ?? {};
  const [direccion, setDireccion] = useState(obra?.direccion ?? "");
  const opcionesClientes = Object.fromEntries(clientes.map((c) => [c.id, c.nombre]));

  function alElegirCliente(id: string) {
    const anterior = clientes.find((c) => c.direccion === direccion);
    const nueva = clientes.find((c) => c.id === id)?.direccion;
    // Rellena la dirección con la del cliente salvo que ya se haya escrito otra a mano
    if (nueva && (!direccion || anterior)) setDireccion(nueva);
  }

  return (
    <Formulario estado={state} action={action} noValidate className="space-y-4 rounded-card border border-line bg-surface p-4">
      <Aviso error={state.error} />
      {obra ? <input type="hidden" name="id" value={obra.id} /> : null}
      <Select
        label="Cliente"
        name="cliente_id"
        opciones={opcionesClientes}
        vacia="Elige un cliente"
        defaultValue={obra?.cliente_id ?? ""}
        onChange={(ev) => alElegirCliente(ev.target.value)}
        error={e.cliente_id}
        required
      />
      <Field label="Título" name="titulo" defaultValue={obra?.titulo} error={e.titulo} hint="Ej.: Limpieza de canalones" required />
      <Field
        label="Dirección"
        name="direccion"
        value={direccion}
        onChange={(ev) => setDireccion(ev.target.value)}
        error={e.direccion}
        autoComplete="street-address"
        required
      />
      <Select
        label="Tipo de trabajo"
        name="tipo_trabajo"
        opciones={TIPOS_TRABAJO}
        vacia="Elige el tipo"
        defaultValue={obra?.tipo_trabajo ?? ""}
        error={e.tipo_trabajo}
        required
      />
      <Field
        label="Presupuesto (€)"
        name="presupuesto"
        inputMode="decimal"
        defaultValue={obra?.presupuesto != null ? obra.presupuesto.toFixed(2).replace(".", ",") : ""}
        error={e.presupuesto}
        hint="Opcional. Ej.: 1.250,50"
      />
      <Select label="Estado" name="estado" opciones={ESTADOS_OBRA} defaultValue={obra?.estado ?? "pendiente"} error={e.estado} />
      <fieldset>
        <legend className="mb-1.5 text-[15px] font-semibold">Trabajadores asignados</legend>
        {trabajadores.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {trabajadores.map((t) => (
              <label key={t.id} className="flex min-h-12 items-center gap-3 rounded-[10px] border-2 border-line px-3.5 has-checked:border-accent has-checked:bg-accent-soft">
                <input
                  type="checkbox"
                  name="trabajadores"
                  value={t.id}
                  defaultChecked={obra?.asignados.includes(t.id)}
                  className="size-6 accent-accent"
                />
                <span className="font-medium break-words">{t.nombre}</span>
              </label>
            ))}
          </div>
        ) : (
          <p className="text-muted">No hay trabajadores activos. Créalos en «Equipo».</p>
        )}
      </fieldset>
      <SubmitButton>Guardar obra</SubmitButton>
    </Formulario>
  );
}

export function BorrarObra({ id }: { id: string }) {
  const [state, action] = useActionState<FormState, FormData>(borrarObra, {});
  return (
    <form noValidate
      action={action}
      onSubmit={(ev) => {
        if (!confirm("¿Borrar esta obra? No se puede deshacer.")) ev.preventDefault();
      }}
      className="space-y-3"
    >
      <Aviso error={state.error} />
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="danger" pendingText="Borrando…">
        Borrar obra
      </SubmitButton>
    </form>
  );
}
