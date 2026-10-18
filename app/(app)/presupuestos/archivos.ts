import "server-only";
import type { createClient } from "@/lib/supabase/server";

type Cliente = Awaited<ReturnType<typeof createClient>>;

// Borra todos los archivos de las carpetas de estos presupuestos, estén registrados o no.
// Hay que hacerlo ANTES de borrar el presupuesto: después la RLS de Storage ya no deja verlos.
export async function borrarCarpetas(supabase: Cliente, presupuestos: string[]): Promise<boolean> {
  for (const id of presupuestos) {
    for (;;) {
      const { data, error } = await supabase.storage.from("presupuestos").list(id, { limit: 100 });
      if (error) return false;
      if (!data.length) break;
      const { error: e } = await supabase.storage.from("presupuestos").remove(data.map((o) => `${id}/${o.name}`));
      if (e) return false;
    }
  }
  return true;
}
