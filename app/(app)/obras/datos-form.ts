import "server-only";
import { createClient } from "@/lib/supabase/server";

// Clientes y personas activas para rellenar el formulario de obra (solo jefe).
export async function datosFormularioObra() {
  const supabase = await createClient();
  const [{ data: clientes }, { data: trabajadores }] = await Promise.all([
    supabase.from("clientes").select("id, nombre, direccion").order("nombre"),
    supabase.from("profiles").select("id, nombre").eq("activo", true).order("nombre"),
  ]);
  return { clientes: clientes ?? [], trabajadores: trabajadores ?? [] };
}
