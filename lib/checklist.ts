import type { Resultado } from "@/lib/equipo";
import { TIPOS_CHECKLIST, type TipoChecklist } from "@/lib/etiquetas";

export function parseItem(fd: FormData): Resultado<{ obra_id: string; texto: string; tipo: TipoChecklist }> {
  const texto = String(fd.get("texto") ?? "").trim();
  const tipo = String(fd.get("tipo") ?? "");
  const errores: Record<string, string> = {};
  if (!texto) errores.texto = "Escribe qué hace falta";
  else if (texto.length > 120) errores.texto = "Máximo 120 caracteres";
  if (!Object.hasOwn(TIPOS_CHECKLIST, tipo)) errores.tipo = "Elige material o herramienta";
  if (Object.keys(errores).length) return { ok: false, errores };
  return { ok: true, data: { obra_id: String(fd.get("obra_id") ?? ""), texto, tipo: tipo as TipoChecklist } };
}
