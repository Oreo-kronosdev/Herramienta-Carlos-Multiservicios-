import { Suspense } from "react";
import { requireJefe } from "@/lib/auth";
import { Cabecera } from "@/components/Cabecera";
import { Cargando } from "@/components/Cargando";
import { Fresco } from "@/components/Fresco";
import { TareaForm } from "../TareaForm";
import { datosFormularioTarea } from "../datos-form";

export const metadata = { title: "Nueva tarea" };

export default function NuevaTareaPage({ searchParams }: PageProps<"/tareas/nueva">) {
  return (
    <>
      <Cabecera titulo="Nueva tarea" volver={{ href: "/tareas", texto: "Tareas" }} />
      <Suspense fallback={<Cargando />}>
        <Formulario searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Formulario({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireJefe();
  const obra = (await searchParams).obra;
  return (
    <Fresco>
      <TareaForm obraInicial={typeof obra === "string" ? obra : undefined} {...await datosFormularioTarea()} />
    </Fresco>
  );
}
