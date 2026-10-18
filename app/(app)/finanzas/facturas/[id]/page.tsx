import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireJefe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatFecha, hoyMadrid } from "@/lib/fechas";
import { Cabecera } from "@/components/Cabecera";
import { Cargando } from "@/components/Cargando";
import { Fresco } from "@/components/Fresco";
import { BorrarFactura, BotonFactura, CobrarConFecha, FacturaForm } from "../../Formularios";
import { obrasYClientes } from "../../datos";

export const metadata = { title: "Factura" };

export default function FacturaPage({ params }: PageProps<"/finanzas/facturas/[id]">) {
  return (
    <Suspense fallback={<Cargando />}>
      <Factura params={params} />
    </Suspense>
  );
}

async function Factura({ params }: { params: Promise<{ id: string }> }) {
  await requireJefe();
  const { id } = await params;
  const supabase = await createClient();
  const { data: f } = await supabase
    .from("facturas")
    .select("id, numero, cliente_id, obra_id, concepto, importe, fecha_emision, fecha_vencimiento, pagada, pagada_en")
    .eq("id", id)
    .maybeSingle();
  if (!f) notFound();
  const hoy = hoyMadrid();
  const { pagada, pagada_en, ...factura } = f;

  return (
    <>
      <Cabecera titulo={`Factura ${f.numero}`} volver={{ href: "/finanzas", texto: "Finanzas" }} />
      <section className="mb-5 rounded-card border border-line bg-surface p-4">
        {pagada ? (
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-ok first-letter:uppercase">Cobrada el {pagada_en ? formatFecha(pagada_en, hoy) : "—"}</p>
            <BotonFactura id={f.id} pagada={false} texto="Marcar como no pagada" estilo="neutro" />
          </div>
        ) : (
          <>
            <p className="mb-3 font-semibold text-warn">Pendiente de cobro</p>
            <CobrarConFecha id={f.id} hoy={hoy} />
          </>
        )}
      </section>
      <Fresco>
        <FacturaForm factura={factura} hoy={hoy} {...await obrasYClientes()} />
        <div className="mt-8">
          <BorrarFactura id={f.id} />
        </div>
      </Fresco>
    </>
  );
}
