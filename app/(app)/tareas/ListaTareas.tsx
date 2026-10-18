import Link from "next/link";
import { estadoTarea } from "@/lib/tarea";
import { formatFecha } from "@/lib/fechas";
import { MarcarTarea } from "./MarcarTarea";

export type TareaLista = {
  id: string;
  titulo: string;
  notas: string | null;
  fecha_limite: string | null;
  hecha: boolean;
  obras: { titulo: string } | null;
  profiles: { nombre: string } | null;
};

export function ListaTareas({ tareas, hoy, esJefe }: { tareas: TareaLista[]; hoy: string; esJefe: boolean }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
      {tareas.map((t) => {
        const estado = estadoTarea(t, hoy);
        const detalle = [esJefe ? t.profiles?.nombre : null, t.obras?.titulo].filter(Boolean).join(" · ");
        const contenido = (
          <>
            <span className={`block font-semibold break-words ${t.hecha ? "text-muted line-through" : ""}`}>{t.titulo}</span>
            {detalle ? <span className="block text-[15px] break-words text-muted">{detalle}</span> : null}
            {t.notas ? <span className="mt-0.5 block text-[15px] break-words whitespace-pre-line">{t.notas}</span> : null}
            {t.fecha_limite ? (
              <span className={`mt-0.5 flex flex-wrap items-center gap-1.5 text-[15px] ${estado === "vencida" ? "font-semibold text-danger" : "text-muted"}`}>
                {estado === "vencida" ? <span className="rounded-full bg-danger-soft px-2 py-0.5 text-[13px]">Vencida</span> : null}
                <span className="first-letter:uppercase">Hasta el {formatFecha(t.fecha_limite, hoy)}</span>
              </span>
            ) : null}
          </>
        );
        return (
          <li key={t.id} className="flex items-center gap-1 py-2 pr-4 pl-1">
            <MarcarTarea id={t.id} titulo={t.titulo} hecha={t.hecha} />
            {esJefe ? (
              <Link href={`/tareas/${t.id}/editar`} className="min-w-0 flex-1 py-1 active:opacity-70">
                {contenido}
              </Link>
            ) : (
              <div className="min-w-0 flex-1 py-1">{contenido}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
