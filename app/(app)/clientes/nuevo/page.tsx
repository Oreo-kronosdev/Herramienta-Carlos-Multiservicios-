import { Suspense } from "react";
import { requireJefe } from "@/lib/auth";
import { Cabecera } from "@/components/Cabecera";
import { Fresco } from "@/components/Fresco";
import { Cargando } from "@/components/Cargando";
import { ClienteForm } from "../ClienteForm";

export const metadata = { title: "Nuevo cliente" };

export default function NuevoClientePage() {
  return (
    <>
      <Cabecera titulo="Nuevo cliente" volver={{ href: "/clientes", texto: "Clientes" }} />
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
      <ClienteForm />
    </Fresco>
  );
}
