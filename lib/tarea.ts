import type { Resultado } from "@/lib/equipo";
import { esFechaValida } from "@/lib/fechas";

export type TareaInput = {
  titulo: string;
  notas: string | null;
  fecha_limite: string | null;
  obra_id: string | null;
  asignada_a: string;
};

export function parseTarea(fd: FormData): Resultado<TareaInput> {
  const t = (k: string) => String(fd.get(k) ?? "").trim();
  const fecha = t("fecha_limite") || null;
  const errores: Record<string, string> = {};
  if (!t("titulo")) errores.titulo = "Pon qué hay que hacer";
  if (!t("asignada_a")) errores.asignada_a = "Elige a quién se la asignas";
  if (fecha && !esFechaValida(fecha)) errores.fecha_limite = "Elige una fecha válida";
  if (Object.keys(errores).length) return { ok: false, errores };
  return {
    ok: true,
    data: { titulo: t("titulo"), notas: t("notas") || null, fecha_limite: fecha, obra_id: t("obra_id") || null, asignada_a: t("asignada_a") },
  };
}

export function estadoTarea(t: { hecha: boolean; fecha_limite: string | null }, hoy: string) {
  if (t.hecha) return "hecha" as const;
  return t.fecha_limite && t.fecha_limite < hoy ? ("vencida" as const) : ("pendiente" as const);
}
