import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireJefe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Cabecera } from "@/components/Cabecera";
import { Cargando } from "@/components/Cargando";
import { Fresco } from "@/components/Fresco";
import { BorrarObra, ObraForm } from "../../ObraForm";
import { datosFormularioObra } from "../../datos-form";

export const metadata = { title: "Editar obra" };

export default function EditarObraPage({ params }: PageProps<"/obras/[id]/editar">) {
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
  const [{ data: o }, datos] = await Promise.all([
    supabase
      .from("obras")
      .select("id, cliente_id, titulo, direccion, tipo_trabajo, estado, presupuesto, obra_trabajadores (user_id)")
      .eq("id", id)
      .maybeSingle(),
    datosFormularioObra(),
  ]);
  if (!o) notFound();
  const { obra_trabajadores, ...obra } = o;
  return (
    <>
      <Cabecera titulo="Editar obra" volver={{ href: `/obras/${o.id}`, texto: o.titulo }} />
      <Fresco>
        <ObraForm obra={{ ...obra, asignados: obra_trabajadores.map((t) => t.user_id) }} {...datos} />
        <div className="mt-8">
          <BorrarObra id={o.id} />
        </div>
      </Fresco>
    </>
  );
}
