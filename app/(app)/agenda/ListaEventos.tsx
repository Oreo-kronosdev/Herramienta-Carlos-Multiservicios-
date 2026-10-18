import Link from "next/link";
import { formatFecha, formatHora } from "@/lib/fechas";
import type { TipoEvento } from "@/lib/etiquetas";

export type EventoLista = {
  id: string;
  titulo: string;
  tipo: TipoEvento;
  fecha: string;
  hora: string | null;
  obras: { titulo: string } | null;
};

export function ListaEventos({ eventos }: { eventos: EventoLista[] }) {
  const dias = Map.groupBy(eventos, (e) => e.fecha);
  return (
    <div className="space-y-5">
      {[...dias].map(([fecha, delDia]) => (
        <section key={fecha}>
          <h3 className="mb-2 text-[15px] font-semibold text-muted first-letter:uppercase">{formatFecha(fecha)}</h3>
          <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
            {delDia.map((e) => (
              <li key={e.id}>
                <Link href={`/agenda/${e.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 active:bg-bg">
                  <span className="w-14 shrink-0 font-display text-lg font-bold tabular-nums">
                    {formatHora(e.hora) ?? <span className="text-sm font-semibold text-muted">Todo el día</span>}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold break-words">{e.titulo}</span>
                    {e.obras ? <span className="block text-[15px] break-words text-muted">{e.obras.titulo}</span> : null}
                  </span>
                  {e.tipo === "fecha_limite" ? (
                    <span className="shrink-0 rounded-full bg-warn-soft px-2.5 py-1 text-[13px] font-semibold text-warn">
                      Fecha límite
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
