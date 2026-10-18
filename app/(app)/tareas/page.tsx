import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hoyMadrid } from "@/lib/fechas";
import { Cabecera } from "@/components/Cabecera";
import { Cargando } from "@/components/Cargando";
import { EmptyState } from "@/components/EmptyState";
import { ListaTareas } from "./ListaTareas";

export const metadata = { title: "Tareas" };
const SELECT_TAREA = "id, titulo, fecha_limite, hecha, obras (titulo), profiles (nombre)";

export default function TareasPage({ searchParams }: PageProps<"/tareas">) {
  return (
    <Suspense fallback={<Cargando />}>
      <Tareas searchParams={searchParams} />
    </Suspense>
  );
}

async function Tareas({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const perfil = await requireUser();
  const hechas = (await searchParams).hechas === "1";
  const supabase = await createClient();
  const consulta = supabase.from("tareas").select(SELECT_TAREA).eq("hecha", hechas);
  const { data: tareas } = hechas
    ? await consulta.order("hecha_at", { ascending: false }).limit(50)
    : await consulta.order("fecha_limite", { nullsFirst: false }).order("created_at");
  const esJefe = perfil.rol === "jefe";

  return (
    <>
      <Cabecera
        titulo={hechas ? "Tareas hechas" : "Tareas"}
        volver={hechas ? { href: "/tareas", texto: "Pendientes" } : undefined}
        accion={esJefe && !hechas ? { href: "/tareas/nueva", texto: "Nueva tarea" } : undefined}
      />
      {tareas?.length ? (
        <ListaTareas tareas={tareas} hoy={hoyMadrid()} esJefe={esJefe} />
      ) : (
        <EmptyState titulo={hechas ? "Aún no hay tareas hechas" : "Nada pendiente"}>
          {hechas ? null : esJefe ? "Asigna la primera con «Nueva tarea»." : "Cuando Carlos te asigne una tarea, aparecerá aquí."}
        </EmptyState>
      )}
      {!hechas ? (
        <Link href="/tareas?hechas=1" className="mt-5 inline-flex h-11 items-center text-[15px] font-semibold text-muted active:text-ink">
          Ver hechas
        </Link>
      ) : null}
    </>
  );
}
