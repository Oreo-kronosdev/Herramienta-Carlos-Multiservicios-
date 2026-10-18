import "server-only";
import { createClient } from "@/lib/supabase/server";

// Obras abiertas y personas activas (solo jefe). La obra y la persona actuales se incluyen aunque
// estén terminadas o desactivadas, para que editar la tarea no las pierda.
export async function datosFormularioTarea(obraActual?: string | null, personaActual?: string | null) {
  const supabase = await createClient();
  const [{ data: obras }, { data: personas }] = await Promise.all([
    supabase
      .from("obras")
      .select("id, titulo")
      .or(`estado.not.in.(terminada,cancelada)${obraActual ? `,id.eq.${obraActual}` : ""}`)
      .order("titulo"),
    supabase
      .from("profiles")
      .select("id, nombre")
      .or(`activo.eq.true${personaActual ? `,id.eq.${personaActual}` : ""}`)
      .order("nombre"),
  ]);
  return { obras: obras ?? [], personas: personas ?? [] };
}
