import { Suspense } from "react";
import { requireJefe } from "@/lib/auth";
import { Cabecera } from "@/components/Cabecera";
import { Fresco } from "@/components/Fresco";
import { Cargando } from "@/components/Cargando";
import { EmptyState } from "@/components/EmptyState";
import { ObraForm } from "../ObraForm";
import { datosFormularioObra } from "../datos-form";

export const metadata = { title: "Nueva obra" };

export default function NuevaObraPage() {
  return (
    <>
      <Cabecera titulo="Nueva obra" volver={{ href: "/obras", texto: "Obras" }} />
      <Suspense fallback={<Cargando />}>
        <Formulario />
      </Suspense>
    </>
  );
}

async function Formulario() {
  await requireJefe();
  const { clientes, trabajadores } = await datosFormularioObra();
  if (!clientes.length) return <EmptyState titulo="Primero crea un cliente">Cada obra pertenece a un cliente.</EmptyState>;
  return (
    <Fresco>
      <ObraForm clientes={clientes} trabajadores={trabajadores} />
    </Fresco>
  );
}
