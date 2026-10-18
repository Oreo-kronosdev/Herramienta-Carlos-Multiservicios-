import "server-only";
import { createClient } from "@/lib/supabase/server";

// Presupuesto completo con URLs firmadas (1 h) de sus fotos; null si no existe o no hay acceso.
export async function leerPresupuesto(id: string) {
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("presupuestos")
    .select(
      "id, titulo, observaciones, created_at, obras (id, titulo, direccion, clientes (nombre)), profiles (nombre), presupuesto_medidas (id, concepto, cantidad, unidad, created_at), presupuesto_materiales (id, material, cantidad, unidad, created_at), presupuesto_fotos (id, path, pie, created_at)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!p) return null;
  const orden = <T extends { created_at: string }>(xs: T[]) => [...xs].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const fotos = orden(p.presupuesto_fotos);
  const { data: firmadas } = fotos.length
    ? await supabase.storage.from("presupuestos").createSignedUrls(fotos.map((f) => f.path), 3600)
    : { data: [] };
  const url = new Map((firmadas ?? []).map((f) => [f.path, f.signedUrl]));
  return {
    ...p,
    medidas: orden(p.presupuesto_medidas),
    materiales: orden(p.presupuesto_materiales),
    fotos: fotos.map((f) => ({ ...f, url: url.get(f.path) ?? null })),
  };
}
