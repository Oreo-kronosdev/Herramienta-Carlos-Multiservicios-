import "server-only";
import { createClient } from "@/lib/supabase/server";

// Obras (con quién trabaja en cada una) y personas activas para el formulario de cita (solo jefe).
export async function datosFormularioEvento() {
  const supabase = await createClient();
  const [{ data: obras }, { data: personas }] = await Promise.all([
    supabase
      .from("obras")
      .select("id, titulo, obra_trabajadores (user_id)")
      .not("estado", "in", "(terminada,cancelada)")
      .order("titulo"),
    supabase.from("profiles").select("id, nombre").eq("activo", true).order("nombre"),
  ]);
  return {
    obras: (obras ?? []).map((o) => ({ id: o.id, titulo: o.titulo, personas: o.obra_trabajadores.map((t) => t.user_id) })),
    personas: personas ?? [],
  };
}
