"use client";

import { useActionState } from "react";
import { Field } from "@/components/Field";
import { Select } from "@/components/Select";
import { SubmitButton } from "@/components/SubmitButton";
import { Aviso } from "@/components/Aviso";
import type { FormState } from "@/app/(app)/equipo/actions";
import { borrarTarea, guardarTarea } from "./actions";
import { Formulario } from "@/components/Formulario";

type Tarea = { id: string; titulo: string; notas: string | null; fecha_limite: string | null; obra_id: string | null; asignada_a: string };
type Props = {
  tarea?: Tarea;
  obraInicial?: string;
  obras: { id: string; titulo: string }[];
  personas: { id: string; nombre: string }[];
};

export function TareaForm({ tarea, obraInicial, obras, personas }: Props) {
  const [state, action] = useActionState<FormState, FormData>(guardarTarea, {});
  const e = state.errores ?? {};
  return (
    <Formulario estado={state} action={action} noValidate className="space-y-4 rounded-card border border-line bg-surface p-4">
      <Aviso error={state.error} />
      {tarea ? <input type="hidden" name="id" value={tarea.id} /> : null}
      <Field label="Qué hay que hacer" name="titulo" defaultValue={tarea?.titulo} error={e.titulo} hint="Ej.: Comprar silicona" required />
      <Select
        label="Para"
        name="asignada_a"
        opciones={Object.fromEntries(personas.map((p) => [p.id, p.nombre]))}
        vacia="Elige persona"
        defaultValue={tarea?.asignada_a ?? ""}
        error={e.asignada_a}
      />
      <Select
        label="Obra"
        name="obra_id"
        opciones={Object.fromEntries(obras.map((o) => [o.id, o.titulo]))}
        vacia="Sin obra"
        defaultValue={tarea?.obra_id ?? obraInicial ?? ""}
      />
      <Field label="Fecha límite" name="fecha_limite" type="date" defaultValue={tarea?.fecha_limite ?? ""} error={e.fecha_limite} hint="Opcional" />
      <label className="block">
        <span className="mb-1.5 block text-[15px] font-semibold">Notas</span>
        <textarea
          name="notas"
          rows={3}
          defaultValue={tarea?.notas ?? ""}
          className="w-full rounded-[10px] border-2 border-line bg-surface px-3.5 py-3 outline-none focus:border-accent"
        />
      </label>
      <SubmitButton>Guardar tarea</SubmitButton>
    </Formulario>
  );
}

export function BorrarTarea({ id }: { id: string }) {
  const [state, action] = useActionState<FormState, FormData>(borrarTarea, {});
  return (
    <form
      action={action}
      onSubmit={(ev) => {
        if (!confirm("¿Borrar esta tarea?")) ev.preventDefault();
      }}
      className="space-y-3"
    >
      <Aviso error={state.error} />
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="danger" pendingText="Borrando…">
        Borrar tarea
      </SubmitButton>
    </form>
  );
}
