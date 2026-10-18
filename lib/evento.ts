import type { Resultado } from "@/lib/equipo";
import { AVISAR_DIAS, TIPOS_EVENTO, type AvisarDias, type TipoEvento } from "@/lib/etiquetas";
import { esFechaValida } from "@/lib/fechas";

export type EventoInput = {
  titulo: string;
  tipo: TipoEvento;
  fecha: string;
  hora: string | null;
  obra_id: string | null;
  notas: string | null;
  avisar_dias: AvisarDias;
  personas: string[];
};

export function parseEvento(fd: FormData): Resultado<EventoInput> {
  const t = (k: string) => String(fd.get(k) ?? "").trim();
  const tipo = t("tipo");
  const fecha = t("fecha");
  const hora = t("hora") || null;
  const avisar = t("avisar_dias");
  const personas = fd.getAll("personas").map(String).filter(Boolean);
  const errores: Record<string, string> = {};

  if (!t("titulo")) errores.titulo = "Pon un título (ej.: Visita con el presidente)";
  if (!Object.hasOwn(TIPOS_EVENTO, tipo)) errores.tipo = "Elige el tipo";
  if (!esFechaValida(fecha)) errores.fecha = "Elige una fecha válida";
  if (hora && !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) errores.hora = "Hora no válida (ej.: 09:30)";
  if (!Object.hasOwn(AVISAR_DIAS, avisar)) errores.avisar_dias = "Elige cuándo avisar";
  if (!personas.length) errores.personas = "Asigna al menos una persona";

  if (Object.keys(errores).length) return { ok: false, errores };
  return {
    ok: true,
    data: {
      titulo: t("titulo"),
      tipo: tipo as TipoEvento,
      fecha,
      hora,
      obra_id: t("obra_id") || null,
      notas: t("notas") || null,
      avisar_dias: Number(avisar) as AvisarDias,
      personas,
    },
  };
}
