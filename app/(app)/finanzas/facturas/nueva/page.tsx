import { Suspense } from "react";
import { requireJefe } from "@/lib/auth";
import { hoyMadrid } from "@/lib/fechas";
import { Cabecera } from "@/components/Cabecera";
import { Cargando } from "@/components/Cargando";
import { Fresco } from "@/components/Fresco";
import { FacturaForm } from "../../Formularios";
import { obrasYClientes } from "../../datos";

export const metadata = { title: "Nueva factura" };

export default function NuevaFacturaPage() {
  return (
    <>
      <Cabecera titulo="Nueva factura" volver={{ href: "/finanzas", texto: "Finanzas" }} />
      <Suspense fallback={<Cargando />}>
        <Formulario />
      </Suspense>
    </>
  );
}

async function Formulario() {
  await requireJefe();
  return (
    <Fresco>
      <FacturaForm hoy={hoyMadrid()} {...await obrasYClientes()} />
    </Fresco>
  );
}
