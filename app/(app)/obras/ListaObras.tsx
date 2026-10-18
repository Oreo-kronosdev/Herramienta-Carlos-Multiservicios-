import Link from "next/link";
import { TIPOS_TRABAJO, type EstadoObra, type TipoTrabajo } from "@/lib/etiquetas";
import { EstadoBadge } from "@/components/EstadoBadge";

type Obra = {
  id: string;
  titulo: string;
  tipo_trabajo: TipoTrabajo;
  estado: EstadoObra;
  clientes: { nombre: string } | null;
};

export function ListaObras({ obras }: { obras: Obra[] }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
      {obras.map((o) => (
        <li key={o.id}>
          <Link href={`/obras/${o.id}`} className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 active:bg-bg">
            <span className="min-w-0">
              <span className="block font-semibold break-words">{o.titulo}</span>
              <span className="block text-[15px] break-words text-muted">
                {[o.clientes?.nombre, TIPOS_TRABAJO[o.tipo_trabajo]].filter(Boolean).join(" · ")}
              </span>
            </span>
            <EstadoBadge estado={o.estado} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
