import { ESTADOS_OBRA, type EstadoObra } from "@/lib/etiquetas";

const COLORES: Record<EstadoObra, string> = {
  pendiente: "bg-warn-soft text-warn",
  presupuestada: "bg-info-soft text-info",
  en_curso: "bg-accent-soft text-accent",
  terminada: "bg-ok-soft text-ok",
  cancelada: "bg-bg text-muted line-through",
};

export function EstadoBadge({ estado }: { estado: EstadoObra }) {
  return (
    <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[13px] font-semibold ${COLORES[estado]}`}>
      {ESTADOS_OBRA[estado]}
    </span>
  );
}
