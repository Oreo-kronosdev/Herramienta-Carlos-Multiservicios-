import type { Resultado } from "@/lib/equipo";
import { UNIDADES, type Unidad } from "@/lib/etiquetas";
import { parseImporte } from "@/lib/importe";

export type Linea = { texto: string; cantidad: number; unidad: Unidad };

// Una fila de medidas (campo "concepto") o de materiales (campo "material").
export function parseLinea(fd: FormData, campoTexto: "concepto" | "material"): Resultado<Linea> {
  const texto = String(fd.get(campoTexto) ?? "").trim();
  const n = parseImporte(String(fd.get("cantidad") ?? ""));
  const unidad = String(fd.get("unidad") ?? "");
  const errores: Record<string, string> = {};
  if (!texto) errores[campoTexto] = campoTexto === "concepto" ? "Escribe qué se mide" : "Escribe el material";
  if (typeof n !== "number" || n <= 0 || n >= 1e7) errores.cantidad = "Cantidad no válida. Ej.: 12,5";
  if (!Object.hasOwn(UNIDADES, unidad)) errores.unidad = "Elige la unidad";
  if (Object.keys(errores).length) return { ok: false, errores };
  return { ok: true, data: { texto, cantidad: n as number, unidad: unidad as Unidad } };
}

const NUM = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 });
export const formatCantidad = (n: number) => NUM.format(n);
