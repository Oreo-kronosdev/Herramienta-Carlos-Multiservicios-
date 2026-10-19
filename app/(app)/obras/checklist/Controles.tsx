"use client";

import { useActionState, useOptimistic, useState, useTransition } from "react";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { Aviso } from "@/components/Aviso";
import { TIPOS_CHECKLIST } from "@/lib/etiquetas";
import type { FormState } from "@/app/(app)/equipo/actions";
import { anadirItem, borrarItem, marcarItem, reiniciarChecklist } from "./actions";
import { Formulario } from "@/components/Formulario";

export function ItemCheck({ id, texto, preparado, obraId }: { id: string; texto: string; preparado: boolean; obraId: string }) {
  const [optimista, setOptimista] = useOptimistic(preparado);
  const [, startTransition] = useTransition();
  const [error, setError] = useState(false);
  return (
    <label className="flex min-h-12 flex-1 cursor-pointer items-center gap-3 py-1.5">
      <input
        type="checkbox"
        checked={optimista}
        onChange={(e) => {
          const valor = e.target.checked;
          setError(false);
          startTransition(async () => {
            setOptimista(valor);
            try {
              if ((await marcarItem(id, valor, obraId)).error) setError(true);
            } catch {
              setError(true);
            }
          });
        }}
        className="size-7 shrink-0 rounded-md accent-ok"
      />
      <span className={`min-w-0 break-words ${optimista ? "text-muted line-through" : "font-medium"}`}>{texto}</span>
      {error ? (
        <span role="alert" className="ml-auto shrink-0 text-[13px] font-semibold text-danger">
          No se pudo guardar
        </span>
      ) : null}
    </label>
  );
}

// Ejecuta una acción del servidor y devuelve un mensaje si falla (también sin conexión).
async function intentar(accion: () => Promise<{ error?: string }>, mensaje: string): Promise<string | null> {
  try {
    return (await accion()).error ? mensaje : null;
  } catch {
    return `${mensaje} (¿sin conexión?)`;
  }
}

export function QuitarItem({ id, texto, obraId }: { id: string; texto: string; obraId: string }) {
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      {error ? (
        <span role="alert" className="shrink-0 text-[13px] font-semibold text-danger">
          {error}
        </span>
      ) : null}
      <button
        type="button"
        aria-label={`Quitar ${texto}`}
        disabled={pendiente}
        onClick={() => {
          if (!confirm(`¿Quitar «${texto}» de la lista?`)) return;
          startTransition(async () => setError(await intentar(() => borrarItem(id, obraId), "No se pudo quitar")));
        }}
        className="flex size-11 shrink-0 items-center justify-center rounded-lg text-xl text-muted active:bg-bg disabled:opacity-40"
      >
        ×
      </button>
    </>
  );
}

export function NuevoItem({ obraId }: { obraId: string }) {
  const [state, action] = useActionState<FormState, FormData>(anadirItem, {});
  const e = state.errores ?? {};
  return (
    <Formulario estado={state} action={action} noValidate className="space-y-3 border-t border-line pt-4">
      <Aviso error={state.error} />
      <input type="hidden" name="obra_id" value={obraId} />
      <Field label="Qué hace falta" name="texto" error={e.texto} maxLength={120} enterKeyHint="done" />
      <fieldset className="grid grid-cols-2 gap-2">
        <legend className="sr-only">Tipo</legend>
        {Object.entries(TIPOS_CHECKLIST).map(([valor, texto]) => (
          <label
            key={valor}
            className="relative flex h-12 cursor-pointer items-center justify-center rounded-[10px] border-2 border-line font-semibold has-checked:border-ink has-checked:bg-ink has-checked:text-white has-focus-visible:outline-3 has-focus-visible:outline-accent"
          >
            <input type="radio" name="tipo" value={valor} defaultChecked={valor === "material"} className="absolute inset-0 cursor-pointer opacity-0" />
            {texto}
          </label>
        ))}
      </fieldset>
      <SubmitButton pendingText="Añadiendo…">Añadir</SubmitButton>
    </Formulario>
  );
}

export function DesmarcarTodo({ obraId }: { obraId: string }) {
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pendiente}
        onClick={() => {
          if (!confirm("¿Desmarcar todo para la próxima salida?")) return;
          startTransition(async () => setError(await intentar(() => reiniciarChecklist(obraId), "No se pudo desmarcar")));
        }}
        className="h-10 shrink-0 rounded-[10px] border-2 border-line px-3 text-[15px] font-semibold whitespace-nowrap active:bg-bg disabled:opacity-50"
      >
        Desmarcar todo
      </button>
      {error ? (
        <span role="alert" className="text-[13px] font-semibold text-danger">
          {error}
        </span>
      ) : null}
    </div>
  );
}
