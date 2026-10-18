import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hoyMadrid } from "@/lib/fechas";
import { Cabecera } from "@/components/Cabecera";
import { Cargando } from "@/components/Cargando";
import { EmptyState } from "@/components/EmptyState";
import { ListaEventos } from "./ListaEventos";
import { ActivarAvisos } from "@/components/ActivarAvisos";

export const metadata = { title: "Agenda" };

export default function AgendaPage({ searchParams }: PageProps<"/agenda">) {
  return (
    <Suspense fallback={<Cargando />}>
      <Agenda searchParams={searchParams} />
    </Suspense>
  );
}

async function Agenda({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const perfil = await requireUser();
  const pasadas = (await searchParams).pasadas === "1";
  const hoy = hoyMadrid();
  const supabase = await createClient();
  const consulta = supabase.from("eventos").select("id, titulo, tipo, fecha, hora, obras (titulo)");
  const { data: eventos } = pasadas
    ? await consulta.lt("fecha", hoy).order("fecha", { ascending: false }).order("hora").limit(30)
    : await consulta.gte("fecha", hoy).order("fecha").order("hora", { nullsFirst: true });
  const esJefe = perfil.rol === "jefe";

  return (
    <>
      <Cabecera
        titulo={pasadas ? "Citas pasadas" : "Agenda"}
        volver={pasadas ? { href: "/agenda", texto: "Agenda" } : undefined}
        accion={esJefe && !pasadas ? { href: "/agenda/nuevo", texto: "Nueva cita" } : undefined}
      />
      {!pasadas ? <ActivarAvisos /> : null}
      {eventos?.length ? (
        <ListaEventos eventos={eventos} />
      ) : (
        <EmptyState titulo={pasadas ? "No hay citas pasadas" : "Nada en la agenda"}>
          {pasadas ? null : esJefe ? "Apunta la primera con «Nueva cita»." : "Cuando Carlos te apunte una cita, aparecerá aquí."}
        </EmptyState>
      )}
      {!pasadas ? (
        <Link href="/agenda?pasadas=1" className="mt-5 inline-flex h-11 items-center text-[15px] font-semibold text-muted active:text-ink">
          Ver pasadas
        </Link>
      ) : null}
    </>
  );
}
