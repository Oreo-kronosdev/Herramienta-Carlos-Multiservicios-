import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TIPOS_TRABAJO } from "@/lib/etiquetas";
import { formatEUR } from "@/lib/importe";
import { Cabecera } from "@/components/Cabecera";
import { Cargando } from "@/components/Cargando";
import { Fresco } from "@/components/Fresco";
import { EstadoSelector } from "../EstadoSelector";

export const metadata = { title: "Obra" };

export default function ObraPage({ params }: PageProps<"/obras/[id]">) {
  return (
    <Suspense fallback={<Cargando />}>
      <Obra params={params} />
    </Suspense>
  );
}

async function Obra({ params }: { params: Promise<{ id: string }> }) {
  const perfil = await requireUser();
  const { id } = await params;
  const supabase = await createClient();
  const { data: o } = await supabase
    .from("obras")
    .select("id, titulo, direccion, tipo_trabajo, estado, presupuesto, clientes (id, nombre, administrador, telefono), obra_trabajadores (profiles (nombre))")
    .eq("id", id)
    .maybeSingle();
  if (!o) notFound();
  const esJefe = perfil.rol === "jefe";
  const c = o.clientes;

  return (
    <>
      <Cabecera
        titulo={o.titulo}
        volver={{ href: "/obras", texto: esJefe ? "Obras" : "Mis obras" }}
        accion={esJefe ? { href: `/obras/${o.id}/editar`, texto: "Editar" } : undefined}
      />
      <div className="space-y-5">
        <section className="rounded-card border border-line bg-surface p-4">
          <Fresco>
            <EstadoSelector id={o.id} estado={o.estado} />
          </Fresco>
        </section>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-card border border-line bg-surface p-4">
          <Dato titulo="Dirección" ancho>
            <a
              className="text-info underline underline-offset-2"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.direccion)}`}
              target="_blank"
              rel="noreferrer"
            >
              {o.direccion}
            </a>
          </Dato>
          <Dato titulo="Tipo de trabajo">{TIPOS_TRABAJO[o.tipo_trabajo]}</Dato>
          <Dato titulo="Presupuesto">{o.presupuesto != null ? formatEUR(o.presupuesto) : null}</Dato>
          <Dato titulo="Cliente" ancho>
            {c ? (
              <Link href={`/clientes/${c.id}`} className="text-info underline underline-offset-2">
                {c.nombre}
              </Link>
            ) : null}
          </Dato>
          {c?.administrador ? <Dato titulo="Comunidad / administrador" ancho>{c.administrador}</Dato> : null}
          {c?.telefono ? (
            <Dato titulo="Teléfono del cliente" ancho>
              <a className="text-info underline underline-offset-2" href={`tel:${c.telefono.replace(/[^\d+]/g, "")}`}>
                {c.telefono}
              </a>
            </Dato>
          ) : null}
          {esJefe ? (
            <Dato titulo="Trabajadores" ancho>
              {o.obra_trabajadores.map((t) => t.profiles?.nombre).filter(Boolean).join(", ") || null}
            </Dato>
          ) : null}
        </dl>
      </div>
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
