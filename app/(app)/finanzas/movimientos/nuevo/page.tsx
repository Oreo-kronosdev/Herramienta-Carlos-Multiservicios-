import { Suspense } from "react";
import { requireJefe } from "@/lib/auth";
import { hoyMadrid } from "@/lib/fechas";
import { Cabecera } from "@/components/Cabecera";
import { Cargando } from "@/components/Cargando";
import { Fresco } from "@/components/Fresco";
import { MovimientoForm } from "../../Formularios";
import { obrasYClientes } from "../../datos";

export const metadata = { title: "Nuevo movimiento" };

export default function NuevoMovimientoPage({ searchParams }: PageProps<"/finanzas/movimientos/nuevo">) {
  return (
    <Suspense fallback={<Cargando />}>
      <Formulario searchParams={searchParams} />
    </Suspense>
  );
}

async function Formulario({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireJefe();
  const tipo = (await searchParams).tipo === "ingreso" ? "ingreso" : "gasto";
  const { obras } = await obrasYClientes();
  return (
    <>
      <Cabecera titulo={tipo === "ingreso" ? "Nuevo ingreso" : "Nuevo gasto"} volver={{ href: "/finanzas", texto: "Finanzas" }} />
      <Fresco>
        <MovimientoForm tipo={tipo} hoy={hoyMadrid()} obras={obras} />
      </Fresco>
    </>
  );
}
