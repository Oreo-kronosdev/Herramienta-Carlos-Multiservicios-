import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireJefe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Cabecera } from "@/components/Cabecera";
import { Fresco } from "@/components/Fresco";
import { Cargando } from "@/components/Cargando";
import { BorrarCliente, ClienteForm } from "../../ClienteForm";

export const metadata = { title: "Editar cliente" };

export default function EditarClientePage({ params }: PageProps<"/clientes/[id]/editar">) {
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
  const { data: c } = await supabase
    .from("clientes")
    .select("id, nombre, direccion, administrador, telefono")
    .eq("id", id)
    .maybeSingle();
  if (!c) notFound();
  return (
    <>
      <Cabecera titulo="Editar cliente" volver={{ href: `/clientes/${c.id}`, texto: c.nombre }} />
      <Fresco>
        <ClienteForm cliente={c} />
        <div className="mt-8">
          <BorrarCliente id={c.id} />
        </div>
      </Fresco>
    </>
  );
}
