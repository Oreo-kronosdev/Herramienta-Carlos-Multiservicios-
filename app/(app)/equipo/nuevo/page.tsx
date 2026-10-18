import { Suspense } from "react";
import { requireJefe } from "@/lib/auth";
import { Cabecera } from "@/components/Cabecera";
import { Fresco } from "@/components/Fresco";
import { Cargando } from "@/components/Cargando";
import { NuevoUsuarioForm } from "./NuevoUsuarioForm";

export const metadata = { title: "Nuevo usuario" };

export default function NuevoUsuarioPage() {
  return (
    <>
      <Cabecera titulo="Nuevo usuario" volver={{ href: "/equipo", texto: "Equipo" }} />
      <Suspense fallback={<Cargando />}>
        <Formulario />
      </Suspense>
    </>
  );
}

async function Formulario() {
  await requireJefe();
  return (
    <Fresco>
      <NuevoUsuarioForm />
    </Fresco>
  );
}
