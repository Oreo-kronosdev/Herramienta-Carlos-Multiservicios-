"use client";

import { useActionState, useState } from "react";
import { Field } from "@/components/Field";
import { Select } from "@/components/Select";
import { SubmitButton } from "@/components/SubmitButton";
import { Aviso } from "@/components/Aviso";
import { AVISAR_DIAS, TIPOS_EVENTO, type AvisarDias, type TipoEvento } from "@/lib/etiquetas";
import type { FormState } from "@/app/(app)/equipo/actions";
import { borrarEvento, guardarEvento } from "./actions";

type Evento = {
  id: string;
  titulo: string;
  tipo: TipoEvento;
  fecha: string;
  hora: string | null;
  obra_id: string | null;
  notas: string | null;
  avisar_dias: AvisarDias;
  personas: string[];
};
type Props = {
  evento?: Evento;
  obraInicial?: string;
  obras: { id: string; titulo: string; personas: string[] }[];
  personas: { id: string; nombre: string }[];
};

export function EventoForm({ evento, obraInicial, obras, personas }: Props) {
  const [state, action] = useActionState<FormState, FormData>(guardarEvento, {});
  const e = state.errores ?? {};
  const inicial = evento?.obra_id ?? obraInicial ?? "";
  const [marcadas, setMarcadas] = useState<string[]>(
    evento?.personas ?? obras.find((o) => o.id === inicial)?.personas ?? [],
  );

  function alElegirObra(id: string) {
    // Propone a quien trabaja en la obra si todavía no se ha marcado a nadie
    if (!marcadas.length) setMarcadas(obras.find((o) => o.id === id)?.personas ?? []);
  }
  const alternar = (id: string) =>
    setMarcadas((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));

  return (
    <form action={action} noValidate className="space-y-4 rounded-card border border-line bg-surface p-4">
      <Aviso error={state.error} />
      {evento ? <input type="hidden" name="id" value={evento.id} /> : null}
      <Field label="Título" name="titulo" defaultValue={evento?.titulo} error={e.titulo} hint="Ej.: Visita con el presidente" required />
      <Select label="Tipo" name="tipo" opciones={TIPOS_EVENTO} defaultValue={evento?.tipo ?? "cita"} error={e.tipo} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha" name="fecha" type="date" defaultValue={evento?.fecha} error={e.fecha} required />
        <Field
          label="Hora"
          name="hora"
          type="time"
          defaultValue={evento?.hora?.slice(0, 5) ?? ""}
          error={e.hora}
          hint="Vacía = todo el día"
        />
      </div>
      <Select
        label="Obra"
        name="obra_id"
        opciones={Object.fromEntries(obras.map((o) => [o.id, o.titulo]))}
        vacia="Sin obra"
        defaultValue={inicial}
        onChange={(ev) => alElegirObra(ev.target.value)}
      />
      <fieldset aria-describedby={e.personas ? "personas-error" : undefined}>
        <legend className="mb-1.5 text-[15px] font-semibold">Personas</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {personas.map((p) => (
            <label
              key={p.id}
              className="flex min-h-12 items-center gap-3 rounded-[10px] border-2 border-line px-3.5 has-checked:border-accent has-checked:bg-accent-soft"
            >
              <input
                type="checkbox"
                name="personas"
                value={p.id}
                checked={marcadas.includes(p.id)}
                onChange={() => alternar(p.id)}
                className="size-6 accent-accent"
              />
              <span className="font-medium break-words">{p.nombre}</span>
            </label>
          ))}
        </div>
        {e.personas ? (
          <span id="personas-error" className="mt-1 block text-sm font-medium text-danger">
            {e.personas}
          </span>
        ) : null}
      </fieldset>
      <Select
        label="Avisar"
        name="avisar_dias"
        opciones={AVISAR_DIAS}
        defaultValue={String(evento?.avisar_dias ?? 1)}
        error={e.avisar_dias}
      />
      <label className="block">
        <span className="mb-1.5 block text-[15px] font-semibold">Notas</span>
        <textarea
          name="notas"
          rows={3}
          defaultValue={evento?.notas ?? ""}
          className="w-full rounded-[10px] border-2 border-line bg-surface px-3.5 py-3 outline-none focus:border-accent"
        />
      </label>
      <SubmitButton>Guardar cita</SubmitButton>
    </form>
  );
}

export function BorrarEvento({ id }: { id: string }) {
  const [state, action] = useActionState<FormState, FormData>(borrarEvento, {});
  return (
    <form
      action={action}
      onSubmit={(ev) => {
        if (!confirm("¿Borrar esta cita? No se puede deshacer.")) ev.preventDefault();
      }}
      className="space-y-3"
    >
      <Aviso error={state.error} />
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="danger" pendingText="Borrando…">
        Borrar cita
      </SubmitButton>
    </form>
  );
}
