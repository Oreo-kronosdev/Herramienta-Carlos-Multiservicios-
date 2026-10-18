"use client";

import { useOptimistic, useState, useTransition } from "react";
import { marcarTarea } from "./actions";

export function MarcarTarea({ id, titulo, hecha }: { id: string; titulo: string; hecha: boolean }) {
  const [optimista, setOptimista] = useOptimistic(hecha);
  const [, startTransition] = useTransition();
  const [error, setError] = useState(false);
  return (
    <div className="flex shrink-0 flex-col items-center">
      <label className="flex size-12 cursor-pointer items-center justify-center">
        <input
          type="checkbox"
          checked={optimista}
          aria-label={`Hecha: ${titulo}`}
          aria-describedby={error ? `error-${id}` : undefined}
          onChange={(e) => {
            const valor = e.target.checked;
            setError(false);
            startTransition(async () => {
              setOptimista(valor);
              try {
                if ((await marcarTarea(id, valor)).error) setError(true);
              } catch {
                setError(true); // sin conexión: la casilla vuelve a su estado real
              }
            });
          }}
          className={`size-7 rounded-md accent-ok ${error ? "outline-2 outline-danger" : ""}`}
        />
      </label>
      {error ? (
        <span id={`error-${id}`} role="alert" className="w-14 text-center text-[12px] leading-tight font-semibold text-danger">
          No se pudo guardar
        </span>
      ) : null}
    </div>
  );
}
