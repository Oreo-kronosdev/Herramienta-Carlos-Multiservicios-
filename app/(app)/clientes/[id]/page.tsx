import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TIPOS_TRABAJO } from "@/lib/etiquetas";
import { Cabecera } from "@/components/Cabecera";
import { Cargando } from "@/components/Cargando";
import { EstadoBadge } from "@/components/EstadoBadge";
import { EmptyState } from "@/components/EmptyState";

export const metadata = { title: "Cliente" };

export default function ClientePage({ params }: PageProps<"/clientes/[id]">) {
  return (
    <Suspense fallback={<Cargando />}>
      <Cliente params={params} />
    </Suspense>
  );
}

async function Cliente({ params }: { params: Promise<{ id: string }> }) {
  const perfil = await requireUser();
  const { id } = await params;
  const supabase = await createClient();
  const { data: c } = await supabase
    .from("clientes")
    .select("id, nombre, direccion, administrador, telefono, obras (id, titulo, tipo_trabajo, estado)")
    .eq("id", id)
    .maybeSingle();
  if (!c) notFound();
  const esJefe = perfil.rol === "jefe";

  return (
    <>
      <Cabecera
        titulo={c.nombre}
        volver={{ href: "/clientes", texto: "Clientes" }}
        accion={esJefe ? { href: `/clientes/${c.id}/editar`, texto: "Editar" } : undefined}
      />
      <dl className="space-y-3 rounded-card border border-line bg-surface p-4">
        <Dato titulo="Dirección">
          {c.direccion ? (
            <a
              className="text-info underline underline-offset-2"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.direccion)}`}
              target="_blank"
              rel="noreferrer"
            >
              {c.direccion}
            </a>
          ) : null}
        </Dato>
        <Dato titulo="Comunidad / administrador">{c.administrador}</Dato>
        <Dato titulo="Teléfono">
          {c.telefono ? (
            <a className="text-info underline underline-offset-2" href={`tel:${c.telefono.replace(/[^\d+]/g, "")}`}>
              {c.telefono}
            </a>
          ) : null}
        </Dato>
      </dl>

      <h2 className="mt-7 mb-3 font-display text-xl font-bold">Obras</h2>
      {!c.obras.length ? (
        <EmptyState titulo="Sin obras" />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
          {c.obras.map((o) => (
            <li key={o.id}>
              <Link href={`/obras/${o.id}`} className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 active:bg-bg">
                <span className="min-w-0">
                  <span className="block font-semibold break-words">{o.titulo}</span>
                  <span className="block text-[15px] text-muted">{TIPOS_TRABAJO[o.tipo_trabajo]}</span>
                </span>
                <EstadoBadge estado={o.estado} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Dato({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm font-semibold text-muted">{titulo}</dt>
      <dd className="break-words">{children || <span className="text-muted">—</span>}</dd>
    </div>
  );
}
