"use client";

import { borrarSuscripcion } from "@/app/(app)/avisos/actions";
import { signOut } from "@/app/login/actions";

// Al salir, este móvil deja de recibir los avisos de esta persona.
async function salir() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) await borrarSuscripcion(sub.endpoint);
  } catch {
    // sin avisos en este navegador: nada que quitar
  }
  await signOut();
}

export function BotonSalir() {
  return (
    <form action={salir}>
      <button type="submit" className="h-10 rounded-lg px-3 text-[15px] font-semibold text-white/90 active:bg-white/10">
        Salir
      </button>
    </form>
  );
}
