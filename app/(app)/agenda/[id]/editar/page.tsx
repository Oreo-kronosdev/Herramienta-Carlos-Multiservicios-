import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireJefe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { AvisarDias } from "@/lib/etiquetas";
import { Cabecera } from "@/components/Cabecera";
import { Cargando } from "@/components/Cargando";
import { Fresco } from "@/components/Fresco";
import { BorrarEvento, EventoForm } from "../../EventoForm";
import { datosFormularioEvento } from "../../datos-form";

export const metadata = { title: "Editar cita" };

export default function EditarCitaPage({ params }: PageProps<"/agenda/[id]/editar">) {
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
  const { data: e } = await supabase
    .from("eventos")
    .select("id, titulo, tipo, fecha, hora, obra_id, notas, avisar_dias, evento_personas (user_id)")
    .eq("id", id)
    .maybeSingle();
  if (!e) notFound();
  const datos = await datosFormularioEvento(e.obra_id);
  const { evento_personas, ...evento } = e;
  return (
    <>
      <Cabecera titulo="Editar cita" volver={{ href: `/agenda/${e.id}`, texto: e.titulo }} />
      <Fresco>
        <EventoForm
          evento={{ ...evento, avisar_dias: evento.avisar_dias as AvisarDias, personas: evento_personas.map((p) => p.user_id) }}
          {...datos}
        />
        <div className="mt-8">
          <BorrarEvento id={e.id} />
        </div>
      </Fresco>
    </>
  );
}
