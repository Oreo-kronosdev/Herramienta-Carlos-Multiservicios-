import { Suspense } from "react";
import Link from "next/link";
import { requireUser, type Profile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ESTADOS_OBRA, type EstadoObra } from "@/lib/etiquetas";
import { Cargando } from "@/components/Cargando";
import { EmptyState } from "@/components/EmptyState";
import { ListaObras } from "./obras/ListaObras";
import { ListaEventos } from "./agenda/ListaEventos";
import { hoyMadrid, sumarDias } from "@/lib/fechas";
import { ListaTareas } from "./tareas/ListaTareas";

export default function InicioPage() {
  return (
    <Suspense fallback={<Cargando />}>
      <Inicio />
    </Suspense>
  );
}

async function Inicio() {
  const perfil = await requireUser();
  return (
    <section>
      <h1 className="font-display text-3xl font-bold">Inicio</h1>
      <p className="mt-1 mb-5 text-muted">Hola, {perfil.nombre}.</p>
      <MisTareas perfil={perfil} />
      <div className="mt-7">
        <Proximos />
      </div>
      <div className="mt-7">{perfil.rol === "jefe" ? <ResumenJefe /> : <MisObras perfil={perfil} />}</div>
    </section>
  );
}

async function ResumenJefe() {
  const supabase = await createClient();
  const { data } = await supabase.from("obras").select("estado");
  const cuenta = (e: EstadoObra) => (data ?? []).filter((o) => o.estado === e).length;
  return (
    <>
      <h2 className="mb-3 font-display text-xl font-bold">Obras por estado</h2>
      <div className="grid grid-cols-2 gap-2.5">
        {(Object.keys(ESTADOS_OBRA) as EstadoObra[]).map((e) => (
          <Link
            key={e}
            href="/obras"
            className="flex min-h-20 flex-col justify-between rounded-card border border-line bg-surface p-3.5 active:bg-bg"
          >
            <span className="text-[15px] font-semibold text-muted">{ESTADOS_OBRA[e]}</span>
            <span className="font-display text-3xl font-bold tabular-nums">{cuenta(e)}</span>
          </Link>
        ))}
      </div>
    </>
  );
}

async function MisObras({ perfil }: { perfil: Profile }) {
  const supabase = await createClient();
  const { data: obras } = await supabase
    .from("obras")
    .select("id, titulo, tipo_trabajo, estado, clientes (nombre)")
    .not("estado", "in", "(terminada,cancelada)")
    .order("created_at", { ascending: false });
  return (
    <>
      <h2 className="mb-3 font-display text-xl font-bold">Mis obras abiertas</h2>
      {obras?.length ? (
        <ListaObras obras={obras} />
      ) : (
        <EmptyState titulo="Nada pendiente">
          {perfil.nombre}, no tienes obras abiertas ahora mismo.
        </EmptyState>
      )}
    </>
  );
}

async function Proximos() {
  const hoy = hoyMadrid();
  const supabase = await createClient();
  const { data: eventos } = await supabase
    .from("eventos")
    .select("id, titulo, tipo, fecha, hora, obras (titulo)")
    .gte("fecha", hoy)
    .lte("fecha", sumarDias(hoy, 6))
    .order("fecha")
    .order("hora", { nullsFirst: true });
  return (
    <>
      <h2 className="mb-3 font-display text-xl font-bold">Próximos 7 días</h2>
      {eventos?.length ? <ListaEventos eventos={eventos} /> : <EmptyState titulo="Nada esta semana" />}
    </>
  );
}

async function MisTareas({ perfil }: { perfil: Profile }) {
  const supabase = await createClient();
  const { data: tareas } = await supabase
    .from("tareas")
    .select("id, titulo, fecha_limite, hecha, obras (titulo), profiles (nombre)")
    .eq("asignada_a", perfil.id)
    .eq("hecha", false)
    .order("fecha_limite", { nullsFirst: false })
    .limit(5);
  if (!tareas?.length) return null;
  return (
    <>
      <h2 className="mb-3 font-display text-xl font-bold">Mis tareas</h2>
      <ListaTareas tareas={tareas} hoy={hoyMadrid()} esJefe={perfil.rol === "jefe"} />
    </>
  );
}
