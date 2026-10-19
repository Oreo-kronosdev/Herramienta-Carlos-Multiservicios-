"use client";

import { useLayoutEffect, useRef, type FormHTMLAttributes } from "react";

type Estado = { error?: string; errores?: Record<string, string> };

// React vacía el formulario al terminar cada envío. Si el servidor devuelve un error,
// se vuelve a poner lo escrito para que solo haya que corregir el campo marcado.
export function Formulario({ estado, onSubmit, ...form }: FormHTMLAttributes<HTMLFormElement> & { estado: Estado }) {
  const ref = useRef<HTMLFormElement>(null);
  const enviado = useRef<FormData | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const datos = enviado.current;
    if (!el || !datos || !(estado.error || estado.errores)) return;
    restaurar(el, datos);
    el.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
  }, [estado]);

  return (
    <form
      ref={ref}
      onSubmit={(ev) => {
        enviado.current = new FormData(ev.currentTarget);
        onSubmit?.(ev);
      }}
      {...form}
    />
  );
}

export function restaurar(form: HTMLFormElement, datos: FormData) {
  const vistos = new Map<string, number>();
  for (const el of Array.from(form.elements)) {
    if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement)) continue;
    if (!el.name || el.type === "file" || el.type === "hidden" || el.type === "submit") continue;
    const valores = datos.getAll(el.name).map(String);
    if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
      el.checked = valores.includes(el.value);
    } else {
      // Varios campos con el mismo nombre: cada uno recupera el suyo, en orden
      const i = vistos.get(el.name) ?? 0;
      vistos.set(el.name, i + 1);
      el.value = valores[i] ?? "";
    }
  }
}
