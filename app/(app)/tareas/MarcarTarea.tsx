"use client";

import { useOptimistic, useState, useTransition } from "react";
import { marcarTarea } from "./actions";

export function MarcarTarea({ id, titulo, hecha }: { id: string; titulo: string; hecha: boolean }) {
  const [optimista, setOptimista] = useOptimistic(hecha);
  const [, startTransition] = useTransition();
  const [error, setError] = useState(false);
  return (
    <label className="relative flex size-12 shrink-0 cursor-pointer items-center justify-center">
      <input
        type="checkbox"
        checked={optimista}
        aria-label={`Hecha: ${titulo}`}
        onChange={(e) => {
          const valor = e.target.checked;
          setError(false);
          startTransition(async () => {
            setOptimista(valor);
            const r = await marcarTarea(id, valor);
            if (r.error) setError(true);
          });
        }}
        className={`size-7 rounded-md accent-ok ${error ? "outline-2 outline-danger" : ""}`}
      />
      {error ? <span role="alert" className="sr-only">No se pudo guardar</span> : null}
    </label>
  );
}
