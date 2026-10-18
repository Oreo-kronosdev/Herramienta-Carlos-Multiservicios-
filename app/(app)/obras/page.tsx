import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Cabecera } from "@/components/Cabecera";
import { Cargando } from "@/components/Cargando";
import { EmptyState } from "@/components/EmptyState";
import { ListaObras } from "./ListaObras";

export const metadata = { title: "Obras" };

export default function ObrasPage() {
  return (
    <Suspense fallback={<Cargando />}>
      <Obras />
    </Suspense>
  );
}

async function Obras() {
  const perfil = await requireUser();
  const supabase = await createClient();
  const { data: obras } = await supabase
    .from("obras")
    .select("id, titulo, tipo_trabajo, estado, clientes (nombre)")
    .order("created_at", { ascending: false });
  const esJefe = perfil.rol === "jefe";

  return (
    <>
      <Cabecera titulo={esJefe ? "Obras" : "Mis obras"} accion={esJefe ? { href: "/obras/nuevo", texto: "Nueva obra" } : undefined} />
      {obras?.length ? (
        <ListaObras obras={obras} />
      ) : (
        <EmptyState titulo="Aún no hay obras">
          {esJefe ? "Crea la primera con «Nueva obra»." : "Cuando Carlos te asigne una obra, aparecerá aquí."}
        </EmptyState>
      )}
    </>
  );
}
