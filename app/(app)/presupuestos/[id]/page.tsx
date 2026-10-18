import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { UNIDADES, type Unidad } from "@/lib/etiquetas";
import { formatCantidad } from "@/lib/presupuesto";
import { Cabecera } from "@/components/Cabecera";
import { Cargando } from "@/components/Cargando";
import { Fresco } from "@/components/Fresco";
import { BorrarPresupuesto, DatosForm, Foto, LineaForm, QuitarLinea, SubirFotos } from "../Editor";
import { leerPresupuesto } from "../datos";

export const metadata = { title: "Toma de datos" };

export default function PresupuestoPage({ params }: PageProps<"/presupuestos/[id]">) {
  return (
    <Suspense fallback={<Cargando />}>
      <Presupuesto params={params} />
    </Suspense>
  );
}

async function Presupuesto({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const p = await leerPresupuesto(id);
  if (!p) notFound();

  return (
    <>
      <Cabecera titulo={p.titulo} volver={p.obras ? { href: `/obras/${p.obras.id}`, texto: p.obras.titulo } : undefined} />
      <p className="-mt-3 mb-5 text-muted">
        {p.profiles?.nombre ? `Por ${p.profiles.nombre} · ` : ""}
        <Link href={`/presupuestos/${p.id}/imprimir`} className="font-semibold text-info underline underline-offset-2">
          Ver para imprimir
        </Link>
      </p>
      <Fresco>
        <div className="space-y-5">
          <Caja titulo="Datos">
            <DatosForm id={p.id} titulo={p.titulo} observaciones={p.observaciones} />
          </Caja>
          <Caja titulo="Medidas">
            <Lineas tipo="medida" presupuestoId={p.id} filas={p.medidas.map((m) => ({ id: m.id, texto: m.concepto, cantidad: m.cantidad, unidad: m.unidad }))} />
            <LineaForm presupuestoId={p.id} tipo="medida" />
          </Caja>
          <Caja titulo="Materiales">
            <Lineas tipo="material" presupuestoId={p.id} filas={p.materiales.map((m) => ({ id: m.id, texto: m.material, cantidad: m.cantidad, unidad: m.unidad }))} />
            <LineaForm presupuestoId={p.id} tipo="material" />
          </Caja>
          <Caja titulo="Fotos">
            {p.fotos.length ? (
              <ul className="mb-3 grid gap-3 sm:grid-cols-2">
                {p.fotos.map((f) => (
                  <Foto key={f.id} id={f.id} presupuestoId={p.id} url={f.url} pie={f.pie} />
                ))}
              </ul>
            ) : null}
            <SubirFotos presupuestoId={p.id} quedan={20 - p.fotos.length} />
          </Caja>
          <BorrarPresupuesto id={p.id} />
        </div>
      </Fresco>
    </>
  );
}

function Caja({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const idTitulo = `caja-${titulo.toLowerCase()}`;
  return (
    <section aria-labelledby={idTitulo} className="rounded-card border border-line bg-surface p-4">
      <h2 id={idTitulo} className="mb-3 font-display text-xl font-bold">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function Lineas({
  tipo,
  presupuestoId,
  filas,
}: {
  tipo: "medida" | "material";
  presupuestoId: string;
  filas: { id: string; texto: string; cantidad: number; unidad: Unidad }[];
}) {
  if (!filas.length) return <p className="text-muted">{tipo === "medida" ? "Aún no hay medidas." : "Aún no hay materiales."}</p>;
  return (
    <ul className="divide-y divide-line">
      {filas.map((f) => (
        <li key={f.id} className="flex min-h-12 items-center gap-2">
          <span className="min-w-0 flex-1 font-medium break-words">{f.texto}</span>
          <span className="shrink-0 font-semibold tabular-nums">
            {formatCantidad(f.cantidad)} {UNIDADES[f.unidad]}
          </span>
          <QuitarLinea tipo={tipo} id={f.id} presupuestoId={presupuestoId} texto={f.texto} />
        </li>
      ))}
    </ul>
  );
}
