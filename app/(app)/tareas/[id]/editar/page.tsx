import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireJefe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Cabecera } from "@/components/Cabecera";
import { Cargando } from "@/components/Cargando";
import { Fresco } from "@/components/Fresco";
import { BorrarTarea, TareaForm } from "../../TareaForm";
import { datosFormularioTarea } from "../../datos-form";

export const metadata = { title: "Editar tarea" };

export default function EditarTareaPage({ params }: PageProps<"/tareas/[id]/editar">) {
  return (
    <Suspense fallback={<Cargando />}>
      <Editar params={params} />
    </Suspense>
  );
}

async function Editar({ params }: { params: Promise<{ id: string }> }) {
  await requireJefe();
  const { id } = await params;
  const supabase = await createClient();
  const { data: t } = await supabase
    .from("tareas")
    .select("id, titulo, notas, fecha_limite, obra_id, asignada_a")
    .eq("id", id)
    .maybeSingle();
  if (!t) notFound();
  return (
    <>
      <Cabecera titulo="Editar tarea" volver={{ href: "/tareas", texto: "Tareas" }} />
      <Fresco>
        <TareaForm tarea={t} {...await datosFormularioTarea(t.obra_id, t.asignada_a)} />
        <div className="mt-8">
          <BorrarTarea id={t.id} />
        </div>
      </Fresco>
    </>
  );
}
