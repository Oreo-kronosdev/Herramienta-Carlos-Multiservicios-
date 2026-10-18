import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { UNIDADES } from "@/lib/etiquetas";
import { formatCantidad } from "@/lib/presupuesto";
import { formatFecha, hoyMadrid } from "@/lib/fechas";
import { Cargando } from "@/components/Cargando";
import { BotonImprimir } from "./BotonImprimir";
import { leerPresupuesto } from "../../datos";

export const metadata = { title: "Imprimir toma de datos" };

export default function ImprimirPage({ params }: PageProps<"/presupuestos/[id]/imprimir">) {
  return (
    <Suspense fallback={<Cargando />}>
      <Documento params={params} />
    </Suspense>
  );
}

async function Documento({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const p = await leerPresupuesto(id);
  if (!p) notFound();
  const hoy = hoyMadrid();

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
        <Link href={`/presupuestos/${p.id}`} className="inline-flex h-11 items-center font-semibold text-muted">
          ← Volver
        </Link>
        <BotonImprimir />
      </div>
      <article className="rounded-card border border-line bg-white p-5 text-[15px] text-black print:rounded-none print:border-0 print:p-0">
        <header className="flex items-start justify-between gap-4 border-b-2 border-black pb-3">
          <div>
            <p className="font-display text-2xl font-bold">Carlos Multiservicios</p>
            <p className="text-sm">Reparaciones · Tejados · Canalones · Chimeneas · Pintura · Trabajos en altura</p>
          </div>
          <p className="text-right text-sm first-letter:uppercase">{formatFecha(p.created_at.slice(0, 10), hoy)}</p>
        </header>
        <h1 className="mt-4 font-display text-2xl font-bold">{p.titulo}</h1>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <dt className="font-semibold">Obra</dt>
          <dd>{p.obras?.titulo}</dd>
          <dt className="font-semibold">Dirección</dt>
          <dd>{p.obras?.direccion}</dd>
          <dt className="font-semibold">Cliente</dt>
          <dd>{p.obras?.clientes?.nombre}</dd>
          {p.profiles?.nombre ? (
            <>
              <dt className="font-semibold">Tomado por</dt>
              <dd>{p.profiles.nombre}</dd>
            </>
          ) : null}
        </dl>

        <Tabla titulo="Medidas" cabecera="Concepto" filas={p.medidas.map((m) => [m.concepto, formatCantidad(m.cantidad), UNIDADES[m.unidad]])} />
        <Tabla titulo="Materiales" cabecera="Material" filas={p.materiales.map((m) => [m.material, formatCantidad(m.cantidad), UNIDADES[m.unidad]])} />

        {p.observaciones ? (
          <section className="mt-5 break-inside-avoid">
            <h2 className="mb-1 text-lg font-bold">Observaciones</h2>
            <p className="whitespace-pre-line">{p.observaciones}</p>
          </section>
        ) : null}

        {p.fotos.length ? (
          <section className="mt-5">
            <h2 className="mb-2 text-lg font-bold">Fotos</h2>
            <div className="grid grid-cols-2 gap-3">
              {p.fotos.map((f) => (
                <figure key={f.id} className="break-inside-avoid">
                  {f.url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- URL firmada temporal de Storage
                    <img src={f.url} alt={f.pie ?? "Foto de la obra"} className="aspect-[4/3] w-full border border-black/20 object-cover" />
                  ) : null}
                  {f.pie ? <figcaption className="mt-1 text-sm">{f.pie}</figcaption> : null}
                </figure>
              ))}
            </div>
          </section>
        ) : null}
      </article>
    </>
  );
}

function Tabla({ titulo, cabecera, filas }: { titulo: string; cabecera: string; filas: string[][] }) {
  if (!filas.length) return null;
  return (
    <section className="mt-5 break-inside-avoid">
      <h2 className="mb-1 text-lg font-bold">{titulo}</h2>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-black text-left">
            <th className="py-1 pr-2">{cabecera}</th>
            <th className="py-1 pr-2 text-right">Cantidad</th>
            <th className="py-1">Unidad</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={i} className="border-b border-black/15">
              <td className="py-1 pr-2">{f[0]}</td>
              <td className="py-1 pr-2 text-right tabular-nums">{f[1]}</td>
              <td className="py-1">{f[2]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
