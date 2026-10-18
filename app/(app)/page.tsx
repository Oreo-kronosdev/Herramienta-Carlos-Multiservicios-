import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { Cargando } from "@/components/Cargando";

export default function InicioPage() {
  return (
    <Suspense fallback={<Cargando />}>
      <Inicio />
    </Suspense>
  );
}

async function Inicio() {
  const perfil = await requireUser();
  return (
    <section>
      <h1 className="font-display text-3xl font-bold">Inicio</h1>
      <p className="mt-1 text-muted">Hola, {perfil.nombre}.</p>
    </section>
  );
}
