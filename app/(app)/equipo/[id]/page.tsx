import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireJefe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Cabecera } from "@/components/Cabecera";
import { Fresco } from "@/components/Fresco";
import { Cargando } from "@/components/Cargando";
import { EditarUsuarioForm, PasswordForm } from "./Formularios";

export const metadata = { title: "Usuario" };

export default function UsuarioPage({ params }: PageProps<"/equipo/[id]">) {
  return (
    <Suspense fallback={<Cargando />}>
      <Usuario params={params} />
    </Suspense>
  );
}

async function Usuario({ params }: { params: Promise<{ id: string }> }) {
  const jefe = await requireJefe();
  const { id } = await params;
  const supabase = await createClient();
  const { data: u } = await supabase
    .from("profiles")
    .select("id, username, nombre, rol, activo")
    .eq("id", id)
    .maybeSingle();
  if (!u) notFound();

  return (
    <>
      <Cabecera titulo={u.nombre} volver={{ href: "/equipo", texto: "Equipo" }} />
      <p className="-mt-3 mb-5 text-muted">@{u.username}{u.id === jefe.id ? " · eres tú" : ""}</p>
      <Fresco>
        <div className="space-y-6">
          <EditarUsuarioForm usuario={u} />
          <PasswordForm id={u.id} />
        </div>
      </Fresco>
    </>
  );
}
