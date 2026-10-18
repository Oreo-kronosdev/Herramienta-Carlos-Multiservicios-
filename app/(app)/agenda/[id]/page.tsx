import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AVISAR_DIAS, TIPOS_EVENTO, type AvisarDias } from "@/lib/etiquetas";
import { formatFecha, formatHora } from "@/lib/fechas";
import { Cabecera } from "@/components/Cabecera";
import { Cargando } from "@/components/Cargando";

export const metadata = { title: "Cita" };

export default function CitaPage({ params }: PageProps<"/agenda/[id]">) {
  return (
    <Suspense fallback={<Cargando />}>
      <Cita params={params} />
    </Suspense>
  );
}

async function Cita({ params }: { params: Promise<{ id: string }> }) {
  const perfil = await requireUser();
  const { id } = await params;
  const supabase = await createClient();
  const { data: e } = await supabase
    .from("eventos")
    .select("id, titulo, tipo, fecha, hora, notas, avisar_dias, obras (id, titulo, direccion), evento_personas (profiles (nombre))")
    .eq("id", id)
    .maybeSingle();
  if (!e) notFound();
  const esJefe = perfil.rol === "jefe";

  return (
    <>
      <Cabecera
        titulo={e.titulo}
        volver={{ href: "/agenda", texto: "Agenda" }}
        accion={esJefe ? { href: `/agenda/${e.id}/editar`, texto: "Editar" } : undefined}
      />
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-card border border-line bg-surface p-4">
        <Dato titulo="Fecha" ancho>
          <span className="first-letter:uppercase">{formatFecha(e.fecha)}</span>
        </Dato>
        <Dato titulo="Hora">{formatHora(e.hora) ?? "Todo el día"}</Dato>
        <Dato titulo="Tipo">{TIPOS_EVENTO[e.tipo]}</Dato>
        <Dato titulo="Obra" ancho>
          {e.obras ? (
            <Link href={`/obras/${e.obras.id}`} className="text-info underline underline-offset-2">
              {e.obras.titulo}
            </Link>
          ) : null}
        </Dato>
        {e.obras?.direccion ? (
          <Dato titulo="Dirección" ancho>
            <a
              className="text-info underline underline-offset-2"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.obras.direccion)}`}
              target="_blank"
              rel="noreferrer"
            >
              {e.obras.direccion}
            </a>
          </Dato>
        ) : null}
        {esJefe ? (
          <Dato titulo="Personas" ancho>
            {e.evento_personas.map((p) => p.profiles?.nombre).filter(Boolean).join(", ") || null}
          </Dato>
        ) : null}
        <Dato titulo="Aviso" ancho>{AVISAR_DIAS[e.avisar_dias as AvisarDias]}</Dato>
        {e.notas ? <Dato titulo="Notas" ancho><span className="whitespace-pre-line">{e.notas}</span></Dato> : null}
      </dl>
    </>
  );
}

function Dato({ titulo, ancho, children }: { titulo: string; ancho?: boolean; children: React.ReactNode }) {
  return (
    <div className={ancho ? "col-span-2" : undefined}>
      <dt className="text-sm font-semibold text-muted">{titulo}</dt>
      <dd className="break-words">{children || <span className="text-muted">—</span>}</dd>
    </div>
  );
}
