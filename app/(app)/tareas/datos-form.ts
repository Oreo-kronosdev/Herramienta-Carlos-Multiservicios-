import "server-only";
import { createClient } from "@/lib/supabase/server";

// Obras abiertas (más la actual, aunque esté terminada) y personas activas (solo jefe).
export async function datosFormularioTarea(obraActual?: string | null) {
  const supabase = await createClient();
  const [{ data: obras }, { data: personas }] = await Promise.all([
    supabase
      .from("obras")
      .select("id, titulo")
      .or(`estado.not.in.(terminada,cancelada)${obraActual ? `,id.eq.${obraActual}` : ""}`)
      .order("titulo"),
    supabase.from("profiles").select("id, nombre").eq("activo", true).order("nombre"),
  ]);
  return { obras: obras ?? [], personas: personas ?? [] };
}
