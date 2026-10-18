"use client";

import { useActionState } from "react";
import { ESTADOS_OBRA, type EstadoObra } from "@/lib/etiquetas";
import { Aviso } from "@/components/Aviso";
import type { FormState } from "@/app/(app)/equipo/actions";
import { cambiarEstado } from "./actions";

export function EstadoSelector({ id, estado }: { id: string; estado: EstadoObra }) {
  const [state, action, pending] = useActionState<FormState, FormData>(cambiarEstado, {});
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <fieldset disabled={pending}>
        <legend className="mb-2 text-sm font-semibold text-muted">Estado (toca para cambiar)</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(Object.keys(ESTADOS_OBRA) as EstadoObra[]).map((e) => (
            <button
              key={e}
              type="submit"
              name="estado"
              value={e}
              aria-pressed={e === estado}
              className="h-12 rounded-[10px] border-2 border-line bg-surface px-2 text-[15px] font-semibold transition-transform duration-100 active:scale-[0.97] disabled:opacity-60 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-white"
            >
              {ESTADOS_OBRA[e]}
            </button>
          ))}
        </div>
      </fieldset>
      {state.error ? (
        <div className="mt-3">
          <Aviso error={state.error} />
        </div>
      ) : null}
    </form>
  );
}
