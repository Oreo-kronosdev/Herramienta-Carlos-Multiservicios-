import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireJefe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatEUR } from "@/lib/importe";
import { formatFecha, hoyMadrid } from "@/lib/fechas";
import { Cabecera } from "@/components/Cabecera";
import { Cargando } from "@/components/Cargando";
import { Fresco } from "@/components/Fresco";
import { BorrarMovimiento, MovimientoForm } from "../../Formularios";
import { obrasYClientes } from "../../datos";

export const metadata = { title: "Movimiento" };

export default function MovimientoPage({ params }: PageProps<"/finanzas/movimientos/[id]">) {
  return (
    <Suspense fallback={<Cargando />}>
      <Movimiento params={params} />
    </Suspense>
  );
}

async function Movimiento({ params }: { params: Promise<{ id: string }> }) {
  await requireJefe();
  const { id } = await params;
  const supabase = await createClient();
  const { data: m } = await supabase
    .from("movimientos")
    .select("id, tipo, concepto, importe, fecha, obra_id, factura_id")
    .eq("id", id)
    .maybeSingle();
  if (!m) notFound();
  const volver = { href: `/finanzas?mes=${m.fecha.slice(0, 7)}`, texto: "Finanzas" };

  if (m.factura_id)
    return (
      <>
        <Cabecera titulo={m.concepto} volver={volver} />
        <div className="space-y-3 rounded-card border border-line bg-surface p-4">
          <p className="font-display text-2xl font-bold text-ok">+{formatEUR(m.importe)}</p>
          <p className="text-muted first-letter:uppercase">Cobrado el {formatFecha(m.fecha)}</p>
          <p className="text-[15px] text-muted">Este ingreso sale de una factura cobrada. Para cambiarlo, edita la factura.</p>
          <Link href={`/finanzas/facturas/${m.factura_id}`} className="flex h-12 items-center justify-center rounded-[10px] bg-ink font-semibold text-white">
            Ver la factura
          </Link>
        </div>
      </>
    );

  const { obras } = await obrasYClientes();
  return (
    <>
      <Cabecera titulo={m.tipo === "ingreso" ? "Editar ingreso" : "Editar gasto"} volver={volver} />
      <Fresco>
        <MovimientoForm movimiento={m} tipo={m.tipo} hoy={hoyMadrid()} obras={obras} />
        <div className="mt-8">
          <BorrarMovimiento id={m.id} />
        </div>
      </Fresco>
    </>
  );
}
