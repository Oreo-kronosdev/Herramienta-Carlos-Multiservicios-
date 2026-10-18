import { Suspense } from "react";
import { requireJefe } from "@/lib/auth";
import { Cabecera } from "@/components/Cabecera";
import { Cargando } from "@/components/Cargando";
import { Fresco } from "@/components/Fresco";
import { EventoForm } from "../EventoForm";
import { datosFormularioEvento } from "../datos-form";

export const metadata = { title: "Nueva cita" };

export default function NuevaCitaPage({ searchParams }: PageProps<"/agenda/nuevo">) {
  return (
    <>
      <Cabecera titulo="Nueva cita" volver={{ href: "/agenda", texto: "Agenda" }} />
      <Suspense fallback={<Cargando />}>
        <Formulario searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Formulario({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireJefe();
  const obra = (await searchParams).obra;
  const datos = await datosFormularioEvento();
  return (
    <Fresco>
      <EventoForm obraInicial={typeof obra === "string" ? obra : undefined} {...datos} />
    </Fresco>
  );
}
