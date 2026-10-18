"use client";

export function BotonImprimir() {
  return (
    <button type="button" onClick={() => window.print()} className="h-11 rounded-[10px] bg-accent px-4 font-semibold text-accent-ink active:scale-[0.98]">
      Imprimir / Guardar PDF
    </button>
  );
}
