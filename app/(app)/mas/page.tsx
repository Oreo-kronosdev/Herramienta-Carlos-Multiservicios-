import { Suspense } from "react";
import Link from "next/link";
import { requireJefe } from "@/lib/auth";
import { Cabecera } from "@/components/Cabecera";

export const metadata = { title: "Más" };

export default function MasPage() {
  return (
    <>
      <Cabecera titulo="Más" />
      <Suspense>
        <Guardia />
      </Suspense>
      <ul className="space-y-3">
        <Opcion href="/finanzas" titulo="Finanzas" texto="Ingresos, gastos, facturas y Excel" />
        <Opcion href="/equipo" titulo="Equipo" texto="Usuarios, roles y contraseñas" />
      </ul>
    </>
  );
}

async function Guardia() {
  await requireJefe();
  return null;
}

function Opcion({ href, titulo, texto }: { href: string; titulo: string; texto: string }) {
  return (
    <li>
      <Link href={href} className="flex min-h-20 items-center justify-between rounded-card border border-line bg-surface px-4 py-3 active:bg-bg">
        <span>
          <span className="block font-display text-xl font-bold">{titulo}</span>
          <span className="block text-[15px] text-muted">{texto}</span>
        </span>
        <span aria-hidden="true" className="text-2xl text-muted">
          ›
        </span>
      </Link>
    </li>
  );
}
