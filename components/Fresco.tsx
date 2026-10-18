"use client";

import { Fragment, type ReactNode } from "react";
import { useRouter } from "next/navigation";

// Next guarda las pantallas visitadas con su estado (formularios a medio rellenar, avisos).
// Aquí cada entrada nueva a un formulario empieza limpia; con "Atrás" se conserva.
export function Fresco({ children }: { children: ReactNode }) {
  const { bfcacheId } = useRouter();
  return <Fragment key={bfcacheId}>{children}</Fragment>;
}
