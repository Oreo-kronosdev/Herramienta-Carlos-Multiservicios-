import type { Resultado } from "@/lib/equipo";
import { ESTADOS_OBRA, TIPOS_TRABAJO, type EstadoObra, type TipoTrabajo } from "@/lib/etiquetas";
import { parseImporte } from "@/lib/importe";

export type ObraInput = {
  cliente_id: string;
  titulo: string;
  direccion: string;
  tipo_trabajo: TipoTrabajo;
  estado: EstadoObra;
  presupuesto: number | null;
  trabajadores: string[];
};

export function esEstado(v: unknown): v is EstadoObra {
  return typeof v === "string" && Object.hasOwn(ESTADOS_OBRA, v);
}

export function parseObra(fd: FormData): Resultado<ObraInput> {
  const t = (k: string) => String(fd.get(k) ?? "").trim();
  const tipo = t("tipo_trabajo");
  const estado = t("estado");
  const presupuesto = parseImporte(t("presupuesto"));
  const errores: Record<string, string> = {};

  if (!t("cliente_id")) errores.cliente_id = "Elige un cliente";
  if (!t("titulo")) errores.titulo = "Pon un título (ej.: Limpieza de canalones)";
  if (!t("direccion")) errores.direccion = "La dirección es obligatoria";
  if (!Object.hasOwn(TIPOS_TRABAJO, tipo)) errores.tipo_trabajo = "Elige el tipo de trabajo";
  if (!esEstado(estado)) errores.estado = "Elige un estado";
  if (presupuesto === "invalido") errores.presupuesto = "Importe no válido. Ej.: 1.250,50";

  if (Object.keys(errores).length) return { ok: false, errores };
  return {
    ok: true,
    data: {
      cliente_id: t("cliente_id"),
      titulo: t("titulo"),
      direccion: t("direccion"),
      tipo_trabajo: tipo as TipoTrabajo,
      estado: estado as EstadoObra,
      presupuesto: presupuesto as number | null,
      trabajadores: fd.getAll("trabajadores").map(String).filter(Boolean),
    },
  };
}
